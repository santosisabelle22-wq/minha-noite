/** Céu, iluminação, ciclo dia/noite e clima. */
import * as THREE from 'three';
import { TIME_PHASES, phaseAt, DAY_LENGTH_SECONDS } from '../core/config.js';
import { createGlowTexture, seededRandom } from '../core/utils.js';
import { MATERIALS } from './materials.js';

const SKY_VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform vec3 horizonColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float sunStrength;
  varying vec3 vWorldPosition;
  void main() {
    vec3 direction = normalize(vWorldPosition);
    float h = direction.y;
    vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.22, 0.10, h));
    color = mix(color, topColor, smoothstep(0.02, 0.78, h));

    // Halo suave ao redor do sol e faixa de luz no horizonte.
    float halo = pow(max(dot(direction, normalize(sunDirection)), 0.0), 7.0);
    color += sunColor * halo * sunStrength;
    color += vec3(0.30, 0.38, 0.52) * exp(-abs(h) * 10.0) * 0.05;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class SkySystem {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.time = 0.18;
    this.elapsed = 0;
    this.weather = 'clear';
    this.weatherTimer = 45;
    this.light = null;
    this.followTarget = null;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1b4a9c) },
        bottomColor: { value: new THREE.Color(0xbcd8ee) },
        horizonColor: { value: new THREE.Color(0xf2d9b0) },
        sunDirection: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color(0xffe8bd) },
        sunStrength: { value: 0 }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 20), this.skyMaterial);
    this.sky.frustumCulled = false;
    this.group.add(this.sky);

    // Luz de preenchimento fria + luz principal quente: contraste cinematográfico suave.
    this.hemi = new THREE.HemisphereLight(0xc7d8ff, 0x29405c, 0.55);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xffe8bd, 1.6);
    this.sunLight.position.set(80, 90, 40);
    this.sunLight.castShadow = quality.shadows;
    this.sunLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sunLight.shadow.camera.left = -85;
    this.sunLight.shadow.camera.right = 85;
    this.sunLight.shadow.camera.top = 85;
    this.sunLight.shadow.camera.bottom = -85;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.radius = 3;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambient = new THREE.AmbientLight(0xc7d8ff, 0.7);
    this.scene.add(this.ambient);

    this.fillLight = new THREE.DirectionalLight(0xa9c8e8, 0.24);
    this.fillLight.position.set(-70, 48, -55);
    this.scene.add(this.fillLight);
    this.scene.add(this.fillLight.target);

    const glowTexture = createGlowTexture('#fff2cd', 128);
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color: 0xffe5a8, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    }));
    this.sun.scale.set(34, 34, 1);
    this.group.add(this.sun);

    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture('#dce9ff', 128), color: 0xdce9ff, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    this.moon.scale.set(20, 20, 1);
    this.group.add(this.moon);

    this._buildStars(quality.stars);
    this._buildWeather(quality);
    this._buildMotes(quality.particles);
    this.scene.fog = new THREE.FogExp2(0x9eb9d2, 0.0088);
    this.update(0, true);
  }

  _buildStars(count) {
    const random = seededRandom(9182);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 0.92 + 0.04);
      const radius = 340;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xfff3d0, size: 1.9, map: createGlowTexture('#ffffff', 64),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    this.stars = new THREE.Points(geometry, this.starMaterial);
    this.group.add(this.stars);
  }

  /** Poeira luminosa muito sutil: acompanha o jogador e deriva devagar. */
  _buildMotes(count) {
    const random = seededRandom(2207);
    const positions = new Float32Array(count * 3);
    this.moteDrift = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 28;
      positions[i * 3 + 1] = 0.35 + random() * 6.2;
      positions[i * 3 + 2] = (random() - 0.5) * 28;
      this.moteDrift[i * 2] = random() * Math.PI * 2;
      this.moteDrift[i * 2 + 1] = 0.1 + random() * 0.18;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (!this._moteTexture) this._moteTexture = createGlowTexture('#ffffff', 64);
    this.motes = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xf4f1e8, size: 0.11, map: this._moteTexture,
      transparent: true, opacity: 0.24, depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
  }

  setFollowTarget(target) {
    this.followTarget = target;
  }

  setParticleQuality(count) {
    if (!this.motes) return;
    const total = this.motes.geometry.attributes.position.count;
    if (count === total) return;
    this.group.remove(this.motes);
    this.motes.geometry.dispose();
    this.motes.material.dispose();
    this._buildMotes(count);
  }

  _updateMotes(dt, daytime) {
    if (!this.motes) return;
    if (this.followTarget) {
      this.motes.position.set(this.followTarget.x || 0, 0, this.followTarget.z || 0);
    }
    const attribute = this.motes.geometry.attributes.position;
    const array = attribute.array;
    const count = array.length / 3;
    for (let i = 0; i < count; i++) {
      const phase = this.moteDrift[i * 2];
      const speed = this.moteDrift[i * 2 + 1];
      array[i * 3] += Math.sin(this.elapsed * 0.42 + phase) * dt * speed;
      array[i * 3 + 1] += Math.cos(this.elapsed * 0.31 + phase) * dt * speed * 0.35;
      array[i * 3 + 2] += Math.cos(this.elapsed * 0.36 + phase) * dt * speed;
      if (array[i * 3] > 14) array[i * 3] = -14;
      if (array[i * 3] < -14) array[i * 3] = 14;
      if (array[i * 3 + 1] > 6.6) array[i * 3 + 1] = 0.35;
      if (array[i * 3 + 1] < 0.3) array[i * 3 + 1] = 6.5;
      if (array[i * 3 + 2] > 14) array[i * 3 + 2] = -14;
      if (array[i * 3 + 2] < -14) array[i * 3 + 2] = 14;
    }
    attribute.needsUpdate = true;
    this.motes.material.opacity = 0.16 + (1 - daytime) * 0.2;
  }

  _buildWeather(quality) {
    const count = Math.floor(quality.particles * 1.6);
    const positions = new Float32Array(count * 6);
    this.rainSpeeds = new Float32Array(count);
    const random = seededRandom(551);
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 110;
      const y = random() * 45;
      const z = (random() - 0.5) * 110;
      positions.set([x, y, z, x + 0.12, y - 0.85, z], i * 6);
      this.rainSpeeds[i] = 22 + random() * 14;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0xb9d8ff, transparent: true, opacity: 0.45, depthWrite: false
    }));
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    this.group.add(this.rain);

    const countStars = Math.floor(quality.particles * 0.8);
    const starPos = new Float32Array(countStars * 3);
    for (let i = 0; i < countStars; i++) {
      starPos[i * 3] = (random() - 0.5) * 90;
      starPos[i * 3 + 1] = random() * 55;
      starPos[i * 3 + 2] = (random() - 0.5) * 90;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starfall = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xf6dfae, size: 0.55, map: createGlowTexture('#f6dfae', 64),
      transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.starfall.visible = false;
    this.starfall.frustumCulled = false;
    this.group.add(this.starfall);
  }

  setWeather(type) {
    const allowed = ['clear', 'mist', 'rain', 'starfall'];
    this.weather = allowed.includes(type) ? type : 'clear';
    this.rain.visible = this.weather === 'rain';
    this.starfall.visible = this.weather === 'starfall';
  }

  weatherLabel() {
    return {
      clear: 'Céu limpo',
      mist: 'Névoa suave',
      rain: 'Chuva',
      starfall: 'Chuva de estrelas'
    }[this.weather] || 'Céu limpo';
  }

  setTime(time) {
    this.time = ((time % 1) + 1) % 1;
    this.update(0, true);
  }

  update(dt, force = false) {
    this.time = (this.time + dt / DAY_LENGTH_SECONDS) % 1;
    this.elapsed += dt;
    const t = this.time;
    const phase = phaseAt(t);
    const index = TIME_PHASES.indexOf(phase);
    const next = TIME_PHASES[(index + 1) % TIME_PHASES.length];
    let span = next.start - phase.start;
    if (span <= 0) span += 1;
    let into = t - phase.start;
    if (into < 0) into += 1;
    const blend = THREE.MathUtils.smoothstep(into / span, 0.25, 1);

    const top = new THREE.Color(phase.sky).lerp(new THREE.Color(next.sky), blend);
    this.skyMaterial.uniforms.topColor.value.copy(top).multiplyScalar(0.55);
    this.skyMaterial.uniforms.bottomColor.value.copy(top);
    this.skyMaterial.uniforms.horizonColor.value.copy(new THREE.Color(phase.sun)).lerp(new THREE.Color(next.sun), blend);

    const fogColor = new THREE.Color(phase.fog).lerp(new THREE.Color(next.fog), blend);
    fogColor.lerp(new THREE.Color(0x9eb9d2), 0.12 + THREE.MathUtils.smoothstep(Math.sin((t - 0.05) * Math.PI * 2), -0.12, 0.25) * 0.14);
    this.scene.fog.color.copy(fogColor);

    const angle = (t - 0.05) * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunPos = new THREE.Vector3(Math.cos(angle) * 170, sunY * 120, 60);
    const daytime = THREE.MathUtils.smoothstep(sunY, -0.12, 0.25);
    const lightPower = THREE.MathUtils.lerp(phase.light, next.light, blend);
    this.scene.fog.density = this.weather === 'mist' ? 0.0135 : 0.0088 + (1 - daytime) * 0.001;

    this.sun.position.copy(sunPos).normalize().multiplyScalar(300);
    this.moon.position.copy(this.sun.position).multiplyScalar(-1);
    this.sun.material.opacity = daytime;
    this.moon.material.opacity = 1 - daytime;
    this.skyMaterial.uniforms.sunDirection.value.copy(this.sun.position).normalize();
    this.skyMaterial.uniforms.sunColor.value.copy(this.skyMaterial.uniforms.horizonColor.value);
    this.skyMaterial.uniforms.sunStrength.value = daytime * 0.42;

    const lightSource = daytime > 0.4 ? sunPos.clone().normalize().multiplyScalar(100) : this.moon.position.clone().normalize().multiplyScalar(100);
    this.sunLight.position.copy(lightSource);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.intensity = Math.max(0.3, lightPower * (0.72 + daytime * 1.28));
    this.sunLight.color.copy(new THREE.Color(phase.sun).lerp(new THREE.Color(next.sun), blend));
    this.hemi.intensity = 0.42 + daytime * 0.35;
    this.ambient.intensity = 0.42 + daytime * 0.28;
    this.fillLight.intensity = 0.18 + (1 - daytime) * 0.14;
    this.starMaterial.opacity = Math.max(0, 1 - daytime * 1.35) * 0.95;
    this._updateMotes(dt, daytime);

    if (this.weather === 'rain' || this.weather === 'starfall') {
      const attribute = (this.weather === 'rain' ? this.rain : this.starfall).geometry.attributes.position;
      const array = attribute.array;
      const speedScale = this.weather === 'rain' ? 1 : 0.16;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 1] -= (this.weather === 'rain' ? this.rainSpeeds[i / 6] : 4) * dt * speedScale;
        if (array[i + 1] < 0) array[i + 1] = 45 + Math.random() * 8;
      }
      attribute.needsUpdate = true;
    }

    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 50 + Math.random() * 70;
      const roll = Math.random();
      if (roll < 0.08) this.setWeather('starfall');
      else if (roll < 0.16) this.setWeather('rain');
      else if (roll < 0.26) this.setWeather('mist');
      else this.setWeather('clear');
    }
    void force;
    return phase;
  }
}
