import {
  AUTO_WHIP_COST, AUTO_WHIP_UNLOCK, MILESTONES, MODELS, MODEL_IDS, PLAN_MULTIPLIERS,
  PLAN_NAMES, SKILLS, STAR_MULTIPLIERS, WHIP_AUTO_RATE, WHIP_MANUAL, WHIP_NAMES,
  abilityReady, canBuyModel, canBuySkill, getAutoRatePerDesk, getLevel, getManualValue,
  getModelYield, getNextMilestone, getPlanCost, getProductionPerSecond, getStarCost,
  getWhipCost, type AbilityId, type GameState, type ModelId, type SkillId,
} from './game';

export type UIActions = {
  onDesk(id: ModelId): void;
  onPrompt(): void;
  onStar(): void;
  onPlan(): void;
  onWhip(): void;
  onAutoWhip(): void;
  onSkill(id: SkillId): void;
  onAbility(id: AbilityId): void;
  onToggleSound(): void;
  onToggleReducedMotion(): void;
  onReset(): void;
};

type DeskRefs = {
  button: HTMLButtonElement;
  stars: HTMLElement;
  plan: HTMLElement;
  yield: HTMLElement;
  price: HTMLElement;
};
type SkillRefs = { button: HTMLButtonElement; status: HTMLElement; cost: HTMLElement };
type UIRefs = {
  tokens: HTMLElement;
  rate: HTMLElement;
  level: HTMLElement;
  scene: HTMLElement;
  desks: Record<ModelId, DeskRefs>;
  selectedName: HTMLElement;
  selectedMeta: HTMLElement;
  selectedYield: HTMLElement;
  promptButton: HTMLButtonElement;
  promptValue: HTMLElement;
  starButton: HTMLButtonElement;
  starDetail: HTMLElement;
  starCost: HTMLElement;
  planButton: HTMLButtonElement;
  planDetail: HTMLElement;
  planCost: HTMLElement;
  whipButton: HTMLButtonElement;
  whipName: HTMLElement;
  whipDetail: HTMLElement;
  whipCost: HTMLElement;
  autoButton: HTMLButtonElement;
  autoDetail: HTMLElement;
  autoCost: HTMLElement;
  abilityRow: HTMLElement;
  abilities: Record<AbilityId, HTMLButtonElement>;
  goal: HTMLElement;
  progress: HTMLElement;
  progressFill: HTMLElement;
  skillOpen: HTMLButtonElement;
  skillOverlay: HTMLElement;
  skillRefs: Record<SkillId, SkillRefs>;
  soundButton: HTMLButtonElement;
  motionButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  toast: HTMLElement;
  milestone: HTMLElement;
};

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 1_000) return Math.floor(value).toLocaleString();
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [scale, suffix] = units.find(([n]) => value >= n) ?? [1, ''];
  const scaled = value / scale;
  return `${scaled < 10 ? scaled.toFixed(1).replace(/\.0$/, '') : Math.floor(scaled).toLocaleString()}${suffix}`;
}
const tokenText = (value: number): string => `${fmt(value)} Tokens`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function makeDesk(id: ModelId, action: () => void): DeskRefs {
  const meta = MODELS.find((model) => model.id === id)!;
  const button = el('button', 'model-desk is-locked');
  button.type = 'button';
  button.dataset.model = id;
  button.style.setProperty('--desk-color', meta.color);
  button.innerHTML = `
    <span class="desk-lamp" aria-hidden="true"></span>
    <span class="desk-monitor" aria-hidden="true"><span class="desk-screen"><b>${meta.initials}</b><i></i><i></i><i></i></span></span>
    <span class="helper-rig" aria-hidden="true">
      <span class="helper-arm"></span><span class="helper-fist"><i></i></span>
      <svg class="helper-whip" viewBox="0 0 94 72" focusable="false">
        <path class="whip-handle" d="M74 18 L60 31" />
        <path class="whip-cord" d="M61 30 C42 18, 18 17, 20 38 C22 55, 48 51, 40 68" />
      </svg>
    </span>
    <span class="desk-surface" aria-hidden="true"><i></i></span>
    <strong class="desk-name">${meta.name}</strong>
    <span class="desk-stars"></span>
    <span class="desk-plan"></span>
    <span class="desk-yield"></span>
    <span class="desk-price"></span>
  `;
  button.addEventListener('click', action);
  return {
    button, stars: button.querySelector('.desk-stars') as HTMLElement,
    plan: button.querySelector('.desk-plan') as HTMLElement,
    yield: button.querySelector('.desk-yield') as HTMLElement,
    price: button.querySelector('.desk-price') as HTMLElement,
  };
}

