// ---------- game state + simulation ----------
let state = 'menu'; // menu | play | pause | over
let overShown = false, lastRun = null;
let boat = { x: 0, y: 0, a: 0, shield: 0, trail: [], inv: 0, dashT: 0, dashCd: 0, weapon: null, ammo: 0 };
let schools = [], solids = [], tourists = [], enemies = [], shells = [], missiles = [], zones = [], hmines = [], allMines = [];
let powerups = [], dcoins = [], particles = [], rings = [], foam = [], floaters = [];
let cam = { x: 0, y: 0 };
let t = 0, pts = 0, score = 0, kills = 0, combo = 0, comboT = 0, mult = 1, runCoins = 0;
let spawnT = 1.5, powerT = 8, bossT = 100, bossCount = 0, boss = null, shake = 0, overT = 0, secT = 1, foamT = 0;
let tide = { ph: 'idle', t: 40, a: 0, s: 0, px: 0, py: 0, ext: 0 };
let slowT = 0, speedT = 0, magnetT = 0;
let curBiome = 0, banner = { text: '', t: 0 };
let wType = 'clear', wNext = null, wGoal = 0, wAmt = 0, wTimer = 35, boltT = 2, flash = 0;
let dayClock = 20; const DAY = 200;
let pal = BIOMES[0].pal.map(c => c.slice()), patchCol = BIOMES[0].patch, patchA = BIOMES[0].pa;

const TYPES = {
  torpedo: { speed: 34, turn: 1.5, life: 9,  r: 1.6, unlock: 0,  w: 3 },
  mine:    { speed: 9,  turn: 1.2, life: 22, r: 2.4, unlock: 14, w: 1.5 },
  gunboat: { speed: 17, turn: 1.7, life: 20, r: 2.6, unlock: 22, w: 1 },
  shark:   { speed: 42, turn: 2.3, life: 7,  r: 2.2, unlock: 30, w: 1.2 },
  dasher:  { speed: 16, turn: 2.2, life: 16, r: 2.0, unlock: 40, w: 1.1 },
  launcher:{ speed: 14, turn: 1.5, life: 28, r: 3,   unlock: 35, w: 1.3 },
  layer:   { speed: 14, turn: 1.4, life: 30, r: 2.4, unlock: 55, w: 0.9 },
};
const PU = {
  shield:  { col: '#7fd8ff', icon: '🛡', w: 3 },
  speed:   { col: '#ffe14d', icon: '⚡', w: 2 },
  magnet:  { col: '#ff7a7a', icon: '🧲', w: 1.5 },
  slow:    { col: '#c9a0ff', icon: '⏱', w: 1.5 },
  bomb:    { col: '#ffb347', icon: '💣', w: 1.2 },
};
const PU_NAME = { shield: 'SHIELD', speed: 'SPEED', magnet: 'MAGNET', slow: 'SLOW-MO', bomb: 'BOMB' };
const DMG = { missile: 3, mine: 2, bomb: 4 };

function skierPos(o) {
  const side = Math.sin(worldT * 1.7 + o.ph) * 2.6 * U, back = 9 * U;
  return { x: o.x - Math.cos(o.a) * back - Math.sin(o.a) * side, y: o.y - Math.sin(o.a) * back + Math.cos(o.a) * side };
}
function boatCircles(o) {
  if (o.kind === 'skier') { const k = skierPos(o); return [{ x: o.x, y: o.y, r: o.r }, { x: k.x, y: k.y, r: 1.5 * U }]; }
  if (o.kind === 'cruise') { const c = Math.cos(o.a), s = Math.sin(o.a); return [-1, 0, 1].map(k => ({ x: o.x + c * k * 4.6 * U, y: o.y + s * k * 4.6 * U, r: 3.4 * U })); }
  return [{ x: o.x, y: o.y, r: o.r }];
}
// ---------- difficulty: rising and falling surges (speeds never change, only how much comes at you) ----------
const SURGE_LEN = 45;                                               // seconds from one calm to the next
const surgePeak = tt => 1 + tt / 90;                                // every peak is taller than the last
const intensityAt = tt => (0.5 - 0.5 * Math.cos(TAU * tt / SURGE_LEN)) * surgePeak(tt);  // 0 in the calm, peak grows over time
const intensity = () => intensityAt(t);
const spawnGap = () => Math.max(0.35, 2.6 / (0.6 + 1.4 * intensity()));
function showBanner(text, sec = 2.8) { banner = { text, t: sec }; }

