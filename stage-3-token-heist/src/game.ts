export const CREW_IDS = [
  'llama', 'qwen', 'mistral', 'deepseek', 'glm',
  'kimi', 'grok', 'gemini', 'claude', 'chatgpt',
] as const;

export type CrewId = typeof CREW_IDS[number];

export type CrewMember = {
  id: CrewId;
  name: string;
  emoji: string;
  role: string;
  move: string;
  baseCost: number;
  baseRate: number;
  accent: string;
};

export const CREW: readonly CrewMember[] = [
  { id: 'llama', name: 'Llama', emoji: '🦙', role: 'Distraction Expert', move: 'Eats the security manual', baseCost: 10, baseRate: 0.8, accent: '#52f2c2' },
  { id: 'qwen', name: 'Qwen', emoji: '🧩', role: 'Codebreaker', move: 'Guesses passwords suspiciously fast', baseCost: 100, baseRate: 6, accent: '#62d9ff' },
  { id: 'mistral', name: 'Mistral', emoji: '🏎️', role: 'Getaway Driver', move: 'Drives a cloud with no licence', baseCost: 850, baseRate: 38, accent: '#ffd45a' },
  { id: 'deepseek', name: 'DeepSeek', emoji: '⛏️', role: 'Tunnel Specialist', move: 'Finds TODOs under the vault', baseCost: 7_500, baseRate: 230, accent: '#39bdf8' },
  { id: 'glm', name: 'GLM', emoji: '🔐', role: 'Safecracker', move: 'Calculates unnecessary decimals', baseCost: 65_000, baseRate: 1_350, accent: '#ff6b78' },
  { id: 'kimi', name: 'Kimi', emoji: '🌙', role: 'Night Scout', move: 'Moonwalks past the cameras', baseCost: 550_000, baseRate: 7_800, accent: '#b889ff' },
  { id: 'grok', name: 'Grok', emoji: '📢', role: 'Loud Decoy', move: 'Starts a podcast during the robbery', baseCost: 4_500_000, baseRate: 45_000, accent: '#ff934d' },
  { id: 'gemini', name: 'Gemini', emoji: '🎭', role: 'Identity Swap', move: 'Uses one badge for two twins', baseCost: 38_000_000, baseRate: 260_000, accent: '#55e8ff' },
  { id: 'claude', name: 'Claude', emoji: '📜', role: 'Negotiator', move: 'Explains the terms for three hours', baseCost: 320_000_000, baseRate: 1_500_000, accent: '#f6bd4b' },
  { id: 'chatgpt', name: 'ChatGPT', emoji: '🧠', role: 'Mastermind', move: 'Claims this is all according to plan', baseCost: 2_700_000_000, baseRate: 8_800_000, accent: '#45dda6' },
] as const;

export const DISGUISE_NAMES = ['Paper Moustache', 'Definitely an Employee', 'Elite Sneaking Hoodie', 'Legendary Mastermind', 'Invisibility Suit'] as const;
export const KEY_NAMES = ['Bent Hairpin', 'Borrowed Keycard', 'Quantum Lockpick', 'Executive Skeleton Key', 'Root Master Key'] as const;

export type CrewState = { count: number; gadget: number; disguise: number };
export type HeistEvent = { label: string; detail: string; multiplier: number; until: number } | null;

export type GameState = {
  version: 1;
  coins: number;
  runCoins: number;
  lifetimeCoins: number;
  blueprints: number;
  crew: Record<CrewId, CrewState>;
  keyTier: number;
  bots: number;
  jammer: number;
  insideLlama: number;
  heistCount: number;
  breach: number;
  perfectUntil: number;
  event: HeistEvent;
  lastSavedAt: number;
  completed: boolean;
};

const freshCrew = (): Record<CrewId, CrewState> => Object.fromEntries(
  CREW_IDS.map((id, index) => [id, { count: index === 0 ? 1 : 0, gadget: 1, disguise: 0 }]),
) as Record<CrewId, CrewState>;

export const createInitialState = (): GameState => ({
  version: 1,
  coins: 0,
  runCoins: 0,
  lifetimeCoins: 0,
  blueprints: 0,
  crew: freshCrew(),
  keyTier: 0,
  bots: 0,
  jammer: 0,
  insideLlama: 0,
  heistCount: 0,
  breach: 0,
  perfectUntil: 0,
  event: null,
  lastSavedAt: Date.now(),
  completed: false,
});

