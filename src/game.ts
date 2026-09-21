/** Pure game rules. Token values and model rankings are fictional game balance. */

export const MODEL_IDS = ['chatgpt', 'gemini', 'claude', 'grok', 'deepseek', 'glm', 'kimi', 'qwen', 'llama', 'mistral'] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export type ModelPlan = 0 | 1 | 2 | 3 | 4;
export type WhipTier = 0 | 1 | 2 | 3 | 4;
export const SKILL_IDS = ['hook', 'skills', 'loop', 'graph', 'agi', 'asi', 'rsi', 'tibo'] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type AbilityId = 'agi' | 'asi' | 'tibo';

export interface ModelState { unlocked: boolean; stars: number; plan: ModelPlan }
export interface GameState {
  tokens: number;
  lifetimeTokens: number;
  models: Record<ModelId, ModelState>;
  selectedModel: ModelId;
  whipTier: WhipTier;
  autoWhip: boolean;
  skills: Record<SkillId, boolean>;
  promptCount: number;
  cooldowns: Record<AbilityId, number>;
  lastTick: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface ModelMeta {
  id: ModelId;
  name: string;
  initials: string;
  price: number;
  base: number;
  color: string;
}

export interface SkillMeta {
  id: SkillId;
  name: string;
  threshold: number;
  cost: number;
  description: string;
  requires?: SkillId;
}

export const MODELS: readonly ModelMeta[] = [
  { id: 'chatgpt', name: 'ChatGPT', initials: 'GPT', price: 0, base: 100, color: '#73e5b4' },
  { id: 'gemini', name: 'Gemini', initials: 'GEM', price: 1_000, base: 300, color: '#91b9ff' },
  { id: 'claude', name: 'Claude', initials: 'CLD', price: 10_000, base: 1_000, color: '#f0ad88' },
  { id: 'grok', name: 'Grok', initials: 'GRK', price: 100_000, base: 3_000, color: '#d5d9e8' },
  { id: 'deepseek', name: 'DeepSeek', initials: 'DS', price: 1_000_000, base: 10_000, color: '#79c5ff' },
  { id: 'glm', name: 'GLM', initials: 'GLM', price: 10_000_000, base: 30_000, color: '#bba0ff' },
  { id: 'kimi', name: 'Kimi', initials: 'KIM', price: 100_000_000, base: 100_000, color: '#f3be78' },
  { id: 'qwen', name: 'Qwen', initials: 'QWN', price: 1_000_000_000, base: 300_000, color: '#bd9aff' },
  { id: 'llama', name: 'Llama', initials: 'LLM', price: 10_000_000_000, base: 1_000_000, color: '#f3a8c9' },
  { id: 'mistral', name: 'Mistral', initials: 'MST', price: 50_000_000_000, base: 3_000_000, color: '#ffd178' },
];

export const PLAN_NAMES = ['Base', 'Plus', 'Pro', 'Max 5x', 'Max 20x'] as const;
export const PLAN_MULTIPLIERS = [1, 2, 4, 5, 20] as const;
export const STAR_MULTIPLIERS = [0, 1, 1.5, 2.25, 3.5, 5] as const;
export const WHIP_NAMES = ['None', 'Common', 'Rare', 'Epic', 'Legendary'] as const;
export const WHIP_MANUAL = [1, 1.25, 1.5, 2, 3] as const;
export const WHIP_AUTO_RATE = [0, 0.5, 0.75, 1.25, 2] as const;
export const WHIP_COSTS = [0, 1_000, 50_000, 5_000_000, 500_000_000] as const;
export const AUTO_WHIP_UNLOCK = 10_000;
export const AUTO_WHIP_COST = 10_000;
export const MILESTONES = [1_000, 10_000, 1_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000] as const;

export const SKILLS: readonly SkillMeta[] = [
  { id: 'hook', name: 'Hook', threshold: 10_000, cost: 5_000, description: 'Every 10th manual prompt earns 5x.' },
  { id: 'skills', name: 'Skills', threshold: 10_000, cost: 7_000, description: 'Model star and plan prices fall 20%.' },
  { id: 'loop', name: 'Loop Engineering', threshold: 1_000_000, cost: 250_000, description: 'Every prompt produces 50% more Tokens.', requires: 'hook' },
  { id: 'graph', name: 'Graph Engineering', threshold: 1_000_000, cost: 300_000, description: 'Each unlocked neighbor adds 15% output.', requires: 'skills' },
  { id: 'agi', name: 'AGI', threshold: 100_000_000, cost: 20_000_000, description: '2x manual output; burst for 20 prompts.', requires: 'loop' },
  { id: 'asi', name: 'ASI', threshold: 1_000_000_000, cost: 200_000_000, description: '2x auto output; burst for 30 seconds.', requires: 'agi' },
  { id: 'rsi', name: 'RSI', threshold: 10_000_000_000, cost: 2_000_000_000, description: 'Triple all model output.', requires: 'asi' },
  { id: 'tibo', name: 'Tibo Reset', threshold: 100_000_000_000, cost: 20_000_000_000, description: 'Refresh AGI and ASI; collect 10 seconds of auto output.', requires: 'rsi' },
];

const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<ModelId, ModelMeta>;
const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillMeta>;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const MAX_TOKENS = Number.MAX_SAFE_INTEGER;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown, fallback: number): number => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const nonNegative = (v: unknown, fallback = 0): number => Math.min(MAX_TOKENS, Math.max(0, finite(v, fallback)));
const isModelId = (v: string): v is ModelId => MODEL_IDS.includes(v as ModelId);
const isSkillId = (v: string): v is SkillId => SKILL_IDS.includes(v as SkillId);
const credit = (value: number, gain: number): number => Math.min(MAX_TOKENS, value + Math.max(0, gain));

