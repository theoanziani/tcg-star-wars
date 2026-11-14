/* ================================================================
   RENDU 3D
   ================================================================ */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060b);
scene.fog = new THREE.FogExp2(0x04060b, 0.03);
const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.72, 0.45, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0x7d96c8, 0x0a0c12, 0.55));
const key = new THREE.DirectionalLight(0xc6d8ff, 1.7);
key.position.set(4, 10, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
key.shadow.bias = -0.0005;
scene.add(key);
const rim = new THREE.DirectionalLight(0xff5a40, 0.8); rim.position.set(-6, 4, -9); scene.add(rim);
const fill = new THREE.DirectionalLight(0xdde6ff, 0.55); fill.position.set(-5, 5, 9); scene.add(fill);
const flashLight = new THREE.PointLight(0xff5040, 0, 5, 2); scene.add(flashLight);

const PLAYER_Z = 3.2, CARD_Y = 0.02, BASE_Y = 0.035, HIDDEN_Y = -2.4, FIG_SCALE = 1.0, CARD_S = 0.7;
let W = 1, H = 1;
/* Case 0-15 → position : la ligne 0 est la plus proche du centre */
function cellPos(sideName, cell) {
  const row = Math.floor(cell / DATA.rules.cols), col = cell % DATA.rules.cols, px = W / H < 0.62 ? 1.08 : 1.2, z = 1.05 + row * 1.42;
  return new V3((col - 1.5) * px, 0, sideName === 'player' ? z : -z);
}

const tableTex = canvasTexture(null, 1024, 1024, (g, w, h) => {
  g.fillStyle = '#0c111a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,140,200,.16)'; g.lineWidth = 2;
  for (let r = 60; r < 520; r += 56) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.stroke(); }
  for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(t) * 60, h / 2 + Math.sin(t) * 60); g.lineTo(w / 2 + Math.cos(t) * 512, h / 2 + Math.sin(t) * 512); g.stroke(); }
  g.strokeStyle = 'rgba(160,200,255,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, h / 2 + 18); g.lineTo(w - 120, h / 2 + 18); g.stroke();
  const vg = g.createRadialGradient(w / 2, h / 2, 200, w / 2, h / 2, 512); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.85)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
});
const tableMat = new THREE.MeshStandardMaterial({ map: tableTex, emissiveMap: tableTex, emissive: 0x6fa8ff, emissiveIntensity: 0.35, metalness: 0.65, roughness: 0.38 });
const table = new THREE.Mesh(new THREE.CircleGeometry(9, 72), tableMat);
table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
const rimRing = new THREE.Mesh(new THREE.TorusGeometry(9, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: hdr('#4cc3ff', 0.7) }));
rimRing.rotation.x = Math.PI / 2; scene.add(rimRing);
const stars = (() => {
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new V3().randomDirection().multiplyScalar(rand(80, 140)); v.y = Math.abs(v.y) * 0.9 + 2; pos.set([v.x, v.y, v.z], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.35, fog: false })); scene.add(p); return p;
})();
const planetCanvas = document.createElement('canvas'); planetCanvas.width = 512; planetCanvas.height = 256;
const planetTex = canvasTexture(planetCanvas);
const planet = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 32), new THREE.MeshStandardMaterial({ map: planetTex, roughness: 1, metalness: 0, fog: false }));
planet.position.set(-38, 16, -95); planet.rotation.z = 0.35; scene.add(planet);
const dust = (() => {
  const n = 400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rand(-9, 9), rand(0, 4.5), rand(-8, 4)], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const p = new THREE.Points(geo, mat); scene.add(p); return { p, pos, geo, mat, cfg: null };
})();
let planetId = '';
function applyPlanet(id) {
  if (planetId === id) return; planetId = id;
  const P = DATA.planets[id];
  scene.background.set(P.bg); scene.fog.color.set(P.bg);
  tableMat.emissive.set(P.table); rimRing.material.color.copy(hdr(P.table, 0.7));
  key.color.set(P.key); rim.color.set(P.rim);
  const g = planetCanvas.getContext('2d');
  for (let y = 0; y < 256; y += 4) { g.fillStyle = P.bands[Math.floor((Math.sin(y * 0.07) + Math.sin(y * 0.023) + 2) * 1.5) % P.bands.length]; g.fillRect(0, y, 512, 4); }
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rand(0, 512), rand(0, 256), rand(10, 60), rand(2, 6), 0, 0, Math.PI * 2); g.fill(); }
  planetTex.needsUpdate = true;
  dust.cfg = P.dust; dust.mat.color.set(P.dust.color); dust.geo.setDrawRange(0, P.dust.n);
  showTerrain(id);
}
function updateDust(dt, t) {
  const c = dust.cfg; if (!c) return;
  for (let i = 0; i < c.n; i++) {
    const o = i * 3;
    dust.pos[o] += (c.vx + Math.sin(t + i) * 0.1) * dt; dust.pos[o + 1] += (c.vy + Math.cos(t * 0.7 + i) * 0.05) * dt;
    if (dust.pos[o] > 9) dust.pos[o] = -9; if (dust.pos[o] < -9) dust.pos[o] = 9;
    if (dust.pos[o + 1] > 4.5) dust.pos[o + 1] = 0; if (dust.pos[o + 1] < 0) dust.pos[o + 1] = 4.5;
  }
  dust.geo.attributes.position.needsUpdate = true;
}

