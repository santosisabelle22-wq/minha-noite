/**
 * Entrada unificada: teclado, mouse e toque.
 * A câmera usa o delta de arraste; o personagem usa um vetor de movimento
 * que combina WASD/setas com o joystick virtual.
 */
export class Input {
  constructor(canvas, elements = {}) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.look = { x: 0, y: 0 };
    this.zoom = 0;
    this.touchMove = { x: 0, y: 0 };
    this.touchRun = false;
    this.isCoarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.dragging = false;
    this.pointerId = null;
    this.lastPointer = { x: 0, y: 0 };
    this.enabled = true;

    this._bindKeyboard();
    this._bindPointer();
    this._bindTouch(elements);
  }

  _bindKeyboard() {
    const blocked = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
    window.addEventListener('keydown', (event) => {
      if (blocked.has(event.code)) event.preventDefault();
      if (!this.enabled) return;
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      this.dragging = false;
    });
  }

  _bindPointer() {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.pointerId = event.pointerId;
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging || event.pointerId !== this.pointerId || !this.enabled) return;
      this.look.x += event.clientX - this.lastPointer.x;
      this.look.y += event.clientY - this.lastPointer.y;
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
    });
    const stop = (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.pointerId = null;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      this.zoom += event.deltaY;
    }, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _bindTouch(el) {
    const joystick = el.joystick;
    const knob = el.joystickKnob;
    if (joystick && knob) {
      let active = false;
      const radius = 42;
      const move = (event) => {
        if (!active || !this.enabled) return;
        const rect = joystick.getBoundingClientRect();
        let dx = event.clientX - (rect.left + rect.width / 2);
        let dy = event.clientY - (rect.top + rect.height / 2);
        const length = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(length, radius);
        dx = dx / length * clamped;
        dy = dy / length * clamped;
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.touchMove.x = dx / radius;
        this.touchMove.y = dy / radius;
      };
      joystick.addEventListener('pointerdown', (event) => {
        active = true;
        joystick.setPointerCapture?.(event.pointerId);
        event.stopPropagation();
        move(event);
      });
      joystick.addEventListener('pointermove', (event) => { event.stopPropagation(); move(event); });
      const release = (event) => {
        active = false;
        knob.style.transform = '';
        this.touchMove.x = 0;
        this.touchMove.y = 0;
        event.stopPropagation();
      };
      joystick.addEventListener('pointerup', release);
      joystick.addEventListener('pointercancel', release);
    }

    const holdButton = (node, code) => {
      if (!node) return;
      node.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.enabled) return;
        this.pressed.add(code);
        this.keys.add(code);
        node.classList.add('is-active');
      });
      const release = (event) => {
        event.stopPropagation();
        this.keys.delete(code);
        node.classList.remove('is-active');
      };
      node.addEventListener('pointerup', release);
      node.addEventListener('pointercancel', release);
      node.addEventListener('pointerleave', release);
    };
    holdButton(el.touchAction, 'KeyE');
    holdButton(el.touchJump, 'Space');
    holdButton(el.touchGesture, 'KeyQ');
    if (el.touchRun) {
      el.touchRun.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.touchRun = !this.touchRun;
        el.touchRun.classList.toggle('is-active', this.touchRun);
      });
    }
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  /** Retorna true uma vez por pressionamento. */
  consume(...codes) {
    for (const code of codes) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
    }
    return false;
  }

  getMoveVector() {
    let x = 0;
    let forward = 0;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (this.isDown('KeyW', 'ArrowUp')) forward += 1;
    if (this.isDown('KeyS', 'ArrowDown')) forward -= 1;
    x += this.touchMove.x;
    forward -= this.touchMove.y;
    const length = Math.hypot(x, forward);
    if (length > 1) { x /= length; forward /= length; }
    return { x, forward };
  }

  isRunning() {
    return this.isDown('ShiftLeft', 'ShiftRight') || this.touchRun;
  }

  getLookDelta() {
    const value = { x: this.look.x, y: this.look.y };
    this.look.x = 0;
    this.look.y = 0;
    return value;
  }

  consumeZoom() {
    const value = this.zoom;
    this.zoom = 0;
    return value;
  }

  endFrame() {
    this.pressed.clear();
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) {
      this.keys.clear();
      this.pressed.clear();
      this.touchMove.x = 0;
      this.touchMove.y = 0;
    }
  }
}
