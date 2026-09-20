import './style.css';
import {
  advanceTime,
  buyProducer,
  buyUpgrade,
  createInitialState,
  getStage,
  tap,
  type GameState,
  type ProducerId,
  type UpgradeId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';
import { createUI } from './ui';
import { installHarvestShortcut } from './controls';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app element');

let state = loadGame();
const initialAdvance = advanceTime(state, Date.now());
state = initialAdvance.state;

let audioContext: AudioContext | undefined;
function sound(frequency: number, duration = 0.075): void {
  if (!state.soundEnabled) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is optional; the game remains playable when the browser blocks it.
  }
}

function apply(next: GameState, tone: number): void {
  if (next === state) return;
  const previousStage = getStage(state);
  state = next;
  ui.render(state);
  saveGame(state);
  sound(getStage(state) > previousStage ? 740 : tone);
}

const ui = createUI(root, {
  onTap: () => apply(tap(state), 440),
  onBuyProducer: (id: ProducerId) => apply(buyProducer(state, id), 550),
  onBuyUpgrade: (id: UpgradeId) => apply(buyUpgrade(state, id), 620),
  onToggleSound: () => {
    state = { ...state, soundEnabled: !state.soundEnabled };
    ui.render(state);
    saveGame(state);
    sound(660);
  },
  onToggleReducedMotion: () => {
    state = { ...state, reducedMotion: !state.reducedMotion };
    ui.render(state);
    saveGame(state);
  },
  onReset: () => {
    if (!window.confirm('Reset your grove and erase all progress?')) return;
    clearGame();
    state = createInitialState(Date.now());
    ui.render(state);
    saveGame(state);
  },
});

installHarvestShortcut(window, () => apply(tap(state), 440));

ui.render(state);
if (initialAdvance.earned > 0 && initialAdvance.elapsedMs >= 30_000) {
  ui.showOffline(initialAdvance.earned, initialAdvance.elapsedMs);
}
saveGame(state);

window.setInterval(() => {
  const result = advanceTime(state, Date.now());
  state = result.state;
  ui.render(state);
  if (result.earned > 0 && result.elapsedMs >= 30_000) {
    ui.showOffline(result.earned, result.elapsedMs);
  }
}, 100);

window.setInterval(() => saveGame(state), 5_000);
window.addEventListener('pagehide', () => saveGame(state));
