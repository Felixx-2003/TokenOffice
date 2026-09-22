export const PERFORMER_IDS = [
  'llama', 'qwen', 'mistral', 'deepseek', 'glm',
  'kimi', 'grok', 'gemini', 'claude', 'chatgpt',
] as const;

export type PerformerId = typeof PERFORMER_IDS[number];

export type Performer = {
  id: PerformerId;
  name: string;
  emoji: string;
  act: string;
  mishap: string;
  baseCost: number;
  baseRate: number;
  accent: string;
};

export const PERFORMERS: readonly Performer[] = [
  { id: 'llama', name: 'Llama', emoji: '🦙', act: 'Jumps through token hoops', mishap: 'ate the prompt', baseCost: 10, baseRate: 0.7, accent: '#ffcc4d' },
  { id: 'qwen', name: 'Qwen', emoji: '🤹', act: 'Juggles suspicious datasets', mishap: 'dropped the training set', baseCost: 90, baseRate: 5, accent: '#ff7b54' },
  { id: 'mistral', name: 'Mistral', emoji: '🌪️', act: 'Summons a data tornado', mishap: 'blew away the safety rails', baseCost: 650, baseRate: 28, accent: '#67e8f9' },
  { id: 'deepseek', name: 'DeepSeek', emoji: '🧿', act: 'Dives for lost Tokens', mishap: 'found an old TODO instead', baseCost: 4_500, baseRate: 150, accent: '#38bdf8' },
  { id: 'glm', name: 'GLM', emoji: '🎯', act: 'Calculates cannon trajectories', mishap: 'rounded the cannon to infinity', baseCost: 32_000, baseRate: 820, accent: '#fb7185' },
  { id: 'kimi', name: 'Kimi', emoji: '🌙', act: 'Moonwalks across context', mishap: 'moonwalked off the stage', baseCost: 220_000, baseRate: 4_400, accent: '#c084fc' },
  { id: 'grok', name: 'Grok', emoji: '🎙️', act: 'Heckles the audience', mishap: 'argued with the popcorn', baseCost: 1_500_000, baseRate: 23_000, accent: '#f97316' },
  { id: 'gemini', name: 'Gemini', emoji: '👯', act: 'Performs synchronized inference', mishap: 'disagreed with its twin', baseCost: 10_000_000, baseRate: 120_000, accent: '#22d3ee' },
  { id: 'claude', name: 'Claude', emoji: '🎭', act: 'Delivers a dramatic monologue', mishap: 'exceeded the context window', baseCost: 72_000_000, baseRate: 650_000, accent: '#f59e0b' },
  { id: 'chatgpt', name: 'ChatGPT', emoji: '🤖', act: 'Attempts every trick at once', mishap: 'apologized to the cannon', baseCost: 500_000_000, baseRate: 3_600_000, accent: '#34d399' },
] as const;

export const COSTUME_NAMES = ['Cardboard', 'Shiny', 'Epic', 'Legendary', 'Questionably Expensive'] as const;
export const WHIP_NAMES = ['Pool Noodle', 'Prompt Whip', 'Laser Whip', 'Executive Whip', 'Forbidden System Prompt'] as const;

export type PerformerState = { count: number; trick: number; costume: number };
export type CircusEvent = { label: string; detail: string; multiplier: number; until: number } | null;

export type GameState = {
  version: 2;
  tokens: number;
  runTokens: number;
  lifetimeTokens: number;
  goldenTickets: number;
  performers: Record<PerformerId, PerformerState>;
  whipTier: number;
  cannons: number;
  spotlight: number;
  audience: number;
  promptCount: number;
  hype: number;
  ovationUntil: number;
  event: CircusEvent;
  lastSavedAt: number;
  completed: boolean;
};

const freshPerformers = (): Record<PerformerId, PerformerState> => Object.fromEntries(
  PERFORMER_IDS.map((id, index) => [id, { count: index === 0 ? 1 : 0, trick: 1, costume: 0 }]),
) as Record<PerformerId, PerformerState>;

export const createInitialState = (): GameState => ({
  version: 2,
  tokens: 0,
  runTokens: 0,
  lifetimeTokens: 0,
  goldenTickets: 0,
  performers: freshPerformers(),
  whipTier: 0,
  cannons: 0,
  spotlight: 0,
  audience: 0,
  promptCount: 0,
  hype: 0,
  ovationUntil: 0,
  event: null,
  lastSavedAt: Date.now(),
  completed: false,
});

