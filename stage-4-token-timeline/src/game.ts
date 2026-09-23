export const ERAS = [
  { id: 'dawn', name: 'Dawn of Llama', model: 'Llama', icon: '🦙', joke: 'Invents fire. Immediately monetises it.', cost: 12, rate: 1, color: '#ffba70' },
  { id: 'ancient', name: 'Ancient Qwen', model: 'Qwen', icon: '🏛️', joke: 'Carves the first terms of service.', cost: 100, rate: 10, color: '#ffd974' },
  { id: 'middle', name: 'Mistral Ages', model: 'Mistral', icon: '🏰', joke: 'Cloud computing, but the cloud is a dragon.', cost: 5_000, rate: 145, color: '#e7a2ff' },
  { id: 'steam', name: 'DeepSeek Steam', model: 'DeepSeek', icon: '🚂', joke: 'The train of thought has no brakes.', cost: 270_000, rate: 2_100, color: '#73d7ff' },
  { id: 'future', name: 'Gemini Tomorrow', model: 'Gemini', icon: '🛸', joke: 'Two futures. Neither has a charger.', cost: 18_000_000, rate: 31_000, color: '#83ffdb' },
  { id: 'end', name: 'ChatGPT at the End', model: 'ChatGPT', icon: '🕳️', joke: 'Explains the heat death in bullet points.', cost: 1_200_000_000, rate: 450_000, color: '#ff829f' },
] as const;

export type EraId = typeof ERAS[number]['id'];
export type Era = typeof ERAS[number];
export type EraState = { level: number; stability: number };
export type TimeEvent = { title: string; detail: string; multiplier: number; until: number } | null;
export type UpgradeId = 'drone' | 'dial' | 'archive' | 'capacitor';
export type GameState = {
  version: 1;
  chronons: number;
  runChronons: number;
  lifetimeChronons: number;
  echoes: number;
  eras: Record<EraId, EraState>;
  drones: number;
  dial: number;
  archive: number;
  capacitor: number;
  paradox: number;
  rushUntil: number;
  pulses: number;
  event: TimeEvent;
  completed: boolean;
  savedAt: number;
};

const freshEras = (): Record<EraId, EraState> => Object.fromEntries(ERAS.map((era, index) => [era.id, { level: index === 0 ? 1 : 0, stability: 0 }])) as Record<EraId, EraState>;
export const createInitialState = (): GameState => ({
  version: 1, chronons: 0, runChronons: 0, lifetimeChronons: 0, echoes: 0,
  eras: freshEras(), drones: 0, dial: 0, archive: 0, capacitor: 0,
  paradox: 0, rushUntil: 0, pulses: 0, event: null, completed: false, savedAt: Date.now(),
});
const safe = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): number => Math.min(max, Math.max(0, Math.floor(safe(value))));
export const normalizeState = (input: Partial<GameState>): GameState => {
  const state = createInitialState();
  const savedEras = input.eras as Partial<Record<EraId, Partial<EraState>>> | undefined;
  for (const era of ERAS) {
    const saved = savedEras?.[era.id];
    if (saved) state.eras[era.id] = { level: integer(saved.level), stability: integer(saved.stability, 2) };
  }
  state.chronons = Math.max(0, safe(input.chronons));
  state.runChronons = Math.max(0, safe(input.runChronons));
  state.lifetimeChronons = Math.max(0, safe(input.lifetimeChronons));
  state.echoes = integer(input.echoes);
  state.drones = integer(input.drones, 6);
  state.dial = integer(input.dial, 10);
  state.archive = integer(input.archive, 10);
  state.capacitor = integer(input.capacitor, 5);
  state.paradox = Math.min(100, Math.max(0, safe(input.paradox)));
  state.rushUntil = safe(input.rushUntil);
  state.pulses = integer(input.pulses);
  state.event = input.event && typeof input.event.title === 'string' ? input.event : null;
  state.completed = input.completed === true;
  state.savedAt = safe(input.savedAt, Date.now());
  return state;
};

export const getMultiplier = (state: GameState, now = Date.now()): number =>
  (1 + state.echoes * .12) * (1 + state.archive * .35) * (state.rushUntil > now ? 4 : 1) * (state.event && state.event.until > now ? state.event.multiplier : 1);

export const getEraRate = (state: GameState, era: Era, now = Date.now()): number => {
  const index = ERAS.findIndex((entry) => entry.id === era.id);
  const previous = index > 0 ? state.eras[ERAS[index - 1].id].stability : 0;
  const own = state.eras[era.id];
  return own.level * era.rate * (1 + own.stability * .75) * (1 + previous * .6) * getMultiplier(state, now);
};
export const getProduction = (state: GameState, now = Date.now()): number => ERAS.reduce((sum, era) => sum + getEraRate(state, era, now), 0);
export const getPulseValue = (state: GameState, focus: EraId = 'dawn', now = Date.now()): number =>
  (1 + state.dial * 8) * (1 + state.echoes * .12) + getProduction(state, now) * (.4 + state.dial * .035) + getEraRate(state, ERAS.find((era) => era.id === focus) ?? ERAS[0], now) * .25;
