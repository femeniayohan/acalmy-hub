import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface Step {
  id: number
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number // 1-based
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                  isCompleted && 'bg-[#0a0a0a] text-white',
                  isActive && 'bg-[#0a0a0a] text-white ring-2 ring-[#0a0a0a] ring-offset-2',
                  !isCompleted && !isActive && 'bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.35)]'
                )}
              >
                {isCompleted ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  isActive && 'text-[#0a0a0a]',
                  isCompleted && 'text-[rgba(0,0,0,0.5)]',
                  !isCompleted && !isActive && 'text-[rgba(0,0,0,0.3)]'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'w-12 h-px mx-2 mb-5 transition-colors',
                  isCompleted ? 'bg-[#0a0a0a]' : 'bg-[rgba(0,0,0,0.1)]'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
