"use client";
import { useState } from "react";

export default function OnboardingPage(){
    type FormData = {
    name: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    goal_type: string;
    activity_level: string;
    budget: string;
}
    const questions = [
        { question: 'What is your name?', field: 'name' },
        {question: 'How old are you?', field: 'age'},
        {question: 'What is your height?', field: 'height_cm'},
        {question: 'What is your weight?', field: 'weight_kg'},
        {question: 'What is your goal?', field: 'goal_type'},
        {question: 'What is your activity level?', field: 'activity_level'},
        {question: 'What is your budget?', field: 'budget'}
    ]
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name : "",
        age : "",
        height_cm : "",
        weight_kg: "",
        goal_type: "",
        activity_level: "",
        budget: ""    })
 
    const currentField = questions[currentStep].field as keyof FormData;
    return <>
    <label>{questions[currentStep].question}</label>
    <input name="name" onChange={(e) => setFormData({...formData, [questions[currentStep].field]: e.target.value})} value={formData[currentField]}/>
    <div className="flex justify-between">
        { currentStep ? <button onClick={() => setCurrentStep(currentStep - 1)}>Previous</button> : "" }
        <button onClick={() => setCurrentStep(currentStep + 1)}>Next</button>
    </div>
    
    </>
}