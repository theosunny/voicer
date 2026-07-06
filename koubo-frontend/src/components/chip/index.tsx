import { View } from '@tarojs/components'
import './index.scss'

interface ChipProps {
  label: string
  selected?: boolean
  onSelect?: (label: string) => void
  disabled?: boolean
}

export default function Chip({ label, selected = false, onSelect, disabled = false }: ChipProps) {
  return (
    <View
      className={`chip ${selected ? 'chip--selected' : ''} ${disabled ? 'chip--disabled' : ''}`}
      onClick={() => { if (!disabled && onSelect) onSelect(label) }}
    >
      {label}
    </View>
  )
}
