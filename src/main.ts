import './style.css';
import {
  activateAbility, advanceTime, buyAutoWhip, buyModel, buyPlan, buySkill,
  buyStar, buyWhip, createInitialState, getAutoWhipCost, getLevel, getModel,
  getPlanCost, getSkill, getSkillCost, getStarCost, getWhipCost, MODELS, prompt,
  isStageCleared, type AbilityId, type GameState, type ModelId, type SkillId,
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
const aiArpeggio = [220, 277, 330, 415, 659, 415, 330, 277, 196, 247, 330, 392, 587, 392, 330, 247];
const aiBass = [55, 65, 73, 49];
const victoryTheme = [262, 330, 392, 523, 659, 523, 392, 330, 294, 370, 440, 587, 740, 587, 440, 370];

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

function playKick(): void {
  const audio = context();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(105, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(42, audio.currentTime + 0.13);
  gain.gain.setValueAtTime(0.055, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.15);
}

function playSynthPulse(frequency: number, duration: number, volume: number, delay = 0): void {
  const audio = context();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(frequency, start);
  filter.type = 'lowpass';
  filter.Q.value = 7;
  filter.frequency.setValueAtTime(2400, start);
  filter.frequency.exponentialRampToValueAtTime(520, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(filter).connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function musicBeat(): void {
  if (!state.soundEnabled) return;
  const beat = musicStep % 16;
  if (isStageCleared(state)) {
    const note = victoryTheme[beat];
    playTone(note, 0.34, 0.038, 0, 'triangle');
    playTone(note * 2, 0.18, 0.012, 0.08, 'sine');
    if (beat % 4 === 0) [1, 1.25, 1.5].forEach((ratio) => playTone(note * ratio / 2, 1.2, 0.014, 0, 'sine'));
    musicStep += 1;
    return;
  }
  const note = aiArpeggio[beat];
  playSynthPulse(note, 0.2, beat % 4 === 0 ? 0.04 : 0.028);
  playTone(note * 2, 0.08, 0.009, 0.095, 'square');
  if (beat % 2 === 0) playTone(aiBass[Math.floor(beat / 4)], 0.42, 0.03, 0, 'triangle');
  if (beat % 4 === 0) {
    playKick();
  }
  if (beat % 8 === 0) [1, 1.26, 1.5].forEach((ratio) => playSynthPulse(note * ratio / 2, 1.45, 0.008));
  musicStep += 1;
}

function startMusic(): void {
  if (!state.soundEnabled || musicTimer !== undefined) return;
  musicBeat();
  musicTimer = window.setInterval(musicBeat, 240);
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

function apply(next: GameState, tone?: number, unlocked = false): boolean {
  if (next === state) return false;
  const level = getLevel(state);
  const wasCleared = isStageCleared(state);
  state = next;
  ui.render(state);
  saveGame(state);
  if (!wasCleared && isStageCleared(state)) {
    musicStep = 0;
    stopMusic();
    startMusic();
    [523, 659, 784, 1047, 1319].forEach((note, index) => playTone(note, 0.45, 0.05, index * 0.09, 'triangle'));
    return true;
  }
  if (unlocked || getLevel(state) > level) unlockSound();
  else if (tone !== undefined) sound(tone);
  return true;
}

function sendPrompt(id = state.selectedModel): void {
  const previousTokens = state.tokens;
  const next = prompt(state, id);
  if (apply(next)) {
    ui.flashPrompt(id, next.tokens - previousTokens);
  }
}

function sendPromptAll(): void {
  const selected = state.selectedModel;
  let next = state;
  const gains: Array<{ id: ModelId; amount: number }> = [];
  for (const model of MODELS) {
    if (!next.models[model.id].unlocked) continue;
    const previousTokens = next.tokens;
    next = prompt(next, model.id);
    gains.push({ id: model.id, amount: next.tokens - previousTokens });
  }
  next = { ...next, selectedModel: selected };
  if (apply(next)) {
    gains.forEach(({ id, amount }) => ui.flashPrompt(id, amount));
  }
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

installPlayShortcut(window, sendPromptAll);
window.addEventListener('pointerdown', () => startMusic(), true);
window.addEventListener('keydown', () => startMusic(), true);
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
