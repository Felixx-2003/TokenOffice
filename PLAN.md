# Pocket Grove — game plan

## Player promise
Harvest a tiny garden for **Cash**, then build an automatic grove. Early levels arrive quickly; later goals ask the player to choose between plants, upgrades, and a stronger Auto Harvester. Purchases visibly fill the island.

## Research and design choice
[Bottle Flip Inc Demo](https://store.steampowered.com/app/4966120/Bottle_Flip_Inc_Demo/) moves from a money-earning action to helper automation, abilities, and a skill tree. [Clicker Heroes](https://store.steampowered.com/app/363970/Clicker_Heroes/) also rewards idle progress. [PlinkIdle](https://store.steampowered.com/app/3684530/) shows how color and rarity can make stronger rewards easy to read. Pocket Grove uses **predictable purchases** for rarity tiers so players can plan for the next one; there are no random rolls or loot boxes.

## Core loop
1. Click **Harvest** or press **Space anywhere** to earn $1. Better Tools raises each manual or automatic harvest to $2.
2. Buy automatic earners: Flower ($10, +$0.30/s), Beehive ($60, +$1.50/s), Tree ($250, +$6/s). Each extra copy costs `ceil(base cost × 1.3^owned)`.
3. Buy Better Tools ($80), Watering Can ($150, doubles Flowers), and Pollination ($400, doubles Beehives).
4. Cash keeps earning while open and for up to 8 hours offline. Spending Cash never reverses a level.

## Levels and hands-free play

| Level | Total Cash earned | Reward |
| --- | ---: | --- |
| 1 | Start | Harvest by hand |
| 2 | $25 | First sprouts |
| 3 | $100 | Beehive and **free Common 1★ Auto Harvester** |
| 4 | $300 | Tree and larger garden patch |
| 5 | $3,000 | Full grove; later cash goals double ($6,000, $12,000, …) |

The Auto Harvester repeats the current harvest value, works offline, and displays its tier and stars. Upgrades are permanent:

| Tier | Stars | Auto clicks/sec | Upgrade price |
| --- | ---: | ---: | ---: |
| Common | 1★ | 1 | Free at Level 3 |
| Rare | 2★ | 2 | $60 |
| Epic | 3★ | 5 | $250 |
| Legendary | 4★ | 12 | $900 |

Use common green, rare blue, epic purple, and legendary gold on the Auto Harvester card. Its visual pulse speeds up as the tier rises. Keep the Cash counter, Harvest button, goals, and purchases visible in one desktop screen; green arrows mean affordable, red prices mean more Cash is needed.

## First playable and next steps
The prototype has one currency, three producers, four auto tiers, three other upgrades, local save, sound and motion controls, and reset. Aim for Level 3 in about a minute and Level 5 in roughly 5–10 minutes; adjust after player feedback. Build with **TypeScript + Vite + CSS** and keep economy rules separate from the interface. Later, consider a distinct collectible resource and small ability tree only if they add meaningful choices.
