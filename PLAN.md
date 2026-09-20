# Pocket Grove — incremental game plan

## Concept
Start with one tiny garden. Harvest and sell by click or Space to earn **Cash**, then buy plants that earn Cash automatically. Each purchase makes the floating island look fuller. Goals start small and grow with the player's earning power.

## Reference and design direction
[Bottle Flip Inc on Steam](https://store.steampowered.com/app/4932820/Bottle_Flip_Inc/) starts with a satisfying money-earning action, then adds more items, helper hands, abilities, and a skill tree. Pocket Grove uses that rhythm with harvesting and a cozy garden theme. [Cookie Clicker](https://store.steampowered.com/app/1454400/Cookie_Clicker/) informs the escalating shop; [Rusty's Retirement](https://store.steampowered.com/app/2666510/Rustys_Retirement/) and [Forager](https://store.steampowered.com/app/751780/Forager/) inform visible world growth. Later layers should add a new choice, not just a larger number.

## Core loop and rules
1. Click **Harvest** or press **Space anywhere** to earn $1. Better Tools raises each harvest to $2. Harvesting should feel responsive without demanding constant clicking.
2. Spend Cash on automatic earners: **Flower** ($10, +$0.08/s), **Beehive** ($60, +$0.50/s after $100 total earned), and **Tree** ($250, +$2/s after $500 total earned). Each extra copy costs `ceil(base cost × 1.4^owned)`.
3. Buy one-time upgrades: **Better Tools** ($200), **Watering Can** ($300, doubles Flower income), and **Pollination** ($800, doubles Beehive income).
4. Total Cash earned drives an increasing goal ladder: **$25** for first sprouts, **$100** for Beehives, **$500** for a new garden patch and Trees, then **$6,000** for a complete grove. After that, repeatable cash goals double: $12,000, $24,000, and so on. Spending Cash never reverses progress.
5. Plants earn while the game is open. On return, award up to 8 hours of offline income and show the amount. There is no failure state or energy limit.

## First playable scope and feel
One currency, three earners, three upgrades, local save, offline earnings, sound and motion controls, and a reset option. Target the first Flower in about 10 seconds, first goal within a minute, Beehive around 3 minutes, and complete grove around 20–30 minutes. Tune from player feedback.

Use a compact single-screen desktop layout: garden, Cash counter, Harvest button, and all six purchases visible together. Show a green up arrow when a purchase is affordable and a red price when Cash is short. Bright CSS garden shapes gain flowers, bees, and trees as the player buys them; support keyboard play and reduced motion.

## Tech and growth path
Build in **TypeScript + Vite + CSS**. Keep economy rules separate from UI; store a versioned state and last-played time in `localStorage`. Next, consider a special harvest ability and a second collectible resource for a small skill tree, inspired by Bottle Flip Inc. Add these only after the Cash loop feels good.
