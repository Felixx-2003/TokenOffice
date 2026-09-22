export const SYSTEM_IDS = ['antenna', 'relay', 'dish', 'array', 'satellite', 'moonbase', 'pulsar', 'horizon'] as const;
export type SystemId = (typeof SYSTEM_IDS)[number];
export type BuyMode = 1 | 10 | 'max';

export interface SystemMeta {
  id: SystemId;
  name: string;
  code: string;
  description: string;
  baseCost: number;
  baseRate: number;
  color: string;
}

export interface GameState {
  flux: number;
  runFlux: number;
  lifetimeFlux: number;
  systems: Record<SystemId, number>;
  calibration: number;
  overclock: number;
  echoes: number;
  folds: number;
  resonance: number;
  resonanceUntil: number;
  resonanceCount: number;
  tuneCount: number;
  buyMode: BuyMode;
  soundEnabled: boolean;
  lastTick: number;
}

export const SYSTEMS: readonly SystemMeta[] = [
  { id: 'antenna', name: 'Pocket Antenna', code: 'ANT-01', description: 'Catches nearby carrier noise.', baseCost: 12, baseRate: 0.4, color: '#77f7bb' },
  { id: 'relay', name: 'Relay Kite', code: 'RLY-07', description: 'Repeats clean signal packets.', baseCost: 120, baseRate: 3.5, color: '#69d9ff' },
  { id: 'dish', name: 'Listening Dish', code: 'DSH-12', description: 'Maps faint orbital whispers.', baseCost: 1_350, baseRate: 28, color: '#b49aff' },
  { id: 'array', name: 'Polar Array', code: 'ARY-40', description: 'Phases many dishes as one.', baseCost: 16_000, baseRate: 240, color: '#ffcf68' },
  { id: 'satellite', name: 'Signal Ark', code: 'ARK-88', description: 'Carries the network off-world.', baseCost: 210_000, baseRate: 2_100, color: '#ff8b72' },
  { id: 'moonbase', name: 'Darkside Vault', code: 'VLT-03', description: 'Listens behind lunar silence.', baseCost: 3_200_000, baseRate: 22_000, color: '#d8e1eb' },
  { id: 'pulsar', name: 'Pulsar Tap', code: 'PSR-99', description: 'Samples a stellar clock.', baseCost: 52_000_000, baseRate: 260_000, color: '#ff74c8' },
  { id: 'horizon', name: 'Horizon Loom', code: 'HRZ-∞', description: 'Weaves signal around gravity.', baseCost: 920_000_000, baseRate: 3_600_000, color: '#ffef8a' },
];

export const CALIBRATION_COSTS = [80, 650, 5_000, 38_000, 280_000, 2_100_000, 16_000_000, 125_000_000, 1_000_000_000, 8_000_000_000] as const;
export const OVERCLOCK_COSTS = [2_500, 24_000, 240_000, 2_400_000, 24_000_000, 240_000_000, 2_400_000_000, 24_000_000_000, 240_000_000_000, 2_400_000_000_000] as const;
export const FOLD_UNLOCK = 1_000_000;
export const MAX_VALUE = Number.MAX_SAFE_INTEGER;
const COST_GROWTH = 1.17;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const finite = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const safe = (value: unknown, fallback = 0): number => Math.min(MAX_VALUE, Math.max(0, finite(value, fallback)));
const whole = (value: unknown, max = MAX_VALUE): number => Math.min(max, Math.floor(safe(value)));
const credit = (value: number, gain: number): number => Math.min(MAX_VALUE, value + Math.max(0, gain));

function emptySystems(): Record<SystemId, number> {
  return Object.fromEntries(SYSTEM_IDS.map((id) => [id, 0])) as Record<SystemId, number>;
}

export function createInitialState(now = Date.now()): GameState {
  return {
    flux: 0, runFlux: 0, lifetimeFlux: 0, systems: emptySystems(), calibration: 0,
    overclock: 0, echoes: 0, folds: 0, resonance: 0, resonanceUntil: 0,
    resonanceCount: 0, tuneCount: 0, buyMode: 1, soundEnabled: true, lastTick: now,
  };
}

export function normalizeState(input: unknown, now = Date.now()): GameState {
  const base = createInitialState(now);
  if (!isRecord(input)) return base;
  const systems = emptySystems();
  for (const id of SYSTEM_IDS) systems[id] = isRecord(input.systems) ? whole(input.systems[id], 1_000_000) : 0;
  const buyMode = input.buyMode === 10 || input.buyMode === 'max' ? input.buyMode : 1;
  return {
    flux: safe(input.flux),
    runFlux: safe(input.runFlux),
    lifetimeFlux: safe(input.lifetimeFlux),
    systems,
    calibration: whole(input.calibration, CALIBRATION_COSTS.length),
    overclock: whole(input.overclock, OVERCLOCK_COSTS.length),
    echoes: whole(input.echoes, 1_000_000),
    folds: whole(input.folds, 1_000_000),
    resonance: Math.min(100, safe(input.resonance)),
    resonanceUntil: safe(input.resonanceUntil),
    resonanceCount: whole(input.resonanceCount),
    tuneCount: whole(input.tuneCount),
    buyMode,
    soundEnabled: input.soundEnabled !== false,
    lastTick: finite(input.lastTick, now),
  };
}

