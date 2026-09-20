import {
  createInitialState,
  normalizeState,
  type GameState,
} from "./game";

const STORAGE_KEY = "pocket-grove-save";
const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  state: GameState;
}

export function loadGame(): GameState {
  const now = Date.now();
  const fallback = createInitialState(now);
  try {
    if (typeof localStorage === "undefined") return fallback;
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return fallback;
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Partial<SaveEnvelope>).version !== SAVE_VERSION
    ) {
      return fallback;
    }
    return normalizeState((parsed as SaveEnvelope).state, now);
  } catch {
    return fallback;
  }
}

export function saveGame(state: GameState): void {
  try {
    if (typeof localStorage === "undefined") return;
    const envelope: SaveEnvelope = {
      version: SAVE_VERSION,
      state: normalizeState(state, Date.now()),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Saving is best effort. A blocked or full localStorage must not stop play.
  }
}

export function clearGame(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable localStorage.
  }
}

