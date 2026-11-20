/** Primeira região: Floresta Encantada. */
import * as THREE from 'three';
import { MATERIALS } from './materials.js';
import { seededRandom, createGlowTexture, createStarTexture, createLabelSprite } from '../core/utils.js';
import { buildDistantTrees, buildMistBands } from './atmosphere.js';
import { Butterflies, Fireflies, Creature } from '../entities/creatures.js';
import { WORLD_PROPS } from '../core/model-manifest.js';
import { attachWorldProps } from '../entities/model-loader.js';

const BOUNDS = { minX: -78, maxX: 78, minZ: -78, maxZ: 78 };

function ribbon(curve, width, heightAt, lift = 0.03, steps = 90) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2);
    const left = point.clone().add(side);
    const right = point.clone().sub(side);
    positions.push(left.x, heightAt(left.x, left.z) + lift, left.z);
    positions.push(right.x, heightAt(right.x, right.z) + lift, right.z);
    uvs.push(0, t * 6, 1, t * 6);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class ForestWorld {
  constructor(game, quality) {
    this.game = game;
    this.quality = quality;
    this.id = 'forest';
    this.label = 'Floresta Encantada';
    this.group = new THREE.Group();
    this.interactables = [];
    this.collectibles = new Map();
    this.animations = [];
    this.occluders = [];
    this.random = seededRandom(4821);

    this.heightAt = (x, z) => Math.sin(x * 0.055) * 0.26 * Math.cos(z * 0.045) + Math.sin(z * 0.09) * 0.08;

    this._buildGround();
    this._buildPathsAndWater();
    this._buildTrees();
    this._buildAtmosphere();
    this._buildUndergrowth();
    this._buildRuins();
    this._buildCreatures();
    this._buildCollectibles();
    this._buildPortal();
    this._buildSigns();
    attachWorldProps(this.group, WORLD_PROPS.forest);

    const spawn = new THREE.Vector3(0, this.heightAt(0, 16), 16);
    this.spawn = spawn;
  }

  _buildGround() {
    const geometry = new THREE.PlaneGeometry(200, 200, 72, 72);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const colors = [];
    const base = new THREE.Color(0x3f6f56);
    const alt = new THREE.Color(0x2f5d4a);
    const light = new THREE.Color(0x5b8a66);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, this.heightAt(x, z));
      const variation = (Math.sin(x * 0.13) + Math.cos(z * 0.17)) * 0.25 + 0.5;
      const color = base.clone().lerp(alt, variation).lerp(light, Math.max(0, this.heightAt(x, z)) * 0.6);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0
    }));
    ground.receiveShadow = true;
    this.group.add(ground);

    // Borda de árvores mais escura para enquadrar a região.
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(74, 105, 48),
      new THREE.MeshStandardMaterial({ color: 0x1e4737, roughness: 1, side: THREE.DoubleSide })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = -0.08;
    this.group.add(edge);
  }

  _buildPathsAndWater() {
    const mainPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 20), new THREE.Vector3(2, 0, 9),
      new THREE.Vector3(-4, 0, -2), new THREE.Vector3(-9, 0, -14),
      new THREE.Vector3(-3, 0, -26), new THREE.Vector3(8, 0, -34),
      new THREE.Vector3(16, 0, -42)
    ]);
    const path = new THREE.Mesh(ribbon(mainPath, 3.3, this.heightAt, 0.035), MATERIALS.path.clone());
    path.material.map = this._pathTexture();
    path.receiveShadow = true;
    this.group.add(path);

    const secretPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3, 0, -26), new THREE.Vector3(-14, 0, -30),
      new THREE.Vector3(-22, 0, -39), new THREE.Vector3(-20, 0, -50)
    ]);
    this.group.add(new THREE.Mesh(ribbon(secretPath, 2, this.heightAt, 0.03), MATERIALS.pathLight.clone()));

    const stream = new THREE.CatmullRomCurve3([
      new THREE.Vector3(26, 0, -60), new THREE.Vector3(20, 0, -44),
      new THREE.Vector3(13, 0, -30), new THREE.Vector3(8, 0, -16),
      new THREE.Vector3(16, 0, -2), new THREE.Vector3(30, 0, 12)
    ]);
    const water = new THREE.Mesh(ribbon(stream, 4.4, this.heightAt, 0.055, 120), MATERIALS.water.clone());
    water.material.side = THREE.DoubleSide;
    this.group.add(water);
    this.waterMaterial = water.material;

    // Cachoeira pequena no trecho alto do riacho.
    const waterfallTexture = this._waterfallTexture();
    const waterfall = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 5.2),
      new THREE.MeshStandardMaterial({
        map: waterfallTexture, transparent: true, opacity: 0.85,
        emissive: 0x6fb7d8, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.4
      })
    );
    waterfall.position.set(25, 2.6, -59);
    waterfall.rotation.y = 0.5;
    this.group.add(waterfall);
    this.animations.push((dt) => { waterfallTexture.offset.y -= dt * 0.55; });

    const mistTexture = createGlowTexture('#dff4ff', 64);
    const mistCount = 28;
    const mistPositions = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      mistPositions[i * 3] = 25 + (this.random() - 0.5) * 5;
      mistPositions[i * 3 + 1] = this.random() * 1.4;
      mistPositions[i * 3 + 2] = -59 + (this.random() - 0.5) * 4;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({
      map: mistTexture, color: 0xe9f6ff, size: 1.4, transparent: true, opacity: 0.35,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.group.add(mist);
  }

  _pathTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c3b590';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(120,105,80,0.25)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(this.random() * 64, this.random() * 64, 1 + this.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _waterfallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(${200 + this.random() * 55}, ${230 + this.random() * 25}, 255, ${0.15 + this.random() * 0.5})`;
      ctx.lineWidth = 1 + this.random() * 3;
      const x = this.random() * 128;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (this.random() - 0.5) * 8, 256);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _buildTrees() {
    const count = this.quality.trees;
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.52, 5.4, 7);
    const canopyGeometry = new THREE.IcosahedronGeometry(1.7, 0);
    const trunks = new THREE.InstancedMesh(trunkGeometry, MATERIALS.bark, count);
    const canopies = new THREE.InstancedMesh(canopyGeometry, MATERIALS.leaf[0], count * 3);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let canopyIndex = 0;

    for (let i = 0; i < count; i++) {
      let x = (this.random() - 0.5) * 150;
      let z = (this.random() - 0.5) * 150;
      // Não colocar árvores em cima do caminho principal.
      if (Math.abs(x) < 5 && z > -46 && z < 24) x += x < 0 ? -7 : 7;
      const scale = 0.75 + this.random() * 0.7;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y + 2.4 * scale, z);
      dummy.rotation.set(0, this.random() * Math.PI, (this.random() - 0.5) * 0.08);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      color.setHex(i % 3 === 0 ? 0x604634 : 0x4e3a2d);
      trunks.setColorAt(i, color);

      for (let j = 0; j < 3; j++) {
        dummy.position.set(x + (this.random() - 0.5) * 2.2, y + (4.4 + j * 0.8) * scale, z + (this.random() - 0.5) * 2.2);
        dummy.rotation.set(this.random(), this.random() * 3, this.random() * 0.4);
        const s = (1.25 - j * 0.18) * scale;
        dummy.scale.set(s, s * 0.82, s);
        dummy.updateMatrix();
        canopies.setMatrixAt(canopyIndex, dummy.matrix);
        color.setHex([0x3c7d5c, 0x4f9069, 0x2f6b58, 0x6aa07a][Math.floor(this.random() * 4)]);
        canopies.setColorAt(canopyIndex, color);
        canopyIndex++;
      }
    }
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    canopies.castShadow = true;
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.group.add(trunks, canopies);

    // Árvores antigas e gigantes com raízes, vinhas e lanternas.
    const giants = [
      [-13, -8], [11, -25], [-20, -45], [24, -18], [-6, 8]
    ];
    for (const [x, z] of giants) {
      const tree = new THREE.Group();
      tree.position.set(x, this.heightAt(x, z), z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, 12, 9), MATERIALS.barkLight);
      trunk.position.y = 6;
      trunk.castShadow = true;
      tree.add(trunk);
      this.occluders.push(trunk);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 2.4, 3, 6), MATERIALS.bark);
        root.position.set(Math.cos(angle) * 1.7, 0.35, Math.sin(angle) * 1.7);
        root.rotation.set(Math.PI / 2 - 0.35, -angle, 0);
        tree.add(root);
      }
      for (let i = 0; i < 4; i++) {
        const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2 - i * 0.25, 1), MATERIALS.leaf[i % MATERIALS.leaf.length]);
        canopy.position.set((this.random() - 0.5) * 3, 11 + i * 0.6, (this.random() - 0.5) * 3);
        canopy.castShadow = true;
        tree.add(canopy);
      }
      for (let i = 0; i < 4; i++) {
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3 + this.random() * 2, 5), MATERIALS.moss);
        vine.position.set((this.random() - 0.5) * 3, 8.5, (this.random() - 0.5) * 3);
        tree.add(vine);
      }
      const lantern = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createGlowTexture('#f6dfae', 64), color: 0xf6dfae, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      lantern.position.set(1.4, 4.5, 0.8);
      lantern.scale.set(1.1, 1.1, 1);
      tree.add(lantern);
      this.group.add(tree);
    }
  }

  _buildAtmosphere() {
    this.group.add(buildDistantTrees({
      random: this.random, quality: this.quality,
      minRadius: 84, maxRadius: 108, heightAt: this.heightAt
    }));

    const mist = buildMistBands({
      random: this.random,
      quality: this.quality,
      spots: [[0, 6], [-6, -14], [-16, -34], [12, -28], [22, -46], [-24, 8], [6, -46]]
    });
    this.group.add(mist.group);
    let mistTime = 0;
    this.animations.push((dt) => {
      mistTime += dt;
      mist.update(mistTime);
    });
  }

  _buildUndergrowth() {
    // Oscilação no vertex shader: nenhum custo de CPU por planta.
    this._swayUniform = { value: 0 };
    const swayMaterial = (source, amount) => {
      const material = source.clone();
      const key = `sway-${amount}`;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uSwayTime = this._swayUniform;
        shader.vertexShader = `uniform float uSwayTime;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float swayPhase = instanceMatrix[3].x * 0.34 + instanceMatrix[3].z * 0.21;
             float swayAmount = max(transformed.y, 0.0) * ${amount.toFixed(3)};
             transformed.x += sin(uSwayTime * 1.15 + swayPhase) * swayAmount;
             transformed.z += cos(uSwayTime * 0.92 + swayPhase) * swayAmount * 0.7;
           #endif`
        );
      };
      material.customProgramCacheKey = () => key;
      return material;
    };

    const grass = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.075, 0.42, 3), swayMaterial(MATERIALS.leaf[2], 0.055), this.quality.grass
    );
    const flowers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.13, 7, 5), swayMaterial(MATERIALS.flower[0], 0.022), this.quality.flowers
    );
    const stems = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.32, 4), swayMaterial(MATERIALS.moss, 0.03), this.quality.flowers
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < this.quality.grass; i++) {
      const x = (this.random() - 0.5) * 150;
      const z = (this.random() - 0.5) * 150;
      dummy.position.set(x, this.heightAt(x, z) + 0.2, z);
      dummy.rotation.set((this.random() - 0.5) * 0.3, this.random() * 3, (this.random() - 0.5) * 0.3);
      const s = 0.6 + this.random() * 1.1;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      color.setHex([0x4f9069, 0x6aa07a, 0x3f7d5c][Math.floor(this.random() * 3)]);
      grass.setColorAt(i, color);
    }
    for (let i = 0; i < this.quality.flowers; i++) {
      const x = (this.random() - 0.5) * 130;
      const z = (this.random() - 0.5) * 130;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y + 0.16, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.7 + this.random() * 0.8);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.38;
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      color.setHex([0xf6dfae, 0xb9a6e8, 0xf3b8cf, 0xffffff][Math.floor(this.random() * 4)]);
      flowers.setColorAt(i, color);
    }
    grass.instanceMatrix.needsUpdate = true;
    flowers.instanceMatrix.needsUpdate = true;
    stems.instanceMatrix.needsUpdate = true;
    this.group.add(grass, stems, flowers);

    // Cogumelos em jardins escondidos.
    const gardens = [[-18, -38], [14, -27], [-24, 12], [30, -8]];
    for (const [gx, gz] of gardens) {
      for (let i = 0; i < 7; i++) {
        const x = gx + (this.random() - 0.5) * 5;
        const z = gz + (this.random() - 0.5) * 5;
        const y = this.heightAt(x, z);
        const mushroom = new THREE.Group();
        mushroom.position.set(x, y, z);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6), MATERIALS.white);
        stem.position.y = 0.2;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2),
          MATERIALS.mushroom[Math.floor(this.random() * 3)]);
        cap.position.y = 0.4;
        cap.scale.y = 0.65;
        mushroom.add(stem, cap);
        for (let j = 0; j < 3; j++) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), MATERIALS.goldBright);
          const angle = this.random() * Math.PI * 2;
          dot.position.set(Math.cos(angle) * 0.18, 0.5, Math.sin(angle) * 0.18);
          mushroom.add(dot);
        }
        this.group.add(mushroom);
      }
    }
  }

  _buildRuins() {
    const ruins = new THREE.Group();
    ruins.position.set(16, this.heightAt(16, -43), -43);
    for (const x of [-2.2, 2.2]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.4, 8), MATERIALS.stone);
      column.position.set(x, 2.2, 0);
      column.castShadow = true;
      ruins.add(column);
      const moss = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 5, 12), MATERIALS.moss);
      moss.position.set(x, 2.6, 0);
      moss.rotation.x = Math.PI / 2;
      ruins.add(moss);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 0.9), MATERIALS.stoneDark);
    arch.position.y = 4.6;
    arch.castShadow = true;
    ruins.add(arch);
    for (let i = 0; i < 6; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.7 + this.random(), 0.5, 0.8),
        i % 2 ? MATERIALS.stone : MATERIALS.stoneDark);
      block.position.set((this.random() - 0.5) * 7, 0.25, 1.5 + this.random() * 2);
      block.rotation.y = this.random();
      ruins.add(block);
    }
    const book = new THREE.Group();
    book.position.set(0, 0.55, 1.2);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.45), MATERIALS.roofBlue);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.4), MATERIALS.white);
    pages.position.y = 0.07;
    book.add(cover, pages);
    ruins.add(book);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture('#f6dfae', 64), color: 0xf6dfae, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
    }));
    glow.position.set(0, 1.1, 1.2);
    glow.scale.set(1.6, 1.6, 1);
    ruins.add(glow);
    this.group.add(ruins);

    this.interactables.push({
      id: 'ruin-book',
      label: 'Ler o livro nas ruínas',
      position: new THREE.Vector3(16, 0.5, -41.8),
      radius: 2.6,
      action: (game) => game.showDialogue('Livy', [
        'O livro está aberto numa página sobre estrelas que caem.',
        'Algumas linhas foram apagadas pelo tempo. Talvez a Livy saiba mais.'
      ])
    });
  }

  _buildCreatures() {
    const bounds = { minX: -55, maxX: 55, minZ: -55, maxZ: 35 };
    this.butterflies = new Butterflies(14, bounds, 31);
    this.group.add(this.butterflies.group);
    this.fireflies = new Fireflies(this.quality.fireflies, bounds, 12);
    this.group.add(this.fireflies.points);

    const animals = [
      new Creature('fox', -8, -19, 1),
      new Creature('foxLight', -21, -42, 4),
      new Creature('deer', 12, -34, 3),
      new Creature('bunny', 4, 6, 6),
      new Creature('bunny', 18, -12, 9)
    ];
    this.creatures = animals;
    animals.forEach((animal) => this.group.add(animal.group));

    this.interactables.push({
      id: 'fox-light',
      label: 'Cumprimentar a raposa luminosa',
      position: new THREE.Vector3(-21, 0, -42),
      radius: 3.2,
      action: (game) => {
        game.discoverCreature('foxLight', 'Raposa Luminosa');
        game.showDialogue('Livy', [
          'Uma raposa luminosa te observa de longe. Ela não tem medo, só está curiosa.',
          'Você a cumprimenta com um gesto tranquilo.'
        ]);
      }
    });

    this.interactables.push({
      id: 'secret-roots',
      label: 'Investigar as raízes',
      position: new THREE.Vector3(-20, 0, -49),
      radius: 2.8,
      action: (game) => {
        if (game.save.flags.forestSecret) {
          game.toast('Você já encontrou este caminho.');
          return;
        }
        game.save.flags.forestSecret = true;
        game.save.memories.push({
          id: 'secret-roots',
          title: 'Caminho entre raízes',
          description: 'Um segredo pequeno, guardado na Floresta Encantada.',
          date: new Date().toISOString(),
          colors: ['#2f5fb8', '#d9ad55']
        });
        game.requestSave();
        game.showDialogue('Livy', [
          'Você encontrou um caminho escondido atrás das raízes.',
          'Não é muito, mas já é um segredo seu. Vou guardar isto no museu.'
        ]);
        game.refreshUI();
      }
    });
  }

  _buildCollectibles() {
    const spots = [
      { id: 'flower-luminosa', label: 'Flor luminosa', x: -3.5, z: -3.5, required: true },
      { id: 'flor-da-serra', label: 'Flor da serra', x: 14, z: -30 },
      { id: 'orvalho-do-riacho', label: 'Orvalho do riacho', x: 22, z: -24 },
      { id: 'flor-do-caminho-antigo', label: 'Flor do caminho antigo', x: -17, z: -38 },
      { id: 'estrela-caida', label: 'Pequena estrela caída', x: 16, z: -44 },
      { id: 'flor-do-jardim', label: 'Flor do jardim escondido', x: -24, z: 11 }
    ];
    const textureCache = new Map();
    for (const spot of spots) {
      const group = new THREE.Group();
      group.position.set(spot.x, this.heightAt(spot.x, spot.z) + 0.7, spot.z);
      if (!textureCache.has(spot.id)) textureCache.set(spot.id, createStarTexture('#f6dfae', 128));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textureCache.get(spot.id), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending
      }));
      sprite.scale.set(0.85, 0.85, 1);
      group.add(sprite);
      const halo = new THREE.PointLight(0xf6dfae, 0.45, 4);
      group.add(halo);
      this.group.add(group);
      const record = { ...spot, group, sprite, baseY: group.position.y, phase: this.random() * 10 };
      this.collectibles.set(spot.id, record);
      this.interactables.push({
        id: `collect-${spot.id}`,
        label: `Colher ${spot.label}`,
        position: new THREE.Vector3(spot.x, 0, spot.z),
        radius: 2.2,
        action: (game) => {
          if (game.save.inventory.collected.includes(spot.id)) {
            game.toast('Você já colheu isso.');
            return;
          }
          game.collectItem({
            id: spot.id,
            name: spot.label,
            kind: 'flor',
            rarity: spot.required ? 'comum' : 'rara',
            icon: '✿'
          });
          group.visible = false;
          game.toast(`${spot.label} adicionada ao inventário`, true);
          game.markQuestStep('collect', true);
        }
      });
    }
    this.applyCollected(this.game.save.inventory.collected);
  }

  _buildPortal() {
    const portal = new THREE.Group();
    portal.position.set(0, this.heightAt(0, 20) + 0.1, 21);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 10, 32), MATERIALS.gold);
    ring.position.y = 2.2;
    portal.add(ring);
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({
      color: 0x7ea8e8, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false
    }));
    swirl.position.y = 2.2;
    portal.add(swirl);
    const label = createLabelSprite('Portal da Vila');
    label.position.y = 4.1;
    portal.add(label);
    const light = new THREE.PointLight(0x8fc7ff, 0.9, 9);
    light.position.y = 2.2;
    portal.add(light);
    this.group.add(portal);
    this.portalSwirl = swirl;
    this.animations.push((dt) => {
      swirl.material.opacity = 0.34 + Math.sin(performance.now() * 0.002) * 0.1;
      ring.rotation.z += dt * 0.12;
      void dt;
    });
    this.interactables.push({
      id: 'forest-portal',
      label: 'Voltar à vila',
      position: new THREE.Vector3(0, 0, 21),
      radius: 3,
      action: (game) => game.travelTo('village')
    });
  }

  _buildSigns() {
    const sign = createLabelSprite('Floresta Encantada');
    sign.position.set(0, 3.6, 15);
    sign.scale.set(4.6, 1.15, 1);
    this.group.add(sign);
  }

  applyCollected(ids) {
    for (const id of ids) {
      const record = this.collectibles.get(id);
      if (record) record.group.visible = false;
    }
  }

  resetCollectibles() {
    for (const record of this.collectibles.values()) record.group.visible = true;
  }

  getSpawn() {
    return this.spawn.clone();
  }

  getInteractables() {
    return this.interactables;
  }

  update(dt, time, nightFactor, camera) {
    if (this._swayUniform) this._swayUniform.value = time;
    for (const animation of this.animations) animation(dt);
    this.butterflies.update(dt, time);
    this.fireflies.update(dt, time, nightFactor);
    for (const creature of this.creatures) creature.update(dt, time);
    for (const record of this.collectibles.values()) {
      if (!record.group.visible) continue;
      record.group.position.y = record.baseY + Math.sin(time * 1.6 + record.phase) * 0.14;
      record.group.rotation.y += dt * 0.6;
      if (camera) record.sprite.quaternion.copy(camera.quaternion);
    }
    if (this.waterMaterial) {
      this.waterMaterial.opacity = 0.62 + Math.sin(time * 1.2) * 0.06;
    }
  }
}