function emptyModels(): Record<ModelId, ModelState> {
  return Object.fromEntries(MODEL_IDS.map((id) => [id, { unlocked: id === 'chatgpt', stars: 1, plan: 0 }])) as Record<ModelId, ModelState>;
}
function emptySkills(): Record<SkillId, boolean> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, false])) as Record<SkillId, boolean>;
}

export function normalizeState(input: unknown, now = Date.now()): GameState {
  const raw = isRecord(input) ? input : {};
  const tokens = nonNegative(raw.tokens);
  const lifetimeTokens = Math.max(tokens, nonNegative(raw.lifetimeTokens));
  const models = emptyModels();
  for (const id of MODEL_IDS) {
    const model = isRecord(raw.models) && isRecord(raw.models[id]) ? raw.models[id] as Record<string, unknown> : {};
    const stars = finite(model.stars, 1);
    const plan = finite(model.plan, 0);
    models[id] = {
      unlocked: id === 'chatgpt' || model.unlocked === true,
      stars: Number.isSafeInteger(stars) ? Math.min(5, Math.max(1, stars)) : 1,
      plan: (Number.isSafeInteger(plan) ? Math.min(4, Math.max(0, plan)) : 0) as ModelPlan,
    };
  }
  const skills = emptySkills();
  for (const id of SKILL_IDS) skills[id] = isRecord(raw.skills) && raw.skills[id] === true;
  const selected = typeof raw.selectedModel === 'string' && isModelId(raw.selectedModel) && models[raw.selectedModel].unlocked
    ? raw.selectedModel : 'chatgpt';
  const whip = finite(raw.whipTier, 0);
  const whipTier = (Number.isSafeInteger(whip) ? Math.min(4, Math.max(0, whip)) : 0) as WhipTier;
  const cooldowns = isRecord(raw.cooldowns) ? raw.cooldowns : {};
  return {
    tokens, lifetimeTokens, models, selectedModel: selected, whipTier,
    autoWhip: raw.autoWhip === true && whipTier > 0,
    skills, promptCount: Math.max(0, Math.floor(nonNegative(raw.promptCount))),
    cooldowns: {
      agi: nonNegative(cooldowns.agi), asi: nonNegative(cooldowns.asi), tibo: nonNegative(cooldowns.tibo),
    },
    lastTick: finite(raw.lastTick, now),
    soundEnabled: raw.soundEnabled === true,
    reducedMotion: raw.reducedMotion === true,
  };
}

