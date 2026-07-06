# 口播小程序前端实现计划 (Cyber Creator Studio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Taro 4 + React 18 + TypeScript 实现口播创作小程序前端，包含 AI 文案生成（SSE）、提词器录制（WebSocket ASR）、视频处理轮询，采用 Cyber Creator Studio 暗色设计系统

**Architecture:** Taro 多端架构，样式层用 SCSS + CSS 变量设计 token，API 层封装 SSE/WebSocket/REST，页面层按功能分组；先出微信/抖音小程序，后续同一套代码编译 H5 和 React Native

**Tech Stack:** Taro 4.2, React 18, TypeScript 5.4, SCSS, Taro RecorderManager API (miniprogram audio), Taro WebSocket API

---

## Task 1: Project scaffold + design tokens

- [ ] Create `src/app.tsx`
- [ ] Create `src/app.config.ts`
- [ ] Create `src/styles/tokens.scss`
- [ ] Create `src/styles/typography.scss`
- [ ] Create `src/styles/global.scss`
- [ ] Create `src/styles/mixins.scss`
- [ ] Create `babel.config.js`
- [ ] Create `project.config.json`
- [ ] Create `project.tt.json`
- [ ] Modify `package.json` (add `dev:h5` and `build:h5` scripts)

### `src/app.tsx`

```tsx
import { Component } from 'react'
import './styles/global.scss'

class App extends Component {
  render() {
    return this.props.children
  }
}

export default App
```

### `src/app.config.ts`

```ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/create/index',
    'pages/videos/index',
    'pages/profile/index',
    'pages/script/generate',
    'pages/script/edit',
    'pages/record/index',
    'pages/video/status',
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#080810',
    navigationBarTitleText: '口播创作',
    navigationBarTextStyle: 'white',
    backgroundColor: '#080810',
  },
  tabBar: {
    color: '#555555',
    selectedColor: '#6C63FF',
    backgroundColor: '#0E0E1A',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png',
      },
      {
        pagePath: 'pages/create/index',
        text: '创作',
        iconPath: 'assets/icons/create.png',
        selectedIconPath: 'assets/icons/create-active.png',
      },
      {
        pagePath: 'pages/videos/index',
        text: '作品',
        iconPath: 'assets/icons/video.png',
        selectedIconPath: 'assets/icons/video-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png',
      },
    ],
  },
})
```

### `src/styles/tokens.scss`

```scss
:root {
  // ─── Background ──────────────────────────────────────────
  --bg-base: #080810;
  --bg-surface: #0E0E1A;
  --bg-elevated: #14142A;

  // ─── Brand colors ────────────────────────────────────────
  --color-primary: #6C63FF;
  --color-primary-dim: rgba(108, 99, 255, 0.15);
  --color-cyan: #00E5FF;
  --color-cyan-dim: rgba(0, 229, 255, 0.12);
  --color-hot: #FF2D78;
  --color-hot-dim: rgba(255, 45, 120, 0.15);

  // ─── Borders ─────────────────────────────────────────────
  --border-default: rgba(108, 99, 255, 0.2);
  --border-active: rgba(0, 229, 255, 0.5);
  --border-subtle: rgba(255, 255, 255, 0.06);

  // ─── Text ────────────────────────────────────────────────
  --color-text-1: #FFFFFF;
  --color-text-2: #AAAAAA;
  --color-text-3: #555555;

  // ─── Semantic ────────────────────────────────────────────
  --color-success: #4CAF50;
  --color-success-dim: rgba(76, 175, 80, 0.15);
  --color-error: #F44336;
  --color-error-dim: rgba(244, 67, 54, 0.15);
  --color-warning: #FF9800;
  --color-warning-dim: rgba(255, 152, 0, 0.15);

  // ─── Spacing ─────────────────────────────────────────────
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  // ─── Border radius ───────────────────────────────────────
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  // ─── Typography scale ────────────────────────────────────
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;

  // ─── Font families ───────────────────────────────────────
  --font-display: 'Space Grotesk', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'PingFang SC', sans-serif;
  --font-teleprompter: 'Noto Serif SC', 'Songti SC', serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  // ─── Shadows / glows ─────────────────────────────────────
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);
  --glow-primary: 0 0 16px rgba(108, 99, 255, 0.5);
  --glow-cyan: 0 0 16px rgba(0, 229, 255, 0.5);
  --glow-hot: 0 0 16px rgba(255, 45, 120, 0.5);

  // ─── Transitions ─────────────────────────────────────────
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  // ─── Z-index layers ──────────────────────────────────────
  --z-base: 0;
  --z-card: 10;
  --z-overlay: 100;
  --z-modal: 200;
  --z-toast: 300;
  --z-scanline: 9999;
}
```

### `src/styles/typography.scss`

```scss
// H5: load from CDN; miniprogram falls back to system fonts via --font-* vars
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&display=swap');

// Type scale utility classes
.text-xs    { font-size: var(--text-xs); }
.text-sm    { font-size: var(--text-sm); }
.text-base  { font-size: var(--text-base); }
.text-md    { font-size: var(--text-md); }
.text-lg    { font-size: var(--text-lg); }
.text-xl    { font-size: var(--text-xl); }
.text-2xl   { font-size: var(--text-2xl); }
.text-3xl   { font-size: var(--text-3xl); }
.text-4xl   { font-size: var(--text-4xl); }

.font-display     { font-family: var(--font-display); }
.font-body        { font-family: var(--font-body); }
.font-teleprompter{ font-family: var(--font-teleprompter); }
.font-mono        { font-family: var(--font-mono); }

.text-1 { color: var(--color-text-1); }
.text-2 { color: var(--color-text-2); }
.text-3 { color: var(--color-text-3); }
```

### `src/styles/global.scss`

```scss
@import './tokens.scss';
@import './typography.scss';

// Reset
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

page, .taro-page {
  background-color: var(--bg-base);
  color: var(--color-text-1);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  min-height: 100vh;
}

// Scanline texture overlay — applied on body/page level
// Uses a pseudo element in the page wrapper
.page-root {
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
    pointer-events: none;
    z-index: var(--z-scanline);
  }
}

// Scrollbar (H5 only)
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: var(--bg-base);
}
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-full);
}

// Safe area insets
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

// Utility
.flex         { display: flex; }
.flex-col     { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center  { justify-content: center; }
.flex-1       { flex: 1; }
.w-full       { width: 100%; }
.h-full       { height: 100%; }
.overflow-hidden { overflow: hidden; }
.text-center  { text-align: center; }
.relative     { position: relative; }
.absolute     { position: absolute; }
```

### `src/styles/mixins.scss`

```scss
@import './tokens.scss';

// ─── HUD card: 4-corner L-bracket glow instead of full border ────────────────
// Usage: @include hud-card($color: var(--color-primary));
@mixin hud-card($color: var(--color-primary), $size: 12px, $thickness: 1.5px) {
  position: relative;
  background: var(--bg-surface);
  border-radius: var(--radius-md);

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: $size;
    height: $size;
    pointer-events: none;
  }

  // Top-left + bottom-right share ::before trick via box-shadow layering
  &::before {
    top: 0;
    left: 0;
    border-top: $thickness solid $color;
    border-left: $thickness solid $color;
    border-radius: var(--radius-sm) 0 0 0;
  }

  &::after {
    bottom: 0;
    right: 0;
    border-bottom: $thickness solid $color;
    border-right: $thickness solid $color;
    border-radius: 0 0 var(--radius-sm) 0;
  }

  // Inner pseudo via a wrapper span — caller must add .hud-card-tr and .hud-card-bl
  // OR use the HudCard component which handles all 4 corners via JS spans.
}

// Shortcut for glow text
@mixin glow-text($color: var(--color-primary)) {
  color: $color;
  text-shadow: 0 0 8px rgba(#{$color}, 0.6);
}

// Glow box-shadow
@mixin glow-box($color: var(--color-primary), $spread: 16px) {
  box-shadow: 0 0 $spread rgba(108, 99, 255, 0.4), 0 0 #{$spread * 2} rgba(108, 99, 255, 0.2);
}

// Truncate text
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

### `babel.config.js`

```js
module.exports = {
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true,
        hot: false,
      },
    ],
  ],
}
```

### `project.config.json` (WeChat miniprogram)

```json
{
  "miniprogramRoot": "dist/",
  "projectname": "koubo-frontend",
  "description": "口播创作小程序",
  "appid": "YOUR_WEAPP_APPID",
  "setting": {
    "urlCheck": false,
    "es6": false,
    "enhance": false,
    "compileHotReLoad": false,
    "postcss": false,
    "minified": false,
    "newFeature": true
  },
  "compileType": "miniprogram",
  "condition": {}
}
```

### `project.tt.json` (Douyin miniprogram)

```json
{
  "projectname": "koubo-frontend",
  "description": "口播创作小程序（抖音版）",
  "appid": "YOUR_TT_APPID",
  "setting": {
    "urlCheck": false,
    "es6": false,
    "postcss": false,
    "minified": false
  }
}
```

### `package.json` changes (add scripts only)

Add these two scripts to the existing `scripts` object:

```json
"dev:h5": "taro build --type h5 --watch",
"build:h5": "taro build --type h5"
```

**Verification:** `cd koubo-frontend && npx tsc --noEmit`

---

## Task 2: Shared components (HudCard, Chip, GlowButton, Toast, StepProgress)

- [ ] Create `src/components/hud-card/index.tsx`
- [ ] Create `src/components/hud-card/index.scss`
- [ ] Create `src/components/chip/index.tsx`
- [ ] Create `src/components/chip/index.scss`
- [ ] Create `src/components/glow-button/index.tsx`
- [ ] Create `src/components/glow-button/index.scss`
- [ ] Create `src/components/toast/index.tsx`
- [ ] Create `src/components/toast/index.scss`
- [ ] Create `src/components/step-progress/index.tsx`
- [ ] Create `src/components/step-progress/index.scss`

### `src/components/hud-card/index.tsx`

```tsx
import { View } from '@tarojs/components'
import type { CSSProperties, ReactNode } from 'react'
import './index.scss'

interface HudCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Bracket color, defaults to --color-primary */
  color?: 'primary' | 'cyan' | 'hot'
}

