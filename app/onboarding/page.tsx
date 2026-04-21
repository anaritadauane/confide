"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type FormData = {
  name: string;
  surname: string;
  age: string;
  height_cm: string;
  weight_kg: string;
  goal_type: string;
  activity_level: string;
  budget_level: string;
  dietary_restrictions: string[];
  target_weight_kg: string;
}

const steps = [
  { question: "What should we call you?", field: "name", type: "text", placeholder: "Your name" },
  { question: "What is your surname?", field: "surname", type: "text", placeholder: "Last name"},
  { question: "How old are you?", field: "age", type: "text", placeholder: "e.g. 24" },
  { question: "What's your height in cm?", field: "height_cm", type: "text", placeholder: "e.g. 165" },
  { question: "What's your weight in kg?", field: "weight_kg", type: "text", placeholder: "e.g. 65" },
  { question: "What's your main goal?", field: "goal_type", type: "chips", options: [
    { label: "Lose fat 🔥", value: "fat_loss" },
    { label: "Maintain weight ⚖️", value: "maintain" },
    { label: "Build muscle 💪", value: "muscle_gain" },
  ]},
  { question: "How active are you?", field: "activity_level", type: "chips", options: [
    { label: "Mostly sitting 🪑", value: "sedentary" },
    { label: "Light movement 🚶", value: "light" },
    { label: "Moderate exercise 🏃", value: "moderate" },
    { label: "Very active 🏋️", value: "active" },
  ]},
  { question: "What's your target weight in kg?", field: "target_weight_kg", type: "text", placeholder: "e.g. 60" },
  { question: "Do you have dietary restrictions?", field: "dietary_restrictions", type: "multi-chips", options: [
    { label: "Gluten-free", value: "gluten_free" },
    { label: "Dairy-free", value: "dairy_free" },
    { label: "Vegetarian", value: "vegetarian" },
    { label: "Vegan", value: "vegan" },
    { label: "Nut allergy", value: "nut_allergy" },
    { label: "None", value: "none" },
  ]},
  { question: "What's your food budget?", field: "budget_level", type: "chips", options: [
    { label: "Keep it affordable 💰", value: "low" },
    { label: "Balanced 💳", value: "medium" },
    { label: "No restrictions ✨", value: "high" },
  ]},
]

export default function OnboardingPage() {
  const router = useRouter();
  const client = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    surname: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    goal_type: "",
    activity_level: "",
    budget_level: "",
    dietary_restrictions: [],
    target_weight_kg: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const step = steps[currentStep];
  const currentField = step.field as keyof FormData;
  const currentValue = formData[currentField];

  function handleNext() {
  const isArrayField = Array.isArray(currentValue)
  console.log(currentValue);
  
  if (isArrayField && (currentValue as string[]).length === 0) {
    setError("Please select at least one option.")
    return
  }
  
  if (!isArrayField && !currentValue) {
    setError("Please answer before continuing.")
    return
  }
  
  setError("")
  setCurrentStep(currentStep + 1)
}

  function handleSelect(value: string) {
    setFormData({ ...formData, [currentField]: value })
    setError("")
  }

  async function handleSubmit() {
    if (!currentValue) {
      setError("Please answer before continuing.")
      return
    }
    setLoading(true)
    const { data: { user } } = await client.auth.getUser()
    const { error } = await client.from("users").update({
      name: formData.name,
      surname: formData.surname,
      age: parseInt(formData.age),
      height_cm: parseInt(formData.height_cm),
      weight_kg: parseFloat(formData.weight_kg),
      goal_type: formData.goal_type,
      activity_level: formData.activity_level,
      budget_level: formData.budget_level,
      dietary_restrictions: formData.dietary_restrictions,
      target_weight_kg: parseFloat(formData.target_weight_kg),
    }).eq("id", user?.id)

    if (error) { console.log(error); setLoading(false); return }
    router.push("/dashboard")
  }

  function toggleRestriction(value: string){
    if(formData.dietary_restrictions.includes(value)){
        const newArr = formData.dietary_restrictions.filter((item) => item !== value);
        setFormData({ ...formData, dietary_restrictions: newArr });
    }
    else {
        const newArr = [...formData.dietary_restrictions, value]
        setFormData({ ...formData, dietary_restrictions: newArr })
    }
  }

  const progress = ((currentStep) / steps.length) * 100

  return (
    <main className="min-h-screen bg-[#F5EDE0] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#FDF8F3] rounded-3xl border border-[#E8D5C0] p-7 flex flex-col gap-6">
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-[#E8D5C0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C17A3A] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <p className="text-xs text-[#8B6A50]">
          Step {currentStep + 1} of {steps.length}
        </p>

        {/* Question */}
        <h2 className="text-xl font-semibold text-[#2C1A0E] leading-snug">
          {step.question}
        </h2>

        {/* Input or chips */}
        {step.type === "text" ? (
          <input
            type="text"
            placeholder={step.placeholder}
            value={currentValue}
            onChange={(e) => {
              setFormData({ ...formData, [currentField]: e.target.value })
              setError("")
            }}
            className="w-full px-4 py-3 rounded-xl border-[1.5px] border-[#E8D5C0] bg-white text-[#2C1A0E] placeholder-[#B49A85] outline-none focus:border-[#C17A3A] text-base"
          />
        ) : step.type === "multi-chips" ? (
  <div className="flex flex-wrap gap-2">
    {step.options?.map((opt) => {
      const isSelected = formData.dietary_restrictions.includes(opt.value)
      return (
        <button
          key={opt.value}
          onClick={() => toggleRestriction(opt.value)}
          className={`px-4 py-2 rounded-full border-[1.5px] text-sm ${
            isSelected
              ? "bg-[#C17A3A] border-[#C17A3A] text-white font-medium"
              : "bg-white border-[#E8D5C0] text-[#2C1A0E] hover:border-[#C17A3A] hover:bg-[#FAEEDA]"
          }`}
        >
          {opt.label}
        </button>
      )
    })}
  </div>
) : (      <div className="flex flex-wrap gap-2">
            {step.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-2 rounded-full border-[1.5px] text-sm transition-all ${
                  currentValue === opt.value
                    ? "bg-[#C17A3A] border-[#C17A3A] text-white font-medium"
                    : "bg-white border-[#E8D5C0] text-[#2C1A0E] hover:border-[#C17A3A] hover:bg-[#FAEEDA]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-5 py-2 rounded-full border-[1.5px] border-[#E8D5C0] text-[#8B6A50] text-sm"
            >
              Back
            </button>
          ) : <div />}

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 rounded-full bg-[#C17A3A] text-white text-sm font-medium"
            >
              {loading ? "Saving..." : "Let's go 🌿"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-full bg-[#C17A3A] text-white text-sm font-medium"
            >
              Next
            </button>
          )}
        </div>

      </div>
    </main>
  )
}