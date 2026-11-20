# Modelos externos — contrato de integração

Esta pasta recebe os arquivos GLB/GLTF definitivos de personagens e cenário.

**Estado atual:** não há modelos aqui. O jogo continua usando os personagens e cenários procedurais de `src/entities/character.js`, `src/world/forest.js` e `src/world/village.js`. Nenhum arquivo é solicitado enquanto `src/core/model-manifest.js` estiver com `null`/`[]`, portanto não há erros 404 nem mudança de mecânicas.

## Como ativar

Edite `src/core/model-manifest.js`:

```js
export const CHARACTER_MODELS = {
  livy: './assets/models/livy.glb',
  player: './assets/models/player.glb'
};

export const WORLD_PROPS = {
  village: [
    { url: './assets/models/props/lantern.glb', position: [4, 0, 6], rotation: [0, 0.5, 0], scale: 1 }
  ],
  forest: [
    { url: './assets/models/props/ancient-tree.glb', position: [12, 0, -18], scale: 1.4 }
  ]
};
```

O carregamento é opcional e assíncrono. Se um arquivo falhar, o fallback procedural permanece visível.

## Contrato para personagens

| Item | Requisito |
| --- | --- |
| Formato | glTF 2.0 `.glb` (recomendado) ou `.gltf` com recursos locais |
| Eixo | Y para cima, sistema de coordenadas right-handed padrão do glTF; **frente voltada para `+Z`** |
| Origem | Centro entre os pés em `y = 0`; o loader normaliza a altura para `1.85` m |
| Corpo | Malha skinned completa: corpo, rosto, mãos, pernas e pés |
| Rosto | Olhos, íris, brilho, sobrancelhas/cílios e boca como malhas ou texturas separadas |
| Cabelo | Malhas/cards volumosos com mechas; cachos elaborados no caso da Livy |
| Roupa | Peças separadas (saia, mangas, corpete, rendas, bordados, laços, flores, joias) |
| Livy | Olhos verdes, cabelos longos castanhos, rosto de porcelana, vestido azul/branco/dourado, estrelas/luas e fios/articularões de marionete |
| Skeleton | `SkinnedMesh` com `Skin` válido; use `SkeletonUtils.clone()` para instâncias (já integrado) |

### Nomes de materiais

O loader aplica a aparência do jogador por `material.name` (comparação sem diferenciar maiúsculas/acentos):

| Slot | Nomes aceitos |
| --- | --- |
| `skin` | `skin`, `porcelain`, `rosto`, `pele` |
| `hair` | `hair`, `cabelo` |
| `dress` | `dress`, `vestido`, `cloth`, `tecido` |
| `eyes` | `eye`, `eyes`, `iris`, `olho`, `olhos` |

Use `MeshStandardMaterial` ou `MeshPhysicalMaterial` com mapas PBR: `baseColor`, `normal`, `roughness`, `metalness`, `ambientOcclusion` e `emissive` quando fizer sentido (olhos, estrelas, fios mágicos). Materiais clones são criados por instância para não misturar a aparência da Livy e do jogador.

### Nós de acessório

Crie nós independentes com estes nomes exatos para que a personalização funcione:

- `Accessory_Star`
- `Accessory_Moon`
- `Accessory_Flower`

Se ao menos um desses nós existir, o loader mostra apenas o selecionado em `appearance.accessory`. Se nenhum existir, todos os acessórios do GLB permanecem visíveis.

### Animações esqueléticas

Clips reconhecidos (nomes ignoram maiúsculas e acentos):

| Ação | Nomes aceitos | Comportamento |
| --- | --- | --- |
| `idle` | `idle`, `await`, `parado` | Loop, usado quando parado |
| `walk` | `walk`, `caminhar`, `caminhada` | Loop |
| `run` | `run`, `correr`, `corrida` | Loop |
| `jump` | `jump`, `pular`, `salto` | Única, ativada quando `grounded === false` |
| `wave` | `wave`, `acenar`, `gesto` | Única (`Q`/gesto) |
| `dance` | `dance`, `dancar`, `dança` | Única (`F`) |
| `sit` | `sit`, `sentar` | Única (banco da vila, 2.4 s) |

`AnimationMixer` faz crossfade entre locomoção e ações únicas. Clips ausentes simplesmente não são reproduzidos; a lógica de jogo não muda.

## Contrato para cenário

Cada entrada de `WORLD_PROPS` aceita:

```js
{ url: string, position: [x, y, z], rotation?: [x, y, z], scale?: number }
```

- `position`/`rotation` em radianos e `scale` são aplicados ao grupo importado.
- Na floresta, inclua a altura do terreno em `position[1]` (`world.heightAt(x, z)`), ou deixe o prop levemente elevado para evitar z-fighting.
- Árvores, flores e rochas devem ser GLBs separados ou um único GLB por conjunto, com PBR e colisão opcional feita pelo código atual.
- Objetos importados recebem `castShadow`/`receiveShadow` automaticamente.

## Limitações atuais e recursos externos necessários

O scaffold técnico já possui `GLTFLoader`, `BufferGeometryUtils` e `SkeletonUtils` do Three.js r160 em `vendor/addons/`, com import map local e sem CDN. Ainda são necessários **recursos de arte**, não código:

1. `livy.glb` e `player.glb` com malhas, texturas PBR, esqueleto e animações conforme acima.
2. Conjuntos de texturas PBR 1K–2K para pele/porcelana, cabelo, tecido, renda, metal, vidro e elementos luminosos.
3. GLBs de cenário: árvores com folhagem volumosa, flores individuais variadas, arbustos, rochas, ruínas e detalhes de água.
4. HDRI/EXR (ou equiretangular) para reflexos PBR de qualidade e iluminação cinematográfica. Isso exigirá vendorizar `RGBELoader`/`EXRLoader` e configurar `PMREMGenerator`; **não implementado ainda**.
5. Se os GLBs usarem Draco ou KTX2, será preciso vendorizar `DRACOLoader`/`KTX2Loader` e seus decodificadores locais; **não implementado ainda**. Prefira glTF 2.0 com texturas PNG/JPEG embutidas por enquanto.
6. Todos os recursos devem ser originais ou licenciados para redistribuição no projeto.

## Verificação

Após adicionar os arquivos e atualizar o manifesto:

1. Rodar `powershell -ExecutionPolicy Bypass -File .\tools\serve.ps1` e abrir `http://127.0.0.1:8080`.
2. Conferir o console: nenhum 404, nenhum erro de shader e nenhum aviso de loader.
3. Conferir que Livy e jogador estão com altura/pé no chão corretos e virados para `+Z`.
4. Andar, correr, pular, acenar (`Q`), dançar (`F`) e sentar no banco da vila; observar crossfade.
5. Trocar nome/afinidade/aparência na criação e verificar se materiais e acessórios respondem sem reconstruir a malha.
6. Testar `low`, `medium` e `high` em `window.MINHA_NOITE.setQuality(...)`.