export default function HudCard({ children, className = '', style, color = 'primary' }: HudCardProps) {
  return (
    <View className={`hud-card hud-card--${color} ${className}`} style={style}>
      {/* Top-left and bottom-right corners handled by ::before/::after in CSS */}
      {/* Top-right and bottom-left corners handled by inner spans */}
      <View className="hud-card__corner hud-card__corner--tr" />
      <View className="hud-card__corner hud-card__corner--bl" />
      <View className="hud-card__content">{children}</View>
    </View>
  )
}
```

### `src/components/hud-card/index.scss`

```scss
@import '../../styles/tokens.scss';

.hud-card {
  position: relative;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);

  // ─── Corner variables ───────────────────────────────────────────────────────
  --hud-size: 12px;
  --hud-thick: 1.5px;
  --hud-color: var(--color-primary);

  &--primary { --hud-color: var(--color-primary); }
  &--cyan    { --hud-color: var(--color-cyan); }
  &--hot     { --hud-color: var(--color-hot); }

  // ─── Top-left corner ────────────────────────────────────────────────────────
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: var(--hud-size);
    height: var(--hud-size);
    border-top: var(--hud-thick) solid var(--hud-color);
    border-left: var(--hud-thick) solid var(--hud-color);
    border-radius: var(--radius-sm) 0 0 0;
    pointer-events: none;
    box-shadow: -2px -2px 8px rgba(108, 99, 255, 0.2);
  }

  // ─── Bottom-right corner ────────────────────────────────────────────────────
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: var(--hud-size);
    height: var(--hud-size);
    border-bottom: var(--hud-thick) solid var(--hud-color);
    border-right: var(--hud-thick) solid var(--hud-color);
    border-radius: 0 0 var(--radius-sm) 0;
    pointer-events: none;
    box-shadow: 2px 2px 8px rgba(108, 99, 255, 0.2);
  }

  // ─── Top-right corner ───────────────────────────────────────────────────────
  .hud-card__corner--tr {
    position: absolute;
    top: 0;
    right: 0;
    width: var(--hud-size);
    height: var(--hud-size);
    border-top: var(--hud-thick) solid var(--hud-color);
    border-right: var(--hud-thick) solid var(--hud-color);
    border-radius: 0 var(--radius-sm) 0 0;
    pointer-events: none;
  }

  // ─── Bottom-left corner ─────────────────────────────────────────────────────
  .hud-card__corner--bl {
    position: absolute;
    bottom: 0;
    left: 0;
    width: var(--hud-size);
    height: var(--hud-size);
    border-bottom: var(--hud-thick) solid var(--hud-color);
    border-left: var(--hud-thick) solid var(--hud-color);
    border-radius: 0 0 0 var(--radius-sm);
    pointer-events: none;
  }

  .hud-card__content {
    position: relative;
    z-index: 1;
  }
}
```

### `src/components/chip/index.tsx`

```tsx
import { View } from '@tarojs/components'
import './index.scss'

interface ChipProps {
  label: string
  selected?: boolean
  onSelect?: (label: string) => void
  disabled?: boolean
}

export default function Chip({ label, selected = false, onSelect, disabled = false }: ChipProps) {
  const handleClick = () => {
    if (!disabled && onSelect) onSelect(label)
  }

  return (
    <View
      className={`chip ${selected ? 'chip--selected' : ''} ${disabled ? 'chip--disabled' : ''}`}
      onClick={handleClick}
    >
      {label}
    </View>
  )
}
```

### `src/components/chip/index.scss`

```scss
@import '../../styles/tokens.scss';