export function createInitialState(now = Date.now()): GameState {
  return normalizeState({ lastTick: now }, now);
}

export function getModel(id: ModelId): ModelMeta { return MODEL_BY_ID[id]; }
export function getSkill(id: SkillId): SkillMeta { return SKILL_BY_ID[id]; }
export function getLevel(state: GameState): number {
  return 1 + MILESTONES.filter((amount) => state.lifetimeTokens >= amount).length;
}
export function getNextMilestone(state: GameState): number {
  return MILESTONES.find((amount) => state.lifetimeTokens < amount) ?? 1_000_000_000_000;
}

export function getModelYield(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked) return 0;
  const meta = MODEL_BY_ID[id];
  const model = state.models[id];
  let multiplier = STAR_MULTIPLIERS[model.stars] * PLAN_MULTIPLIERS[model.plan];
  if (state.skills.loop) multiplier *= 1.5;
  if (state.skills.rsi) multiplier *= 3;
  if (state.skills.graph) {
    const index = MODEL_IDS.indexOf(id);
    const neighbors = Number(index > 0 && state.models[MODEL_IDS[index - 1]].unlocked)
      + Number(index < MODEL_IDS.length - 1 && state.models[MODEL_IDS[index + 1]].unlocked);
    multiplier *= 1 + neighbors * 0.15;
  }
  return Math.min(MAX_TOKENS, Math.floor(meta.base * multiplier));
}

export function getManualValue(state: GameState, id = state.selectedModel): number {
  const base = getModelYield(state, id);
  return Math.min(MAX_TOKENS, Math.floor(base * WHIP_MANUAL[state.whipTier] * (state.skills.agi ? 2 : 1)));
}

export function getAutoRatePerDesk(state: GameState): number {
  return state.autoWhip ? WHIP_AUTO_RATE[state.whipTier] : 0;
}

export function getProductionPerSecond(state: GameState): number {
  const rate = getAutoRatePerDesk(state) * (state.skills.asi ? 2 : 1);
  return Math.min(MAX_TOKENS, MODELS.reduce((sum, model) => sum + getModelYield(state, model.id) * rate, 0));
}

export function prompt(state: GameState, id = state.selectedModel): GameState {
  if (!isModelId(id) || !state.models[id].unlocked) return state;
  const nextCount = state.promptCount + 1;
  const bonus = state.skills.hook && nextCount % 10 === 0 ? 5 : 1;
  const earned = getManualValue(state, id) * bonus;
  return {
    ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned),
    selectedModel: id, promptCount: nextCount,
  };
}

export function canBuyModel(state: GameState, id: ModelId): boolean {
  return isModelId(id) && !state.models[id].unlocked && state.tokens >= MODEL_BY_ID[id].price;
}
export function buyModel(state: GameState, id: ModelId): GameState {
  if (!canBuyModel(state, id)) return state;
  return {
    ...state, tokens: state.tokens - MODEL_BY_ID[id].price,
    models: { ...state.models, [id]: { unlocked: true, stars: 1, plan: 0 } },
    selectedModel: id,
  };
}

