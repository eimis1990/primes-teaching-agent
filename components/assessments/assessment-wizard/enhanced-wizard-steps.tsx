"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface Step {
  number: number
  label: string
  description?: string
}

interface EnhancedWizardStepsProps {
  currentStep: number
  steps: Step[]
}

export function EnhancedWizardSteps({ currentStep, steps }: EnhancedWizardStepsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          const isUpcoming = currentStep < step.number

          return (
            <div key={step.number} className="flex-1 relative">
              {/* Step indicator and label */}
              <div className="flex flex-col items-center relative z-10">
                {/* Circle indicator */}
                <div
                  className={cn(
                    "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 border-2",
                    isCompleted && "bg-[#F34A23] border-[#F34A23] text-white scale-100 shadow-md shadow-[#F34A23]/20",
                    isCurrent && "bg-[#F34A23] border-[#ff7c5d] text-white scale-110 shadow-[0_0_0_8px_rgba(243,74,35,0.16)]",
                    isUpcoming && "bg-[#232428] border-white/20 text-white/40"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-3 text-center px-2">
                  <p
                    className={cn(
                      "text-xs md:text-sm font-medium transition-colors",
                      isCurrent && "text-white",
                      isCompleted && "text-white/80",
                      isUpcoming && "text-white/40"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p
                      className={cn(
                        "text-[11px] mt-1 transition-colors hidden md:block",
                        isCurrent && "text-white/60",
                        isCompleted && "text-white/50",
                        isUpcoming && "text-white/30"
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute top-[22px] md:top-6 left-[50%] w-full h-0.5 -z-0">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isCompleted ? "bg-gradient-to-r from-[#F34A23] to-[#f06a4a]" : "bg-white/10"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-7 relative">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F34A23] to-[#E04420] transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
        <p className="text-center text-xs text-white/40 mt-2">
          Step {currentStep} of {steps.length}
        </p>
      </div>
    </div>
  )
}
