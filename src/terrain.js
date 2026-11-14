/* ================================================================
   TERRAINS : sol, ciel, relief et décor propres à chaque planète.
   Le centre (le plateau) reste plat ; le côté caméra reste dégagé.
   ================================================================ */
const BOARD_X = 6, BOARD_Z = 9;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hillAt = (x, z, seed) => Math.sin(x * 0.11 + seed) * Math.cos(z * 0.09 - seed) * 2.2 + Math.sin(x * 0.27 + z * 0.19 + seed * 2) * 0.9 + Math.sin(z * 0.41 - x * 0.07) * 0.4;
/* hauteur du sol : plat sur le plateau, collines autour, presque plat côté caméra (x > 0) */
function groundH(x, z, seed) {
  const out = Math.max(Math.abs(x) - BOARD_X, Math.abs(z) - BOARD_Z, 0);
  return smooth(0, 10, out) * (x > 0 ? 0.25 : 1) * (2.4 + hillAt(x, z, seed));
}
function noiseFill(g, w, h, rnd, cols, n, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) { g.globalAlpha = alpha * (0.4 + rnd() * 0.6); g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rMin + rnd() * (rMax - rMin), rMin + rnd() * (rMax - rMin) * 0.6, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}
const GROUNDS = {
  farm(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 700, 3, 22, 0.45); for (let i = 0; i < 2600; i++) { g.strokeStyle = rnd() > 0.5 ? 'rgba(70,90,20,.35)' : 'rgba(230,200,110,.3)'; g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 6); g.stroke(); } },
  snow(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 420, 6, 40, 0.6); noiseFill(g, w, h, rnd, ['#9ec4e8', '#c8e0f8'], 40, 10, 50, 0.25); },
  metal(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 200, 10, 40, 0.5); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3; for (let i = 0; i <= w; i += 128) { g.strokeRect(i, 0, 128, h); } for (let j = 0; j <= h; j += 128) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); } g.fillStyle = 'rgba(30,30,30,.6)'; for (let i = 0; i < 64; i++) { g.beginPath(); g.arc((i % 8) * 64 + 8, Math.floor(i / 8) * 64 + 8, 3, 0, Math.PI * 2); g.fill(); } noiseFill(g, w, h, rnd, ['#7a4a2a', '#5a3a20'], 30, 6, 30, 0.35); },
  sand(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 400, 6, 34, 0.5); g.strokeStyle = 'rgba(120,80,40,.18)'; g.lineWidth = 2; for (let y = 0; y < h; y += 12) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 4); g.stroke(); } },
  city(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 200, 10, 40, 0.5); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } g.strokeStyle = 'rgba(255,90,220,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w, h * 0.3); g.stroke(); g.strokeStyle = 'rgba(90,200,255,.4)'; g.beginPath(); g.moveTo(w * 0.7, 0); g.lineTo(w * 0.7, h); g.stroke(); },
  lava(g, w, h, rnd, c) { noiseFill(g, w, h, rnd, c, 400, 6, 36, 0.6); g.strokeStyle = '#d8460c'; g.shadowColor = '#ff8a2a'; g.shadowBlur = 6; for (let i = 0; i < 7; i++) { g.lineWidth = 1 + rnd() * 3; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } g.shadowBlur = 0; },
};
/* Silhouette lointaine (montagnes, usines, ville) sur un anneau autour du champ de bataille */
const SKYLINES = {
  farm: (g, w, h, rnd) => { mountains(g, w, h, rnd, 0.45, 'rgba(70,80,60,.9)'); for (let i = 0; i < 14; i++) { const x = rnd() * w; g.fillStyle = 'rgba(60,55,45,1)'; g.fillRect(x, h * 0.7, 14, h * 0.3); g.beginPath(); g.arc(x + 7, h * 0.7, 9, Math.PI, 0); g.fill(); } },
  ice: (g, w, h, rnd) => { mountains(g, w, h, rnd, 0.15, 'rgba(170,195,220,.95)'); mountains(g, w, h, rnd, 0.4, 'rgba(120,150,180,1)'); },
  factory: (g, w, h, rnd) => { for (let x = 0; x < w; x += 20 + rnd() * 40) { const hh = h * (0.25 + rnd() * 0.6); g.fillStyle = 'rgba(30,36,32,1)'; g.fillRect(x, h - hh, 18 + rnd() * 50, hh); if (rnd() > 0.5) g.fillRect(x + 6, h - hh - 40, 6, 40); g.fillStyle = 'rgba(255,170,60,.8)'; g.fillRect(x + 4, h - hh + 10, 3, 3); } },
  ruins: (g, w, h, rnd) => { mountains(g, w, h, rnd, 0.5, 'rgba(170,120,80,.8)'); for (let i = 0; i < 10; i++) { const x = rnd() * w; g.fillStyle = 'rgba(120,85,55,1)'; g.fillRect(x, h * 0.55, 10, h * 0.45); g.fillRect(x - 6, h * 0.55, 22, 6); } },
  city: (g, w, h, rnd) => { for (let x = 0; x < w; x += 14 + rnd() * 30) { const hh = h * (0.3 + rnd() * 0.7), bw = 16 + rnd() * 40; g.fillStyle = '#0c0814'; g.fillRect(x, h - hh, bw, hh); for (let y = h - hh + 6; y < h; y += 9) for (let k = x + 3; k < x + bw - 3; k += 7) if (rnd() > 0.55) { g.fillStyle = rnd() > 0.7 ? 'rgba(255,120,220,.9)' : 'rgba(255,220,150,.8)'; g.fillRect(k, y, 3, 3); } } },
  lava: (g, w, h, rnd) => { mountains(g, w, h, rnd, 0.1, 'rgba(40,12,8,1)'); g.fillStyle = 'rgba(255,90,20,.6)'; for (let i = 0; i < 6; i++) { const x = rnd() * w; g.beginPath(); g.moveTo(x, h * 0.3); g.lineTo(x + 8, h); g.lineTo(x - 8, h); g.fill(); } },
};
function mountains(g, w, h, rnd, top, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
  let y = h * (top + rnd() * 0.3);
  for (let x = 0; x <= w; x += 8) { y = clamp(y + (rnd() - 0.5) * 18, h * top, h * 0.9); g.lineTo(x, y); }
  g.lineTo(w, h); g.fill();
}
/* Décor : objets simples groupés ; tout reste derrière le plateau ou aux extrémités */
function scatter(rnd, n, fn, area = 'back') {
  for (let i = 0; i < n; i++) {
    let x, z;
    do { x = area === 'near' ? -6.5 - rnd() * 4.5 : -6.5 - rnd() * 30; z = (rnd() - 0.5) * (area === 'near' ? 22 : 70); if (area === 'ends') { x = (rnd() - 0.5) * 20 - 3; z = (rnd() > 0.5 ? 1 : -1) * (10 + rnd() * 14); } } while (Math.abs(z) < BOARD_Z && x > -BOARD_X);
    fn(x, z, i);
  }
}
const PROPS = {
  farm(grp, rnd, seed) {
    const wheat = M(0xd8b860, { roughness: 0.9 }), wood = M(0x6a4a2a), hay = M(0xc8a040, { roughness: 1 });
    scatter(rnd, 90, (x, z) => { const y = groundH(x, z, seed); for (let k = 0; k < 6; k++) { const m = part(new THREE.CylinderGeometry(0.012, 0.02, 0.6 + rnd() * 0.3, 4), wheat, grp, x + (rnd() - 0.5) * 0.5, y + 0.3, z + (rnd() - 0.5) * 0.5); m.rotation.set((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4); m.castShadow = false; part(new THREE.SphereGeometry(0.035, 5, 4), wheat, m, 0, 0.32, 0).scale.y = 2.4; } }, 'near');
    scatter(rnd, 10, (x, z) => { part(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 14), hay, grp, x, groundH(x, z, seed) + 0.45, z).rotation.z = Math.PI / 2; }, 'ends');
    scatter(rnd, 5, (x, z) => { const y = groundH(x, z, seed); for (let k = -2; k <= 2; k++) part(new THREE.BoxGeometry(0.1, 0.7, 0.1), wood, grp, x, y + 0.35, z + k * 1.1); [0.25, 0.55].forEach(h2 => part(new THREE.BoxGeometry(0.05, 0.07, 4.6), wood, grp, x, y + h2, z)); }, 'near');
    const silo = new THREE.Group(); part(new THREE.CylinderGeometry(1.4, 1.4, 6, 20), M(0xb0a090), silo, 0, 3, 0); part(new THREE.ConeGeometry(1.6, 1.4, 20), M(0x8a3a2a), silo, 0, 6.7, 0); silo.position.set(-26, groundH(-26, -24, seed), -24); grp.add(silo);
  },
  ice(grp, rnd, seed) {
    const ice = M(0xbfe4ff, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), snow = M(0xf2f6fa, { roughness: 1, flatShading: true });
    scatter(rnd, 30, (x, z) => { const m = part(new THREE.ConeGeometry(0.3 + rnd() * 0.5, 1.5 + rnd() * 3, 6), ice, grp, x, groundH(x, z, seed) + 0.8, z); m.rotation.z = (rnd() - 0.5) * 0.4; });
    scatter(rnd, 26, (x, z) => { const m = part(new THREE.DodecahedronGeometry(0.5 + rnd()), snow, grp, x, groundH(x, z, seed) + 0.2, z); m.scale.y = 0.6; }, 'near');
    scatter(rnd, 10, (x, z) => part(new THREE.DodecahedronGeometry(1 + rnd() * 1.5), snow, grp, x, groundH(x, z, seed), z), 'ends');
  },
  factory(grp, rnd, seed) {
    const steel = M(0x5a605a, { metalness: 0.7, roughness: 0.4 }), dark = M(0x2a2e2a, { metalness: 0.6, roughness: 0.5 }), glow = new THREE.MeshBasicMaterial({ color: hdr('#ffb347', 2) });
    scatter(rnd, 14, (x, z) => { const y = groundH(x, z, seed), hh = 2 + rnd() * 5; part(new THREE.CylinderGeometry(0.8, 0.9, hh, 12), steel, grp, x, y + hh / 2, z); part(new THREE.SphereGeometry(0.12, 8, 6), glow, grp, x + 0.8, y + hh * 0.7, z).castShadow = false; });
    scatter(rnd, 16, (x, z) => part(new THREE.BoxGeometry(0.9, 0.9, 0.9), dark, grp, x, groundH(x, z, seed) + 0.45, z), 'near');
    scatter(rnd, 6, (x, z) => { const y = groundH(x, z, seed); const p = part(new THREE.CylinderGeometry(0.25, 0.25, 10, 10), steel, grp, x, y + 0.5, z); p.rotation.x = Math.PI / 2; }, 'ends');
  },
  ruins(grp, rnd, seed) {
    const stone = M(0xc8a07a, { roughness: 0.95, flatShading: true });
    scatter(rnd, 18, (x, z) => { const y = groundH(x, z, seed), hh = 1 + rnd() * 4; const m = part(new THREE.CylinderGeometry(0.45, 0.5, hh, 10), stone, grp, x, y + hh / 2, z); m.rotation.z = (rnd() - 0.5) * 0.3; });
    scatter(rnd, 20, (x, z) => { const m = part(new THREE.BoxGeometry(0.6 + rnd(), 0.4 + rnd() * 0.5, 0.6 + rnd()), stone, grp, x, groundH(x, z, seed) + 0.2, z); m.rotation.y = rnd() * 3; }, 'near');
    scatter(rnd, 4, (x, z) => { const y = groundH(x, z, seed); [-1.5, 1.5].forEach(o => part(new THREE.BoxGeometry(0.8, 4, 0.8), stone, grp, x, y + 2, z + o)); part(new THREE.BoxGeometry(1, 0.7, 4), stone, grp, x, y + 4.3, z); }, 'ends');
  },
  city(grp, rnd, seed) {
    const wall = M(0x1a1624, { roughness: 0.6, metalness: 0.3 }), neon = ['#ff5ad9', '#5ad8ff', '#ffb347'].map(c => new THREE.MeshBasicMaterial({ color: hdr(c, 2.2) }));
    scatter(rnd, 16, (x, z) => { const y = groundH(x, z, seed), hh = 4 + rnd() * 10, bw = 2 + rnd() * 3; part(new THREE.BoxGeometry(bw, hh, bw), wall, grp, x - 4, y + hh / 2, z); part(new THREE.BoxGeometry(0.08, hh * 0.6, 0.08), neon[Math.floor(rnd() * 3)], grp, x - 4 + bw / 2 + 0.05, y + hh * 0.5, z).castShadow = false; });
    scatter(rnd, 14, (x, z) => part(new THREE.BoxGeometry(1.2, 0.7, 0.4), wall, grp, x, groundH(x, z, seed) + 0.35, z).rotation.y = rnd() * 3, 'near');
  },
  lava(grp, rnd, seed) {
    const rock = M(0x2a1a16, { roughness: 1, flatShading: true }), lava = new THREE.MeshBasicMaterial({ color: hdr('#ff5a10', 1.6) });
    scatter(rnd, 22, (x, z) => { const m = part(new THREE.ConeGeometry(0.6 + rnd(), 2 + rnd() * 5, 6), rock, grp, x, groundH(x, z, seed) + 1, z); m.rotation.z = (rnd() - 0.5) * 0.3; });
    scatter(rnd, 6, (x, z) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.6 + rnd() * 1.1, 18), lava); m.rotation.x = -Math.PI / 2; m.position.set(x, groundH(x, z, seed) + 0.03, z); grp.add(m); }, 'near');
    scatter(rnd, 16, (x, z) => part(new THREE.DodecahedronGeometry(0.4 + rnd() * 0.6), rock, grp, x, groundH(x, z, seed) + 0.1, z), 'ends');
  },
};
const terrains = {};
function buildTerrain(id) {
  const P = DATA.planets[id], T = P.terrain, seed = hashStr(id) % 100, rnd = seeded(hashStr(id) % 233280), grp = new THREE.Group();
  /* sol */
  const tex = canvasTexture(null, 512, 512, (g, w, h) => { g.fillStyle = T.colors[0]; g.fillRect(0, 0, w, h); GROUNDS[T.ground](g, w, h, seeded(seed + 7), T.colors); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 14); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(110, 110, 110, 110); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundH(x, z, seed)); const k = 0.8 + 0.2 * Math.sin(x * 0.13 + z * 0.07 + seed) + 0.08 * Math.sin(x * 0.7 - z * 0.5); col.set([k, k, k], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: T.ground === 'metal' || T.ground === 'city' ? 0.55 : 0.95, metalness: T.ground === 'metal' ? 0.35 : 0, emissive: T.ground === 'lava' ? 0xffffff : 0x000000, emissiveMap: T.ground === 'lava' ? tex : null, emissiveIntensity: T.ground === 'lava' ? 0.14 : 0 }));
  ground.receiveShadow = true; grp.add(ground);
  /* ciel en dégradé */
  const skyTex = canvasTexture(null, 4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.55, T.sky[1]); gr.addColorStop(1, T.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })));
  /* horizon lointain */
  const lineTex = canvasTexture(null, 2048, 256, (g, w, h) => SKYLINES[T.props](g, w, h, seeded(seed + 3)));
  lineTex.wrapS = THREE.RepeatWrapping; lineTex.repeat.x = 2;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 22, 64, 1, true), new THREE.MeshBasicMaterial({ map: lineTex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  ring.position.y = 9; grp.add(ring);
  PROPS[T.props](grp, rnd, seed);
  grp.visible = false; scene.add(grp);
  return grp;
}
const hemi = scene.children.find(o => o.isHemisphereLight);
const skyFog = new THREE.Fog(0x000000, 26, 95), spaceFog = scene.fog, spaceBg = scene.background.clone();
/* Affiche le terrain de la planète (ou la table du QG) */
function showTerrain(id) {
  Object.values(terrains).forEach(g => (g.visible = false));
  const T = DATA.planets[id].terrain, space = !T;
  [table, rimRing, planet].forEach(m => (m.visible = space));
  stars.visible = space || !!T.night;
  if (space) { scene.fog = spaceFog; scene.background = spaceBg; hemi.color.set(0x7d96c8); hemi.groundColor.set(0x0a0c12); hemi.intensity = 0.55; key.intensity = 1.7; return; }
  (terrains[id] ||= buildTerrain(id)).visible = true;
  skyFog.color.set(T.sky[1]); scene.fog = skyFog; scene.background = new THREE.Color(T.sky[1]);
  hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.night ? 0.7 : 0.95;
  key.color.set(T.sun); key.intensity = T.night ? 1.3 : 2.1;
}