.chip {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-family: var(--font-body);
  color: var(--color-text-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  white-space: nowrap;
  user-select: none;

  &:active:not(.chip--disabled) {
    transform: scale(0.95);
  }

  &--selected {
    color: var(--color-cyan);
    background: var(--color-cyan-dim);
    border-color: var(--border-active);
    box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
  }

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

### `src/components/glow-button/index.tsx`

```tsx
import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

interface GlowButtonProps {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function GlowButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: GlowButtonProps) {
  const isInert = disabled || loading

  const handleClick = () => {
    if (!isInert && onClick) onClick()
  }

  return (
    <View
      className={[
        'glow-btn',
        `glow-btn--${variant}`,
        `glow-btn--${size}`,
        isInert ? 'glow-btn--inert' : '',
        fullWidth ? 'glow-btn--full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
    >
      {loading ? (
        <View className="glow-btn__spinner" />
      ) : (
        <View className="glow-btn__label">{children}</View>
      )}
    </View>
  )
}
```

### `src/components/glow-button/index.scss`

```scss
@import '../../styles/tokens.scss';

.glow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
  overflow: hidden;

  // ─── Sizes ──────────────────────────────────────────────────────────────────
  &--sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }
  &--md {
    padding: var(--space-3) var(--space-6);
    font-size: var(--text-base);
  }
  &--lg {
    padding: var(--space-4) var(--space-8);
    font-size: var(--text-md);
  }

  &--full { width: 100%; }

  // ─── Variants ───────────────────────────────────────────────────────────────
  &--primary {
    background: var(--color-primary);
    color: #fff;
    box-shadow: 0 0 12px rgba(108, 99, 255, 0.4), 0 0 24px rgba(108, 99, 255, 0.15);

    &:active:not(.glow-btn--inert) {
      box-shadow: 0 0 20px rgba(108, 99, 255, 0.7), 0 0 40px rgba(108, 99, 255, 0.35);
      transform: scale(0.98);
    }
  }

  &--danger {
    background: var(--color-hot);
    color: #fff;
    box-shadow: 0 0 12px rgba(255, 45, 120, 0.4), 0 0 24px rgba(255, 45, 120, 0.15);

    &:active:not(.glow-btn--inert) {
      box-shadow: 0 0 20px rgba(255, 45, 120, 0.7), 0 0 40px rgba(255, 45, 120, 0.35);
      transform: scale(0.98);
    }
  }

  // ─── Disabled / loading ─────────────────────────────────────────────────────
  &--inert {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  // ─── Spinner ────────────────────────────────────────────────────────────────
  &__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}
```

### `src/components/toast/index.tsx`

```tsx
import { View } from '@tarojs/components'
import { useState, useCallback, useRef } from 'react'
import './index.scss'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  visible: boolean
  message: string
  variant: ToastVariant
}

// Singleton state lifted to module scope so useToast works across components
let _setState: ((s: ToastState) => void) | null = null
let _timer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, variant: ToastVariant = 'info', duration = 2000) {
  if (!_setState) return
  if (_timer) clearTimeout(_timer)
  _setState({ visible: true, message, variant })
  _timer = setTimeout(() => {
    _setState && _setState({ visible: false, message: '', variant: 'info' })
  }, duration)
}

export function useToast() {
  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    info: (msg: string) => showToast(msg, 'info'),
  }
}

export default function Toast() {
  const [state, setState] = useState<ToastState>({ visible: false, message: '', variant: 'info' })

  // Register singleton setter on mount
  const setStateRef = useRef(setState)
  setStateRef.current = setState
  _setState = useCallback((s: ToastState) => setStateRef.current(s), [])

  if (!state.visible) return null

  return (
    <View className={`toast toast--${state.variant}`}>
      <View className="toast__icon">
        {state.variant === 'success' && '✓'}
        {state.variant === 'error' && '✕'}
        {state.variant === 'info' && 'i'}
      </View>
      <View className="toast__msg">{state.message}</View>
    </View>
  )
}
```

### `src/components/toast/index.scss`

```scss
@import '../../styles/tokens.scss';

.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-family: var(--font-body);
  white-space: nowrap;
  backdrop-filter: blur(12px);
  animation: toast-in var(--duration-fast) var(--ease-out);

  &--success {
    background: var(--color-success-dim);
    border: 1px solid var(--color-success);
    color: var(--color-success);
  }
  &--error {
    background: var(--color-error-dim);
    border: 1px solid var(--color-error);
    color: var(--color-error);
  }
  &--info {
    background: var(--color-primary-dim);
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
  }

  &__icon {
    font-weight: 700;
    font-size: var(--text-xs);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid currentColor;
  }

  @keyframes toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
}
```

### `src/components/step-progress/index.tsx`

```tsx
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
```

### `src/components/step-progress/index.scss`

```scss
@import '../../styles/tokens.scss';

.step-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    position: relative;

    &--done    { color: var(--color-success); }
    &--active  { color: var(--color-cyan); }
    &--pending { color: var(--color-text-3); }
    &--error   { color: var(--color-error); }
  }

  &__icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    font-weight: 700;
    flex-shrink: 0;
    border: 1.5px solid currentColor;

    .step-progress__item--done &   { background: var(--color-success-dim); }
    .step-progress__item--active & { background: var(--color-cyan-dim); }
    .step-progress__item--error &  { background: var(--color-error-dim); }
  }

  &__label {
    font-size: var(--text-sm);
    font-family: var(--font-body);
  }

  &__line {
    position: absolute;
    left: 11px;
    top: 24px;
    width: 1.5px;
    height: var(--space-3);
    background: var(--border-default);
  }

  .icon-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(0, 229, 255, 0.3);
    border-top-color: var(--color-cyan);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 3: API layer (client, types, REST endpoints)

- [ ] Create `src/types/api.ts`
- [ ] Create `src/api/client.ts`
- [ ] Create `src/api/template.ts`
- [ ] Create `src/api/script.ts`
- [ ] Create `src/api/video.ts`

### `src/types/api.ts`

```ts
// ─── Domain entities ─────────────────────────────────────────────────────────

export interface Template {
  id: string
  title: string
  domain: string
  content_structure: string
  usage_count: number
  is_featured: boolean
  created_at?: string
}

export interface Script {
  id: string
  title: string
  content: string
  script_type: string
  style: string
  duration_estimate: number
  status: 'draft' | 'final'
  created_at?: string
  updated_at?: string
}

export interface VideoStatus {
  status: 'processing' | 'completed' | 'failed'
  processed_video_url?: string
  error_msg?: string
  progress?: number
}

export interface ASRPosition {
  paragraph_index: number
  word_index: number
  timestamp_ms?: number
}

// ─── Request/response shapes ────────────────────────────────────────────────

export interface GenerateScriptRequest {
  topic: string
  domain: string
  script_type: string
  style: string
  duration: '30s' | '60s' | '3min'
  template_id?: string
}

export interface SaveDraftRequest {
  title: string
  content: string
  script_type: string
  style: string
}

export interface SubmitVideoRequest {
  script_id: string
  frame_markers: FrameMarker[]
  asr_result?: string
}

export interface FrameMarker {
  paragraph_index: number
  word_index: number
  timestamp_ms: number
}

// ─── API envelope ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
}
```

### `src/api/client.ts`

```ts
import Taro from '@tarojs/taro'
import type { ApiResponse } from '../types/api'

const BASE_URL = process.env.TARO_APP_API_BASE ?? 'http://localhost:8080'

function getAuthHeader(): Record<string, string> {
  // Placeholder: replace with real token from storage when auth is implemented
  const token = Taro.getStorageSync('auth_token') as string | undefined
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const res = await Taro.request<ApiResponse<T>>({
    url: `${BASE_URL}${path}`,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  return res.data
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await Taro.request<ApiResponse<T>>({
    url: `${BASE_URL}${path}`,
    method: 'POST',
    data: body,
    header: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  return res.data
}

/** Multipart upload (for video files) */
export async function apiUpload<T>(
  path: string,
  filePath: string,
  formData: Record<string, string>,
): Promise<ApiResponse<T>> {
  const res = await Taro.uploadFile({
    url: `${BASE_URL}${path}`,
    filePath,
    name: 'video',
    formData,
    header: {
      ...getAuthHeader(),
    },
  })
  return JSON.parse(res.data) as ApiResponse<T>
}

export const API_BASE = BASE_URL
```

### `src/api/template.ts`

```ts
import Taro from '@tarojs/taro'
import type { PaginatedResponse, Template } from '../types/api'
import { API_BASE } from './client'

function getAuthHeader(): Record<string, string> {
  const token = Taro.getStorageSync('auth_token') as string | undefined
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface GetTrendingParams {
  domain?: string
  limit?: number
  page?: number
}

export async function getTrendingTemplates(
  params: GetTrendingParams = {},
): Promise<PaginatedResponse<Template>> {
  const { domain = '', limit = 10, page = 1 } = params
  const qs = new URLSearchParams({
    ...(domain ? { domain } : {}),
    limit: String(limit),
    page: String(page),
  }).toString()

  const res = await Taro.request<PaginatedResponse<Template>>({
    url: `${API_BASE}/api/templates/trending?${qs}`,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  return res.data
}
```

### `src/api/script.ts`

```ts
import type { ApiResponse, Script, SaveDraftRequest } from '../types/api'
import { apiGet, apiPost } from './client'

export async function getScript(id: string): Promise<ApiResponse<Script>> {
  return apiGet<Script>(`/api/script/${id}`)
}

export async function saveDraft(data: SaveDraftRequest): Promise<ApiResponse<Script>> {
  return apiPost<Script>('/api/script/draft', data)
}

export async function updateDraft(id: string, data: SaveDraftRequest): Promise<ApiResponse<Script>> {
  return apiPost<Script>(`/api/script/${id}/draft`, data)
}
```

### `src/api/video.ts`

```ts
import type { ApiResponse, VideoStatus, SubmitVideoRequest, FrameMarker } from '../types/api'
import { apiGet, apiUpload } from './client'

export async function getVideoStatus(videoId: string): Promise<ApiResponse<VideoStatus>> {
  return apiGet<VideoStatus>(`/api/video/${videoId}/status`)
}

export async function submitVideo(
  filePath: string,
  scriptId: string,
  frameMarkers: FrameMarker[],
  asrResult?: string,
): Promise<ApiResponse<{ video_id: string }>> {
  const formData: Record<string, string> = {
    script_id: scriptId,
    frame_markers: JSON.stringify(frameMarkers),
    ...(asrResult ? { asr_result: asrResult } : {}),
  }
  return apiUpload<{ video_id: string }>('/api/video/submit', filePath, formData)
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 4: Hooks — useSSE, useASRSocket, useVideoPoller

- [ ] Create `src/hooks/useSSE.ts`
- [ ] Create `src/hooks/useASRSocket.ts`
- [ ] Create `src/hooks/useVideoPoller.ts`

### `src/hooks/useSSE.ts`

```ts
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../api/client'

interface SSEEvent {
  chunk?: string
  done?: boolean
  error?: string
  script_id?: string
}

interface UseSSEResult {
  chunks: string[]
  fullText: string
  done: boolean
  error: string | null
  scriptId: string | null
}

/**
 * Streams AI-generated script text via SSE.
 *
 * Miniprogram: uses Taro.request with enableChunked:true which delivers
 *   onChunkReceived callbacks instead of a single response body.
 * H5: uses native fetch + ReadableStream.
 *
 * @param path   API path, e.g. '/api/script/generate'
 * @param body   Request body sent as JSON
 * @param enabled Start streaming when true; stops when false
 */
export function useSSE(path: string, body: unknown, enabled: boolean): UseSSEResult {
  const [chunks, setChunks] = useState<string[]>([])
  const [fullText, setFullText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptId, setScriptId] = useState<string | null>(null)
  const taskRef = useRef<Taro.RequestTask | null>(null)
  const bufferRef = useRef('')

  useEffect(() => {
    if (!enabled) return

    // Reset state on each new request
    setChunks([])
    setFullText('')
    setDone(false)
    setError(null)
    setScriptId(null)
    bufferRef.current = ''

    const url = `${API_BASE}${path}`

    // Check if running in miniprogram environment
    const isMiniProgram = typeof wx !== 'undefined' || typeof tt !== 'undefined'

    if (isMiniProgram) {
      // Miniprogram: chunked request
      taskRef.current = Taro.request({
        url,
        method: 'POST',
        data: body,
        header: { 'Content-Type': 'application/json' },
        enableChunked: true,
        success: () => { /* final response after stream ends */ },
        fail: (err) => setError(err.errMsg ?? 'Request failed'),
      })

      taskRef.current.onChunkReceived((res) => {
        const text = new TextDecoder().decode(new Uint8Array(res.data))
        processSSEText(text)
      })
    } else {
      // H5: fetch + ReadableStream
      const controller = new AbortController()

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          const reader = res.body?.getReader()
          if (!reader) { setError('No response body'); return }
          const decoder = new TextDecoder()
          while (true) {
            const { done: streamDone, value } = await reader.read()
            if (streamDone) break
            processSSEText(decoder.decode(value, { stream: true }))
          }
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setError(err.message)
        })

      return () => controller.abort()
    }

    return () => {
      if (taskRef.current) taskRef.current.abort()
    }
  }, [enabled, path, JSON.stringify(body)])

  function processSSEText(text: string) {
    bufferRef.current += text
    const lines = bufferRef.current.split('\n')
    // Keep the last (potentially incomplete) line in the buffer
    bufferRef.current = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue
      try {
        const event = JSON.parse(jsonStr) as SSEEvent
        if (event.error) {
          setError(event.error)
        } else if (event.done) {
          setDone(true)
          if (event.script_id) setScriptId(event.script_id)
        } else if (event.chunk) {
          setChunks((prev) => [...prev, event.chunk!])
          setFullText((prev) => prev + event.chunk)
        }
      } catch {
        // Ignore malformed JSON lines
      }
    }
  }

  return { chunks, fullText, done, error, scriptId }
}
```

### `src/hooks/useASRSocket.ts`

```ts
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { ASRPosition } from '../types/api'
import { API_BASE } from '../api/client'

interface ASRMessage {
  type: 'position' | 'partial' | 'error'
  paragraph_index?: number
  word_index?: number
  text?: string
  error?: string
}

interface UseASRSocketResult {
  position: ASRPosition | null
  recognizing: string
  connected: boolean
  send: (audio: ArrayBuffer) => void
  disconnect: () => void
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

/**
 * Manages a WebSocket connection to the ASR streaming endpoint.
 * Sends audio buffers and receives paragraph position callbacks.
 *
 * @param scriptParagraphs Array of script paragraphs (used to initialise session)
 * @param enabled Open socket when true; close when false
 */
export function useASRSocket(scriptParagraphs: string[], enabled: boolean): UseASRSocketResult {
  const [position, setPosition] = useState<ASRPosition | null>(null)
  const [recognizing, setRecognizing] = useState('')
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<Taro.SocketTask | null>(null)
  const retriesRef = useRef(0)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const connectSocket = useCallback(() => {
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/api/asr/stream'

    const task = Taro.connectSocket({
      url: wsUrl,
      success: () => {},
      fail: () => {},
    })

    task.onOpen(() => {
      retriesRef.current = 0
      setConnected(true)
      // Send script context so backend can align positions
      task.send({
        data: JSON.stringify({ type: 'init', paragraphs: scriptParagraphs }),
      })
      // Flush queued audio
      while (audioQueueRef.current.length > 0) {
        const buf = audioQueueRef.current.shift()!
        task.send({ data: buf })
      }
    })

    task.onMessage((evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as ASRMessage
        if (msg.type === 'position' && msg.paragraph_index !== undefined) {
          setPosition({
            paragraph_index: msg.paragraph_index,
            word_index: msg.word_index ?? 0,
          })
        } else if (msg.type === 'partial' && msg.text) {
          setRecognizing(msg.text)
        }
      } catch {
        // Ignore malformed messages
      }
    })

    task.onClose(() => {
      setConnected(false)
      if (enabledRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1
        setTimeout(() => {
          if (enabledRef.current) connectSocket()
        }, RETRY_DELAY_MS)
      }
    })

    task.onError(() => {
      setConnected(false)
    })

    socketRef.current = task
  }, [scriptParagraphs])

  useEffect(() => {
    if (!enabled) return
    connectSocket()
    return () => {
      socketRef.current?.close({})
      socketRef.current = null
    }
  }, [enabled, connectSocket])

  const send = useCallback((audio: ArrayBuffer) => {
    if (socketRef.current && connected) {
      socketRef.current.send({ data: audio })
    } else {
      // Buffer audio during reconnect
      audioQueueRef.current.push(audio)
    }
  }, [connected])

  const disconnect = useCallback(() => {
    socketRef.current?.close({})
    socketRef.current = null
    setConnected(false)
    retriesRef.current = MAX_RETRIES // prevent reconnect
  }, [])

  return { position, recognizing, connected, send, disconnect }
}
```

### `src/hooks/useVideoPoller.ts`

```ts
import { useState, useEffect, useRef } from 'react'
import { getVideoStatus } from '../api/video'
import type { VideoStatus } from '../types/api'

const POLL_INTERVAL_MS = 3000

interface UseVideoPollerResult {
  status: VideoStatus | null
  loading: boolean
}

/**
 * Polls /api/video/:id/status every 3 seconds while status is 'processing'.
 * Automatically stops when status becomes 'completed' or 'failed', or videoId is null.
 */
export function useVideoPoller(videoId: string | null): UseVideoPollerResult {
  const [status, setStatus] = useState<VideoStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    if (!videoId) return
    activeRef.current = true

    async function poll() {
      if (!activeRef.current) return
      setLoading(true)
      try {
        const res = await getVideoStatus(videoId!)
        if (!activeRef.current) return
        if (res.success && res.data) {
          setStatus(res.data)
          if (res.data.status === 'processing') {
            timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
          }
        }
      } catch {
        // Network error — retry
        if (activeRef.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    poll()

    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [videoId])

  return { status, loading }
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 5: Home page — template feed

- [ ] Create `src/pages/index/index.tsx`
- [ ] Create `src/pages/index/index.scss`

### `src/pages/index/index.tsx`

```tsx
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useReachBottom, useLoad } from '@tarojs/taro'
import { useState } from 'react'
import HudCard from '../../components/hud-card'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast from '../../components/toast'
import { getTrendingTemplates } from '../../api/template'
import type { Template } from '../../types/api'
import './index.scss'

const DOMAINS = ['全部', '产品', '生活', '知识', '美食', '美妆', '科技']

export default function IndexPage() {
  const [domain, setDomain] = useState('全部')
  const [templates, setTemplates] = useState<Template[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  async function loadTemplates(nextPage: number, nextDomain: string, replace = false) {
    if (loading) return
    setLoading(true)
    try {
      const res = await getTrendingTemplates({
        domain: nextDomain === '全部' ? '' : nextDomain,
        limit: 10,
        page: nextPage,
      })
      const list = res.data ?? []
      setTemplates((prev) => replace ? list : [...prev, ...list])
      setHasMore(list.length === 10)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    loadTemplates(1, domain, true)
  })

  function handleDomainChange(d: string) {
    setDomain(d)
    loadTemplates(1, d, true)
  }

  useReachBottom(() => {
    if (hasMore && !loading) loadTemplates(page + 1, domain)
  })

  function useTemplate(tpl: Template) {
    Taro.navigateTo({ url: `/pages/script/generate?template_id=${tpl.id}&domain=${tpl.domain}` })
  }

  function goCreate() {
    Taro.navigateTo({ url: '/pages/script/generate' })
  }

  return (
    <View className="page-root index-page">
      <Toast />

      {/* Header */}
      <View className="index-page__header">
        <Text className="index-page__title">口播创作</Text>
        <View className="index-page__bell">🔔</View>
      </View>

      {/* CTA */}
      <View className="index-page__cta">
        <GlowButton onClick={goCreate} size="lg" fullWidth>
          ⚡ 立即创作
        </GlowButton>
      </View>

      {/* Domain filter */}
      <ScrollView scrollX className="index-page__domains">
        {DOMAINS.map((d) => (
          <Chip
            key={d}
            label={d}
            selected={domain === d}
            onSelect={handleDomainChange}
          />
        ))}
      </ScrollView>

      {/* Template list */}
      <View className="index-page__list">
        {templates.length === 0 && !loading && (
          <View className="index-page__empty">
            <Text className="index-page__empty-icon">🎬</Text>
            <Text className="index-page__empty-text">暂无模板，去自由创作吧</Text>
            <GlowButton onClick={goCreate} size="sm">
              开始创作
            </GlowButton>
          </View>
        )}
        {templates.map((tpl) => (
          <HudCard key={tpl.id} className="template-card">
            <View className="template-card__head">
              <Text className="template-card__title">{tpl.title}</Text>
              <View className="template-card__badges">
                {tpl.is_featured && (
                  <View className="template-card__badge template-card__badge--featured">精选</View>
                )}
                <View className="template-card__domain">{tpl.domain}</View>
              </View>
            </View>
            <Text className="template-card__preview">{tpl.content_structure}</Text>
            <View className="template-card__footer">
              <Text className="template-card__usage">{tpl.usage_count.toLocaleString()} 人用过</Text>
              <View className="template-card__use-btn" onClick={() => useTemplate(tpl)}>
                用这个模板 →
              </View>
            </View>
          </HudCard>
        ))}
        {loading && (
          <View className="index-page__loading">
            <Text>加载中...</Text>
          </View>
        )}
        {!hasMore && templates.length > 0 && (
          <View className="index-page__end">
            <Text>— 已经到底了 —</Text>
          </View>
        )}
      </View>
    </View>
  )
}
```

### `src/pages/index/index.scss`

```scss
@import '../../styles/tokens.scss';
@import '../../styles/mixins.scss';

.index-page {
  min-height: 100vh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.5px;
  }

  &__bell {
    font-size: var(--text-xl);
    cursor: pointer;
  }

  &__cta {
    padding: 0 var(--space-4) var(--space-4);
  }

  &__domains {
    padding: 0 var(--space-4) var(--space-3);
    white-space: nowrap;

    // Taro ScrollView children need display: inline-flex in H5
    .chip {
      margin-right: var(--space-2);
      &:last-child { margin-right: 0; }
    }
  }

  &__list {
    padding: 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-16) var(--space-4);
    color: var(--color-text-3);
  }

  &__empty-icon {
    font-size: 48px;
  }

  &__empty-text {
    font-size: var(--text-base);
  }

  &__loading,
  &__end {
    text-align: center;
    color: var(--color-text-3);
    font-size: var(--text-sm);
    padding: var(--space-4);
  }
}

// ─── Template card ────────────────────────────────────────────────────────────
.template-card {
  cursor: pointer;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text-1);
    flex: 1;
    @include truncate(1);
  }

  &__badges {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  &__badge {
    font-size: var(--text-xs);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);

    &--featured {
      background: rgba(255, 204, 0, 0.15);
      border: 1px solid rgba(255, 204, 0, 0.5);
      color: #FFCC00;
    }
  }

  &__domain {
    font-size: var(--text-xs);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    background: var(--color-primary-dim);
    border: 1px solid var(--border-default);
    color: var(--color-primary);
  }

  &__preview {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    line-height: 1.6;
    @include truncate(2);
    margin-bottom: var(--space-3);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__usage {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }

  &__use-btn {
    font-size: var(--text-sm);
    color: var(--color-cyan);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--duration-fast);

    &:active { opacity: 0.6; }
  }
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 6: Script generation page (SSE streaming)

- [ ] Create `src/pages/script/generate.tsx`
- [ ] Create `src/pages/script/generate.scss`

### `src/pages/script/generate.tsx`

```tsx
import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { useSSE } from '../../hooks/useSSE'
import type { GenerateScriptRequest } from '../../types/api'
import './generate.scss'

const DOMAINS = ['美妆', '科技', '生活', '美食', '知识', '母婴', '健康']
const SCRIPT_TYPES = ['产品推广', '个人感悟', '生活分享', '知识科普', '情感故事']
const STYLES = ['轻松随性', '专业权威', '情感共鸣', '幽默风趣']
const DURATIONS: Array<{ label: string; value: GenerateScriptRequest['duration'] }> = [
  { label: '30秒', value: '30s' },
  { label: '60秒', value: '60s' },
  { label: '3分钟', value: '3min' },
]
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  美妆: ['护肤', '口红', '底妆', '彩妆', '精华'],
  科技: ['AI', '手机', '耳机', '智能家居', '芯片'],
  生活: ['收纳', '健康', '早起', '效率', '好物'],
  美食: ['食谱', '探店', '零食', '减脂餐', '甜品'],
  知识: ['读书', '思维', '历史', '心理学', '职场'],
}

type Mode = 'domain' | 'free'

export default function GeneratePage() {
  const router = useRouter()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>('domain')
  const [domain, setDomain] = useState('美妆')
  const [freeTopic, setFreeTopic] = useState('')
  const [scriptType, setScriptType] = useState('产品推广')
  const [style, setStyle] = useState('轻松随性')
  const [duration, setDuration] = useState<GenerateScriptRequest['duration']>('60s')
  const [sseEnabled, setSseEnabled] = useState(false)
  const [requestBody, setRequestBody] = useState<GenerateScriptRequest | null>(null)

  const { fullText, done, error, scriptId } = useSSE(
    '/api/script/generate',
    requestBody,
    sseEnabled && requestBody !== null,
  )

  // Pre-select domain from template route param
  useLoad(() => {
    const { domain: qDomain } = router.params
    if (qDomain && DOMAINS.includes(qDomain)) setDomain(qDomain)
  })

  // Navigate to edit page when done
  useEffect(() => {
    if (done && scriptId) {
      setSseEnabled(false)
      Taro.navigateTo({ url: `/pages/script/edit?script_id=${scriptId}` })
    }
  }, [done, scriptId])

  useEffect(() => {
    if (error) {
      setSseEnabled(false)
      toast.error('生成失败：' + error)
    }
  }, [error])

  function handleGenerate() {
    const topic = mode === 'domain' ? domain : freeTopic.trim()
    if (!topic) { toast.error('请选择领域或输入主题'); return }

    const body: GenerateScriptRequest = {
      topic,
      domain: mode === 'domain' ? domain : '',
      script_type: scriptType,
      style,
      duration,
      template_id: router.params.template_id,
    }
    setRequestBody(body)
    setSseEnabled(true)
  }

  function addKeyword(kw: string) {
    setFreeTopic((prev) => (prev ? prev + ' ' + kw : kw))
  }

  const isStreaming = sseEnabled && !done && !error

  return (
    <View className="page-root generate-page">
      <Toast />

      {/* Page header */}
      <View className="generate-page__header">
        <View className="generate-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="generate-page__title">AI 文案生成</Text>
        <View className="generate-page__ph" />
      </View>

      {!isStreaming ? (
        <ScrollView scrollY className="generate-page__form">
          {/* Mode segmented control */}
          <View className="generate-page__segment">
            <View
              className={`seg-btn ${mode === 'domain' ? 'seg-btn--active' : ''}`}
              onClick={() => setMode('domain')}
            >
              领域推荐
            </View>
            <View
              className={`seg-btn ${mode === 'free' ? 'seg-btn--active' : ''}`}
              onClick={() => setMode('free')}
            >
              自由输入
            </View>
          </View>

          {/* Mode A: domain selection */}
          {mode === 'domain' && (
            <View className="generate-page__section">
              <Text className="generate-page__label">选择领域</Text>
              <View className="generate-page__chips">
                {DOMAINS.map((d) => (
                  <Chip key={d} label={d} selected={domain === d} onSelect={setDomain} />
                ))}
              </View>
              {DOMAIN_KEYWORDS[domain] && (
                <>
                  <Text className="generate-page__label generate-page__label--sub">热门关键词（点击添加）</Text>
                  <View className="generate-page__chips">
                    {DOMAIN_KEYWORDS[domain].map((kw) => (
                      <Chip key={kw} label={kw} onSelect={addKeyword} />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Mode B: free input */}
          {mode === 'free' && (
            <View className="generate-page__section">
              <Text className="generate-page__label">输入主题</Text>
              <View className="generate-page__textarea-wrap">
                <Textarea
                  className="generate-page__textarea"
                  value={freeTopic}
                  onInput={(e) => setFreeTopic(e.detail.value)}
                  placeholder="输入你想创作的主题，比如：怎么护理干皮"
                  maxlength={50}
                  autoHeight
                />
                <Text className="generate-page__char-count">{freeTopic.length}/50</Text>
              </View>
            </View>
          )}

          {/* Content type */}
          <View className="generate-page__section">
            <Text className="generate-page__label">内容类型</Text>
            <View className="generate-page__chips">
              {SCRIPT_TYPES.map((t) => (
                <Chip key={t} label={t} selected={scriptType === t} onSelect={setScriptType} />
              ))}
            </View>
          </View>

          {/* Style */}
          <View className="generate-page__section">
            <Text className="generate-page__label">表达风格</Text>
            <View className="generate-page__chips">
              {STYLES.map((s) => (
                <Chip key={s} label={s} selected={style === s} onSelect={setStyle} />
              ))}
            </View>
          </View>

          {/* Duration */}
          <View className="generate-page__section">
            <Text className="generate-page__label">视频时长</Text>
            <View className="generate-page__duration-row">
              {DURATIONS.map((d) => (
                <View
                  key={d.value}
                  className={`duration-btn ${duration === d.value ? 'duration-btn--active' : ''}`}
                  onClick={() => setDuration(d.value)}
                >
                  {d.label}
                </View>
              ))}
            </View>
          </View>

          {/* Submit */}
          <View className="generate-page__submit">
            <GlowButton onClick={handleGenerate} size="lg" fullWidth>
              ✨ 生成文案
            </GlowButton>
          </View>
        </ScrollView>
      ) : (
        /* Streaming terminal view */
        <View className="generate-page__terminal">
          <View className="terminal-header">
            <View className="terminal-dot terminal-dot--red" />
            <View className="terminal-dot terminal-dot--yellow" />
            <View className="terminal-dot terminal-dot--green" />
            <Text className="terminal-title">AI 正在创作...</Text>
          </View>
          <ScrollView scrollY className="terminal-body">
            <Text className="terminal-text">
              {fullText}
              {!done && <Text className="cursor"> </Text>}
            </Text>
          </ScrollView>
          <View className="terminal-footer">
            <Text className="terminal-status">
              {done ? '✓ 生成完成，跳转中…' : `已生成 ${fullText.length} 字`}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
```

### `src/pages/script/generate.scss`

```scss
@import '../../styles/tokens.scss';
@import '../../styles/mixins.scss';

.generate-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__back {
    font-size: var(--text-xl);
    color: var(--color-text-2);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__ph { width: 32px; }

  &__form {
    flex: 1;
    padding: var(--space-4);
  }

  &__segment {
    display: flex;
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: 3px;
    margin-bottom: var(--space-5);
  }

  .seg-btn {
    flex: 1;
    text-align: center;
    padding: var(--space-2) 0;
    font-size: var(--text-base);
    color: var(--color-text-3);
    border-radius: calc(var(--radius-md) - 2px);
    transition: all var(--duration-fast) var(--ease-out);
    cursor: pointer;

    &--active {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 0 8px rgba(108, 99, 255, 0.4);
    }
  }

  &__section {
    margin-bottom: var(--space-5);
  }

  &__label {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    margin-bottom: var(--space-2);
    display: block;
    font-weight: 500;

    &--sub {
      color: var(--color-text-3);
      margin-top: var(--space-3);
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__textarea-wrap {
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  &__textarea {
    width: 100%;
    min-height: 80px;
    font-size: var(--text-base);
    color: var(--color-text-1);
    font-family: var(--font-body);
    background: transparent;
    border: none;
    outline: none;
  }

  &__char-count {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }

  &__duration-row {
    display: flex;
    gap: var(--space-2);
  }

  .duration-btn {
    flex: 1;
    text-align: center;
    padding: var(--space-3) 0;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text-2);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all var(--duration-fast);

    &--active {
      color: var(--color-cyan);
      border-color: var(--border-active);
      background: var(--color-cyan-dim);
    }
  }

  &__submit {
    padding: var(--space-4) 0 var(--space-8);
  }

  // ─── Terminal streaming view ─────────────────────────────────────────────────
  &__terminal {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: var(--space-4);
    background: #0A0A0F;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  &--red    { background: #FF5F57; }
  &--yellow { background: #FEBC2E; }
  &--green  { background: #28C840; }
}

.terminal-title {
  margin-left: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-2);
  font-family: var(--font-mono);
}

.terminal-body {
  flex: 1;
  padding: var(--space-4);
  min-height: 300px;
  max-height: 60vh;
}

.terminal-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #00FF9F;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: var(--color-cyan);
  animation: blink 0.8s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}

@keyframes blink {
  50% { opacity: 0; }
}

.terminal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.terminal-status {
  font-size: var(--text-xs);
  color: var(--color-text-3);
  font-family: var(--font-mono);
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 7: Script edit page

- [ ] Create `src/pages/script/edit.tsx`
- [ ] Create `src/pages/script/edit.scss`

### `src/pages/script/edit.tsx`

```tsx
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getScript, saveDraft } from '../../api/script'
import './edit.scss'

/** Rough estimate: ~4 chars per second of speech */
function estimateDuration(text: string): string {
  const secs = Math.round(text.replace(/\s/g, '').length / 4)
  if (secs < 60) return `约 ${secs} 秒`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `约 ${m} 分 ${s > 0 ? s + ' 秒' : ''}`
}

export default function EditPage() {
  const router = useRouter()
  const toast = useToast()

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [scriptType, setScriptType] = useState('产品推广')
  const [style, setStyle] = useState('轻松随性')
  const [saving, setSaving] = useState(false)
  const [scriptId, setScriptId] = useState<string | null>(null)

  useLoad(async () => {
    const { script_id } = router.params
    if (!script_id) return
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) {
        setContent(res.data.content)
        setTitle(res.data.title ?? '')
        setScriptType(res.data.script_type ?? '产品推广')
        setStyle(res.data.style ?? '轻松随性')
      }
    } catch {
      toast.error('加载文案失败')
    }
  })

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await saveDraft({ title, content, script_type: scriptType, style })
      if (res.success) {
        if (res.data?.id) setScriptId(res.data.id)
        toast.success('已保存草稿')
      } else {
        toast.error('保存失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  function handleRecord() {
    const id = scriptId
    if (!id) { toast.error('请先保存草稿'); return }
    Taro.navigateTo({ url: `/pages/record/index?script_id=${id}` })
  }

  function handleRegenerate() {
    Taro.navigateBack()
  }

  const charCount = content.replace(/\s/g, '').length
  const durationLabel = estimateDuration(content)

  return (
    <View className="page-root edit-page">
      <Toast />

      {/* Header */}
      <View className="edit-page__header">
        <View className="edit-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="edit-page__title">编辑文案</Text>
        <View className="edit-page__regen" onClick={handleRegenerate}>
          重新生成
        </View>
      </View>

      {/* Stats bar */}
      <View className="edit-page__stats">
        <View className="edit-page__stat">
          <Text className="edit-page__stat-value">{charCount}</Text>
          <Text className="edit-page__stat-label">字</Text>
        </View>
        <View className="edit-page__stat-sep">·</View>
        <View className="edit-page__stat">
          <Text className="edit-page__stat-value stat-duration">{durationLabel}</Text>
        </View>
      </View>

      {/* Editor */}
      <View className="edit-page__editor-wrap">
        <Textarea
          className="edit-page__editor"
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          placeholder="在这里编辑文案..."
          autoHeight
          maxlength={5000}
        />
      </View>

      {/* Bottom bar */}
      <View className="edit-page__bottom safe-area-bottom">
        <View className="edit-page__save-btn" onClick={handleSave}>
          {saving ? '保存中...' : '保存草稿'}
        </View>
        <GlowButton onClick={handleRecord} size="md">
          开始录制 →
        </GlowButton>
      </View>
    </View>
  )
}
```

### `src/pages/script/edit.scss`

```scss
@import '../../styles/tokens.scss';

.edit-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__back {
    font-size: var(--text-xl);
    color: var(--color-text-2);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__regen {
    font-size: var(--text-sm);
    color: var(--color-primary);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);

    &:active { opacity: 0.6; }
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__stat {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-cyan);
  }

  &__stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
  }

  &__stat-sep {
    color: var(--color-text-3);
    font-size: var(--text-base);
  }

  .stat-duration {
    font-size: var(--text-sm);
  }

  &__editor-wrap {
    flex: 1;
    padding: var(--space-4);
    overflow: auto;
  }

  &__editor {
    width: 100%;
    min-height: 50vh;
    font-size: 18px;
    line-height: 1.8;
    color: var(--color-text-1);
    font-family: var(--font-body);
    background: transparent;
    border: none;
    outline: none;

    // WeChat miniprogram textarea placeholder
    &::placeholder {
      color: var(--color-text-3);
    }
  }

  &__bottom {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
  }

  &__save-btn {
    font-size: var(--text-base);
    color: var(--color-text-2);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--duration-fast);

    &:active {
      color: var(--color-success);
      border-color: var(--color-success);
    }
  }
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 8: Teleprompter + recording page (core page)

- [ ] Create `src/pages/record/index.tsx`
- [ ] Create `src/pages/record/index.scss`

### `src/pages/record/index.tsx`

```tsx
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useRouter, useUnload } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getScript } from '../../api/script'
import { submitVideo } from '../../api/video'
import { useASRSocket } from '../../hooks/useASRSocket'
import type { FrameMarker } from '../../types/api'
import './index.scss'

type RecordState = 'idle' | 'recording' | 'paused' | 'completed'

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordPage() {
  const router = useRouter()
  const toast = useToast()

  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [recordState, setRecordState] = useState<RecordState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [currentPara, setCurrentPara] = useState(0)
  const [tempFilePath, setTempFilePath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const frameMarkersRef = useRef<FrameMarker[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<any>(null)
  const recorderRef = useRef<Taro.RecorderManager | null>(null)

  const isRecording = recordState === 'recording'
  const { position, recognizing, connected, send, disconnect } = useASRSocket(paragraphs, isRecording)

  useLoad(async () => {
    const { script_id } = router.params
    if (!script_id) { toast.error('缺少文案 ID'); return }
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) {
        setParagraphs(splitParagraphs(res.data.content))
      }
    } catch {
      toast.error('加载文案失败')
    }
  })

  // Track paragraph position from ASR
  useEffect(() => {
    if (!position) return
    setCurrentPara(position.paragraph_index)
    // Record frame marker
    const marker: FrameMarker = {
      paragraph_index: position.paragraph_index,
      word_index: position.word_index,
      timestamp_ms: Date.now() - startTimeRef.current,
    }
    frameMarkersRef.current.push(marker)
  }, [position])

  // Timer
  useEffect(() => {
    if (recordState === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 200)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recordState])

  function getRecorder(): Taro.RecorderManager {
    if (!recorderRef.current) {
      recorderRef.current = Taro.getRecorderManager()
      recorderRef.current.onStart(() => {
        startTimeRef.current = Date.now()
        setRecordState('recording')
      })
      recorderRef.current.onPause(() => setRecordState('paused'))
      recorderRef.current.onResume(() => {
        // Adjust start time to account for paused duration
        startTimeRef.current = Date.now() - elapsedMs
        setRecordState('recording')
      })
      recorderRef.current.onStop((res) => {
        setTempFilePath(res.tempFilePath)
        setRecordState('completed')
        setShowCompletion(true)
        disconnect()
      })
      recorderRef.current.onFrameRecorded((res) => {
        if (res.frameBuffer) send(res.frameBuffer)
      })
      recorderRef.current.onError((err) => {
        toast.error('录音错误: ' + err.errMsg)
        setRecordState('idle')
      })
    }
    return recorderRef.current
  }

  function startRecording() {
    frameMarkersRef.current = []
    setCurrentPara(0)
    setElapsedMs(0)
    const rec = getRecorder()
    rec.start({
      format: 'mp3',
      sampleRate: 16000,
      numberOfChannels: 1,
      frameSize: 4, // KB per frame
    })
  }

  function pauseRecording() {
    getRecorder().pause()
  }

  function resumeRecording() {
    getRecorder().resume()
  }

  function stopRecording() {
    getRecorder().stop()
  }

  function resetRecording() {
    stopRecording()
    setRecordState('idle')
    setElapsedMs(0)
    setCurrentPara(0)
    setTempFilePath(null)
    setShowCompletion(false)
    frameMarkersRef.current = []
  }

  async function handleSubmit() {
    if (!tempFilePath || !scriptId || submitting) return
    setSubmitting(true)
    try {
      const res = await submitVideo(
        tempFilePath,
        scriptId,
        frameMarkersRef.current,
      )
      if (res.success && res.data?.video_id) {
        Taro.navigateTo({ url: `/pages/video/status?video_id=${res.data.video_id}` })
      } else {
        toast.error('提交失败，请重试')
        setSubmitting(false)
      }
    } catch {
      toast.error('网络错误，请重试')
      setSubmitting(false)
    }
  }

  useUnload(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    disconnect()
  })

  // Render teleprompter paragraphs: prev, current, next, next+1
  function renderParagraphs() {
    const indices = [currentPara - 1, currentPara, currentPara + 1, currentPara + 2]
    return indices.map((i) => {
      if (i < 0 || i >= paragraphs.length) return null
      const isCurrent = i === currentPara
      const opacity = isCurrent ? 1 : i === currentPara - 1 ? 0.4 : i === currentPara + 1 ? 0.4 : 0.2
      return (
        <View
          key={i}
          className={`teleprompter__para ${isCurrent ? 'teleprompter__para--current' : ''}`}
          style={{ opacity }}
        >
          <Text className="teleprompter__para-text">{paragraphs[i]}</Text>
        </View>
      )
    })
  }

  return (
    <View className="page-root record-page">
      <Toast />

      {/* Header */}
      <View className="record-page__header">
        <View className="record-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="record-page__title">提词器 · 录制</Text>
        <View className="record-page__asr-status">
          <View className={`asr-dot ${connected ? 'asr-dot--active' : ''}`} />
          <Text className="asr-label">{connected ? 'ASR' : '---'}</Text>
        </View>
      </View>

      {/* Teleprompter */}
      <View className="teleprompter">
        {renderParagraphs()}
        {recognizing ? (
          <Text className="teleprompter__recognizing">{recognizing}</Text>
        ) : null}
      </View>

      {/* Recording controls */}
      <View className="record-page__controls safe-area-bottom">
        {recordState === 'idle' && (
          <View className="record-page__idle-controls">
            <View
              className="record-btn record-btn--idle"
              onClick={startRecording}
            >
              <View className="record-btn__inner" />
            </View>
            <Text className="record-page__hint">点击开始录制</Text>
          </View>
        )}

        {(recordState === 'recording' || recordState === 'paused') && (
          <View className="record-page__active-controls">
            <Text className="record-page__timer">{formatTime(elapsedMs)}</Text>
            <View className="record-page__btns">
              {recordState === 'recording' ? (
                <View className="ctrl-btn ctrl-btn--pause" onClick={pauseRecording}>⏸ 暂停</View>
              ) : (
                <View className="ctrl-btn ctrl-btn--resume" onClick={resumeRecording}>▶ 继续</View>
              )}
              <View
                className={`record-btn ${recordState === 'recording' ? 'record-btn--recording' : 'record-btn--paused'}`}
                onClick={stopRecording}
              >
                <View className="record-btn__stop" />
              </View>
              <View className="ctrl-btn ctrl-btn--reset" onClick={resetRecording}>↩ 重录</View>
            </View>
          </View>
        )}
      </View>

      {/* Completion modal */}
      {showCompletion && (
        <View className="completion-modal">
          <View className="completion-modal__backdrop" onClick={() => setShowCompletion(false)} />
          <View className="completion-modal__card">
            <Text className="completion-modal__title">录制完成 🎬</Text>
            <Text className="completion-modal__duration">录制时长：{formatTime(elapsedMs)}</Text>
            <View className="completion-modal__actions">
              <View className="completion-modal__reset" onClick={resetRecording}>
                重新录制
              </View>
              <GlowButton onClick={handleSubmit} loading={submitting} size="md">
                提交剪辑 →
              </GlowButton>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
```

### `src/pages/record/index.scss`

```scss
@import '../../styles/tokens.scss';

.record-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__back {
    font-size: var(--text-xl);
    color: var(--color-text-2);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__asr-status {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .asr-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-text-3);
    transition: background var(--duration-normal);

    &--active {
      background: var(--color-success);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }
  }

  .asr-label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  &__controls {
    padding: var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
  }

  &__idle-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-3);
  }

  &__active-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  &__timer {
    font-family: var(--font-mono);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-cyan);
    letter-spacing: 2px;
  }

  &__btns {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
}

// ─── Teleprompter ─────────────────────────────────────────────────────────────
.teleprompter {
  flex: 1;
  padding: var(--space-8) var(--space-6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-5);
  position: relative;

  &__para {
    transition: opacity var(--duration-normal) var(--ease-out);
    position: relative;

    &--current {
      background: radial-gradient(ellipse 100% 60px at 50% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 100%);
      border-radius: var(--radius-md);
      padding: var(--space-3);
    }
  }

  &__para-text {
    font-family: var(--font-teleprompter);
    font-size: 22px;
    line-height: 1.75;
    color: var(--color-text-1);
    text-align: justify;
  }

  &__recognizing {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    font-family: var(--font-mono);
    font-style: italic;
    text-align: center;
    margin-top: var(--space-2);
  }
}

// ─── Record button ────────────────────────────────────────────────────────────
.record-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-hot);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;

  &__inner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff;
    opacity: 0.9;
  }

  &__stop {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    background: #fff;
    opacity: 0.9;
  }

  &--idle {
    box-shadow: 0 0 12px rgba(255, 45, 120, 0.4), 0 0 24px rgba(255, 45, 120, 0.15);
  }

  &--recording {
    animation: breathe 1.8s ease-in-out infinite;
  }

  &--paused {
    box-shadow: 0 0 12px rgba(255, 152, 0, 0.4);
    background: var(--color-warning);
  }
}

@keyframes breathe {
  0%, 100% {
    box-shadow: 0 0 12px rgba(255, 45, 120, 0.4), 0 0 24px rgba(255, 45, 120, 0.2);
  }
  50% {
    box-shadow: 0 0 24px rgba(255, 45, 120, 0.8), 0 0 48px rgba(255, 45, 120, 0.4);
  }
}

// ─── Control buttons ──────────────────────────────────────────────────────────
.ctrl-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: var(--font-body);
  cursor: pointer;
  border: 1px solid var(--border-default);
  transition: all var(--duration-fast);

  &--pause, &--resume {
    color: var(--color-cyan);
    border-color: var(--color-cyan);
    background: var(--color-cyan-dim);
  }

  &--reset {
    color: var(--color-text-2);
    background: var(--bg-elevated);
  }

  &:active { opacity: 0.7; }
}

// ─── Completion modal ─────────────────────────────────────────────────────────
.completion-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }

  &__card {
    position: relative;
    width: 100%;
    background: var(--bg-elevated);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-top: 1px solid var(--border-active);
    padding: var(--space-6) var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
    animation: slide-up var(--duration-normal) var(--ease-out);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-text-1);
  }

  &__duration {
    font-family: var(--font-mono);
    font-size: var(--text-md);
    color: var(--color-cyan);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }

  &__reset {
    flex: 1;
    text-align: center;
    padding: var(--space-3) 0;
    color: var(--color-text-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    cursor: pointer;

    &:active { opacity: 0.6; }
  }

  @keyframes slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 9: Video status page

- [ ] Create `src/pages/video/status.tsx`
- [ ] Create `src/pages/video/status.scss`

### `src/pages/video/status.tsx`

```tsx
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import HudCard from '../../components/hud-card'
import GlowButton from '../../components/glow-button'
import StepProgress from '../../components/step-progress'
import Toast, { useToast } from '../../components/toast'
import { useVideoPoller } from '../../hooks/useVideoPoller'
import type { VideoStatus } from '../../types/api'
import './status.scss'

type StepState = 'done' | 'active' | 'pending' | 'error'

interface ProcessStep {
  label: string
  state: StepState
}

function buildSteps(status: VideoStatus | null): ProcessStep[] {
  if (!status) {
    return [
      { label: '上传完成', state: 'done' },
      { label: '剪辑静音片段', state: 'pending' },
      { label: '生成字幕', state: 'pending' },
      { label: '导出视频', state: 'pending' },
    ]
  }
  if (status.status === 'processing') {
    const prog = status.progress ?? 0
    return [
      { label: '上传完成', state: 'done' },
      { label: '剪辑静音片段', state: prog < 50 ? 'active' : 'done' },
      { label: '生成字幕', state: prog >= 50 && prog < 85 ? 'active' : prog >= 85 ? 'done' : 'pending' },
      { label: '导出视频', state: prog >= 85 ? 'active' : 'pending' },
    ]
  }
  if (status.status === 'completed') {
    return [
      { label: '上传完成', state: 'done' },
      { label: '剪辑静音片段', state: 'done' },
      { label: '生成字幕', state: 'done' },
      { label: '导出视频', state: 'done' },
    ]
  }
  // failed
  return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑静音片段', state: 'error' },
    { label: '生成字幕', state: 'pending' },
    { label: '导出视频', state: 'pending' },
  ]
}

export default function VideoStatusPage() {
  const router = useRouter()
  const toast = useToast()
  const videoId = router.params.video_id ?? null

  const { status } = useVideoPoller(videoId)
  const steps = buildSteps(status)

  function handleSaveToAlbum() {
    if (!status?.processed_video_url) return
    Taro.saveVideoToPhotosAlbum({
      filePath: status.processed_video_url,
      success: () => toast.success('视频已保存到相册'),
      fail: () => toast.error('保存失败，请检查相册权限'),
    })
  }

  function handleReRecord() {
    Taro.navigateBack({ delta: 2 })
  }

  function handleResubmit() {
    Taro.navigateBack({ delta: 1 })
  }

  const isProcessing = !status || status.status === 'processing'
  const isCompleted = status?.status === 'completed'
  const isFailed = status?.status === 'failed'

  return (
    <View className="page-root status-page">
      <Toast />

      {/* Header */}
      <View className="status-page__header">
        <View className="status-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="status-page__title">视频处理</Text>
        <View className="status-page__ph" />
      </View>

      <View className="status-page__body">
        {/* Step progress */}
        <HudCard color={isFailed ? 'hot' : isCompleted ? 'cyan' : 'primary'} className="status-page__steps-card">
          <StepProgress steps={steps} />
        </HudCard>

        {/* Processing state */}
        {isProcessing && (
          <HudCard className="status-page__processing-card">
            <View className="processing-anim">
              <Text className="processing-anim__icon">🎬</Text>
              <View className="processing-anim__bars">
                <View className="bar" />
                <View className="bar" />
                <View className="bar" />
                <View className="bar" />
                <View className="bar" />
              </View>
            </View>
            <Text className="status-page__processing-label">AI 剪辑处理中...</Text>
            <Text className="status-page__processing-hint">预计还需 1-2 分钟</Text>
          </HudCard>
        )}

        {/* Completed state */}
        {isCompleted && (
          <View className="status-page__completed">
            <HudCard color="cyan" className="status-page__video-card">
              {/* Video thumbnail placeholder */}
              <View className="video-thumb">
                <Text className="video-thumb__icon">▶</Text>
              </View>
              <View className="video-info">
                <Text className="video-info__ready">视频已就绪 ✓</Text>
                <Text className="video-info__hint">可保存到相册或重新录制</Text>
              </View>
            </HudCard>
            <View className="status-page__completed-actions">
              <GlowButton onClick={handleSaveToAlbum} size="lg" fullWidth>
                💾 保存到相册
              </GlowButton>
              <View className="status-page__re-record" onClick={handleReRecord}>
                重新录制
              </View>
            </View>
          </View>
        )}

        {/* Failed state */}
        {isFailed && (
          <View className="status-page__failed">
            <HudCard color="hot" className="status-page__error-card">
              <Text className="error-icon">⚠</Text>
              <Text className="error-msg">
                {status.error_msg ?? '处理失败，请重新提交'}
              </Text>
            </HudCard>
            <GlowButton onClick={handleResubmit} variant="danger" size="md" fullWidth>
              重新提交
            </GlowButton>
          </View>
        )}
      </View>
    </View>
  )
}
```

### `src/pages/video/status.scss`

```scss
@import '../../styles/tokens.scss';

.status-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__back {
    font-size: var(--text-xl);
    color: var(--color-text-2);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__ph { width: 32px; }

  &__body {
    flex: 1;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__steps-card {
    padding: var(--space-5) var(--space-4);
  }

  &__processing-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
  }

  &__processing-label {
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-primary);
  }

  &__processing-hint {
    font-size: var(--text-sm);
    color: var(--color-text-3);
  }

  &__completed {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__video-card {
    display: flex;
    gap: var(--space-4);
    align-items: center;
  }

  &__completed-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__re-record {
    text-align: center;
    color: var(--color-text-2);
    font-size: var(--text-base);
    padding: var(--space-3);
    cursor: pointer;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);

    &:active { opacity: 0.6; }
  }

  &__failed {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
  }
}