// ---------- start / end ----------
function start() {
  Sound.init();
  worldSeed = (Math.random() * 1e9) | 0;
  CS = 80 * U; chunks = new Map(); destroyed = new Set(); worldT = 0;
  boat = { x: 0, y: 0, a: -Math.PI / 2, shield: 0, trail: [], inv: 0, dashT: 0, dashCd: 0, weapon: null, ammo: 0, vx: undefined, vy: 0, onIce: false };
  cam.x = -W / 2; cam.y = -H / 2;
  tourists = []; schools = []; solids = []; enemies = []; shells = []; missiles = []; zones = []; hmines = []; allMines = [];
  powerups = []; dcoins = []; particles = []; rings = []; foam = []; floaters = [];
  t = 0; pts = 0; score = 0; kills = 0; combo = 0; comboT = 0; mult = 1; runCoins = 0;
  spawnT = 1.5; powerT = 8; bossT = 100; bossCount = 0; boss = null; shake = 0; overT = 0; secT = 1;
  slowT = speedT = magnetT = 0; curBiome = 0; banner = { text: '', t: 0 };
  tide = { ph: 'idle', t: rnd(35, 55), a: 0, s: 0, px: 0, py: 0, ext: 0 };
  wType = 'clear'; wNext = null; wGoal = 0; wAmt = 0; wTimer = rnd(30, 45); boltT = 2; flash = 0; dayClock = 20;
  loadChunks();
  save.stats.runs++; persist();
  state = 'play'; overShown = false;
  showPanel(null);
  Sound.setMood('calm'); Sound.music(true);
}
function die() {
  if (state !== 'play') return;
  state = 'over'; overT = 0; overShown = false;
  explode(boat.x, boat.y, true, '#ffd27f'); explode(boat.x, boat.y, true);
  shake = 18; Sound.sfx('die'); Sound.engine(0); Sound.setMood('calm'); buzz(300);
  score = Math.floor(t) + runCoins;
  const newBest = score > save.best; if (newBest) save.best = score;
  save.coins += runCoins; save.stats.maxScore = Math.max(save.stats.maxScore, score);
  evt('survive', t, 'max');
  lastRun = { score, kills, coins: runCoins, time: t, newBest };
  persist();
}

// ---------- scoring / kills ----------
function collectCoin(n) { runCoins += n; evt('coin', n); }
function award(base, x, y) {
  kills++; combo++; comboT = 4;
}
function killEnemy(e, how, base = 5) {
  if (e.dead) return;
  if (e.boss) { hurtBoss(e, DMG[how] ?? 1); return; }
  e.dead = true;
  if (how === 'whirl') splash(e.x, e.y); else explode(e.x, e.y, false, how === 'shield' ? '#7fd8ff' : (how === 'bolt' ? '#fff6a8' : null));
  award(base, e.x, e.y); evt('kill');
  if (how === 'mine') evt('minekill');
  if (how === 'missile') evt('missile');
  if (how === 'whirl') evt('whirl');
}
function hurtBoss(e, d) {
  if (e.dead || e.iframe > 0) return;
  e.hp -= d; e.flash = 0.18; e.iframe = 0.12; Sound.sfx('explode');
  explode(e.x + rnd(-3, 3) * U, e.y + rnd(-3, 3) * U, false);
  if (e.hp <= 0) {
    e.dead = true; boss = null; bossT = 110;
    for (let i = 0; i < 6; i++) explode(e.x + rnd(-6, 6) * U, e.y + rnd(-6, 6) * U, true);
    Sound.sfx('big'); shake = 20; buzz(200);
    award(200, e.x, e.y); evt('boss');
    for (let i = 0; i < 25; i++) dcoins.push({ x: e.x + rnd(-8, 8) * U, y: e.y + rnd(-8, 8) * U, life: 20 });
    showBanner('BOSS DEFEATED!'); Sound.setMood('calm');
  }
}
// returns true if the boat died
function hitBoat() {
  if (boat.inv > 0 || state !== 'play') return false;
  if (boat.shield > 0) { boat.shield = 0; boat.inv = 0.8; Sound.sfx('shield'); buzz(40); shake = Math.max(shake, 5); return false; }
  die(); return true;
}

// ---------- mines ----------
function detonate(m) {
  if (m.dead) return;
  m.dead = true; if (m.id) destroyed.add(m.id);
  explode(m.x, m.y, true); Sound.sfx('explode');
  const R = 11 * U, how = 'mine';
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < R + (e.boss ? e.r : 0)) killEnemy(e, how);
  for (const o of allMines) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < R) detonate(o);
  if (state === 'play' && Math.hypot(boat.x - m.x, boat.y - m.y) < 6.5 * U) hitBoat();
}

// ---------- enemies ----------
function makeEnemy(type, x, y, a) {
  const d = TYPES[type];
  return { type, x, y, a, age: 0, trail: [], tt: 0, speed: d.speed * U, turn: d.turn, life: d.life, r: d.r * U,
    dead: false, ph: 0, cd: rnd(1.5, 3), cd2: rnd(3, 6), side: Math.random() < 0.5 ? 1 : -1, flash: 0 };
}
function spawnEnemy() {
  const avail = Object.keys(TYPES).filter(k => t >= TYPES[k].unlock), w = avail.map(k => TYPES[k].w);
  let roll = rnd(0, w.reduce((a, b) => a + b, 0)), type = avail[0];
  for (let i = 0; i < avail.length; i++) { roll -= w[i]; if (roll <= 0) { type = avail[i]; break; } }
  const sa = rnd(0, TAU), dist = Math.hypot(W, H) / 2 + 4 * U, x = boat.x + Math.cos(sa) * dist, y = boat.y + Math.sin(sa) * dist;
  enemies.push(makeEnemy(type, x, y, Math.atan2(boat.y - y, boat.x - x) + rnd(-0.6, 0.6)));
}
function spawnBoss() {
  const n = bossCount++, kind = n % 2 === 0 ? 'battleship' : 'octopus', sa = rnd(0, TAU), dist = Math.hypot(W, H) / 2 + 10 * U;
  const x = boat.x + Math.cos(sa) * dist, y = boat.y + Math.sin(sa) * dist, hp = (kind === 'battleship' ? 14 : 16) + 4 * n;
  boss = { boss: true, type: kind, x, y, a: sa + Math.PI, age: 0, trail: [], tt: 0, speed: (kind === 'battleship' ? 12 : 13) * U, turn: 1, life: Infinity,
    r: (kind === 'battleship' ? 7 : 6) * U, dead: false, ph: 0, hp, maxHp: hp, cd: 2.5, cd2: 6, side: 1, flash: 0, iframe: 0 };
  enemies.push(boss);
  showBanner('⚠ WARNING: ' + (kind === 'battleship' ? 'BATTLESHIP' : 'KRAKEN') + ' ⚠', 3.5);
  Sound.sfx('roar'); Sound.setMood('boss'); buzz(150);
}

