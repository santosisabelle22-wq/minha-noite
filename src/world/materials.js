/** Materiais compartilhados. Estilo: 3D estilizado, toque azul/dourado/branco. */
import * as THREE from 'three';

const std = (color, options = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.86, metalness: 0.02, flatShading: true, ...options
});
const glow = (color, intensity = 1.4) => std(color, {
  emissive: color, emissiveIntensity: intensity, roughness: 0.45
});

export const MATERIALS = {
  ground: std(0x3f6f56),
  groundDark: std(0x2c5545),
  path: std(0xc3b590),
  pathLight: std(0xd8cba8),
  stone: std(0x8e9ba6),
  stoneDark: std(0x667582),
  moss: std(0x4f8762),
  wood: std(0x6e4b35),
  woodDark: std(0x4a3225),
  bark: std(0x5a4333),
  barkLight: std(0x7a5c43),
  roofBlue: std(0x214b8f),
  roofDeep: std(0x153264),
  wall: std(0xe7eef8),
  wallBlue: std(0xaac7e9),
  gold: std(0xd9ad55, { metalness: 0.55, roughness: 0.35 }),
  goldBright: std(0xf6dfae, { metalness: 0.35, roughness: 0.3, emissive: 0x6b4f18, emissiveIntensity: 0.35 }),
  white: std(0xf7f9ff),
  glass: std(0xf5c879, { emissive: 0xffb44a, emissiveIntensity: 1.1, roughness: 0.3 }),
  water: std(0x4b9fd0, { transparent: true, opacity: 0.72, roughness: 0.22, metalness: 0.1, flatShading: false }),
  waterLight: std(0x9ed8f0, { transparent: true, opacity: 0.5, roughness: 0.2 }),
  leaf: [std(0x3c7d5c), std(0x4f9069), std(0x2f6b58), std(0x6aa07a), std(0x397763)],
  flower: [
    glow(0xf6dfae, 0.6), glow(0xb9a6e8, 0.6), glow(0xf3b8cf, 0.55),
    glow(0xfff1c9, 0.7), glow(0x9ed8f0, 0.5)
  ],
  mushroom: [std(0xd98c8c), std(0xe8c3a1), std(0xb59ad9)],
  crystal: glow(0x9ed8f0, 1.1),
  star: glow(0xf6dfae, 1.8),
  firefly: new THREE.PointsMaterial({
    color: 0xffe9a8, size: 0.16, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }),
  petal: std(0xf3b8cf, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
};

/** Cores usadas também pela interface. */
export const COLORS = {
  night: 0x081735,
  blue: 0x2f5fb8,
  gold: 0xd9ad55,
  goldLight: 0xf6dfae,
  white: 0xf7f9ff,
  green: 0x4f9069
};
