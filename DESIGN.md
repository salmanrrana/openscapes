# Design

## Theme

A dark browser-audio installation: near-black space, pointillist particles, ultraviolet signal blooms, deep blue drift, and cyan glints. The visual field should feel painted and computational without splitting into static spotlight blobs.

## Color Palette

Use OKLCH tokens in CSS.

```css
:root {
  --color-bg: oklch(0.055 0.018 275);
  --color-void: oklch(0.032 0.018 272);
  --color-surface: oklch(0.13 0.046 282);
  --color-surface-strong: oklch(0.19 0.07 286);
  --color-ink: oklch(0.95 0.018 286);
  --color-muted: oklch(0.72 0.045 282);
  --color-primary: oklch(0.62 0.22 296);
  --color-accent: oklch(0.76 0.15 220);
  --color-violet: oklch(0.42 0.16 305);
  --color-halo: oklch(0.72 0.16 245);
}
```

Ultraviolet carries interaction blooms, hot dots, focus rings, and live audio status. Cyan-blue is the signal-readout counterpoint. Purple and blue haze move through the field instead of sitting as three separate spotlights.

## Typography

Use Fira Code from Google Fonts across the page. The monospaced texture should feel like an instrument readout without becoming a generic terminal costume.

- Display: fluid, max 6rem, tight but not cramped.
- Body: 1rem to 1.1rem, line-height around 1.65.
- Labels: compact, readable, never tiny tracked labels above every section.

## Layout

Single-page installation. Canvas is the stage. Interface floats in a deliberate two-part composition:

- Intro rail: explains the signal sources and starts the soundscape without a boxed card treatment.
- Signal rail: shows live local values, pointer state, and camera light state with rule lines and a rounded colored top cap.
- Control cluster: stays closed until the visitor asks for it.

On small screens, controls open as a bottom instrument strip with a rounded blue-violet top border.

## Motion

Motion comes from the piece itself: orbiting fog drift, breathing blue and violet washes, pointillist particle flow, click blooms, and gentle UI state changes. Use reduced motion to lower particle count, reduce drift, and shorten bloom tails. No scroll reveal system.

## Interaction

- Attempt autoplay on load.
- If blocked, show a direct start button.
- Pointer or touch position maps to pitch, stereo pan, envelope length, filter brightness, and visual bloom.
- Light instrument asks for camera access only after the visitor presses the control. Average brightness opens filters and changes decay, hue selects pitch space and pan, saturation adds upper partials, and movement triggers soft light notes.
- Pause and mute remain available after start.
- Keyboard users can start audio with the primary button and trigger a centered sound seed with the Space key when the stage is focused.
