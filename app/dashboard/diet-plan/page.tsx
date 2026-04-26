"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  meal_type: string;
  time_recommended: string | null;
  meal_name: string;
  meal_description: string | null;
  portion_guidance: string | null;
  calories_estimate: number | null;
  protein_estimate: number | null;
  carbs_estimate: number | null;
  fat_estimate: number | null;
  sort_order: number;
};

type DietPlan = {
  id: string;
  plan_title: string | null;
  goal: string | null;
  estimated_calories_min: number | null;
  estimated_calories_max: number | null;
  estimated_protein_g: number | null;
  warnings: string[];
  allowed_foods: string[] | null;
  avoid_foods: string[] | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  snack: "🍎 Snack",
  lunch: "🍽️ Lunch",
  dinner: "🌙 Dinner",
  other: "🍴 Other",
};

export default function DietPlanPage() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "foods" | "info">(
    "schedule"
  );
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get the active diet plan
      const { data: planData, error: planError } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (planError || !planData) {
        setLoading(false);
        return;
      }

      setPlan(planData);

      // Get the meals for this plan
      const { data: mealsData } = await supabase
        .from("diet_meals")
        .select("*")
        .eq("diet_plan_id", planData.id)
        .order("sort_order", { ascending: true });

      if (mealsData) {
        setMeals(mealsData);
      }

      setLoading(false);
    }

    fetchPlan();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5EDE0] flex items-center justify-center">
        <p className="text-[#8B6A50] text-sm">Loading your plan...</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#F5EDE0] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#FDF8F3] rounded-3xl border border-[#E8D5C0] p-7 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">🍽️</span>
          <h2 className="text-lg font-semibold text-[#2C1A0E]">
            No diet plan yet
          </h2>
          <p className="text-sm text-[#8B6A50]">
            Upload your diet plan so I can structure it for you.
          </p>
          <button
            onClick={() => router.push("/dashboard/diet-upload")}
            className="px-6 py-2.5 rounded-full bg-[#C17A3A] text-white text-sm font-medium hover:bg-[#A86730] transition-all"
          >
            Upload Diet Plan
          </button>
        </div>
      </main>
    );
  }

  const tabs = [
    { key: "schedule" as const, label: "Schedule" },
    { key: "foods" as const, label: "Foods" },
    { key: "info" as const, label: "Info" },
  ];

  return (
    <main className="min-h-screen bg-[#F5EDE0] flex justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Header card */}
        <div className="bg-[#FDF8F3] rounded-3xl border border-[#E8D5C0] p-6">
          <h1 className="text-xl font-semibold text-[#2C1A0E]">
            {plan.plan_title || "My Diet Plan"}
          </h1>
          <p className="text-sm text-[#8B6A50] mt-1 capitalize">
            Goal: {plan.goal?.replace("_", " ") || "General"}
          </p>

          {/* Calorie + protein summary */}
          <div className="flex gap-3 mt-4">
            {plan.estimated_calories_min && plan.estimated_calories_max && (
              <div className="flex-1 bg-[#F5EDE0] rounded-xl p-3 text-center">
                <p className="text-xs text-[#8B6A50]">Calories/day</p>
                <p className="text-lg font-semibold text-[#2C1A0E]">
                  {plan.estimated_calories_min}–{plan.estimated_calories_max}
                </p>
              </div>
            )}
            {plan.estimated_protein_g && (
              <div className="flex-1 bg-[#F5EDE0] rounded-xl p-3 text-center">
                <p className="text-xs text-[#8B6A50]">Protein</p>
                <p className="text-lg font-semibold text-[#2C1A0E]">
                  {plan.estimated_protein_g}g
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {plan.warnings && plan.warnings.length > 0 && (
            <div className="mt-4 bg-[#FFF3E0] border border-[#F5D6A8] rounded-xl p-3">
              <p className="text-xs font-medium text-[#A86730] mb-1">
                ⚠️ Warnings
              </p>
              {plan.warnings.map((w, i) => (
                <p key={i} className="text-xs text-[#8B6A50]">
                  • {typeof w === "string" ? w : JSON.stringify(w)}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#C17A3A] text-white"
                  : "bg-[#FDF8F3] border border-[#E8D5C0] text-[#2C1A0E] hover:bg-[#FAEEDA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "schedule" && (
          <div className="flex flex-col gap-3">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-[#8B6A50]">
                      {mealTypeLabels[meal.meal_type] || meal.meal_type}
                      {meal.time_recommended && ` · ${meal.time_recommended}`}
                    </p>
                    <p className="text-base font-medium text-[#2C1A0E] mt-1">
                      {meal.meal_name}
                    </p>
                    {meal.meal_description && (
                      <p className="text-sm text-[#8B6A50] mt-1">
                        {meal.meal_description}
                      </p>
                    )}
                    {meal.portion_guidance && (
                      <p className="text-xs text-[#B49A85] mt-1">
                        📏 {meal.portion_guidance}
                      </p>
                    )}
                  </div>
                </div>

                {/* Macros row */}
                {(meal.calories_estimate ||
                  meal.protein_estimate ||
                  meal.carbs_estimate ||
                  meal.fat_estimate) && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-[#E8D5C0]">
                    {meal.calories_estimate && (
                      <span className="text-xs text-[#8B6A50]">
                        🔥 {meal.calories_estimate} cal
                      </span>
                    )}
                    {meal.protein_estimate && (
                      <span className="text-xs text-[#8B6A50]">
                        💪 {meal.protein_estimate}g P
                      </span>
                    )}
                    {meal.carbs_estimate && (
                      <span className="text-xs text-[#8B6A50]">
                        🌾 {meal.carbs_estimate}g C
                      </span>
                    )}
                    {meal.fat_estimate && (
                      <span className="text-xs text-[#8B6A50]">
                        🥑 {meal.fat_estimate}g F
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {meals.length === 0 && (
              <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-6 text-center">
                <p className="text-sm text-[#8B6A50]">
                  No meals found in this plan.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "foods" && (
          <div className="flex flex-col gap-3">
            {plan.allowed_foods && plan.allowed_foods.length > 0 && (
              <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-4">
                <p className="text-sm font-medium text-[#2C1A0E] mb-2">
                  ✅ Allowed Foods
                </p>
                <div className="flex flex-wrap gap-2">
                  {plan.allowed_foods.map((food, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] text-xs rounded-full"
                    >
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {plan.avoid_foods && plan.avoid_foods.length > 0 && (
              <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-4">
                <p className="text-sm font-medium text-[#2C1A0E] mb-2">
                  🚫 Avoid
                </p>
                <div className="flex flex-wrap gap-2">
                  {plan.avoid_foods.map((food, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#FFEBEE] text-[#C62828] text-xs rounded-full"
                    >
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!plan.allowed_foods || plan.allowed_foods.length === 0) &&
              (!plan.avoid_foods || plan.avoid_foods.length === 0) && (
                <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-6 text-center">
                  <p className="text-sm text-[#8B6A50]">
                    No food lists available for this plan.
                  </p>
                </div>
              )}
          </div>
        )}

        {activeTab === "info" && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#FDF8F3] rounded-2xl border border-[#E8D5C0] p-4">
              <p className="text-sm font-medium text-[#2C1A0E] mb-2">
                📋 Plan Details
              </p>
              <div className="flex flex-col gap-2 text-sm text-[#8B6A50]">
                <p>
                  <span className="text-[#2C1A0E] font-medium">Title:</span>{" "}
                  {plan.plan_title || "Untitled"}
                </p>
                <p>
                  <span className="text-[#2C1A0E] font-medium">Goal:</span>{" "}
                  {plan.goal?.replace("_", " ") || "General"}
                </p>
                <p>
                  <span className="text-[#2C1A0E] font-medium">Meals:</span>{" "}
                  {meals.length/5} per day
                </p>
                {plan.notes && (
                  <p>
                    <span className="text-[#2C1A0E] font-medium">Notes:</span>{" "}
                    {plan.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/dashboard/diet-upload")}
                className="w-full py-3 rounded-full border-[1.5px] border-[#E8D5C0] text-[#2C1A0E] text-sm font-medium hover:bg-[#FAEEDA] transition-all"
              >
                Upload a New Diet
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}