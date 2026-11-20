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

## Refinamento visual (rodada atual)

- **Paleta/UI**: `styles/main.css` passou a usar as cores base `--night-blue`, `--deep-blue`, `--royal-blue`, `--soft-blue`, `--starlight`, `--gold`, `--soft-gold` e `--violet`, com painéis e botões no estilo livro mágico. Os apelidos antigos foram mantidos por compatibilidade.
- **Céu e luz**: `src/world/sky.js` ganhou halo solar no shader, iluminação quente/fria combinada, sombras suaves, névoa mais clara e poeira luminosa sutil que acompanha o jogador.
- **Profundidade**: `src/world/atmosphere.js` centraliza árvores distantes e faixas de névoa; floresta e vila usam essas camadas, além de sombras de contato na vila e oscilação da vegetação na floresta.
- **Personagem e câmera**: `src/entities/character.js` refina rosto, olhos verdes, cabelos castanhos e vestido azul/branco/dourado; `src/systems/camera-controller.js` tem pitch/distância mais suaves, antecipação de olhar e colisão com obstáculos cadastrados.
- **Comparação**: capturas no cenário fixo (floresta/vila às 15:30) em `capturas/antes-*.jpg` e `capturas/depois-*.jpg`.

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

- Trocar a qualidade gráfica ajusta resolução, sombras e partículas imediatamente; vegetação e estrelas ainda usam a quantidade definida ao carregar a página.
- A câmera evita as construções e árvores gigantes cadastradas, mas ainda não cobre todas as paredes do cenário.
- A raposa luminosa e os animais se movem em pequenos círculos; ainda não há IA de aproximação.
- Diálogos e missões extras ainda não têm áudio com vozes.
- O save não é sincronizado entre dispositivos (previsto para a etapa de contas).