const safeNumber = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeState = (input: Partial<GameState>): GameState => {
  const initial = createInitialState();
  const savedCrew = input.crew as Partial<Record<CrewId, Partial<CrewState>>> | undefined;
  for (const id of CREW_IDS) {
    const saved = savedCrew?.[id];
    if (!saved) continue;
    initial.crew[id] = {
      count: Math.max(0, Math.floor(safeNumber(saved.count))),
      gadget: Math.min(10, Math.max(1, Math.floor(safeNumber(saved.gadget, 1)))),
      disguise: Math.min(4, Math.max(0, Math.floor(safeNumber(saved.disguise)))),
    };
  }
  initial.coins = Math.max(0, safeNumber(input.coins));
  initial.runCoins = Math.max(0, safeNumber(input.runCoins));
  initial.lifetimeCoins = Math.max(0, safeNumber(input.lifetimeCoins));
  initial.blueprints = Math.max(0, Math.floor(safeNumber(input.blueprints)));
  initial.keyTier = Math.min(4, Math.max(0, Math.floor(safeNumber(input.keyTier))));
  initial.bots = Math.min(6, Math.max(0, Math.floor(safeNumber(input.bots))));
  initial.jammer = Math.min(10, Math.max(0, Math.floor(safeNumber(input.jammer))));
  initial.insideLlama = Math.min(10, Math.max(0, Math.floor(safeNumber(input.insideLlama))));
  initial.heistCount = Math.max(0, Math.floor(safeNumber(input.heistCount)));
  initial.breach = Math.min(100, Math.max(0, safeNumber(input.breach)));
  initial.perfectUntil = safeNumber(input.perfectUntil);
  initial.event = input.event && typeof input.event.label === 'string' ? input.event : null;
  initial.lastSavedAt = safeNumber(input.lastSavedAt, Date.now());
  initial.completed = input.completed === true;
  return initial;
};

export const getBlueprintMultiplier = (state: GameState): number => 1 + state.blueprints * 0.1;
export const getPerfectMultiplier = (state: GameState, now = Date.now()): number => state.perfectUntil > now ? 4 : 1;
export const getEventMultiplier = (state: GameState, now = Date.now()): number => state.event && state.event.until > now ? state.event.multiplier : 1;
export const getGlobalMultiplier = (state: GameState, now = Date.now()): number =>
  getBlueprintMultiplier(state) * (1 + state.insideLlama * 0.24) * (1 + state.bots * 0.13) * getPerfectMultiplier(state, now) * getEventMultiplier(state, now);

export const getCrewRate = (state: GameState, member: CrewMember, now = Date.now()): number => {
  const owned = state.crew[member.id];
  return owned.count * member.baseRate * (1 + (owned.gadget - 1) * 0.5) * 2 ** owned.disguise * getGlobalMultiplier(state, now);
};

export const getProduction = (state: GameState, now = Date.now()): number => CREW.reduce((sum, member) => sum + getCrewRate(state, member, now), 0);

export const getBaseHeistValue = (state: GameState, now = Date.now()): number => {
  const base = 1 + state.keyTier * 8;
  const jammer = 1 + state.jammer * 0.65;
  const crewSize = Math.max(1, CREW_IDS.reduce((sum, id) => sum + state.crew[id].count, 0) * 0.3);
  return base * jammer * crewSize * getBlueprintMultiplier(state) * getPerfectMultiplier(state, now) * getEventMultiplier(state, now);
};

export const getFullHeistValue = (state: GameState, now = Date.now()): number => getBaseHeistValue(state, now) + getProduction(state, now) * 0.35;

const addCoins = (state: GameState, amount: number): number => {
  const gained = Math.max(0, amount);
  state.coins += gained;
  state.runCoins += gained;
  state.lifetimeCoins += gained;
  return gained;
};

const triggerPerfect = (state: GameState, now: number): void => {
  if (state.breach < 100) return;
  state.breach = 0;
  state.perfectUntil = Math.max(state.perfectUntil, now) + 15_000;
};

export const runHeist = (state: GameState, now = Date.now()): number => {
  const gained = addCoins(state, getFullHeistValue(state, now));
  state.heistCount += 1;
  state.breach = Math.min(100, state.breach + 7 + state.jammer * 0.35);
  triggerPerfect(state, now);
  return gained;
};

export const runSoloMove = (state: GameState, id: CrewId, now = Date.now()): number => {
  const member = CREW.find((entry) => entry.id === id);
  if (!member || state.crew[id].count === 0) return 0;
  const gained = addCoins(state, getBaseHeistValue(state, now) + getCrewRate(state, member, now) * 0.35);
  state.heistCount += 1;
  state.breach = Math.min(100, state.breach + 9);
  triggerPerfect(state, now);
  return gained;
};

export const advanceTime = (state: GameState, seconds: number, now = Date.now()): number => {
  const duration = Math.max(0, Math.min(seconds, 28_800));
  const passive = getProduction(state, now);
  const botRuns = getBaseHeistValue(state, now) * state.bots * 0.22;
  const gained = addCoins(state, (passive + botRuns) * duration);
  if (state.bots > 0) {
    state.breach = Math.min(100, state.breach + state.bots * duration * 0.1);
    triggerPerfect(state, now);
  }
  if (state.event && state.event.until <= now) state.event = null;
  return gained;
};

