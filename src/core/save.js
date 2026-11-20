/**
 * Salvamento local. O formato já está preparado para ser enviado a um
 * backend no futuro (contas e sincronização entre dispositivos), mas
 * nesta versão tudo fica no localStorage do navegador.
 */
import { STORAGE_KEY, SAVE_VERSION, DEFAULT_PROFILE, DEFAULT_SETTINGS } from './config.js';

export function createEmptySave() {
  return {
    version: SAVE_VERSION,
    profile: structuredClone(DEFAULT_PROFILE),
    settings: structuredClone(DEFAULT_SETTINGS),
    game: {
      world: 'village',
      position: { x: 0, y: 0, z: 6 },
      time: 0.18,
      level: 1,
      experience: 0,
      celestialUnlocked: false,
      playedSeconds: 0
    },
    inventory: {
      collected: [],
      artifacts: [],
      pets: []
    },
    quests: {
      tutorial: {
        active: false,
        completed: false,
        steps: {}
      }
    },
    memories: [],
    flags: {},
    savedAt: null
  };
}

function deepMerge(base, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? base;
  const result = { ...base };
  for (const [key, item] of Object.entries(value)) {
    result[key] = item && typeof item === 'object' && !Array.isArray(item) && base[key] && typeof base[key] === 'object'
      ? deepMerge(base[key], item)
      : item;
  }
  return result;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SAVE_VERSION) {
      console.warn('[Minha Noite] Save de versão antiga ignorado.');
      return null;
    }
    return deepMerge(createEmptySave(), parsed);
  } catch (error) {
    console.warn('[Minha Noite] Não foi possível ler o salvamento:', error);
    return null;
  }
}

export function writeSave(data) {
  try {
    const payload = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[Minha Noite] Não foi possível salvar:', error);
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível */ }
}

export function saveExists() {
  try { return Boolean(localStorage.getItem(STORAGE_KEY)); } catch { return false; }
}