// ---------- boat actions ----------
function dash() {
  if (state !== 'play' || boat.dashCd > 0) return;
  const B = BOATS[save.boat];
  boat.dashT = 0.35; boat.inv = Math.max(boat.inv, 0.45); boat.dashCd = B.dashCd * (1 - 0.12 * save.up.dash);
  splash(boat.x, boat.y); Sound.sfx('dash'); buzz(25); evt('dash');
}
function fire() {
  if (state !== 'play' || !boat.weapon || boat.ammo <= 0) return;
  if (boat.weapon === 'missile') {
    missiles.push({ x: boat.x + Math.cos(boat.a) * 3 * U, y: boat.y + Math.sin(boat.a) * 3 * U, a: boat.a, life: 3.5, sp: 60 * U, trail: [], tt: 0 });
    Sound.sfx('shoot');
  }
  boat.ammo--; if (boat.ammo <= 0) boat.weapon = null;
}
function takePU(p) {
  Sound.sfx('power'); buzz(30); splash(p.x, p.y);
  const k = p.type;
  floaters.push({ x: p.x, y: p.y - 2 * U, text: PU_NAME[k], life: 1.2 });
  if (k === 'shield') boat.shield = 6 + save.up.shield;
  else if (k === 'speed') speedT = 8;
  else if (k === 'magnet') magnetT = 10;
  else if (k === 'slow') slowT = 6;
  else if (k === 'bomb') {
    Sound.sfx('big'); shake = 14; rings.push({ x: boat.x, y: boat.y, r: 1 * U, life: 0.5, max: 0.5 });
    for (const e of enemies) if (!e.dead && Math.hypot(e.x - boat.x, e.y - boat.y) < 70 * U) killEnemy(e, 'bomb');
  } else { // weapons
    if (boat.weapon !== k) { boat.weapon = k; boat.ammo = 0; }
    boat.ammo += k === 'missile' ? 4 : 3;
  }
}
function pickPowerType() {
  const keys = Object.keys(PU); let roll = rnd(0, keys.reduce((a, k) => a + PU[k].w, 0));
  for (const k of keys) { roll -= PU[k].w; if (roll <= 0) return k; }
  return 'shield';
}

// ---------- weather + day/night ----------
function nightAmt() {
  const p = (dayClock / DAY) % 1;
  if (p < 0.45) return 0; if (p < 0.55) return (p - 0.45) / 0.1; if (p < 0.9) return 1; return 1 - (p - 0.9) / 0.1;
}
function duskTint() {
  const p = (dayClock / DAY) % 1;
  if (p > 0.4 && p < 0.6) return Math.sin(Math.PI * (p - 0.4) / 0.2);
  if (p > 0.88) return Math.sin(Math.PI * (p - 0.88) / 0.12);
  return 0;
}
function updateWeather(dt, edt) {
  wTimer -= dt;
  if (wTimer <= 0) {
    wTimer = rnd(25, 45);
    const opts = ['clear', 'clear', 'rain', 'fog'].concat(t > 60 ? ['storm', 'storm'] : []);
    let nx = pick(opts); if (nx === wType) nx = 'clear';
    wNext = nx; wGoal = 0;
  }
  if (wNext !== null && wAmt <= 0.02) { wType = wNext; wNext = null; wGoal = wType === 'clear' ? 0 : 1; if (wType === 'storm') showBanner('⛈ STORM', 2.5); }
  wAmt += clamp(wGoal - wAmt, -0.4 * dt, 0.4 * dt);
  if (wType === 'storm' && wAmt > 0.7) {
    boltT -= dt;
    if (boltT <= 0) {
      boltT = rnd(1.2, 2.4);
      const near = Math.random() < 0.4, a = rnd(0, TAU), d = near ? rnd(0, 9) * U : rnd(10, 32) * U;
      zones.push({ x: boat.x + Math.cos(a) * d, y: boat.y + Math.sin(a) * d, r: 6 * U, t: 1.2, max: 1.2, kind: 'bolt' });
    }
  }
}

