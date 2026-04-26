import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json();
    const supabase = await createClient();

    // 1. Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the upload record
    const { data: upload, error: uploadError } = await supabase
      .from("diet_uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // 3. Get user profile for context
    const { data: userProfile } = await supabase
      .from("users")
      .select("goal_type, dietary_restrictions, budget_level")
      .eq("id", user.id)
      .single();

    // 4. Build the user prompt context
    const contextLine = `User context:
- Goal: ${userProfile?.goal_type || "not specified"}
- Dietary restrictions: ${userProfile?.dietary_restrictions?.join(", ") || "none"}
- Budget: ${userProfile?.budget_level || "not specified"}`;

    const instructionLine = `You are a nutrition plan parser. Convert this diet plan into a structured JSON format.

${contextLine}

Return ONLY valid JSON with this exact structure, no other text:
{
  "plan_title": "string",
  "goal": "string",
  "estimated_calories_min": number or null,
  "estimated_calories_max": number or null,
  "estimated_protein_g": number or null,
  "warnings": ["string"],
  "allowed_foods": ["string"],
  "avoid_foods": ["string"],
  "notes": "string",
  "meals": [
    {
      "meal_type": "breakfast" | "snack" | "lunch" | "dinner" | "other",
      "time_recommended": "HH:MM" or null,
      "meal_name": "string",
      "meal_description": "string",
      "portion_guidance": "string",
      "calories_estimate": number or null,
      "protein_estimate": number or null,
      "carbs_estimate": number or null,
      "fat_estimate": number or null,
      "sort_order": number
    }
  ]
}`;

    // 5. Build the message content based on upload type
    type ContentBlock =
      | { type: "text"; text: string }
      | {
          type: "document";
          source: { type: "base64"; media_type: "application/pdf"; data: string };
        }
      | {
          type: "image";
          source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string };
        };

    let messageContent: ContentBlock[] = [];

    if (upload.upload_type === "text") {
      if (!upload.raw_text) {
        await supabase
          .from("diet_uploads")
          .update({ status: "failed", error_message: "No text content found." })
          .eq("id", uploadId);

        return NextResponse.json(
          { error: "No text content found in upload" },
          { status: 400 }
        );
      }

      messageContent = [
        {
          type: "text",
          text: `${instructionLine}\n\nDiet plan text:\n---\n${upload.raw_text}\n---`,
        },
      ];
    } else if (upload.upload_type === "pdf" || upload.upload_type === "image") {
      if (!upload.file_url) {
        return NextResponse.json(
          { error: "File URL missing" },
          { status: 400 }
        );
      }

      // Download the file from Supabase storage and convert to base64
      const fileResponse = await fetch(upload.file_url);
      if (!fileResponse.ok) {
        await supabase
          .from("diet_uploads")
          .update({
            status: "failed",
            error_message: "Failed to download uploaded file.",
          })
          .eq("id", uploadId);

        return NextResponse.json(
          { error: "Failed to download file from storage" },
          { status: 500 }
        );
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      if (upload.upload_type === "pdf") {
        messageContent = [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: `${instructionLine}\n\nThe diet plan is in the PDF above. Read it and extract the structured data.`,
          },
        ];
      } else {
        // image
        const contentType = fileResponse.headers.get("content-type") || "image/jpeg";
        const mediaType = (
          contentType.includes("png")
            ? "image/png"
            : contentType.includes("gif")
            ? "image/gif"
            : contentType.includes("webp")
            ? "image/webp"
            : "image/jpeg"
        ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

        messageContent = [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text",
            text: `${instructionLine}\n\nThe diet plan is in the image above. Read it and extract the structured data.`,
          },
        ];
      }
    }

    // 6. Send to Claude
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    // 7. Parse AI response
    const aiText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed;
try {
  // Find the first { and last } to extract just the JSON
  const firstBrace = aiText.indexOf("{");
  const lastBrace = aiText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }

  const jsonString = aiText.slice(firstBrace, lastBrace + 1);
  parsed = JSON.parse(jsonString);
} catch (parseErr) {
  console.error("=== AI RESPONSE THAT FAILED TO PARSE ===");
  console.error(aiText);
  console.error("=== END OF AI RESPONSE ===");
  console.error("Parse error:", parseErr);

  await supabase
    .from("diet_uploads")
    .update({
      status: "failed",
      error_message: "AI could not parse the diet plan.",
    })
    .eq("id", uploadId);

  return NextResponse.json(
    { error: "Failed to parse AI response" },
    { status: 500 }
  );
}

    // 8. Save to diet_plans
    const { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({
        user_id: user.id,
        diet_upload_id: uploadId,
        plan_title: parsed.plan_title || "My Diet Plan",
        goal: parsed.goal || userProfile?.goal_type || "general",
        estimated_calories_min: parsed.estimated_calories_min,
        estimated_calories_max: parsed.estimated_calories_max,
        estimated_protein_g: parsed.estimated_protein_g,
        warnings: parsed.warnings || [],
        allowed_foods: parsed.allowed_foods || [],
        avoid_foods: parsed.avoid_foods || [],
        notes: parsed.notes || "",
        is_active: true,
      })
      .select()
      .single();

    if (planError) {
      console.error("Plan insert error:", planError);
      await supabase
        .from("diet_uploads")
        .update({
          status: "failed",
          error_message: "Failed to save diet plan.",
        })
        .eq("id", uploadId);

      return NextResponse.json(
        { error: "Failed to save plan" },
        { status: 500 }
      );
    }

    // 9. Save meals
    if (parsed.meals && parsed.meals.length > 0) {
      const mealsToInsert = parsed.meals.map(
        (meal: Record<string, unknown>, index: number) => ({
          diet_plan_id: plan.id,
          meal_type: meal.meal_type || "other",
          time_recommended: meal.time_recommended || null,
          meal_name: meal.meal_name || `Meal ${index + 1}`,
          meal_description: meal.meal_description || "",
          portion_guidance: meal.portion_guidance || "",
          calories_estimate: meal.calories_estimate || null,
          protein_estimate: meal.protein_estimate || null,
          carbs_estimate: meal.carbs_estimate || null,
          fat_estimate: meal.fat_estimate || null,
          sort_order: meal.sort_order ?? index,
        })
      );

      const { error: mealsError } = await supabase
        .from("diet_meals")
        .insert(mealsToInsert);

      if (mealsError) {
        console.error("Meals insert error:", mealsError);
      }
    }

    // 10. Mark upload as processed
    await supabase
      .from("diet_uploads")
      .update({ status: "processed" })
      .eq("id", uploadId);

    return NextResponse.json({ success: true, planId: plan.id });
  } catch (err) {
    console.error("Process error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}