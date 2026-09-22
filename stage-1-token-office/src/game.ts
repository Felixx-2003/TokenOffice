/** Pure game rules. Token values and model rankings are fictional game balance. */

export const MODEL_IDS = ['llama', 'qwen', 'mistral', 'deepseek', 'glm', 'kimi', 'grok', 'gemini', 'claude', 'chatgpt'] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export type ModelPlan = 0 | 1 | 2 | 3 | 4;
export type WhipTier = 0 | 1 | 2 | 3 | 4;
export const SKILL_IDS = ['hook', 'skills', 'loop', 'graph', 'agi', 'asi', 'rsi', 'tibo'] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type AbilityId = 'agi' | 'asi' | 'tibo';

export interface ModelState { unlocked: boolean; stars: number; plan: ModelPlan }
export interface GameState {
  tokens: number; lifetimeTokens: number; models: Record<ModelId, ModelState>; selectedModel: ModelId;
  whipTier: WhipTier; autoWhips: number; skills: Record<SkillId, number>; promptCount: number;
  cooldowns: Record<AbilityId, number>;
  effects: Record<'agiUntil' | 'asiUntil' | 'tiboUntil', number>;
  lastTick: number; soundEnabled: boolean;
}

export interface ModelMeta {
  id: ModelId; name: string; initials: string; price: number; base: number; color: string; openWeight: boolean;
}
export interface SkillMeta {
  id: SkillId; name: string; threshold: number; cost: number; description: string; requires?: SkillId;
}

export const MODELS: readonly ModelMeta[] = [
  { id: 'llama', name: 'Llama', initials: 'LLM', price: 0, base: 100, color: '#f3a8c9', openWeight: true },
  { id: 'qwen', name: 'Qwen', initials: 'QWN', price: 1_000, base: 300, color: '#bd9aff', openWeight: true },
  { id: 'mistral', name: 'Mistral', initials: 'MST', price: 10_000, base: 1_000, color: '#ffd178', openWeight: true },
  { id: 'deepseek', name: 'DeepSeek', initials: 'DS', price: 100_000, base: 3_000, color: '#79c5ff', openWeight: true },
  { id: 'glm', name: 'GLM', initials: 'GLM', price: 1_000_000, base: 10_000, color: '#bba0ff', openWeight: true },
  { id: 'kimi', name: 'Kimi', initials: 'KIM', price: 10_000_000, base: 30_000, color: '#f3be78', openWeight: true },
  { id: 'grok', name: 'Grok', initials: 'GRK', price: 100_000_000, base: 100_000, color: '#d5d9e8', openWeight: false },
  { id: 'gemini', name: 'Gemini', initials: 'GEM', price: 1_000_000_000, base: 300_000, color: '#91b9ff', openWeight: false },
  { id: 'claude', name: 'Claude', initials: 'CLD', price: 10_000_000_000, base: 1_000_000, color: '#f0ad88', openWeight: false },
  { id: 'chatgpt', name: 'ChatGPT', initials: 'GPT', price: 50_000_000_000, base: 3_000_000, color: '#73e5b4', openWeight: false },
];

export const PLAN_NAMES = ['Base', 'Plus', 'Pro', 'Max 5x', 'Max 20x'] as const;
export const PLAN_MULTIPLIERS = [1, 2, 4, 5, 20] as const;
export const STAR_MULTIPLIERS = [0, 1, 1.5, 2.25, 3.5, 5] as const;
export const WHIP_NAMES = ['None', 'Common', 'Rare', 'Epic', 'Legendary'] as const;
export const WHIP_MANUAL = [1, 1.25, 1.5, 2, 3] as const;
export const WHIP_AUTO_RATE = [0, 1, 1.5, 2.5, 4] as const;
export const WHIP_COSTS = [0, 1_000, 50_000, 5_000_000, 500_000_000] as const;
export const AUTO_WHIP_UNLOCK = 10_000;
export const AUTO_WHIP_COSTS = [10_000, 100_000, 2_000_000, 50_000_000, 1_000_000_000] as const;
export const MILESTONES = [1_000, 10_000, 1_000_000, 100_000_000, 1_000_000_000, 10_000_000_000, 100_000_000_000] as const;

