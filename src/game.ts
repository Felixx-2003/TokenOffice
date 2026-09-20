/** Pure economy rules for Pocket Grove. */

export type ProducerId = "flower" | "beehive" | "tree";
export type UpgradeId = "betterTools" | "wateringCan" | "pollination";

export interface GameState {
  bloom: number;
  lifetimeBloom: number;
  owned: Record<ProducerId, number>;
  upgrades: Record<UpgradeId, boolean>;
  autoHarvesterStars: number;
  lastTick: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface ProducerMeta {
  id: ProducerId;
  name: string;
  baseCost: number;
  rate: number;
  unlockAt: number;
  description: string;
}

export interface UpgradeMeta {
  id: UpgradeId;
  name: string;
  cost: number;
  description: string;
}

export const PRODUCERS: readonly ProducerMeta[] = [
  {
    id: "flower",
    name: "Flower",
    baseCost: 10,
    rate: 0.3,
    unlockAt: 0,
    description: "Flowers sell for $0.30 per second.",
  },
  {
    id: "beehive",
    name: "Beehive",
    baseCost: 60,
    rate: 1.5,
    unlockAt: 100,
    description: "Busy bees earn $1.50 per second.",
  },
  {
    id: "tree",
    name: "Tree",
    baseCost: 250,
    rate: 6,
    unlockAt: 300,
    description: "A sturdy tree earns $6 per second.",
  },
] as const;

export const UPGRADES: readonly UpgradeMeta[] = [
  {
    id: "betterTools",
    name: "Better Tools",
    cost: 80,
    description: "Each harvest earns $1 extra.",
  },
  {
    id: "wateringCan",
    name: "Watering Can",
    cost: 150,
    description: "Doubles cash earned by every Flower.",
  },
  {
    id: "pollination",
    name: "Pollination",
    cost: 400,
    description: "Doubles cash earned by every Beehive.",
  },
] as const;

const PRODUCER_BY_ID: Record<ProducerId, ProducerMeta> = Object.fromEntries(
  PRODUCERS.map((producer) => [producer.id, producer]),
) as Record<ProducerId, ProducerMeta>;
const UPGRADE_BY_ID: Record<UpgradeId, UpgradeMeta> = Object.fromEntries(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<UpgradeId, UpgradeMeta>;

const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const COST_GROWTH = 1.3;
const AUTO_UNLOCK_AT = 100;
const AUTO_CLICKS_PER_SECOND = [0, 1, 2, 5, 12] as const;
const AUTO_STAR_COSTS = [0, 0, 60, 250, 900] as const;
export const MAX_AUTO_STARS = 4;
export const AUTO_RARITIES = ['Locked', 'Common', 'Rare', 'Epic', 'Legendary'] as const;
const PRODUCER_IDS: readonly ProducerId[] = ["flower", "beehive", "tree"];
const UPGRADE_IDS: readonly UpgradeId[] = [
  "betterTools",
  "wateringCan",
  "pollination",
];

const isProducerId = (id: string): id is ProducerId =>
  PRODUCER_IDS.includes(id as ProducerId);
const isUpgradeId = (id: string): id is UpgradeId =>
  UPGRADE_IDS.includes(id as UpgradeId);

const finiteNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const nonNegativeNumber = (value: unknown, fallback = 0): number =>
  Math.max(0, finiteNumber(value, fallback));

const isNonNegativeFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const safeTimestamp = (value: unknown): number =>
  finiteNumber(value, Date.now());

const emptyOwned = (): Record<ProducerId, number> => ({
  flower: 0,
  beehive: 0,
  tree: 0,
});

const emptyUpgrades = (): Record<UpgradeId, boolean> => ({
  betterTools: false,
  wateringCan: false,
  pollination: false,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Build a fresh, valid state from untrusted data (such as a save file). */
export function normalizeState(input: unknown, now = Date.now()): GameState {
  const raw = isRecord(input) ? input : {};
  const bloom = nonNegativeNumber(raw.bloom);
  const lifetimeBloom = Math.max(bloom, nonNegativeNumber(raw.lifetimeBloom));
  const savedStars = finiteNumber(raw.autoHarvesterStars, 0);
  const autoHarvesterStars = Math.max(
    lifetimeBloom >= AUTO_UNLOCK_AT ? 1 : 0,
    Number.isSafeInteger(savedStars) ? Math.min(MAX_AUTO_STARS, Math.max(0, savedStars)) : 0,
  );
  const owned = emptyOwned();
  const upgrades = emptyUpgrades();

  for (const id of PRODUCER_IDS) {
    const count = finiteNumber(isRecord(raw.owned) ? raw.owned[id] : undefined, 0);
    owned[id] = Number.isSafeInteger(count) ? Math.max(0, count) : 0;
  }
  for (const id of UPGRADE_IDS) {
    upgrades[id] = isRecord(raw.upgrades) && raw.upgrades[id] === true;
  }

  return {
    bloom,
    lifetimeBloom,
    owned,
    upgrades,
    autoHarvesterStars,
    lastTick: safeTimestamp(raw.lastTick ?? now),
    soundEnabled: raw.soundEnabled === true,
    reducedMotion: raw.reducedMotion === true,
  };
}

export function createInitialState(now = Date.now()): GameState {
  return normalizeState(
    {
      bloom: 0,
      lifetimeBloom: 0,
      owned: emptyOwned(),
      upgrades: emptyUpgrades(),
      autoHarvesterStars: 0,
      lastTick: safeTimestamp(now),
      soundEnabled: false,
      reducedMotion: false,
    },
    safeTimestamp(now),
  );
}

const ownedCount = (state: GameState, id: ProducerId): number => {
  const count = finiteNumber(state?.owned?.[id], 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
};

const upgradeOwned = (state: GameState, id: UpgradeId): boolean =>
  state?.upgrades?.[id] === true;

export function getProductionPerSecond(state: GameState): number {
  let production = 0;
  for (const producer of PRODUCERS) {
    let rate = producer.rate;
    if (producer.id === "flower" && upgradeOwned(state, "wateringCan")) {
      rate *= 2;
    }
    if (producer.id === "beehive" && upgradeOwned(state, "pollination")) {
      rate *= 2;
    }
    production += ownedCount(state, producer.id) * rate;
  }
  production += getAutoClicksPerSecond(state) * getTapValue(state);
  return Number.isFinite(production) ? production : 0;
}

export function getTapValue(state: GameState): number {
  return 1 + (upgradeOwned(state, "betterTools") ? 1 : 0);
}

export function getAutoClicksPerSecond(state: GameState): number {
  const stars = finiteNumber(state?.autoHarvesterStars, 0);
  return Number.isSafeInteger(stars) && stars >= 0 && stars <= MAX_AUTO_STARS
    ? AUTO_CLICKS_PER_SECOND[stars]
    : 0;
}

export function getAutoRarity(state: GameState): (typeof AUTO_RARITIES)[number] {
  const stars = finiteNumber(state?.autoHarvesterStars, 0);
  return Number.isSafeInteger(stars) && stars >= 0 && stars <= MAX_AUTO_STARS
    ? AUTO_RARITIES[stars]
    : 'Locked';
}

export function getAutoUpgradeCost(state: GameState): number {
  const stars = finiteNumber(state?.autoHarvesterStars, 0);
  return Number.isSafeInteger(stars) && stars >= 1 && stars < MAX_AUTO_STARS
    ? AUTO_STAR_COSTS[stars + 1]
    : Number.POSITIVE_INFINITY;
}

export function canBuyAutoUpgrade(state: GameState): boolean {
  return isNonNegativeFinite(state?.bloom) &&
    state.lifetimeBloom >= AUTO_UNLOCK_AT &&
    state.bloom >= getAutoUpgradeCost(state);
}

export function buyAutoUpgrade(state: GameState): GameState {
  if (!canBuyAutoUpgrade(state)) return state;
  return {
    ...state,
    bloom: state.bloom - getAutoUpgradeCost(state),
    autoHarvesterStars: state.autoHarvesterStars + 1,
  };
}

export function getProducerCost(state: GameState, id: ProducerId): number {
  if (!isProducerId(id)) return Number.POSITIVE_INFINITY;
  const producer = PRODUCER_BY_ID[id];
  const cost = producer.baseCost * Math.pow(COST_GROWTH, ownedCount(state, id));
  return Number.isFinite(cost) ? Math.ceil(cost) : Number.POSITIVE_INFINITY;
}

export function canBuyProducer(state: GameState, id: ProducerId): boolean {
  if (!isProducerId(id)) return false;
  if (!isNonNegativeFinite(state?.bloom) || !isNonNegativeFinite(state?.lifetimeBloom)) {
    return false;
  }
  const producer = PRODUCER_BY_ID[id];
  return (
    state.lifetimeBloom >= producer.unlockAt &&
    state.bloom >= getProducerCost(state, id)
  );
}

export function buyProducer(state: GameState, id: ProducerId): GameState {
  if (!canBuyProducer(state, id)) return state;
  const cost = getProducerCost(state, id);
  return {
    ...state,
    bloom: state.bloom - cost,
    owned: {
      ...state.owned,
      [id]: ownedCount(state, id) + 1,
    },
  };
}

export function canBuyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!isUpgradeId(id)) return false;
  if (!isNonNegativeFinite(state?.bloom)) return false;
  const upgrade = UPGRADE_BY_ID[id];
  return !upgradeOwned(state, id) &&
    state.bloom >= upgrade.cost;
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  if (!canBuyUpgrade(state, id)) return state;
  const upgrade = UPGRADE_BY_ID[id];
  return {
    ...state,
    bloom: state.bloom - upgrade.cost,
    upgrades: {
      ...state.upgrades,
      [id]: true,
    },
  };
}

export function tap(state: GameState): GameState {
  const value = getTapValue(state);
  if (!isNonNegativeFinite(state?.bloom) || !isNonNegativeFinite(state?.lifetimeBloom)) {
    return state;
  }
  const bloom = state.bloom;
  const lifetimeBloom = state.lifetimeBloom;
  const nextLifetime = lifetimeBloom + value;
  return {
    ...state,
    bloom: bloom + value,
    lifetimeBloom: nextLifetime,
    autoHarvesterStars: nextLifetime >= AUTO_UNLOCK_AT ? Math.max(1, state.autoHarvesterStars) : state.autoHarvesterStars,
  };
}

export function advanceTime(
  state: GameState,
  now: number,
): { state: GameState; earned: number; elapsedMs: number } {
  const currentTime = finiteNumber(now, state.lastTick);
  if (!Number.isFinite(currentTime)) {
    return { state, earned: 0, elapsedMs: 0 };
  }
  if (!Number.isFinite(state?.lastTick)) {
    return {
      state: { ...state, lastTick: currentTime },
      earned: 0,
      elapsedMs: 0,
    };
  }
  const lastTick = state.lastTick;
  if (currentTime < lastTick) {
    // A system clock correction must not create a negative payout. Reset the
    // anchor so normal progress can resume from the corrected clock.
    return {
      state: { ...state, lastTick: currentTime },
      earned: 0,
      elapsedMs: 0,
    };
  }
  if (currentTime === lastTick) {
    return { state, earned: 0, elapsedMs: 0 };
  }

  const elapsedMs = Math.min(currentTime - lastTick, MAX_OFFLINE_MS);
  const activeState = state.lifetimeBloom >= AUTO_UNLOCK_AT && state.autoHarvesterStars < 1
    ? { ...state, autoHarvesterStars: 1 }
    : state;
  const elapsedSeconds = elapsedMs / 1000;
  const production = getProductionPerSecond(activeState);
  let earned = production * elapsedSeconds;
  let autoHarvesterStars = activeState.autoHarvesterStars;
  if (autoHarvesterStars === 0 && production > 0) {
    const secondsToUnlock = (AUTO_UNLOCK_AT - activeState.lifetimeBloom) / production;
    if (secondsToUnlock <= elapsedSeconds) {
      // The free first star begins earning during the same offline interval.
      earned += getTapValue(activeState) * AUTO_CLICKS_PER_SECOND[1] * (elapsedSeconds - secondsToUnlock);
      autoHarvesterStars = 1;
    }
  }
  if (!Number.isFinite(earned) || earned <= 0) {
    return { state: { ...activeState, lastTick: currentTime }, earned: 0, elapsedMs };
  }

  const bloom = nonNegativeNumber(activeState.bloom);
  const lifetimeBloom = nonNegativeNumber(activeState.lifetimeBloom);
  return {
    state: {
      ...activeState,
      bloom: bloom + earned,
      lifetimeBloom: lifetimeBloom + earned,
      autoHarvesterStars,
      lastTick: currentTime,
    },
    earned,
    elapsedMs,
  };
}

export function getStage(state: GameState): 0 | 1 | 2 | 3 {
  const lifetimeBloom = nonNegativeNumber(state?.lifetimeBloom);
  if (lifetimeBloom >= 3000) return 3;
  if (lifetimeBloom >= 300) return 2;
  if (lifetimeBloom >= 25) return 1;
  return 0;
}

export function getLevel(state: GameState): 1 | 2 | 3 | 4 | 5 {
  const lifetime = nonNegativeNumber(state?.lifetimeBloom);
  if (lifetime >= 3000) return 5;
  if (lifetime >= 300) return 4;
  if (lifetime >= AUTO_UNLOCK_AT) return 3;
  if (lifetime >= 25) return 2;
  return 1;
}
