/* ================================================================
   CARTE DE LA GALAXIE : planètes reliées par des routes,
   chacune avec ses 20 missions ; terminer une planète ouvre la suivante
   ================================================================ */
const gScene = new THREE.Scene();
gScene.background = new THREE.Color(0x020309);
const gCam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
gScene.add(new THREE.AmbientLight(0x8090b0, 0.5));
const gSun = new THREE.PointLight(0xffe2b0, 40, 0, 1.4); gSun.position.set(0, 1.5, 0); gScene.add(gSun);
const gKey = new THREE.DirectionalLight(0xc8d8ff, 0.9); gKey.position.set(4, 8, 6); gScene.add(gKey);

const dotTex = canvasTexture(null, 32, 32, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const spiral = (() => {
  const n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rnd = seeded(1234);
  const cIn = new THREE.Color('#ffd9a0'), cMid = new THREE.Color('#b47aff'), cOut = new THREE.Color('#4a6aff'), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = Math.pow(rnd(), 1.5) * 12, arm = i % 3, a = arm * (Math.PI * 2 / 3) + r * 0.5 + (rnd() - 0.5) * (0.9 - r * 0.03);
    const spread = (rnd() - 0.5) * (0.5 + r * 0.1);
    pos.set([Math.cos(a) * r + spread, (rnd() - 0.5) * 0.5 * (1.2 - r / 12), Math.sin(a) * r + spread], i * 3);
    const k = r / 12; c.copy(cIn).lerp(k < 0.5 ? cMid : cOut, k < 0.5 ? k * 2 : (k - 0.5) * 2).multiplyScalar(0.35 + rnd() * 0.65);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.13, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  gScene.add(p); return p;
})();
(() => {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(50, 80)); pos.set([v.x, v.y, v.z], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gScene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc8d4ff, size: 0.4, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false })));
})();
const coreTex = canvasTexture(null, 128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,235,200,.9)'); gr.addColorStop(0.3, 'rgba(255,190,120,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(7, 7, 1); gScene.add(core);

/* Planètes */
const GY = 0.7;
const gPlanets = DATA.campaign.map((P, i) => {
  const V = DATA.planets[P.id], g = new THREE.Group(); g.position.set(P.pos[0], GY, P.pos[1]);
  const tex = canvasTexture(null, 256, 128, (c, w, h) => {
    const rnd = seeded(hashStr(P.id) % 233280);
    for (let y = 0; y < h; y += 3) { c.fillStyle = V.bands[Math.floor((Math.sin(y * 0.09 + i) + Math.sin(y * 0.031) + 2) * 1.5) % V.bands.length]; c.fillRect(0, y, w, 3); }
    c.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 30; k++) { c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 30, 1 + rnd() * 4, 0, 0, Math.PI * 2); c.fill(); }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, emissive: new THREE.Color(V.table), emissiveIntensity: 0.05 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), mat); g.add(ball);
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, color: V.table, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); atmo.scale.setScalar(1.5); g.add(atmo);
  gScene.add(g);
  return { P, g, ball, mat, atmo };
});
const selRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8 }));
selRing.rotation.x = Math.PI / 2; gScene.add(selRing);
/* Routes entre planètes : dorées une fois la planète de départ terminée */
const gRoutes = gPlanets.slice(1).map((p, i) => {
  const a = gPlanets[i].g.position, b = p.g.position, mid = a.clone().add(b).multiplyScalar(0.5).add(new V3(0, 0.5, 0));
  const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x55607a, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.8 }));
  line.computeLineDistances(); gScene.add(line); return line;
});

const gal = { sel: 0, mission: null, yaw: 0, drag: null, look: new V3(), pos: new V3(), narrow: false };
function resizeGalaxy(a) { gCam.aspect = a; gCam.fov = a < 0.62 ? 60 : a < 1.05 ? 54 : 46; gCam.updateProjectionMatrix(); gal.narrow = a < 1.05; }
const planetState = pi => (DATA.campaign[pi].soon ? 'soon' : !planetOpen(pi) ? 'locked' : planetDone(DATA.campaign[pi]) ? 'done' : 'open');
const planetStars = P => P.list.reduce((a, m) => a + (save.won[m.id] || 0), 0);

