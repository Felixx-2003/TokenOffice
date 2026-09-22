import { createInitialState, normalizeState, type GameState } from './game';

const SAVE_KEY = 'token-heist-stage-3-save-v1';

export const loadGame = (): { state: GameState; offlineSeconds: number } => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: createInitialState(), offlineSeconds: 0 };
    const state = normalizeState(JSON.parse(raw) as Partial<GameState>);
    const offlineSeconds = Math.min(28_800, Math.max(0, (Date.now() - state.lastSavedAt) / 1000));
    return { state, offlineSeconds };
  } catch {
    return { state: createInitialState(), offlineSeconds: 0 };
  }
};

export const saveGame = (state: GameState): void => {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
};

export const clearGame = (): void => localStorage.removeItem(SAVE_KEY);