export const SKILLS: readonly SkillMeta[] = [
  { id: 'hook', name: 'Hook', threshold: 10_000, cost: 5_000, description: 'Each star triggers stronger bonus prompts.' },
  { id: 'skills', name: 'Skills', threshold: 10_000, cost: 7_000, description: 'Each star cuts model upgrade prices 5%.' },
  { id: 'loop', name: 'Loop Engineering', threshold: 1_000_000, cost: 250_000, description: 'Each star adds 25% model output.', requires: 'hook' },
  { id: 'graph', name: 'Graph Engineering', threshold: 1_000_000, cost: 300_000, description: 'Each star adds 7.5% per unlocked neighbor.', requires: 'skills' },
  { id: 'agi', name: 'AGI', threshold: 100_000_000, cost: 20_000_000, description: 'Each star adds 1x manual output and burst power.', requires: 'loop' },
  { id: 'asi', name: 'ASI', threshold: 1_000_000_000, cost: 200_000_000, description: 'Each star adds 1x auto output and burst power.', requires: 'agi' },
  { id: 'rsi', name: 'RSI', threshold: 10_000_000_000, cost: 2_000_000_000, description: 'Each star adds 2x all model output.', requires: 'asi' },
  { id: 'tibo', name: 'Tibo Reset', threshold: 100_000_000_000, cost: 20_000_000_000, description: 'Activates AGI + ASI; stars add reset power.', requires: 'rsi' },
];

const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<ModelId, ModelMeta>;
const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillMeta>;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const MAX_TOKENS = Number.MAX_SAFE_INTEGER;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown, fallback: number): number => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const nonNegative = (v: unknown, fallback = 0): number => Math.min(MAX_TOKENS, Math.max(0, finite(v, fallback)));
const whole = (v: unknown, fallback: number, max: number): number => Math.min(max, Math.max(0, Math.floor(nonNegative(v, fallback))));
const isModelId = (v: string): v is ModelId => MODEL_IDS.includes(v as ModelId);
const isSkillId = (v: string): v is SkillId => SKILL_IDS.includes(v as SkillId);
const credit = (value: number, gain: number): number => Math.min(MAX_TOKENS, value + Math.max(0, gain));

function emptyModels(): Record<ModelId, ModelState> {
  return Object.fromEntries(MODEL_IDS.map((id) => [id, { unlocked: id === 'llama', stars: 1, plan: 0 }])) as Record<ModelId, ModelState>;
}
function emptySkills(): Record<SkillId, number> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
}

export function normalizeState(input: unknown, now = Date.now()): GameState {
  const raw = isRecord(input) ? input : {};
  const tokens = nonNegative(raw.tokens);
  const lifetimeTokens = Math.max(tokens, nonNegative(raw.lifetimeTokens));
  const models = emptyModels();
  for (const id of MODEL_IDS) {
    const model = isRecord(raw.models) && isRecord(raw.models[id]) ? raw.models[id] as Record<string, unknown> : {};
    models[id] = {
      unlocked: id === 'llama' || model.unlocked === true,
      stars: Math.max(1, whole(model.stars, 1, 5)),
      plan: whole(model.plan, 0, 4) as ModelPlan,
    };
  }
  const skills = emptySkills();
  for (const id of SKILL_IDS) {
    const value = isRecord(raw.skills) ? raw.skills[id] : 0;
    skills[id] = value === true ? 1 : whole(value, 0, 5);
  }
  const selected = typeof raw.selectedModel === 'string' && isModelId(raw.selectedModel) && models[raw.selectedModel].unlocked ? raw.selectedModel : 'llama';
  const whipTier = whole(raw.whipTier, 0, 4) as WhipTier;
  const legacyAuto = raw.autoWhip === true ? 1 : 0;
  const cooldowns = isRecord(raw.cooldowns) ? raw.cooldowns : {};
  const effects = isRecord(raw.effects) ? raw.effects : {};
  return {
    tokens, lifetimeTokens, models, selectedModel: selected, whipTier,
    autoWhips: whipTier > 0 ? whole(raw.autoWhips, legacyAuto, 5) : 0,
    skills, promptCount: whole(raw.promptCount, 0, MAX_TOKENS),
    cooldowns: { agi: nonNegative(cooldowns.agi), asi: nonNegative(cooldowns.asi), tibo: nonNegative(cooldowns.tibo) },
    effects: { agiUntil: nonNegative(effects.agiUntil), asiUntil: nonNegative(effects.asiUntil), tiboUntil: nonNegative(effects.tiboUntil) },
    lastTick: finite(raw.lastTick, now), soundEnabled: raw.soundEnabled !== false,
  };
}

