// ---------- infinite world: biomes + chunk generation ----------
let worldSeed = 1, worldT = 0, CS = 640;
let chunks = new Map(), destroyed = new Set();
let iceL = [], plasticsL = [], anchoredL = [], rocks = [], smines = [], coinsL = [], chestsL = [], pools = [], currents = [];

const BIOMES = [
  { name: 'TROPICAL SEAS',  pal: [[47, 207, 196], [23, 179, 204], [10, 134, 184]], patch: '120,240,215', pa: 0.28 },
  { name: 'ARCTIC WATERS',  pal: [[122, 212, 232], [74, 168, 216], [42, 111, 176]], patch: '235,250,255', pa: 0.32 },
  { name: 'VOLCANIC DEEP',  pal: [[42, 107, 138], [27, 74, 110], [16, 43, 74]],     patch: '255,110,60',  pa: 0.14 },
];
function biomeIdx() { return 0; } // single biome: tropical seas
const biomeAt = (x, y) => biomeIdx(Math.floor(x / CS), Math.floor(y / CS));

function mkRock(x, y, r, seed, kind, amp, R) {
  return { x, y, bx: x, by: y, r, seed, kind, amp, w: 0.15 + R() * 0.2, ph: R() * TAU };
}

function genChunk(cx, cy) {
  const R = mulberry(hash2(cx, cy, worldSeed)), ox = cx * CS, oy = cy * CS, b = biomeIdx(cx, cy), far = Math.hypot(cx, cy);
  const c = { cx, cy, b, rocks: [], mines: [], coins: [], chests: [], pools: [], currents: [], anchored: [], plastics: [], ice: [] };
  const kind = ['sand', 'ice', 'lava'][b];
  const clear = (x, y, m) => c.rocks.every(o => Math.hypot(o.bx - x, o.by - y) > o.r + o.amp + m);
  const fromStart = (x, y, m) => Math.hypot(x, y) > m * U;

  // islands / icebergs / lava rocks (some drift)
  const nIsl = R() < 0.8 ? 1 + (R() < 0.4 ? 1 : 0) : 0;
  for (let i = 0; i < nIsl; i++) for (let k = 0; k < 12; k++) {
    const r = (4 + R() * 5) * U, amp = R() < (b === 1 ? 0.4 : 0.12) ? (5 + R() * 7) * U : 0, m = r + 3 * U + amp;
    const x = ox + m + R() * (CS - 2 * m), y = oy + m + R() * (CS - 2 * m);
    if (Math.hypot(x, y) < r + amp + 22 * U) continue;
    if (clear(x, y, r + 14 * U)) { c.rocks.push(mkRock(x, y, r, R() * 10, kind, amp, R)); break; }
  }
  // floating mines
  const nMine = Math.floor(R() * Math.min(6, 3 + far / 4) * (b === 2 ? 1.4 : 1));
  for (let i = 0; i < nMine; i++) for (let k = 0; k < 12; k++) {
    const x = ox + R() * CS, y = oy + R() * CS, id = cx + ',' + cy + ',m' + i;
    if (!fromStart(x, y, 30)) continue;
    if (clear(x, y, 6 * U)) { if (!destroyed.has(id)) c.mines.push({ x, y, id, ph: R() * TAU, dead: false }); break; }
  }
  // slippery ice sheets: not solid, but your boat loses its grip and slides on them
  const nIce = R() < 0.55 ? 1 + (R() < 0.35 ? 1 : 0) : 0;
  for (let i = 0; i < nIce; i++) for (let k = 0; k < 12; k++) {
    const r = (4 + R() * 4) * U, amp = R() < 0.6 ? (3 + R() * 5) * U : 0, m = r + 2 * U + amp;
    const x = ox + m + R() * (CS - 2 * m), y = oy + m + R() * (CS - 2 * m);
    if (Math.hypot(x, y) < r + amp + 25 * U) continue;
    if (clear(x, y, r + 5 * U)) { c.ice.push(mkRock(x, y, r, R() * 10, 'ice', amp, R)); break; }
  }
  // floating plastic: bottles, bags and cans in loose patches. They slow your boat while you sail through.
  const nPatch = R() < 0.6 ? 1 + (R() < 0.4 ? 1 : 0) : 0;
  for (let i = 0; i < nPatch; i++) {
    const px = ox + 8 * U + R() * (CS - 16 * U), py = oy + 8 * U + R() * (CS - 16 * U);
    if (!fromStart(px, py, 25) || !clear(px, py, 8 * U)) continue;
    const n = 5 + Math.floor(R() * 6);
    for (let j = 0; j < n; j++) { const a = R() * TAU, d = R() * 6 * U; c.plastics.push({ x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, type: Math.floor(R() * 3), rot: R() * TAU, ph: R() * TAU }); }
  }
  // coin trail
  if (R() < 0.5) {
    const px = ox + 10 * U + R() * (CS - 20 * U), py = oy + 10 * U + R() * (CS - 20 * U), n = 5 + Math.floor(R() * 4), a0 = R() * TAU;
    for (let i = 0; i < n; i++) {
      const off = Math.sin(i * 0.8) * 2 * U, x = px + Math.cos(a0) * i * 3.2 * U - Math.sin(a0) * off, y = py + Math.sin(a0) * i * 3.2 * U + Math.cos(a0) * off, id = cx + ',' + cy + ',c' + i;
      if (fromStart(x, y, 20) && clear(x, y, 3 * U) && !destroyed.has(id)) c.coins.push({ x, y, id, dead: false });
    }
  }
  // anchored (stationary) boats
  if (R() < 0.35) {
    const x = ox + 8 * U + R() * (CS - 16 * U), y = oy + 8 * U + R() * (CS - 16 * U), a = R() * TAU, hue = [0, 25, 45, 200, 140][Math.floor(R() * 5)], ph = R() * TAU;
    if (fromStart(x, y, 25) && clear(x, y, 7 * U)) c.anchored.push({ x, y, a, hue, ph, r: 2.6 * U, kind: 'fisher', anchored: true });
  }
  return c;
}