// ─── Processing animation ─────────────────────────────────────────────────────
.processing-anim {
  display: flex;
  align-items: center;
  gap: var(--space-4);

  &__icon { font-size: 40px; }

  &__bars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 32px;
  }
}

.bar {
  width: 5px;
  border-radius: 3px;
  background: var(--color-primary);
  animation: eq-bounce 1.2s ease-in-out infinite;

  &:nth-child(1) { height: 16px; animation-delay: 0s; }
  &:nth-child(2) { height: 28px; animation-delay: 0.15s; }
  &:nth-child(3) { height: 20px; animation-delay: 0.3s; }
  &:nth-child(4) { height: 32px; animation-delay: 0.45s; }
  &:nth-child(5) { height: 14px; animation-delay: 0.6s; }
}

@keyframes eq-bounce {
  0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
}

// ─── Video thumbnail placeholder ──────────────────────────────────────────────
.video-thumb {
  width: 90px;
  height: 60px;
  background: var(--bg-base);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  flex-shrink: 0;

  &__icon {
    font-size: var(--text-xl);
    color: var(--color-cyan);
  }
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  &__ready {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-success);
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-3);
  }
}

// ─── Error card content ───────────────────────────────────────────────────────
.error-icon {
  font-size: 36px;
  color: var(--color-error);
}

