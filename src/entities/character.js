/** Personagem estilizado com fallback procedural e suporte opcional a GLB/GLTF. */
import * as THREE from 'three';
import { MATERIALS } from '../world/materials.js';
import { createGlowTexture, createStarGeometry } from '../core/utils.js';
import { getAffinity } from '../data/affinities.js';
import {
  CHARACTER_MODELS, ANIMATION_ALIASES, MATERIAL_SLOTS, ACCESSORY_NODES
} from '../core/model-manifest.js';
import { loadCharacterModel } from './model-loader.js';

const LIVY_APPEARANCE = {
  skin: '#fbf3ec',
  hair: '#5f3d2e',
  dress: '#2f5fb8',
  eyes: '#3f9b74',
  hairstyle: 'curls',
  accessory: 'star'
};

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const NORMALIZED_ANIMATION_ALIASES = Object.fromEntries(
  Object.entries(ANIMATION_ALIASES).map(([alias, names]) => [
    alias, names.map(normalizeName)
  ])
);

const NORMALIZED_MATERIAL_SLOTS = Object.fromEntries(
  Object.entries(MATERIAL_SLOTS).map(([slot, names]) => [
    slot, names.map(normalizeName)
  ])
);

function add(parent, geometry, material, x = 0, y = 0, z = 0) {
  const node = new THREE.Mesh(geometry, material);
  node.position.set(x, y, z);
  node.castShadow = true;
  node.receiveShadow = true;
  parent.add(node);
  return node;
}

export class CharacterModel {
  constructor(options = {}) {
    this.isLivy = Boolean(options.isLivy);
    this.appearance = { ...LIVY_APPEARANCE, ...(options.appearance || {}) };
    this.affinity = options.affinity || 'nature';
    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.externalRoot = new THREE.Group();
    this.externalRoot.visible = false;
    this.group.add(this.externalRoot);
    this.external = null;
    this.mixer = null;
    this._clips = new Map();
    this._actions = new Map();
    this._locomotion = null;
    this._locomotionAction = null;
    this._tempAction = null;
    this.time = Math.random() * 10;
    this.walkPhase = 0;
    this.action = null;
    this.actionTimer = 0;
    this.floatOffset = this.isLivy ? 0.12 : 0;
    this._materials = [];
    this._glowTexture = createGlowTexture('#ffffff', 64);
    this.rebuild();

    const url = CHARACTER_MODELS[this.isLivy ? 'livy' : 'player'];
    this.ready = url
      ? loadCharacterModel(url)
        .then((model) => {
          if (model) this._installExternal(model);
          return model;
        })
        .catch((error) => {
          console.warn('[Minha Noite] Modelo externo ignorado; mantendo fallback procedural.', error);
          return null;
        })
      : Promise.resolve(null);
  }

  get isExternal() {
    return Boolean(this.external);
  }

