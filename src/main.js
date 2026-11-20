/** Ponto de entrada de Minha Noite. */
import { Game } from './core/game.js';

async function boot() {
  try {
    const game = new Game();
    // Útil para depuração e para futuras ferramentas de teste.
    window.MINHA_NOITE = game;
    await game.boot();
  } catch (error) {
    console.error('[Minha Noite] Falha na inicialização:', error);
    const detail = document.getElementById('loading-detail');
    if (detail) {
      detail.textContent = 'Não foi possível iniciar o 3D. Verifique se o navegador suporta WebGL.';
      detail.style.color = '#ffb4b4';
    }
  }
}

boot();