/* Étiquettes HTML des planètes, posées sur la scène 3D */
const gLabels = $('#gLabels');
const labelEls = gPlanets.map((p, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'glabel';
  b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = p.P.name;
  b.addEventListener('click', () => { sfx.click(); selectPlanet(i); });
  gLabels.append(b); return b;
});
function refreshPlanets() {
  gPlanets.forEach((p, i) => {
    const st = planetState(i), P = p.P, el = labelEls[i];
    el.className = `glabel ${st}${i === gal.sel ? ' sel' : ''}`;
    el.querySelector('span').textContent = st === 'soon' ? 'Prochainement' : st === 'locked' ? 'Verrouillée' : `${P.list.filter(m => save.won[m.id]).length} / ${P.list.length} · ${planetStars(P)} ★`;
    const dim = st === 'open' || st === 'done' ? 1 : 0.35;
    p.mat.color.setScalar(dim); p.atmo.material.opacity = 0.35 * dim;
  });
  gRoutes.forEach((l, i) => l.material.color.set(planetState(i) === 'done' ? 0xe9bf5a : 0x55607a));
}
function enterGalaxy() {
  const s = deckSide() === 'dark' ? 'dark' : 'light'; side = s;
  const chip = $('#mSide'); chip.className = `sidechip ${s}`; chip.textContent = `Tu joues : ${DATA.sides[s].toLowerCase()}`;
  const cur = currentMission();
  gal.sel = cur ? cur.pi : 0; gal.mission = cur || DATA.campaign[0].list[0];
  refreshPlanets(); renderPlanetPanel();
}
function selectPlanet(i) {
  gal.sel = i; const P = DATA.campaign[i];
  gal.mission = P.list.find(m => missionOpen(m) && !save.won[m.id]) || P.list[0] || null;
  refreshPlanets(); renderPlanetPanel();
}
function renderPlanetPanel() {
  const P = DATA.campaign[gal.sel], st = planetState(gal.sel), prev = DATA.campaign[gal.sel - 1];
  $('#gSub').textContent = `Planète ${gal.sel + 1} / ${DATA.campaign.length} · ${P.subtitle}`;
  $('#gName').textContent = P.name; $('#gTeaser').textContent = P.teaser;
  const won = P.list.filter(m => save.won[m.id]).length;
  $('#gProg').style.width = `${P.list.length ? (won / P.list.length) * 100 : 0}%`;
  $('#gProgN').textContent = st === 'soon' ? 'Ses 20 missions arrivent à la prochaine étape.' : st === 'locked' ? `Termine ${prev.name} pour la débloquer.` : `${won} / ${P.list.length} missions · ${planetStars(P)} / ${P.list.length * 3} ★`;
  const nodes = $('#gNodes'); nodes.innerHTML = '';
  P.list.forEach(m => {
    const b = document.createElement('button'), ok = missionOpen(m), w = save.won[m.id] || 0;
    b.type = 'button'; b.className = `gnode${w ? ' won' : ''}${ok ? '' : ' locked'}${m.chef ? ' chef' : ''}${m.boss ? ' boss' : ''}${gal.mission === m ? ' sel' : ''}${ok && !w ? ' cur' : ''}`;
    b.innerHTML = `<b>${m.i}</b><span>${w ? starStr(w) : m.boss ? 'Boss' : m.chef ? 'Chef' : ''}</span>`;
    b.setAttribute('aria-label', `Mission ${m.i} : ${mTitle(m)}${w ? `, ${w} étoile${w > 1 ? 's' : ''}` : ok ? '' : ', verrouillée'}`);
    b.addEventListener('click', () => { sfx.click(); gal.mission = m; renderPlanetPanel(); });
    nodes.append(b);
  });
  const m = gal.mission, box = $('#gMission'); box.hidden = !m;
  if (!m) return;
  const ok = missionOpen(m), w = save.won[m.id] || 0;
  $('#gmNum').textContent = `Mission ${m.i} / ${P.list.length}${m.boss ? ' · boss de la planète' : m.chef ? ' · chef' : ''}`;
  $('#gmTitle').textContent = mTitle(m); $('#gmText').textContent = ok ? m.text[side] : 'Gagne la mission précédente pour débloquer celle-ci.';
  const reward = w ? `${Math.round(m.reward / 2)} crédits (rejouée)` : `${m.reward} crédits${m.boosters ? ` + ${m.boosters} booster${m.boosters > 1 ? 's' : ''}` : ''}`;
  $('#gmMeta').innerHTML = `<span>${m.waves[side].length} vague${m.waves[side].length > 1 ? 's' : ''}</span><span>Ennemis niv. ${m.lvl}</span><span>${reward}</span><span class="st">${starStr(w)}</span>`;
  const go2 = $('#gmGo'); go2.disabled = !ok; go2.textContent = ok ? (w ? 'Rejouer la mission' : 'Préparer la mission') : 'Verrouillée';
}
$('#gmGo').addEventListener('click', () => { if (gal.mission && missionOpen(gal.mission)) { sfx.click(); startPrep(gal.mission); } });