export const getRecruitCost = (state: GameState, member: CrewMember): number => member.baseCost * 1.18 ** state.crew[member.id].count;

export const recruitCrew = (state: GameState, id: CrewId): boolean => {
  const member = CREW.find((entry) => entry.id === id);
  if (!member) return false;
  const cost = getRecruitCost(state, member);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.crew[id].count += 1;
  return true;
};

export const getGadgetCost = (state: GameState, member: CrewMember): number => {
  const level = state.crew[member.id].gadget;
  return level >= 10 ? Infinity : member.baseCost * 9 * 2.5 ** (level - 1);
};

export const buyGadget = (state: GameState, id: CrewId): boolean => {
  const member = CREW.find((entry) => entry.id === id);
  if (!member || state.crew[id].count === 0) return false;
  const cost = getGadgetCost(state, member);
  if (state.coins < cost || !Number.isFinite(cost)) return false;
  state.coins -= cost;
  state.crew[id].gadget += 1;
  return true;
};

export const getDisguiseCost = (state: GameState, member: CrewMember): number => {
  const tier = state.crew[member.id].disguise;
  return tier >= 4 ? Infinity : member.baseCost * 40 * 7.5 ** tier;
};

export const buyDisguise = (state: GameState, id: CrewId): boolean => {
  const member = CREW.find((entry) => entry.id === id);
  if (!member || state.crew[id].count === 0) return false;
  const cost = getDisguiseCost(state, member);
  if (state.coins < cost || !Number.isFinite(cost)) return false;
  state.coins -= cost;
  state.crew[id].disguise += 1;
  return true;
};

export type UpgradeId = 'key' | 'bot' | 'jammer' | 'inside';

export const getUpgradeCost = (state: GameState, id: UpgradeId): number => ({
  key: state.keyTier >= 4 ? Infinity : 240 * 18 ** state.keyTier,
  bot: state.bots >= 6 ? Infinity : 5_000 * 24 ** state.bots,
  jammer: state.jammer >= 10 ? Infinity : 800 * 4.4 ** state.jammer,
  inside: state.insideLlama >= 10 ? Infinity : 1_800 * 4.7 ** state.insideLlama,
})[id];

export const buyUpgrade = (state: GameState, id: UpgradeId): boolean => {
  const cost = getUpgradeCost(state, id);
  if (state.coins < cost || !Number.isFinite(cost)) return false;
  state.coins -= cost;
  if (id === 'key') state.keyTier += 1;
  if (id === 'bot') state.bots += 1;
  if (id === 'jammer') state.jammer += 1;
  if (id === 'inside') state.insideLlama += 1;
  return true;
};

export const getBlueprintGain = (state: GameState): number => Math.floor(Math.sqrt(state.runCoins / 2_000_000));

export const escapeRoute = (state: GameState): number => {
  const gained = getBlueprintGain(state);
  if (gained < 1) return 0;
  const persistent = { lifetimeCoins: state.lifetimeCoins, blueprints: state.blueprints + gained, completed: state.completed };
  Object.assign(state, createInitialState(), persistent);
  return gained;
};

export const TARGETS = [
  { blueprints: 0, name: 'Corner ATM' },
  { blueprints: 1, name: 'Startup Petty Cash Drawer' },
  { blueprints: 6, name: 'Central Token Bank' },
  { blueprints: 15, name: 'Moon Reserve' },
  { blueprints: 30, name: 'Infinite Context Vault' },
] as const;

export const getTarget = (state: GameState): string => [...TARGETS].reverse().find((target) => state.blueprints >= target.blueprints)?.name ?? TARGETS[0].name;

export const getFinaleProgress = (state: GameState): { ready: boolean; legendary: number } => {
  const legendary = CREW_IDS.filter((id) => state.crew[id].disguise >= 3).length;
  return { ready: state.blueprints >= 30 && state.bots >= 6 && legendary === CREW_IDS.length, legendary };
};

export const crackRootAccess = (state: GameState): boolean => {
  if (!getFinaleProgress(state).ready) return false;
  state.completed = true;
  state.perfectUntil = Date.now() + 60_000;
  return true;
};

export const getNextObjective = (state: GameState): { label: string; current: number; target: number } => {
  const locked = CREW.find((member) => state.crew[member.id].count === 0);
  if (locked) return { label: `Recruit ${locked.name}`, current: state.coins, target: getRecruitCost(state, locked) };
  if (state.bots < 6) return { label: 'Build Getaway Bots', current: state.bots, target: 6 };
  const finale = getFinaleProgress(state);
  if (finale.legendary < 10) return { label: 'Give every crew member a Legendary disguise', current: finale.legendary, target: 10 };
  if (state.blueprints < 30) return { label: 'Collect Master Blueprints', current: state.blueprints, target: 30 };
  return { label: state.completed ? 'The Infinite Context Vault is empty' : 'Crack Root Access', current: state.completed ? 1 : 0, target: 1 };
};
