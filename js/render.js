// ---------- drawing ----------
let tmNow = 0, drawTrailLater = [];

function drawTrail(o, color, width) {
  if (!o.trail || o.trail.length < 2) return;
  for (let i = 1; i < o.trail.length; i++) {
    ctx.strokeStyle = color.replace('A', (i / o.trail.length * 0.5).toFixed(2));
    ctx.lineWidth = width * (i / o.trail.length);
    ctx.beginPath(); ctx.moveTo(o.trail[i - 1].x, o.trail[i - 1].y); ctx.lineTo(o.trail[i].x, o.trail[i].y); ctx.stroke();
  }
}
function blobPath(cx, cy, r, seed, scale) {
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = i * TAU / 40, k = r * scale * (1 + 0.08 * Math.sin(2 * a + seed) + 0.06 * Math.sin(3 * a + seed * 1.7));
    const x = cx + Math.cos(a) * k, y = cy + Math.sin(a) * k;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// islands, icebergs, lava rocks and reefs
const ISLE = {
  sand: { halo: '255,240,170', halo2: '190,245,200', ring: 'rgba(255,255,255,.95)', fill: '#f5e8d8', inner: 'rgba(255,248,236,.9)', dot: 'rgba(200,170,130,.35)' },
  ice:  { halo: '225,245,255', halo2: '170,215,245', ring: 'rgba(255,255,255,.95)', fill: '#dcecf7', inner: 'rgba(255,255,255,.95)', dot: 'rgba(120,175,215,.45)' },
  lava: { halo: '255,140,60',  halo2: '255,90,40',   ring: 'rgba(255,190,110,.8)',  fill: '#3b3535', inner: 'rgba(74,66,66,.95)',    dot: 'rgba(255,110,40,.9)' },
  reef: { halo: '150,255,225', halo2: '100,220,210', ring: 'rgba(255,255,255,.7)',  fill: '#e8708a', inner: 'rgba(255,179,192,.9)',  dot: 'rgba(255,230,235,.7)' },
};
function drawIsland(r, tm) {
  const S = ISLE[r.kind];
  const hg = ctx.createRadialGradient(r.x, r.y, r.r * 0.8, r.x, r.y, r.r * 2);
  hg.addColorStop(0, `rgba(${S.halo},.55)`); hg.addColorStop(0.5, `rgba(${S.halo2},.28)`); hg.addColorStop(1, `rgba(${S.halo2},0)`);
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 2, 0, TAU); ctx.fill();
  // ripples spreading out from the shore
  for (let i = 0; i < 2; i++) {
    const f = (tm * 0.3 + r.seed * 0.1 + i * 0.5) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${(0.35 * (1 - f)).toFixed(2)})`; ctx.lineWidth = 0.3 * U;
    blobPath(r.x, r.y, r.r, r.seed, 1.15 + f * 0.6); ctx.stroke();
  }
  ctx.strokeStyle = S.ring; ctx.lineWidth = (r.kind === 'reef' ? 0.5 : 0.9) * U; ctx.lineJoin = 'round';
  blobPath(r.x, r.y, r.r, r.seed, 1.0); ctx.stroke();
  if (r.kind !== 'reef') for (let i = 0; i < 46; i++) {
    const a = i * TAU / 46 + r.seed, f = (Math.sin(i * 12.9898 + r.seed) * 43758.5453) % 1, d = r.r * (1.04 + Math.abs(f) * 0.16);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, (0.15 + Math.abs(f) * 0.25) * U, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = S.fill; blobPath(r.x, r.y, r.r, r.seed, 0.97); ctx.fill();
  ctx.fillStyle = S.inner; blobPath(r.x - r.r * 0.08, r.y - r.r * 0.08, r.r, r.seed, 0.7); ctx.fill();
  const pulse = r.kind === 'lava' ? 0.6 + 0.4 * Math.sin(tm * 2 + r.seed) : 1;
  ctx.fillStyle = S.dot; ctx.globalAlpha = pulse;
  for (let i = 0; i < 4; i++) { const a = r.seed * 3 + i * 1.7; ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * r.r * 0.4, r.y + Math.sin(a) * r.r * 0.4, (r.kind === 'lava' ? 0.45 : 0.25) * U, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawGull(g, shadow) {
  const w = Math.sin(tmNow * 7 + g.ph), s = 0.7 + 0.3 * w;
  ctx.save();
  ctx.translate(g.x + (shadow ? 2.2 * U : 0), g.y + (shadow ? 3.2 * U : 0)); ctx.rotate(g.a);
  ctx.fillStyle = shadow ? 'rgba(0,50,80,.16)' : '#fdfdfd';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0.5 * U, 0);
    ctx.quadraticCurveTo(0.1 * U, sd * 1.6 * U * s, -1.1 * U, sd * 3.3 * U * s);
    ctx.quadraticCurveTo(-0.8 * U, sd * 1.2 * U, -1 * U, 0); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 1.5 * U, 0.5 * U, 0, 0, TAU); ctx.fill();
  if (!shadow) { ctx.fillStyle = '#f0a030'; ctx.beginPath(); ctx.arc(1.5 * U, 0, 0.22 * U, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------- boats ----------
function hullKayak() {
  ctx.fillStyle = '#f7c619';
  ctx.beginPath(); ctx.moveTo(3.4 * U, 0); ctx.quadraticCurveTo(1.2 * U, 1.35 * U, -3.2 * U, 0.35 * U); ctx.lineTo(-3.4 * U, 0);
  ctx.lineTo(-3.2 * U, -0.35 * U); ctx.quadraticCurveTo(1.2 * U, -1.35 * U, 3.4 * U, 0); ctx.fill();
  ctx.fillStyle = '#e0a912'; ctx.beginPath(); ctx.ellipse(-0.2 * U, 0, 1.3 * U, 0.65 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2f3b52'; ctx.beginPath(); ctx.ellipse(-0.2 * U, 0, 0.5 * U, 0.95 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e9b98f'; ctx.beginPath(); ctx.arc(-0.1 * U, 0, 0.42 * U, 0, TAU); ctx.fill();
  const sw = Math.sin(tmNow * 6) * 0.4;
  ctx.save(); ctx.translate(-0.1 * U, 0); ctx.rotate(sw);
  ctx.strokeStyle = '#444'; ctx.lineWidth = 0.22 * U; ctx.beginPath(); ctx.moveTo(0, -2.7 * U); ctx.lineTo(0, 2.7 * U); ctx.stroke();
  ctx.fillStyle = '#d8402f';
  ctx.beginPath(); ctx.ellipse(0, -2.6 * U, 0.35 * U, 0.8 * U, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 2.6 * U, 0.35 * U, 0.8 * U, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function hullSpeedboat() {
  ctx.fillStyle = '#e8eef2';
  ctx.beginPath(); ctx.moveTo(4 * U, 0); ctx.quadraticCurveTo(1.5 * U, 1.7 * U, -3.4 * U, 1.5 * U); ctx.lineTo(-3.4 * U, -1.5 * U); ctx.quadraticCurveTo(1.5 * U, -1.7 * U, 4 * U, 0); ctx.fill();
  ctx.fillStyle = '#d8402f'; ctx.beginPath(); ctx.moveTo(3.6 * U, 0); ctx.quadraticCurveTo(1.5 * U, 0.9 * U, -3.4 * U, 0.7 * U); ctx.lineTo(-3.4 * U, -0.7 * U); ctx.quadraticCurveTo(1.5 * U, -0.9 * U, 3.6 * U, 0); ctx.fill();
  ctx.fillStyle = '#8fd3ee'; ctx.beginPath(); ctx.ellipse(0.8 * U, 0, 0.9 * U, 1 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2f3b52'; ctx.beginPath(); ctx.arc(-1.3 * U, 0, 0.55 * U, 0, TAU); ctx.fill();
  ctx.fillStyle = '#333'; ctx.fillRect(-3.8 * U, -0.5 * U, 0.6 * U, 1 * U);
}
function hullJetski() {
  ctx.fillStyle = '#1fb5a8';
  ctx.beginPath(); ctx.moveTo(3 * U, 0); ctx.quadraticCurveTo(1 * U, 1.3 * U, -2.6 * U, 1.1 * U); ctx.lineTo(-2.6 * U, -1.1 * U); ctx.quadraticCurveTo(1 * U, -1.3 * U, 3 * U, 0); ctx.fill();
  ctx.fillStyle = '#f2f6f8'; ctx.fillRect(-1.6 * U, -0.9 * U, 0.5 * U, 1.8 * U);
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0.8 * U, 0, 0.5 * U, 0.35 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e04f3a'; ctx.beginPath(); ctx.ellipse(-0.6 * U, 0, 0.55 * U, 0.85 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e9b98f'; ctx.beginPath(); ctx.arc(-0.5 * U, 0, 0.4 * U, 0, TAU); ctx.fill();
}
function drawBoat() {
  const hull = { kayak: hullKayak, speedboat: hullSpeedboat, jetski: hullJetski }[save.boat] || hullKayak;
  ctx.save(); ctx.translate(boat.x + 0.8 * U, boat.y + 1.1 * U); ctx.rotate(boat.a);
  ctx.fillStyle = 'rgba(0,50,90,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.2 * U, 1.1 * U, 0, 0, TAU); ctx.fill();
  ctx.restore();
  if (boat.dashT > 0) { // speed streaks
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.35 * U;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(boat.x - Math.cos(boat.a) * 3 * U - Math.sin(boat.a) * i * 1.2 * U, boat.y - Math.sin(boat.a) * 3 * U + Math.cos(boat.a) * i * 1.2 * U); ctx.lineTo(boat.x - Math.cos(boat.a) * 9 * U - Math.sin(boat.a) * i * 1.2 * U, boat.y - Math.sin(boat.a) * 9 * U + Math.cos(boat.a) * i * 1.2 * U); ctx.stroke(); }
  }
  ctx.save(); ctx.translate(boat.x, boat.y); ctx.rotate(boat.a);
  if (boat.inv > 0 && boat.dashT <= 0 && Math.floor(boat.inv * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  hull();
  ctx.restore();
  if (boat.shield > 0) {
    const blink = boat.shield < 1.5 && Math.floor(boat.shield * 8) % 2 === 0;
    if (!blink) {
      ctx.strokeStyle = 'rgba(127,216,255,.9)'; ctx.fillStyle = 'rgba(127,216,255,.18)'; ctx.lineWidth = 0.4 * U;
      ctx.beginPath(); ctx.arc(boat.x, boat.y, 3.6 * U, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
}

// ---------- enemies ----------
function drawEnemy(e, tm) {
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.type === 'torpedo') {
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#3d4852';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-1.2 * U, sd * 0.6 * U); ctx.lineTo(-2.9 * U, sd * 1.7 * U); ctx.lineTo(-2.3 * U, sd * 0.5 * U); ctx.fill(); }
    ctx.fillStyle = '#6b7882'; ctx.beginPath(); ctx.ellipse(-0.3 * U, 0, 2.7 * U, 0.95 * U, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-0.1 * U, -0.4 * U, 1.8 * U, 0.22 * U, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(-1 * U, -0.9 * U, 0.5 * U, 1.8 * U);
    ctx.fillStyle = '#2d3640'; ctx.fillRect(-2.9 * U, -0.5 * U, 0.6 * U, 1 * U);
  } else if (e.type === 'mine') {
    const pulse = 1 + Math.sin(e.age * 6) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#2a2f33'; ctx.lineWidth = 0.5 * U;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 1.8 * U, Math.sin(a) * 1.8 * U); ctx.lineTo(Math.cos(a) * 2.9 * U, Math.sin(a) * 2.9 * U); ctx.stroke(); }
    ctx.fillStyle = '#3b4248'; ctx.beginPath(); ctx.arc(0, 0, 2 * U, 0, TAU); ctx.fill();
    ctx.fillStyle = Math.floor(e.age * 3) % 2 ? '#ff4444' : '#661a1a'; ctx.beginPath(); ctx.arc(0, 0, 0.6 * U, 0, TAU); ctx.fill();
  } else if (e.type === 'gunboat') {
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath(); ctx.moveTo(3.4 * U, 0); ctx.quadraticCurveTo(2 * U, 1.9 * U, -2.8 * U, 1.7 * U); ctx.lineTo(-3.2 * U, 0); ctx.lineTo(-2.8 * U, -1.7 * U); ctx.quadraticCurveTo(2 * U, -1.9 * U, 3.4 * U, 0); ctx.fill();
    ctx.fillStyle = '#b8b2a6'; ctx.beginPath(); ctx.roundRect(-1.8 * U, -1 * U, 2 * U, 2 * U, 0.4 * U); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(0.2 * U, -0.25 * U, 3.6 * U, 0.5 * U);
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(0.2 * U, 0, 0.8 * U, 0, TAU); ctx.fill();
  } else if (e.type === 'dasher') {
    drawTrailLater.push(e);
    if (e.ph === 1) {
      ctx.save(); ctx.rotate(e.a); ctx.strokeStyle = `rgba(255,70,70,${0.35 + 0.35 * Math.sin(e.age * 40)})`; ctx.lineWidth = 0.7 * U; ctx.setLineDash([2 * U, 1.5 * U]);
      ctx.beginPath(); ctx.moveTo(2 * U, 0); ctx.lineTo(70 * U, 0); ctx.stroke(); ctx.restore();
    }
    ctx.rotate(e.a);
    ctx.fillStyle = e.ph === 1 ? '#ff7a5c' : '#e8932f';
    ctx.beginPath(); ctx.moveTo(2.4 * U, 0); ctx.quadraticCurveTo(0, 1.3 * U, -2.4 * U, 0.2 * U); ctx.lineTo(-3.4 * U, 1.2 * U); ctx.lineTo(-3 * U, 0); ctx.lineTo(-3.4 * U, -1.2 * U); ctx.lineTo(-2.4 * U, -0.2 * U); ctx.quadraticCurveTo(0, -1.3 * U, 2.4 * U, 0); ctx.fill();
    ctx.strokeStyle = '#e9e9e9'; ctx.lineWidth = 0.3 * U; ctx.beginPath(); ctx.moveTo(2.3 * U, 0); ctx.lineTo(5.2 * U, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.3 * U, -0.3 * U, 0.25 * U, 0, TAU); ctx.fill();
  } else if (e.type === 'launcher') {
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#2f4156';
    ctx.beginPath(); ctx.moveTo(4 * U, 0); ctx.quadraticCurveTo(2.6 * U, 2.3 * U, -3.6 * U, 2.2 * U); ctx.lineTo(-4 * U, 1.4 * U); ctx.lineTo(-4 * U, -1.4 * U); ctx.lineTo(-3.6 * U, -2.2 * U); ctx.quadraticCurveTo(2.6 * U, -2.3 * U, 4 * U, 0); ctx.fill();
    ctx.fillStyle = '#4a617a'; ctx.beginPath(); ctx.moveTo(3 * U, 0); ctx.quadraticCurveTo(2 * U, 1.5 * U, -3 * U, 1.5 * U); ctx.lineTo(-3 * U, -1.5 * U); ctx.quadraticCurveTo(2 * U, -1.5 * U, 3 * U, 0); ctx.fill();
    ctx.fillStyle = '#9aa5ae'; ctx.fillRect(-1.6 * U, -0.9 * U, 1.8 * U, 1.8 * U);
    for (const sd of [-1, 1]) { ctx.fillStyle = '#1f2a36'; ctx.fillRect(0.4 * U, sd * 1.35 * U - 0.35 * U, 3 * U, 0.7 * U); ctx.fillStyle = '#6b7882'; ctx.beginPath(); ctx.arc(3.4 * U, sd * 1.35 * U, 0.35 * U, 0, TAU); ctx.fill(); }
  } else if (e.type === 'layer') {
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#5b6b3c';
    ctx.beginPath(); ctx.moveTo(3 * U, 0); ctx.quadraticCurveTo(2 * U, 1.8 * U, -3 * U, 1.8 * U); ctx.lineTo(-3 * U, -1.8 * U); ctx.quadraticCurveTo(2 * U, -1.8 * U, 3 * U, 0); ctx.fill();
    ctx.fillStyle = '#c9c3a0'; ctx.fillRect(0, -0.9 * U, 1.6 * U, 1.8 * U);
    ctx.fillStyle = '#2b2f33'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(-2.4 * U, sd * 0.9 * U, 0.65 * U, 0, TAU); ctx.fill(); ctx.fillStyle = '#c93a2e'; ctx.beginPath(); ctx.arc(-2.4 * U, sd * 0.9 * U, 0.22 * U, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2f33'; }
  } else if (e.type === 'battleship') {
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#59646e';
    ctx.beginPath(); ctx.moveTo(8.5 * U, 0); ctx.quadraticCurveTo(5 * U, 3.4 * U, -6 * U, 3.2 * U); ctx.lineTo(-7 * U, 2 * U); ctx.lineTo(-7 * U, -2 * U); ctx.lineTo(-6 * U, -3.2 * U); ctx.quadraticCurveTo(5 * U, -3.4 * U, 8.5 * U, 0); ctx.fill();
    ctx.fillStyle = '#7b8791'; ctx.beginPath(); ctx.moveTo(7 * U, 0); ctx.quadraticCurveTo(4.5 * U, 2.4 * U, -5.5 * U, 2.2 * U); ctx.lineTo(-5.5 * U, -2.2 * U); ctx.quadraticCurveTo(4.5 * U, -2.4 * U, 7 * U, 0); ctx.fill();
    ctx.fillStyle = '#a04040'; ctx.fillRect(-6 * U, -2.3 * U, 1 * U, 4.6 * U);
    ctx.fillStyle = '#9aa5ae'; ctx.fillRect(-3 * U, -1.3 * U, 3 * U, 2.6 * U);
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(-1.5 * U, 0, 0.8 * U, 0, TAU); ctx.fill();
    for (const x of [3.8 * U, 0.8 * U]) { ctx.fillStyle = '#3a434b'; ctx.beginPath(); ctx.arc(x, 0, 1.3 * U, 0, TAU); ctx.fill(); ctx.fillRect(x, -0.28 * U, 3.2 * U, 0.56 * U); }
  } else if (e.type === 'octopus') {
    const ph = e.age * 3;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#8a5ab5';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + e.age * 0.3; ctx.lineWidth = 1.5 * U; ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const rr = 3 * U + k * 0.9 * U, off = Math.sin(ph + i + k * 0.7) * 0.9 * U * (k / 8);
        const x = Math.cos(a) * rr - Math.sin(a) * off, y = Math.sin(a) * rr + Math.cos(a) * off;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#7a4fa0'; ctx.beginPath(); ctx.arc(0, 0, 4 * U, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9468bd'; ctx.beginPath(); ctx.arc(-0.8 * U, -0.8 * U, 2.6 * U, 0, TAU); ctx.fill();
    ctx.rotate(e.a);
    for (const sd of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2 * U, sd * 1.5 * U, 0.9 * U, 0, TAU); ctx.fill(); ctx.fillStyle = '#c0282d'; ctx.beginPath(); ctx.arc(2.3 * U, sd * 1.5 * U, 0.45 * U, 0, TAU); ctx.fill(); }
  } else { // shark
    drawTrailLater.push(e);
    ctx.rotate(e.a);
    ctx.fillStyle = '#566673';
    ctx.beginPath(); ctx.moveTo(3 * U, 0); ctx.quadraticCurveTo(0, 1.8 * U, -3 * U, 0.4 * U); ctx.lineTo(-4 * U, 1.6 * U); ctx.lineTo(-3.6 * U, 0); ctx.lineTo(-4 * U, -1.6 * U); ctx.lineTo(-3 * U, -0.4 * U); ctx.quadraticCurveTo(0, -1.8 * U, 3 * U, 0); ctx.fill();
    ctx.fillStyle = '#3d4a54'; ctx.beginPath(); ctx.moveTo(0.4 * U, 0); ctx.lineTo(-1.2 * U, 0.2 * U); ctx.lineTo(-0.4 * U, 1.7 * U); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.8 * U, -0.5 * U, 0.3 * U, 0, TAU); ctx.fill();
  }
  if (e.flash > 0) { ctx.globalAlpha = Math.min(1, e.flash * 4) * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}

function drawTourist(o, tm) {
  const hull = `hsl(${o.hue},65%,55%)`, dark = `hsl(${o.hue},60%,38%)`;
  ctx.save(); ctx.translate(o.x + 0.8 * U, o.y + 1 * U); ctx.rotate(o.a);
  ctx.fillStyle = 'rgba(0,50,90,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * U, 1.8 * U, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(3.8 * U, 0); ctx.quadraticCurveTo(2.6 * U, 2.1 * U, -3.2 * U, 2.1 * U); ctx.lineTo(-3.6 * U, 1.4 * U); ctx.lineTo(-3.6 * U, -1.4 * U); ctx.lineTo(-3.2 * U, -2.1 * U); ctx.quadraticCurveTo(2.6 * U, -2.1 * U, 3.8 * U, 0); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(-3.2 * U, -0.2 * U, 6 * U, 0.4 * U);
  ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.roundRect(-2.4 * U, -1.3 * U, 3.4 * U, 2.6 * U, 0.5 * U); ctx.fill(); // canopy
  ctx.fillStyle = dark; ctx.fillRect(-2.4 * U, -1.3 * U, 3.4 * U, 0.3 * U);
  for (let i = 0; i < 3; i++) { // tourists
    const py = (i - 1) * 0.75 * U, wave = Math.sin(tm * 5 + o.ph + i) * 0.35 * U;
    ctx.fillStyle = ['#e9b98f', '#c98f66', '#f2c9a0'][i]; ctx.beginPath(); ctx.arc(1.8 * U, py, 0.38 * U, 0, TAU); ctx.fill();
    ctx.strokeStyle = ['#e9b98f', '#c98f66', '#f2c9a0'][i]; ctx.lineWidth = 0.2 * U; ctx.beginPath(); ctx.moveTo(1.8 * U, py); ctx.lineTo(2.6 * U, py + wave); ctx.stroke();
  }
  ctx.restore();
}
function drawFisher(o, tm) {
  const hull = `hsl(${o.hue},60%,45%)`, bob = o.anchored ? Math.sin(tm * 1.3 + o.ph) * 0.25 * U : 0;
  ctx.save(); ctx.translate(o.x + 0.8 * U, o.y + 1 * U + bob); ctx.rotate(o.a);
  ctx.fillStyle = 'rgba(0,50,90,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.4 * U, 1.6 * U, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(o.x, o.y + bob); ctx.rotate(o.a + (o.anchored ? Math.sin(tm * 0.9 + o.ph) * 0.06 : 0));
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(3.4 * U, 0); ctx.quadraticCurveTo(2.2 * U, 1.8 * U, -3 * U, 1.8 * U); ctx.lineTo(-3 * U, -1.8 * U); ctx.quadraticCurveTo(2.2 * U, -1.8 * U, 3.4 * U, 0); ctx.fill();
  ctx.fillStyle = '#f0e6d0'; ctx.fillRect(-1.8 * U, -1 * U, 1.8 * U, 2 * U);
  ctx.fillStyle = '#7a8a96'; ctx.fillRect(-1.8 * U, -1 * U, 1.8 * U, 0.3 * U);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 0.2 * U; ctx.beginPath(); ctx.moveTo(1.4 * U, 0); ctx.lineTo(1.4 * U, -1.8 * U); ctx.moveTo(1.4 * U, -1.8 * U); ctx.lineTo(-2.4 * U, -1.9 * U); ctx.stroke();
  ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(2.2 * U, 0, 0.3 * U, 0, TAU); ctx.fill();
  ctx.restore();
  if (o.anchored) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.2 * U; ctx.beginPath(); ctx.arc(o.x, o.y, 4.4 * U + Math.sin(tm + o.ph) * 0.3 * U, 0, TAU); ctx.stroke(); }
}
function drawCruise(o, tm) {
  ctx.save(); ctx.translate(o.x + 1.2 * U, o.y + 1.6 * U); ctx.rotate(o.a);
  ctx.fillStyle = 'rgba(0,50,90,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 8 * U, 3.6 * U, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  ctx.fillStyle = '#f6f8fa'; ctx.beginPath(); ctx.moveTo(8.4 * U, 0); ctx.quadraticCurveTo(6 * U, 3.4 * U, -6.5 * U, 3.4 * U); ctx.lineTo(-7.5 * U, 2.4 * U); ctx.lineTo(-7.5 * U, -2.4 * U); ctx.lineTo(-6.5 * U, -3.4 * U); ctx.quadraticCurveTo(6 * U, -3.4 * U, 8.4 * U, 0); ctx.fill();
  ctx.fillStyle = '#1f5fa8'; ctx.beginPath(); ctx.moveTo(7.6 * U, 0); ctx.quadraticCurveTo(5.5 * U, 0.6 * U, -7 * U, 0.6 * U); ctx.lineTo(-7 * U, -0.6 * U); ctx.quadraticCurveTo(5.5 * U, -0.6 * U, 7.6 * U, 0); ctx.fill();
  ctx.fillStyle = '#dfe6ec'; ctx.beginPath(); ctx.roundRect(-5.8 * U, -2.3 * U, 11 * U, 4.6 * U, 1.2 * U); ctx.fill();
  ctx.fillStyle = '#9fc3e6'; for (let i = 0; i < 9; i++) { ctx.fillRect((-5 + i * 1.2) * U, -2 * U, 0.7 * U, 0.5 * U); ctx.fillRect((-5 + i * 1.2) * U, 1.5 * U, 0.7 * U, 0.5 * U); }
  ctx.fillStyle = '#f6f8fa'; ctx.beginPath(); ctx.roundRect(-3.5 * U, -1.4 * U, 6 * U, 2.8 * U, 0.8 * U); ctx.fill();
  for (const x of [-0.8 * U, 1.8 * U]) { ctx.fillStyle = '#d8402f'; ctx.beginPath(); ctx.ellipse(x, 0, 0.9 * U, 0.7 * U, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(x, 0, 0.9 * U, 0.7 * U, 0, -0.4, 0.4); ctx.fill(); }
  ctx.fillStyle = '#4fb0e6'; ctx.beginPath(); ctx.arc(-4.6 * U, 0, 0.9 * U, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawSkierRig(o, tm) {
  const k = skierPos(o), sw = Math.sin(worldT * 1.7 + o.ph);
  // tow rope
  ctx.strokeStyle = 'rgba(40,40,40,.8)'; ctx.lineWidth = 0.15 * U; ctx.beginPath();
  ctx.moveTo(o.x - Math.cos(o.a) * 3 * U, o.y - Math.sin(o.a) * 3 * U); ctx.lineTo(k.x, k.y); ctx.stroke();
  // wake behind the skier
  const ha = Math.atan2(o.y - k.y, o.x - k.x);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.4 * U;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - Math.cos(ha + sd * 0.35) * 5 * U, k.y - Math.sin(ha + sd * 0.35) * 5 * U); ctx.stroke(); }
  ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(ha + sw * 0.25);
  ctx.fillStyle = '#e04f3a'; for (const sd of [-1, 1]) ctx.fillRect(-1.6 * U, sd * 0.55 * U - 0.15 * U, 3.4 * U, 0.3 * U); // skis
  ctx.fillStyle = `hsl(${o.hue},70%,50%)`; ctx.beginPath(); ctx.ellipse(0, 0, 0.55 * U, 0.9 * U, 0, 0, TAU); ctx.fill(); // torso
  ctx.strokeStyle = '#e9b98f'; ctx.lineWidth = 0.22 * U; ctx.beginPath(); ctx.moveTo(0.2 * U, -0.6 * U); ctx.lineTo(1.5 * U, -0.2 * U); ctx.moveTo(0.2 * U, 0.6 * U); ctx.lineTo(1.5 * U, 0.2 * U); ctx.stroke(); // arms to rope
  ctx.fillStyle = '#e9b98f'; ctx.beginPath(); ctx.arc(0, 0, 0.42 * U, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2f3b52'; ctx.beginPath(); ctx.arc(-0.05 * U, 0, 0.3 * U, Math.PI * 0.6, Math.PI * 1.4); ctx.fill(); // hair
  ctx.restore();
  drawTourist(o, tm);
}
function drawSchools() {
  for (const sc of schools) {
    ctx.fillStyle = `hsla(${sc.hue},70%,${sc.hue === 200 ? 75 : 60}%,.85)`;
    for (const f of sc.fish) {
      if (!onScreen(f.x, f.y, 4 * U)) continue;
      const a = Math.atan2(f.vy, f.vx || 0.001), wag = Math.sin(worldT * 14 + f.ph) * 0.4;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.9 * U, 0.38 * U, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.7 * U, 0); ctx.lineTo(-1.5 * U, -0.5 * U + wag * 0.4 * U); ctx.lineTo(-1.5 * U, 0.5 * U + wag * 0.4 * U); ctx.fill();
      ctx.restore();
    }
  }
}
function drawPlastic(o, tm) {
  const bob = Math.sin(tm * 1.5 + o.ph) * 0.25 * U;
  ctx.save(); ctx.translate(o.x, o.y + bob); ctx.rotate(o.rot + Math.sin(tm * 0.7 + o.ph) * 0.3);
  ctx.fillStyle = 'rgba(0,50,80,.18)'; ctx.beginPath(); ctx.ellipse(0.3 * U, 0.4 * U, 1.1 * U, 0.6 * U, 0, 0, TAU); ctx.fill();
  if (o.type === 0) { // bottle
    ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.beginPath(); ctx.roundRect(-1.1 * U, -0.4 * U, 2.2 * U, 0.8 * U, 0.35 * U); ctx.fill();
    ctx.fillStyle = '#2f9bd8'; ctx.fillRect(1 * U, -0.28 * U, 0.4 * U, 0.56 * U);
    ctx.fillStyle = 'rgba(80,150,200,.6)'; ctx.fillRect(-0.4 * U, -0.4 * U, 0.7 * U, 0.8 * U);
  } else if (o.type === 1) { // bag
    ctx.fillStyle = 'rgba(245,245,245,.85)'; ctx.beginPath(); ctx.moveTo(-1 * U, 0); ctx.quadraticCurveTo(-0.4 * U, -1.2 * U, 0.7 * U, -0.6 * U); ctx.quadraticCurveTo(1.4 * U, 0.1 * U, 0.4 * U, 0.8 * U); ctx.quadraticCurveTo(-0.7 * U, 1 * U, -1 * U, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(200,200,200,.9)'; ctx.lineWidth = 0.12 * U; ctx.stroke();
  } else { // can
    ctx.fillStyle = '#c9ced3'; ctx.beginPath(); ctx.roundRect(-0.8 * U, -0.5 * U, 1.6 * U, 1 * U, 0.2 * U); ctx.fill();
    ctx.fillStyle = '#d8402f'; ctx.fillRect(-0.3 * U, -0.5 * U, 0.7 * U, 1 * U);
  }
  ctx.restore();
}
function drawIce(r, tm) {
  const g = ctx.createRadialGradient(r.x, r.y, r.r * 0.5, r.x, r.y, r.r * 1.5);
  g.addColorStop(0, 'rgba(210,238,252,.55)'); g.addColorStop(1, 'rgba(210,238,252,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(226,244,252,.82)'; blobPath(r.x, r.y, r.r, r.seed, 1.0); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 0.5 * U; blobPath(r.x, r.y, r.r, r.seed, 1.0); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; blobPath(r.x - r.r * 0.12, r.y - r.r * 0.12, r.r, r.seed, 0.55); ctx.fill();
  ctx.strokeStyle = 'rgba(120,175,215,.55)'; ctx.lineWidth = 0.18 * U; ctx.beginPath(); // cracks
  for (let i = 0; i < 4; i++) { const a = r.seed * 2 + i * 1.6, a2 = a + 0.5; ctx.moveTo(r.x + Math.cos(a) * r.r * 0.15, r.y + Math.sin(a) * r.r * 0.15); ctx.lineTo(r.x + Math.cos(a) * r.r * 0.5, r.y + Math.sin(a) * r.r * 0.5); ctx.lineTo(r.x + Math.cos(a2) * r.r * 0.8, r.y + Math.sin(a2) * r.r * 0.8); }
  ctx.stroke();
  const sh = (tm * 0.4 + r.seed) % 1; ctx.fillStyle = `rgba(255,255,255,${(0.5 * Math.sin(sh * Math.PI)).toFixed(2)})`; // glint
  ctx.beginPath(); ctx.arc(r.x + Math.cos(r.seed) * r.r * 0.4, r.y + Math.sin(r.seed) * r.r * 0.4, 0.5 * U, 0, TAU); ctx.fill();
}
function drawMine(m, tm, col) {
  const bob = Math.sin(tm * 1.6 + m.ph) * 0.5 * U;
  ctx.fillStyle = 'rgba(0,50,80,.25)'; ctx.beginPath(); ctx.ellipse(m.x + 0.6 * U, m.y + 1.2 * U + bob, 2.2 * U, 1.6 * U, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(m.x, m.y + bob); ctx.rotate(Math.sin(tm * 0.8 + m.ph) * 0.2);
  ctx.strokeStyle = '#2a2f33'; ctx.lineWidth = 0.55 * U;
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 1.9 * U, Math.sin(a) * 1.9 * U); ctx.lineTo(Math.cos(a) * 3 * U, Math.sin(a) * 3 * U); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.cos(a) * 3 * U, Math.sin(a) * 3 * U, 0.35 * U, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#4a5258'; ctx.beginPath(); ctx.arc(0, 0, 2.1 * U, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6a737a'; ctx.beginPath(); ctx.arc(-0.6 * U, -0.6 * U, 0.8 * U, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCoin(k, tm) {
  const sx = Math.abs(Math.cos(tm * 4 + k.x * 0.01));
  ctx.fillStyle = '#e6a800'; ctx.beginPath(); ctx.ellipse(k.x, k.y, 1.3 * U * sx + 0.2 * U, 1.3 * U, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.ellipse(k.x, k.y, 0.9 * U * sx + 0.1 * U, 0.9 * U, 0, 0, TAU); ctx.fill();
}
function drawChest(k, tm) {
  const bob = Math.sin(tm * 2 + k.x) * 0.3 * U;
  ctx.save(); ctx.translate(k.x, k.y + bob);
  ctx.fillStyle = 'rgba(255,216,77,.2)'; ctx.beginPath(); ctx.arc(0, 0, 3.6 * U, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.roundRect(-2 * U, -1.2 * U, 4 * U, 2.6 * U, 0.4 * U); ctx.fill();
  ctx.fillStyle = '#a8713a'; ctx.beginPath(); ctx.roundRect(-2 * U, -1.6 * U, 4 * U, 1.2 * U, 0.5 * U); ctx.fill();
  ctx.fillStyle = '#ffd24d'; ctx.fillRect(-2 * U, -0.5 * U, 4 * U, 0.35 * U); ctx.fillRect(-0.35 * U, -0.6 * U, 0.7 * U, 1 * U);
  ctx.restore();
}
function drawPool(p, tm) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.R);
  g.addColorStop(0, 'rgba(0,40,70,.75)'); g.addColorStop(0.35, 'rgba(0,60,95,.3)'); g.addColorStop(1, 'rgba(0,60,95,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.R, 0, TAU); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${(0.5 - i * 0.07).toFixed(2)})`; ctx.lineWidth = (0.5 - i * 0.05) * U;
    const a0 = tm * (2.2 - i * 0.25) + i * 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.R * (0.18 + i * 0.16), a0, a0 + 3.6); ctx.stroke();
  }
}
function drawCurrent(c, tm) {
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.35 * U; ctx.lineCap = 'round';
  for (let k = -3; k <= 3; k++) {
    const along = ((tm * 12 * U + (k + 3) * 9 * U) % (2 * c.r)) - c.r, off = k * c.r / 4.2;
    if (Math.hypot(along, off) > c.r * 0.92) continue;
    const x = c.x + c.dx * along - c.dy * off, y = c.y + c.dy * along + c.dx * off;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c.dx * 3.5 * U, y + c.dy * 3.5 * U); ctx.stroke();
  }
}
function drawPowerup(p, tm) {
  const d = PU[p.type], s = 1 + Math.sin(tm * 5) * 0.1, fade = p.life < 3 && Math.floor(p.life * 6) % 2 === 0 ? 0.4 : 1;
  ctx.globalAlpha = fade;
  ctx.fillStyle = d.col + '40'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6 * U * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = d.col; ctx.lineWidth = 0.4 * U; ctx.beginPath(); ctx.arc(p.x, p.y, 2.8 * U * s, 0, TAU); ctx.stroke();
  ctx.font = `${3 * U}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(d.icon, p.x, p.y + 0.2 * U); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}

// ---------- screen-space buttons ----------
function btns() {
  return { dash: { x: W - SAFE.r - 10 * HU, y: H - SAFE.b - 10 * HU, r: 7 * HU }, fire: { x: W - SAFE.r - 26 * HU, y: H - SAFE.b - 9 * HU, r: 5.5 * HU }, pause: { x: W - SAFE.r - 6 * HU, y: SAFE.t + 6 * HU, r: 4.2 * HU } };
}
function drawButtons() {
  const b = btns(), B = BOATS[save.boat];
  // dash
  const cdMax = B.dashCd * (1 - 0.12 * save.up.dash), ready = boat.dashCd <= 0;
  ctx.fillStyle = ready ? 'rgba(127,216,255,.35)' : 'rgba(0,30,50,.35)'; ctx.beginPath(); ctx.arc(b.dash.x, b.dash.y, b.dash.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = ready ? '#7fd8ff' : 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.5 * HU;
  ctx.beginPath(); ctx.arc(b.dash.x, b.dash.y, b.dash.r, -Math.PI / 2, -Math.PI / 2 + TAU * (ready ? 1 : 1 - boat.dashCd / cdMax)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${2.6 * HU}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('DASH', b.dash.x, b.dash.y + 0.9 * HU);
  // fire
  if (boat.weapon) {
    ctx.fillStyle = 'rgba(255,154,92,.4)'; ctx.beginPath(); ctx.arc(b.fire.x, b.fire.y, b.fire.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff9a5c'; ctx.lineWidth = 0.4 * HU; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `${3 * HU}px sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(PU[boat.weapon].icon, b.fire.x, b.fire.y - 0.6 * HU);
    ctx.textBaseline = 'alphabetic'; ctx.font = `bold ${2.4 * HU}px sans-serif`; ctx.fillText('x' + boat.ammo, b.fire.x, b.fire.y + 3 * HU);
  }
  // pause
  ctx.fillStyle = 'rgba(0,30,50,.35)'; ctx.beginPath(); ctx.arc(b.pause.x, b.pause.y, b.pause.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(b.pause.x - 1.2 * HU, b.pause.y - 1.3 * HU, 0.8 * HU, 2.6 * HU); ctx.fillRect(b.pause.x + 0.4 * HU, b.pause.y - 1.3 * HU, 0.8 * HU, 2.6 * HU);
}

