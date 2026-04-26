"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type UploadMethod = "text" | "pdf" | "image";

const loadingMessages = [
  "Extracting meals...",
  "Detecting macros...",
  "Building your schedule...",
  "Almost there...",
];

export default function DietUploadPage() {
  const [method, setMethod] = useState<UploadMethod>("text");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setLoadingMsg(0);

    // Cycle through loading messages
    const interval = setInterval(() => {
      setLoadingMsg((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : prev
      );
    }, 2500);

    try {
      // 1. Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        clearInterval(interval);
        return;
      }

      let fileUrl: string | null = null;
      let uploadText: string | null = null;

      if (method === "text") {
        if (!rawText.trim()) {
          setError("Please paste your diet plan.");
          setLoading(false);
          clearInterval(interval);
          return;
        }
        uploadText = rawText.trim();
      } else {
        if (!file) {
          setError(
            `Please select a ${method === "pdf" ? "PDF" : "image"} file.`
          );
          setLoading(false);
          clearInterval(interval);
          return;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: storageData, error: storageError } =
          await supabase.storage.from("diet-uploads").upload(fileName, file);

        if (storageError) {
          setError("Failed to upload file. Please try again.");
          console.error(storageError);
          setLoading(false);
          clearInterval(interval);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("diet-uploads")
          .getPublicUrl(storageData.path);

        fileUrl = publicUrl;
      }

      // 2. Insert into diet_uploads
      const { data: upload, error: insertError } = await supabase
        .from("diet_uploads")
        .insert({
          user_id: user.id,
          upload_type: method,
          file_url: fileUrl,
          raw_text: uploadText,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        setError("Failed to save upload. Please try again.");
        console.error(insertError);
        setLoading(false);
        clearInterval(interval);
        return;
      }

      // 3. Send to API for AI processing
      const res = await fetch("/api/diet/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: upload.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "AI processing failed. Please try again.");
        setLoading(false);
        clearInterval(interval);
        return;
      }

      clearInterval(interval);
      router.push("/dashboard/diet-plan");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const methods: { key: UploadMethod; label: string; icon: string }[] = [
    { key: "text", label: "Paste Text", icon: "📝" },
    { key: "pdf", label: "Upload PDF", icon: "📄" },
    { key: "image", label: "Upload Image", icon: "📷" },
  ];

  return (
    <main className="min-h-screen bg-[#F5EDE0] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#FDF8F3] rounded-3xl border border-[#E8D5C0] p-7 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[#2C1A0E] leading-snug">
            Upload Your Diet Plan
          </h1>
          <p className="text-sm text-[#8B6A50] mt-1 leading-relaxed">
            Upload your plan and I&apos;ll turn it into a daily routine you can
            actually follow.
          </p>
        </div>

        {/* Method tabs */}
        <div className="flex gap-2">
          {methods.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setMethod(m.key);
                setFile(null);
                setError(null);
              }}
              className={`flex-1 px-3 py-2.5 rounded-xl border-[1.5px] text-sm transition-all ${
                method === m.key
                  ? "bg-[#C17A3A] border-[#C17A3A] text-white font-medium"
                  : "bg-white border-[#E8D5C0] text-[#2C1A0E] hover:border-[#C17A3A] hover:bg-[#FAEEDA]"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        {method === "text" && (
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setError(null);
            }}
            placeholder={`Paste your diet plan here...\n\nExample:\nBreakfast: oats + 2 eggs\nSnack: banana\nLunch: chicken + rice + salad\nSnack: yogurt\nDinner: fish + vegetables`}
            rows={8}
            className="w-full px-4 py-3 rounded-xl border-[1.5px] border-[#E8D5C0] bg-white text-[#2C1A0E] placeholder-[#B49A85] outline-none focus:border-[#C17A3A] text-sm leading-relaxed resize-none"
          />
        )}

        {method === "pdf" && (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError(null);
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed border-[#E8D5C0] bg-white hover:border-[#C17A3A] hover:bg-[#FAEEDA] transition-all">
              <span className="text-3xl mb-3">📄</span>
              <span className="text-sm text-[#8B6A50]">
                {file ? file.name : "Click to select a PDF file"}
              </span>
            </div>
          </label>
        )}

        {method === "image" && (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError(null);
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed border-[#E8D5C0] bg-white hover:border-[#C17A3A] hover:bg-[#FAEEDA] transition-all">
              <span className="text-3xl mb-3">📷</span>
              <span className="text-sm text-[#8B6A50]">
                {file ? file.name : "Click to select an image or screenshot"}
              </span>
            </div>
          </label>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-full h-1 bg-[#E8D5C0] rounded-full overflow-hidden">
              <div className="h-full bg-[#C17A3A] rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-sm text-[#8B6A50]">
              {loadingMessages[loadingMsg]}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-full text-sm font-medium transition-all ${
            loading
              ? "bg-[#D4A574] text-white/70 cursor-not-allowed"
              : "bg-[#C17A3A] text-white hover:bg-[#A86730]"
          }`}
        >
          {loading ? "Analyzing..." : "Analyze My Diet 🌿"}
        </button>
      </div>
    </main>
  );
}