.error-msg {
  font-size: var(--text-base);
  color: var(--color-error);
  text-align: center;
  line-height: 1.6;
}
```

**Verification:** `npx tsc --noEmit`

---

## Task 10: My videos page, Create hub, Profile, and wiring

- [ ] Create `src/pages/videos/index.tsx`
- [ ] Create `src/pages/videos/index.scss`
- [ ] Create `src/pages/create/index.tsx`
- [ ] Create `src/pages/create/index.scss`
- [ ] Create `src/pages/profile/index.tsx`
- [ ] Create `src/pages/profile/index.scss`
- [ ] Verify `src/app.config.ts` has all 8 pages and correct tabBar

### `src/pages/videos/index.tsx`

```tsx
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getVideoStatus } from '../../api/video'
import type { VideoStatus } from '../../types/api'
import './index.scss'

type StatusFilter = '全部' | '处理中' | '完成' | '失败'
const STATUS_FILTERS: StatusFilter[] = ['全部', '处理中', '完成', '失败']

// Minimal local representation for a created video entry
interface VideoEntry {
  id: string
  title: string
  createdAt: string
  durationSecs: number
  status: VideoStatus['status']
  thumbnailUrl?: string
}

// In a real implementation these would come from a /api/videos/my endpoint.
// For now we read from local storage (set by the record/status pages).
function loadLocalVideos(): VideoEntry[] {
  try {
    const raw = Taro.getStorageSync('my_videos') as string | undefined
    if (!raw) return []
    return JSON.parse(raw) as VideoEntry[]
  } catch {
    return []
  }
}

