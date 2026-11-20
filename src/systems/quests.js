/** Missão introdutória que ensina os controles e a exploração. */
import { QUEST_TEXT } from '../data/dialogues.js';

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.definition = QUEST_TEXT.tutorial;
  }

  get state() {
    return this.game.save.quests.tutorial;
  }

  start() {
    this.state.active = true;
    this.state.completed = false;
    this.state.steps = {};
  }

  mark(id, value = true) {
    if (!this.state.active || this.state.completed) return;
    if (this.state.steps[id] === value) return;
    const wasComplete = this.isComplete();
    this.state.steps[id] = value;
    this.game.ui.updateQuest(this);
    if (!wasComplete && this.isComplete()) this.complete();
  }

  isComplete() {
    return this.definition.steps.every((step) => Boolean(this.state.steps[step.id]));
  }

  complete() {
    this.state.completed = true;
    this.state.active = false;
    const already = this.game.save.memories.some((item) => item.id === 'primeiros-passos');
    if (!already) {
      this.game.save.memories.push({
        id: 'primeiros-passos',
        title: 'Primeiros passos',
        description: 'O primeiro caminho que você percorreu na Vila Pessoal.',
        date: new Date().toISOString(),
        colors: ['#143d78', '#d9ad55']
      });
    }
    this.game.requestSave();
    this.game.toast('Missão concluída · recordação enviada ao museu', true);
    this.game.showDialogue('Livy', [
      'Você já sabe encontrar o caminho. Isso é quase tudo o que preciso ensinar.',
      'O resto a gente descobre junto. O museu guardou esta primeira lembrança.'
    ]);
    this.game.ui.updateQuest(this);
  }

  describe() {
    return this.definition.steps.map((step) => ({
      ...step,
      done: Boolean(this.state.steps[step.id])
    }));
  }
}
