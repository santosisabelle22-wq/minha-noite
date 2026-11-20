/** Câmera em terceira pessoa, com órbita livre e zoom. */
import * as THREE from 'three';
import { clamp, damp } from '../core/utils.js';

export class CameraController {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.yaw = 0;
    this.pitch = 0.28;
    this.distance = 7.6;
    this.target = new THREE.Vector3(0, 1.2, 0);
    this.desired = new THREE.Vector3();
    this.lookAhead = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.occluders = [];
    this.lookAccumulated = 0;
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.updateBasis();
  }

  updateBasis() {
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  reset(yaw = 0) {
    this.yaw = yaw;
    this.pitch = 0.28;
    this.distance = 7.6;
    this.lookAhead.set(0, 0, 0);
    this.updateBasis();
  }

  setOccluders(list) {
    this.occluders = list || [];
  }

  update(dt, playerPosition, groundHeight = 0) {
    const look = this.input.getLookDelta();
    if (Math.abs(look.x) + Math.abs(look.y) > 0) {
      this.yaw -= look.x * 0.0032;
      this.pitch = clamp(this.pitch + look.y * 0.0026, -0.18, 0.96);
      this.lookAccumulated += Math.abs(look.x) + Math.abs(look.y);
      this.updateBasis();
    }
    const zoom = this.input.consumeZoom();
    if (zoom) this.distance = clamp(this.distance + zoom * 0.0055, 3.4, 12);

    // Antecipação suave na direção do movimento: o cenário entra em quadro antes do personagem.
    const move = this.input.getMoveVector();
    const aheadX = (this.forward.x * move.forward + this.right.x * move.x) * 0.45;
    const aheadZ = (this.forward.z * move.forward + this.right.z * move.x) * 0.45;
    this.lookAhead.x = damp(this.lookAhead.x, aheadX, 3.5, dt);
    this.lookAhead.z = damp(this.lookAhead.z, aheadZ, 3.5, dt);

    this.target.x = damp(this.target.x, playerPosition.x + this.lookAhead.x, 7.5, dt);
    this.target.y = damp(this.target.y, playerPosition.y + 1.4, 6.5, dt);
    this.target.z = damp(this.target.z, playerPosition.z + this.lookAhead.z, 7.5, dt);

    const horizontal = Math.cos(this.pitch) * this.distance;
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      Math.max(groundHeight + 1.1, this.target.y + Math.sin(this.pitch) * this.distance),
      this.target.z + Math.cos(this.yaw) * horizontal
    );

    // Evita que a câmera atravesse paredes quando há obstáculos cadastrados.
    if (this.occluders.length) {
      const direction = this.desired.clone().sub(this.target);
      const length = direction.length();
      this.raycaster.set(this.target, direction.normalize());
      this.raycaster.far = length;
      const hits = this.raycaster.intersectObjects(this.occluders, false);
      if (hits.length && hits[0].distance > 0.8) {
        this.desired.copy(this.target).add(direction.multiplyScalar(Math.max(1.4, hits[0].distance - 0.35)));
      }
    }

    const lambda = 1 - Math.exp(-10 * dt);
    this.camera.position.lerp(this.desired, lambda);
    this.camera.lookAt(this.target);
  }
}
