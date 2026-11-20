# Estado do projeto — Minha Noite

Acompanhamento das etapas do Documento Mestre.

| Etapa | Situação nesta versão | Onde está |
| --- | --- | --- |
| 1 — Estrutura | Concluída | `index.html`, `styles/main.css`, `src/core/`, Three.js local em `vendor/` |
| 2 — Livy | Concluída (provisória) | `src/entities/character.js`, `src/data/dialogues.js`, `assets/livy-portrait.svg` |
| 3 — Personagem | Concluída (provisória) | `src/ui/ui.js`, `src/entities/character.js`, `src/data/affinities.js` |
| 4 — Floresta Encantada | Concluída (provisória) | `src/world/forest.js`, `src/systems/` |
| 5 — Vila | Concluída (provisória) | `src/world/village.js` |
| 6 — Sistemas | Parcial: inventário, coleções, missão introdutória e recordações | `src/systems/quests.js`, `src/ui/ui.js` |
| 7 — Multiplayer | Não iniciado | — |
| 8 — Castelo e poder celestial | Não iniciado (a história permanece bloqueada até nível 30) | — |
| 9 — Finalização | Parcial: interface responsiva e 3 níveis de qualidade | `styles/main.css`, `src/core/config.js` |

## Decisões tomadas

- **Three.js local**: o arquivo `vendor/three.module.min.js` evita dependência de CDN e permite funcionar sem conexão após o carregamento da página.
- **Recursos procedurais**: árvores, flores, construções e personagens são montados com geometrias e materiais em código. Isso permite evoluir o protótipo antes das artes definitivas.
- **Salvamento local**: `localStorage` com chave versionada (`minha-noite:save:v1`). O formato já tem campos para inventário, missões, recordações e configurações, preparando a migração futura para contas.
- **Sem invenção de história**: o conteúdo narrativo se limita à apresentação, à missão introdutória e a observações da Livy. O castelo, a varinha e o poder celestial permanecem como etapa futura.

## Como estender

1. Novos mundos: crie uma classe em `src/world/` com `getSpawn()`, `getInteractables()`, `update()` e `heightAt()`, e registre-a em `Game.worlds`.
2. Novas missões: adicione a definição em `src/data/dialogues.js` e um sistema em `src/systems/`.
3. Novas roupas/afinidades: `src/data/affinities.js` e `src/entities/character.js`.
4. Contas e multiplayer: trocar `src/core/save.js` por um cliente de API mantendo o mesmo formato de dados.

## Problemas conhecidos

- Trocar a qualidade gráfica ajusta resolução e sombras imediatamente; alguns ajustes só valem após recarregar a página.
- A câmera ainda não tem prevenção completa de colisão com todas as paredes.
- A raposa luminosa e os animais se movem em pequenos círculos; ainda não há IA de aproximação.
- Diálogos e missões extras ainda não têm áudio com vozes.
- O save não é sincronizado entre dispositivos (previsto para a etapa de contas).