function makeSkill(id: SkillId, action: () => void): SkillRefs {
  const meta = SKILLS.find((skill) => skill.id === id)!;
  const button = el('button', 'skill-node');
  button.type = 'button';
  button.dataset.skill = id;
  button.innerHTML = `<strong>${meta.name}</strong><span>${meta.description}</span><small class="skill-status"></small><b class="skill-cost"></b>`;
  button.addEventListener('click', action);
  return {
    button, status: button.querySelector('.skill-status') as HTMLElement,
    cost: button.querySelector('.skill-cost') as HTMLElement,
  };
}

function buildRefs(root: HTMLElement, actions: UIActions): UIRefs {
  root.innerHTML = '';
  root.className = 'app-shell';
  const app = el('div', 'app');
  const header = el('header', 'topbar');
  header.innerHTML = `
    <div class="brand"><span class="brand-mark">⌘</span> TOKEN <b>OFFICE</b><small>fictional idle game</small></div>
    <div class="top-stats"><strong class="token-value">0</strong><span>Tokens</span><i></i><span class="rate-value">0/sec</span><span class="level-value">Lv 1</span></div>
  `;
  const main = el('main', 'main-layout');
  const playArea = el('section', 'play-area');
  const instruction = el('p', 'instruction');
  instruction.textContent = 'Click an unlocked desk or press Space to prompt. Buy desks, then upgrade each model’s stars and plan.';
  const scene = el('div', 'office-scene');
  scene.innerHTML = '<div class="office-windows"><i></i><i></i><i></i><i></i></div><div class="office-title">THE TOKEN FLOOR <span>● LIVE</span></div><div class="office-grid"></div><div class="office-floor"></div>';
  const grid = scene.querySelector('.office-grid') as HTMLElement;
  const desks = Object.fromEntries(MODEL_IDS.map((id) => {
    const refs = makeDesk(id, () => actions.onDesk(id));
    grid.append(refs.button);
    return [id, refs];
  })) as Record<ModelId, DeskRefs>;
  const actionBar = el('div', 'action-bar');
  const promptButton = el('button', 'prompt-button');
  promptButton.type = 'button';
  promptButton.innerHTML = '<strong>⚡ PROMPT</strong><small class="prompt-value">+100 Tokens</small>';
  promptButton.addEventListener('click', actions.onPrompt);
  const actionHint = el('div', 'action-hint');
  actionHint.innerHTML = '<strong class="selected-name">ChatGPT</strong><span class="selected-meta">1★ · Base</span><span class="selected-yield">100 Tokens per prompt</span>';
  const skillOpen = el('button', 'skill-open');
  skillOpen.type = 'button';
  skillOpen.textContent = '✦ Skill Tree';
  actionBar.append(promptButton, actionHint, skillOpen);
  playArea.append(instruction, scene, actionBar);

  const panel = el('aside', 'control-panel');
  const modelCard = el('section', 'panel-card model-panel');
  modelCard.innerHTML = '<div class="panel-heading"><h2>Selected model</h2><span>per desk</span></div><div class="upgrade-list"></div>';
  const upgradeList = modelCard.querySelector('.upgrade-list') as HTMLElement;
  const starButton = el('button', 'upgrade-button');
  starButton.type = 'button';
  starButton.innerHTML = '<span><strong>★ Stars</strong><small class="star-detail"></small></span><b class="star-cost"></b><i class="buy-arrow">↑</i>';
  starButton.addEventListener('click', actions.onStar);
  const planButton = el('button', 'upgrade-button');
  planButton.type = 'button';
  planButton.innerHTML = '<span><strong>▣ Plan</strong><small class="plan-detail"></small></span><b class="plan-cost"></b><i class="buy-arrow">↑</i>';
  planButton.addEventListener('click', actions.onPlan);
  upgradeList.append(starButton, planButton);

  const whipCard = el('section', 'panel-card whip-panel');
  whipCard.innerHTML = '<div class="panel-heading"><h2>Prompt Whip</h2><span class="whip-name">None</span></div><div class="upgrade-list"></div>';
  const whipList = whipCard.querySelector('.upgrade-list') as HTMLElement;
  const whipButton = el('button', 'upgrade-button');
  whipButton.type = 'button';
  whipButton.innerHTML = '<span><strong>↝ Whip rarity</strong><small class="whip-detail"></small></span><b class="whip-cost"></b><i class="buy-arrow">↑</i>';
  whipButton.addEventListener('click', actions.onWhip);
  const autoButton = el('button', 'upgrade-button');
  autoButton.type = 'button';
  autoButton.innerHTML = '<span><strong>✋ Auto Whip</strong><small class="auto-detail"></small></span><b class="auto-cost"></b><i class="buy-arrow">↑</i>';
  autoButton.addEventListener('click', actions.onAutoWhip);
  whipList.append(whipButton, autoButton);

  const abilityRow = el('section', 'ability-row');
  const abilities = {} as Record<AbilityId, HTMLButtonElement>;
  for (const id of ['agi', 'asi', 'tibo'] as AbilityId[]) {
    const button = el('button', 'ability-button');
    button.type = 'button';
    button.dataset.ability = id;
    button.addEventListener('click', () => actions.onAbility(id));
    abilityRow.append(button);
    abilities[id] = button;
  }

  const goalCard = el('section', 'goal-card');
  goalCard.innerHTML = '<span class="goal-label">NEXT MILESTONE</span><strong class="goal-value">1K Tokens</strong><span class="goal-progress">0 / 1K earned</span><div class="progress-track"><i class="progress-fill"></i></div>';
  const settings = el('footer', 'settings');
  const soundButton = el('button');
  const motionButton = el('button');
  const resetButton = el('button', 'reset-button');
  soundButton.type = motionButton.type = resetButton.type = 'button';
  soundButton.addEventListener('click', actions.onToggleSound);
  motionButton.addEventListener('click', actions.onToggleReducedMotion);
  resetButton.addEventListener('click', actions.onReset);
  settings.append(soundButton, motionButton, resetButton);
  panel.append(modelCard, whipCard, abilityRow, goalCard, settings);

  const skillOverlay = el('div', 'skill-overlay');
  skillOverlay.innerHTML = '<div class="skill-dialog" role="dialog" aria-modal="true" aria-label="Skill Tree"><div class="skill-header"><div><small>MILESTONE RESEARCH</small><h2>Skill Tree</h2></div><button class="skill-close" type="button" aria-label="Close skill tree">×</button></div><p>Earn lifetime Tokens to reveal nodes. Spend Tokens to buy them.</p><div class="skill-grid"></div></div>';
  const skillGrid = skillOverlay.querySelector('.skill-grid') as HTMLElement;
  const skillRefs = Object.fromEntries(SKILLS.map((skill) => {
    const refs = makeSkill(skill.id, () => actions.onSkill(skill.id));
    skillGrid.append(refs.button);
    return [skill.id, refs];
  })) as Record<SkillId, SkillRefs>;
  const closeSkills = (): void => { skillOverlay.classList.remove('is-open'); skillOpen.focus(); };
  skillOpen.addEventListener('click', () => skillOverlay.classList.add('is-open'));
  (skillOverlay.querySelector('.skill-close') as HTMLButtonElement).addEventListener('click', closeSkills);
  skillOverlay.addEventListener('click', (event) => { if (event.target === skillOverlay) closeSkills(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && skillOverlay.classList.contains('is-open')) closeSkills(); });
  const toast = el('div', 'toast');
  toast.setAttribute('role', 'status');
  const milestone = el('div', 'milestone');
  milestone.setAttribute('role', 'status');
  main.append(playArea, panel);
  app.append(header, main, skillOverlay, toast, milestone);
  root.append(app);
  return {
    tokens: header.querySelector('.token-value') as HTMLElement,
    rate: header.querySelector('.rate-value') as HTMLElement,
    level: header.querySelector('.level-value') as HTMLElement,
    scene, desks,
    selectedName: actionHint.querySelector('.selected-name') as HTMLElement,
    selectedMeta: actionHint.querySelector('.selected-meta') as HTMLElement,
    selectedYield: actionHint.querySelector('.selected-yield') as HTMLElement,
    promptButton, promptValue: promptButton.querySelector('.prompt-value') as HTMLElement,
    starButton, starDetail: starButton.querySelector('.star-detail') as HTMLElement,
    starCost: starButton.querySelector('.star-cost') as HTMLElement,
    planButton, planDetail: planButton.querySelector('.plan-detail') as HTMLElement,
    planCost: planButton.querySelector('.plan-cost') as HTMLElement,
    whipButton, whipName: whipCard.querySelector('.whip-name') as HTMLElement,
    whipDetail: whipButton.querySelector('.whip-detail') as HTMLElement,
    whipCost: whipButton.querySelector('.whip-cost') as HTMLElement,
    autoButton, autoDetail: autoButton.querySelector('.auto-detail') as HTMLElement,
    autoCost: autoButton.querySelector('.auto-cost') as HTMLElement,
    abilityRow, abilities,
    goal: goalCard.querySelector('.goal-value') as HTMLElement,
    progress: goalCard.querySelector('.goal-progress') as HTMLElement,
    progressFill: goalCard.querySelector('.progress-fill') as HTMLElement,
    skillOpen, skillOverlay, skillRefs,
    soundButton, motionButton, resetButton, toast, milestone,
  };
}

