/** Pure economy rules for Pocket Grove. */

export type ProducerId = "flower" | "beehive" | "tree";
export type UpgradeId = "betterTools" | "wateringCan" | "pollination";

export interface GameState {
  bloom: number;
  lifetimeBloom: number;
  owned: Record<ProducerId, number>;
  upgrades: Record<UpgradeId, boolean>;
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
    rate: 0.08,
    unlockAt: 0,
    description: "A cheerful bloom that makes 0.08 Bloom per second.",
  },
  {
    id: "beehive",
    name: "Beehive",
    baseCost: 60,
    rate: 0.5,
    unlockAt: 100,
    description: "Busy bees make 0.5 Bloom per second.",
  },
  {
    id: "tree",
    name: "Tree",
    baseCost: 250,
    rate: 2,
    unlockAt: 500,
    description: "A sturdy tree makes 2 Bloom per second.",
  },
] as const;

export const UPGRADES: readonly UpgradeMeta[] = [
  {
    id: "betterTools",
    name: "Better Tools",
    cost: 200,
    description: "Tending the seed gives +1 extra Bloom.",
  },
  {
    id: "wateringCan",
    name: "Watering Can",
    cost: 300,
    description: "Doubles the Bloom made by every Flower.",
  },
  {
    id: "pollination",
    name: "Pollination",
    cost: 800,
    description: "Doubles the Bloom made by every Beehive.",
  },
] as const;

const PRODUCER_BY_ID: Record<ProducerId, ProducerMeta> = Object.fromEntries(
  PRODUCERS.map((producer) => [producer.id, producer]),
) as Record<ProducerId, ProducerMeta>;
const UPGRADE_BY_ID: Record<UpgradeId, UpgradeMeta> = Object.fromEntries(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<UpgradeId, UpgradeMeta>;

const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const COST_GROWTH = 1.4;
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
  return Number.isFinite(production) ? production : 0;
}

export function getTapValue(state: GameState): number {
  return 1 + (upgradeOwned(state, "betterTools") ? 1 : 0);
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
  return {
    ...state,
    bloom: bloom + value,
    lifetimeBloom: lifetimeBloom + value,
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
  const earned = getProductionPerSecond(state) * (elapsedMs / 1000);
  if (!Number.isFinite(earned) || earned <= 0) {
    return { state: { ...state, lastTick: currentTime }, earned: 0, elapsedMs };
  }

  const bloom = nonNegativeNumber(state.bloom);
  const lifetimeBloom = nonNegativeNumber(state.lifetimeBloom);
  return {
    state: {
      ...state,
      bloom: bloom + earned,
      lifetimeBloom: lifetimeBloom + earned,
      lastTick: currentTime,
    },
    earned,
    elapsedMs,
  };
}

export function getStage(state: GameState): 0 | 1 | 2 | 3 {
  const lifetimeBloom = nonNegativeNumber(state?.lifetimeBloom);
  if (lifetimeBloom >= 6000) return 3;
  if (lifetimeBloom >= 500) return 2;
  if (lifetimeBloom >= 100) return 1;
  return 0;
}
