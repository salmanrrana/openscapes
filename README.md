# OpenScapes

A simple static browser art installation. OpenScapes turns local no-permission browser signals into a drifting ambient soundscape and pointillist cosmic fog.

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
