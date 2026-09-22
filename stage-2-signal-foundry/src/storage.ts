import { createInitialState, normalizeState, type GameState } from './game';

const KEY = 'signal-foundry-stage-2-save-v1';
const VERSION = 1;

export function loadGame(): GameState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createInitialState(now);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return createInitialState(now);
    const envelope = parsed as { version?: number; state?: unknown };
    return envelope.version === VERSION ? normalizeState(envelope.state, now) : createInitialState(now);
  } catch {
    return createInitialState(now);
  }
}

export function saveGame(state: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, state: normalizeState(state) })); } catch { /* Optional. */ }
}

export function clearGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* Optional. */ }
}
