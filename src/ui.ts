import {
  PRODUCERS,
  UPGRADES,
  canBuyProducer,
  canBuyUpgrade,
  getProducerCost,
  getProductionPerSecond,
  getStage,
  getTapValue,
  type GameState,
  type ProducerId,
  type UpgradeId,
} from './game';

export type UIActions = {
  onTap(): void;
  onBuyProducer(id: ProducerId): void;
  onBuyUpgrade(id: UpgradeId): void;
  onToggleSound(): void;
  onToggleReducedMotion(): void;
  onReset(): void;
};

type UIRefs = {
  bloom: HTMLElement;
  rate: HTMLElement;
  next: HTMLElement;
  progress: HTMLElement;
  progressFill: HTMLElement;
  stageLabel: HTMLElement;
  island: HTMLElement;
  islandGlow: HTMLElement;
  tapButton: HTMLButtonElement;
  tapValue: HTMLElement;
  producerList: HTMLElement;
  upgradeList: HTMLElement;
  producerCards: Record<ProducerId, ProducerCardRefs>;
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
const MILESTONES = [100, 500, 6000];
const PRODUCER_METADATA = Object.fromEntries(PRODUCERS.map((meta) => [meta.id, meta])) as Record<ProducerId, (typeof PRODUCERS)[number]>;
const UPGRADE_METADATA = Object.fromEntries(UPGRADES.map((meta) => [meta.id, meta])) as Record<UpgradeId, (typeof UPGRADES)[number]>;

type ProducerCardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  count: HTMLElement;
  detail: HTMLElement;
  cost: HTMLElement;
};

type UpgradeCardRefs = {
  card: HTMLElement;
  button: HTMLButtonElement;
  checkmark: HTMLElement;
  cost: HTMLElement;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 10) return value.toFixed(1).replace(/\.0$/, '');
  if (value < 1000) return Math.floor(value).toLocaleString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
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

function stageName(stage: number): string {
  return ['A sleeping seed', 'First sprouts', 'A living patch', 'Pocket Grove'][Math.min(3, Math.max(0, stage))] ?? 'A sleeping seed';
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
  topbar.innerHTML = `<a class="brand" href="#main" aria-label="Pocket Grove home"><span class="brand-mark">✿</span><span>Pocket <b>Grove</b></span></a><span class="save-note"><span class="save-dot"></span>Progress saves locally</span>`;

  const main = element('main', 'main-layout');
  main.id = 'main';
  const left = element('section', 'garden-panel');
  const title = element('div', 'hero-copy');
  title.innerHTML = `<p class="eyebrow">A tiny world, tended by you</p><h1>Make room for <em>wonder.</em></h1><p class="lede">Start with one small seed. Every touch brings this floating garden a little closer to home.</p>`;
  const sceneWrap = element('div', 'scene-wrap');
  sceneWrap.appendChild(makeGardenScene());
  const island = sceneWrap.querySelector('.garden-scene') as HTMLElement;
  const islandGlow = sceneWrap.querySelector('.island-main') as HTMLElement;
  left.append(title, sceneWrap);

  const actionArea = element('div', 'action-area');
  const tapButton = element('button', 'tap-button');
  tapButton.type = 'button';
  tapButton.innerHTML = `<span class="tap-button-shine" aria-hidden="true"></span><span class="tap-button-icon" aria-hidden="true">✦</span><span class="tap-button-label">Tend the seed</span><span class="tap-button-hint">Press Space or Enter</span>`;
  tapButton.addEventListener('click', () => actions.onTap());
  const tapValue = element('span', 'tap-value');
  actionArea.append(tapButton, tapValue);
  left.appendChild(actionArea);

  const right = element('aside', 'control-panel');
  const summary = element('section', 'summary-card');
  summary.innerHTML = `<div class="summary-heading"><span class="summary-kicker">YOUR GARDEN</span><span class="live-pill"><i></i>growing</span></div><div class="bloom-row"><span class="bloom-icon">✿</span><strong class="bloom-value">0</strong><span class="bloom-label">Bloom</span></div><div class="rate-row"><span class="rate-value">0 / sec</span><span class="rate-separator">·</span><span class="lifetime-value">0 lifetime</span></div><div class="milestone-copy"><span class="next-label">NEXT MILESTONE</span><strong class="next-value">First sprouts</strong><span class="next-detail">100 lifetime Bloom</span></div><div class="progress-track"><span class="progress-fill"></span></div><div class="progress-caption"><span class="progress-text">0 / 100 Bloom</span><span class="stage-label">A sleeping seed</span></div>`;

  const shop = element('section', 'shop-section');
  shop.innerHTML = `<div class="section-heading"><div><span class="section-kicker">NURTURE</span><h2>Ways to grow</h2></div><span class="section-note">The grove remembers</span></div>`;
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
  const upgradesHeading = element('div', 'subsection-heading');
  upgradesHeading.innerHTML = `<span>Little improvements</span><span class="line"></span>`;
  shop.append(producerList, upgradesHeading, upgradeList);

  const footer = element('footer', 'settings');
  const soundButton = element('button', 'setting-button');
  const motionButton = element('button', 'setting-button');
  const resetButton = element('button', 'reset-button');
  soundButton.type = motionButton.type = resetButton.type = 'button';
  soundButton.addEventListener('click', () => actions.onToggleSound());
  motionButton.addEventListener('click', () => actions.onToggleReducedMotion());
  resetButton.addEventListener('click', () => actions.onReset());
  footer.append(soundButton, motionButton, resetButton);
  right.append(summary, shop, footer);

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
    rate: summary.querySelector('.rate-value') as HTMLElement,
    next: summary.querySelector('.next-value') as HTMLElement,
    progress: summary.querySelector('.progress-text') as HTMLElement,
    progressFill: summary.querySelector('.progress-fill') as HTMLElement,
    stageLabel: summary.querySelector('.stage-label') as HTMLElement,
    island,
    islandGlow,
    tapButton,
    tapValue,
    producerList,
    upgradeList,
    producerCards,
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
  button.innerHTML = `<span class="card-icon icon-${id}">${createIcon(id)}</span><span class="card-body"><strong>${meta.name}</strong><span>${meta.description}</span><small class="card-detail"></small></span><span class="card-side"><b class="card-count">0</b><span class="card-cost"></span></span></button>`;
  card.appendChild(button);
  return {
    card,
    button,
    count: button.querySelector('.card-count') as HTMLElement,
    detail: button.querySelector('.card-detail') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
  };
}

