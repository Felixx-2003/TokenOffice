# Incremental Game Series

Four standalone incremental games live in one GitHub repository:

- **Stage 1 — Token Office:** prompt model desks, unlock automation, and upgrade an absurd AI office.
- **Stage 2 — Token Circus:** crack a Prompt Whip, recruit AI performers, trigger Standing Ovations, and turn successful shows into permanent Golden Tickets.
- **Stage 3 — Token Heist:** assemble an AI crew, breach ridiculous vaults, and escape with permanent Master Blueprints.
- **Stage 4 — Token Timeline:** repair six absurd eras, trigger Time Rush, and rewind for permanent Timeline Echoes.

Each stage has separate source code and browser save data while sharing one production build.

## Play locally

Run from the repository root:

```text
npm install
npm run dev:stage1
```

Or start Stage 2:

```text
npm run dev:stage2
```

Or start Stage 3:

```text
npm run dev:stage3
```

Or start Stage 4:

```text
npm run dev:stage4
```

## Production build

Run `npm run build` from the repository root. The combined static output is written to `dist/`:

- `/` serves Stage 1 — Token Office.
- `/stage-2/` serves Stage 2 — Token Circus.
- `/stage-3/` serves Stage 3 — Token Heist.
- `/stage-4/` serves Stage 4 — Token Timeline.

For Cloudflare Workers Builds, keep the repository root as the root directory, use `npm run build` as the build command, and use `npx wrangler deploy` as the deploy command. The root `wrangler.jsonc` publishes the combined `dist/` directory to the `tokenoffice` Worker.
