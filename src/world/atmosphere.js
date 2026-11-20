/** Camadas atmosféricas leves: árvores distantes e faixas de névoa. */
import * as THREE from 'three';
import { MATERIALS } from './materials.js';
import { createGlowTexture } from '../core/utils.js';

/** Silhuetas frias no horizonte; não projetam sombra e custam poucos draw calls. */
export function buildDistantTrees({ random, quality, minRadius, maxRadius, heightAt = () => 0, centerX = 0, centerZ = 0 }) {
  const count = Math.max(14, Math.round(quality.trees * 0.4));
  const trunkMaterial = MATERIALS.bark.clone();
  trunkMaterial.color.setHex(0x2d4056);
  const canopyMaterial = MATERIALS.leaf[2].clone();
  canopyMaterial.color.setHex(0x355374);

  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.72, 6, 5), trunkMaterial, count);
  const canopies = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 5.4, 6), canopyMaterial, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.22;
    const radius = minRadius + random() * (maxRadius - minRadius);
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    const scale = 0.85 + random() * 0.8;
    const y = heightAt(x, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);

    dummy.position.set(x, y + 3 * scale, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    color.setHex(random() > 0.5 ? 0x33465d : 0x2a3c52);
    trunks.setColorAt(i, color);

    dummy.position.set(x, y + 7 * scale, z);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
    color.setHex([0x355374, 0x3e6180, 0x2f4d68][Math.floor(random() * 3)]);
    canopies.setColorAt(i, color);
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  const group = new THREE.Group();
  group.add(trunks, canopies);
  return group;
}

/** Faixas de névoa em raycast-free sprites, com deriva muito lenta. */
export function buildMistBands({ random, quality, spots }) {
  const count = quality.particles >= 110 ? spots.length : Math.ceil(spots.length / 2);
  const texture = createGlowTexture('#dceaf7', 96);
  const group = new THREE.Group();
  const bands = [];
  for (let i = 0; i < count; i++) {
    const [x, z] = spots[i % spots.length];
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: 0xd7e7f5, transparent: true, opacity: 0.09,
      depthWrite: false, blending: THREE.NormalBlending, fog: true
    }));
    const baseX = x + (random() - 0.5) * 8;
    const baseZ = z + (random() - 0.5) * 8;
    sprite.position.set(baseX, 0.45 + random() * 0.5, baseZ);
    sprite.scale.set(15 + random() * 11, 3 + random() * 2, 1);
    group.add(sprite);
    bands.push({ sprite, baseX, baseZ, phase: random() * Math.PI * 2, speed: 0.06 + random() * 0.07 });
  }
  return {
    group,
    update(time) {
      for (const band of bands) {
        band.sprite.position.x = band.baseX + Math.sin(time * band.speed + band.phase) * 3.2;
        band.sprite.position.z = band.baseZ + Math.cos(time * band.speed * 0.7 + band.phase) * 2.1;
      }
    }
  };
}

/** Sombra de contato suave, útil mesmo quando as sombras reais estão desligadas. */
export function buildContactShadow(x, z, width, depth, opacity = 0.3) {
  const material = new THREE.MeshBasicMaterial({
    map: createGlowTexture('#0a1631', 64), color: 0x0a1631,
    transparent: true, opacity, depthWrite: false, fog: true
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.035, z);
  return mesh;
}
