# Pocket Arcade — short game plan

## Player promise
Turn one arcade play into a room full of machines. Every purchase increases visible Cash income; machine rarity tells the player how much bigger the next step is.

## Research and design
[Bottle Flip Inc Demo](https://store.steampowered.com/app/4966120/Bottle_Flip_Inc_Demo/) uses a manual money action, more purchasable objects, helper automation, abilities, and an upgrade tree. [Clicker Heroes](https://store.steampowered.com/app/363970/Clicker_Heroes/) shows the appeal of keeping progress while idle. Pocket Arcade adapts that loop to arcade machines. Rarity is a fixed property of each shop item, displayed with a name, color, and payout; upgrades are predictable purchases, with no random rolls.

## Gameplay and rules
- Click **Play** or press **Space anywhere** for $50. The Rare Power Glove makes each manual and automatic play worth $100.
- Buy machines. Each copy costs `ceil(base price × 1.3^owned)` and produces Cash every second. Machines stay visible in the arcade as they are acquired.
- At $5,000 total earned, receive a free Common Auto Player. Upgrade it through Rare ($5,000, 5 plays/sec), Epic ($60,000, 25 plays/sec), and Legendary ($700,000, 150 plays/sec). Its plays use the current manual play value.
- Save locally; grant up to eight hours of offline Cash. Spending never reverses a level or unlock.

| Item | Rarity | First price | Income or effect |
| --- | --- | ---: | --- |
| Coin Pusher | Common | $500 | +$30/sec |
| Pinball Table | Rare | $7,500 | +$450/sec |
| Claw Machine | Epic | $100,000 | +$6,000/sec |
| Jackpot Cabinet | Legendary | $1,500,000 | +$90,000/sec |
| Power Glove | Rare | $3,000 | Double play Cash |
| Coin Booster | Common | $10,000 | Double Coin Pushers |
| Multiball | Epic | $120,000 | Double Pinball Tables |

## Pace and presentation
Levels start at $0, $1,000, $5,000, $50,000, and $500,000 lifetime Cash. The first machine takes ten plays; buying it starts idle income. Higher rarity machines cost about 13–15 times the prior tier and earn about 13–15 times as much, so their payback stays near 17 seconds. Use a dark arcade room, neon machine accents (Common green, Rare blue, Epic purple, Legendary gold), a readable Cash counter, green affordable arrows, and red unaffordable prices. Keep all purchases visible on a desktop screen.

## Tech and next feedback
TypeScript, Vite, CSS, localStorage, and no backend. Prototype scope: four machines, three permanent upgrades, a four-tier Auto Player, sound and motion controls. Ask players whether the first machine, free automation, and first Epic purchase feel timely before adding a skill tree or prestige.
