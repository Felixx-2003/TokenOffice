import './style.css';
import {
  activateAbility, advanceTime, buyAutoWhip, buyModel, buyPlan, buySkill,
  buyStar, buyWhip, createInitialState, getAutoWhipCost, getLevel, getModel,
  getPlanCost, getSkill, getSkillCost, getStarCost, getWhipCost, prompt,
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
let musicTimer: number | undefined;
let musicStep = 0;
const musicNotes = [196, 247, 294, 330, 294, 247, 220, 262, 330, 392, 330, 262];

function context(): AudioContext | undefined {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch { return undefined; }
}

function playTone(frequency: number, duration = 0.08, volume = 0.045, delay = 0, type: OscillatorType = 'sine'): void {
  const audio = context();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(Math.max(0.001, volume), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function musicBeat(): void {
  if (!state.soundEnabled) return;
  const note = musicNotes[musicStep % musicNotes.length];
  playTone(note, 0.28, 0.012, 0, musicStep % 4 === 0 ? 'triangle' : 'sine');
  if (musicStep % 4 === 0) playTone(note / 2, 0.5, 0.007, 0, 'sine');
  musicStep += 1;
}

function startMusic(): void {
  if (!state.soundEnabled || musicTimer !== undefined) return;
  musicBeat();
  musicTimer = window.setInterval(musicBeat, 360);
}

function stopMusic(): void {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
}

function sound(frequency: number): void {
  if (!state.soundEnabled) return;
  startMusic();
  playTone(frequency, 0.08, 0.045, 0, 'square');
}

function unlockSound(): void {
  if (!state.soundEnabled) return;
  startMusic();
  [523, 659, 784, 1047].forEach((note, index) => playTone(note, 0.22, 0.05, index * 0.075, 'triangle'));
}

function abilitySound(id: AbilityId): void {
  if (!state.soundEnabled) return;
  startMusic();
  const notes = id === 'agi' ? [220, 330, 440] : id === 'asi' ? [392, 587, 880] : [196, 392, 659, 1047];
  notes.forEach((note, index) => playTone(note, 0.4, 0.055, index * 0.06, id === 'agi' ? 'sawtooth' : 'triangle'));
}

function apply(next: GameState, tone: number, unlocked = false): boolean {
  if (next === state) return false;
  const level = getLevel(state);
  state = next;
  ui.render(state);
  saveGame(state);
  if (unlocked || getLevel(state) > level) unlockSound(); else sound(tone);
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
    if (!apply(buyModel(state, id), 620, true)) ui.showHint(`${getModel(id).name} needs ${getModel(id).price.toLocaleString()} Tokens`);
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
    if (!apply(buyWhip(state), 730, true)) ui.showHint(`Next Whip costs ${getWhipCost(state).toLocaleString()} Tokens`);
  },
  onAutoWhip: () => {
    const cost = getAutoWhipCost(state);
    if (!apply(buyAutoWhip(state), 790, true)) ui.showHint(state.autoWhips >= 5 ? 'Five Auto Whips is the maximum' : `Next Auto Whip costs ${cost.toLocaleString()} Tokens`);
  },
  onSkill: (id: SkillId) => {
    const firstStar = state.skills[id] === 0;
    if (!apply(buySkill(state, id), 760, firstStar)) ui.showHint(`${getSkill(id).name} star costs ${getSkillCost(state, id).toLocaleString()} Tokens or needs its earlier skill`);
  },
  onAbility: (id: AbilityId) => {
    if (apply(activateAbility(state, id, Date.now()), 880)) abilitySound(id);
  },
  onToggleSound: () => {
    state = { ...state, soundEnabled: !state.soundEnabled };
    ui.render(state); saveGame(state);
    if (state.soundEnabled) { startMusic(); sound(650); } else stopMusic();
  },
  onToggleReducedMotion: () => {
    state = { ...state, reducedMotion: !state.reducedMotion };
    ui.render(state); saveGame(state);
  },
  onReset: () => {
    if (!window.confirm('Reset Token Office and erase all progress?')) return;
    stopMusic(); clearGame(); state = createInitialState(Date.now()); ui.render(state); saveGame(state);
  },
});

installPlayShortcut(window, () => sendPrompt());
ui.render(state);
if (initialAdvance.earned > 0 && initialAdvance.elapsedMs >= 30_000) ui.showOffline(initialAdvance.earned, initialAdvance.elapsedMs);
saveGame(state);

window.setInterval(() => {
  const level = getLevel(state);
  const result = advanceTime(state, Date.now());
  state = result.state;
  ui.render(state);
  if (getLevel(state) > level) unlockSound();
  if (result.earned > 0 && result.elapsedMs >= 30_000) ui.showOffline(result.earned, result.elapsedMs);
}, 200);
window.setInterval(() => saveGame(state), 5_000);
window.addEventListener('pagehide', () => { stopMusic(); saveGame(state); });