// ---------- schools of fish (decoration): drift in a group, scatter when you come close ----------
function spawnSchool() {
  const sa = rnd(0, TAU), dist = rnd(0.5, 0.75) * Math.hypot(W, H), x = boat.x + Math.cos(sa) * dist, y = boat.y + Math.sin(sa) * dist, n = 10 + Math.floor(rnd(0, 8));
  const hue = pick([200, 30, 50, 170]);
  schools.push({ x, y, a: rnd(0, TAU), wa: 0, wt: 0, hue, fish: Array.from({ length: n }, () => ({ x: x + rnd(-4, 4) * U, y: y + rnd(-4, 4) * U, vx: 0, vy: 0, ox: rnd(-3.5, 3.5) * U, oy: rnd(-3.5, 3.5) * U, ph: rnd(0, TAU) })) });
}
function updateSchools(dt) {
  if (schools.length < 5 && Math.random() < dt * 0.5) spawnSchool();
  const SCARE = 17 * U;
  for (const sc of schools) {
    sc.wt -= dt; if (sc.wt <= 0) { sc.wt = rnd(3, 7); sc.wa = sc.a + rnd(-1.5, 1.5); }
    for (const r of rocks) if (Math.hypot(sc.x - r.x, sc.y - r.y) < r.r + 8 * U) sc.wa = Math.atan2(sc.y - r.y, sc.x - r.x);
    sc.a += clamp(angDiff(sc.a, sc.wa), -0.8 * dt, 0.8 * dt);
    sc.x += Math.cos(sc.a) * 4 * U * dt; sc.y += Math.sin(sc.a) * 4 * U * dt;
    for (const f of sc.fish) {
      const tx = sc.x + f.ox + Math.cos(worldT * 1.2 + f.ph) * 0.8 * U, ty = sc.y + f.oy + Math.sin(worldT * 1.4 + f.ph) * 0.8 * U;
      let ax = (tx - f.x) * 3, ay = (ty - f.y) * 3;
      const dx = f.x - boat.x, dy = f.y - boat.y, d = Math.hypot(dx, dy);
      if (d < SCARE && d > 0.01) { const k = (1 - d / SCARE) * 140 * U; ax += dx / d * k; ay += dy / d * k; } // panic away from the boat
      f.vx += ax * dt * 4; f.vy += ay * dt * 4;
      const sp = Math.hypot(f.vx, f.vy), max = (d < SCARE ? 38 : 9) * U;
      if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; }
      f.vx *= 0.96; f.vy *= 0.96;
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
  }
  schools = schools.filter(sc => Math.hypot(sc.x - boat.x, sc.y - boat.y) < Math.hypot(W, H) * 1.1);
}

// ---------- big wave event ----------
const TIDE_W = 10, TIDE_SPD = 45, TIDE_PUSH = 40;
function updateTide(dt) {
  const T = tide;
  if (T.ph === 'idle') {
    T.t -= dt;
    if (T.t <= 0) { T.ph = 'warn'; T.t = 2.8; T.a = Math.floor(rnd(0, 4)) * Math.PI / 2; showBanner('⚠ BIG WAVE!', 2.8); Sound.sfx('warn'); buzz(80); }
  } else if (T.ph === 'warn') {
    const before = T.t; T.t -= dt;
    if (Math.floor(T.t * 3) !== Math.floor(before * 3)) Sound.sfx('warn');
    if (T.t <= 0) {
      T.ph = 'run'; T.ext = Math.hypot(W, H) / 2 + 20 * U; T.s = 0;
      T.px = boat.x - Math.cos(T.a) * T.ext; T.py = boat.y - Math.sin(T.a) * T.ext;
      Sound.sfx('thunder'); shake = Math.max(shake, 8);
    }
  } else {
    T.s += TIDE_SPD * U * dt;
    if (T.s > 2 * T.ext + TIDE_W * U) { T.ph = 'idle'; T.t = rnd(40, 70); }
  }
}
function inWave(x, y) {
  if (tide.ph !== 'run') return false;
  const al = (x - tide.px) * Math.cos(tide.a) + (y - tide.py) * Math.sin(tide.a);
  return al <= tide.s && al >= tide.s - TIDE_W * U;
}

