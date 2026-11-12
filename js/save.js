// ---------- persistent save + shop data ----------
const BOATS = {
  kayak:     { name: 'Kayak',     cost: 0,   speed: 30, turn: 3.4, dashCd: 3,   desc: 'Balanced. Tight turns.' },
  speedboat: { name: 'Speedboat', cost: 150, speed: 38, turn: 2.5, dashCd: 3,   desc: 'Fast, but wide turns.' },
  jetski:    { name: 'Jet Ski',   cost: 300, speed: 34, turn: 3.0, dashCd: 1.9, desc: 'Quick dash recharge.' },
};
const UPGRADES = {
  shield: { name: 'Shield time', desc: '+1s shield per level' },
  turn:   { name: 'Handling',    desc: '+6% turn rate per level' },
  magnet: { name: 'Coin magnet', desc: 'Pulls coins from further' },
  dash:   { name: 'Dash recharge', desc: '-12% cooldown per level' },
};
const UP_MAX = 5, UP_COST = [40, 90, 160, 250, 360];

const DEFAULT_SAVE = {
  best: 0, coins: 0,
  up: { shield: 0, turn: 0, magnet: 0, dash: 0 },
  boat: 'kayak', owned: { kayak: true },
  ach: {},
  stats: { kills: 0, boss: 0, maxTime: 0, maxScore: 0, maxDist: 0, mineKills: 0, coins: 0, dash: 0, whirl: 0, missile: 0, runs: 0 },
  missions: [],
  settings: { sound: true, music: true, haptics: true },
  daily: { date: 0, best: 0 },
};
function deepMerge(dst, src) {
  for (const k in src) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') deepMerge(dst[k], src[k]);
    else dst[k] = src[k];
  }
  return dst;
}
function loadSave() {
  const s = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  try {
    const raw = localStorage.getItem('boatSave');
    if (raw) deepMerge(s, JSON.parse(raw));
    else s.best = +localStorage.getItem('boatBest') || 0; // migrate old best
  } catch (e) {}
  return s;
}
let save = loadSave();
function persist() { try { localStorage.setItem('boatSave', JSON.stringify(save)); } catch (e) {} }

// ---------- stat events (kept for simple counters) ----------
function evt(name, n = 1, mode = 'add') {
  const st = save.stats, map = { kill: 'kills', boss: 'boss', minekill: 'mineKills', coin: 'coins', dash: 'dash', whirl: 'whirl', missile: 'missile' };
  if (map[name]) st[map[name]] += n;
  if (name === 'survive') st.maxTime = Math.max(st.maxTime, n);
  if (name === 'dist') st.maxDist = Math.max(st.maxDist, n);
}
