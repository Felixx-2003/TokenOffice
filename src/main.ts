import './style.css';
import {
  activateAbility, advanceTime, buyAutoWhip, buyModel, buyPlan, buySkill,
  buyStar, buyWhip, createInitialState, getLevel, getModel,
  getPlanCost, getSkill, getStarCost, getWhipCost, prompt,
  type AbilityId, type GameState, type ModelId, type SkillId,
} from './game';
import { clearGame, loadGame, saveGame } from './storage';
import { createUI } from './ui';
import { installPlayShortcut } from './controls';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app element');

let state = loadGame();
const initialAdvance = advanceTime(state, Date.now());
state = initialAdvance.state;

let audioContext: AudioContext | undefined;
function sound(frequency: number): void {
  if (!state.soundEnabled) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.075);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.075);
  } catch { /* Sound is optional. */ }
}

function apply(next: GameState, tone: number): boolean {
  if (next === state) return false;
  const level = getLevel(state);
  state = next;
  ui.render(state);
  saveGame(state);
  sound(getLevel(state) > level ? 800 : tone);
  return true;
}

function sendPrompt(id = state.selectedModel): void {
  const previousTokens = state.tokens;
  const next = prompt(state, id);
  if (apply(next, 470)) ui.flashPrompt(id, next.tokens - previousTokens);
}

const ui = createUI(root, {
  onDesk: (id: ModelId) => {
    if (state.models[id].unlocked) { sendPrompt(id); return; }
    if (!apply(buyModel(state, id), 620)) ui.showHint(`${getModel(id).name} needs ${getModel(id).price.toLocaleString()} Tokens`);
  },
  onPrompt: () => sendPrompt(),
  onStar: () => {
    const id = state.selectedModel;
    if (!apply(buyStar(state, id), 630)) ui.showHint(`Next star costs ${getStarCost(state, id).toLocaleString()} Tokens`);
  },
  onPlan: () => {
    const id = state.selectedModel;
    if (!apply(buyPlan(state, id), 690)) ui.showHint(`Next plan costs ${getPlanCost(state, id).toLocaleString()} Tokens`);
  },
  onWhip: () => {
    if (!apply(buyWhip(state), 730)) ui.showHint(`Next Whip costs ${getWhipCost(state).toLocaleString()} Tokens`);
  },
  onAutoWhip: () => {
    if (!apply(buyAutoWhip(state), 790)) ui.showHint('Auto Whip unlocks at 10K lifetime Tokens and costs 10K');
  },
  onSkill: (id: SkillId) => {
    if (!apply(buySkill(state, id), 760)) ui.showHint(`${getSkill(id).name} needs more Tokens or its earlier skill`);
  },
  onAbility: (id: AbilityId) => { apply(activateAbility(state, id, Date.now()), 880); },
  onToggleSound: () => {
    state = { ...state, soundEnabled: !state.soundEnabled };
    ui.render(state); saveGame(state); sound(650);
  },
  onToggleReducedMotion: () => {
    state = { ...state, reducedMotion: !state.reducedMotion };
    ui.render(state); saveGame(state);
  },
  onReset: () => {
    if (!window.confirm('Reset Token Office and erase all progress?')) return;
    clearGame(); state = createInitialState(Date.now()); ui.render(state); saveGame(state);
  },
});

installPlayShortcut(window, () => sendPrompt());
ui.render(state);
if (initialAdvance.earned > 0 && initialAdvance.elapsedMs >= 30_000) {
  ui.showOffline(initialAdvance.earned, initialAdvance.elapsedMs);
}
saveGame(state);

window.setInterval(() => {
  const result = advanceTime(state, Date.now());
  state = result.state;
  ui.render(state);
  if (result.earned > 0 && result.elapsedMs >= 30_000) ui.showOffline(result.earned, result.elapsedMs);
}, 200);
window.setInterval(() => saveGame(state), 5_000);
window.addEventListener('pagehide', () => saveGame(state));
