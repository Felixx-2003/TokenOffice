import './style.css';
import {
  CALIBRATION_COSTS, FOLD_UNLOCK, OVERCLOCK_COSTS, SYSTEMS, SYSTEM_IDS,
  advanceTime, buyCalibration, buyOverclock, buySystem, createInitialState, fold,
  getEchoMultiplier, getFoldGain, getGlobalMultiplier, getNextObjective, getProduction,
  getPurchase, getSystemRate, getTuneValue, getUnitCost, isStageCleared, setBuyMode, tune,
  type BuyMode, type GameState, type SystemId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool(tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema: object;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute(input: unknown): unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app');

const fmt = (value: number): string => {
  if (!Number.isFinite(value)) return '—';
  if (value < 1_000) return value < 10 && value % 1 !== 0 ? value.toFixed(1) : Math.floor(value).toLocaleString();
  const units: Array<[number, string]> = [[1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [scale, suffix] = units.find(([scale]) => value >= scale) ?? [1, ''];
  const scaled = value / scale;
  return `${scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : Math.floor(scaled)}${suffix}`;
};

const costText = (value: number): string => Number.isFinite(value) ? `${fmt(value)} Flux` : 'MAXED';

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <span class="stage-tag">STAGE 02</span>
        <div class="brand"><span>SIGNAL</span> FOUNDRY</div>
      </div>
      <div class="resource-block" aria-live="polite">
        <span class="resource-kicker">AVAILABLE FLUX</span>
        <strong id="fluxValue">0</strong>
        <span id="rateValue">+0 / sec</span>
      </div>
      <div class="top-actions">
        <a class="stage-link" href="/">← STAGE 1</a>
        <button id="soundButton" class="icon-button" type="button" aria-label="Toggle sound">SOUND ON</button>
        <button id="resetButton" class="icon-button danger" type="button">RESET</button>
      </div>
    </header>

    <main class="game-grid">
      <section class="core-column" aria-label="Signal tuning controls">
        <div class="mission-strip">
          <span class="mission-index">ACTIVE DIRECTIVE</span>
          <strong id="objectiveLabel">Deploy a Pocket Antenna</strong>
          <span id="objectiveCount">0 / 12</span>
          <div class="mission-track"><i id="objectiveFill"></i></div>
        </div>

        <div id="coreChamber" class="core-chamber">
          <div class="stars" aria-hidden="true"></div>
          <div class="scanner-lines" aria-hidden="true"></div>
          <div class="core-readout top-left"><span>CARRIER</span><b>47.9 THz</b></div>
          <div class="core-readout top-right"><span>NOISE FLOOR</span><b>−82 dB</b></div>
          <button id="tuneButton" class="signal-core" type="button" aria-label="Tune signal and collect Flux">
            <span class="orbit orbit-one" aria-hidden="true"><i></i></span>
            <span class="orbit orbit-two" aria-hidden="true"><i></i></span>
            <span class="core-disc"><i></i><b>TUNE</b><small>SPACE</small></span>
          </button>
          <div class="waveform" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="tune-yield"><span>MANUAL YIELD</span><strong id="tuneValue">+1 Flux</strong></div>
          <div class="surge-badge" id="surgeBadge">RESONANCE ×3</div>
        </div>

        <section class="resonance-panel">
          <div class="resonance-copy">
            <span>RESONANCE CHARGE</span>
            <strong id="resonanceText">0%</strong>
          </div>
          <div class="resonance-track"><i id="resonanceFill"></i></div>
          <p id="resonanceHint">Tune manually to charge. Full charge triples all output for 12 seconds.</p>
        </section>

        <div class="upgrade-row">
          <button id="calibrationButton" class="upgrade-card" type="button">
            <span class="upgrade-icon">⌖</span>
            <span><small>MANUAL SYSTEM</small><strong>Calibration <i id="calibrationLevel">0</i></strong><em>Stronger tuning pulse</em></span>
            <b id="calibrationCost">80 Flux</b>
          </button>
          <button id="overclockButton" class="upgrade-card" type="button">
            <span class="upgrade-icon">↯</span>
            <span><small>FLEET SYSTEM</small><strong>Overclock <i id="overclockLevel">0</i></strong><em>Double all output</em></span>
            <b id="overclockCost">2.5K Flux</b>
          </button>
        </div>
      </section>

      <aside class="fleet-column" aria-label="Relay fleet">
        <div class="fleet-heading">
          <div><span>DEEP-SPACE NETWORK</span><h1>Relay fleet</h1></div>
          <div class="buy-modes" role="group" aria-label="Purchase quantity">
            <button type="button" data-mode="1" class="active">×1</button>
            <button type="button" data-mode="10">×10</button>
            <button type="button" data-mode="max">MAX</button>
          </div>
        </div>
        <div id="systemList" class="system-list"></div>

        <section class="fold-panel">
          <div class="fold-topline"><span>REALITY FOLD</span><b id="echoCount">0 ECHOES</b></div>
          <div class="fold-body">
            <div class="echo-mark" aria-hidden="true"><i></i><i></i></div>
            <div><strong id="foldTitle">Signal too weak</strong><p id="foldDescription">Reach 1M run Flux to compress this network into permanent power.</p></div>
            <button id="foldButton" type="button"><span>FOLD</span><b id="foldGain">+0</b></button>
          </div>
          <div class="fold-stats"><span>Echo multiplier <b id="echoMultiplier">×1.00</b></span><span>Completed folds <b id="foldCount">0</b></span></div>
        </section>
      </aside>
    </main>

    <footer class="statusbar">
      <span><i class="live-dot"></i> FOUNDRY ONLINE</span>
      <span id="runStat">RUN FLUX 0</span>
      <span id="networkStat">0 SYSTEMS</span>
      <span id="multiplierStat">×1.00 OUTPUT</span>
    </footer>
  </div>
  <div id="toast" class="toast" role="status"></div>
  <div id="victory" class="victory" aria-hidden="true">
    <div class="victory-rings" aria-hidden="true"><i></i><i></i><i></i></div>
    <span>STAGE 02 COMPLETE</span>
    <h2>The signal<br>answers back.</h2>
    <p>You stabilized the Horizon Loom and turned silence into a permanent network.</p>
    <strong id="victoryStat">0 lifetime Flux</strong>
    <button id="continueButton" type="button">RETURN TO FOUNDRY</button>
  </div>
`;

type SystemRefs = {
  button: HTMLButtonElement;
  owned: HTMLElement;
  rate: HTMLElement;
  buy: HTMLElement;
  cost: HTMLElement;
  meter: HTMLElement;
};

const systemList = root.querySelector<HTMLElement>('#systemList')!;
const systemRefs = Object.fromEntries(SYSTEMS.map((system, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'system-card';
  button.dataset.system = system.id;
  button.style.setProperty('--system-color', system.color);
  button.innerHTML = `
    <span class="system-order">0${index + 1}</span>
    <span class="system-symbol" aria-hidden="true"><i></i><b>${system.code.slice(0, 3)}</b></span>
    <span class="system-copy"><small>${system.code}</small><strong>${system.name}</strong><em>${system.description}</em></span>
    <span class="system-output"><b class="system-owned">0</b><small class="system-rate">+0 / sec</small></span>
    <span class="system-buy"><small class="system-buy-label">BUY ×1</small><b class="system-cost">${costText(system.baseCost)}</b></span>
    <span class="system-meter"><i></i></span>
  `;
  systemList.append(button);
  const refs: SystemRefs = {
    button,
    owned: button.querySelector('.system-owned')!,
    rate: button.querySelector('.system-rate')!,
    buy: button.querySelector('.system-buy-label')!,
    cost: button.querySelector('.system-cost')!,
    meter: button.querySelector('.system-meter i')!,
  };
  return [system.id, refs];
})) as Record<SystemId, SystemRefs>;

const byId = <T extends HTMLElement>(id: string): T => root.querySelector<T>(`#${id}`)!;
const refs = {
  fluxValue: byId<HTMLElement>('fluxValue'), rateValue: byId<HTMLElement>('rateValue'), objectiveLabel: byId<HTMLElement>('objectiveLabel'),
  objectiveCount: byId<HTMLElement>('objectiveCount'), objectiveFill: byId<HTMLElement>('objectiveFill'), coreChamber: byId<HTMLElement>('coreChamber'),
  tuneButton: byId<HTMLButtonElement>('tuneButton'), tuneValue: byId<HTMLElement>('tuneValue'), surgeBadge: byId<HTMLElement>('surgeBadge'),
  resonanceText: byId<HTMLElement>('resonanceText'), resonanceFill: byId<HTMLElement>('resonanceFill'), resonanceHint: byId<HTMLElement>('resonanceHint'),
  calibrationButton: byId<HTMLButtonElement>('calibrationButton'), calibrationLevel: byId<HTMLElement>('calibrationLevel'), calibrationCost: byId<HTMLElement>('calibrationCost'),
  overclockButton: byId<HTMLButtonElement>('overclockButton'), overclockLevel: byId<HTMLElement>('overclockLevel'), overclockCost: byId<HTMLElement>('overclockCost'),
  echoCount: byId<HTMLElement>('echoCount'), foldTitle: byId<HTMLElement>('foldTitle'), foldDescription: byId<HTMLElement>('foldDescription'),
  foldButton: byId<HTMLButtonElement>('foldButton'), foldGain: byId<HTMLElement>('foldGain'), echoMultiplier: byId<HTMLElement>('echoMultiplier'),
  foldCount: byId<HTMLElement>('foldCount'), runStat: byId<HTMLElement>('runStat'), networkStat: byId<HTMLElement>('networkStat'),
  multiplierStat: byId<HTMLElement>('multiplierStat'), soundButton: byId<HTMLButtonElement>('soundButton'), resetButton: byId<HTMLButtonElement>('resetButton'),
  toast: document.querySelector<HTMLElement>('#toast')!, victory: document.querySelector<HTMLElement>('#victory')!,
  victoryStat: document.querySelector<HTMLElement>('#victoryStat')!, continueButton: document.querySelector<HTMLButtonElement>('#continueButton')!,
};

let state = loadGame();
const offline = advanceTime(state, Date.now());
state = offline.state;
let toastTimer = 0;
let victoryDismissed = false;
let audioContext: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (!state.soundEnabled) return undefined;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch { return undefined; }
}

function tone(frequency: number, duration = 0.09, volume = 0.03, delay = 0): void {
  const context = audio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function showToast(message: string): void {
  refs.toast.textContent = message;
  refs.toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => refs.toast.classList.remove('visible'), 2_300);
}

function pulseGain(amount: number): void {
  const gain = document.createElement('span');
  gain.className = 'flux-pop';
  gain.textContent = `+${fmt(amount)}`;
  gain.style.setProperty('--drift', `${(Math.random() - 0.5) * 90}px`);
  refs.coreChamber.append(gain);
  window.setTimeout(() => gain.remove(), 900);
}

function apply(next: GameState, note = 0): boolean {
  if (next === state) return false;
  const cleared = isStageCleared(state);
  state = next;
  render();
  saveGame(state);
  if (note) tone(note);
  if (!cleared && isStageCleared(state)) {
    victoryDismissed = false;
    [220, 330, 440, 660, 880].forEach((frequency, index) => tone(frequency, 0.45, 0.04, index * 0.08));
  }
  return true;
}

function doTune(): void {
  const result = tune(state, Date.now());
  apply(result.state, result.surged ? 880 : 420 + Math.random() * 60);
  pulseGain(result.earned);
  refs.tuneButton.classList.remove('ping');
  void refs.tuneButton.offsetWidth;
  refs.tuneButton.classList.add('ping');
  if (result.surged) showToast('Resonance locked — all output ×3 for 12 seconds');
}

function render(): void {
  const now = Date.now();
  const production = getProduction(state, now);
  const activeSurge = now < state.resonanceUntil;
  const totalSystems = SYSTEM_IDS.reduce((sum, id) => sum + state.systems[id], 0);
  refs.fluxValue.textContent = fmt(state.flux);
  refs.rateValue.textContent = `+${fmt(production)} / sec`;
  refs.tuneValue.textContent = `+${fmt(getTuneValue(state, now))} Flux`;
  refs.resonanceText.textContent = activeSurge ? `${Math.max(0, (state.resonanceUntil - now) / 1000).toFixed(1)}s` : `${Math.floor(state.resonance)}%`;
  refs.resonanceFill.style.width = activeSurge ? `${((state.resonanceUntil - now) / 12_000) * 100}%` : `${state.resonance}%`;
  refs.resonanceHint.textContent = activeSurge ? 'Carrier phase locked. Every system is producing at triple strength.' : 'Tune manually to charge. Full charge triples all output for 12 seconds.';
  refs.coreChamber.classList.toggle('surging', activeSurge);
  refs.surgeBadge.classList.toggle('visible', activeSurge);

  const objective = getNextObjective(state);
  refs.objectiveLabel.textContent = isStageCleared(state) ? 'Stage 2 complete' : objective.label;
  refs.objectiveCount.textContent = `${fmt(Math.min(objective.value, objective.target))} / ${fmt(objective.target)}`;
  refs.objectiveFill.style.width = `${Math.min(100, objective.value / objective.target * 100)}%`;

  const calibrationCost = CALIBRATION_COSTS[state.calibration] ?? Infinity;
  refs.calibrationLevel.textContent = `${state.calibration}/${CALIBRATION_COSTS.length}`;
  refs.calibrationCost.textContent = costText(calibrationCost);
  refs.calibrationButton.disabled = !Number.isFinite(calibrationCost);
  refs.calibrationButton.classList.toggle('affordable', state.flux >= calibrationCost);
  const overclockCost = OVERCLOCK_COSTS[state.overclock] ?? Infinity;
  refs.overclockLevel.textContent = `${state.overclock}/${OVERCLOCK_COSTS.length}`;
  refs.overclockCost.textContent = costText(overclockCost);
  refs.overclockButton.disabled = !Number.isFinite(overclockCost);
  refs.overclockButton.classList.toggle('affordable', state.flux >= overclockCost);

  for (const system of SYSTEMS) {
    const item = systemRefs[system.id];
    const purchase = getPurchase(state, system.id, state.buyMode);
    const fallbackCost = getUnitCost(system.id, state.systems[system.id]);
    item.owned.textContent = state.systems[system.id].toString();
    item.rate.textContent = `+${fmt(getSystemRate(state, system.id, now))} / sec`;
    item.buy.textContent = purchase.quantity > 0 ? `BUY ×${purchase.quantity}` : state.buyMode === 'max' ? 'BUY MAX' : `BUY ×${state.buyMode}`;
    item.cost.textContent = costText(purchase.cost || fallbackCost);
    item.button.classList.toggle('affordable', purchase.quantity > 0);
    item.button.classList.toggle('owned', state.systems[system.id] > 0);
    item.meter.style.width = `${Math.min(100, state.systems[system.id] % 25 / 25 * 100)}%`;
  }

  document.querySelectorAll<HTMLButtonElement>('.buy-modes button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === String(state.buyMode));
  });
  const foldGain = getFoldGain(state);
  refs.echoCount.textContent = `${state.echoes} ${state.echoes === 1 ? 'ECHO' : 'ECHOES'}`;
  refs.echoMultiplier.textContent = `×${getEchoMultiplier(state).toFixed(2)}`;
  refs.foldCount.textContent = state.folds.toString();
  refs.foldGain.textContent = `+${foldGain}`;
  refs.foldButton.disabled = foldGain <= 0;
  refs.foldTitle.textContent = foldGain > 0 ? `${foldGain} ${foldGain === 1 ? 'Echo' : 'Echoes'} ready` : 'Signal too weak';
  refs.foldDescription.textContent = foldGain > 0
    ? 'Reset this run and permanently amplify every future signal.'
    : `Reach ${fmt(FOLD_UNLOCK)} run Flux to compress this network into permanent power.`;
  refs.runStat.textContent = `RUN FLUX ${fmt(state.runFlux)}`;
  refs.networkStat.textContent = `${totalSystems} SYSTEM${totalSystems === 1 ? '' : 'S'}`;
  refs.multiplierStat.textContent = `×${getGlobalMultiplier(state, now).toFixed(2)} OUTPUT`;
  refs.soundButton.textContent = state.soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  refs.victory.classList.toggle('visible', isStageCleared(state) && !victoryDismissed);
  refs.victory.setAttribute('aria-hidden', String(!isStageCleared(state) || victoryDismissed));
  refs.victoryStat.textContent = `${fmt(state.lifetimeFlux)} lifetime Flux · ${state.echoes} Echoes`;
}

refs.tuneButton.addEventListener('click', doTune);
refs.calibrationButton.addEventListener('click', () => {
  if (!apply(buyCalibration(state), 560)) showToast(`Calibration needs ${costText(CALIBRATION_COSTS[state.calibration] ?? Infinity)}`);
});
refs.overclockButton.addEventListener('click', () => {
  if (!apply(buyOverclock(state), 690)) showToast(`Overclock needs ${costText(OVERCLOCK_COSTS[state.overclock] ?? Infinity)}`);
});
for (const id of SYSTEM_IDS) {
  systemRefs[id].button.addEventListener('click', () => {
    if (!apply(buySystem(state, id), 520 + SYSTEM_IDS.indexOf(id) * 45)) showToast(`${SYSTEMS.find((item) => item.id === id)!.name} needs more Flux`);
  });
}
document.querySelectorAll<HTMLButtonElement>('.buy-modes button').forEach((button) => {
  button.addEventListener('click', () => {
    const mode: BuyMode = button.dataset.mode === 'max' ? 'max' : button.dataset.mode === '10' ? 10 : 1;
    apply(setBuyMode(state, mode));
  });
});
refs.foldButton.addEventListener('click', () => {
  const gain = getFoldGain(state);
  if (gain <= 0) { showToast('Reach 1M run Flux before folding'); return; }
  if (!window.confirm(`Fold this run for ${gain} ${gain === 1 ? 'Echo' : 'Echoes'}? Your systems and upgrades will reset.`)) return;
  apply(fold(state), 780);
  showToast(`Reality folded · +${gain} ${gain === 1 ? 'Echo' : 'Echoes'}`);
});
refs.soundButton.addEventListener('click', () => {
  state = { ...state, soundEnabled: !state.soundEnabled };
  render(); saveGame(state);
  if (state.soundEnabled) tone(620, 0.15, 0.04);
});
refs.resetButton.addEventListener('click', () => {
  if (!window.confirm('Erase all Signal Foundry progress, including Echoes?')) return;
  clearGame(); state = createInitialState(); victoryDismissed = false; render(); saveGame(state);
  showToast('Foundry reset');
});
refs.continueButton.addEventListener('click', () => { victoryDismissed = true; render(); });

function installModelTools(): void {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool: Parameters<typeof context.registerTool>[0]): void => {
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Unsupported preview. */ }
  };

  register({
    name: 'read_foundry_status',
    title: 'Read foundry status',
    description: 'Read the current Signal Foundry resources, production, upgrades, Echoes, and active objective without changing the game.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => {
      const objective = getNextObjective(state);
      return {
        flux: Math.floor(state.flux), runFlux: Math.floor(state.runFlux), productionPerSecond: getProduction(state),
        calibration: state.calibration, overclock: state.overclock, echoes: state.echoes,
        resonancePercent: Math.floor(state.resonance), objective: objective.label,
      };
    },
  });

  register({
    name: 'tune_signal',
    title: 'Tune the signal',
    description: 'Tune the signal core between 1 and 100 times, earning Flux and charging Resonance exactly like the visible Tune control.',
    inputSchema: {
      type: 'object',
      properties: { count: { type: 'integer', minimum: 1, maximum: 100, default: 1 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => {
      const value = typeof input === 'object' && input !== null ? (input as { count?: unknown }).count : undefined;
      const count = value === undefined ? 1 : value;
      if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 100) throw new Error('count must be an integer from 1 to 100');
      let next = state;
      let earned = 0;
      for (let index = 0; index < (count as number); index += 1) {
        const result = tune(next, Date.now());
        next = result.state;
        earned += result.earned;
      }
      apply(next);
      return { tuned: count, earned: Math.floor(earned), flux: Math.floor(state.flux), resonancePercent: Math.floor(state.resonance) };
    },
  });

  register({
    name: 'buy_relay_system',
    title: 'Buy relay systems',
    description: 'Buy one, ten, or the maximum affordable quantity of a named relay system using the same purchase rules as the fleet cards.',
    inputSchema: {
      type: 'object',
      properties: {
        systemId: { type: 'string', enum: [...SYSTEM_IDS] },
        quantity: { oneOf: [{ type: 'integer', enum: [1, 10] }, { type: 'string', enum: ['max'] }], default: 1 },
      },
      required: ['systemId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => {
      if (typeof input !== 'object' || input === null) throw new Error('input must be an object');
      const { systemId, quantity = 1 } = input as { systemId?: unknown; quantity?: unknown };
      if (typeof systemId !== 'string' || !SYSTEM_IDS.includes(systemId as SystemId)) throw new Error('systemId is not valid');
      if (quantity !== 1 && quantity !== 10 && quantity !== 'max') throw new Error('quantity must be 1, 10, or max');
      const before = state.systems[systemId as SystemId];
      const next = buySystem(setBuyMode(state, quantity), systemId as SystemId);
      if (next === state || next.systems[systemId as SystemId] === before) throw new Error('not enough Flux for this purchase');
      apply(next);
      return { systemId, purchased: state.systems[systemId as SystemId] - before, owned: state.systems[systemId as SystemId], flux: Math.floor(state.flux) };
    },
  });
}

window.addEventListener('keydown', (event) => {
  if ((event.code !== 'Space' && event.key !== ' ') || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
  event.preventDefault();
  doTune();
}, true);
window.addEventListener('keyup', (event) => {
  if (event.code === 'Space' || event.key === ' ') event.preventDefault();
}, true);
window.addEventListener('pagehide', () => saveGame(state));

installModelTools();
render();
saveGame(state);
if (offline.earned > 0 && offline.elapsedMs >= 30_000) showToast(`Offline network recovered ${fmt(offline.earned)} Flux`);

window.setInterval(() => {
  const result = advanceTime(state, Date.now());
  state = result.state;
  render();
}, 200);
window.setInterval(() => saveGame(state), 5_000);
