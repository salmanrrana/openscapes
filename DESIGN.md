# Design

## Theme

A dark cosmic psychedelic fog installation: near-black space, pointillist particles, crimson signal blooms, ultraviolet haze, and cyan-green quiet energy. The visual field should feel painted and computational at the same time.

## Color Palette

Use OKLCH tokens in CSS.

```css
:root {
  --color-bg: oklch(0.065 0 0);
  --color-surface: oklch(0.145 0.032 285);
  --color-surface-strong: oklch(0.205 0.047 295);
  --color-ink: oklch(0.965 0.012 295);
  --color-muted: oklch(0.735 0.035 300);
  --color-primary: oklch(0.58 0.22 11);
  --color-accent: oklch(0.76 0.17 176);
  --color-violet: oklch(0.63 0.21 302);
  --color-halo: oklch(0.86 0.14 105);
}
```

Primary crimson comes from the brand seed and appears as interaction blooms, hot dots, focus rings, and live audio status. Cyan-green is the quieter counterpoint for signal readouts and secondary controls. Violet owns the fog.

## Typography

Use a no-external-asset stack for privacy and portability. Headings lean on Trebuchet MS when available, then system sans. Body uses the same stack with lighter weight and generous line height for dark-mode readability.

- Display: fluid, max 6rem, tight but not cramped.
- Body: 1rem to 1.1rem, line-height around 1.65.
- Labels: compact, readable, never tiny tracked labels above every section.

## Layout

Single-page installation. Canvas is the stage. Interface floats in a deliberate two-part composition:

- Intro panel: explains the signal sources and starts the soundscape.
- Signal console: shows live local values, pointer state, and camera light state when the opt-in instrument is active.

On small screens, controls stack at the bottom and the intro panel becomes a compact overlay.

## Motion

Motion comes from the piece itself: slow fog drift, pointillist particle flow, click blooms, and gentle UI state changes. Use reduced motion to lower particle count, reduce drift, and shorten bloom tails. No scroll reveal system.

## Interaction

- Attempt autoplay on load.
- If blocked, show a direct start button.
- Pointer or touch position maps to pitch, stereo pan, envelope length, filter brightness, and visual bloom.
- Light instrument asks for camera access only after the visitor presses the control. Average brightness opens filters and changes decay, hue selects pitch space and pan, saturation adds upper partials, and movement triggers soft light notes.
- Pause and mute remain available after start.
- Keyboard users can start audio with the primary button and trigger a centered sound seed with the Space key when the stage is focused.