function statusLabel(s: VideoEntry['status']): string {
  const map: Record<string, string> = {
    processing: '处理中',
    completed: '完成',
    failed: '失败',
  }
  return map[s] ?? s
}

function statusClass(s: VideoEntry['status']): string {
  const map: Record<string, string> = {
    processing: 'badge--processing',
    completed: 'badge--completed',
    failed: 'badge--failed',
  }
  return map[s] ?? ''
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function VideosPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusFilter>('全部')
  const [videos, setVideos] = useState<VideoEntry[]>([])

  useLoad(() => {
    setVideos(loadLocalVideos())
  })

  const filtered = filter === '全部'
    ? videos
    : videos.filter((v) => {
        if (filter === '处理中') return v.status === 'processing'
        if (filter === '完成') return v.status === 'completed'
        if (filter === '失败') return v.status === 'failed'
        return true
      })

  function handleLongPress(video: VideoEntry) {
    Taro.showActionSheet({
      itemList: ['删除', '重新录制', '分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          const updated = videos.filter((v) => v.id !== video.id)
          setVideos(updated)
          Taro.setStorageSync('my_videos', JSON.stringify(updated))
          toast.success('已删除')
        } else if (res.tapIndex === 1) {
          Taro.navigateBack()
        } else if (res.tapIndex === 2) {
          toast.info('分享功能即将上线')
        }
      },
    })
  }

  function goCreate() {
    Taro.switchTab({ url: '/pages/create/index' })
  }

  return (
    <View className="page-root videos-page">
      <Toast />

      <View className="videos-page__header">
        <Text className="videos-page__title">我的作品</Text>
        <Text className="videos-page__count">{videos.length} 个视频</Text>
      </View>

      {/* Status filter */}
      <View className="videos-page__filters">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f} label={f} selected={filter === f} onSelect={(l) => setFilter(l as StatusFilter)} />
        ))}
      </View>

      {/* Video list */}
      <View className="videos-page__list">
        {filtered.length === 0 && (
          <View className="videos-page__empty">
            <Text className="videos-page__empty-icon">🎬</Text>
            <Text className="videos-page__empty-text">还没有作品，去创作第一个吧</Text>
            <GlowButton onClick={goCreate} size="sm">
              去创作
            </GlowButton>
          </View>
        )}
        {filtered.map((video) => (
          <View
            key={video.id}
            className="video-item"
            onLongPress={() => handleLongPress(video)}
          >
            {/* Thumbnail */}
            <View className="video-item__thumb">
              <Text className="video-item__thumb-icon">▶</Text>
            </View>

            {/* Info */}
            <View className="video-item__info">
              <View className="video-item__top">
                <Text className="video-item__title">{video.title || '未命名作品'}</Text>
                <View className={`video-item__badge ${statusClass(video.status)}`}>
                  {statusLabel(video.status)}
                </View>
              </View>
              <View className="video-item__meta">
                <Text className="video-item__date">{formatDate(video.createdAt)}</Text>
                {video.durationSecs > 0 && (
                  <Text className="video-item__dur">
                    {Math.floor(video.durationSecs / 60)}:{(video.durationSecs % 60).toString().padStart(2, '0')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
```

### `src/pages/videos/index.scss`

```scss
@import '../../styles/tokens.scss';
@import '../../styles/mixins.scss';

.videos-page {
  min-height: 100vh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-4) var(--space-3);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text-1);
  }

  &__count {
    font-size: var(--text-sm);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }

  &__filters {
    display: flex;
    gap: var(--space-2);
    padding: 0 var(--space-4) var(--space-3);
    flex-wrap: wrap;
  }

  &__list {
    padding: 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-16) var(--space-4);
    color: var(--color-text-3);
  }

  &__empty-icon { font-size: 48px; }
  &__empty-text { font-size: var(--text-base); text-align: center; }
}

.video-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  transition: border-color var(--duration-fast);

  &:active { border-color: var(--border-default); }

  &__thumb {
    width: 90px;
    height: 60px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid var(--border-subtle);

    &-icon {
      font-size: var(--text-xl);
      color: var(--color-text-3);
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  &__title {
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text-1);
    @include truncate(1);
    flex: 1;
  }

  &__badge {
    font-size: var(--text-xs);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    flex-shrink: 0;

    &.badge--processing {
      background: var(--color-cyan-dim);
      color: var(--color-cyan);
      border: 1px solid rgba(0, 229, 255, 0.3);
    }
    &.badge--completed {
      background: var(--color-success-dim);
      color: var(--color-success);
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    &.badge--failed {
      background: var(--color-error-dim);
      color: var(--color-error);
      border: 1px solid rgba(244, 67, 54, 0.3);
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__date,
  &__dur {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }
}
```

### `src/pages/create/index.tsx`

```tsx
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import GlowButton from '../../components/glow-button'
import HudCard from '../../components/hud-card'
import './index.scss'

export default function CreatePage() {
  function goTemplate() {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  function goFree() {
    Taro.navigateTo({ url: '/pages/script/generate' })
  }

  return (
    <View className="page-root create-page">
      <View className="create-page__header">
        <Text className="create-page__title">开始创作</Text>
        <Text className="create-page__sub">选择你的创作方式</Text>
      </View>

      <View className="create-page__cards">
        <HudCard color="primary" className="create-card" style={{ cursor: 'pointer' }}>
          <View onClick={goTemplate}>
            <Text className="create-card__icon">📋</Text>
            <Text className="create-card__title">从模板创作</Text>
            <Text className="create-card__desc">
              从爆款模板出发，AI 按结构填充内容，快速产出高质量文案
            </Text>
            <View className="create-card__btn-row">
              <GlowButton onClick={goTemplate} size="sm">
                浏览模板 →
              </GlowButton>
            </View>
          </View>
        </HudCard>

        <HudCard color="cyan" className="create-card" style={{ cursor: 'pointer' }}>
          <View onClick={goFree}>
            <Text className="create-card__icon">✍️</Text>
            <Text className="create-card__title">自由创作</Text>
            <Text className="create-card__desc">
              输入你的主题和风格，让 AI 从零帮你写一篇口播文案
            </Text>
            <View className="create-card__btn-row">
              <GlowButton onClick={goFree} size="sm">
                自由创作 →
              </GlowButton>
            </View>
          </View>
        </HudCard>
      </View>
    </View>
  )
}
```

### `src/pages/create/index.scss`

```scss
@import '../../styles/tokens.scss';

.create-page {
  min-height: 100vh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));

  &__header {
    padding: var(--space-8) var(--space-4) var(--space-5);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-text-1);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__sub {
    font-size: var(--text-md);
    color: var(--color-text-2);
  }

  &__cards {
    padding: 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
}

.create-card {
  padding: var(--space-5) !important;
  cursor: pointer;

  &__icon {
    font-size: 36px;
    display: block;
    margin-bottom: var(--space-3);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-text-1);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__desc {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    line-height: 1.6;
    display: block;
    margin-bottom: var(--space-4);
  }

  &__btn-row { display: flex; }
}
```

### `src/pages/profile/index.tsx`

```tsx
import { View, Text } from '@tarojs/components'
import './index.scss'

export default function ProfilePage() {
  return (
    <View className="page-root profile-page">
      <View className="profile-page__header">
        <View className="profile-avatar">
          <Text className="profile-avatar__letter">U</Text>
        </View>
        <Text className="profile-page__name">创作者</Text>
        <Text className="profile-page__id">ID: ---</Text>
      </View>

      <View className="profile-page__coming-soon">
        <Text className="profile-page__cs-icon">🚀</Text>
        <Text className="profile-page__cs-title">个人中心即将上线</Text>
        <Text className="profile-page__cs-desc">
          数据统计、创作历史、账号设置正在开发中
        </Text>
      </View>
    </View>
  )
}
```

### `src/pages/profile/index.scss`

```scss
@import '../../styles/tokens.scss';

.profile-page {
  min-height: 100vh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));

  &__header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-10) var(--space-4) var(--space-6);
    gap: var(--space-2);
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-text-1);
  }

  &__id {
    font-size: var(--text-sm);
    color: var(--color-text-3);
    font-family: var(--font-mono);
  }

  &__coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8) var(--space-6);
    color: var(--color-text-3);
  }

  &__cs-icon { font-size: 48px; }
  &__cs-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-2);
  }
  &__cs-desc {
    font-size: var(--text-sm);
    text-align: center;
    line-height: 1.6;
  }
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-primary-dim);
  border: 2px solid var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--glow-primary);

  &__letter {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-primary);
  }
}
```

### Final commit

After all tasks are verified:

```bash
git add src/
git commit -m "feat: complete koubo frontend — Cyber Creator Studio design system + all 8 pages"
```

**Verification:** `npx tsc --noEmit`

---

## Implementation notes

### Environment variable for API base URL

Set in the project root or CI:

```bash
# .env.development
TARO_APP_API_BASE=http://localhost:8080

