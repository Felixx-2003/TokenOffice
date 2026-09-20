import { createInitialState, normalizeState, type GameState } from './game';

const STORAGE_KEY = 'pocket-arcade-save';
const LEGACY_KEY = 'pocket-grove-save';
const SAVE_VERSION = 2;

interface SaveEnvelope { version: number; state: unknown }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function oldNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Keep old progress when the garden becomes an arcade. */
function migrateGrove(rawState: unknown, now: number): GameState {
  const old = isRecord(rawState) ? rawState : {};
  const owned = isRecord(old.owned) ? old.owned : {};
  const upgrades = isRecord(old.upgrades) ? old.upgrades : {};
  const oldTotal = oldNumber(old.lifetimeBloom);
  const lifetimeCash = oldTotal < 100 ? oldTotal * 50
    : oldTotal < 300 ? 5_000 + (oldTotal - 100) * 225
      : oldTotal < 3_000 ? 50_000 + (oldTotal - 300) * (450_000 / 2_700)
        : 500_000 + (oldTotal - 3_000) * (450_000 / 2_700);
  return normalizeState({
    cash: oldNumber(old.bloom) * 50,
    lifetimeCash,
    owned: {
      coinPusher: owned.flower, pinball: owned.beehive,
      clawMachine: owned.tree, jackpot: 0,
    },
    upgrades: {
      powerGlove: upgrades.betterTools, coinBooster: upgrades.wateringCan,
      multiball: upgrades.pollination,
    },
    autoPlayerStars: old.autoHarvesterStars,
    lastTick: old.lastTick,
    soundEnabled: old.soundEnabled,
    reducedMotion: old.reducedMotion,
  }, now);
}

export function loadGame(): GameState {
  const now = Date.now();
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed: SaveEnvelope = JSON.parse(current);
      if (parsed.version === SAVE_VERSION) return normalizeState(parsed.state, now);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed: SaveEnvelope = JSON.parse(legacy);
      if (parsed.version === 1) return migrateGrove(parsed.state, now);
    }
  } catch {
    // Storage may be blocked or damaged. A fresh game remains playable.
  }
  return createInitialState(now);
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state: normalizeState(state) }));
  } catch {
    // Saving is best effort.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage may be blocked.
  }
}
