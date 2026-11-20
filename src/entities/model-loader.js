/**
 * Ponte opcional para modelos GLB/GLTF externos.
 *
 * Nenhum arquivo é carregado enquanto o manifesto estiver vazio, então o
 * fallback procedural atual continua sendo o caminho padrão. Os imports dos
 * addons são dinâmicos para manter o custo zero quando não há modelos.
 */
import * as THREE from 'three';
import { TARGET_CHARACTER_HEIGHT } from '../core/model-manifest.js';

const gltfCache = new Map();

async function getLoader() {
  const [{ GLTFLoader }, { clone }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/utils/SkeletonUtils.js')
  ]);
  return { loader: new GLTFLoader(), clone };
}

function loadGLTF(url) {
  if (!url) return Promise.resolve(null);
  if (!gltfCache.has(url)) {
    const pending = getLoader()
      .then(({ loader }) => new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      }))
      .then((gltf) => {
        gltf.scene.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((material) => {
              if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
            });
          }
        });
        return gltf;
      })
      .catch((error) => {
        gltfCache.delete(url);
        console.warn(`[Minha Noite] Não foi possível carregar o modelo "${url}".`, error);
        return null;
      });
    gltfCache.set(url, pending);
  }
  return gltfCache.get(url);
}

/** Retorna null quando o modelo não existe ou falha; o chamador mantém o fallback. */
export async function loadCharacterModel(url) {
  const gltf = await loadGLTF(url);
  if (!gltf) return null;

  let clone;
  try {
    ({ clone } = await getLoader());
  } catch (error) {
    console.warn('[Minha Noite] Não foi possível preparar o clone do modelo.', error);
    return null;
  }
  const scene = clone(gltf.scene);
  // Materiais por instância evitam que trocar a aparência do jogador altere a Livy.
  scene.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => material.clone())
      : node.material.clone();
  });
  const box = new THREE.Box3().setFromObject(scene);
  const height = box.max.y - box.min.y;
  const scale = height > 0.001 ? TARGET_CHARACTER_HEIGHT / height : 1;
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(scene);
  scene.position.y -= scaledBox.min.y;

  return { scene, animations: gltf.animations, height: TARGET_CHARACTER_HEIGHT };
}

/** Carrega objetos de cenário opcionais como filhos do grupo do mundo. */
export async function attachWorldProps(group, props = []) {
  if (!group || !Array.isArray(props) || props.length === 0) return;
  const entries = await Promise.all(props.map(async (prop) => {
    const gltf = await loadGLTF(prop.url);
    if (!gltf) return null;
    const { clone } = await getLoader();
    const object = clone(gltf.scene);
    if (prop.position) object.position.fromArray(prop.position);
    if (prop.rotation) object.rotation.fromArray(prop.rotation);
    object.scale.setScalar(prop.scale ?? 1);
    return object;
  }));
  entries.filter(Boolean).forEach((object) => group.add(object));
}
