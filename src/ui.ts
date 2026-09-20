import {
  PRODUCERS, UPGRADES, AUTO_RARITIES, MAX_AUTO_STARS,
  canBuyAutoUpgrade, canBuyProducer, canBuyUpgrade,
  getProducerCost, getProductionPerSecond, getAutoClicksPerSecond,
  getAutoRarity, getAutoUpgradeCost, getLevel, getStage, getTapValue,
  type GameState, type ProducerId, type UpgradeId, type Rarity,
} from './game';

export type UIActions = {
  onTap(): void;
  onBuyAutoUpgrade(): void;
  onBuyProducer(id: ProducerId): void;
  onBuyUpgrade(id: UpgradeId): void;
  onToggleSound(): void;
  onToggleReducedMotion(): void;
  onReset(): void;
};

type CardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  detail: HTMLElement;
  cost: HTMLElement;
  count: HTMLElement;
  rarity: HTMLElement;
  indicator: HTMLElement;
};

type UIRefs = {
  cash: HTMLElement;
  level: HTMLElement;
  rate: HTMLElement;
  next: HTMLElement;
  progress: HTMLElement;
  progressFill: HTMLElement;
  scene: HTMLElement;
  tapValue: HTMLElement;
  producerCards: Record<ProducerId, CardRefs>;
  autoCard: CardRefs;
  upgradeCards: Record<UpgradeId, CardRefs>;
  soundButton: HTMLButtonElement;
  motionButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  toast: HTMLElement;
  toastText: HTMLElement;
  milestone: HTMLElement;
  milestoneTitle: HTMLElement;
  milestoneText: HTMLElement;
};

