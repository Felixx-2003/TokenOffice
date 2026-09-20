import {
  PRODUCERS,
  UPGRADES,
  AUTO_RARITIES,
  MAX_AUTO_STARS,
  canBuyAutoUpgrade,
  canBuyProducer,
  canBuyUpgrade,
  getProducerCost,
  getProductionPerSecond,
  getAutoClicksPerSecond,
  getAutoRarity,
  getAutoUpgradeCost,
  getLevel,
  getStage,
  getTapValue,
  type GameState,
  type ProducerId,
  type UpgradeId,
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

type UIRefs = {
  bloom: HTMLElement;
  level: HTMLElement;
  rate: HTMLElement;
  next: HTMLElement;
  progress: HTMLElement;
  progressFill: HTMLElement;
  island: HTMLElement;
  islandGlow: HTMLElement;
  tapButton: HTMLButtonElement;
  tapValue: HTMLElement;
  producerCards: Record<ProducerId, ProducerCardRefs>;
  autoCard: AutoCardRefs;
  upgradeCards: Record<UpgradeId, UpgradeCardRefs>;
  soundButton: HTMLButtonElement;
  motionButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  toast: HTMLElement;
  toastText: HTMLElement;
  milestone: HTMLElement;
  milestoneTitle: HTMLElement;
  milestoneText: HTMLElement;
};

const PRODUCER_ORDER: ProducerId[] = ['flower', 'beehive', 'tree'];
const UPGRADE_ORDER: UpgradeId[] = ['betterTools', 'wateringCan', 'pollination'];
const MILESTONES = [25, 100, 300, 3000];
const GOAL_NAMES = ['First sprouts', 'Free Auto Harvester', 'New garden patch', 'Full grove'];
const PRODUCER_METADATA = Object.fromEntries(PRODUCERS.map((meta) => [meta.id, meta])) as Record<ProducerId, (typeof PRODUCERS)[number]>;
const UPGRADE_METADATA = Object.fromEntries(UPGRADES.map((meta) => [meta.id, meta])) as Record<UpgradeId, (typeof UPGRADES)[number]>;

type ProducerCardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  count: HTMLElement;
  detail: HTMLElement;
  cost: HTMLElement;
  indicator: HTMLElement;
};

type UpgradeCardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  checkmark: HTMLElement;
  cost: HTMLElement;
  indicator: HTMLElement;
};

type AutoCardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  name: HTMLElement;
  stars: HTMLElement;
  detail: HTMLElement;
  cost: HTMLElement;
  indicator: HTMLElement;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value > 0 && value < 1) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (value < 10) return value.toFixed(1).replace(/\.0$/, '');
  if (value < 1000) return Math.floor(value).toLocaleString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
}

function formatCash(value: number): string {
  return `$${formatNumber(value)}`;
}

