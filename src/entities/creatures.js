/** Criaturas e pequenos seres do mundo (recursos provisórios). */
import * as THREE from 'three';
import { MATERIALS } from '../world/materials.js';
import { seededRandom } from '../core/utils.js';

function mesh(parent, geometry, material, x, y, z, scale) {
  const node = new THREE.Mesh(geometry, material);
  node.position.set(x, y, z);
  if (scale) node.scale.set(...scale);
  node.castShadow = true;
  parent.add(node);
  return node;
}

export class Butterflies {
  constructor(count, bounds, seed = 21) {
    this.group = new THREE.Group();
    this.items = [];
    const random = seededRandom(seed);
    const wingGeometry = new THREE.PlaneGeometry(0.18, 0.13);
    const colors = [0xf6dfae, 0xb9a6e8, 0xf3b8cf, 0x9ed8f0];
    for (let i = 0; i < count; i++) {
      const butterfly = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length], side: THREE.DoubleSide,
        emissive: colors[i % colors.length], emissiveIntensity: 0.35, roughness: 0.7
      });
      const left = mesh(butterfly, wingGeometry, material, -0.09, 0, 0);
      const right = mesh(butterfly, wingGeometry, material, 0.09, 0, 0);
      butterfly.position.set(
        bounds.minX + random() * (bounds.maxX - bounds.minX),
        0.7 + random() * 2.6,
        bounds.minZ + random() * (bounds.maxZ - bounds.minZ)
      );
      this.group.add(butterfly);
      this.items.push({
        node: butterfly, left, right,
        origin: butterfly.position.clone(),
        phase: random() * 10,
        speed: 0.3 + random() * 0.35,
        radius: 0.5 + random() * 1.6
      });
    }
  }

  update(dt, time) {
    for (const item of this.items) {
      const flap = Math.sin(time * 12 + item.phase);
      item.left.rotation.y = 0.5 + flap * 0.9;
      item.right.rotation.y = -0.5 - flap * 0.9;
      item.node.position.x = item.origin.x + Math.sin(time * item.speed + item.phase) * item.radius;
      item.node.position.y = item.origin.y + Math.sin(time * 0.8 + item.phase) * 0.28;
      item.node.position.z = item.origin.z + Math.cos(time * item.speed * 0.7 + item.phase) * item.radius;
      item.node.rotation.y = time * item.speed + item.phase;
    }
    void dt;
  }
}

export class Fireflies {
  constructor(count, bounds, seed = 77) {
    this.count = count;
    this.bounds = bounds;
    const random = seededRandom(seed);
    this.positions = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = bounds.minX + random() * (bounds.maxX - bounds.minX);
      this.positions[i * 3 + 1] = 0.4 + random() * 3.2;
      this.positions[i * 3 + 2] = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
      this.seeds[i] = random() * 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(geometry, MATERIALS.firefly.clone());
    this.points.frustumCulled = false;
  }

  update(dt, time, nightFactor = 1) {
    this.points.material.opacity = 0.15 + nightFactor * 0.8;
    if (nightFactor < 0.05) return;
    const array = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const seed = this.seeds[i];
      array[i * 3] += Math.sin(time * 0.45 + seed) * dt * 0.28;
      array[i * 3 + 1] += Math.sin(time * 1.2 + seed * 2) * dt * 0.12;
      array[i * 3 + 2] += Math.cos(time * 0.38 + seed) * dt * 0.28;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    void dt;
  }
}

export class Creature {
  constructor(type, x, z, seed = 1) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.home = new THREE.Vector3(x, 0, z);
    this.phase = seed * 0.7;
    this.radius = 1.4 + (seed % 5) * 0.3;
    this.speed = 0.18 + (seed % 7) * 0.02;
    this._build(type);
  }

  _build(type) {
    const bodyMaterial = type === 'fox' || type === 'foxLight'
      ? new THREE.MeshStandardMaterial({
          color: type === 'fox' ? 0xd98a63 : 0xf6dfae,
          emissive: type === 'foxLight' ? 0xd9ad55 : 0x000000,
          emissiveIntensity: type === 'foxLight' ? 0.55 : 0, roughness: 0.85, flatShading: true
        })
      : type === 'deer'
        ? new THREE.MeshStandardMaterial({ color: 0xa87b57, roughness: 0.9, flatShading: true })
        : new THREE.MeshStandardMaterial({ color: 0xe7e2d8, roughness: 0.9, flatShading: true });

    const bodyY = type === 'deer' ? 0.85 : 0.48;
    const body = mesh(this.group, new THREE.SphereGeometry(type === 'deer' ? 0.5 : 0.36, 12, 9), bodyMaterial, 0, bodyY, 0);
    body.scale.set(1.25, 0.78, 1.65);

    const headY = type === 'deer' ? 1.32 : 0.78;
    const head = mesh(this.group, new THREE.SphereGeometry(0.24, 12, 9), bodyMaterial, 0, headY, 0.42);
    head.scale.set(1, 0.95, 1.1);

    for (const side of [-1, 1]) {
      if (type === 'fox' || type === 'foxLight') {
        const ear = mesh(this.group, new THREE.ConeGeometry(0.11, 0.26, 5), bodyMaterial, side * 0.14, headY + 0.24, 0.4);
        ear.rotation.z = side * 0.15;
      } else if (type === 'deer') {
        const antler = mesh(this.group, new THREE.CylinderGeometry(0.018, 0.03, 0.42, 5), MATERIALS.woodDark, side * 0.11, headY + 0.33, 0.36);
        antler.rotation.z = side * 0.35;
        mesh(this.group, new THREE.CylinderGeometry(0.014, 0.02, 0.24, 5), MATERIALS.woodDark, side * 0.2, headY + 0.58, 0.36).rotation.z = side * 0.6;
      } else {
        const ear = mesh(this.group, new THREE.CapsuleGeometry(0.055, 0.18, 3, 6), bodyMaterial, side * 0.13, headY + 0.2, 0.38);
        ear.rotation.z = side * 0.25;
      }
      mesh(this.group, new THREE.SphereGeometry(0.03, 6, 5), MATERIALS.stoneDark, side * 0.1, headY + 0.02, 0.62);
    }

    this.legs = [];
    const legHeight = type === 'deer' ? 0.62 : 0.34;
    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const leg = mesh(this.group, new THREE.CapsuleGeometry(0.045, legHeight, 3, 6), bodyMaterial,
          side * 0.2, legHeight / 2 + 0.02, front * 0.3);
        this.legs.push(leg);
      }
    }

    if (type === 'fox' || type === 'foxLight') {
      const tail = mesh(this.group, new THREE.CapsuleGeometry(0.14, 0.46, 4, 8), bodyMaterial, 0, bodyY + 0.1, -0.55);
      tail.rotation.x = -0.9;
      this.tail = tail;
    }
    if (type === 'foxLight') {
      const glow = new THREE.PointLight(0xf6dfae, 0.7, 5);
      glow.position.set(0, 1, 0);
      this.group.add(glow);
    }
  }

  update(dt, time) {
    const angle = time * this.speed + this.phase;
    const x = this.home.x + Math.cos(angle) * this.radius;
    const z = this.home.z + Math.sin(angle * 0.8) * this.radius;
    const direction = Math.atan2(x - this.group.position.x, z - this.group.position.z);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = direction;
    const step = Math.sin(time * (this.type === 'deer' ? 4 : 7) + this.phase);
    this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * 6 + i * 1.6) * 0.25 * step; });
    if (this.tail) this.tail.rotation.z = Math.sin(time * 2 + this.phase) * 0.25;
    void dt;
  }
}