const safeNumber = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeState = (input: Partial<GameState>): GameState => {
  const initial = createInitialState();
  const candidatePerformers = input.performers as Partial<Record<PerformerId, Partial<PerformerState>>> | undefined;
  for (const id of PERFORMER_IDS) {
    const candidate = candidatePerformers?.[id];
    if (!candidate) continue;
    initial.performers[id] = {
      count: Math.max(0, Math.floor(safeNumber(candidate.count))),
      trick: Math.min(10, Math.max(1, Math.floor(safeNumber(candidate.trick, 1)))),
      costume: Math.min(4, Math.max(0, Math.floor(safeNumber(candidate.costume)))),
    };
  }
  initial.tokens = Math.max(0, safeNumber(input.tokens));
  initial.runTokens = Math.max(0, safeNumber(input.runTokens));
  initial.lifetimeTokens = Math.max(0, safeNumber(input.lifetimeTokens));
  initial.goldenTickets = Math.max(0, Math.floor(safeNumber(input.goldenTickets)));
  initial.whipTier = Math.min(4, Math.max(0, Math.floor(safeNumber(input.whipTier))));
  initial.cannons = Math.min(5, Math.max(0, Math.floor(safeNumber(input.cannons))));
  initial.spotlight = Math.min(10, Math.max(0, Math.floor(safeNumber(input.spotlight))));
  initial.audience = Math.min(10, Math.max(0, Math.floor(safeNumber(input.audience))));
  initial.promptCount = Math.max(0, Math.floor(safeNumber(input.promptCount)));
  initial.hype = Math.min(100, Math.max(0, safeNumber(input.hype)));
  initial.ovationUntil = safeNumber(input.ovationUntil);
  initial.event = input.event && typeof input.event.label === 'string' ? input.event : null;
  initial.lastSavedAt = safeNumber(input.lastSavedAt, Date.now());
  initial.completed = input.completed === true;
  return initial;
};

export const getTicketMultiplier = (state: GameState): number => 1 + state.goldenTickets * 0.08;
export const getOvationMultiplier = (state: GameState, now = Date.now()): number => state.ovationUntil > now ? 3 : 1;
export const getEventMultiplier = (state: GameState, now = Date.now()): number => state.event && state.event.until > now ? state.event.multiplier : 1;
export const getGlobalMultiplier = (state: GameState, now = Date.now()): number =>
  getTicketMultiplier(state) * (1 + state.audience * 0.25) * (1 + state.cannons * 0.15) * getOvationMultiplier(state, now) * getEventMultiplier(state, now);

export const getPerformerRate = (state: GameState, performer: Performer, now = Date.now()): number => {
  const owned = state.performers[performer.id];
  const trickMultiplier = 1 + (owned.trick - 1) * 0.45;
  const costumeMultiplier = 2 ** owned.costume;
  return owned.count * performer.baseRate * trickMultiplier * costumeMultiplier * getGlobalMultiplier(state, now);
};

export const getProduction = (state: GameState, now = Date.now()): number =>
  PERFORMERS.reduce((sum, performer) => sum + getPerformerRate(state, performer, now), 0);

export const getWhipValue = (state: GameState, now = Date.now()): number => {
  const base = 1 + state.whipTier * 6;
  const spotlight = 1 + state.spotlight * 0.6;
  const ensemble = Math.max(1, PERFORMERS.reduce((sum, performer) => sum + state.performers[performer.id].count, 0) * 0.25);
  return base * spotlight * ensemble * getTicketMultiplier(state) * getOvationMultiplier(state, now) * getEventMultiplier(state, now);
};

const addTokens = (state: GameState, amount: number): number => {
  const safeAmount = Math.max(0, amount);
  state.tokens += safeAmount;
  state.runTokens += safeAmount;
  state.lifetimeTokens += safeAmount;
  return safeAmount;
};

const triggerOvation = (state: GameState, now: number): void => {
  if (state.hype < 100) return;
  state.hype = 0;
  state.ovationUntil = Math.max(state.ovationUntil, now) + 12_000;
};

export const crackWhip = (state: GameState, now = Date.now()): number => {
  const gained = addTokens(state, getWhipValue(state, now));
  state.promptCount += 1;
  state.hype = Math.min(100, state.hype + 7 + state.spotlight * 0.3);
  triggerOvation(state, now);
  return gained;
};

export const promptPerformer = (state: GameState, id: PerformerId, now = Date.now()): number => {
  const performer = PERFORMERS.find((entry) => entry.id === id);
  if (!performer || state.performers[id].count === 0) return 0;
  const gained = addTokens(state, getWhipValue(state, now) + getPerformerRate(state, performer, now) * 0.35);
  state.promptCount += 1;
  state.hype = Math.min(100, state.hype + 9);
  triggerOvation(state, now);
  return gained;
};

export const advanceTime = (state: GameState, seconds: number, now = Date.now()): number => {
  const duration = Math.max(0, Math.min(seconds, 28_800));
  const passive = getProduction(state, now);
  const autoWhips = getWhipValue(state, now) * state.cannons * 0.2;
  const gained = addTokens(state, (passive + autoWhips) * duration);
  if (state.cannons > 0) {
    state.hype = Math.min(100, state.hype + state.cannons * duration * 0.12);
    triggerOvation(state, now);
  }
  if (state.event && state.event.until <= now) state.event = null;
  return gained;
};

export const getPerformerCost = (state: GameState, performer: Performer): number => performer.baseCost * 1.17 ** state.performers[performer.id].count;