function nextGoal(lifetime: number): { amount: number; previous: number; name: string } {
  let previous = 0;
  for (let index = 0; index < MILESTONES.length; index++) {
    const amount = MILESTONES[index];
    if (lifetime < amount) return { amount, previous, name: GOAL_NAMES[index] };
    previous = amount;
  }
  let amount = 6_000;
  while (amount <= lifetime) {
    previous = amount;
    amount *= 2;
  }
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

function createIcon(kind: string): string {
  if (kind === 'flower') return '✿';
  if (kind === 'beehive') return '◉';
  if (kind === 'tree') return '♣';
  if (kind === 'betterTools') return '✦';
  if (kind === 'wateringCan') return '⌁';
  return '✧';
}

function stageDescription(stage: number): string {
  return [
    'A little care can wake this island.',
    'The first patch is taking root.',
    'Your grove is humming with life.',
    'A thriving refuge among the clouds.',
  ][Math.min(3, Math.max(0, stage))] ?? '';
}

function makeGardenScene(): HTMLElement {
  const scene = element('div', 'garden-scene');
  scene.setAttribute('aria-label', 'Illustration of your floating garden');
  scene.innerHTML = `
    <div class="sky-orb orb-one" aria-hidden="true"></div>
    <div class="sky-orb orb-two" aria-hidden="true"></div>
    <div class="cloud cloud-one" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="cloud cloud-two" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="garden-stars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="island island-back" aria-hidden="true"></div>
    <div class="island island-main" aria-hidden="true"><span class="island-face"></span></div>
    <div class="island island-shadow" aria-hidden="true"></div>
    <div class="garden-growth growth-grass" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="garden-growth growth-flowers" aria-hidden="true"><i>✿</i><i>✿</i><i>✿</i><i>✿</i><i>✿</i></div>
    <div class="garden-growth growth-bees" aria-hidden="true"><i>•</i><i>•</i></div>
    <div class="garden-growth growth-trees" aria-hidden="true"><i></i><i></i></div>
    <div class="seed-pedestal" aria-hidden="true"><span class="seed-spark spark-one">✦</span><span class="seed-spark spark-two">✧</span><div class="seed">⌁</div></div>
    <div class="garden-label"><span class="garden-label-dot"></span><span class="garden-label-text">A quiet place to grow</span></div>
  `;
  return scene;
}

function buildRefs(root: HTMLElement, actions: UIActions): UIRefs {
  root.innerHTML = '';
  root.className = 'app-shell';

  const app = element('div', 'app');
  const topbar = element('header', 'topbar');
  topbar.innerHTML = `<a class="brand" href="#main" aria-label="Pocket Grove home"><span class="brand-mark">✿</span><span>Pocket <b>Grove</b></span></a>`;

  const main = element('main', 'main-layout');
  main.id = 'main';
  const left = element('section', 'garden-panel');
  const title = element('p', 'instruction');
  title.textContent = 'Press Space anywhere or click Harvest to earn Cash. Buy plants for automatic income, then upgrade them.';
  const sceneWrap = element('div', 'scene-wrap');
  sceneWrap.appendChild(makeGardenScene());
  const island = sceneWrap.querySelector('.garden-scene') as HTMLElement;
  const islandGlow = sceneWrap.querySelector('.island-main') as HTMLElement;
  left.append(title, sceneWrap);

  const actionArea = element('div', 'action-area');
  const tapButton = element('button', 'tap-button');
  tapButton.type = 'button';
  tapButton.innerHTML = `<span class="tap-button-shine" aria-hidden="true"></span><span class="tap-button-icon" aria-hidden="true">✦</span><span class="tap-button-label">Harvest</span><span class="tap-button-hint">+$1 per harvest</span>`;
  tapButton.addEventListener('click', () => actions.onTap());
  const tapValue = tapButton.querySelector('.tap-button-hint') as HTMLElement;
  const summary = element('section', 'summary-card');
  summary.setAttribute('aria-label', 'Garden progress');
  summary.innerHTML = `<div class="bloom-row"><span class="bloom-icon">$</span><strong class="bloom-value">$0</strong><span class="bloom-label">Cash</span><span class="rate-value">$0 / sec</span></div><div class="goal-row"><span><b class="level-value">Lv 1</b> · Next: <strong class="next-value">First sprouts</strong></span><span class="progress-text">$0 / $25</span></div><div class="progress-track"><span class="progress-fill"></span></div>`;
  actionArea.append(tapButton, summary);
  left.appendChild(actionArea);

  const right = element('aside', 'control-panel');
  const shop = element('section', 'shop-section');
  shop.innerHTML = `<div class="section-heading"><h2>Shop</h2></div>`;
  const producerList = element('div', 'card-list');
  const upgradeList = element('div', 'card-list upgrades-list');
  const producerCards = Object.fromEntries(PRODUCER_ORDER.map((id) => {
    const refs = makeProducerCard(id, actions);
    producerList.appendChild(refs.card);
    return [id, refs];
  })) as Record<ProducerId, ProducerCardRefs>;
  const upgradeCards = Object.fromEntries(UPGRADE_ORDER.map((id) => {
    const refs = makeUpgradeCard(id, actions);
    upgradeList.appendChild(refs.card);
    return [id, refs];
  })) as Record<UpgradeId, UpgradeCardRefs>;
  const autoCard = makeAutoCard(actions);
  const upgradesHeading = element('div', 'subsection-heading');
  upgradesHeading.textContent = 'Upgrades';
  shop.append(producerList, autoCard.card, upgradesHeading, upgradeList);

  const footer = element('footer', 'settings');
  const soundButton = element('button', 'setting-button');
  const motionButton = element('button', 'setting-button');
  const resetButton = element('button', 'reset-button');
  soundButton.type = motionButton.type = resetButton.type = 'button';
  soundButton.addEventListener('click', () => actions.onToggleSound());
  motionButton.addEventListener('click', () => actions.onToggleReducedMotion());
  resetButton.addEventListener('click', () => actions.onReset());
  footer.append(soundButton, motionButton, resetButton);
  right.append(shop, footer);

  const toast = element('div', 'toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  const toastText = element('span');
  toast.append(toastText);
  const milestone = element('div', 'milestone-modal');
  milestone.setAttribute('role', 'status');
  const milestoneTitle = element('strong');
  const milestoneText = element('span');
  milestone.append(milestoneTitle, milestoneText);

  main.append(left, right);
  app.append(topbar, main, toast, milestone);
  root.appendChild(app);
  return {
    bloom: summary.querySelector('.bloom-value') as HTMLElement,
    level: summary.querySelector('.level-value') as HTMLElement,
    rate: summary.querySelector('.rate-value') as HTMLElement,
    next: summary.querySelector('.next-value') as HTMLElement,
    progress: summary.querySelector('.progress-text') as HTMLElement,
    progressFill: summary.querySelector('.progress-fill') as HTMLElement,
    island,
    islandGlow,
    tapButton,
    tapValue,
    producerCards,
    autoCard,
    upgradeCards,
    soundButton,
    motionButton,
    resetButton,
    toast,
    toastText,
    milestone,
    milestoneTitle,
    milestoneText,
  };
}

function makeProducerCard(id: ProducerId, actions: UIActions): ProducerCardRefs {
  const meta = PRODUCER_METADATA[id];
  const card = element('article', 'shop-card producer-card');
  const button = element('button', 'shop-buy');
  button.type = 'button';
  button.dataset.shopId = `producer-${id}`;
  button.addEventListener('click', () => actions.onBuyProducer(id));
  button.innerHTML = `<span class="card-icon icon-${id}">${createIcon(id)}</span><span class="card-body"><strong>${meta.name}</strong><small class="card-detail"></small></span><span class="card-side"><b class="card-count">0</b><span class="card-cost"></span><span class="purchase-indicator" aria-hidden="true"></span></span>`;
  card.appendChild(button);
  return {
    card,
    button,
    count: button.querySelector('.card-count') as HTMLElement,
    detail: button.querySelector('.card-detail') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
    indicator: button.querySelector('.purchase-indicator') as HTMLElement,
  };
}

function makeUpgradeCard(id: UpgradeId, actions: UIActions): UpgradeCardRefs {
  const meta = UPGRADE_METADATA[id];
  const card = element('article', 'shop-card upgrade-card');
  const button = element('button', 'shop-buy');
  button.type = 'button';
  button.dataset.shopId = `upgrade-${id}`;
  button.addEventListener('click', () => actions.onBuyUpgrade(id));
  button.innerHTML = `<span class="card-icon icon-upgrade">${createIcon(id)}</span><span class="card-body"><strong>${meta.name}</strong><span>${meta.description}</span></span><span class="card-side"><b class="checkmark"></b><span class="card-cost"></span><span class="purchase-indicator" aria-hidden="true"></span></span>`;
  card.appendChild(button);
  return {
    card,
    button,
    checkmark: button.querySelector('.checkmark') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
    indicator: button.querySelector('.purchase-indicator') as HTMLElement,
  };
}

function makeAutoCard(actions: UIActions): AutoCardRefs {
  const card = element('article', 'shop-card auto-card');
  const button = element('button', 'shop-buy');
  button.type = 'button';
  button.addEventListener('click', () => actions.onBuyAutoUpgrade());
  button.innerHTML = `<span class="card-icon icon-auto" aria-hidden="true">↻</span><span class="card-body"><strong class="auto-name">Auto Harvester</strong><small class="auto-stars">☆☆☆☆</small><small class="auto-detail">Free at Level 3</small></span><span class="card-side"><span class="card-cost"></span><span class="purchase-indicator" aria-hidden="true"></span></span>`;
  card.appendChild(button);
  return {
    card,
    button,
    name: button.querySelector('.auto-name') as HTMLElement,
    stars: button.querySelector('.auto-stars') as HTMLElement,
    detail: button.querySelector('.auto-detail') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
    indicator: button.querySelector('.purchase-indicator') as HTMLElement,
  };
}

function updateProducerCard(refs: ProducerCardRefs, id: ProducerId, state: GameState): void {
  const meta = PRODUCER_METADATA[id];
  const owned = state.owned[id] ?? 0;
  const cost = getProducerCost(state, id);
  const affordable = canBuyProducer(state, id);
  const locked = state.lifetimeBloom < meta.unlockAt;
  refs.card.classList.toggle('is-locked', locked);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !locked && !affordable);
  refs.button.disabled = locked || !affordable;
  refs.button.setAttribute('aria-label', locked ? `${meta.name} unlocks after earning ${formatCash(meta.unlockAt)} total` : affordable ? `Buy ${meta.name} for ${formatCash(cost)}` : `Not enough Cash for ${meta.name}, costs ${formatCash(cost)}`);
  refs.count.textContent = String(owned);
  refs.detail.textContent = locked ? `Unlocks at ${formatCash(meta.unlockAt)} earned` : `+${formatCash(meta.rate)} / sec`;
  refs.cost.textContent = locked ? 'Locked' : formatCash(cost);
  refs.indicator.textContent = affordable ? '↑' : '';
}

function updateUpgradeCard(refs: UpgradeCardRefs, id: UpgradeId, state: GameState): void {
  const meta = UPGRADE_METADATA[id];
  const purchased = state.upgrades[id] === true;
  const affordable = !purchased && canBuyUpgrade(state, id);
  refs.card.classList.toggle('is-owned', purchased);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !purchased && !affordable);
  refs.button.disabled = purchased || !affordable;
  refs.button.setAttribute('aria-label', purchased ? `${meta.name} purchased` : affordable ? `Buy ${meta.name} for ${formatCash(meta.cost)}` : `Not enough Cash for ${meta.name}, costs ${formatCash(meta.cost)}`);
  refs.checkmark.textContent = purchased ? '✓' : '';
  refs.cost.textContent = purchased ? 'Owned' : formatCash(meta.cost);
  refs.indicator.textContent = affordable ? '↑' : '';
}