// ---------- main update ----------
function update(dt) {
  if (state === 'over') { overT += dt; if (!overShown && overT > 0.9) { overShown = true; showPanel('over'); } }
  if (state !== 'play') { updateFx(dt); return; }
  const B = BOATS[save.boat], edt = slowT > 0 ? dt * 0.5 : dt;
  t += dt; worldT += dt; dayClock += dt;
  slowT = Math.max(0, slowT - dt); speedT = Math.max(0, speedT - dt); magnetT = Math.max(0, magnetT - dt);
  comboT -= dt; if (comboT <= 0) combo = 0; mult = 1;
  boat.inv = Math.max(0, boat.inv - dt); boat.dashCd = Math.max(0, boat.dashCd - dt); boat.dashT = Math.max(0, boat.dashT - dt);
  boat.shield = Math.max(0, boat.shield - dt);
  secT -= dt; if (secT <= 0) { secT = 1; evt('survive', t, 'max'); evt('dist', Math.hypot(boat.x, boat.y) / U, 'max'); }
  score = Math.floor(t) + runCoins;

  // steering + movement
  const turnRate = B.turn * (1 + 0.06 * save.up.turn);
  if (ptr.down) {
    const want = Math.atan2(ptr.y - (boat.y - cam.y), ptr.x - (boat.x - cam.x));
    boat.a += clamp(angDiff(boat.a, want), -turnRate * dt, turnRate * dt);
  }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) boat.a -= turnRate * dt;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) boat.a += turnRate * dt;
  let drag = 1; if (boat.dashT <= 0) for (const o of plasticsL) if (Math.hypot(boat.x - o.x, boat.y - o.y) < 2.8 * U) { drag = 0.55; break; }
  const bs = B.speed * (speedT > 0 ? 1.4 : 1) * (boat.dashT > 0 ? 2.6 : 1) * drag * U;
  // velocity follows the heading quickly on water, but barely at all on ice (you slide in whatever direction you were going)
  const onIce = iceL.some(o => Math.hypot(boat.x - o.x, boat.y - o.y) < o.r + 1 * U);
  if (boat.vx === undefined) { boat.vx = Math.cos(boat.a) * bs; boat.vy = Math.sin(boat.a) * bs; }
  const grip = onIce ? 0.15 : 18, kv = Math.min(1, grip * dt);
  boat.vx += (Math.cos(boat.a) * bs - boat.vx) * kv; boat.vy += (Math.sin(boat.a) * bs - boat.vy) * kv;
  boat.x += boat.vx * dt; boat.y += boat.vy * dt;
  boat.onIce = onIce;
  for (const c of currents) if (Math.hypot(boat.x - c.x, boat.y - c.y) < c.r) { boat.x += c.dx * 9 * U * dt; boat.y += c.dy * 9 * U * dt; }
  for (const p of pools) {
    const dx = p.x - boat.x, dy = p.y - boat.y, d = Math.hypot(dx, dy);
    if (d < p.R && d > 0.01) {
      const k = 1 - d / p.R;
      boat.x += (dx / d * 14 * U * k - dy / d * 10 * U * k) * dt; boat.y += (dy / d * 14 * U * k + dx / d * 10 * U * k) * dt;
      if (d < 2.2 * U && boat.dashT <= 0) { explode(boat.x, boat.y, true, '#9fe0ff'); die(); return updateFx(dt); }
    }
  }
  if (inWave(boat.x, boat.y)) { boat.x += Math.cos(tide.a) * TIDE_PUSH * U * dt; boat.y += Math.sin(tide.a) * TIDE_PUSH * U * dt; }
  pushTrail(boat, dt, 22);
  foamT -= dt;
  if (foamT <= 0) {
    foamT = 0.035;
    for (const sd of [-1, 1]) foam.push({ x: boat.x - Math.cos(boat.a) * 3 * U, y: boat.y - Math.sin(boat.a) * 3 * U, vx: -Math.sin(boat.a) * sd * 5 * U + rnd(-1, 1) * U, vy: Math.cos(boat.a) * sd * 5 * U + rnd(-1, 1) * U, life: 0.8, max: 0.8, s: 0.6 * U });
  }
  { const k = 1 - Math.exp(-8 * dt); cam.x += (boat.x - W / 2 - cam.x) * k; cam.y += (boat.y - H / 2 - cam.y) * k; }
  loadChunks();
  hmines = hmines.filter(m => !m.dead && (m.life -= dt) > 0);
  for (const m of hmines) m.age += dt;
  allMines = smines.concat(hmines);

  updateWeather(dt, edt);
  updateTide(dt);
  Sound.engine(bs / U);

  // boat vs rocks / mines
  for (const r of rocks) if (Math.hypot(boat.x - r.x, boat.y - r.y) < r.r + 1.6 * U) return die();
  if (boat.inv <= 0) for (const m of allMines) if (!m.dead && Math.hypot(boat.x - m.x, boat.y - m.y) < 3.6 * U) { detonate(m); if (state !== 'play') return; }

  // spawning
  spawnT -= dt;
  if (spawnT <= 0) {
    if (enemies.length < 25 + 10 * intensity()) { spawnEnemy(); if (Math.random() < clamp((intensity() - 1) * 0.4, 0, 0.6)) spawnEnemy(); }
    spawnT = spawnGap() * rnd(0.8, 1.2);
  }
  if (!boss) { bossT -= dt; if (bossT <= 0) spawnBoss(); }
  powerT -= dt;
  if (powerT <= 0) {
    powerT = rnd(9, 14);
    for (let tries = 0; tries < 20; tries++) {
      const a = rnd(0, TAU), d = rnd(15, 40) * U, x = boat.x + Math.cos(a) * d, y = boat.y + Math.sin(a) * d;
      if (rocks.every(o => Math.hypot(o.x - x, o.y - y) > o.r + 4 * U) && allMines.every(o => Math.hypot(o.x - x, o.y - y) > 6 * U)) { powerups.push({ x, y, life: 14, type: pickPowerType() }); break; }
    }
  }

  // ambient boats: tourists, fishers, cruise ships (+ anchored boats). Hitting one wrecks you; enemies crash into them too.
  const nCruise = tourists.filter(o => o.kind === 'cruise').length;
  const spawnVessel = kind => {
    const sa = rnd(0, TAU), dist = Math.hypot(W, H) / 2 + 12 * U, x = boat.x + Math.cos(sa) * dist, y = boat.y + Math.sin(sa) * dist;
    const cruise = kind === 'cruise';
    tourists.push({ kind, x, y, a: sa + Math.PI + rnd(-0.8, 0.8), wa: 0, wt: 0, speed: cruise ? rnd(4, 5.5) * U : kind === 'skier' ? rnd(13, 17) * U : kind === 'fisher' ? rnd(10, 14) * U : rnd(6, 10) * U,
      r: cruise ? 4.6 * U : kind === 'fisher' || kind === 'skier' ? 2.6 * U : 2.8 * U, hue: pick([0, 25, 140, 200, 280, 330]), ph: rnd(0, TAU), trail: [], tt: 0 });
  };
  if (tourists.length - nCruise < 7 && Math.random() < dt * 0.8) spawnVessel(Math.random() < 0.4 ? 'fisher' : 'tour');
  if (nCruise < 2 && Math.random() < dt * 0.12) spawnVessel('cruise');
  if (tourists.filter(o => o.kind === 'skier').length < 2 && Math.random() < dt * 0.1) spawnVessel('skier');
  for (const o of tourists) {
    const cruise = o.kind === 'cruise';
    o.wt -= dt; if (o.wt <= 0) { o.wt = cruise ? rnd(8, 14) : rnd(3, 6); o.wa = o.a + rnd(-1.2, 1.2); }
    let avoiding = false;
    for (const r of rocks) { const d = Math.hypot(o.x - r.x, o.y - r.y); if (d < r.r + (cruise ? 18 : o.kind === 'skier' ? 16 : 9) * U) { o.wa = Math.atan2(o.y - r.y, o.x - r.x); avoiding = true; } }
    const tr = cruise ? (avoiding ? 0.8 : 0.35) : o.kind === 'skier' ? 0.6 : 1.1;
    o.a += clamp(angDiff(o.a, o.wa), -tr * dt, tr * dt);
    o.x += Math.cos(o.a) * o.speed * dt; o.y += Math.sin(o.a) * o.speed * dt; pushTrail(o, dt, cruise ? 20 : 12);
  }
  tourists = tourists.filter(o => Math.hypot(o.x - boat.x, o.y - boat.y) < Math.hypot(W, H) * 1.6);
  updateSchools(dt);
  solids = tourists.concat(anchoredL);
  for (const o of solids) for (const c of boatCircles(o)) {
    const dx = boat.x - c.x, dy = boat.y - c.y, d = Math.hypot(dx, dy), min = c.r + 1.6 * U;
    if (d < min && d > 0.01) { boat.x += dx / d * (min - d); boat.y += dy / d * (min - d); if (hitBoat()) { explode(boat.x, boat.y, true); return; } }
  }

  // enemy shells
  for (const s of shells) {
    s.life -= edt; s.x += Math.cos(s.a) * s.sp * edt; s.y += Math.sin(s.a) * s.sp * edt;
    if (rocks.some(r => Math.hypot(s.x - r.x, s.y - r.y) < r.r)) { s.life = 0; splash(s.x, s.y); continue; }
    if (boat.inv <= 0 && Math.hypot(s.x - boat.x, s.y - boat.y) < 2.3 * U) { s.life = 0; explode(s.x, s.y, false, '#ffd27f'); if (hitBoat()) return; }
  }
  shells = shells.filter(s => s.life > 0);

  // player missiles
  for (const m of missiles) {
    m.life -= dt;
    let tg = null, bd = 80 * U;
    for (const e of enemies) if (!e.dead) { const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < bd) { bd = d; tg = e; } }
    if (tg) m.a += clamp(angDiff(m.a, Math.atan2(tg.y - m.y, tg.x - m.x)), -5 * dt, 5 * dt);
    m.x += Math.cos(m.a) * m.sp * dt; m.y += Math.sin(m.a) * m.sp * dt; pushTrail(m, dt, 10);
    if (rocks.some(r => Math.hypot(m.x - r.x, m.y - r.y) < r.r)) { m.life = 0; explode(m.x, m.y, false); continue; }
    for (const e of enemies) if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < e.r + 1.2 * U) { m.life = 0; explode(m.x, m.y, false); killEnemy(e, 'missile', 8); break; }
  }
  missiles = missiles.filter(m => m.life > 0);

  // telegraphed zones (lightning, kraken slam)
  for (const z of zones) {
    z.t -= edt;
    if (z.t <= 0) {
      z.dead = true; explode(z.x, z.y, z.kind === 'bolt', z.kind === 'bolt' ? '#fff6a8' : '#8a5ab5');
      if (z.kind === 'bolt') { Sound.sfx('thunder'); flash = 0.6; shake = Math.max(shake, 10); for (const e of enemies) if (!e.dead && !e.boss && Math.hypot(e.x - z.x, e.y - z.y) < z.r) killEnemy(e, 'bolt', 8); }
      else { shake = Math.max(shake, 12); Sound.sfx('explode'); }
      if (Math.hypot(boat.x - z.x, boat.y - z.y) < z.r + 1.4 * U && hitBoat()) return;
    }
  }
  zones = zones.filter(z => !z.dead);

  // enemies
  for (const e of enemies) {
    e.age += edt; e.flash = Math.max(0, e.flash - dt); if (e.iframe) e.iframe = Math.max(0, e.iframe - dt);
    const bd = Math.hypot(boat.x - e.x, boat.y - e.y), aim = Math.atan2(boat.y - e.y, boat.x - e.x);
    let want = aim, spd = e.speed, turn = e.turn;
    if (e.type === 'gunboat') {
      if (bd < 36 * U) { want += e.side * 1.45; spd *= 0.7; }
      if (bd < 22 * U) want = aim + Math.PI;
      e.cd -= edt;
      if (e.cd <= 0 && bd < 60 * U) { e.cd = 2.2; shells.push({ x: e.x + Math.cos(aim) * 3 * U, y: e.y + Math.sin(aim) * 3 * U, a: aim, sp: 42 * U, life: 3 }); splash(e.x + Math.cos(aim) * 3 * U, e.y + Math.sin(aim) * 3 * U); }
    } else if (e.type === 'dasher') {
      if (e.ph === 0) { e.cd -= edt; if (e.cd <= 0 && bd < 55 * U) { e.ph = 1; e.cd = 0.8; if (onScreen(e.x, e.y, 0)) Sound.sfx('warn'); } }
      else if (e.ph === 1) { spd = 0; turn = 6; e.cd -= edt; if (e.cd <= 0) { e.ph = 2; e.cd = 1; } }
      else { spd = 88 * U; turn = 0; e.cd -= edt; if (e.cd <= 0) { e.ph = 0; e.cd = 2.2; } }
    } else if (e.type === 'launcher') {
      if (bd < 48 * U) { want = aim + e.side * 1.35; spd *= 0.75; }
      if (bd < 28 * U) want = aim + Math.PI;
      e.cd -= edt;
      if (e.cd <= 0 && bd < 65 * U) {
        e.cd = 3.2; const n = t > 90 ? 2 : 1;
        for (let i = 0; i < n; i++) { const a = aim + (n > 1 ? (i ? 0.2 : -0.2) : 0); enemies.push(makeEnemy('torpedo', e.x + Math.cos(a) * 3.5 * U, e.y + Math.sin(a) * 3.5 * U, a)); }
        splash(e.x + Math.cos(aim) * 3.5 * U, e.y + Math.sin(aim) * 3.5 * U); Sound.sfx('shoot');
      }
    } else if (e.type === 'layer') {
      if (bd < 50 * U) want = aim + e.side * 1.3;
      if (bd < 30 * U) want = aim + Math.PI;
      e.cd -= edt;
      if (e.cd <= 0) { e.cd = 2.2; hmines.push({ x: e.x - Math.cos(e.a) * 3 * U, y: e.y - Math.sin(e.a) * 3 * U, age: 0, ph: rnd(0, TAU), life: 22, friendly: false, dead: false }); }
    } else if (e.type === 'battleship') {
      if (bd < 55 * U) { want = aim + e.side * 1.2; spd *= 0.8; }
      if (bd < 38 * U) want = aim + Math.PI;
      const rage = e.hp < e.maxHp / 2;
      e.cd -= edt; e.cd2 -= edt;
      if (e.cd <= 0 && bd < 75 * U) {
        e.cd = rage ? 1.6 : 2.4;
        for (const o of [-0.25, 0, 0.25]) shells.push({ x: e.x + Math.cos(aim) * 7 * U, y: e.y + Math.sin(aim) * 7 * U, a: aim + o, sp: 38 * U, life: 3.5 });
        Sound.sfx('shoot');
      }
      if (e.cd2 <= 0) { e.cd2 = rage ? 5 : 7; for (const o of [-0.5, 0.5]) enemies.push(makeEnemy('torpedo', e.x, e.y, aim + o)); }
    } else if (e.type === 'octopus') {
      e.cd -= edt; e.cd2 -= edt;
      if (e.cd <= 0) { e.cd = e.hp < e.maxHp / 2 ? 3.2 : 4.5; zones.push({ x: boat.x, y: boat.y, r: 10 * U, t: 1.3, max: 1.3, kind: 'slam' }); Sound.sfx('warn'); }
      if (e.cd2 <= 0) { e.cd2 = 8; for (let i = 0; i < 2; i++) enemies.push(makeEnemy('mine', e.x + rnd(-6, 6) * U, e.y + rnd(-6, 6) * U, rnd(0, TAU))); }
    }
    e.a += clamp(angDiff(e.a, want), -turn * edt, turn * edt);
    e.x += Math.cos(e.a) * spd * edt; e.y += Math.sin(e.a) * spd * edt;
    if (!e.boss) {
      if (inWave(e.x, e.y)) { e.x += Math.cos(tide.a) * TIDE_PUSH * U * edt; e.y += Math.sin(tide.a) * TIDE_PUSH * U * edt; }
      for (const c of currents) if (Math.hypot(e.x - c.x, e.y - c.y) < c.r) { e.x += c.dx * 9 * U * edt; e.y += c.dy * 9 * U * edt; }
      for (const p of pools) {
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
        if (d < p.R && d > 0.01) { const k = 1 - d / p.R; e.x += (dx / d * 14 * U * k - dy / d * 10 * U * k) * edt; e.y += (dy / d * 14 * U * k + dx / d * 10 * U * k) * edt; if (d < 2.2 * U) killEnemy(e, 'whirl', 8); }
      }
      if (e.dead) continue;
    } else if (bd > Math.hypot(W, H) * 1.1) { // keep the boss in the fight
      const a = rnd(0, TAU), dd = Math.hypot(W, H) / 2 + 10 * U; e.x = boat.x + Math.cos(a) * dd; e.y = boat.y + Math.sin(a) * dd;
    }
    if (e.type !== 'mine' && e.type !== 'octopus') pushTrail(e, dt, 14);
    if (!e.boss && (e.age > e.life || bd > Math.hypot(W, H) * 1.3)) { e.dead = true; if (bd < Math.hypot(W, H)) splash(e.x, e.y); continue; }
    if (!e.boss) for (const r of rocks) if (Math.hypot(e.x - r.x, e.y - r.y) < r.r + e.r * 0.6) { killEnemy(e, 'rock'); break; }
    if (e.dead) continue;
    if (!e.boss) for (const o of solids) { if (boatCircles(o).some(c => Math.hypot(e.x - c.x, e.y - c.y) < c.r + e.r * 0.6)) { killEnemy(e, 'rock'); break; } }
    if (e.dead) continue;
    for (const m of allMines) if (!m.dead && Math.hypot(e.x - m.x, e.y - m.y) < e.r * (e.boss ? 0.8 : 1) + 2.2 * U) { detonate(m); break; }
    if (e.dead || state !== 'play') continue;
    if (boat.inv <= 0 && Math.hypot(e.x - boat.x, e.y - boat.y) < e.r * (e.boss ? 0.85 : 1) + 1.4 * U) {
      if (boat.shield > 0) { boat.shield = 0; boat.inv = e.boss ? 1.2 : 0.8; Sound.sfx('shield'); buzz(40); killEnemy(e, 'shield'); }
      else { explode(e.x, e.y, true); return die(); }
    }
  }
  // enemy vs enemy
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j];
    if (a.dead || b.dead || a.age < 0.6 || b.age < 0.6) continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
      if (a.boss && b.boss) continue;
      if (a.boss || b.boss) { const bo = a.boss ? a : b, o = a.boss ? b : a; killEnemy(o, 'enemy'); hurtBoss(bo, 1); continue; }
      explode((a.x + b.x) / 2, (a.y + b.y) / 2, true); a.dead = b.dead = true;
      for (const e of [a, b]) { award(5, e.x, e.y); evt('kill'); }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  // pickups
  const magR = (10 + 4 * save.up.magnet) * U * (magnetT > 0 ? 3 : 1);
  for (const p of powerups) {
    p.life -= dt;
    if (magnetT > 0) { const d = Math.hypot(boat.x - p.x, boat.y - p.y); if (d < magR && d > 1) { p.x += (boat.x - p.x) / d * 40 * U * dt; p.y += (boat.y - p.y) / d * 40 * U * dt; } }
    if (Math.hypot(p.x - boat.x, p.y - boat.y) < 4 * U) { p.life = 0; takePU(p); }
  }
  powerups = powerups.filter(p => p.life > 0);
  const coinStep = (k, life) => {
    const d = Math.hypot(boat.x - k.x, boat.y - k.y);
    if (d < magR && d > 1) { k.x += (boat.x - k.x) / d * 45 * U * dt; k.y += (boat.y - k.y) / d * 45 * U * dt; }
    if (d < 3 * U) { Sound.sfx('coin'); collectCoin(1); return true; }
    return false;
  };
  for (const k of coinsL) if (coinStep(k)) { k.dead = true; destroyed.add(k.id); }
  for (const k of dcoins) { k.life -= dt; if (coinStep(k)) k.life = 0; }
  dcoins = dcoins.filter(k => k.life > 0);
  for (const k of chestsL) if (Math.hypot(boat.x - k.x, boat.y - k.y) < 4.2 * U) {
    k.dead = true; destroyed.add(k.id); collectCoin(k.v); Sound.sfx('chest'); buzz(40);
    floaters.push({ x: k.x, y: k.y - 2 * U, text: '+' + k.v + ' coins', life: 1.4 }); explode(k.x, k.y, false, '#ffd24d');
  }
  updateFx(dt);
}