  _installExternal(model) {
    this.external = model;
    this.externalRoot.add(model.scene);
    this.externalRoot.visible = true;
    this.visual.visible = false;

    this.mixer = new THREE.AnimationMixer(model.scene);
    for (const [alias, names] of Object.entries(NORMALIZED_ANIMATION_ALIASES)) {
      const clip = model.animations.find((candidate) => {
        const clipName = normalizeName(candidate.name);
        return names.some((name) => clipName.includes(name));
      });
      if (!clip) continue;
      this._clips.set(alias, clip);
      const action = this.mixer.clipAction(clip);
      if (['jump', 'wave', 'dance', 'sit'].includes(alias)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this._actions.set(alias, action);
    }
    this._applyExternalAppearance();
    this._setLocomotion('idle', true);
  }

  _applyExternalAppearance() {
    if (!this.external) return;
    const colors = {
      skin: this.appearance.skin,
      hair: this.appearance.hair,
      dress: this.appearance.dress,
      eyes: this.appearance.eyes
    };
    this.external.scene.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        const name = normalizeName(material.name);
        const slot = Object.entries(NORMALIZED_MATERIAL_SLOTS)
          .find(([, names]) => names.some((candidate) => name.includes(candidate)))?.[0];
        if (!slot || !colors[slot]) return;
        material.color = new THREE.Color(colors[slot]);
        if (slot === 'eyes' && material.emissive) {
          material.emissive = new THREE.Color(colors[slot]);
          material.emissiveIntensity = Math.max(material.emissiveIntensity || 0, 0.12);
        }
        material.needsUpdate = true;
      });
    });

    const accessoryNodes = Object.values(ACCESSORY_NODES)
      .map((name) => this.external.scene.getObjectByName(name))
      .filter(Boolean);
    if (accessoryNodes.length === 0) return;
    const selected = ACCESSORY_NODES[this.appearance.accessory];
    accessoryNodes.forEach((node) => { node.visible = node.name === selected; });
  }

  _findAlias(name) {
    const normalized = normalizeName(name);
    return Object.entries(NORMALIZED_ANIMATION_ALIASES)
      .find(([, names]) => names.some((candidate) => normalized === candidate || normalized.includes(candidate)))?.[0]
      || null;
  }

  _setLocomotion(alias, immediate = false) {
    if (!this.mixer || this._tempAction) return;
    const next = this._actions.get(alias) || this._actions.get('idle');
    if (!next || next === this._locomotionAction) return;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.play();
    if (this._locomotionAction && this._locomotionAction !== next) {
      this._locomotionAction.crossFadeTo(next, immediate ? 0 : 0.25, false);
    }
    this._locomotion = alias;
    this._locomotionAction = next;
  }

  _mat(color, extra = {}) {
    const material = new THREE.MeshStandardMaterial({
      color, roughness: 0.72, metalness: 0.03, flatShading: true, ...extra
    });
    this._materials.push(material);
    return material;
  }

  rebuild() {
    this.visual.clear();
    this._materials.forEach((material) => material.dispose());
    this._materials = [];

    const a = this.appearance;
    // Rosto de porcelana: leve brilho fosco e um toque de luz fria para não apagar à noite.
    const skin = this._mat(a.skin, {
      roughness: 0.78, metalness: 0, emissive: 0x2b3247, emissiveIntensity: 0.06
    });
    const hairMat = this._mat(a.hair, { roughness: 0.92 });
    const hairShine = this._mat(new THREE.Color(a.hair).lerp(new THREE.Color(0xa97450), 0.34).getHex(), {
      roughness: 0.78, emissive: 0x2a1c14, emissiveIntensity: 0.05
    });
    const dressMat = this._mat(a.dress, { roughness: 0.58, emissive: 0x14264a, emissiveIntensity: 0.05 });
    const dressLight = this._mat(0xf4f1e8, { roughness: 0.66, emissive: 0x1a2c50, emissiveIntensity: 0.07 });
    const goldMat = this._mat(0xd8b66c, { metalness: 0.45, roughness: 0.38 });
    const eyeMat = this._mat(a.eyes, { roughness: 0.3, emissive: a.eyes, emissiveIntensity: 0.22 });
    const eyeLight = this._mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.2 });
    const shoeMat = this._mat(this.isLivy ? 0xf7f9ff : 0x3d3350);
    const dark = this._mat(0x27354e);

    // Pernas e sapatos
    this.legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.15, 0.62, 0);
      add(leg, new THREE.CapsuleGeometry(0.095, 0.36, 4, 8), skin, 0, -0.26, 0);
      add(leg, new THREE.SphereGeometry(0.13, 10, 8), shoeMat, 0, -0.52, 0.06);
      this.visual.add(leg);
      this.legs.push(leg);
    }

    // Saia em camadas
    const skirt = new THREE.Group();
    skirt.position.y = 0.98;
    add(skirt, new THREE.CylinderGeometry(0.25, 0.48, 0.5, 14, 1, true), dressMat, 0, -0.1, 0);
    add(skirt, new THREE.CylinderGeometry(0.34, 0.6, 0.42, 14, 1, true), dressLight, 0, -0.36, 0);
    const hem = add(skirt, new THREE.TorusGeometry(0.59, 0.022, 6, 24), goldMat, 0, -0.54, 0);
    hem.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dot = add(skirt, new THREE.SphereGeometry(0.028, 8, 6), goldMat,
        Math.cos(angle) * 0.47, -0.28, Math.sin(angle) * 0.47);
      dot.castShadow = false;
    }
    this.visual.add(skirt);
    this.skirt = skirt;

    // Corpo
    this.torso = new THREE.Group();
    this.torso.position.y = 1.02;
    add(this.torso, new THREE.CylinderGeometry(0.21, 0.27, 0.44, 12), dressMat, 0, 0.2, 0);
    add(this.torso, new THREE.CylinderGeometry(0.225, 0.225, 0.07, 12), goldMat, 0, 0.41, 0);
    add(this.torso, new THREE.CylinderGeometry(0.16, 0.21, 0.16, 12), dressLight, 0, 0.3, 0.12);
    add(this.torso, new THREE.SphereGeometry(0.055, 8, 6), goldMat, 0, 0.2, 0.235);

    // Braços e mangas
    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.29, 0.36, 0);
      add(arm, new THREE.CapsuleGeometry(0.075, 0.34, 4, 8), skin, 0, -0.22, 0);
      const sleeve = add(arm, new THREE.CylinderGeometry(0.16, 0.11, 0.24, 10), dressLight, 0, -0.04, 0);
      sleeve.rotation.z = side * 0.08;
      add(arm, new THREE.TorusGeometry(0.11, 0.018, 6, 14), goldMat, 0, -0.15, 0).rotation.x = Math.PI / 2;
      add(arm, new THREE.SphereGeometry(0.085, 10, 8), skin, 0, -0.45, 0);
      arm.rotation.z = side * 0.12;
      this.torso.add(arm);
      this.arms.push(arm);
    }
    this.visual.add(this.torso);

    // Cabeça
    this.head = new THREE.Group();
    this.head.position.y = 1.58;
    add(this.head, new THREE.SphereGeometry(0.31, 18, 14), skin);
    add(this.head, new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.02, 0.3);
    for (const side of [-1, 1]) {
      const eyeWhite = add(this.head, new THREE.SphereGeometry(0.062, 10, 8), dressLight, side * 0.12, 0.035, 0.275);
      eyeWhite.scale.set(1, 1.15, 0.5);
      const iris = add(this.head, new THREE.SphereGeometry(0.045, 10, 8), eyeMat, side * 0.12, 0.03, 0.305);
      iris.scale.set(1, 1.12, 0.5);
      add(this.head, new THREE.SphereGeometry(0.012, 6, 6), dark, side * 0.12, 0.03, 0.328);
      const catchlight = add(this.head, new THREE.SphereGeometry(0.011, 6, 6), eyeLight, side * 0.12 - 0.014, 0.055, 0.326);
      catchlight.castShadow = false;
      const lash = add(this.head, new THREE.BoxGeometry(0.12, 0.012, 0.012), hairMat, side * 0.12, 0.09, 0.285);
      lash.rotation.z = -side * 0.07;
      const brow = add(this.head, new THREE.BoxGeometry(0.1, 0.014, 0.014), hairMat, side * 0.12, 0.13, 0.28);
      brow.rotation.z = side * 0.08;
      add(this.head, new THREE.SphereGeometry(0.035, 8, 6), this._mat(0xe8a5a0, { transparent: true, opacity: 0.32 }), side * 0.2, -0.07, 0.245);
    }
    const mouth = add(this.head, new THREE.BoxGeometry(0.06, 0.012, 0.012), this._mat(0xb87870), 0, -0.115, 0.294);
    mouth.castShadow = false;
    this._buildHair(hairMat, hairShine);
    this.visual.add(this.head);

    // Acessório
    this._buildAccessory(goldMat);

    // Pontos luminosos nas articulações (mais visíveis na Livy)
    this.joints = [];
    const jointMaterial = this._mat(this.isLivy ? 0xf6dfae : getAffinity(this.affinity).color, {
      emissive: this.isLivy ? 0xf6dfae : getAffinity(this.affinity).color,
      emissiveIntensity: 1.8
    });
    for (const [x, y, z] of [[-0.3, 1.2, 0], [0.3, 1.2, 0], [-0.15, 0.62, 0], [0.15, 0.62, 0]]) {
      const joint = add(this.visual, new THREE.SphereGeometry(this.isLivy ? 0.035 : 0.022, 8, 6), jointMaterial, x, y, z);
      joint.castShadow = false;
      this.joints.push(joint);
    }

    // Aura da afinidade
    const affinityColor = new THREE.Color(getAffinity(this.affinity).color);
    const auraMaterial = new THREE.PointsMaterial({
      color: affinityColor, size: 0.07, map: this._glowTexture, transparent: true,
      opacity: this.isLivy ? 0.45 : 0.55, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const auraCount = this.isLivy ? 18 : 26;
    const auraPositions = new Float32Array(auraCount * 3);
    for (let i = 0; i < auraCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.45 + Math.random() * 0.35;
      auraPositions[i * 3] = Math.cos(angle) * radius;
      auraPositions[i * 3 + 1] = 0.3 + Math.random() * 1.5;
      auraPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const auraGeo = new THREE.BufferGeometry();
    auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    this.aura = new THREE.Points(auraGeo, auraMaterial);
    this.visual.add(this.aura);

    if (this.isLivy) this._buildMarionetteStrings(dark);

    this.visual.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  }

  _buildHair(hairMat, hairShine) {
    const style = this.appearance.hairstyle;
    const hair = new THREE.Group();
    add(hair, new THREE.SphereGeometry(0.325, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, 0, 0.04, 0);
    // Mechas claras muito sutis dão volume sem mudar a cor dos cabelos.
    for (let i = 0; i < 4; i++) {
      const strand = add(hair, new THREE.SphereGeometry(0.055, 8, 6), hairShine,
        -0.2 + i * 0.13, 0.28 + (i % 2) * 0.015, 0.15);
      strand.scale.set(0.6, 0.35, 1);
      strand.castShadow = false;
    }
    if (style === 'curls') {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          add(hair, new THREE.SphereGeometry(0.13 - i * 0.012, 10, 8), hairMat,
            side * (0.28 + i * 0.015), 0.1 - i * 0.18, -0.05 - i * 0.02);
          const highlight = add(hair, new THREE.SphereGeometry(0.055 - i * 0.006, 8, 6), hairShine,
            side * (0.3 + i * 0.015), 0.13 - i * 0.18, 0.03);
          highlight.castShadow = false;
        }
      }
      for (let i = 0; i < 5; i++) {
        add(hair, new THREE.SphereGeometry(0.12, 10, 8), hairMat,
          -0.24 + i * 0.12, 0.24 + (i % 2) * 0.02, 0.2);
      }
    } else if (style === 'braid') {
      for (let i = 0; i < 6; i++) {
        add(hair, new THREE.SphereGeometry(0.13 - i * 0.012, 10, 8), hairMat,
          0, 0 - i * 0.15, -0.28 - i * 0.015);
      }
      add(hair, new THREE.TorusGeometry(0.07, 0.02, 6, 12), MATERIALS.goldBright, 0, -0.9, -0.36);
    } else {
      const bob = add(hair, new THREE.SphereGeometry(0.35, 16, 12), hairMat, 0, -0.09, -0.03);
      bob.scale.set(1, 0.78, 0.92);
      for (const side of [-1, 1]) {
        add(hair, new THREE.SphereGeometry(0.1, 10, 8), hairMat, side * 0.26, -0.2, 0.12);
      }
    }
    this.hair = hair;
    this.head.add(hair);
  }

  _buildAccessory(goldMat) {
    const accessory = new THREE.Group();
    accessory.position.set(0, 1.06, 0.26);
    const type = this.appearance.accessory;
    if (type === 'star') {
      const star = add(accessory, createStarGeometry(0.085, 0.038, 5), MATERIALS.goldBright, 0, 0, 0.01);
      star.castShadow = false;
    } else if (type === 'moon') {
      const moon = add(accessory, new THREE.TorusGeometry(0.065, 0.016, 6, 18, Math.PI * 1.35), MATERIALS.goldBright);
      moon.rotation.z = -0.6;
    } else {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const petal = add(accessory, new THREE.SphereGeometry(0.045, 8, 6), MATERIALS.flower[2],
          Math.cos(angle) * 0.055, Math.sin(angle) * 0.055, 0);
        petal.scale.z = 0.4;
      }
      add(accessory, new THREE.SphereGeometry(0.035, 8, 6), goldMat, 0, 0, 0.02);
    }
    this.accessory = accessory;
    this.torso.add(accessory);
  }

  _buildMarionetteStrings(material) {
    const points = [
      new THREE.Vector3(-0.5, 3.2, 0), new THREE.Vector3(-0.3, 1.2, 0),
      new THREE.Vector3(0.5, 3.2, 0), new THREE.Vector3(0.3, 1.2, 0),
      new THREE.Vector3(-0.5, 3.2, 0), new THREE.Vector3(-0.15, 0.65, 0),
      new THREE.Vector3(0.5, 3.2, 0), new THREE.Vector3(0.15, 0.65, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.strings = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0xe9d4a0, transparent: true, opacity: 0.16, depthWrite: false
    }));
    this.visual.add(this.strings);
  }

  setAffinity(id) {
    this.affinity = id;
    if (this.external) return;
    this.rebuild();
  }

  setAppearance(appearance) {
    this.appearance = { ...this.appearance, ...appearance };
    if (this.external) {
      this._applyExternalAppearance();
      return;
    }
    this.rebuild();
  }

  playAction(name, duration = 1.6) {
    this.action = name;
    this.actionTimer = duration;
    if (!this.mixer) return;

    const alias = this._findAlias(name);
    const action = this._actions.get(alias);
    if (!action) return;
    if (this._tempAction && this._tempAction !== action) this._tempAction.stop();
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1);
    action.play();
    if (this._locomotionAction && this._locomotionAction !== action) {
      this._locomotionAction.crossFadeTo(action, 0.15, false);
    }
    this._tempAction = action;
  }

  _updateExternal(dt, state = {}) {
    const speed = Math.min(1, state.speed || 0);
    this.externalRoot.position.y = this.isLivy
      ? Math.sin(this.time * 1.2) * 0.05 + this.floatOffset * 0.7
      : 0;

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0) {
        this.action = null;
        if (this._tempAction) {
          this._tempAction.fadeOut(0.25);
          this._tempAction = null;
          this._locomotionAction = null;
        }
      }
    }

    if (!this._tempAction) {
      const desired = !state.grounded ? 'jump'
        : speed > 0.7 ? 'run'
          : speed > 0.08 ? 'walk' : 'idle';
      this._setLocomotion(desired);
    }

    this.mixer?.update(dt);
  }

  update(dt, state = {}) {
    this.time += dt;
    if (this.external) {
      this._updateExternal(dt, state);
      return;
    }
    const speed = Math.min(1, state.speed || 0);
    this.walkPhase += dt * (4 + speed * 6) * (0.25 + speed);

    const idleBob = Math.sin(this.time * 1.7) * 0.012;
    const walkBob = Math.abs(Math.sin(this.walkPhase)) * 0.035 * speed;
    const float = this.isLivy ? Math.sin(this.time * 1.2) * 0.06 + this.floatOffset : 0;

    this.visual.position.y = idleBob + walkBob + float;
    this.visual.rotation.z = Math.sin(this.walkPhase) * 0.02 * speed;
    this.torso.rotation.y = Math.sin(this.walkPhase * 0.5) * 0.06 * speed;
    this.head.rotation.y = Math.sin(this.time * 0.7) * 0.09 * (1 - speed);
    this.head.rotation.x = Math.sin(this.time * 0.5) * 0.04;

    const swing = Math.sin(this.walkPhase) * 0.55 * speed;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.7;
    this.arms[1].rotation.x = swing * 0.7;
    this.arms[0].rotation.z = -0.12;
    this.arms[1].rotation.z = 0.12;

    if (!state.grounded) {
      this.legs[0].rotation.x = -0.35;
      this.legs[1].rotation.x = 0.25;
      this.arms[0].rotation.x = -0.6;
      this.arms[1].rotation.x = -0.6;
    }

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      const progress = 1 - Math.max(0, this.actionTimer) / 1.6;
      if (this.action === 'wave') {
        this.arms[1].rotation.z = 0.12 + Math.sin(progress * Math.PI * 6) * 0.9 + 1.1;
        this.arms[1].rotation.x = -0.2;
      } else if (this.action === 'dance') {
        this.visual.rotation.z = Math.sin(this.time * 8) * 0.14;
        this.arms[0].rotation.z = -1.4 + Math.sin(this.time * 6) * 0.3;
        this.arms[1].rotation.z = 1.4 - Math.sin(this.time * 6) * 0.3;
        this.visual.position.y += Math.abs(Math.sin(this.time * 8)) * 0.08;
      } else if (this.action === 'sit') {
        this.visual.position.y -= 0.34;
        this.legs.forEach((leg) => { leg.rotation.x = -1.25; });
      }
      if (this.actionTimer <= 0) this.action = null;
    }

    if (this.aura) {
      this.aura.rotation.y += dt * 0.25;
      this.aura.position.y = Math.sin(this.time) * 0.05;
    }
  }
}