function updateAutoCard(refs: AutoCardRefs, state: GameState): void {
  const stars = Math.min(MAX_AUTO_STARS, state.autoHarvesterStars);
  const locked = stars === 0;
  const maxed = stars === MAX_AUTO_STARS;
  const rarity = getAutoRarity(state);
  const nextRarity = AUTO_RARITIES[Math.min(MAX_AUTO_STARS, stars + 1)];
  const affordable = canBuyAutoUpgrade(state);
  const cost = getAutoUpgradeCost(state);
  const clicksPerSecond = getAutoClicksPerSecond(state);
  const nextClicksPerSecond = getAutoClicksPerSecond({ ...state, autoHarvesterStars: Math.min(MAX_AUTO_STARS, stars + 1) });
  refs.card.classList.toggle('is-locked', locked);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.card.classList.toggle('is-unaffordable', !locked && !maxed && !affordable);
  refs.card.classList.toggle('rarity-common', rarity === 'Common');
  refs.card.classList.toggle('rarity-rare', rarity === 'Rare');
  refs.card.classList.toggle('rarity-epic', rarity === 'Epic');
  refs.card.classList.toggle('rarity-legendary', rarity === 'Legendary');
  refs.button.disabled = locked || maxed || !affordable;
  refs.button.setAttribute('aria-label', locked
    ? 'Auto Harvester unlocks free at Level 3, after earning $100 total'
    : maxed
      ? 'Legendary Auto Harvester, four stars, maximum tier'
      : affordable
        ? `Upgrade Auto Harvester to ${nextRarity}, ${stars + 1} stars for ${formatCash(cost)}`
        : `Not enough Cash for ${nextRarity} Auto Harvester, costs ${formatCash(cost)}`);
  refs.name.textContent = 'Auto Harvester';
  refs.stars.textContent = `${locked ? 'Locked' : rarity} · ${'★'.repeat(stars)}${'☆'.repeat(MAX_AUTO_STARS - stars)}`;
  refs.detail.textContent = locked
    ? 'Free at Level 3 · $100 earned'
    : maxed
      ? `${clicksPerSecond} auto clicks/sec · max tier`
      : `${clicksPerSecond}/sec → ${nextRarity} ${nextClicksPerSecond}/sec`;
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
    const production = getProductionPerSecond(state);
    const tap = getTapValue(state);
    const stage = getStage(state);
    const level = getLevel(state);
    const goal = nextGoal(state.lifetimeBloom);
    const progress = Math.min(100, Math.max(0, ((state.lifetimeBloom - goal.previous) / (goal.amount - goal.previous)) * 100));

    refs.bloom.textContent = formatCash(state.bloom);
    refs.level.textContent = level === 5 ? 'Lv 5 · Grove' : `Lv ${level}`;
    refs.rate.textContent = `${formatCash(production)} / sec`;
    refs.next.textContent = goal.name;
    refs.progress.textContent = `${formatCash(state.lifetimeBloom)} / ${formatCash(goal.amount)} earned`;
    refs.progressFill.style.width = `${progress}%`;
    refs.tapValue.textContent = `+${formatCash(tap)} per harvest`;
    refs.island.dataset.stage = String(stage);
    refs.islandGlow.dataset.stage = String(stage);
    refs.island.dataset.flowerCount = String(Math.min(3, state.owned.flower ?? 0));
    refs.island.dataset.beehiveCount = String(Math.min(3, state.owned.beehive ?? 0));
    refs.island.dataset.treeCount = String(Math.min(3, state.owned.tree ?? 0));
    refs.island.classList.toggle('is-auto', state.autoHarvesterStars > 0);
    refs.island.dataset.autoStars = String(state.autoHarvesterStars);
    refs.tapButton.classList.toggle('is-ready', state.bloom >= 1);
    // Shop cards are built once. Updating their existing nodes keeps keyboard
    // focus and screen-reader position stable while the game ticks.
    for (const id of PRODUCER_ORDER) updateProducerCard(refs.producerCards[id], id, state);
    updateAutoCard(refs.autoCard, state);
    for (const id of UPGRADE_ORDER) updateUpgradeCard(refs.upgradeCards[id], id, state);

    refs.soundButton.innerHTML = state.soundEnabled ? '<span>◖</span> Sound on' : '<span>◌</span> Sound off';
    refs.soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
    refs.soundButton.setAttribute('aria-label', state.soundEnabled ? 'Turn sound off' : 'Turn sound on');
    refs.motionButton.innerHTML = state.reducedMotion ? '<span>◌</span> Motion reduced' : '<span>✧</span> Motion on';
    refs.motionButton.setAttribute('aria-pressed', String(state.reducedMotion));
    refs.motionButton.setAttribute('aria-label', state.reducedMotion ? 'Enable motion' : 'Reduce motion');
    refs.resetButton.innerHTML = '<span>↺</span> Reset save';

    document.documentElement.classList.toggle('reduced-motion', state.reducedMotion);
    if (previousLevel >= 0 && level > previousLevel) {
      refs.milestoneTitle.textContent = level === 3 ? 'Auto Harvester unlocked!' : level === 5 ? 'Full grove reached!' : 'Level up!';
      refs.milestoneText.textContent = level === 3 ? 'Your free 1★ helper now clicks for you.' : stageDescription(stage);
      refs.milestone.classList.add('is-visible');
      window.setTimeout(() => refs.milestone.classList.remove('is-visible'), 4200);
    }
    previousLevel = level;
  }

  function showOffline(earned: number, elapsedMs: number): void {
    if (earned <= 0 || elapsedMs < 1000) return;
    showToast(`While you were away · +${formatCash(earned)} over ${formatDuration(elapsedMs)}`);
  }

  return { render, showOffline };
}