export const buyPerformer = (state: GameState, id: PerformerId): boolean => {
  const performer = PERFORMERS.find((entry) => entry.id === id);
  if (!performer) return false;
  const cost = getPerformerCost(state, performer);
  if (state.tokens < cost) return false;
  state.tokens -= cost;
  state.performers[id].count += 1;
  return true;
};

export const getTrickCost = (state: GameState, performer: Performer): number => {
  const level = state.performers[performer.id].trick;
  return level >= 10 ? Number.POSITIVE_INFINITY : performer.baseCost * 8 * 2.4 ** (level - 1);
};

export const buyTrick = (state: GameState, id: PerformerId): boolean => {
  const performer = PERFORMERS.find((entry) => entry.id === id);
  if (!performer || state.performers[id].count === 0) return false;
  const cost = getTrickCost(state, performer);
  if (state.tokens < cost || !Number.isFinite(cost)) return false;
  state.tokens -= cost;
  state.performers[id].trick += 1;
  return true;
};

export const getCostumeCost = (state: GameState, performer: Performer): number => {
  const tier = state.performers[performer.id].costume;
  return tier >= 4 ? Number.POSITIVE_INFINITY : performer.baseCost * 35 * 7 ** tier;
};

export const buyCostume = (state: GameState, id: PerformerId): boolean => {
  const performer = PERFORMERS.find((entry) => entry.id === id);
  if (!performer || state.performers[id].count === 0) return false;
  const cost = getCostumeCost(state, performer);
  if (state.tokens < cost || !Number.isFinite(cost)) return false;
  state.tokens -= cost;
  state.performers[id].costume += 1;
  return true;
};

export type UpgradeId = 'whip' | 'cannon' | 'spotlight' | 'audience';

export const getUpgradeCost = (state: GameState, id: UpgradeId): number => ({
  whip: state.whipTier >= 4 ? Infinity : 180 * 16 ** state.whipTier,
  cannon: state.cannons >= 5 ? Infinity : 4_000 * 25 ** state.cannons,
  spotlight: state.spotlight >= 10 ? Infinity : 550 * 4.2 ** state.spotlight,
  audience: state.audience >= 10 ? Infinity : 1_200 * 4.5 ** state.audience,
})[id];

export const buyUpgrade = (state: GameState, id: UpgradeId): boolean => {
  const cost = getUpgradeCost(state, id);
  if (state.tokens < cost || !Number.isFinite(cost)) return false;
  state.tokens -= cost;
  if (id === 'whip') state.whipTier += 1;
  if (id === 'cannon') state.cannons += 1;
  if (id === 'spotlight') state.spotlight += 1;
  if (id === 'audience') state.audience += 1;
  return true;
};

export const getTicketGain = (state: GameState): number => Math.floor(Math.sqrt(state.runTokens / 1_000_000));

export const curtainCall = (state: GameState): number => {
  const gained = getTicketGain(state);
  if (gained < 1) return 0;
  const persistent = { lifetimeTokens: state.lifetimeTokens, goldenTickets: state.goldenTickets + gained, completed: state.completed };
  Object.assign(state, createInitialState(), persistent);
  return gained;
};

export const VENUES = [
  { tickets: 0, name: 'Parking Lot Tent' },
  { tickets: 1, name: 'Neon Big Top' },
  { tickets: 5, name: 'Moon Circus' },
  { tickets: 12, name: 'Multiverse Stadium' },
  { tickets: 25, name: 'Final Context Window' },
] as const;

export const getVenue = (state: GameState): string => [...VENUES].reverse().find((venue) => state.goldenTickets >= venue.tickets)?.name ?? VENUES[0].name;

export const getFinaleProgress = (state: GameState): { ready: boolean; legendary: number } => {
  const legendary = PERFORMER_IDS.filter((id) => state.performers[id].costume >= 3).length;
  return { ready: state.goldenTickets >= 25 && state.cannons >= 5 && legendary === PERFORMER_IDS.length, legendary };
};

export const fireGreatTokenCannon = (state: GameState): boolean => {
  if (!getFinaleProgress(state).ready) return false;
  state.completed = true;
  state.ovationUntil = Date.now() + 60_000;
  return true;
};

export const getNextObjective = (state: GameState): { label: string; current: number; target: number } => {
  const firstLocked = PERFORMERS.find((performer) => state.performers[performer.id].count === 0);
  if (firstLocked) return { label: `Recruit ${firstLocked.name}`, current: state.tokens, target: getPerformerCost(state, firstLocked) };
  if (state.cannons < 5) return { label: 'Build Auto-Whip Cannons', current: state.cannons, target: 5 };
  const finale = getFinaleProgress(state);
  if (finale.legendary < 10) return { label: 'Give every model a Legendary costume', current: finale.legendary, target: 10 };
  if (state.goldenTickets < 25) return { label: 'Earn Golden Tickets', current: state.goldenTickets, target: 25 };
  return { label: state.completed ? 'The Token Circus conquered context' : 'Fire the Great Token Cannon', current: state.completed ? 1 : 0, target: 1 };
};
