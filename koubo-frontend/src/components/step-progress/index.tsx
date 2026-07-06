import { View } from '@tarojs/components'
import './index.scss'

type StepState = 'done' | 'active' | 'pending' | 'error'

interface Step {
  label: string
  state: StepState
}

interface StepProgressProps {
  steps: Step[]
}

export default function StepProgress({ steps }: StepProgressProps) {
  return (
    <View className="step-progress">
      {steps.map((step, i) => (
        <View key={i} className={`step-progress__item step-progress__item--${step.state}`}>
          <View className="step-progress__icon">
            {step.state === 'done' && <View className="icon-check">✓</View>}
            {step.state === 'active' && <View className="icon-spinner" />}
            {step.state === 'error' && <View className="icon-error">✕</View>}
            {step.state === 'pending' && <View className="icon-circle">{i + 1}</View>}
          </View>
          <View className="step-progress__label">{step.label}</View>
          {i < steps.length - 1 && <View className="step-progress__line" />}
        </View>
      ))}
    </View>
  )
}
