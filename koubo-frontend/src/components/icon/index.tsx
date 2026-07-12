import { Text } from '@tarojs/components'
import './index.scss'

/* RemixIcon unicode map (fill variants) */
const ICONS: Record<string, string> = {
  play:       '',
  pause:      '',
  stop:       '',
  mic:        '',
  camera:     '',
  film:       '',
  sparkle:    '',
  waveform:   '',
  warn:       '',
  check:      '',
  close:      '',
  download:   '',
  edit:       '',
  refresh:    '',
  record:     '',
  home:       '',
  add:        '',
  user:       '',
  video:      '',
  magic:      '',
  send:       '',
  gallery:    '',
}

export type IconName = keyof typeof ICONS

interface Props {
  name: IconName
  size?: number
  color?: string
  style?: Record<string, string | number>
}

export default function Icon({ name, size = 24, color = 'currentColor', style }: Props) {
  return (
    <Text
      className="ri-icon"
      style={{ fontSize: size, color, lineHeight: 1, ...style } as any}
    >
      {ICONS[name] ?? ICONS.magic}
    </Text>
  )
}