// drifting wave crests, anchored to the world so they slide past as you sail
function drawWaves(tm) {
  const cell = 13 * U, x0 = Math.floor(cam.x / cell) - 1, x1 = Math.ceil((cam.x + W) / cell) + 1, y0 = Math.floor(cam.y / cell) - 1, y1 = Math.ceil((cam.y + H) / cell) + 1;
  ctx.lineCap = 'round'; ctx.lineWidth = 0.55 * U;
  for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
    const h = hash2(ix, iy, 77), r1 = (h & 255) / 255, r2 = ((h >> 8) & 255) / 255, r3 = ((h >> 16) & 255) / 255;
    const life = (tm * 0.25 + r3 * 3) % 1, a = Math.sin(life * Math.PI);          // fade in/out
    if (a < 0.05) continue;
    const drift = life * 5 * U, x = ix * cell + r1 * cell + drift - cam.x, y = iy * cell + r2 * cell + drift * 0.3 - cam.y, w = (4 + r1 * 4) * U;
    ctx.strokeStyle = `rgba(255,255,255,${(a * 0.7).toFixed(2)})`;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 1.3 * U, x + w, y + 0.2 * U); ctx.stroke();
    if (r2 > 0.55) { ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + 1.8 * U); ctx.quadraticCurveTo(x, y + 0.7 * U, x + w * 0.6, y + 1.9 * U); ctx.stroke(); }
  }
}