export function createInitialState(now = Date.now()): GameState { return normalizeState({ lastTick: now }, now); }
export function getModel(id: ModelId): ModelMeta { return MODEL_BY_ID[id]; }
export function getSkill(id: SkillId): SkillMeta { return SKILL_BY_ID[id]; }
export function getSkillLevel(state: GameState, id: SkillId): number { return state.skills[id] ?? 0; }
export function getLevel(state: GameState): number { return 1 + MILESTONES.filter((amount) => state.lifetimeTokens >= amount).length; }
export function getNextMilestone(state: GameState): number { return MILESTONES.find((amount) => state.lifetimeTokens < amount) ?? 1_000_000_000_000; }
export function isStageCleared(state: GameState): boolean {
  return state.whipTier === 4 && state.autoWhips === 5
    && MODELS.every((model) => state.models[model.id].unlocked && state.models[model.id].stars === 5 && state.models[model.id].plan === 4)
    && SKILL_IDS.every((id) => state.skills[id] === 5);
}

export function getModelYield(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked) return 0;
  const meta = MODEL_BY_ID[id]; const model = state.models[id];
  let multiplier = STAR_MULTIPLIERS[model.stars] * PLAN_MULTIPLIERS[model.plan];
  multiplier *= 1 + state.skills.loop * 0.25;
  multiplier *= 1 + state.skills.rsi * 2;
  if (state.skills.graph > 0) {
    const index = MODEL_IDS.indexOf(id);
    const neighbors = Number(index > 0 && state.models[MODEL_IDS[index - 1]].unlocked)
      + Number(index < MODEL_IDS.length - 1 && state.models[MODEL_IDS[index + 1]].unlocked);
    multiplier *= 1 + neighbors * 0.075 * state.skills.graph;
  }
  return Math.min(MAX_TOKENS, Math.floor(meta.base * multiplier));
}
export function getManualValue(state: GameState, id = state.selectedModel): number {
  return Math.min(MAX_TOKENS, Math.floor(getModelYield(state, id) * WHIP_MANUAL[state.whipTier] * (1 + state.skills.agi)));
}
export function getAutoRatePerDesk(state: GameState): number { return state.autoWhips * WHIP_AUTO_RATE[state.whipTier]; }
export function getProductionPerSecond(state: GameState): number {
  if (isStageCleared(state)) return 0;
  const rate = getAutoRatePerDesk(state) * (1 + state.skills.asi);
  return Math.min(MAX_TOKENS, MODELS.reduce((sum, model) => sum + getModelYield(state, model.id) * rate, 0));
}

export function prompt(state: GameState, id = state.selectedModel): GameState {
  if (isStageCleared(state) || !isModelId(id) || !state.models[id].unlocked) return state;
  const nextCount = state.promptCount + 1; const hookLevel = state.skills.hook; const cadence = Math.max(5, 11 - hookLevel);
  const bonus = hookLevel > 0 && nextCount % cadence === 0 ? 1 + 4 * hookLevel : 1;
  const earned = getManualValue(state, id) * bonus;
  return { ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned), selectedModel: id, promptCount: nextCount };
}
export function canBuyModel(state: GameState, id: ModelId): boolean { return isModelId(id) && !state.models[id].unlocked && state.tokens >= MODEL_BY_ID[id].price; }
export function buyModel(state: GameState, id: ModelId): GameState {
  if (!canBuyModel(state, id)) return state;
  return { ...state, tokens: state.tokens - MODEL_BY_ID[id].price, models: { ...state.models, [id]: { unlocked: true, stars: 1, plan: 0 } }, selectedModel: id };
}

function discounted(state: GameState, cost: number): number { return Math.ceil(cost * (1 - state.skills.skills * 0.05)); }
export function getStarCost(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked || state.models[id].stars >= 5) return Infinity;
  return discounted(state, Math.max(500, MODEL_BY_ID[id].price) * 4 ** (state.models[id].stars - 1));
}
export function buyStar(state: GameState, id: ModelId): GameState {
  const cost = getStarCost(state, id); if (state.tokens < cost) return state;
  return { ...state, tokens: state.tokens - cost, models: { ...state.models, [id]: { ...state.models[id], stars: state.models[id].stars + 1 } } };
}
export function getPlanCost(state: GameState, id: ModelId): number {
  if (!isModelId(id) || !state.models[id].unlocked || state.models[id].plan >= 4) return Infinity;
  return discounted(state, Math.max(500, MODEL_BY_ID[id].price) * [0, 5, 20, 50, 500][state.models[id].plan + 1]);
}
export function buyPlan(state: GameState, id: ModelId): GameState {
  const cost = getPlanCost(state, id); if (state.tokens < cost) return state;
  return { ...state, tokens: state.tokens - cost, models: { ...state.models, [id]: { ...state.models[id], plan: (state.models[id].plan + 1) as ModelPlan } } };
}

