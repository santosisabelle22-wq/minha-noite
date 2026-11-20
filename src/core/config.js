/** Configurações globais e presets de qualidade. */

export const STORAGE_KEY = 'minha-noite:save:v1';
export const SAVE_VERSION = 1;

/** Duração de um ciclo completo dia/noite, em segundos. */
export const DAY_LENGTH_SECONDS = 240;

export const QUALITY_PRESETS = {
  low: {
    label: 'Leve',
    pixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    grass: 120,
    flowers: 90,
    fireflies: 90,
    stars: 380,
    trees: 38,
    particles: 60
  },
  medium: {
    label: 'Média',
    pixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    grass: 260,
    flowers: 170,
    fireflies: 150,
    stars: 700,
    trees: 56,
    particles: 110
  },
  high: {
    label: 'Alta',
    pixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    grass: 420,
    flowers: 260,
    fireflies: 220,
    stars: 1100,
    trees: 72,
    particles: 170
  }
};

export const DEFAULT_SETTINGS = {
  quality: 'medium',
  volume: 45,
  showHints: true
};

export const DEFAULT_PROFILE = {
  name: 'Viajante',
  affinity: 'nature',
  appearance: {
    skin: '#f0cdb4',
    hair: '#5b3b2e',
    dress: '#2f5fb8',
    eyes: '#4f9d78',
    hairstyle: 'curls',
    accessory: 'star'
  }
};

export const TIME_PHASES = [
  { id: 'morning', label: 'Manhã', start: 0.0, sky: 0x9ec8ef, fog: 0xbcd8ee, sun: 0xffeed2, light: 1.05 },
  { id: 'afternoon', label: 'Tarde', start: 0.25, sky: 0x8fbde8, fog: 0xa9cde8, sun: 0xfff3d8, light: 1.15 },
  { id: 'sunset', label: 'Pôr do sol', start: 0.5, sky: 0xe3a878, fog: 0xdcb28e, sun: 0xffb46b, light: 0.85 },
  { id: 'night', label: 'Noite', start: 0.68, sky: 0x0d224d, fog: 0x16305e, sun: 0xbcd4ff, light: 0.32 }
];

export function phaseAt(t) {
  const normalized = ((t % 1) + 1) % 1;
  let current = TIME_PHASES[0];
  for (const phase of TIME_PHASES) {
    if (normalized >= phase.start) current = phase;
  }
  return current;
}

/** 0 = meia-noite, 0.25 = manhã, 0.5 = meio-dia, 0.75 = pôr do sol. */
export function timeLabel(t) {
  return phaseAt(t).label;
}