const earn = (state: GameState, amount: number): number => {
  const gain = Math.max(0, amount);
  state.chronons += gain; state.runChronons += gain; state.lifetimeChronons += gain;
  return gain;
};
export const pulseTimeline = (state: GameState, focus: EraId = 'dawn', now = Date.now()): number => {
  const gain = earn(state, getPulseValue(state, focus, now));
  state.pulses += 1;
  state.paradox = Math.min(100, state.paradox + 8 + state.dial * .5);
  if (state.paradox >= 100) { state.paradox = 0; state.rushUntil = Math.max(state.rushUntil, now) + 15_000 + state.capacitor * 3_000; }
  return gain;
};
export const advanceTime = (state: GameState, seconds: number, focus: EraId = 'dawn', now = Date.now()): number => {
  const duration = Math.min(28_800, Math.max(0, seconds));
  const gain = earn(state, (getProduction(state, now) + getPulseValue(state, focus, now) * state.drones * .16) * duration);
  if (state.event && state.event.until <= now) state.event = null;
  return gain;
};

export const getEraCost = (state: GameState, era: Era): number => era.cost * 1.18 ** state.eras[era.id].level;
export const buyEra = (state: GameState, id: EraId): boolean => {
  const era = ERAS.find((entry) => entry.id === id);
  if (!era) return false;
  const cost = getEraCost(state, era);
  if (!Number.isFinite(cost) || state.chronons < cost) return false;
  state.chronons -= cost; state.eras[id].level += 1; return true;
};
export const getStabilityCost = (state: GameState, era: Era): number => {
  const rank = state.eras[era.id].stability;
  return rank >= 2 ? Infinity : era.cost * 18 * 8 ** rank;
};
export const stabilizeEra = (state: GameState, id: EraId): boolean => {
  const era = ERAS.find((entry) => entry.id === id);
  if (!era || state.eras[id].level === 0) return false;
  const cost = getStabilityCost(state, era);
  if (!Number.isFinite(cost) || state.chronons < cost) return false;
  state.chronons -= cost; state.eras[id].stability += 1; return true;
};
export const getUpgradeCost = (state: GameState, id: UpgradeId): number => ({
  drone: state.drones >= 6 ? Infinity : 3_000 * 16 ** state.drones,
  dial: state.dial >= 10 ? Infinity : 140 * 4 ** state.dial,
  archive: state.archive >= 10 ? Infinity : 600 * 5 ** state.archive,
  capacitor: state.capacitor >= 5 ? Infinity : 8_000 * 12 ** state.capacitor,
})[id];
export const buyUpgrade = (state: GameState, id: UpgradeId): boolean => {
  const cost = getUpgradeCost(state, id);
  if (!Number.isFinite(cost) || state.chronons < cost) return false;
  state.chronons -= cost;
  if (id === 'drone') state.drones += 1;
  if (id === 'dial') state.dial += 1;
  if (id === 'archive') state.archive += 1;
  if (id === 'capacitor') state.capacitor += 1;
  return true;
};

export const getEchoGain = (state: GameState): number => Math.floor(Math.sqrt(state.runChronons / 5_000_000));
export const rewindTimeline = (state: GameState): number => {
  const gain = getEchoGain(state);
  if (gain < 1) return 0;
  const lifetimeChronons = state.lifetimeChronons;
  const echoes = state.echoes + gain;
  const completed = state.completed;
  Object.assign(state, createInitialState(), { lifetimeChronons, echoes, completed });
  return gain;
};
export const getEraTitle = (state: GameState): string => {
  if (state.echoes >= 40) return 'Prime Timeline';
  if (state.echoes >= 18) return 'Tomorrow-ish';
  if (state.echoes >= 8) return 'Yesterday 2.0';
  if (state.echoes >= 1) return 'Alternate Tuesday';
  return 'Broken Stopwatch';
};
export const getFinaleProgress = (state: GameState): { stable: number; ready: boolean } => {
  const stable = ERAS.filter((era) => state.eras[era.id].stability >= 2).length;
  return { stable, ready: stable === ERAS.length && state.drones >= 6 && state.echoes >= 40 };
};
export const restorePrimeTimeline = (state: GameState): boolean => {
  if (!getFinaleProgress(state).ready) return false;
  state.completed = true;
  return true;
};
export const getObjective = (state: GameState): { label: string; current: number; target: number } => {
  const locked = ERAS.find((era) => state.eras[era.id].level === 0);
  if (locked) return { label: `Open ${locked.name}`, current: state.chronons, target: getEraCost(state, locked) };
  if (state.drones < 6) return { label: 'Build six Clock Drones', current: state.drones, target: 6 };
  const progress = getFinaleProgress(state);
  if (progress.stable < 6) return { label: 'Stabilize every era twice', current: progress.stable, target: 6 };
  if (state.echoes < 40) return { label: 'Collect Timeline Echoes', current: state.echoes, target: 40 };
  return { label: state.completed ? 'Time is fixed. Mostly.' : 'Restore the Prime Timeline', current: state.completed ? 1 : 0, target: 1 };
};