function loadChunks() {
  const x0 = Math.floor(cam.x / CS) - 1, x1 = Math.floor((cam.x + W) / CS) + 1, y0 = Math.floor(cam.y / CS) - 1, y1 = Math.floor((cam.y + H) / CS) + 1;
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = cx + ',' + cy; if (!chunks.has(k)) chunks.set(k, genChunk(cx, cy)); }
  for (const [k, c] of chunks) if (c.cx < x0 - 3 || c.cx > x1 + 3 || c.cy < y0 - 3 || c.cy > y1 + 3) chunks.delete(k);
  iceL = []; plasticsL = []; anchoredL = []; rocks = []; smines = []; coinsL = []; chestsL = []; pools = []; currents = [];
  for (const c of chunks.values()) {
    for (const r of c.rocks) { if (r.amp) { r.x = r.bx + Math.cos(worldT * r.w + r.ph) * r.amp; r.y = r.by + Math.sin(worldT * r.w * 1.3 + r.ph) * r.amp; } rocks.push(r); }
    for (const m of c.mines) if (!m.dead) smines.push(m);
    for (const k of c.coins) if (!k.dead) coinsL.push(k);
    for (const k of c.chests) if (!k.dead) chestsL.push(k);
    for (const o of c.anchored) anchoredL.push(o);
    for (const o of c.plastics) plasticsL.push(o);
    for (const r of c.ice) { if (r.amp) { r.x = r.bx + Math.cos(worldT * r.w + r.ph) * r.amp; r.y = r.by + Math.sin(worldT * r.w * 1.3 + r.ph) * r.amp; } iceL.push(r); }
    for (const p of c.pools) pools.push(p);
    for (const p of c.currents) currents.push(p);
  }
}
function onScreen(x, y, m) { return x > cam.x - m && x < cam.x + W + m && y > cam.y - m && y < cam.y + H + m; }
