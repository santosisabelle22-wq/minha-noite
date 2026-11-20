/** Movimentação do personagem e gestos simples. */
import * as THREE from 'three';
import { clamp, damp } from '../core/utils.js';

const WALK_SPEED = 3.4;
const RUN_SPEED = 6.3;
const GRAVITY = 16;
const JUMP_SPEED = 5.6;
const BOUNDARY = 72;

export class PlayerController {
  constructor(game) {
    this.game = game;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.jumpOffset = 0;
    this.jumpVelocity = 0;
    this.grounded = true;
    this.facing = 0;
    this.speedRatio = 0;
    this.model = null;
    this.distanceTravelled = 0;
    this.teleport(new THREE.Vector3(0, 0, 9));
  }

  setModel(model) {
    this.model = model;
    this.syncModel();
  }

  teleport(position) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.jumpOffset = 0;
    this.jumpVelocity = 0;
    this.grounded = true;
    this.syncModel();
  }

  syncModel() {
    if (!this.model) return;
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.facing;
  }

  update(dt, input, cameraController, world, canMove = true) {
    const move = canMove ? input.getMoveVector() : { x: 0, forward: 0 };
    const direction = new THREE.Vector3()
      .addScaledVector(cameraController.forward, move.forward)
      .addScaledVector(cameraController.right, move.x);
    const moving = direction.lengthSq() > 0.0001;
    if (moving) direction.normalize();

    const speed = input.isRunning() && canMove ? RUN_SPEED : WALK_SPEED;
    const targetVelocity = direction.multiplyScalar(moving ? speed : 0);
    this.velocity.x = damp(this.velocity.x, targetVelocity.x, 12, dt);
    this.velocity.z = damp(this.velocity.z, targetVelocity.z, 12, dt);
    this.speedRatio = clamp(Math.hypot(this.velocity.x, this.velocity.z) / RUN_SPEED, 0, 1);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.distanceTravelled += Math.hypot(this.velocity.x, this.velocity.z) * dt;

    // Limite suave para não sair do cenário montado.
    const radius = Math.hypot(this.position.x, this.position.z);
    if (radius > BOUNDARY) {
      this.position.x *= BOUNDARY / radius;
      this.position.z *= BOUNDARY / radius;
      this.velocity.multiplyScalar(0.4);
    }

    if (canMove && input.consume('Space') && this.grounded) {
      this.jumpVelocity = JUMP_SPEED;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.jumpVelocity -= GRAVITY * dt;
      this.jumpOffset += this.jumpVelocity * dt;
      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.jumpVelocity = 0;
        this.grounded = true;
      }
    }

    const ground = world?.heightAt?.(this.position.x, this.position.z) ?? 0;
    this.position.y = ground + this.jumpOffset;

    if (moving) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
      let delta = targetFacing - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * (1 - Math.exp(-12 * dt));
    }

    if (canMove && input.consume('KeyQ')) this.model?.playAction('wave', 1.8);
    if (canMove && input.consume('KeyF')) this.model?.playAction('dance', 3.2);

    this.syncModel();
    this.model?.update(dt, { speed: this.speedRatio, grounded: this.grounded });
  }
}