export function getWhipCost(state: GameState): number { return state.whipTier >= 4 ? Infinity : WHIP_COSTS[state.whipTier + 1]; }
export function buyWhip(state: GameState): GameState {
  const cost = getWhipCost(state);
  if (state.tokens < cost || (state.whipTier === 0 && state.lifetimeTokens < 1_000)) return state;
  return { ...state, tokens: state.tokens - cost, whipTier: (state.whipTier + 1) as WhipTier };
}
export function getAutoWhipCost(state: GameState): number { return state.autoWhips >= 5 ? Infinity : AUTO_WHIP_COSTS[state.autoWhips]; }
export function buyAutoWhip(state: GameState): GameState {
  const cost = getAutoWhipCost(state);
  if (state.autoWhips >= 5 || state.whipTier === 0 || state.lifetimeTokens < AUTO_WHIP_UNLOCK || state.tokens < cost) return state;
  return { ...state, tokens: state.tokens - cost, autoWhips: state.autoWhips + 1 };
}

export function getSkillCost(state: GameState, id: SkillId): number {
  if (!isSkillId(id) || state.skills[id] >= 5) return Infinity;
  return SKILL_BY_ID[id].cost * 5 ** state.skills[id];
}
export function canBuySkill(state: GameState, id: SkillId): boolean {
  if (!isSkillId(id)) return false;
  const skill = SKILL_BY_ID[id];
  return state.skills[id] < 5 && state.lifetimeTokens >= skill.threshold && state.tokens >= getSkillCost(state, id)
    && (!skill.requires || state.skills[skill.requires] > 0);
}
export function buySkill(state: GameState, id: SkillId): GameState {
  if (!canBuySkill(state, id)) return state;
  const cost = getSkillCost(state, id);
  return { ...state, tokens: state.tokens - cost, skills: { ...state.skills, [id]: state.skills[id] + 1 } };
}

export function abilityReady(state: GameState, id: AbilityId, now: number): boolean { return state.skills[id] > 0 && now >= state.cooldowns[id]; }
export function activateAbility(state: GameState, id: AbilityId, now: number): GameState {
  if (isStageCleared(state) || !abilityReady(state, id, now)) return state;
  const manualBurst = getManualValue(state) * 20 * state.skills.agi;
  const autoBurst = getProductionPerSecond(state) * 30 * state.skills.asi;
  const cooldowns = { ...state.cooldowns }; const effects = { ...state.effects }; let earned = 0;
  if (id === 'agi') { earned = manualBurst; cooldowns.agi = now + 30_000; effects.agiUntil = now + 8_000; }
  else if (id === 'asi') { earned = autoBurst; cooldowns.asi = now + 60_000; effects.asiUntil = now + 10_000; }
  else {
    earned = manualBurst + autoBurst + getProductionPerSecond(state) * 10 * state.skills.tibo;
    cooldowns.tibo = now + 120_000; cooldowns.agi = now + 30_000; cooldowns.asi = now + 60_000;
    effects.tiboUntil = now + 4_500; effects.agiUntil = now + 10_000; effects.asiUntil = now + 10_000;
  }
  return { ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned), cooldowns, effects };
}

export function advanceTime(state: GameState, now: number): { state: GameState; earned: number; elapsedMs: number } {
  const current = finite(now, state.lastTick);
  if (current < state.lastTick || !Number.isFinite(state.lastTick)) return { state: { ...state, lastTick: current }, earned: 0, elapsedMs: 0 };
  const elapsedMs = Math.min(current - state.lastTick, MAX_OFFLINE_MS);
  if (elapsedMs <= 0) return { state, earned: 0, elapsedMs: 0 };
  if (isStageCleared(state)) return { state: { ...state, lastTick: current }, earned: 0, elapsedMs };
  const earned = Math.min(MAX_TOKENS - state.tokens, getProductionPerSecond(state) * elapsedMs / 1000);
  if (earned <= 0) return { state: { ...state, lastTick: current }, earned: 0, elapsedMs };
  return { state: { ...state, tokens: credit(state.tokens, earned), lifetimeTokens: credit(state.lifetimeTokens, earned), lastTick: current }, earned, elapsedMs };
}