function discounted(state: GameState, cost: number): number {
  return Math.ceil(cost * (state.skills.skills ? 0.8 : 1));
}
export function getStarCost(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked || state.models[id].stars >= 5) return Infinity;
  const base = Math.max(500, MODEL_BY_ID[id].price);
  return discounted(state, base * 4 ** (state.models[id].stars - 1));
}
export function buyStar(state: GameState, id: ModelId): GameState {
  const cost = getStarCost(state, id);
  if (state.tokens < cost) return state;
  return { ...state, tokens: state.tokens - cost, models: {
    ...state.models, [id]: { ...state.models[id], stars: state.models[id].stars + 1 },
  } };
}
export function getPlanCost(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked || state.models[id].plan >= 4) return Infinity;
  const base = Math.max(500, MODEL_BY_ID[id].price);
  return discounted(state, base * [0, 5, 20, 50, 500][state.models[id].plan + 1]);
}
export function buyPlan(state: GameState, id: ModelId): GameState {
  const cost = getPlanCost(state, id);
  if (state.tokens < cost) return state;
  return { ...state, tokens: state.tokens - cost, models: {
    ...state.models, [id]: { ...state.models[id], plan: (state.models[id].plan + 1) as ModelPlan },
  } };
}

export function getWhipCost(state: GameState): number {
  return state.whipTier >= 4 ? Infinity : WHIP_COSTS[state.whipTier + 1];
}
export function buyWhip(state: GameState): GameState {
  const cost = getWhipCost(state);
  if (state.tokens < cost || (state.whipTier === 0 && state.lifetimeTokens < 1_000)) return state;
  return { ...state, tokens: state.tokens - cost, whipTier: (state.whipTier + 1) as WhipTier };
}
export function buyAutoWhip(state: GameState): GameState {
  if (state.autoWhip || state.whipTier === 0 || state.lifetimeTokens < AUTO_WHIP_UNLOCK || state.tokens < AUTO_WHIP_COST) return state;
  return { ...state, tokens: state.tokens - AUTO_WHIP_COST, autoWhip: true };
}

export function canBuySkill(state: GameState, id: SkillId): boolean {
  if (!isSkillId(id)) return false;
  const skill = SKILL_BY_ID[id];
  return !state.skills[id] && state.lifetimeTokens >= skill.threshold && state.tokens >= skill.cost
    && (!skill.requires || state.skills[skill.requires]);
}
export function buySkill(state: GameState, id: SkillId): GameState {
  if (!canBuySkill(state, id)) return state;
  return { ...state, tokens: state.tokens - SKILL_BY_ID[id].cost, skills: { ...state.skills, [id]: true } };
}

export function abilityReady(state: GameState, id: AbilityId, now: number): boolean {
  return state.skills[id] && now >= state.cooldowns[id];
}
export function activateAbility(state: GameState, id: AbilityId, now: number): GameState {
  if (!abilityReady(state, id, now)) return state;
  const earned = id === 'agi' ? getManualValue(state) * 20
    : id === 'asi' ? getProductionPerSecond(state) * 30
      : getProductionPerSecond(state) * 10;
  const cooldowns = { ...state.cooldowns, [id]: now + (id === 'agi' ? 30_000 : id === 'asi' ? 60_000 : 120_000) };
  if (id === 'tibo') { cooldowns.agi = now; cooldowns.asi = now; }
  return { ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned), cooldowns };
}

export function advanceTime(state: GameState, now: number): { state: GameState; earned: number; elapsedMs: number } {
  const current = finite(now, state.lastTick);
  if (current < state.lastTick || !Number.isFinite(state.lastTick)) {
    return { state: { ...state, lastTick: current }, earned: 0, elapsedMs: 0 };
  }
  const elapsedMs = Math.min(current - state.lastTick, MAX_OFFLINE_MS);
  if (elapsedMs <= 0) return { state, earned: 0, elapsedMs: 0 };
  const earned = Math.min(MAX_TOKENS - state.tokens, getProductionPerSecond(state) * elapsedMs / 1000);
  if (earned <= 0) return { state: { ...state, lastTick: current }, earned: 0, elapsedMs };
  return {
    state: { ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned), lastTick: current },
    earned, elapsedMs,
  };
}