export function getEchoMultiplier(state: GameState): number { return 1 + state.echoes * 0.2; }
export function getResonanceMultiplier(state: GameState, now = Date.now()): number { return now < state.resonanceUntil ? 3 : 1; }
export function getGlobalMultiplier(state: GameState, now = Date.now()): number {
  return getEchoMultiplier(state) * 2 ** state.overclock * getResonanceMultiplier(state, now);
}
export function getTuneValue(state: GameState, now = Date.now()): number {
  const support = 1 + state.systems.antenna * 0.18 + state.systems.relay * 0.06;
  return Math.max(1, Math.floor((1 + state.calibration * 2.5) * support * getGlobalMultiplier(state, now)));
}
export function getSystemRate(state: GameState, id: SystemId, now = Date.now()): number {
  const meta = SYSTEMS.find((item) => item.id === id)!;
  const network = 1 + Math.floor(state.systems[id] / 25) * 0.5;
  return meta.baseRate * state.systems[id] * network * getGlobalMultiplier(state, now);
}
export function getProduction(state: GameState, now = Date.now()): number {
  return Math.min(MAX_VALUE, SYSTEM_IDS.reduce((sum, id) => sum + getSystemRate(state, id, now), 0));
}

function earn(state: GameState, amount: number): GameState {
  return {
    ...state,
    flux: credit(state.flux, amount),
    runFlux: credit(state.runFlux, amount),
    lifetimeFlux: credit(state.lifetimeFlux, amount),
  };
}

export function tune(state: GameState, now = Date.now()): { state: GameState; earned: number; surged: boolean } {
  const earned = getTuneValue(state, now);
  const charge = now < state.resonanceUntil ? 0 : 4 + Math.min(4, state.calibration * 0.25);
  const nextCharge = state.resonance + charge;
  const surged = nextCharge >= 100;
  let next = earn(state, earned);
  next = {
    ...next,
    tuneCount: next.tuneCount + 1,
    resonance: surged ? 0 : nextCharge,
    resonanceUntil: surged ? now + 12_000 : next.resonanceUntil,
    resonanceCount: next.resonanceCount + Number(surged),
  };
  return { state: next, earned, surged };
}

export function getUnitCost(id: SystemId, owned: number): number {
  const meta = SYSTEMS.find((item) => item.id === id)!;
  return Math.ceil(meta.baseCost * COST_GROWTH ** owned);
}

export function getPurchase(state: GameState, id: SystemId, mode: BuyMode): { quantity: number; cost: number } {
  let quantity = 0;
  let cost = 0;
  const limit = mode === 'max' ? 10_000 : mode;
  while (quantity < limit) {
    const next = getUnitCost(id, state.systems[id] + quantity);
    if (cost + next > state.flux || !Number.isFinite(next)) break;
    cost += next;
    quantity += 1;
  }
  return { quantity, cost };
}

export function buySystem(state: GameState, id: SystemId): GameState {
  const purchase = getPurchase(state, id, state.buyMode);
  if (purchase.quantity <= 0) return state;
  return {
    ...state,
    flux: state.flux - purchase.cost,
    systems: { ...state.systems, [id]: state.systems[id] + purchase.quantity },
  };
}

export function buyCalibration(state: GameState): GameState {
  const cost = CALIBRATION_COSTS[state.calibration] ?? Infinity;
  if (state.flux < cost) return state;
  return { ...state, flux: state.flux - cost, calibration: state.calibration + 1 };
}

export function buyOverclock(state: GameState): GameState {
  const cost = OVERCLOCK_COSTS[state.overclock] ?? Infinity;
  if (state.flux < cost) return state;
  return { ...state, flux: state.flux - cost, overclock: state.overclock + 1 };
}

export function getFoldGain(state: GameState): number {
  if (state.runFlux < FOLD_UNLOCK) return 0;
  return Math.max(1, Math.floor(Math.sqrt(state.runFlux / FOLD_UNLOCK)));
}

export function fold(state: GameState, now = Date.now()): GameState {
  const gain = getFoldGain(state);
  if (gain <= 0) return state;
  return {
    ...createInitialState(now),
    echoes: state.echoes + gain,
    folds: state.folds + 1,
    lifetimeFlux: state.lifetimeFlux,
    soundEnabled: state.soundEnabled,
    buyMode: state.buyMode,
  };
}

export function setBuyMode(state: GameState, mode: BuyMode): GameState { return { ...state, buyMode: mode }; }
export function isStageCleared(state: GameState): boolean {
  return state.echoes >= 25 && state.overclock >= 8 && state.systems.horizon >= 10;
}

export function getNextObjective(state: GameState): { label: string; value: number; target: number } {
  const totalSystems = SYSTEM_IDS.reduce((sum, id) => sum + state.systems[id], 0);
  if (state.systems.antenna === 0) return { label: 'Deploy a Pocket Antenna', value: state.flux, target: SYSTEMS[0].baseCost };
  if (totalSystems < 25) return { label: 'Build a 25-system network', value: totalSystems, target: 25 };
  if (state.resonanceCount === 0) return { label: 'Trigger Resonance', value: state.resonance, target: 100 };
  if (state.echoes === 0) return { label: 'Fold the first signal', value: state.runFlux, target: FOLD_UNLOCK };
  if (state.echoes < 25) return { label: 'Collect 25 Echoes', value: state.echoes, target: 25 };
  if (state.overclock < 8) return { label: 'Reach Overclock 8', value: state.overclock, target: 8 };
  return { label: 'Own 10 Horizon Looms', value: state.systems.horizon, target: 10 };
}

export function advanceTime(state: GameState, now = Date.now()): { state: GameState; earned: number; elapsedMs: number } {
  if (now <= state.lastTick) return { state: { ...state, lastTick: now }, earned: 0, elapsedMs: 0 };
  const elapsedMs = Math.min(now - state.lastTick, MAX_OFFLINE_MS);
  const earned = Math.min(MAX_VALUE - state.flux, getProduction(state, Math.min(now, state.resonanceUntil + 1)) * elapsedMs / 1000);
  if (earned <= 0) return { state: { ...state, lastTick: now }, earned: 0, elapsedMs };
  return { state: { ...earn(state, earned), lastTick: now }, earned, elapsedMs };
}
