/** Detecta o objeto interagível mais próximo e dispara a ação. */
import { distance2D } from '../core/utils.js';

export class InteractionSystem {
  constructor(game) {
    this.game = game;
    this.current = null;
  }

  update(dt, input, world, enabled = true) {
    if (!enabled || !world) {
      this.current = null;
      this.game.ui.setInteractionPrompt(null);
      return;
    }
    let nearest = null;
    let best = Infinity;
    const player = this.game.player.position;
    for (const item of world.getInteractables()) {
      const distance = distance2D(player, item.position);
      if (distance > item.radius) continue;
      if (distance < best) { best = distance; nearest = item; }
    }
    this.current = nearest;
    this.game.ui.setInteractionPrompt(nearest?.label || null);
    if (nearest && input.consume('KeyE')) {
      try {
        nearest.action(this.game);
      } catch (error) {
        console.error('[Minha Noite] Falha ao interagir:', error);
      }
    }
    void dt;
  }

  clear() {
    this.current = null;
    this.game.ui.setInteractionPrompt(null);
  }
}
