import { createInitialState, normalizeState, type GameState } from './game';

// A new key starts Token Office from 0 instead of importing Arcade/Grove money.
const KEY = 'token-office-save-v4';
const VERSION = 4;

export function loadGame(): GameState {
  const now = Date.now();
  try {
    const value = localStorage.getItem(KEY);
    if (!value) return createInitialState(now);
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return createInitialState(now);
    const envelope = parsed as { version?: number; state?: unknown };
    return envelope.version === VERSION ? normalizeState(envelope.state, now) : createInitialState(now);
  } catch {
    return createInitialState(now);
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, state: normalizeState(state) }));
  } catch { /* Storage is optional. */ }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('token-office-save');
    localStorage.removeItem('pocket-arcade-save');
    localStorage.removeItem('pocket-grove-save');
  } catch { /* Storage is optional. */ }
}