# .env.production.weapp
TARO_APP_API_BASE=https://api.yourdomain.com
```

Taro exposes env vars with the `TARO_APP_` prefix to all platforms.

### Miniprogram domain whitelist

In the WeChat MP console add your API domain to the **request合法域名** and **socket合法域名** lists:
- `https://api.yourdomain.com` for HTTP requests
- `wss://api.yourdomain.com` for WebSocket ASR

### RecorderManager permissions

Add `scope.record` to the miniprogram `app.json` (handled via `app.config.ts` `requiredPrivateInfos` in Taro):

```ts
// Inside defineAppConfig({})
requiredPrivateInfos: ['getLocation'],
permission: {
  'scope.record': {
    desc: '录制音频用于语音识别和视频配音',
  },
},
```

### Platform differences

| Feature | WeChat | Douyin | H5 |
|---|---|---|---|
| SSE streaming | `enableChunked: true` | Same | `fetch + ReadableStream` |
| WebSocket | `Taro.connectSocket` | Same | Native `WebSocket` |
| RecorderManager | ✓ | ✓ | `MediaRecorder` (not yet wired) |
| `saveVideoToPhotosAlbum` | ✓ | ✓ | Not available |

H5 audio recording requires a separate `MediaRecorder` branch in `useASRSocket` — add when H5 support is prioritized.

### Type augmentation

Create `src/types/miniprogram.d.ts` to silence TypeScript errors for miniprogram globals:

```ts
// Silence "cannot find name 'wx'" etc. when targeting miniprogram
declare const wx: any
declare const tt: any
declare const my: any
```