const gRay = new THREE.Raycaster(), gPtr = new THREE.Vector2();
function galaxyPointer(type, e) {
  if (type === 'down') gal.drag = { x: e.clientX, y: e.clientY, yaw: gal.yaw, moved: 0 };
  if (type === 'move' && gal.drag) { gal.drag.moved = Math.max(gal.drag.moved, Math.hypot(e.clientX - gal.drag.x, e.clientY - gal.drag.y)); gal.yaw = clamp(gal.drag.yaw - (e.clientX - gal.drag.x) * 0.005, -1.2, 1.2); }
  if (type === 'up' && gal.drag) {
    if (gal.drag.moved < 8) {
      gPtr.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1); gRay.setFromCamera(gPtr, gCam);
      const hit = gRay.intersectObjects(gPlanets.map(p => p.ball))[0];
      if (hit) { sfx.click(); selectPlanet(gPlanets.findIndex(p => p.ball === hit.object)); }
    }
    gal.drag = null;
  }
}
const gProj = new V3();
function updateGalaxy(dt, t) {
  spiral.rotation.y = t * 0.012;
  const sel = gPlanets[gal.sel].g.position, ease = 1 - Math.exp(-dt * 3);
  /* sur écran étroit, le panneau occupe le bas : la planète remonte dans le cadre */
  const look = sel.clone().add(gal.narrow ? new V3(0, -1.3, 0.6) : new V3(1.6, -0.3, 0));
  const off = new V3(Math.sin(gal.yaw) * 6.5, gal.narrow ? 5.2 : 3.6, Math.cos(gal.yaw) * 6.5);
  gal.look.lerp(look, ease); gal.pos.lerp(look.clone().add(off), ease);
  gCam.position.copy(gal.pos); gCam.lookAt(gal.look);
  gPlanets.forEach((p, i) => { p.ball.rotation.y = t * 0.15 + i; });
  selRing.position.copy(sel); selRing.rotation.z = t * 0.6; selRing.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
  gPlanets.forEach((p, i) => {
    gProj.copy(p.g.position).add(new V3(0, 0.62, 0)).project(gCam);
    labelEls[i].style.transform = `translate(${(gProj.x * 0.5 + 0.5) * W}px,${(-gProj.y * 0.5 + 0.5) * H}px) translate(-50%,-100%)`;
    labelEls[i].style.visibility = gProj.z < 1 ? 'visible' : 'hidden';
  });
  renderer.render(gScene, gCam);
}
gal.look.set(0, 0, 0); gal.pos.set(0, 10, 14);