const PRODUCER_ORDER: ProducerId[] = ['coinPusher', 'pinball', 'clawMachine', 'jackpot'];
const UPGRADE_ORDER: UpgradeId[] = ['powerGlove', 'coinBooster', 'multiball'];
const MILESTONES = [1_000, 5_000, 50_000, 500_000, 5_000_000];
const GOAL_NAMES = ['Open the arcade', 'Free Auto Player', 'Epic machines', 'Legendary machines', 'Arcade empire'];
const PRODUCER_META = Object.fromEntries(PRODUCERS.map((item) => [item.id, item])) as Record<ProducerId, (typeof PRODUCERS)[number]>;
const UPGRADE_META = Object.fromEntries(UPGRADES.map((item) => [item.id, item])) as Record<UpgradeId, (typeof UPGRADES)[number]>;
const ICONS: Record<ProducerId | UpgradeId | 'auto', string> = {
  coinPusher: '◉', pinball: '◆', clawMachine: '⌁', jackpot: '★',
  powerGlove: '✦', coinBooster: '◎', multiball: '✧', auto: '↻',
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 1_000) return Math.floor(value).toLocaleString();
  if (value < 1_000_000) return Math.floor(value).toLocaleString();
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(value < 10_000_000 ? 1 : 0)}m`;
  return `${(value / 1_000_000_000).toFixed(1)}b`;
}

function formatCash(value: number): string { return `$${formatNumber(value)}`; }

function nextGoal(lifetime: number): { amount: number; previous: number; name: string } {
  let previous = 0;
  for (let index = 0; index < MILESTONES.length; index++) {
    const amount = MILESTONES[index];
    if (lifetime < amount) return { amount, previous, name: GOAL_NAMES[index] };
    previous = amount;
  }
  let amount = 10_000_000;
  while (amount <= lifetime) { previous = amount; amount *= 2; }
  return { amount, previous, name: 'Next cash goal' };
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function setRarity(card: HTMLElement, rarity: Rarity | 'Locked'): void {
  card.classList.remove('rarity-common', 'rarity-rare', 'rarity-epic', 'rarity-legendary');
  if (rarity !== 'Locked') card.classList.add(`rarity-${rarity.toLowerCase()}`);
}

function makeScene(): HTMLElement {
  const scene = element('div', 'arcade-scene');
  scene.setAttribute('aria-label', 'Your arcade grows as you collect machines');
  scene.innerHTML = `
    <div class="ceiling-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="arcade-sign">POCKET <b>ARCADE</b><small>PLAY · EARN · EXPAND</small></div>
    <div class="machine-row" aria-hidden="true">
      <div class="machine rarity-common" data-machine="coinPusher"><div class="machine-screen">◉</div><span>COIN</span><small>COMMON</small></div>
      <div class="machine rarity-rare" data-machine="pinball"><div class="machine-screen">◆</div><span>PINBALL</span><small>RARE</small></div>
      <div class="machine rarity-epic" data-machine="clawMachine"><div class="machine-screen">⌁</div><span>CLAW</span><small>EPIC</small></div>
      <div class="machine rarity-legendary" data-machine="jackpot"><div class="machine-screen">★</div><span>JACKPOT</span><small>LEGENDARY</small></div>
    </div>
    <div class="arcade-floor" aria-hidden="true"></div>
    <div class="arcade-status"><i></i><span class="arcade-status-text">Your first machine is waiting</span></div>
  `;
  return scene;
}

function makeCard(kind: ProducerId | UpgradeId | 'auto', name: string, rarity: Rarity | 'Locked', onClick: () => void): CardRefs {
  const card = element('article', 'shop-card');
  setRarity(card, rarity);
  const button = element('button', 'shop-buy');
  button.type = 'button';
  button.dataset.shopId = kind;
  button.addEventListener('click', onClick);
  button.innerHTML = `<span class="card-icon" aria-hidden="true">${ICONS[kind]}</span><span class="card-body"><strong>${name}</strong><small class="card-detail"></small><small class="card-rarity"></small></span><span class="card-side"><b class="card-count"></b><span class="card-cost"></span><span class="purchase-indicator" aria-hidden="true"></span></span>`;
  card.append(button);
  return {
    card, button,
    detail: button.querySelector('.card-detail') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
    count: button.querySelector('.card-count') as HTMLElement,
    rarity: button.querySelector('.card-rarity') as HTMLElement,
    indicator: button.querySelector('.purchase-indicator') as HTMLElement,
  };
}

function buildRefs(root: HTMLElement, actions: UIActions): UIRefs {
  root.innerHTML = '';
  root.className = 'app-shell';
  const app = element('div', 'app');
  const topbar = element('header', 'topbar');
  topbar.innerHTML = '<a class="brand" href="#main"><span class="brand-mark">◉</span>Pocket <b>Arcade</b></a>';
  const main = element('main', 'main-layout');
  main.id = 'main';
  const left = element('section', 'play-panel');
  const instruction = element('p', 'instruction');
  instruction.textContent = 'Press Space anywhere or click Play for Cash. Buy rarer machines to earn more, then upgrade your Auto Player.';
  const sceneWrap = element('div', 'scene-wrap');
  const scene = makeScene();
  sceneWrap.append(scene);
  const actionArea = element('div', 'action-area');
  const tapButton = element('button', 'tap-button');
  tapButton.type = 'button';
  tapButton.innerHTML = '<span class="tap-button-icon">●</span><span class="tap-button-label">PLAY</span><small class="tap-button-hint">+$50 per play</small>';
  tapButton.addEventListener('click', actions.onTap);
  const summary = element('section', 'summary-card');
  summary.setAttribute('aria-label', 'Arcade progress');
  summary.innerHTML = '<div class="cash-row"><span class="cash-icon">$</span><strong class="cash-value">$0</strong><span class="cash-label">Cash</span><span class="rate-value">$0 / sec</span></div><div class="goal-row"><span><b class="level-value">Lv 1</b> · Next: <strong class="next-value">Open the arcade</strong></span><span class="progress-text">$0 / $1,000</span></div><div class="progress-track"><span class="progress-fill"></span></div>';
  actionArea.append(tapButton, summary);
  left.append(instruction, sceneWrap, actionArea);

  const right = element('aside', 'control-panel');
  const shop = element('section', 'shop-section');
  shop.innerHTML = '<div class="section-heading"><h2>Machines</h2><span>rarer = bigger payout</span></div>';
  const machineList = element('div', 'card-list');
  const producerCards = Object.fromEntries(PRODUCER_ORDER.map((id) => {
    const meta = PRODUCER_META[id];
    const refs = makeCard(id, meta.name, meta.rarity, () => actions.onBuyProducer(id));
    machineList.append(refs.card);
    return [id, refs];
  })) as Record<ProducerId, CardRefs>;
  const autoCard = makeCard('auto', 'Auto Player', 'Locked', actions.onBuyAutoUpgrade);
  autoCard.card.classList.add('auto-card');
  const upgradeHeading = element('div', 'subsection-heading');
  upgradeHeading.textContent = 'Upgrades';
  const upgradeList = element('div', 'card-list');
  const upgradeCards = Object.fromEntries(UPGRADE_ORDER.map((id) => {
    const meta = UPGRADE_META[id];
    const refs = makeCard(id, meta.name, meta.rarity, () => actions.onBuyUpgrade(id));
    upgradeList.append(refs.card);
    return [id, refs];
  })) as Record<UpgradeId, CardRefs>;
  shop.append(machineList, autoCard.card, upgradeHeading, upgradeList);
  const footer = element('footer', 'settings');
  const soundButton = element('button', 'setting-button');
  const motionButton = element('button', 'setting-button');
  const resetButton = element('button', 'reset-button');
  soundButton.type = motionButton.type = resetButton.type = 'button';
  soundButton.addEventListener('click', actions.onToggleSound);
  motionButton.addEventListener('click', actions.onToggleReducedMotion);
  resetButton.addEventListener('click', actions.onReset);
  footer.append(soundButton, motionButton, resetButton);
  right.append(shop, footer);
  const toast = element('div', 'toast');
  toast.setAttribute('role', 'status');
  const toastText = element('span');
  toast.append(toastText);
  const milestone = element('div', 'milestone-modal');
  milestone.setAttribute('role', 'status');
  const milestoneTitle = element('strong');
  const milestoneText = element('span');
  milestone.append(milestoneTitle, milestoneText);
  main.append(left, right);
  app.append(topbar, main, toast, milestone);
  root.append(app);
  return {
    cash: summary.querySelector('.cash-value') as HTMLElement,
    level: summary.querySelector('.level-value') as HTMLElement,
    rate: summary.querySelector('.rate-value') as HTMLElement,
    next: summary.querySelector('.next-value') as HTMLElement,
    progress: summary.querySelector('.progress-text') as HTMLElement,
    progressFill: summary.querySelector('.progress-fill') as HTMLElement,
    scene, tapValue: tapButton.querySelector('.tap-button-hint') as HTMLElement,
    producerCards, autoCard, upgradeCards,
    soundButton, motionButton, resetButton,
    toast, toastText, milestone, milestoneTitle, milestoneText,
  };
}

function updateProducerCard(refs: CardRefs, id: ProducerId, state: GameState): void {
  const meta = PRODUCER_META[id];
  const count = state.owned[id];
  const cost = getProducerCost(state, id);
  const locked = state.lifetimeCash < meta.unlockAt;
  const affordable = canBuyProducer(state, id);
  refs.card.classList.toggle('is-locked', locked);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !locked && !affordable);
  refs.button.disabled = !affordable;
  refs.button.setAttribute('aria-label', locked
    ? `${meta.rarity} ${meta.name} unlocks at ${formatCash(meta.unlockAt)} earned, costs ${formatCash(cost)}`
    : affordable ? `Buy ${meta.rarity} ${meta.name} for ${formatCash(cost)}`
      : `Not enough Cash for ${meta.rarity} ${meta.name}, costs ${formatCash(cost)}`);
  refs.count.textContent = count > 0 ? `×${count}` : '';
  refs.detail.textContent = locked ? `Unlock at ${formatCash(meta.unlockAt)} earned` : `+${formatCash(meta.rate)} / sec each`;
  refs.rarity.textContent = meta.rarity.toUpperCase();
  refs.cost.textContent = formatCash(cost);
  refs.indicator.textContent = affordable ? '↑' : '';
}

function updateUpgradeCard(refs: CardRefs, id: UpgradeId, state: GameState): void {
  const meta = UPGRADE_META[id];
  const owned = state.upgrades[id];
  const affordable = canBuyUpgrade(state, id);
  refs.card.classList.toggle('is-owned', owned);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !owned && !affordable);
  refs.button.disabled = owned || !affordable;
  refs.button.setAttribute('aria-label', owned ? `${meta.name} owned`
    : affordable ? `Buy ${meta.rarity} ${meta.name} for ${formatCash(meta.cost)}`
      : `Not enough Cash for ${meta.name}, costs ${formatCash(meta.cost)}`);
  refs.count.textContent = owned ? '✓' : '';
  refs.detail.textContent = meta.description;
  refs.rarity.textContent = meta.rarity.toUpperCase();
  refs.cost.textContent = owned ? 'Owned' : formatCash(meta.cost);
  refs.indicator.textContent = affordable ? '↑' : '';
}

function updateAutoCard(refs: CardRefs, state: GameState): void {
  const stars = Math.min(MAX_AUTO_STARS, state.autoPlayerStars);
  const locked = stars === 0;
  const maxed = stars === MAX_AUTO_STARS;
  const rarity = getAutoRarity(state);
  const nextRarity = AUTO_RARITIES[Math.min(MAX_AUTO_STARS, stars + 1)];
  const affordable = canBuyAutoUpgrade(state);
  const cost = getAutoUpgradeCost(state);
  const plays = getAutoClicksPerSecond(state);
  const nextPlays = getAutoClicksPerSecond({ ...state, autoPlayerStars: Math.min(MAX_AUTO_STARS, stars + 1) });
  setRarity(refs.card, rarity);
  refs.card.classList.toggle('is-locked', locked);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !locked && !maxed && !affordable);
  refs.button.disabled = !affordable;
  refs.button.setAttribute('aria-label', locked ? 'Auto Player unlocks free at Level 3 after earning $5,000 total'
    : maxed ? 'Legendary Auto Player, maximum tier'
      : affordable ? `Upgrade Auto Player to ${nextRarity} for ${formatCash(cost)}`
        : `Not enough Cash to upgrade Auto Player to ${nextRarity}, costs ${formatCash(cost)}`);
  refs.count.textContent = locked ? '' : `${stars}★`;
  refs.rarity.textContent = locked ? 'LOCKED' : rarity.toUpperCase();
  refs.detail.textContent = locked ? 'Free at Level 3 · $5,000 earned'
    : maxed ? `${plays} plays / sec · max tier`
      : `${plays}/sec → ${nextRarity} ${nextPlays}/sec`;
  refs.cost.textContent = locked ? 'Free later' : maxed ? 'MAX' : formatCash(cost);
  refs.indicator.textContent = affordable ? '↑' : '';
}

export function createUI(root: HTMLElement, actions: UIActions): { render(state: GameState): void; showOffline(earned: number, elapsedMs: number): void } {
  const refs = buildRefs(root, actions);
  let previousLevel = -1;
  let toastTimeout: number | undefined;

  function showToast(message: string): void {
    refs.toastText.textContent = message;
    refs.toast.classList.add('is-visible');
    if (toastTimeout) window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 3000);
  }

  function render(state: GameState): void {
    const level = getLevel(state);
    const goal = nextGoal(state.lifetimeCash);
    const progress = Math.min(100, Math.max(0, ((state.lifetimeCash - goal.previous) / (goal.amount - goal.previous)) * 100));
    refs.cash.textContent = formatCash(state.cash);
    refs.level.textContent = `Lv ${level}`;
    refs.rate.textContent = `${formatCash(getProductionPerSecond(state))} / sec`;
    refs.next.textContent = goal.name;
    refs.progress.textContent = `${formatCash(state.lifetimeCash)} / ${formatCash(goal.amount)} earned`;
    refs.progressFill.style.width = `${progress}%`;
    refs.tapValue.textContent = `+${formatCash(getTapValue(state))} per play`;
    refs.scene.dataset.stage = String(getStage(state));
    refs.scene.dataset.autoStars = String(state.autoPlayerStars);
    for (const id of PRODUCER_ORDER) {
      const machine = refs.scene.querySelector<HTMLElement>(`[data-machine="${id}"]`);
      machine?.classList.toggle('is-active', state.owned[id] > 0);
      updateProducerCard(refs.producerCards[id], id, state);
    }
    const activeCount = PRODUCER_ORDER.filter((id) => state.owned[id] > 0).length;
    const status = refs.scene.querySelector('.arcade-status-text');
    if (status) status.textContent = state.autoPlayerStars > 0
      ? `Auto Player on · ${getAutoClicksPerSecond(state)} plays/sec`
      : activeCount > 0 ? `${activeCount} machine types running` : 'Your first machine is waiting';
    updateAutoCard(refs.autoCard, state);
    for (const id of UPGRADE_ORDER) updateUpgradeCard(refs.upgradeCards[id], id, state);
    refs.soundButton.textContent = state.soundEnabled ? '♪ Sound on' : '♪ Sound off';
    refs.soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
    refs.motionButton.textContent = state.reducedMotion ? '✧ Motion reduced' : '✧ Motion on';
    refs.motionButton.setAttribute('aria-pressed', String(state.reducedMotion));
    refs.resetButton.textContent = '↺ Reset save';
    document.documentElement.classList.toggle('reduced-motion', state.reducedMotion);
    if (previousLevel >= 0 && level > previousLevel) {
      refs.milestoneTitle.textContent = level === 3 ? 'Auto Player unlocked!' : 'Level up!';
      refs.milestoneText.textContent = level === 3 ? 'Your free Common helper plays for you.'
        : level === 4 ? 'Epic machines are now available.'
          : level === 5 ? 'Legendary machines are now available.' : 'Your arcade is growing.';
      refs.milestone.classList.add('is-visible');
      window.setTimeout(() => refs.milestone.classList.remove('is-visible'), 4200);
    }
    previousLevel = level;
  }

  function showOffline(earned: number, elapsedMs: number): void {
    if (earned > 0 && elapsedMs >= 1000) showToast(`While you were away · +${formatCash(earned)} over ${formatDuration(elapsedMs)}`);
  }

  return { render, showOffline };
}