// ---------- effects ----------
const sparks = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.3, ph: Math.random() * TAU, sp: 0.8 + Math.random() * 2.2 }));
const gulls = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * TAU, spd: 5 + Math.random() * 5, ph: Math.random() * TAU, tw: Math.random() * TAU }));
function explode(x, y, big, color) {
  const n = big ? 28 : 18;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(5, 40) * U;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 0.9), max: 0.9, c: color || (Math.random() < 0.5 ? '#ffb347' : '#ff5533'), s: rnd(0.4, 1.1) * U });
  }
  rings.push({ x, y, r: 1 * U, life: 0.5, max: 0.5 });
  shake = Math.max(shake, big ? 10 : 5);
  if (particles.length > 900) particles.splice(0, particles.length - 900);
}
function splash(x, y) {
  for (let i = 0; i < 12; i++) {
    const a = rnd(0, TAU), s = rnd(3, 14) * U;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.6), max: 0.6, c: '#cfeefc', s: rnd(0.3, 0.7) * U });
  }
}
function pushTrail(o, dt, max) {
  o.tt = (o.tt || 0) + dt;
  if (o.tt > 0.03) { o.tt = 0; o.trail.push({ x: o.x, y: o.y }); if (o.trail.length > max) o.trail.shift(); }
}
function updateFx(dt) {
  for (const g of gulls) {
    g.tw += dt * 0.4; g.a += Math.sin(g.tw) * 0.25 * dt;
    g.x += Math.cos(g.a) * g.spd * U * dt; g.y += Math.sin(g.a) * g.spd * U * dt;
    const m = 6 * U;
    if (g.x < -m) g.x = W + m; if (g.x > W + m) g.x = -m; if (g.y < -m) g.y = H + m; if (g.y > H + m) g.y = -m;
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  for (const p of foam) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.life -= dt; }
  foam = foam.filter(p => p.life > 0);
  for (const r of rings) { r.life -= dt; r.r += 40 * U * dt; }
  rings = rings.filter(r => r.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 8 * U * dt; }
  floaters = floaters.filter(f => f.life > 0);
  shake *= Math.pow(0.02, dt); flash = Math.max(0, flash - dt * 2.5); banner.t = Math.max(0, banner.t - dt);
  // water palette eases toward the current biome
  const tg = BIOMES[curBiome], k = 1 - Math.exp(-1.5 * dt);
  pal = pal.map((c, i) => c.map((v, j) => v + (tg.pal[i][j] - v) * k));
  patchCol = tg.patch; patchA += (tg.pa - patchA) * k;
}
