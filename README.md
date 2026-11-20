# Minha Noite

Uma aventura de fantasia 3D que roda direto no navegador. Este é o primeiro corte jogável do projeto: abertura, apresentação da Livy, criação de personagem, Floresta Encantada, vila pessoal, câmera em terceira pessoa e missão introdutória.

> Os artefatos visuais atuais são **provisórios e gerados por código**. Os retratos em `assets/` são espaços reservados para as artes definitivas.

## Como executar

Como o projeto usa módulos JavaScript (`import`), precisa de um servidor estático — não basta abrir o `index.html` com duplo clique.

### Windows (sem instalar nada)

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\serve.ps1
```

Depois acesse **http://127.0.0.1:8080**.

### Qualquer sistema com Python

```bash
python -m http.server 8080
```

### Publicação

O repositório está preparado para GitHub Pages: ao enviar para a branch `main`, o workflow em `.github/workflows/deploy.yml` publica o conteúdo da raiz.

## Controles

| Ação | Teclado / mouse | Toque |
| --- | --- | --- |
| Andar | WASD ou setas | Joystick |
| Correr | Shift | Botão Correr |
| Pular | Espaço | Botão Pular |
| Girar câmera | Arrastar com o mouse | Deslizar na tela |
| Aproximar/afastar | Roda do mouse | — |
| Interagir | E | Botão Interagir |
| Acenar / dançar | Q / F | Botão Gesto |
| Inventário / mapa / missões | I / M / J | Botões no canto |
| Menu e ajustes | Esc | Botão Menu |

## O que já funciona

- Tela de abertura azul com título dourado e opção de continuar.
- Apresentação da Livy com diálogo e retrato provisório.
- Criação de personagem: nome, 5 afinidades, pele/cabelo/roupa/olhos, penteado e acessório.
- Personagem 3D estilizado com animações de andar, correr, pular, acenar, dançar e sentar.
- Livy como personagem 3D com vestido azul/branco/dourado, olhos verdes, pontos luminosos nas articulações e fios de marionete discretos.
- Câmera em terceira pessoa com órbita livre e zoom.
- Vila pessoal: praça com fonte, casa, portal, espaço dos pets, museu mágico e sala das missões.
- Floresta Encantada: árvores antigas, cachoeira, riacho, ruínas, cogumelos, borboletas, vagalumes, raposa luminosa e caminho secreto.
- Ciclo dia/noite com cores, luz, estrelas e vagalumes; clima com névoa, chuva e chuva de estrelas.
- Coleta de flores, inventário, descoberta de criaturas e recordações no museu.
- Missão introdutória que ensina os controles e gera a primeira recordação.
- Salvamento local automático (`localStorage`), ajustes de qualidade e volume, interface responsiva.

## O que ainda não está implementado

Conforme o documento mestre, estas partes pertencem a etapas futuras e **não devem ser consideradas prontas**:

- Contas, login, salvamento em nuvem e sincronização entre dispositivos.
- Multiplayer, mundos compartilhados, permissões de visita, bloqueio e moderação.
- Combates, artefatos com habilidades e batalhas de chefes.
- Sistema completo de pets com nomes, cuidados e acessórios.
- Castelo da Livy, varinha, poder celestial, asas e voo livre (bloqueado até nível 30).
- Novos mundos, eventos e trilha sonora original definitiva.

## Estrutura

```
index.html                  Interface e ponto de entrada
styles/main.css             Identidade visual e layout responsivo
vendor/three.module.min.js  Three.js local (sem CDN)
src/core/                   Config, save, input, áudio, eventos, jogo
src/data/                   Afinidades, diálogos e textos
src/entities/               Personagem e criaturas
src/systems/                Câmera, movimento, interação e missões
src/ui/                     Telas, HUD, diálogos e painéis
src/world/                  Céu/clima, floresta, vila e materiais
assets/                     Retratos provisórios (substituíveis)
tools/serve.ps1             Servidor estático para testes
docs/                       Acompanhamento das etapas
```

## Substituindo os recursos provisórios

- Retratos: `assets/livy-portrait.svg` e `assets/hero-portrait.svg`. O retrato do jogador gerado em `src/ui/ui.js` pode ser trocado por uma imagem.
- Personagens 3D: `src/entities/character.js`.
- Criaturas: `src/entities/creatures.js`.
- Trilha sonora: `src/core/audio.js` gera um ambiente simples com WebAudio; substitua por arquivos originais ou licenciados.
