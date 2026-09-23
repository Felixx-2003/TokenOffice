import { createInitialState, normalizeState, type GameState } from './game';

const SAVE_KEY = 'token-timeline-stage-4-save-v1';
export const loadGame = (): { state: GameState; offlineSeconds: number } => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: createInitialState(), offlineSeconds: 0 };
    const state = normalizeState(JSON.parse(raw) as Partial<GameState>);
    return { state, offlineSeconds: Math.min(28_800, Math.max(0, (Date.now() - state.savedAt) / 1_000)) };
  } catch {
    return { state: createInitialState(), offlineSeconds: 0 };
  }
};
export const saveGame = (state: GameState): void => {
  try { state.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage may be unavailable */ }
};
export const clearGame = (): void => { try { localStorage.removeItem(SAVE_KEY); } catch { /* storage may be unavailable */ } };
