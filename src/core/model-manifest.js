/**
 * Catálogo de modelos externos (GLB/GLTF).
 *
 * Enquanto um caminho estiver como `null`, o projeto usa os modelos procedurais
 * atuais. Para ativar um modelo detalhado, preencha o caminho com o arquivo
 * colocado em `assets/models/`. Nenhuma mecânica depende destes valores.
 */

export const CHARACTER_MODELS = {
  livy: null,   // ex.: './assets/models/livy.glb'
  player: null  // ex.: './assets/models/player.glb'
};

/** Objetos de cenário opcionais, carregados como filhos do grupo do mundo. */
export const WORLD_PROPS = {
  village: [],
  forest: []
  // ex.: [{ url: './assets/models/forest/ancient-tree.glb', position: [12, 0, -18], scale: 1.4 }]
};

/** Nomes aceitos para as animações esqueléticas (comparação sem diferenciar maiúsculas). */
export const ANIMATION_ALIASES = {
  idle: ['idle', 'await', 'parado'],
  walk: ['walk', 'caminhar', 'caminhada'],
  run: ['run', 'correr', 'corrida'],
  jump: ['jump', 'pular', 'salto'],
  wave: ['wave', 'acenar', 'gesto'],
  dance: ['dance', 'dancar', 'dança'],
  sit: ['sit', 'sentar']
};

/** Nomes de materiais reconhecidos para personalização de aparência. */
export const MATERIAL_SLOTS = {
  skin: ['skin', 'porcelain', 'rosto', 'pele'],
  hair: ['hair', 'cabelo'],
  dress: ['dress', 'vestido', 'cloth', 'tecido'],
  eyes: ['eye', 'eyes', 'iris', 'olho', 'olhos']
};

/** Nós independentes de acessório; o nome deve existir no GLB. */
export const ACCESSORY_NODES = {
  star: 'Accessory_Star',
  moon: 'Accessory_Moon',
  flower: 'Accessory_Flower'
};

/** Altura alvo usada para normalizar modelos importados (1 unidade = 1 metro). */
export const TARGET_CHARACTER_HEIGHT = 1.85;
