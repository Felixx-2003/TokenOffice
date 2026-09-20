# Pocket Grove — incremental game plan

## Concept
A cozy, single-screen idle game about restoring a tiny floating garden. Tend one seed by hand, buy plants and helpers that generate **Bloom** automatically, and watch the island become lush. The appeal is that every upgrade changes both the number and the scene.

## Design lessons from references
- [Bottle Flip Inc](https://store.steampowered.com/app/4932820/Bottle_Flip_Inc/) and [Cookie Clicker](https://store.steampowered.com/app/1454400/Cookie_Clicker/): make the first action satisfying, then let players buy automation.
- [Clicker Heroes](https://store.steampowered.com/app/363970/Clicker_Heroes/): use visible milestones and increasingly powerful purchases to keep progress moving.
- [Melvor Idle](https://store.steampowered.com/app/1267910/Melvor_Idle/): support meaningful progress while away; add interconnected systems only after the core loop works.
- [Rusty's Retirement](https://store.steampowered.com/app/2666510/Rustys_Retirement/) and [Forager](https://store.steampowered.com/app/751780/Forager/): make growth visible in the world, with a calm mood and new space to develop.

## Core gameplay and rules
1. Click or tap the central seed to **tend** it and gain 1 Bloom. Each action has a small animation and sound.
2. Spend Bloom on producers: **Flower** (10 Bloom, +0.08/s), **Beehive** (60, +0.5/s; unlocks at 100 lifetime Bloom), **Tree** (250, +2/s; unlocks at 500). Each additional copy costs `ceil(base cost × 1.4^owned)`.
3. Buy one-time upgrades: **Better Tools** (200, +1 per tend), **Watering Can** (300, doubles Flower output), **Pollination** (800, doubles Beehive output).
4. Lifetime Bloom unlocks a new garden patch at 100 and 500, and a completed grove at 6,000. These milestones reveal more scenery and a short celebration; spending Bloom never reverses them.
5. Production continues while the game is open. On return, award elapsed production for up to 8 hours and show a clear earnings summary. No failure state, energy limit, or forced tapping.

## First playable scope
One currency, three producers, three upgrades, four visual stages, local save, offline earnings, sound toggle, and a reset-save option. Aim for the first Flower within 20 seconds, Beehive within 3 minutes, and completed grove in roughly 20–30 minutes; tune prices after playtesting. The grove remains playable after completion.

## Graphics and interface
Bright 2D storybook art built from simple CSS shapes and SVG where useful: an initially bare floating island fills with flowers, bees, trees, and small ambient motion. Show Bloom, Bloom per second, the next milestone, and affordable purchases at a glance. Use readable numbers, large touch targets, keyboard controls, and a reduced-motion setting.

## Tech stack
Browser first: **TypeScript + Vite + CSS + SVG**. Keep economy rules in a small pure game module and content values in data tables. Save a versioned state and last-played timestamp in `localStorage`; compute offline gains from elapsed time. Use lightweight browser audio, with sound off until the player enables it.

## Build order and later growth
1. Implement the economy, purchases, and one-screen UI.
2. Add garden visuals, milestones, save/offline progress, and accessibility controls.
3. Playtest the first 30 minutes and adjust pacing and feedback.

After the first version feels good, consider a second resource and a simple crafting chain, more island patches, then an optional prestige loop. Add each layer only if it creates a new decision for the player.
