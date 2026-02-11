"use client"

import { Check } from "lucide-react"

interface WizardStepsProps {
  currentStep: number
  steps: { number: number; label: string }[]
}

export function WizardSteps({ currentStep, steps }: WizardStepsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isCurrent = currentStep === step.number
        const isLast = index === steps.length - 1

        return (
          <div key={step.number} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-[#F34A23] text-white"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isCurrent
                    ? "text-white"
                    : isCompleted
                    ? "text-white/60"
                    : "text-white/40"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`w-20 h-[2px] mx-4 transition-colors ${
                  isCompleted ? "bg-emerald-500" : "bg-white/10"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
