/** Vila pessoal do jogador: praça, casa, portal, pets, museu e missões. */
import * as THREE from 'three';
import { MATERIALS } from './materials.js';
import { createGlowTexture, createLabelSprite, seededRandom } from '../core/utils.js';
import { buildDistantTrees, buildMistBands, buildContactShadow } from './atmosphere.js';
import { CharacterModel } from '../entities/character.js';
import { Creature } from '../entities/creatures.js';

function part(parent, geometry, material, x, y, z) {
  const node = new THREE.Mesh(geometry, material);
  node.position.set(x, y, z);
  node.castShadow = true;
  node.receiveShadow = true;
  parent.add(node);
  return node;
}

export class VillageWorld {
  constructor(game, quality) {
    this.game = game;
    this.quality = quality;
    this.id = 'village';
    this.label = 'Vila Pessoal';
    this.group = new THREE.Group();
    this.interactables = [];
    this.animations = [];
    this.occluders = [];
    this.random = seededRandom(9901);
    this.heightAt = () => 0;

    this._buildGround();
    this._buildPraza();
    this._buildBuildings();
    this._buildPortal();
    this._buildDecor();
    this._buildAtmosphere();
    this._buildLivy();
    this.spawn = new THREE.Vector3(0, 0, 9);
  }

  _buildGround() {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(95, 64), MATERIALS.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const plaza = new THREE.Mesh(new THREE.CircleGeometry(13.5, 48), MATERIALS.path.clone());
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const ring = new THREE.Mesh(new THREE.RingGeometry(13.1, 13.5, 48), MATERIALS.gold);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    this.group.add(ring);

    // Caminhos até as construções.
    const spots = [[0, -16], [-14, 3], [14, 3], [-10, -12], [10, -12]];
    for (const [x, z] of spots) {
      const length = Math.hypot(x, z);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, length), MATERIALS.pathLight);
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -Math.atan2(x, z);
      path.position.set(x / 2, 0.025, z / 2);
      path.receiveShadow = true;
      this.group.add(path);
    }
  }

  _buildPraza() {
    const fountain = new THREE.Group();
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.7, 24), MATERIALS.stone);
    basin.position.y = 0.35;
    basin.receiveShadow = true;
    fountain.add(basin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.75, 24), MATERIALS.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.68;
    fountain.add(water);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.6, 10), MATERIALS.stoneDark);
    pedestal.position.y = 1.25;
    fountain.add(pedestal);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), MATERIALS.goldBright);
    star.position.y = 2.3;
    fountain.add(star);
    const light = new THREE.PointLight(0xf6dfae, 0.8, 10);
    light.position.y = 2.4;
    fountain.add(light);
    this.group.add(fountain);
    this.animations.push((dt) => {
      star.rotation.y += dt * 0.5;
      star.position.y = 2.3 + Math.sin(performance.now() * 0.0015) * 0.08;
      void dt;
    });

    this.interactables.push({
      id: 'fountain',
      label: 'Observar a fonte',
      position: new THREE.Vector3(0, 0, 0),
      radius: 3.8,
      action: (game) => game.showDialogue('Livy', [
        'A água da fonte reflete o céu mesmo quando ele está nublado.',
        'Alguém deixou uma moeda dourada no parapeito.'
      ])
    });
  }

  _buildBuilding({ id, label, x, z, rotation, roofColor = MATERIALS.roofBlue, tower = true }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;

    const base = part(group, new THREE.BoxGeometry(6.4, 3.6, 5), MATERIALS.wall, 0, 1.8, 0);
    base.receiveShadow = true;
    this.occluders.push(base);
    part(group, new THREE.BoxGeometry(6.7, 0.35, 5.3), MATERIALS.gold, 0, 3.55, 0);

    const roof = part(group, new THREE.ConeGeometry(4.9, 2.6, 4), roofColor, 0, 4.9, 0);
    roof.rotation.y = Math.PI / 4;
    part(group, new THREE.ConeGeometry(0.35, 1.1, 6), MATERIALS.goldBright, 0, 6.6, 0);

    for (const side of [-1, 1]) {
      const window = part(group, new THREE.BoxGeometry(1.1, 1.5, 0.12), MATERIALS.glass, side * 1.9, 2.1, 2.55);
      window.castShadow = false;
      part(group, new THREE.BoxGeometry(1.3, 0.12, 0.16), MATERIALS.gold, side * 1.9, 2.9, 2.6);
      if (tower) {
        const t = part(group, new THREE.CylinderGeometry(0.9, 1.05, 4.6, 8), MATERIALS.wallBlue, side * 3.1, 2.3, -1.4);
        t.castShadow = true;
        this.occluders.push(t);
        const cone = part(group, new THREE.ConeGeometry(1.35, 2.2, 8), roofColor, side * 3.1, 5.5, -1.4);
        cone.rotation.y = Math.PI / 8;
        const lantern = part(group, new THREE.SphereGeometry(0.18, 8, 6), MATERIALS.goldBright, side * 3.1, 4.3, -0.4);
        lantern.castShadow = false;
      }
    }

    const door = part(group, new THREE.BoxGeometry(1.5, 2.4, 0.16), MATERIALS.woodDark, 0, 1.2, 2.56);
    part(group, new THREE.TorusGeometry(0.78, 0.08, 6, 16, Math.PI), MATERIALS.gold, 0, 2.35, 2.6);
    part(group, new THREE.SphereGeometry(0.07, 6, 5), MATERIALS.goldBright, 0.45, 1.2, 2.68);

    // Varanda e bandeiras.
    part(group, new THREE.BoxGeometry(7.4, 0.18, 1.2), MATERIALS.stone, 0, 0.3, 3.1);
    for (const side of [-1, 1]) {
      part(group, new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), MATERIALS.gold, side * 3.3, 0.9, 3.5);
      const banner = part(group, new THREE.PlaneGeometry(0.6, 1.5), new THREE.MeshStandardMaterial({
        color: 0x2f5fb8, side: THREE.DoubleSide, roughness: 0.9
      }), side * 3.3, 4.6, -2.3);
      banner.rotation.y = Math.PI / 2;
    }

    const labelSprite = createLabelSprite(label);
    labelSprite.position.set(0, 6.2, 0);
    labelSprite.scale.set(4.2, 1.05, 1);
    group.add(labelSprite);

    this.group.add(group);
    const doorWorld = new THREE.Vector3(x, 0, z).add(
      new THREE.Vector3(0, 0, 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation)
    );
    return { group, door: doorWorld, doorMesh: door };
  }

  _buildBuildings() {
    this.house = this._buildBuilding({
      id: 'house', label: 'Casa do jogador', x: -15, z: 4,
      rotation: Math.PI / 2 + 0.15
    });
    this.petHouse = this._buildBuilding({
      id: 'pets', label: 'Espaço dos pets', x: 15, z: 4,
      rotation: -Math.PI / 2 - 0.15, roofColor: MATERIALS.roofDeep
    });
    this.museum = this._buildBuilding({
      id: 'museum', label: 'Museu mágico', x: -11, z: -14,
      rotation: Math.PI - 0.25, tower: false
    });
    this.missionHall = this._buildBuilding({
      id: 'missions', label: 'Sala das missões', x: 11, z: -14,
      rotation: Math.PI + 0.25, tower: false
    });

    this.interactables.push({
      id: 'house', label: 'Entrar em casa', position: this.house.door, radius: 3.2,
      action: (game) => game.showDialogue('Livy', [
        'Esta é a sua casa. Ainda está simples, mas você pode decorá-la do seu jeito.',
        'Por enquanto, ela serve como ponto de descanso. Novas opções de decoração virão depois.'
      ])
    });
    this.interactables.push({
      id: 'pets', label: 'Visitar o espaço dos pets', position: this.petHouse.door, radius: 3.2,
      action: (game) => {
        game.showDialogue('Livy', [
          'Aqui é o espaço dos companheiros. Tem um coelho que costuma aparecer por perto.',
          'Adoção, cuidados e nomes para pets chegam numa próxima etapa.'
        ]);
        game.markQuestStep('visit', true);
      }
    });
    this.interactables.push({
      id: 'museum', label: 'Entrar no museu mágico', position: this.museum.door, radius: 3.2,
      action: (game) => game.openPanel('museum')
    });
    this.interactables.push({
      id: 'missions', label: 'Entrar na sala das missões', position: this.missionHall.door, radius: 3.2,
      action: (game) => game.openPanel('missions')
    });
  }

  _buildPortal() {
    const portal = new THREE.Group();
    portal.position.set(0, 0, -13.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.2, 10, 36), MATERIALS.gold);
    ring.position.y = 2.5;
    portal.add(ring);
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.85, 40), new THREE.MeshBasicMaterial({
      color: 0x7ea8e8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false
    }));
    swirl.position.y = 2.5;
    portal.add(swirl);
    for (let i = 0; i < 10; i++) {
      const spark = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createGlowTexture('#f6dfae', 64), color: 0xf6dfae, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      spark.scale.setScalar(0.35);
      portal.add(spark);
      this.animations.push((dt, time) => {
        const angle = time * 0.6 + i * 0.63;
        spark.position.set(Math.cos(angle) * 2.2, 2.5 + Math.sin(angle * 1.7) * 0.7, Math.sin(angle) * 0.4);
        void dt;
      });
    }
    const label = createLabelSprite('Portal para a Floresta');
    label.position.y = 4.7;
    label.scale.set(4.6, 1.15, 1);
    portal.add(label);
    const light = new THREE.PointLight(0x8fc7ff, 1.1, 12);
    light.position.y = 2.5;
    portal.add(light);
    this.group.add(portal);
    this.portalSwirl = swirl;
    this.animations.push((dt) => { ring.rotation.z += dt * 0.1; void dt; });

    this.interactables.push({
      id: 'village-portal', label: 'Entrar na Floresta Encantada',
      position: new THREE.Vector3(0, 0, -13.5), radius: 3.6,
      action: (game) => {
        game.markQuestStep('portal', true);
        game.travelTo('forest');
      }
    });
  }

  _buildDecor() {
    // Árvores decorativas e jardins ao redor da praça.
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      const radius = 20 + this.random() * 16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 3.6, 7), MATERIALS.bark);
      trunk.position.y = 1.8;
      tree.add(trunk);
      for (let j = 0; j < 3; j++) {
        const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 - j * 0.1, 0), MATERIALS.leaf[(i + j) % MATERIALS.leaf.length]);
        canopy.position.set((this.random() - 0.5) * 0.8, 3.6 + j * 0.5, (this.random() - 0.5) * 0.8);
        tree.add(canopy);
      }
      this.group.add(tree);
    }

    for (let i = 0; i < 40; i++) {
      const angle = this.random() * Math.PI * 2;
      const radius = 14 + this.random() * 18;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), MATERIALS.flower[i % MATERIALS.flower.length]);
      flower.position.set(Math.cos(angle) * radius, 0.16, Math.sin(angle) * radius);
      this.group.add(flower);
    }

    // Lanternas ao longo do anel da praça.
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 13.4;
      const z = Math.sin(angle) * 13.4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.3, 6), MATERIALS.gold);
      post.position.set(x, 1.15, z);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), MATERIALS.glass);
      lamp.position.set(x, 2.4, z);
      const light = new THREE.PointLight(0xffc978, 0.35, 6);
      light.position.set(x, 2.4, z);
      this.group.add(post, lamp, light);
    }

    const bench = new THREE.Group();
    bench.position.set(-5, 0, 7);
    part(bench, new THREE.BoxGeometry(2.4, 0.14, 0.7), MATERIALS.wood, 0, 0.55, 0);
    part(bench, new THREE.BoxGeometry(2.4, 0.8, 0.14), MATERIALS.wood, 0, 0.95, -0.3);
    for (const side of [-1, 1]) part(bench, new THREE.BoxGeometry(0.14, 0.55, 0.6), MATERIALS.gold, side * 1.05, 0.28, 0);
    this.group.add(bench);
    this.interactables.push({
      id: 'bench', label: 'Sentar no banco', position: new THREE.Vector3(-5, 0, 7), radius: 2.4,
      action: (game) => game.playerModel?.playAction('sit', 2.4)
    });

    const bunny = new Creature('bunny', 14, 8, 2);
    this.group.add(bunny.group);
    this.creatures = [bunny];
    this.interactables.push({
      id: 'village-bunny', label: 'Observar o coelho', position: new THREE.Vector3(14, 0, 8), radius: 3,
      action: (game) => {
        game.discoverCreature('bunny', 'Coelho da vila');
        game.toast('Coelho da vila registrado nas descobertas');
      }
    });
  }

  _buildAtmosphere() {
    this.group.add(buildDistantTrees({
      random: this.random, quality: this.quality,
      minRadius: 62, maxRadius: 90
    }));

    const mist = buildMistBands({
      random: this.random,
      quality: this.quality,
      spots: [[0, -18], [-16, 6], [16, 8], [0, 24], [-22, -12], [22, -14]]
    });
    this.group.add(mist.group);
    let mistTime = 0;
    this.animations.push((dt) => {
      mistTime += dt;
      mist.update(mistTime);
    });

    // Sombras de contato discretas ancoram as construções no chão.
    for (const building of [this.house, this.petHouse, this.museum, this.missionHall]) {
      if (!building) continue;
      this.group.add(buildContactShadow(building.group.position.x, building.group.position.z, 11, 9, 0.26));
    }
  }

  _buildLivy() {
    this.livy = new CharacterModel({ isLivy: true, affinity: this.game.save.profile.affinity });
    this.livy.group.position.set(3.2, 0, 5.5);
    this.livy.group.rotation.y = Math.PI * 0.15;
    this.group.add(this.livy.group);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture('#f6dfae', 64), color: 0xf6dfae, transparent: true,
      opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.position.set(3.2, 0.1, 5.5);
    glow.scale.set(2.4, 0.7, 1);
    this.group.add(glow);

    this.interactables.push({
      id: 'livy', label: 'Conversar com Livy', position: new THREE.Vector3(3.2, 0, 5.5), radius: 3.2,
      action: (game) => game.talkToLivy()
    });
  }

  getSpawn() {
    return this.spawn.clone();
  }

  getInteractables() {
    return this.interactables;
  }

  update(dt, time) {
    this.livy.update(dt, { speed: 0, grounded: true });
    for (const creature of this.creatures) creature.update(dt, time);
    for (const animation of this.animations) animation(dt, time);
    if (this.portalSwirl) {
      this.portalSwirl.material.opacity = 0.36 + Math.sin(time * 2) * 0.1;
    }
  }
}
