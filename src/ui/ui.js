/** Toda a interface HTML: telas, HUD, diálogos e painéis. */
import { AFFINITIES, getAffinity } from '../data/affinities.js';

const $ = (id) => document.getElementById(id);

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value.length === 3 ? value.split('').map((c) => c + c).join('') : value, 16);
  return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${alpha})`;
}

/** Retrato provisório gerado a partir da aparência escolhida. */
export function buildPortrait(appearance = {}) {
  const skin = appearance.skin || '#f0cdb4';
  const hair = appearance.hair || '#5b3b2e';
  const dress = appearance.dress || '#2f5fb8';
  const eyes = appearance.eyes || '#4f9d78';
  const style = appearance.hairstyle || 'curls';
  const hairExtras = style === 'braid'
    ? `<g fill="${hair}"><circle cx="80" cy="105" r="12"/><circle cx="80" cy="122" r="10"/><circle cx="80" cy="137" r="8"/></g>`
    : style === 'bob'
      ? `<ellipse cx="80" cy="82" rx="37" ry="33" fill="${hair}"/>`
      : `<g fill="${hair}"><circle cx="45" cy="84" r="12"/><circle cx="49" cy="104" r="11"/><circle cx="115" cy="84" r="12"/><circle cx="111" cy="104" r="11"/><circle cx="60" cy="48" r="12"/><circle cx="75" cy="41" r="13"/><circle cx="91" cy="42" r="12"/><circle cx="104" cy="50" r="11"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs><radialGradient id="b" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${dress}"/><stop offset="1" stop-color="#081735"/></radialGradient></defs>
    <rect width="160" height="160" fill="url(#b)"/>
    <g fill="#f6dfae" opacity=".7"><circle cx="28" cy="36" r="1.6"/><circle cx="132" cy="52" r="1.4"/><circle cx="118" cy="120" r="1.3"/></g>
    <ellipse cx="80" cy="76" rx="38" ry="43" fill="${hair}"/>
    <path d="M80 100c-18 0-30 11-34 31l-6 29h80l-6-29c-4-20-16-31-34-31z" fill="${dress}" stroke="#d9ad55" stroke-width="2"/>
    <path d="M59 119q21 13 42 0M53 137q27 11 54 0" fill="none" stroke="#f6dfae" stroke-width="1.6" opacity=".8"/>
    <ellipse cx="80" cy="69" rx="25" ry="29" fill="${skin}"/>
    ${hairExtras}
    <ellipse cx="70" cy="72" rx="5" ry="6.5" fill="#fff"/><ellipse cx="90" cy="72" rx="5" ry="6.5" fill="#fff"/>
    <ellipse cx="70" cy="73" rx="3.2" ry="4.8" fill="${eyes}"/><ellipse cx="90" cy="73" rx="3.2" ry="4.8" fill="${eyes}"/>
    <circle cx="70" cy="73" r="1.5" fill="#102b22"/><circle cx="90" cy="73" r="1.5" fill="#102b22"/>
    <path d="M64 64q6-4 12 0M84 64q6-4 12 0" fill="none" stroke="${hair}" stroke-width="1.6"/>
    <path d="M77 88q3 2 6 0" fill="none" stroke="#b87870" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M80 105l2 4.6 5 .6-3.7 3.4 1 4.8L80 115.6l-4.3 2.8 1-4.8-3.7-3.4 5-.6z" fill="#f6dfae"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.screens = ['loading', 'intro', 'story', 'creation'];
    this.panels = ['inventory', 'map', 'missions', 'museum', 'settings'];
    this.currentPanel = null;
    this.dialogueQueue = [];
    this.dialogueIndex = 0;
    this.typing = null;
    this.onModalChange = () => {};
    this.storyLines = [];
    this.storyIndex = 0;
    this.storyCallback = null;

    this.el = {
      loading: $('loading-screen'), loadingFill: $('loading-fill'), loadingDetail: $('loading-detail'),
      intro: $('intro-screen'), story: $('story-screen'), creation: $('creation-screen'),
      storyText: $('story-text'), storyDots: $('story-dots'),
      hud: $('hud'), hudName: $('hud-name'), hudAffinity: $('hud-affinity'),
      hudWorld: $('hud-world'), hudTime: $('hud-time'), hudWeather: $('hud-weather'),
      questTitle: $('quest-title'), questSteps: $('quest-steps'),
      prompt: $('interaction-prompt'), promptLabel: $('interaction-label'),
      toasts: $('toast-stack'), fade: $('fade-layer'), fadeCaption: $('fade-caption'),
      dialogueLayer: $('dialogue-layer'), dialogueName: $('dialogue-name'),
      dialogueText: $('dialogue-text'), dialoguePortrait: $('dialogue-portrait'),
      panelLayer: $('panel-layer'), touch: $('touch-controls'),
      preview: $('preview-portrait'), previewName: $('preview-name'),
      previewAffinity: $('preview-affinity'), previewAura: $('preview-aura')
    };
    this._bindStaticControls();
  }

  _bindStaticControls() {
    $('btn-story-next').addEventListener('click', () => this.nextStoryLine());
    $('btn-story-skip').addEventListener('click', () => {
      this.stopTyping();
      this.storyLines = [];
      const callback = this.storyCallback;
      this.storyCallback = null;
      callback?.();
    });
    $('btn-dialogue-next').addEventListener('click', () => this.nextDialogueLine());
    document.querySelectorAll('[data-close-panel]').forEach((node) => {
      node.addEventListener('click', () => this.closePanel());
    });
    document.querySelectorAll('[data-tabs="inventory"] .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-tabs="inventory"] .tab').forEach((item) => item.classList.toggle('is-active', item === tab));
        document.querySelectorAll('[data-panel="inventory"] [data-tab-content]').forEach((content) => {
          content.classList.toggle('is-hidden', content.dataset.tabContent !== tab.dataset.tab);
        });
      });
    });
  }

  /* ------------------------------- Telas ------------------------------- */
  setLoading(percent, detail) {
    this.el.loadingFill.style.width = `${Math.round(percent * 100)}%`;
    if (detail) this.el.loadingDetail.textContent = detail;
  }

  showScreen(name) {
    for (const screen of this.screens) {
      this.el[screen]?.classList.toggle('is-hidden', screen !== name);
    }
  }

  showIntro(hasSave) {
    this.showScreen('intro');
    $('btn-continue').classList.toggle('is-hidden', !hasSave);
    $('btn-enter').textContent = hasSave ? 'Começar de novo' : 'Entrar no universo';
  }

  showStory(lines, callback) {
    this.storyLines = lines;
    this.storyIndex = 0;
    this.storyCallback = callback;
    this.showScreen('story');
    this.renderStoryLine();
  }

  renderStoryLine() {
    const line = this.storyLines[this.storyIndex];
    if (!line) {
      this.showScreen(null);
      const callback = this.storyCallback;
      this.storyCallback = null;
      callback?.();
      return;
    }
    this.el.storyDots.style.backgroundSize = `${((this.storyIndex + 1) / this.storyLines.length) * 100}% 100%`;
    this.typeInto(this.el.storyText, line, 22);
  }

  nextStoryLine() {
    if (this.isTyping()) {
      this.finishTyping();
      return;
    }
    this.storyIndex++;
    this.renderStoryLine();
  }

  showCreation(profile, onStart) {
    this.showScreen('creation');
    const state = {
      name: profile.name === 'Viajante' ? '' : profile.name,
      affinity: profile.affinity,
      appearance: { ...profile.appearance }
    };
    const nameInput = $('input-name');
    nameInput.value = state.name;

    const list = $('affinity-list');
    list.innerHTML = '';
    for (const affinity of AFFINITIES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `affinity-card${affinity.id === state.affinity ? ' is-active' : ''}`;
      button.style.setProperty('--aura', hexToRgba(affinity.cssColor, 0.3));
      button.innerHTML = `<i style="color:${affinity.cssColor}">${affinity.icon}</i><span>${affinity.name}<small>${affinity.description}</small></span>`;
      button.addEventListener('click', () => {
        state.affinity = affinity.id;
        list.querySelectorAll('.affinity-card').forEach((node, index) => node.classList.toggle('is-active', AFFINITIES[index].id === affinity.id));
        this.updatePreview(state);
      });
      list.appendChild(button);
    }

    const colorInputs = [
      ['color-skin', 'skin', 'skin-value'], ['color-hair', 'hair', 'hair-value'],
      ['color-dress', 'dress', 'dress-value'], ['color-eyes', 'eyes', 'eyes-value']
    ];
    for (const [inputId, key, labelId] of colorInputs) {
      const input = $(inputId);
      input.value = state.appearance[key];
      const sync = () => {
        state.appearance[key] = input.value;
        $(labelId).textContent = input.value.toUpperCase();
        this.updatePreview(state);
      };
      input.addEventListener('input', sync);
      sync();
    }
    $('select-hair').value = state.appearance.hairstyle;
    $('select-accessory').value = state.appearance.accessory;
    $('select-hair').addEventListener('change', (event) => {
      state.appearance.hairstyle = event.target.value;
      this.updatePreview(state);
    });
    $('select-accessory').addEventListener('change', (event) => {
      state.appearance.accessory = event.target.value;
      this.updatePreview(state);
    });
    nameInput.addEventListener('input', () => this.updatePreview(state));
    this.updatePreview(state);

    $('btn-start').onclick = () => {
      const name = nameInput.value.trim() || 'Viajante';
      onStart({ name, affinity: state.affinity, appearance: { ...state.appearance } });
    };
  }

  updatePreview(state) {
    const previewName = $('input-name').value.trim() || 'Viajante';
    this.el.preview.src = buildPortrait(state.appearance);
    this.el.previewName.textContent = previewName;
    const affinity = getAffinity(state.affinity);
    this.el.previewAffinity.textContent = affinity.name;
    this.el.previewAura.style.setProperty('--aura', hexToRgba(affinity.cssColor, 0.4));
  }

  showHUD(visible) {
    this.el.hud.classList.toggle('is-hidden', !visible);
  }

  setTouchVisible(visible) {
    this.el.touch.classList.toggle('is-hidden', !visible);
  }

  setIdentity(profile, level = 1) {
    if (!profile) return;
    this.el.hudName.textContent = profile.name;
    const affinity = getAffinity(profile.affinity);
    this.el.hudAffinity.textContent = `${affinity.short} · Nv. ${level}`;
    const avatar = document.querySelector('.avatar-chip img');
    if (avatar) avatar.src = buildPortrait(profile.appearance);
  }

  setWorldInfo(worldLabel, timeLabel, weatherLabel, clock = '') {
    this.el.hudWorld.textContent = worldLabel;
    this.el.hudTime.textContent = clock ? `${timeLabel} ${clock}` : timeLabel;
    this.el.hudWeather.textContent = weatherLabel;
    const marker = $('map-player');
    if (marker) {
      marker.style.left = worldLabel === 'Floresta Encantada' ? '72%' : '28%';
      marker.style.top = worldLabel === 'Floresta Encantada' ? '32%' : '56%';
    }
    document.querySelectorAll('[data-map-region]').forEach((node) => {
      const active = (node.dataset.mapRegion === 'forest' && worldLabel === 'Floresta Encantada')
        || (node.dataset.mapRegion === 'village' && worldLabel === 'Vila Pessoal');
      node.style.filter = active ? 'drop-shadow(0 0 12px #f6dfae)' : '';
    });
  }

  updateQuest(quest) {
    if (!quest) return;
    const state = quest.state;
    this.el.questTitle.textContent = state.completed
      ? 'Jornada iniciada'
      : quest.definition.title;
    this.el.questSteps.innerHTML = '';
    for (const step of quest.describe()) {
      const li = document.createElement('li');
      li.textContent = step.label;
      li.classList.toggle('is-done', step.done);
      this.el.questSteps.appendChild(li);
    }
    this.el.questSteps.classList.toggle('is-hidden', state.completed);
  }

  setInteractionPrompt(label) {
    this.el.prompt.classList.toggle('is-hidden', !label);
    if (label) this.el.promptLabel.textContent = label;
  }

  toast(message, gold = false) {
    const node = document.createElement('div');
    node.className = `toast${gold ? ' toast--gold' : ''}`;
    node.textContent = message;
    this.el.toasts.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  /* ----------------------------- Diálogos ------------------------------ */
  showDialogue(name, lines, portrait = './assets/livy-portrait.svg') {
    const list = Array.isArray(lines) ? lines : [lines];
    this.dialogueQueue = list;
    this.dialogueIndex = 0;
    this.el.dialogueName.textContent = name;
    this.el.dialoguePortrait.src = portrait;
    this.el.dialogueLayer.classList.remove('is-hidden');
    this.onModalChange(true);
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    const line = this.dialogueQueue[this.dialogueIndex];
    if (!line) { this.closeDialogue(); return; }
    this.typeInto(this.el.dialogueText, line, 20);
  }

  nextDialogueLine() {
    if (this.isTyping()) { this.finishTyping(); return; }
    this.dialogueIndex++;
    this.renderDialogueLine();
  }

  closeDialogue() {
    this.stopTyping();
    this.el.dialogueLayer.classList.add('is-hidden');
    this.dialogueQueue = [];
    this.onModalChange(false);
  }

  isDialogueOpen() {
    return !this.el.dialogueLayer.classList.contains('is-hidden');
  }

  typeInto(node, text, speed = 20) {
    this.stopTyping();
    let index = 0;
    node.textContent = '';
    this.typing = setInterval(() => {
      index++;
      node.textContent = text.slice(0, index);
      if (index >= text.length) this.finishTyping();
    }, speed);
  }

  isTyping() { return Boolean(this.typing); }
  finishTyping() {
    if (!this.typing) return;
    const node = this.el.dialogueLayer.classList.contains('is-hidden') ? this.el.storyText : this.el.dialogueText;
    const source = this.el.dialogueLayer.classList.contains('is-hidden')
      ? this.storyLines[this.storyIndex]
      : this.dialogueQueue[this.dialogueIndex];
    clearInterval(this.typing);
    this.typing = null;
    if (node && source) node.textContent = source;
  }
  stopTyping() {
    if (this.typing) clearInterval(this.typing);
    this.typing = null;
  }

  /* ------------------------------ Painéis ------------------------------ */
  openPanel(name) {
    if (!this.panels.includes(name)) return;
    this.closePanel(false);
    this.currentPanel = name;
    this.el.panelLayer.classList.remove('is-hidden');
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.classList.toggle('is-hidden', panel.dataset.panel !== name);
    });
    this.renderPanel(name);
    this.onModalChange(true);
  }

  closePanel(notify = true) {
    if (!this.currentPanel) return;
    this.currentPanel = null;
    this.el.panelLayer.classList.add('is-hidden');
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.add('is-hidden'));
    if (notify) this.onModalChange(false);
  }

  isPanelOpen() { return Boolean(this.currentPanel); }

  renderPanel(name) {
    if (name === 'inventory') this.renderInventory();
    if (name === 'missions') this.renderMissions();
    if (name === 'museum') this.renderMuseum();
    if (name === 'settings') this.renderSettings();
  }

  renderInventory() {
    const save = this.game.save;
    const grid = $('inventory-grid');
    grid.innerHTML = '';
    if (!save.inventory.collected.length) {
      grid.innerHTML = '<p class="empty-note">Nada coletado ainda. As flores da floresta são um bom começo.</p>';
    } else {
      for (const item of save.inventory.collected) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `<i>${item.icon || '✿'}</i><strong>${item.name}</strong><small>${item.rarity || 'comum'}</small>`;
        grid.appendChild(card);
      }
    }
    const petGrid = $('pet-grid');
    petGrid.innerHTML = '';
    if (!save.inventory.pets.length) {
      petGrid.innerHTML = '<p class="empty-note">Nenhum companheiro registrado.</p>';
    } else {
      for (const pet of save.inventory.pets) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `<i>❦</i><strong>${pet.name}</strong><small>${pet.kind || 'descoberto'}</small>`;
        petGrid.appendChild(card);
      }
    }
    $('inventory-count').textContent = `${save.inventory.collected.length} itens · ${save.inventory.pets.length} companheiros`;
  }

  renderMissions() {
    const list = $('mission-list');
    list.innerHTML = '';
    const quest = this.game.quests;
    const card = document.createElement('div');
    card.className = 'mission-card';
    const status = quest.state.completed ? 'concluída' : quest.state.active ? 'em andamento' : 'disponível';
    card.innerHTML = `<span class="status">${status}</span><h3>${quest.definition.title}</h3>
      <p>${quest.describe().map((step) => `${step.done ? '✓' : '○'} ${step.label}`).join('<br>')}</p>`;
    list.appendChild(card);
    const future = document.createElement('div');
    future.className = 'mission-card';
    future.innerHTML = '<span class="status">em breve</span><h3>Aventuras da floresta</h3><p>Novas missões especiais serão adicionadas em etapas futuras.</p>';
    list.appendChild(future);
  }

  renderMuseum() {
    const grid = $('memory-grid');
    grid.innerHTML = '';
    const memories = this.game.save.memories;
    if (!memories.length) {
      grid.innerHTML = '<p class="empty-note">O museu ainda está vazio. Conclua a missão introdutória para guardar sua primeira recordação.</p>';
      return;
    }
    for (const memory of memories) {
      const card = document.createElement('div');
      card.className = 'memory-card';
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 320, 240);
      gradient.addColorStop(0, memory.colors?.[0] || '#143d78');
      gradient.addColorStop(1, memory.colors?.[1] || '#d9ad55');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.arc((i * 79) % 320, (i * 47) % 240, 1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f6dfae';
      ctx.font = '46px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('✦', 160, 130);
      ctx.font = '17px Georgia';
      ctx.fillText(memory.title, 160, 190);
      card.appendChild(canvas);
      const caption = document.createElement('span');
      caption.textContent = memory.description || memory.title;
      card.appendChild(caption);
      grid.appendChild(card);
    }
  }

  renderSettings() {
    $('setting-quality').value = this.game.save.settings.quality;
    $('setting-volume').value = this.game.save.settings.volume;
    const saved = this.game.save.savedAt;
    $('save-info').textContent = saved
      ? `Progresso salvo neste navegador em ${new Date(saved).toLocaleString('pt-BR')}.`
      : 'Progresso salvo neste navegador. A sincronização entre dispositivos virá com as contas.';
  }

  /* ----------------------------- Transição ----------------------------- */
  async fadeThrough(label, callback) {
    this.el.fadeCaption.textContent = label;
    this.el.fadeCaption.classList.remove('is-hidden');
    this.el.fade.classList.add('is-on');
    await new Promise((resolve) => setTimeout(resolve, 720));
    await callback();
    this.el.fade.classList.remove('is-on');
    await new Promise((resolve) => setTimeout(resolve, 720));
    this.el.fadeCaption.classList.add('is-hidden');
  }
}