function drawTide(tm) {
  const T = tide;
  if (T.ph !== 'run') return;
  ctx.save(); ctx.translate(T.px + Math.cos(T.a) * T.s, T.py + Math.sin(T.a) * T.s); ctx.rotate(T.a);
  const w = TIDE_W * U, L = Math.hypot(W, H);
  const g = ctx.createLinearGradient(-w, 0, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(210,240,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,.6)');
  ctx.fillStyle = g; ctx.fillRect(-w, -L, w, 2 * L);
  // foamy wavy crest
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.1 * U; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let y = -L; y <= L; y += 2 * U) { const x = Math.sin(y * 0.12 + tm * 5) * 1.1 * U; y === -L ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.5 * U;
  for (const k of [3, 6]) { ctx.beginPath(); for (let y = -L; y <= L; y += 2 * U) { const x = -k * U + Math.sin(y * 0.1 + tm * 4 + k) * 1 * U; y === -L ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
}
function drawTideWarning(tm) {
  if (tide.ph !== 'warn') return;
  const T = tide, edge = 7 * U, dx = Math.cos(T.a), dy = Math.sin(T.a), pulse = 0.35 + 0.35 * Math.sin(tm * 14);
  ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(2)})`;
  if (dx > 0.5) ctx.fillRect(0, 0, edge, H); else if (dx < -0.5) ctx.fillRect(W - edge, 0, edge, H);
  else if (dy > 0.5) ctx.fillRect(0, 0, W, edge); else ctx.fillRect(0, H - edge, W, edge);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 1; i <= 5; i++) { // chevrons showing travel direction
    const cx = dx > 0.5 ? edge + 4 * U : dx < -0.5 ? W - edge - 4 * U : W * i / 6, cy = dy > 0.5 ? edge + 4 * U : dy < -0.5 ? H - edge - 4 * U : H * i / 6;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(T.a); ctx.beginPath(); ctx.moveTo(2 * U, 0); ctx.lineTo(-1.2 * U, 1.8 * U); ctx.lineTo(-1.2 * U, -1.8 * U); ctx.fill(); ctx.restore();
  }
}

// ---------- main draw ----------
function draw() {
  const tm = performance.now() / 1000; tmNow = tm;
  ctx.save();
  if (shake > 0.5) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
  const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, rgb(pal[0])); g.addColorStop(0.4, rgb(pal[1])); g.addColorStop(1, rgb(pal[2]));
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  for (let i = 0; i < 4; i++) {
    const px = W * (0.2 + 0.6 * ((i * 0.37 + Math.sin(tm * 0.1 + i) * 0.08) % 1)), py = H * (0.2 + 0.6 * ((i * 0.53 + Math.cos(tm * 0.08 + i) * 0.08) % 1)), pr = Math.max(W, H) * 0.35;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    rg.addColorStop(0, `rgba(${patchCol},${patchA.toFixed(2)})`); rg.addColorStop(1, `rgba(${patchCol},0)`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  for (const s of sparks) {
    const a = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(tm * s.sp + s.ph));
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    const sx = (((s.x * W - cam.x) % W) + W) % W, sy = (((s.y * H - cam.y) % H) + H) % H;
    ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, TAU); ctx.fill();
  }
  if (state !== 'menu') {
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    for (const c of currents) if (onScreen(c.x, c.y, c.r)) drawCurrent(c, tm);
    for (const p of pools) if (onScreen(p.x, p.y, p.R)) drawPool(p, tm);
    for (const r of rocks) if (onScreen(r.x, r.y, r.r * 2.2)) drawIsland(r, tm);
    drawTide(tm);
    for (const r of iceL) if (onScreen(r.x, r.y, r.r * 2)) drawIce(r, tm);
    drawSchools();
    for (const o of plasticsL) if (onScreen(o.x, o.y, 3 * U)) drawPlastic(o, tm);
    for (const m of smines) if (!m.dead && onScreen(m.x, m.y, 5 * U)) drawMine(m, tm, '#c93a2e');
    for (const m of hmines) if (!m.dead && onScreen(m.x, m.y, 5 * U)) drawMine(m, tm, '#e6a020');
    for (const k of coinsL) if (!k.dead && onScreen(k.x, k.y, 3 * U)) drawCoin(k, tm);
    for (const k of dcoins) if (onScreen(k.x, k.y, 3 * U)) drawCoin(k, tm);
    for (const k of chestsL) if (!k.dead && onScreen(k.x, k.y, 5 * U)) drawChest(k, tm);
    for (const p of powerups) drawPowerup(p, tm);
    // wake foam + trails
    for (const p of foam) { ctx.fillStyle = `rgba(255,255,255,${(0.55 * p.life / p.max).toFixed(2)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.6 - p.life / p.max), 0, TAU); ctx.fill(); }
    ctx.lineCap = 'round';
    drawTrail(boat, 'rgba(255,255,255,A)', 2.2 * U);
    for (const o of tourists) drawTrail(o, 'rgba(255,255,255,A)', o.kind === 'cruise' ? 3 * U : 1.6 * U);
    for (const o of anchoredL) if (onScreen(o.x, o.y, 8 * U)) drawFisher(o, tm);
    for (const o of tourists) if (onScreen(o.x, o.y, 12 * U)) (o.kind === 'cruise' ? drawCruise : o.kind === 'skier' ? drawSkierRig : o.kind === 'fisher' ? drawFisher : drawTourist)(o, tm);
    drawTrailLater = [];
    for (const e of enemies) drawEnemy(e, tm);
    for (const e of drawTrailLater) drawTrail(e, e.type === 'shark' ? 'rgba(200,230,255,A)' : 'rgba(255,255,255,A)', e.boss ? 3 * U : 1.4 * U);
    for (const z of zones) {
      const f = 1 - z.t / z.max, col = z.kind === 'bolt' ? '255,240,120' : '200,90,255';
      ctx.fillStyle = `rgba(${col},${(0.08 + 0.18 * f).toFixed(2)})`; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 0.5 * U; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * f, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
    }
    for (const s of shells) {
      ctx.fillStyle = 'rgba(255,170,60,.35)'; ctx.beginPath(); ctx.arc(s.x, s.y, 1.5 * U, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd27f'; ctx.beginPath(); ctx.arc(s.x, s.y, 0.8 * U, 0, TAU); ctx.fill();
    }
    for (const m of missiles) {
      drawTrail(m, 'rgba(255,200,120,A)', 1.2 * U);
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
      ctx.fillStyle = '#ff9a5c'; ctx.beginPath(); ctx.ellipse(0, 0, 1.6 * U, 0.55 * U, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.2 * U, 0, 0.3 * U, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (state === 'play' || state === 'pause') drawBoat();
    for (const r of rings) { ctx.strokeStyle = `rgba(255,220,160,${r.life / r.max})`; ctx.lineWidth = 0.6 * U; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
    for (const p of particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.font = `bold ${3.2 * U}px sans-serif`; ctx.textAlign = 'center';
    for (const f of floaters) { ctx.fillStyle = `rgba(255,236,150,${clamp(f.life, 0, 1)})`; ctx.fillText(f.text, f.x, f.y); }
    ctx.restore();
    if (state === 'play') for (const e of enemies) { // off-screen warning arrows
      if (onScreen(e.x, e.y, 0)) continue;
      const dx = e.x - cam.x - W / 2, dy = e.y - cam.y - H / 2;
      const k = Math.min((W / 2 - 4 * U) / Math.abs(dx || 1e-6), (H / 2 - 4 * U) / Math.abs(dy || 1e-6));
      ctx.save(); ctx.translate(W / 2 + dx * k, H / 2 + dy * k); ctx.rotate(Math.atan2(dy, dx));
      if (e.boss) ctx.scale(2, 2);
      ctx.fillStyle = e.boss ? 'rgba(255,60,200,.95)' : (e.type === 'dasher' || e.type === 'gunboat' || e.type === 'layer' || e.type === 'launcher') ? 'rgba(255,160,60,.85)' : 'rgba(255,80,70,.8)';
      ctx.beginPath(); ctx.moveTo(1.6 * U, 0); ctx.lineTo(-1 * U, 1.1 * U); ctx.lineTo(-1 * U, -1.1 * U); ctx.fill(); ctx.restore();
    }
  }
  for (const gl of gulls) drawGull(gl, true);
  for (const gl of gulls) drawGull(gl, false);
  ctx.restore();
  if (state !== 'menu') { drawAtmosphere(tm); drawTideWarning(tm); }
  drawHUD(tm);
}

// ---------- day / night / weather overlays ----------
function drawAtmosphere(tm) {
  const night = nightAmt(), tint = duskTint(), bx = boat.x - cam.x, by = boat.y - cam.y;
  if (tint > 0.01) { ctx.fillStyle = `rgba(255,120,40,${(tint * 0.2).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  const rainy = wType === 'rain' || wType === 'storm';
  if (rainy && wAmt > 0.01) {
    ctx.fillStyle = `rgba(10,25,45,${((wType === 'storm' ? 0.38 : 0.22) * wAmt).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(220,235,255,${(0.35 * wAmt).toFixed(2)})`; ctx.lineWidth = 0.18 * U; ctx.beginPath();
    for (let i = 0; i < 110; i++) {
      const x = (((i * 97.3 + tm * 25 * U) % (W + 60)) + W + 60) % (W + 60) - 30, y = (((i * 53.7 + tm * 90 * U) % (H + 40)) + H + 40) % (H + 40) - 20;
      ctx.moveTo(x, y); ctx.lineTo(x - 1.2 * U, y + 3.2 * U);
    }
    ctx.stroke();
  }
  if (wType === 'fog' && wAmt > 0.01) {
    const g = ctx.createRadialGradient(bx, by, 14 * U, bx, by, 50 * U);
    g.addColorStop(0, 'rgba(228,238,244,0)'); g.addColorStop(1, `rgba(228,238,244,${(0.85 * wAmt).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (night > 0.01) {
    const g = ctx.createRadialGradient(bx, by, 8 * U, bx, by, 42 * U);
    g.addColorStop(0, 'rgba(4,10,40,0)'); g.addColorStop(1, `rgba(4,10,40,${(0.68 * night).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${(flash * 0.7).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- HUD ----------
function drawHUD(tm) {
  ctx.textBaseline = 'alphabetic';
  if (state === 'menu') return;
  ctx.save(); ctx.translate(SAFE.l, SAFE.t);
  const shown = Math.floor(score), best = Math.max(Math.floor(save.best), shown);
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `bold ${3 * HU}px sans-serif`;
  ctx.fillText('SCORE  ' + shown, 3 * HU, 6 * HU);
  ctx.font = `bold ${2.6 * HU}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('BEST  ' + best, 3 * HU, 10 * HU);
  ctx.fillStyle = '#fff'; ctx.fillText('TIME  ' + Math.floor(t), 3 * HU, 13.5 * HU);
  ctx.fillStyle = '#ffd84d'; ctx.fillText('COINS  ' + runCoins, 3 * HU, 17 * HU);
  let y = 20.5 * HU; ctx.font = `bold ${2.5 * HU}px sans-serif`;
  const line = (txt, col) => { ctx.fillStyle = col; ctx.fillText(txt, 3 * HU, y); y += 3.2 * HU; };
  if (boat.shield > 0) line('SHIELD ' + boat.shield.toFixed(1) + 's', '#7fd8ff');
  if (speedT > 0) line('SPEED ' + speedT.toFixed(1) + 's', '#ffe14d');
  if (magnetT > 0) line('MAGNET ' + magnetT.toFixed(1) + 's', '#ff7a7a');
  if (slowT > 0) line('SLOW-MO ' + slowT.toFixed(1) + 's', '#c9a0ff');
  ctx.restore();
  if (boss && !boss.dead) { // boss bar
    const bw = Math.min(W * 0.6, 70 * HU), bx = (W - bw) / 2, by = 3 * HU + SAFE.t;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx, by, bw, 2.2 * HU);
    ctx.fillStyle = '#e0407a'; ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 2.2 * HU);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.2 * HU; ctx.strokeRect(bx, by, bw, 2.2 * HU);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `bold ${2 * HU}px sans-serif`; ctx.fillText(boss.type === 'battleship' ? 'BATTLESHIP' : 'KRAKEN', W / 2, by + 5.2 * HU);
  }
  if (banner.t > 0) {
    ctx.textAlign = 'center'; ctx.font = `bold ${5.5 * HU}px sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${clamp(banner.t, 0, 1).toFixed(2)})`; ctx.strokeStyle = `rgba(0,30,50,${clamp(banner.t, 0, 1).toFixed(2)})`; ctx.lineWidth = 0.6 * HU;
    ctx.strokeText(banner.text, W / 2, H * 0.28); ctx.fillText(banner.text, W / 2, H * 0.28);
  }
  if (state === 'play' || state === 'pause') drawButtons();
}
