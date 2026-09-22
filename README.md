# Incremental Game Series

Two standalone incremental games live in this repository:

- **Stage 1 — Token Office:** Prompt model desks, unlock automation, and upgrade an absurd AI office.
- **Stage 2 — Signal Foundry:** Tune deep-space signals, build a relay fleet, trigger Resonance, and Fold runs into permanent Echo power.

Each stage has its own source, dependencies, save data, and production build. Run commands from the stage folder you want to play.

## Play locally

```text
cd stage-1-token-office
npm install
npm run dev
```

Or:

```text
cd stage-2-signal-foundry
npm install
npm run dev
```

The stages use different browser save keys, so their progress remains separate.

## Production build

Run `npm install` and `npm run build` from this repository root. The combined static output is written to `dist/`:

- `/` serves Stage 1 — Token Office.
- `/stage-2/` serves Stage 2 — Signal Foundry.

For Cloudflare Workers Builds or Pages, use `npm run build` as the build command and `dist` as the output directory.