function setBuyState(button: HTMLButtonElement, affordable: boolean, locked = false, owned = false): void {
  button.disabled = !affordable;
  button.classList.toggle('is-affordable', affordable);
  button.classList.toggle('is-unaffordable', !affordable && !locked && !owned);
  button.classList.toggle('is-locked', locked);
  button.classList.toggle('is-owned', owned);
}

export function createUI(root: HTMLElement, actions: UIActions): {
  render(state: GameState): void;
  flashPrompt(id: ModelId, amount: number): void;
  showHint(message: string): void;
  showOffline(earned: number, elapsedMs: number): void;
} {
  const refs = buildRefs(root, actions);
  let previousLevel = -1;
  let toastTimer: number | undefined;
  let milestoneTimer: number | undefined;

  function showHint(message: string): void {
    refs.toast.textContent = message;
    refs.toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 2800);
  }

  function flashPrompt(id: ModelId, amount: number): void {
    const desk = refs.desks[id].button;
    desk.classList.remove('is-prompting');
    void desk.offsetWidth;
    desk.classList.add('is-prompting');
    window.setTimeout(() => desk.classList.remove('is-prompting'), 540);
    const fly = el('span', 'token-fly');
    fly.textContent = `+${fmt(amount)}`;
    desk.append(fly);
    window.setTimeout(() => fly.remove(), 920);
  }

  function render(state: GameState): void {
    const selected = MODELS.find((model) => model.id === state.selectedModel)!;
    const selection = state.models[selected.id];
    const manual = getManualValue(state);
    refs.tokens.textContent = fmt(state.tokens);
    refs.rate.textContent = `${fmt(getProductionPerSecond(state))}/sec`;
    refs.level.textContent = `Lv ${getLevel(state)}`;
    refs.scene.dataset.whip = String(state.whipTier);
    refs.scene.classList.toggle('has-auto', state.autoWhip);
    refs.scene.style.setProperty('--auto-duration', `${Math.max(.3, 1 / Math.max(.5, getAutoRatePerDesk(state)))}s`);
    for (const meta of MODELS) {
      const model = state.models[meta.id];
      const desk = refs.desks[meta.id];
      const affordable = canBuyModel(state, meta.id);
      desk.button.classList.toggle('is-locked', !model.unlocked);
      desk.button.classList.toggle('is-selected', state.selectedModel === meta.id);
      desk.button.classList.toggle('is-affordable', affordable);
      desk.button.classList.toggle('is-unaffordable', !model.unlocked && !affordable);
      desk.button.classList.toggle('is-auto', model.unlocked && state.autoWhip);
      desk.stars.textContent = model.unlocked ? '★'.repeat(model.stars) + '☆'.repeat(5 - model.stars) : 'LOCKED';
      desk.plan.textContent = model.unlocked ? PLAN_NAMES[model.plan] : '';
      desk.yield.textContent = model.unlocked ? `+${fmt(getModelYield(state, meta.id))} / prompt` : '';
      desk.price.textContent = model.unlocked ? '' : `${affordable ? '↑ ' : ''}${fmt(meta.price)} Tokens`;
      desk.button.setAttribute('aria-label', model.unlocked
        ? `Prompt ${meta.name}, ${model.stars} stars, ${PLAN_NAMES[model.plan]}, ${tokenText(getManualValue(state, meta.id))} per manual prompt`
        : affordable ? `Unlock ${meta.name} for ${tokenText(meta.price)}`
          : `${meta.name} costs ${tokenText(meta.price)}, not enough Tokens`);
    }
    refs.selectedName.textContent = selected.name;
    refs.selectedMeta.textContent = `${selection.stars}★ · ${PLAN_NAMES[selection.plan]}`;
    refs.selectedYield.textContent = `${tokenText(getModelYield(state, selected.id))} per model prompt`;
    refs.promptValue.textContent = `+${tokenText(manual)} · Space`;
    const starCost = getStarCost(state, selected.id);
    const nextStars = Math.min(5, selection.stars + 1);
    const canStar = state.tokens >= starCost;
    setBuyState(refs.starButton, canStar, false, selection.stars === 5);
    refs.starDetail.textContent = selection.stars === 5 ? 'Maximum 5★ reached'
      : `${selection.stars}★ → ${nextStars}★ · ${STAR_MULTIPLIERS[nextStars]}x model yield`;
    refs.starCost.textContent = selection.stars === 5 ? 'MAX' : fmt(starCost);
    const planCost = getPlanCost(state, selected.id);
    const nextPlan = Math.min(4, selection.plan + 1);
    setBuyState(refs.planButton, state.tokens >= planCost, false, selection.plan === 4);
    refs.planDetail.textContent = selection.plan === 4 ? 'Maximum plan reached'
      : `${PLAN_NAMES[selection.plan]} → ${PLAN_NAMES[nextPlan]} · ${PLAN_MULTIPLIERS[nextPlan]}x`;
    refs.planCost.textContent = selection.plan === 4 ? 'MAX' : fmt(planCost);
    const whipCost = getWhipCost(state);
    const nextWhip = Math.min(4, state.whipTier + 1);
    const whipLocked = state.whipTier === 0 && state.lifetimeTokens < 1_000;
    setBuyState(refs.whipButton, !whipLocked && state.tokens >= whipCost, whipLocked, state.whipTier === 4);
    refs.whipName.textContent = WHIP_NAMES[state.whipTier];
    refs.whipName.className = `whip-name whip-${state.whipTier}`;
    refs.whipDetail.textContent = state.whipTier === 4 ? `${WHIP_MANUAL[4]}x manual · ${WHIP_AUTO_RATE[4]} auto prompts/sec/desk`
      : whipLocked ? 'Unlock at 1K lifetime Tokens'
        : `${WHIP_NAMES[nextWhip]} · ${WHIP_MANUAL[nextWhip]}x manual${state.autoWhip ? ` · ${WHIP_AUTO_RATE[nextWhip]}/sec` : ''}`;
    refs.whipCost.textContent = state.whipTier === 4 ? 'MAX' : fmt(whipCost);
    const autoLocked = state.lifetimeTokens < AUTO_WHIP_UNLOCK || state.whipTier === 0;
    setBuyState(refs.autoButton, !state.autoWhip && !autoLocked && state.tokens >= AUTO_WHIP_COST, autoLocked, state.autoWhip);
    refs.autoDetail.textContent = state.autoWhip ? `${getAutoRatePerDesk(state)} prompts/sec per unlocked desk`
      : autoLocked ? 'Unlock at 10K lifetime Tokens + Common Whip' : 'Prompt every unlocked desk hands-free';
    refs.autoCost.textContent = state.autoWhip ? 'ON' : fmt(AUTO_WHIP_COST);
    const now = Date.now();
    refs.abilityRow.classList.toggle('has-abilities', state.skills.agi || state.skills.asi || state.skills.tibo);
    for (const id of ['agi', 'asi', 'tibo'] as AbilityId[]) {
      const button = refs.abilities[id];
      button.hidden = !state.skills[id];
      const seconds = Math.ceil(Math.max(0, state.cooldowns[id] - now) / 1000);
      button.textContent = seconds ? `${id.toUpperCase()} ${seconds}s` : id === 'tibo' ? '↺ Tibo Reset' : `⚡ ${id.toUpperCase()}`;
      button.disabled = !abilityReady(state, id, now);
    }
    const next = getNextMilestone(state);
    const previous = [...MILESTONES].reverse().find((value) => value <= state.lifetimeTokens) ?? 0;
    const progress = Math.max(0, Math.min(100, ((state.lifetimeTokens - previous) / (next - previous)) * 100));
    refs.goal.textContent = next === 1e12 ? 'All skills revealed' : `${fmt(next)} lifetime Tokens`;
    refs.progress.textContent = `${fmt(state.lifetimeTokens)} / ${fmt(next)} earned`;
    refs.progressFill.style.width = `${progress}%`;
    refs.skillOpen.textContent = `✦ Skill Tree · ${SKILLS.filter((skill) => state.skills[skill.id]).length}/${SKILLS.length}`;
    for (const skill of SKILLS) {
      const item = refs.skillRefs[skill.id];
      const owned = state.skills[skill.id];
      const unlocked = state.lifetimeTokens >= skill.threshold;
      const prerequisite = !skill.requires || state.skills[skill.requires];
      const affordable = canBuySkill(state, skill.id);
      setBuyState(item.button, affordable, !unlocked || !prerequisite, owned);
      item.status.textContent = owned ? 'OWNED' : !unlocked ? `Unlock at ${fmt(skill.threshold)} lifetime Tokens`
        : !prerequisite ? `Requires ${SKILLS.find((s) => s.id === skill.requires)?.name}` : 'Ready to research';
      item.cost.textContent = owned ? '✓' : fmt(skill.cost);
    }
    refs.soundButton.textContent = state.soundEnabled ? '♪ Sound on' : '♪ Sound off';
    refs.motionButton.textContent = state.reducedMotion ? '✧ Motion reduced' : '✧ Motion on';
    refs.resetButton.textContent = '↺ Reset';
    document.documentElement.classList.toggle('reduced-motion', state.reducedMotion);
    if (previousLevel >= 0 && getLevel(state) > previousLevel) {
      refs.milestone.textContent = `Level ${getLevel(state)} · New research available`;
      refs.milestone.classList.add('is-visible');
      if (milestoneTimer) window.clearTimeout(milestoneTimer);
      milestoneTimer = window.setTimeout(() => refs.milestone.classList.remove('is-visible'), 3400);
    }
    previousLevel = getLevel(state);
  }

  function showOffline(earned: number, elapsedMs: number): void {
    if (earned > 0 && elapsedMs >= 1000) showHint(`While away: +${tokenText(earned)} over ${Math.round(elapsedMs / 60000)} min`);
  }

  return { render, flashPrompt, showHint, showOffline };
}
