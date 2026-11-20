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
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.25, 0.08, h));
    color = mix(color, topColor, smoothstep(0.0, 0.75, h));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class SkySystem {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.time = 0.18;
    this.weather = 'clear';
    this.weatherTimer = 45;
    this.light = null;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1b4a9c) },
        bottomColor: { value: new THREE.Color(0xbcd8ee) },
        horizonColor: { value: new THREE.Color(0xf2d9b0) }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 20), this.skyMaterial);
    this.sky.frustumCulled = false;
    this.group.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xbcd8ee, 0x2c5545, 1.2);
    this.scene.add(this.hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff2d5, 1.2);
    this.sunLight.position.set(80, 90, 40);
    this.sunLight.castShadow = quality.shadows;
    if (quality.shadows) {
      const s = this.sunLight.shadow.mapSize.width;
      this.sunLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
      this.sunLight.shadow.camera.left = -70;
      this.sunLight.shadow.camera.right = 70;
      this.sunLight.shadow.camera.top = 70;
      this.sunLight.shadow.camera.bottom = -70;
      this.sunLight.shadow.camera.far = 260;
      this.sunLight.shadow.bias = -0.0008;
      void s;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambient = new THREE.AmbientLight(0x7ea8e8, 0.28);
    this.scene.add(this.ambient);

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
    this.scene.fog = new THREE.FogExp2(0xbcd8ee, 0.006);
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
    this.scene.fog.color.copy(fogColor);
    this.scene.fog.density = this.weather === 'mist' ? 0.015 : 0.0062;

    const angle = (t - 0.05) * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunPos = new THREE.Vector3(Math.cos(angle) * 170, sunY * 120, 60);
    const daytime = THREE.MathUtils.smoothstep(sunY, -0.12, 0.25);
    const lightPower = THREE.MathUtils.lerp(phase.light, next.light, blend);

    this.sun.position.copy(sunPos.normalize().multiplyScalar(300));
    this.moon.position.copy(this.sun.position).multiplyScalar(-1);
    this.sun.material.opacity = daytime;
    this.moon.material.opacity = 1 - daytime;

    const lightSource = daytime > 0.4 ? sunPos.clone().normalize().multiplyScalar(100) : this.moon.position.clone().normalize().multiplyScalar(100);
    this.sunLight.position.copy(lightSource);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.intensity = Math.max(0.18, lightPower * (0.35 + daytime * 0.65));
    this.sunLight.color.copy(new THREE.Color(phase.sun).lerp(new THREE.Color(next.sun), blend));
    this.hemi.intensity = 0.45 + daytime * 0.7;
    this.ambient.intensity = 0.22 + (1 - daytime) * 0.12;
    this.starMaterial.opacity = Math.max(0, 1 - daytime * 1.35) * 0.95;

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
