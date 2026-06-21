# OpenScapes

A simple static browser art installation. OpenScapes turns local no-permission browser signals into a drifting ambient soundscape and pointillist cosmic fog. An optional Light instrument can sample camera brightness and color after permission, then fold that light into the drones, notes, and blooms.

## Run locally

```sh
npm run dev
```

Open http://localhost:5173.

## Build check

```sh
npm run build
```

## Deploy on Netlify

Use this repo as a Netlify site.

- Build command: `npm run build`
- Publish directory: `site`

Those values are already set in `netlify.toml`.

## Browser audio note

The page attempts autoplay on load. Most browsers block unmuted Web Audio until the visitor clicks or taps. When blocked, OpenScapes keeps the visual field alive and starts sound from the first field click or the Enter OpenScape button.

## Camera light instrument

The Light instrument is opt-in. Press `Light instrument`, approve camera access, then move brightness, color, or shadow through the frame. OpenScapes samples a tiny hidden frame inside the browser and uses average brightness, hue, saturation, and movement to shape tone, pan, filter brightness, reverb tails, and visual blooms.
