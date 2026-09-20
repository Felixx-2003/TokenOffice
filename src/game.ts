/** Economy rules for Pocket Arcade. Cash is stored as a number of dollars. */

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type ProducerId = 'coinPusher' | 'pinball' | 'clawMachine' | 'jackpot';
export type UpgradeId = 'powerGlove' | 'coinBooster' | 'multiball';

export interface GameState {
  cash: number;
  lifetimeCash: number;
  owned: Record<ProducerId, number>;
  upgrades: Record<UpgradeId, boolean>;
  autoPlayerStars: number;
  lastTick: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface ProducerMeta {
  id: ProducerId;
  name: string;
  rarity: Rarity;
  baseCost: number;
  rate: number;
  unlockAt: number;
}

export interface UpgradeMeta {
  id: UpgradeId;
  name: string;
  rarity: Rarity;
  cost: number;
  description: string;
}

export const PRODUCERS: readonly ProducerMeta[] = [
  { id: 'coinPusher', name: 'Coin Pusher', rarity: 'Common', baseCost: 500, rate: 30, unlockAt: 0 },
  { id: 'pinball', name: 'Pinball Table', rarity: 'Rare', baseCost: 7_500, rate: 450, unlockAt: 5_000 },
  { id: 'clawMachine', name: 'Claw Machine', rarity: 'Epic', baseCost: 100_000, rate: 6_000, unlockAt: 50_000 },
  { id: 'jackpot', name: 'Jackpot Cabinet', rarity: 'Legendary', baseCost: 1_500_000, rate: 90_000, unlockAt: 500_000 },
];

export const UPGRADES: readonly UpgradeMeta[] = [
  { id: 'powerGlove', name: 'Power Glove', rarity: 'Rare', cost: 3_000, description: 'Manual and auto plays earn twice as much.' },
  { id: 'coinBooster', name: 'Coin Booster', rarity: 'Common', cost: 10_000, description: 'All Coin Pushers earn twice as much.' },
  { id: 'multiball', name: 'Multiball', rarity: 'Epic', cost: 120_000, description: 'All Pinball Tables earn twice as much.' },
];

export const AUTO_UNLOCK_AT = 5_000;
export const MAX_AUTO_STARS = 4;
export const AUTO_RARITIES = ['Locked', 'Common', 'Rare', 'Epic', 'Legendary'] as const;
const AUTO_PLAYS_PER_SECOND = [0, 1, 5, 25, 150] as const;
const AUTO_STAR_COSTS = [0, 0, 5_000, 60_000, 700_000] as const;
const TAP_BASE = 50;
const COST_GROWTH = 1.3;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const PRODUCER_IDS: readonly ProducerId[] = ['coinPusher', 'pinball', 'clawMachine', 'jackpot'];
const UPGRADE_IDS: readonly UpgradeId[] = ['powerGlove', 'coinBooster', 'multiball'];

const producerById = Object.fromEntries(PRODUCERS.map((item) => [item.id, item])) as Record<ProducerId, ProducerMeta>;
const upgradeById = Object.fromEntries(UPGRADES.map((item) => [item.id, item])) as Record<UpgradeId, UpgradeMeta>;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const numberOr = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const nonNegative = (value: unknown, fallback = 0): number => Math.max(0, numberOr(value, fallback));
const isProducerId = (id: string): id is ProducerId => PRODUCER_IDS.includes(id as ProducerId);
const isUpgradeId = (id: string): id is UpgradeId => UPGRADE_IDS.includes(id as UpgradeId);

const emptyOwned = (): Record<ProducerId, number> => ({ coinPusher: 0, pinball: 0, clawMachine: 0, jackpot: 0 });
const emptyUpgrades = (): Record<UpgradeId, boolean> => ({ powerGlove: false, coinBooster: false, multiball: false });

/** Rebuild a valid state from a browser save. */
export function normalizeState(input: unknown, now = Date.now()): GameState {
  const raw = isRecord(input) ? input : {};
  const cash = nonNegative(raw.cash);
  const lifetimeCash = Math.max(cash, nonNegative(raw.lifetimeCash));
  const savedStars = numberOr(raw.autoPlayerStars, 0);
  const autoPlayerStars = Math.max(
    lifetimeCash >= AUTO_UNLOCK_AT ? 1 : 0,
    Number.isSafeInteger(savedStars) ? Math.min(MAX_AUTO_STARS, Math.max(0, savedStars)) : 0,
  );
  const owned = emptyOwned();
  const upgrades = emptyUpgrades();
  for (const id of PRODUCER_IDS) {
    const count = numberOr(isRecord(raw.owned) ? raw.owned[id] : undefined, 0);
    owned[id] = Number.isSafeInteger(count) ? Math.max(0, count) : 0;
  }
  for (const id of UPGRADE_IDS) upgrades[id] = isRecord(raw.upgrades) && raw.upgrades[id] === true;
  return {
    cash, lifetimeCash, owned, upgrades, autoPlayerStars,
    lastTick: numberOr(raw.lastTick, now),
    soundEnabled: raw.soundEnabled === true,
    reducedMotion: raw.reducedMotion === true,
  };
}

export function createInitialState(now = Date.now()): GameState {
  return normalizeState({ lastTick: now }, now);
}

function ownedCount(state: GameState, id: ProducerId): number {
  const count = numberOr(state?.owned?.[id], 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function getTapValue(state: GameState): number {
  return TAP_BASE * (state.upgrades.powerGlove ? 2 : 1);
}

export function getAutoClicksPerSecond(state: GameState): number {
  const stars = state.autoPlayerStars;
  return Number.isSafeInteger(stars) && stars >= 0 && stars <= MAX_AUTO_STARS ? AUTO_PLAYS_PER_SECOND[stars] : 0;
}

export function getAutoRarity(state: GameState): (typeof AUTO_RARITIES)[number] {
  const stars = state.autoPlayerStars;
  return Number.isSafeInteger(stars) && stars >= 0 && stars <= MAX_AUTO_STARS ? AUTO_RARITIES[stars] : 'Locked';
}

export function getAutoUpgradeCost(state: GameState): number {
  const stars = state.autoPlayerStars;
  return Number.isSafeInteger(stars) && stars >= 1 && stars < MAX_AUTO_STARS
    ? AUTO_STAR_COSTS[stars + 1] : Number.POSITIVE_INFINITY;
}

export function getProductionPerSecond(state: GameState): number {
  let production = 0;
  for (const producer of PRODUCERS) {
    const multiplier = producer.id === 'coinPusher' && state.upgrades.coinBooster ? 2
      : producer.id === 'pinball' && state.upgrades.multiball ? 2 : 1;
    production += ownedCount(state, producer.id) * producer.rate * multiplier;
  }
  production += getAutoClicksPerSecond(state) * getTapValue(state);
  return Number.isFinite(production) ? production : 0;
}

export function getProducerCost(state: GameState, id: ProducerId): number {
  if (!isProducerId(id)) return Number.POSITIVE_INFINITY;
  const cost = producerById[id].baseCost * Math.pow(COST_GROWTH, ownedCount(state, id));
  return Number.isFinite(cost) ? Math.ceil(cost) : Number.POSITIVE_INFINITY;
}

export function canBuyProducer(state: GameState, id: ProducerId): boolean {
  return isProducerId(id) && state.lifetimeCash >= producerById[id].unlockAt
    && state.cash >= getProducerCost(state, id);
}

export function buyProducer(state: GameState, id: ProducerId): GameState {
  if (!canBuyProducer(state, id)) return state;
  return {
    ...state, cash: state.cash - getProducerCost(state, id),
    owned: { ...state.owned, [id]: ownedCount(state, id) + 1 },
  };
}

export function canBuyUpgrade(state: GameState, id: UpgradeId): boolean {
  return isUpgradeId(id) && !state.upgrades[id] && state.cash >= upgradeById[id].cost;
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  if (!canBuyUpgrade(state, id)) return state;
  return {
    ...state, cash: state.cash - upgradeById[id].cost,
    upgrades: { ...state.upgrades, [id]: true },
  };
}

export function canBuyAutoUpgrade(state: GameState): boolean {
  return state.lifetimeCash >= AUTO_UNLOCK_AT && state.cash >= getAutoUpgradeCost(state);
}

export function buyAutoUpgrade(state: GameState): GameState {
  if (!canBuyAutoUpgrade(state)) return state;
  return {
    ...state, cash: state.cash - getAutoUpgradeCost(state),
    autoPlayerStars: state.autoPlayerStars + 1,
  };
}

export function tap(state: GameState): GameState {
  if (!Number.isFinite(state.cash) || !Number.isFinite(state.lifetimeCash)) return state;
  const nextLifetime = state.lifetimeCash + getTapValue(state);
  return {
    ...state, cash: state.cash + getTapValue(state), lifetimeCash: nextLifetime,
    autoPlayerStars: nextLifetime >= AUTO_UNLOCK_AT ? Math.max(1, state.autoPlayerStars) : state.autoPlayerStars,
  };
}

export function advanceTime(state: GameState, now: number): { state: GameState; earned: number; elapsedMs: number } {
  const currentTime = numberOr(now, state.lastTick);
  if (currentTime < state.lastTick || !Number.isFinite(state.lastTick)) {
    return { state: { ...state, lastTick: currentTime }, earned: 0, elapsedMs: 0 };
  }
  const elapsedMs = Math.min(currentTime - state.lastTick, MAX_OFFLINE_MS);
  if (elapsedMs === 0) return { state, earned: 0, elapsedMs: 0 };
  const activeState = state.lifetimeCash >= AUTO_UNLOCK_AT && state.autoPlayerStars < 1
    ? { ...state, autoPlayerStars: 1 } : state;
  const seconds = elapsedMs / 1000;
  const production = getProductionPerSecond(activeState);
  let earned = production * seconds;
  let autoPlayerStars = activeState.autoPlayerStars;
  if (autoPlayerStars === 0 && production > 0) {
    const unlockAfter = (AUTO_UNLOCK_AT - activeState.lifetimeCash) / production;
    if (unlockAfter <= seconds) {
      earned += (seconds - unlockAfter) * getTapValue(activeState);
      autoPlayerStars = 1;
    }
  }
  if (!Number.isFinite(earned) || earned <= 0) {
    return { state: { ...activeState, lastTick: currentTime }, earned: 0, elapsedMs };
  }
  return {
    state: {
      ...activeState, cash: activeState.cash + earned,
      lifetimeCash: activeState.lifetimeCash + earned,
      autoPlayerStars, lastTick: currentTime,
    },
    earned, elapsedMs,
  };
}

export function getStage(state: GameState): 0 | 1 | 2 | 3 {
  if (state.lifetimeCash >= 500_000) return 3;
  if (state.lifetimeCash >= 50_000) return 2;
  if (state.lifetimeCash >= 1_000) return 1;
  return 0;
}

export function getLevel(state: GameState): 1 | 2 | 3 | 4 | 5 {
  if (state.lifetimeCash >= 500_000) return 5;
  if (state.lifetimeCash >= 50_000) return 4;
  if (state.lifetimeCash >= AUTO_UNLOCK_AT) return 3;
  if (state.lifetimeCash >= 1_000) return 2;
  return 1;
}
