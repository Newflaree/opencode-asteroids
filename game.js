'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyC'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKINS = [
  { nombre: 'CLÁSICA', color: '#fff',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    llama: 'rgba(255,130,0,0.85)', llamaBoost: 'rgba(0,220,255,0.9)' },
  { nombre: 'CAZADORA', color: '#6f6',
    verts: [[22, 0], [-8, -13], [-14, -6], [-14, 6], [-8, 13]],
    llama: 'rgba(120,255,120,0.8)', llamaBoost: 'rgba(220,255,220,0.95)' },
  { nombre: 'COLIBRÍ', color: '#f6f',
    verts: [[18, 0], [-4, -11], [-16, -5], [-16, 5], [-4, 11]],
    llama: 'rgba(255,100,255,0.85)', llamaBoost: 'rgba(255,200,255,0.95)' },
  { nombre: 'TITÁN', color: '#fd0',
    verts: [[24, 0], [8, -10], [-16, -12], [-10, 0], [-16, 12], [8, 10]],
    llama: 'rgba(255,200,0,0.85)', llamaBoost: 'rgba(255,240,120,0.95)' },
  { nombre: 'FANTASMA', color: '#8cf',
    verts: [[20, 0], [-6, -8], [-14, -4], [-10, 0], [-14, 4], [-6, 8]],
    llama: 'rgba(100,200,255,0.7)', llamaBoost: 'rgba(180,230,255,0.95)' },
];

