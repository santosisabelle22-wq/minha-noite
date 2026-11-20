/** Núcleo do jogo: estado, cena, fluxo de telas e salvamento. */
import * as THREE from 'three';
import { QUALITY_PRESETS, DEFAULT_PROFILE, timeLabel } from './config.js';
import { loadSave, writeSave, clearSave, createEmptySave, saveExists } from './save.js';
import { EventBus } from './events.js';
import { Input } from './input.js';
import { AudioManager } from './audio.js';
import { SkySystem } from '../world/sky.js';
import { VillageWorld } from '../world/village.js';
import { ForestWorld } from '../world/forest.js';
import { CharacterModel } from '../entities/character.js';
import { CameraController } from '../systems/camera-controller.js';
import { PlayerController } from '../systems/player-controller.js';
import { InteractionSystem } from '../systems/interaction.js';
import { QuestSystem } from '../systems/quests.js';
import { UI } from '../ui/ui.js';
import { TUTORIAL_LINES, INTRO_LINES } from '../data/dialogues.js';
import { formatClock } from './utils.js';

export class Game {
  constructor() {
    this.events = new EventBus();
    this.save = loadSave() || createEmptySave();
    this.quality = QUALITY_PRESETS[this.save.settings.quality] || QUALITY_PRESETS.medium;
    this.state = 'loading';
    this.modalOpen = false;
    this.world = null;
    this.worlds = {};
    this.playerModel = null;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.worldInfoTimer = 0;
    this.saveTimer = 20;
    this.saveRequested = false;
    this.lastPhase = null;
    this.introSeen = false;
    this.livyLine = 0;

    this._createRenderer();
    this._createScene();
    this.ui = new UI(this);
    this.ui.onModalChange = (open) => this.setModal(open);
    this.input = new Input(this.renderer.domElement, {
      joystick: document.getElementById('joystick'),
      joystickKnob: document.getElementById('joystick-knob'),
      touchAction: document.getElementById('touch-action'),
      touchJump: document.getElementById('touch-jump'),
      touchRun: document.getElementById('touch-run'),
      touchGesture: document.getElementById('touch-gesture')
    });
    this.audio = new AudioManager(this.save.settings.volume);
    this.cameraController = new CameraController(this.camera, this.input);
    this.player = new PlayerController(this);
    this.interaction = new InteractionSystem(this);
    this.quests = new QuestSystem(this);

    this.ui.setTouchVisible(this.input.isCoarse);
    this._bindUI();
    window.addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._saveNow();
    });
  }

  _createRenderer() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: this.quality.antialias, powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 700);
    this.camera.position.set(0, 6, 16);
    this.sky = new SkySystem(this.scene, this.quality);
    this.sky.setTime(this.save.game.time);
  }

  async boot() {
    this.ui.setLoading(0.15, 'Preparando o céu');
    await this._nextFrame();
    this.worlds.village = new VillageWorld(this, this.quality);
    this.scene.add(this.worlds.village.group);
    this.ui.setLoading(0.55, 'Crescendo a floresta');
    await this._nextFrame();
    this.worlds.forest = new ForestWorld(this, this.quality);
    this.scene.add(this.worlds.forest.group);
    this.ui.setLoading(0.85, 'Acendendo as lanternas');
    await this._nextFrame();

    this.worlds.forest.group.visible = false;
    this.world = this.worlds.village;
    this._refreshCameraOccluders();
    this.playerModel = new CharacterModel({
      appearance: this.save.profile.appearance,
      affinity: this.save.profile.affinity
    });
    this.scene.add(this.playerModel.group);
    this.player.setModel(this.playerModel);
    this.sky.setFollowTarget(this.player.position);
    this.player.teleport(new THREE.Vector3(0, 0, 9));
    this.cameraController.reset(0);
    this.cameraController.update(0.016, this.player.position, 0);
    this.ui.setIdentity(this.save.profile, this.save.game.level);
    this.ui.updateQuest(this.quests);
    this.ui.setLoading(1, 'Tudo pronto');
    await this._nextFrame();
    this.ui.showIntro(saveExists());
    this.state = 'intro';
    this._loop();
  }

  _nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  _bindUI() {
    document.getElementById('btn-enter').addEventListener('click', async () => {
      await this.audio.start();
      this.startNewGame();
    });
    document.getElementById('btn-continue').addEventListener('click', async () => {
      await this.audio.start();
      this.continueGame();
    });
    document.getElementById('btn-inventory').addEventListener('click', () => this.openPanel('inventory'));
    document.getElementById('btn-map').addEventListener('click', () => this.openPanel('map'));
    document.getElementById('btn-missions').addEventListener('click', () => this.openPanel('missions'));
    document.getElementById('btn-menu').addEventListener('click', () => this.openPanel('settings'));
    document.getElementById('btn-save-now').addEventListener('click', () => {
      this.toast(this._saveNow() ? 'Progresso salvo' : 'Não foi possível salvar');
    });
    document.getElementById('btn-back-intro').addEventListener('click', () => {
      this._saveNow();
      this.ui.closePanel();
      this.ui.showHUD(false);
      this.ui.showIntro(true);
      this.state = 'intro';
    });
    document.getElementById('btn-change-character').addEventListener('click', () => {
      this.ui.closePanel();
      this._openCharacterEditor();
    });
    const quality = document.getElementById('setting-quality');
    quality.addEventListener('change', () => this.setQuality(quality.value));
    const volume = document.getElementById('setting-volume');
    volume.addEventListener('input', () => {
      this.save.settings.volume = Number(volume.value);
      this.audio.setVolume(this.save.settings.volume);
      this.requestSave();
    });
  }

  /* ------------------------- Fluxo de telas ---------------------------- */
  startNewGame() {
    clearSave();
    const fresh = createEmptySave();
    fresh.settings = { ...this.save.settings };
    this.save = fresh;
    this.save.profile.appearance = { ...DEFAULT_PROFILE.appearance };
    this.playerModel?.setAppearance(this.save.profile.appearance);
    this.playerModel?.setAffinity(this.save.profile.affinity);
    this.worlds.forest?.resetCollectibles();
    this.worlds.village?.livy?.setAffinity(this.save.profile.affinity);
    this.ui.showHUD(false);
    this.ui.closePanel(false);
    if (this.ui.isDialogueOpen()) this.ui.closeDialogue();
    this.state = 'story';
    this.ui.showStory(INTRO_LINES, () => this._openCharacterEditor());
  }

  continueGame() {
    this.applySaveToWorld();
    this.state = 'playing';
    this.ui.showScreen(null);
    this.ui.showHUD(true);
    this.ui.setIdentity(this.save.profile, this.save.game.level);
    this.ui.updateQuest(this.quests);
    if (!this.save.quests.tutorial.active && !this.save.quests.tutorial.completed) {
      this.quests.start();
      this.ui.updateQuest(this.quests);
    }
    const welcome = this.save.quests.tutorial.completed
      ? ['Você voltou. A vila continua aqui, do jeito que você deixou.']
      : ['Você voltou. Vamos continuar de onde paramos?'];
    this.showDialogue('Livy', welcome);
  }

  _openCharacterEditor() {
    this.state = 'creation';
    this.ui.showCreation(this.save.profile, (profile) => {
      this.save.profile = {
        name: profile.name,
        affinity: profile.affinity,
        appearance: profile.appearance
      };
      this.playerModel?.setAppearance(profile.appearance);
      this.playerModel?.setAffinity(profile.affinity);
      this.worlds.village.livy?.setAffinity(profile.affinity);
      this.save.game.level = 1;
      this.quests.start();
      this.applySaveToWorld();
      this.state = 'playing';
      this.ui.showScreen(null);
      this.ui.showHUD(true);
      this.ui.setIdentity(this.save.profile, this.save.game.level);
      this.ui.updateQuest(this.quests);
      this.requestSave();
      this.showDialogue('Livy', TUTORIAL_LINES.start);
    });
  }

  applySaveToWorld() {
    const target = this.worlds[this.save.game.world] || this.worlds.village;
    if (this.world !== target) {
      this.world = target;
      this.worlds.village.group.visible = target.id === 'village';
      this.worlds.forest.group.visible = target.id === 'forest';
      this._refreshCameraOccluders();
    }
    const savedPos = this.save.game.position;
    this.player.teleport(new THREE.Vector3(savedPos.x, savedPos.y || 0, savedPos.z));
    this.sky.setTime(this.save.game.time);
    this.cameraController.reset(0);
    this.cameraController.update(0.016, this.player.position, this.world.heightAt(this.player.position.x, this.player.position.z));
  }

  /* --------------------------- Ações do jogo --------------------------- */
  travelTo(worldId) {
    if (!this.worlds[worldId] || this.state !== 'playing') return;
    const target = this.worlds[worldId];
    const caption = worldId === 'forest' ? 'Floresta Encantada' : 'Vila Pessoal';
    this.ui.fadeThrough(caption, async () => {
      this.world.group.visible = false;
      this.world = target;
      target.group.visible = true;
      this._refreshCameraOccluders();
      const spawn = target.getSpawn();
      this.player.teleport(spawn);
      this.cameraController.reset(0);
      this.cameraController.update(0.016, this.player.position, 0);
      this.save.game.world = worldId;
      this.requestSave();
      if (worldId === 'forest' && !this.save.flags.forestIntro) {
        this.save.flags.forestIntro = true;
        this.requestSave();
        setTimeout(() => this.showDialogue('Livy', TUTORIAL_LINES.forest), 650);
      }
    });
  }

  collectItem(item) {
    if (this.save.inventory.collected.some((entry) => entry.id === item.id)) return;
    this.save.inventory.collected.push(item);
    this.requestSave();
    this.ui.renderPanel('inventory');
  }

  discoverCreature(id, name) {
    if (this.save.inventory.pets.some((pet) => pet.id === id)) return;
    this.save.inventory.pets.push({ id, name, kind: 'descoberto' });
    this.requestSave();
  }

  markQuestStep(id, value = true) {
    this.quests.mark(id, value);
    this.ui.updateQuest(this.quests);
  }

  talkToLivy() {
    const quest = this.save.quests.tutorial;
    if (quest.active && this.save.inventory.collected.some((item) => item.id === 'flower-luminosa') && this.world.id === 'village') {
      this.markQuestStep('return', true);
      this.showDialogue('Livy', TUTORIAL_LINES.collected);
      return;
    }
    if (quest.completed) {
      const lines = [
        'Hoje o caminho está tranquilo. Boa hora para olhar as estrelas ou visitar o museu.',
        'Se quiser trocar de roupa ou de cabelo, é só abrir o menu. Eu espero aqui.'
      ];
      this.showDialogue('Livy', [lines[this.livyLine % lines.length]]);
      this.livyLine++;
      return;
    }
    this.showDialogue('Livy', [
      quest.active
        ? 'Ainda tem um passo ou dois para terminar o que começamos. Olhe o objetivo no canto da tela.'
        : 'Quando quiser, posso te mostrar por onde começar.'
    ]);
  }

  showDialogue(name, lines, portrait) {
    this.ui.showDialogue(name, lines, portrait);
  }

  toast(message, gold = false) {
    this.ui.toast(message, gold);
  }

  refreshUI() {
    this.ui.setIdentity(this.save.profile, this.save.game.level);
    if (this.ui.currentPanel) this.ui.renderPanel(this.ui.currentPanel);
  }

  setModal(open) {
    this.modalOpen = open;
    this.interaction.clear();
  }

  openPanel(name) {
    if (this.state !== 'playing') return;
    this.ui.openPanel(name);
  }

  _refreshCameraOccluders() {
    this.cameraController?.setOccluders(this.world?.occluders || []);
  }

  setQuality(value) {
    if (!QUALITY_PRESETS[value]) return;
    this.save.settings.quality = value;
    this.quality = QUALITY_PRESETS[value];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio));
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.sky.sunLight.castShadow = this.quality.shadows;
    this.sky.sunLight.shadow.map?.dispose();
    this.sky.sunLight.shadow.map = null;
    this.sky.setParticleQuality(this.quality.particles);
    this.requestSave();
    this.toast(`Qualidade gráfica: ${this.quality.label}`);
  }

  /* ---------------------------- Salvamento ----------------------------- */
  requestSave() {
    this.saveRequested = true;
  }

  _saveNow() {
    if (this.state !== 'playing' && this.state !== 'intro') return false;
    this.save.game.time = this.sky.time;
    this.save.game.position = {
      x: this.player.position.x, y: this.player.position.y, z: this.player.position.z
    };
    this.save.game.world = this.world?.id || 'village';
    const ok = writeSave(this.save);
    this.saveRequested = false;
    return ok;
  }

  /* ----------------------------- Loop ---------------------------------- */
  _resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    const phase = this.sky.update(dt);
    if (phase.id !== this.lastPhase) {
      this.lastPhase = phase.id;
      this.audio.setPhase(phase.id);
    }
    this.audio.update();

    if (this.state === 'playing') {
      this._handleGlobalKeys();
      const canMove = !this.modalOpen;
      this.player.update(dt, this.input, this.cameraController, this.world, canMove);
      this.cameraController.update(dt, this.player.position, this.world.heightAt(this.player.position.x, this.player.position.z));
      this.world.update(dt, this.time, Math.min(1, this.sky.starMaterial.opacity / 0.95), this.camera);
      this.interaction.update(dt, this.input, this.world, canMove);

      if (this.quests.state.active) {
        if (this.player.distanceTravelled > 4) this.markQuestStep('move', true);
        if (this.cameraController.lookAccumulated > 600) this.markQuestStep('look', true);
      }

      this.worldInfoTimer -= dt;
      if (this.worldInfoTimer <= 0) {
        this.worldInfoTimer = 0.5;
        this.ui.setWorldInfo(this.world.label, timeLabel(this.sky.time), this.sky.weatherLabel(), formatClock(this.sky.time));
      }

      this.saveTimer -= dt;
      if (this.saveTimer <= 0 || this.saveRequested) {
        this.saveTimer = 20;
        this._saveNow();
      }
    } else if (this.world) {
      this.world.update(dt, this.time, 0.5, this.camera);
      this.cameraController.update(dt, this.player.position, 0);
    }

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  _handleGlobalKeys() {
    if (this.input.consume('Escape')) {
      if (this.ui.isPanelOpen()) this.ui.closePanel();
      else if (this.ui.isDialogueOpen()) this.ui.closeDialogue();
      else this.openPanel('settings');
      return;
    }
    if (this.ui.isDialogueOpen()) {
      if (this.input.consume('Enter', 'KeyE', 'Space')) this.ui.nextDialogueLine();
      return;
    }
    if (this.ui.isPanelOpen()) return;
    if (this.input.consume('KeyI')) this.openPanel('inventory');
    else if (this.input.consume('KeyM')) this.openPanel('map');
    else if (this.input.consume('KeyJ')) this.openPanel('missions');
  }
}