/* ================================================================
   CARTES : un seul dessin pour les cartes 3D et les images de menu
   ================================================================ */
const cardFont = '"Chakra Petch", system-ui, sans-serif';
const cardCache = new Map(), texCache = new Map(), imgCache = new Map(), emblemCache = new Map();
const fac = d => DATA.factions[d.faction];
function fitText(g, text, x, y, maxW, size, weight = 700) {
  let s = size; do { g.font = `${weight} ${s}px ${cardFont}`; s -= 2; } while (g.measureText(text).width > maxW && s > 14);
  g.fillText(text, x, y);
}
function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(n === maxLines - 1 ? `${line}…` : line, x, y + n * lh); line = w; n++; if (n >= maxLines) return; }
    else line = test;
  }
  if (line) g.fillText(line, x, y + n * lh);
}
function drawIcon(g, paths, cx, cy, size, color, width = 2, blur = 0) {
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(size / 24, size / 24);
  g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  if (blur) { g.shadowColor = color; g.shadowBlur = blur; }
  paths.forEach(p => g.stroke(new Path2D(p)));
  g.restore();
}
function emblemImg(faction) {
  if (emblemCache.has(faction)) return emblemCache.get(faction);
  const F = DATA.factions[faction], c = document.createElement('canvas'); c.width = c.height = 64;
  drawIcon(c.getContext('2d'), ICONS[`e_${F.emblem}`], 32, 32, 50, F.glow, 2, 8);
  const url = c.toDataURL(); emblemCache.set(faction, url); return url;
}
/* Décors de fond, un par faction */
const SCENES = {
  temple(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f2b45a'); gr.addColorStop(0.45, '#7a3a14'); gr.addColorStop(1, '#120804'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const sun = g.createRadialGradient(x + w * 0.7, y + h * 0.3, 4, x + w * 0.7, y + h * 0.3, 90); sun.addColorStop(0, 'rgba(255,240,200,.95)'); sun.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sun; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(40,18,6,.85)';
    for (let i = 0; i < 7; i++) { const sx = x + 20 + i * (w / 7) + sr() * 20, sw = 18 + sr() * 26, sh = h * (0.35 + sr() * 0.35); g.beginPath(); g.moveTo(sx, y + h); g.lineTo(sx, y + h - sh); g.lineTo(sx + sw / 2, y + h - sh - 26); g.lineTo(sx + sw, y + h - sh); g.lineTo(sx + sw, y + h); g.fill(); }
  },
  hangar(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2e4466'); gr.addColorStop(1, '#070c16'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(190,225,255,${0.35 - i * 0.05})`; g.fillRect(x + 20 + i * 76, y + 18, 50, 6); }
    g.strokeStyle = 'rgba(140,190,255,.18)'; g.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(x + w / 2, y + h * 0.55); g.lineTo(x + w / 2 + i * 70, y + h); g.stroke(); }
    g.fillStyle = 'rgba(10,18,30,.9)'; g.beginPath(); g.moveTo(x + w * 0.12, y + h * 0.5); g.lineTo(x + w * 0.42, y + h * 0.42); g.lineTo(x + w * 0.46, y + h * 0.5); g.closePath(); g.fill();
  },
  corridor(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2b3038'); gr.addColorStop(1, '#05060a'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const vx = x + w / 2, vy = y + h * 0.42; g.strokeStyle = 'rgba(160,170,190,.18)'; g.lineWidth = 2;
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x, y + h * 0.4], [x + w, y + h * 0.4]].forEach(([px, py]) => { g.beginPath(); g.moveTo(vx, vy); g.lineTo(px, py); g.stroke(); });
    for (let i = 0; i < 4; i++) { const k = 0.25 + i * 0.18; g.strokeRect(vx - w * k / 2, vy - h * k / 2.4, w * k, h * k / 1.2); }
    g.fillStyle = 'rgba(255,60,50,.75)'; for (let i = 0; i < 4; i++) { g.fillRect(x + 24 + i * 16, y + h * 0.3 + i * 10, 6, 22); g.fillRect(x + w - 30 - i * 16, y + h * 0.3 + i * 10, 6, 22); }
  },
  crags(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ff4a2a'); gr.addColorStop(0.5, '#5a0a0a'); gr.addColorStop(1, '#0b0304'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,200,200,.35)'; g.lineWidth = 2; g.beginPath(); let lx = x + w * (0.2 + sr() * 0.6), ly = y; g.moveTo(lx, ly); for (let i = 0; i < 6; i++) { lx += (sr() - 0.5) * 40; ly += h / 12; g.lineTo(lx, ly); } g.stroke();
    g.fillStyle = 'rgba(12,2,3,.92)'; g.beginPath(); g.moveTo(x, y + h); for (let i = 0; i <= 10; i++) g.lineTo(x + i * w / 10, y + h * (0.55 + sr() * 0.3)); g.lineTo(x + w, y + h); g.fill();
  },
  cantina(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3a1a50'); gr.addColorStop(1, '#0a0510'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 16; i++) { const bx = x + sr() * w, by = y + sr() * h * 0.7, r = 10 + sr() * 30, c = pick(['255,90,200', '80,220,230', '255,180,80']); const b = g.createRadialGradient(bx, by, 0, bx, by, r); b.addColorStop(0, `rgba(${c},.5)`); b.addColorStop(1, `rgba(${c},0)`); g.fillStyle = b; g.fillRect(bx - r, by - r, r * 2, r * 2); }
    g.fillStyle = 'rgba(20,8,24,.9)'; g.fillRect(x, y + h * 0.78, w, h * 0.22); g.fillStyle = 'rgba(255,120,220,.5)'; g.fillRect(x, y + h * 0.78, w, 3);
  },
  desert(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffb565'); gr.addColorStop(0.55, '#a8501f'); gr.addColorStop(1, '#2a1008'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    [[0.72, 0.28, 26], [0.84, 0.36, 16]].forEach(([sx, sy, r]) => { const s = g.createRadialGradient(x + w * sx, y + h * sy, 2, x + w * sx, y + h * sy, r * 2.4); s.addColorStop(0, 'rgba(255,250,220,1)'); s.addColorStop(0.4, 'rgba(255,220,150,.8)'); s.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = s; g.fillRect(x, y, w, h); });
    g.fillStyle = 'rgba(60,24,10,.85)'; g.beginPath(); g.moveTo(x, y + h); g.quadraticCurveTo(x + w * 0.3, y + h * 0.62, x + w * 0.6, y + h * 0.78); g.quadraticCurveTo(x + w * 0.85, y + h * 0.9, x + w, y + h * 0.7); g.lineTo(x + w, y + h); g.fill();
  },
  circuit(g, x, y, w, h, sr) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#11463a'); gr.addColorStop(1, '#031010'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(90,240,190,.35)'; g.fillStyle = 'rgba(140,255,210,.8)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { let px = x + sr() * w, py = y + sr() * h; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 3; k++) { if (sr() > 0.5) px += (sr() - 0.5) * 120; else py += (sr() - 0.5) * 120; g.lineTo(px, py); } g.stroke(); g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill(); }
  },
};
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
/* Traits d'espèce sur les silhouettes des cartes */
function drawSpecies(g, d, x, y, r, base) {
  const sp = d.species, S = sp && SPECIES[sp]; if (!S || sp === 'humain') return;
  const glow = (col, fn) => { g.save(); g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col; fn(); g.restore(); };
  g.fillStyle = '#05070b'; g.strokeStyle = '#05070b'; g.lineCap = 'round';
  if (sp === 'drakkari') {
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 14 + i * 4, y - r + 6 - i * 2); g.lineTo(x - 2 + i * 6, y - r - 26 + i * 4); g.lineTo(x + 10 + i * 4, y - r + 8); g.fill(); }
    g.beginPath(); g.ellipse(x, y + r * 0.55, r * 0.55, r * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 22; g.beginPath(); g.moveTo(x + 90, base - 30); g.quadraticCurveTo(x + 190, base - 40, x + 175, base - 140); g.stroke();
    glow(S.eyes, () => [-1, 1].forEach(s => { g.beginPath(); g.ellipse(x + s * r * 0.4, y - 4, 8, 4, 0, 0, Math.PI * 2); g.fill(); }));
  } else if (sp === 'ursaan') {
    g.beginPath(); g.arc(x, y, r * 1.18, 0, Math.PI * 2); g.fill();
    g.lineWidth = 16; [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * r * 1.15, y - r * 0.5, 26, s > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1, s > 0 ? Math.PI * 0.4 : Math.PI * 1.4, s < 0); g.stroke(); });
  } else if (sp === 'octavii') {
    g.lineWidth = 12; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 10, y + r * 0.5); g.quadraticCurveTo(x + i * 18, y + r * 1.4, x + i * 14 + 6, y + r * 2.1); g.stroke(); }
    glow('#9adfff', () => [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * r * 0.4, y - 6, 7, 0, Math.PI * 2); g.fill(); }));
  } else if (sp === 'kryth') {
    g.lineWidth = 5; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(x + s * 12, y - r + 6); g.quadraticCurveTo(x + s * 40, y - r - 60, x + s * 70, y - r - 70); g.stroke(); g.beginPath(); g.arc(x + s * 70, y - r - 70, 7, 0, Math.PI * 2); g.fill(); });
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(x + s * 10, y + r * 0.7); g.lineTo(x + s * 30, y + r * 1.35); g.lineTo(x + s * 4, y + r * 1.0); g.fill(); });
    glow(S.eyes, () => [-1, 1].forEach(s => { g.beginPath(); g.ellipse(x + s * r * 0.45, y - 2, 14, 18, s * 0.3, 0, Math.PI * 2); g.fill(); }));
  } else if (sp === 'golemite') {
    g.fillRect(x - r * 1.05, y - r * 0.95, r * 2.1, r * 1.8);
    [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * r * 2.4, y + r * 1.6, 38, 0, Math.PI * 2); g.fill(); });
    glow(S.eyes, () => [-1, 1].forEach(s => g.fillRect(x + s * r * 0.45 - 7, y - 4, 14, 6)));
  } else if (sp === 'lumari') {
    g.beginPath(); g.ellipse(x - 6, y - r * 0.55, r * 0.85, r * 1.3, -0.15, 0, Math.PI * 2); g.fill();
    glow(S.marks, () => { [-1, 1].forEach(s => g.fillRect(x + s * r * 0.5 - 2, y + 4, 4, 22)); g.beginPath(); g.arc(x, y - r * 0.9, 5, 0, Math.PI * 2); g.fill(); });
    glow(S.eyes, () => [-1, 1].forEach(s => { g.beginPath(); g.ellipse(x + s * r * 0.4, y - 6, 11, 5, s * 0.25, 0, Math.PI * 2); g.fill(); }));
  } else if (sp === 'vexx') {
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(x + s * r * 0.8, y - 14); g.lineTo(x + s * r * 2.6, y - r * 0.9); g.lineTo(x + s * r * 0.85, y + 14); g.fill(); });
    glow(S.eyes, () => [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * r * 0.42, y, 11, 0, Math.PI * 2); g.fill(); }));
  }
}
/* Silhouettes des personnages selon le modèle et l'apparence */
function drawFigure(g, d, cx, base, top, h, sr) {
  const L = d.look, F = fac(d), lean = (sr() - 0.5) * 24, hy = top + h * 0.36;
  g.save(); g.shadowColor = F.glow; g.shadowBlur = 24; g.fillStyle = '#05070b';
  if (d.model === 'jedi') {
    g.beginPath(); g.moveTo(cx - 135, base); g.lineTo(cx - 62 + lean * 0.3, top + h * 0.5); g.quadraticCurveTo(cx + lean * 0.3, top + h * 0.44, cx + 62 + lean * 0.3, top + h * 0.5); g.lineTo(cx + 135, base); g.closePath(); g.fill();
    g.beginPath(); g.arc(cx + lean, hy, 44, 0, Math.PI * 2); g.fill();
    drawSpecies(g, d, cx + lean, hy, 44, base); g.fillStyle = '#05070b';
    if (L.hood) { g.beginPath(); g.moveTo(cx - 70 + lean, top + h * 0.54); g.quadraticCurveTo(cx - 70 + lean, hy - 70, cx + lean, hy - 62); g.quadraticCurveTo(cx + 70 + lean, hy - 70, cx + 70 + lean, top + h * 0.54); g.fill(); }
    else if (hchance(d.id, 'bun', 0.3)) { g.beginPath(); g.arc(cx + lean - 10, hy - 46, 18, 0, Math.PI * 2); g.fill(); }
    g.restore();
    const pose = hashStr(d.id + 'pose') % 3, sx = cx + 70, sy = top + h * 0.7;
    const [ex, ey] = pose === 0 ? [cx + 176, top + h * 0.05] : pose === 1 ? [cx + 92, top - 10] : [cx + 190, top + h * 0.3];
    g.save(); g.shadowColor = L.saber; g.shadowBlur = 36; g.strokeStyle = L.saber; g.lineCap = 'round'; g.lineWidth = 16; g.globalAlpha = 0.55;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.globalAlpha = 1; g.strokeStyle = '#f4fbff'; g.lineWidth = 7; g.stroke(); g.restore();
    g.save(); g.translate(sx, sy); g.rotate(Math.atan2(ey - sy, ex - sx) + Math.PI / 2); g.fillStyle = '#b8bec8'; g.fillRect(-7, 0, 14, 42); g.fillStyle = '#2a2e34'; g.fillRect(-8, 12, 16, 6); g.restore();
    return;
  }
  if (d.model === 'droid') {
    const cy = top + h * 0.46;
    g.beginPath(); g.arc(cx + lean, cy, 82, 0, Math.PI * 2); g.fill();
    if (d.role === 'sniper') { g.strokeStyle = '#05070b'; g.lineWidth = 6; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 22, cy + 60); g.quadraticCurveTo(cx + i * 30, cy + 130, cx + i * 40, base); g.stroke(); } }
    g.restore();
    g.save(); g.shadowColor = d.glow; g.shadowBlur = 20; g.strokeStyle = hex(L.trim || 0x2f8f66); g.lineWidth = 6; g.beginPath(); g.ellipse(cx + lean, cy + 4, 128, 24, -0.08, 0, Math.PI * 2); g.stroke(); g.restore();
    g.save(); g.shadowColor = L.visor; g.shadowBlur = 26; g.fillStyle = '#eafcff'; g.beginPath(); g.arc(cx + lean + 22, cy - 10, 15, 0, Math.PI * 2); g.fill(); g.restore();
    g.save(); g.strokeStyle = '#05070b'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + lean - 30, cy - 78); g.lineTo(cx + lean - 40, cy - 120); g.stroke(); g.restore();
    return;
  }
  const s = L.heavy ? 1.18 : 1;
  if (L.cape) { g.fillStyle = '#0b0f16'; g.beginPath(); g.moveTo(cx - 170 * s, base); g.lineTo(cx - 80, top + h * 0.56); g.lineTo(cx + 80, top + h * 0.56); g.lineTo(cx + 170 * s, base); g.fill(); g.fillStyle = '#05070b'; }
  g.beginPath(); g.ellipse(cx, base, 148 * s, 118 * s, 0, Math.PI, 0); g.fill();
  if (L.heavy || L.backpack) { g.beginPath(); g.ellipse(cx - 112 * s, base - 104 * s, 44, 30, -0.3, 0, Math.PI * 2); g.ellipse(cx + 112 * s, base - 104 * s, 44, 30, 0.3, 0, Math.PI * 2); g.fill(); }
  if (L.helmet === 'full') {
    roundRect(g, cx - 58 * s + lean, hy - 52 * s, 116 * s, 128 * s, 48 * s); g.fill();
    g.restore(); g.save(); g.shadowColor = L.visor; g.shadowBlur = 26; g.fillStyle = L.visor;
    if (L.droid) { [-24, 24].forEach(o => { g.beginPath(); g.arc(cx + lean + o * s, hy + 4, 11 * s, 0, Math.PI * 2); g.fill(); }); }
    else { roundRect(g, cx - 44 * s + lean, hy, 88 * s, 15 * s, 7 * s); g.fill(); }
  } else {
    g.beginPath(); g.arc(cx + lean, hy + 10, 50, 0, Math.PI * 2); g.fill();
    drawSpecies(g, d, cx + lean, hy + 10, 50, base); g.fillStyle = '#05070b';
    if (L.helmet === 'open') { g.beginPath(); g.arc(cx + lean, hy + 4, 60, Math.PI, 0); g.fill(); }
    if (L.helmet === 'cap') { g.fillRect(cx + lean - 56, hy - 46, 112, 30); g.fillRect(cx + lean - 70, hy - 20, 140, 10); }
    if (L.helmet === 'none' && (!d.species || d.species === 'humain')) { const st = hashStr(d.id + 'hair') % 3; g.beginPath(); if (st === 0) g.arc(cx + lean, hy - 10, 54, Math.PI * 1.05, Math.PI * 1.95); else if (st === 1) { g.ellipse(cx + lean + 36, hy + 30, 22, 60, 0.2, 0, Math.PI * 2); } else g.arc(cx + lean - 26, hy - 40, 20, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  if (!L.unarmed) {
    g.save(); g.fillStyle = '#05070b'; g.shadowColor = F.glow; g.shadowBlur = 14; g.translate(cx + 40, base - 100); g.rotate(-0.55);
    if (L.pistol) g.fillRect(40, -10, 70, 20); else if (L.rifle === 'long') { g.fillRect(-40, -9, 270, 18); g.fillRect(70, -26, 60, 14); } else if (L.heavy) g.fillRect(-30, -20, 210, 40); else g.fillRect(-20, -11, 170, 22);
    g.restore();
  }
  if (L.cross) { g.save(); g.shadowColor = '#5be38a'; g.shadowBlur = 20; g.fillStyle = '#7dffb0'; g.fillRect(cx - 9, base - 92, 18, 52); g.fillRect(cx - 26, base - 75, 52, 18); g.restore(); }
}
function cardCanvas(id, lvl = 1) {
  const ck = `${id}:${lvl}`;
  if (cardCache.has(ck)) return cardCache.get(ck);
  const d = scaleDef(id, lvl), F = fac(d), rar = DATA.rarities[d.rarity], rank = RANKS.indexOf(d.rarity), unit = true;
  const c = document.createElement('canvas'); c.width = 512; c.height = 720;
  const g = c.getContext('2d'), W2 = 512, H2 = 720, sr = seeded(hashStr(id) % 233280);
  const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, F.a); gr.addColorStop(1, F.b); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2; for (let i = -H2; i < W2; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H2, H2); g.stroke(); }
  const fg = g.createLinearGradient(0, 0, W2, H2);
  if (rank >= 3) ['#fff1b8', '#d8b45c', '#ff9ad8', '#8fd4ff', '#d8b45c'].forEach((col, i, a) => fg.addColorStop(i / (a.length - 1), col));
  else { fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.3, F.edge); fg.addColorStop(1, '#3a3020'); }
  g.strokeStyle = fg; g.lineWidth = 16; roundRect(g, 12, 12, W2 - 24, H2 - 24, 30); g.stroke();
  g.strokeStyle = rar.color; g.lineWidth = 2.5; roundRect(g, 30, 30, W2 - 60, H2 - 60, 20); g.stroke();
  g.fillStyle = rar.color; [[30, 30], [W2 - 30, 30], [30, H2 - 30], [W2 - 30, H2 - 30]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); });
  g.fillStyle = 'rgba(0,0,0,.42)'; roundRect(g, 44, 42, W2 - 88, 86, 14); g.fill();
  g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(86, 85, 30, 0, Math.PI * 2); g.fill(); g.strokeStyle = F.edge; g.lineWidth = 2; g.stroke(); drawIcon(g, ICONS[`r_${d.role}`], 86, 85, 34, F.glow, 2.2, 10);
  g.textAlign = 'center'; g.fillStyle = '#f5f8fc'; fitText(g, d.name, W2 / 2 + 22, 84, 330, 36);
  g.fillStyle = rar.color;
  fitText(g, `${d.title || DATA.roles[d.role].label}${d.species ? ` · ${SPECIES[d.species].label}` : ''} · ${rar.label}`.toUpperCase(), W2 / 2 + 22, 114, 340, 19, 600);
  const ax = 48, ay = 140, aw = W2 - 96, ah = 268;
  g.save(); roundRect(g, ax, ay, aw, ah, 14); g.clip();
  SCENES[F.scene](g, ax, ay, aw, ah, sr); drawFigure(g, d, W2 / 2, ay + ah, ay, ah, sr);
  const vg = g.createLinearGradient(0, ay + ah * 0.6, 0, ay + ah); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(ax, ay, aw, ah);
  if (rank >= 2) { g.globalCompositeOperation = 'screen'; const hg = g.createLinearGradient(ax, ay, ax + aw, ay + ah); ['rgba(255,80,200,0)', 'rgba(255,80,200,.16)', 'rgba(80,220,255,.18)', 'rgba(255,240,120,.14)', 'rgba(255,255,255,0)'].forEach((col, i, a) => hg.addColorStop(i / (a.length - 1), col)); g.fillStyle = hg; g.fillRect(ax, ay, aw, ah); g.globalCompositeOperation = 'source-over'; }
  g.globalAlpha = 0.5; drawIcon(g, ICONS[`e_${F.emblem}`], ax + aw - 30, ay + 30, 36, '#ffffff', 1.6, 6); g.globalAlpha = 1;
  g.restore();
  g.strokeStyle = F.edge; g.lineWidth = 3; roundRect(g, ax, ay, aw, ah, 14); g.stroke();
  {
    const second = { force: ['PARADE', pct(d.parade)], shooter: ['TIR', d.burst > 1 ? `${d.dmg} ×${d.burst}` : d.dmg], sniper: ['TIR', d.dmg], medic: ['SOIN', d.heal], tank: ['ARMURE', pct(d.armor)], leader: ['MENEUR', `+${pct(d.aura)}`] }[d.role];
    const third = d.role === 'force' ? ['RENVOI', pct(d.reflect)] : d.crit ? ['CRITIQUE', pct(d.crit)] : d.role === 'medic' ? ['CADENCE', `${d.every} s`] : d.role === 'tank' || d.role === 'leader' ? ['TIR', d.dmg] : ['PRÉCISION', pct(d.accuracy)];
    [['PV', d.hp], second, third].forEach(([label, value], i) => {
      const bw = (W2 - 96 - 16) / 3, bx = 48 + i * (bw + 8);
      g.fillStyle = 'rgba(0,0,0,.45)'; roundRect(g, bx, 418, bw, 70, 12); g.fill();
      g.fillStyle = F.edge; g.font = `600 16px ${cardFont}`; g.fillText(label, bx + bw / 2, 442);
      g.fillStyle = '#ffffff'; g.font = `700 30px ${cardFont}`; g.fillText(String(value), bx + bw / 2, 476);
    });
    /* les trois capacités : grisées tant que leur niveau n'est pas atteint */
    d.skills.forEach((k, i) => {
      const y = 500 + i * 50, on = !k.locked;
      g.globalAlpha = on ? 1 : 0.45;
      g.fillStyle = k.trig === 'ult' && on ? 'rgba(60,40,0,.6)' : 'rgba(0,0,0,.45)'; roundRect(g, 48, y, W2 - 96, 44, 10); g.fill();
      if (k.trig === 'ult') { g.strokeStyle = on ? '#e9bf5a' : 'rgba(233,191,90,.5)'; g.lineWidth = 1.5; roundRect(g, 48, y, W2 - 96, 44, 10); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.arc(74, y + 22, 16, 0, Math.PI * 2); g.fill();
      drawIcon(g, ICONS[k.art], 74, y + 22, 24, on ? k.color : '#8a94a4', 2, on ? 6 : 0);
      g.textAlign = 'left'; g.fillStyle = on ? '#f2f6fb' : '#aab4c4'; fitText(g, k.name, 98, y + 28, 200, 19, 700);
      g.textAlign = 'right'; g.fillStyle = on ? (k.trig === 'ult' ? '#ffcf4a' : '#9fb4cc') : '#ffcf4a'; g.font = `600 14px ${cardFont}`;
      g.fillText(on ? skillShort(k) : `NIV. ${k.unlock}`, W2 - 60, y + 27);
      g.globalAlpha = 1;
    });
    g.textAlign = 'center';
  }
  g.font = `700 16px ${cardFont}`; g.fillStyle = '#c8d2e0'; g.textAlign = 'left'; g.fillText(cardNo(d), 52, 676);
  g.textAlign = 'right'; g.fillText(F.label.toUpperCase(), W2 - 52, 676); g.textAlign = 'center';
  drawIcon(g, ICONS[`e_${F.emblem}`], W2 / 2, 670, 26, F.glow, 2, 8);
  if (lvl > 1) { g.fillStyle = 'rgba(0,0,0,.7)'; roundRect(g, W2 - 130, 150, 76, 30, 9); g.fill(); g.fillStyle = '#ffcf4a'; g.font = `700 18px ${cardFont}`; g.fillText(`NIV. ${lvl}`, W2 - 92, 172); }
  cardCache.set(ck, c);
  return c;
}
function cardTex(id, lvl) {
  const k = `${id}:${lvl}`;
  if (!texCache.has(k)) { const t = canvasTexture(cardCanvas(id, lvl)); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); texCache.set(k, t); }
  return texCache.get(k);
}
function cardImg(id, lvl) {
  const k = `${id}:${lvl}`;
  if (!imgCache.has(k)) imgCache.set(k, cardCanvas(id, lvl).toDataURL('image/jpeg', 0.9));
  return imgCache.get(k);
}
function makeCard(id, lvl) {
  const F = fac(CARDS[id]), tex = cardTex(id, lvl);
  const face = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.16, roughness: 0.45, metalness: 0.15 });
  const edge = new THREE.MeshStandardMaterial({ color: F.edge, metalness: 0.85, roughness: 0.3 });
  const back = new THREE.MeshStandardMaterial({ color: F.b, metalness: 0.4, roughness: 0.5, emissive: F.a, emissiveIntensity: 0.4 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.3 * CARD_S, 0.03, 1.83 * CARD_S), [edge, edge, face, back, edge, edge]);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.face = face;
  return mesh;
}
const slotTex = canvasTexture(null, 256, 340, (g, w, h) => { g.shadowColor = '#fff'; g.shadowBlur = 18; g.strokeStyle = '#fff'; g.lineWidth = 6; roundRect(g, 22, 22, w - 44, h - 44, 22); g.stroke(); });
function slotGlow(hexc) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.75 * CARD_S, 2.3 * CARD_S), new THREE.MeshBasicMaterial({ map: slotTex, color: hdr(hexc, 1.3), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m;
}