function makeUpgradeCard(id: UpgradeId, actions: UIActions): UpgradeCardRefs {
  const meta = UPGRADE_METADATA[id];
  const card = element('article', 'shop-card upgrade-card');
  const button = element('button', 'shop-buy');
  button.type = 'button';
  button.dataset.shopId = `upgrade-${id}`;
  button.addEventListener('click', () => actions.onBuyUpgrade(id));
  button.innerHTML = `<span class="card-icon icon-upgrade">${createIcon(id)}</span><span class="card-body"><strong>${meta.name}</strong><span>${meta.description}</span></span><span class="card-side"><b class="checkmark">✦</b><span class="card-cost"></span></span></button>`;
  card.appendChild(button);
  return {
    card,
    button,
    checkmark: button.querySelector('.checkmark') as HTMLElement,
    cost: button.querySelector('.card-cost') as HTMLElement,
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
  refs.button.disabled = locked || !affordable;
  refs.button.setAttribute('aria-label', locked ? `${meta.name} locked` : `Buy ${meta.name} for ${formatNumber(cost)} Bloom`);
  refs.count.textContent = String(owned);
  refs.detail.textContent = locked ? `Unlocks at ${formatNumber(meta.unlockAt)} lifetime Bloom` : `+${formatNumber(meta.rate)} Bloom / sec`;
  refs.cost.textContent = locked ? 'locked' : `${formatNumber(cost)} ✿`;
}

function updateUpgradeCard(refs: UpgradeCardRefs, id: UpgradeId, state: GameState): void {
  const meta = UPGRADE_METADATA[id];
  const purchased = state.upgrades[id] === true;
  const affordable = !purchased && canBuyUpgrade(state, id);
  refs.card.classList.toggle('is-owned', purchased);
  refs.card.classList.toggle('is-affordable', affordable);
  refs.button.disabled = purchased || !affordable;
  refs.button.setAttribute('aria-label', purchased ? `${meta.name} purchased` : `Buy ${meta.name} for ${formatNumber(meta.cost)} Bloom`);
  refs.checkmark.textContent = purchased ? '✓' : '✦';
  refs.cost.textContent = purchased ? 'ready' : `${formatNumber(meta.cost)} ✿`;
}

export function createUI(root: HTMLElement, actions: UIActions): { render(state: GameState): void; showOffline(earned: number, elapsedMs: number): void } {
  const refs = buildRefs(root, actions);
  let previousStage = -1;
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
    const nextMilestone = MILESTONES.find((milestone) => state.lifetimeBloom < milestone);
    const previousMilestone = MILESTONES[MILESTONES.indexOf(nextMilestone ?? 6000) - 1] ?? 0;
    const target = nextMilestone ?? Math.max(6000, state.lifetimeBloom);
    const progress = nextMilestone ? Math.min(100, Math.max(0, ((state.lifetimeBloom - previousMilestone) / (target - previousMilestone)) * 100)) : 100;

    refs.bloom.textContent = formatNumber(state.bloom);
    refs.rate.textContent = `${formatNumber(production)} / sec`;
    const lifetime = refs.rate.parentElement?.querySelector('.lifetime-value');
    if (lifetime) lifetime.textContent = `${formatNumber(state.lifetimeBloom)} lifetime`;
    refs.next.textContent = nextMilestone ? stageName(MILESTONES.indexOf(nextMilestone) + 1) : 'Grove complete';
    const nextDetail = refs.next.parentElement?.querySelector('.next-detail');
    if (nextDetail) nextDetail.textContent = nextMilestone ? `${formatNumber(nextMilestone)} lifetime Bloom` : 'Keep tending and enjoy the quiet';
    refs.progress.textContent = nextMilestone ? `${formatNumber(state.lifetimeBloom)} / ${formatNumber(nextMilestone)} Bloom` : 'All milestones reached';
    refs.progressFill.style.width = `${progress}%`;
    refs.stageLabel.textContent = stageName(stage);
    refs.tapValue.textContent = `+${formatNumber(tap)} Bloom per tend`;
    refs.island.dataset.stage = String(stage);
    refs.islandGlow.dataset.stage = String(stage);
    refs.island.dataset.flowerCount = String(Math.min(3, state.owned.flower ?? 0));
    refs.island.dataset.beehiveCount = String(Math.min(3, state.owned.beehive ?? 0));
    refs.island.dataset.treeCount = String(Math.min(3, state.owned.tree ?? 0));
    refs.tapButton.classList.toggle('is-ready', state.bloom >= 1);
    // Shop cards are built once. Updating their existing nodes keeps keyboard
    // focus and screen-reader position stable while the game ticks.
    for (const id of PRODUCER_ORDER) updateProducerCard(refs.producerCards[id], id, state);
    for (const id of UPGRADE_ORDER) updateUpgradeCard(refs.upgradeCards[id], id, state);

    refs.soundButton.innerHTML = state.soundEnabled ? '<span>◖</span> Sound on' : '<span>◌</span> Sound off';
    refs.soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
    refs.soundButton.setAttribute('aria-label', state.soundEnabled ? 'Turn sound off' : 'Turn sound on');
    refs.motionButton.innerHTML = state.reducedMotion ? '<span>◌</span> Motion reduced' : '<span>✧</span> Motion on';
    refs.motionButton.setAttribute('aria-pressed', String(state.reducedMotion));
    refs.motionButton.setAttribute('aria-label', state.reducedMotion ? 'Enable motion' : 'Reduce motion');
    refs.resetButton.innerHTML = '<span>↺</span> Reset save';

    document.documentElement.classList.toggle('reduced-motion', state.reducedMotion);
    if (previousStage >= 0 && stage > previousStage) {
      refs.milestoneTitle.textContent = stage === 3 ? 'The grove is awake' : 'A new patch is growing';
      refs.milestoneText.textContent = stageDescription(stage);
      refs.milestone.classList.add('is-visible');
      window.setTimeout(() => refs.milestone.classList.remove('is-visible'), 4200);
    }
    previousStage = stage;
  }

  function showOffline(earned: number, elapsedMs: number): void {
    if (earned <= 0 || elapsedMs < 1000) return;
    showToast(`While you were away · +${formatNumber(earned)} Bloom over ${formatDuration(elapsedMs)}`);
  }

  return { render, showOffline };
}