let skinIndex = 0;
try {
  const saved = parseInt(localStorage.getItem('asteroids-skin'), 10);
  if (!isNaN(saved)) skinIndex = Math.max(0, Math.min(SKINS.length - 1, saved));
} catch (e) { /* localStorage no disponible */ }
let skinNameTimer = 0;

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
// ── Estrella fugaz ───────────────────────────────────────────────────────────
class EstrellaFugaz extends Asteroid {
  constructor(x, y, angle) {
    super(x, y, 1);
    this.size   = 1;
    this.points = 250;
    this.radius = 12;
    this.ttl    = 7;
    this.life   = this.ttl;
    const n = randInt(7, 11);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.7, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    if (angle === undefined) angle = rand(0, Math.PI * 2);
    const speed = 300 + rand(-30, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-2.5, 2.5);
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6);
    }
  }

  split() { return []; }

  draw() {
    const alpha = Math.min(1, this.ttl / 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    const speed = Math.hypot(this.vx, this.vy);
    const tailLen = 28;
    const dirX = this.vx / speed;
    const dirY = this.vy / speed;
    ctx.strokeStyle = 'rgba(170, 230, 255, 0.45)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(-dirX * tailLen, -dirY * tailLen);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.strokeStyle = '#aef';
    ctx.lineWidth   = 1.6;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedTimer    = 0;
    this.tripleTimer   = 0;
    this.shieldTimer   = 0;
    this.shieldGrace   = 0;   // evita drenar el escudo en un solo frame
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;
    if (this.shieldGrace   > 0) this.shieldGrace   -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedTimer > 0 ? 520 : 260;  // px/s² (×2 con power-up de velocidad)
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleTimer > 0) {
      // Abanico estrecho: 3 balas con leve desviación angular
      return [
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle - 0.1),
        new Bullet(ox, oy, this.angle + 0.1),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta del skin activo
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const boost = this.speedTimer > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(boost ? 12 : 6, boost ? 26 : 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boost ? skin.llamaBoost : skin.llama;
      ctx.stroke();
    }

    ctx.restore();

    // Escudo visual
    if (this.shieldTimer > 0) {
      const alpha = Math.min(1, this.shieldTimer / 1.5) * 0.9;
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.012);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = alpha * pulse;
      ctx.strokeStyle = 'rgba(80, 200, 255, 1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = 'rgba(80, 200, 255, 1)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up de velocidad ─────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;   // 'speed' | 'shield'
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 50);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl = 10;
    this.life = this.ttl;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    if (this.type === 'shield') {
      // Arco de escudo
      ctx.strokeStyle = 'rgba(80, 200, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, 9, -Math.PI * 0.75, Math.PI * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -9);
      ctx.lineTo(0, -12);
      ctx.lineTo(3, -9);
      ctx.stroke();
    } else if (this.type === 'triple') {
      // Tres trazos divergentes (abanico)
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(-6, 8);
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 9);
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 8);
      ctx.stroke();
    } else {
      // Rayo (velocidad)
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(-4, 1);
      ctx.lineTo(2, 1);
      ctx.lineTo(-1, 9);
      ctx.lineTo(4, -1);
      ctx.lineTo(-2, -1);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  // Spawnea en un borde aleatorio, apuntando al interior
  const edge = randInt(0, 3);
  let x, y, angle;
  if (edge === 0) {      // arriba
    x = rand(0, W); y = -20;
    angle = Math.PI / 2 + rand(-0.5, 0.5);
  } else if (edge === 1) { // derecha
    x = W + 20; y = rand(0, H);
    angle = Math.PI + rand(-0.5, 0.5);
  } else if (edge === 2) { // abajo
    x = rand(0, W); y = H + 20;
    angle = -Math.PI / 2 + rand(-0.5, 0.5);
  } else {               // izquierda
    x = -20; y = rand(0, H);
    angle = rand(-0.5, 0.5);
  }
  asteroids.push(new EstrellaFugaz(x, y, angle));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(6, 12);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets    = [];
  particles  = [];
  powerups   = [];
  asteroids  = [];
  ship.reset();
  starTimer  = rand(6, 12);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin (funciona en cualquier estado)
  if (pressed('KeyC')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    try { localStorage.setItem('asteroids-skin', String(skinIndex)); } catch (e) {}
    skinNameTimer = 2;
  }
  if (skinNameTimer > 0) skinNameTimer -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    powerups.forEach(p => p.update(dt));
    asteroids.forEach(a => a.update(dt));
    particles = particles.filter(p => !p.dead);
    powerups  = powerups.filter(p => !p.dead);
    asteroids = asteroids.filter(a => !a.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    powerups.forEach(p => p.update(dt));
    asteroids.forEach(a => a.update(dt));
    particles = particles.filter(p => !p.dead);
    powerups  = powerups.filter(p => !p.dead);
    asteroids = asteroids.filter(a => !a.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Temporizador de estrella fugaz
  starTimer -= dt;
  if (starTimer <= 0) {
    spawnShootingStar();
    starTimer = rand(8, 16);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += (a.points ?? POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < 0.1) {
          const types = ['speed', 'triple', 'shield'];
          const puType = types[Math.floor(Math.random() * types.length)];
          powerups.push(new PowerUp(a.x, a.y, puType));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0 && ship.shieldGrace <= 0) {
          // Escudo activo: destruye el objeto sin puntos ni split
          a.dead = true;
          explode(a.x, a.y, a.size * 4);
          ship.shieldTimer = Math.max(0, ship.shieldTimer - 2);
          ship.shieldGrace = 0.4;
        } else if (ship.shieldTimer <= 0) {
          killShip();
          break;
        }
        // Si está en grace, se ignora este impacto (el objeto sigue)
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead);

  // Nave vs power-up de velocidad
  if (ship.invincible <= 0) {
    for (const pu of powerups) {
      if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
        if (pu.type === 'triple') ship.tripleTimer = 5;
        else if (pu.type === 'shield') ship.shieldTimer = 5;
        else ship.speedTimer = 5;
        pu.dead = true;
        explode(pu.x, pu.y, 6);
      }
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado (las estrellas fugaces no bloquean el avance)
  const remaining = asteroids.filter(a => !(a instanceof EstrellaFugaz));
  if (remaining.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  const s = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0] * s, skin.verts[0][1] * s);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0] * s, skin.verts[i][1] * s);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.speedTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 220, 255, 0.9)';
    ctx.fillText(`VELOCIDAD  ${ship.speedTimer.toFixed(1)}s`, W / 2, 46);
  }
  if (ship.tripleTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 200, 80, 0.9)';
    const y = ship.speedTimer > 0 ? 62 : 46;
    ctx.fillText(`TRIPLE  ${ship.tripleTimer.toFixed(1)}s`, W / 2, y);
  }

  if (ship.shieldTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(80, 200, 255, 0.9)';
    const y = ship.speedTimer > 0 ? (ship.tripleTimer > 0 ? 78 : 62) : (ship.tripleTimer > 0 ? 62 : 46);
    ctx.fillText(`ESCUDO  ${ship.shieldTimer.toFixed(1)}s`, W / 2, y);
  }

  if (skinNameTimer > 0) {
    const alpha = Math.min(1, skinNameTimer / 0.4);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * alpha).toFixed(2)})`;
    ctx.fillText(`NAVE: ${SKINS[skinIndex].nombre}`, W / 2, H - 24);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '12px monospace';
  ctx.fillText('C: CAMBIAR NAVE', W - 14, H - 14);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
