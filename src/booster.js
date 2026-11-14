/* ================================================================
   BOOSTERS EN 3D : paquet métallisé, déchirure au glissement,
   révélation carte par carte selon la rareté
   ================================================================ */
function rollRarity(minRank) {
  const pool = RANKS.slice(minRank), total = pool.reduce((s2, r) => s2 + DATA.rarities[r].weight, 0);
  let x = Math.random() * total; for (const r of pool) { x -= DATA.rarities[r].weight; if (x <= 0) return r; } return pool[pool.length - 1];
}
function pullBooster() {
  const B = DATA.rules.booster, ids = UNIT_IDS;
  return Array.from({ length: B.size }, (_, i) => {
    let r = RANKS.indexOf(rollRarity(i === B.size - 1 ? B.guarantee : 0)), pool = [];
    while (r >= 0 && !(pool = ids.filter(id => CARDS[id].rarity === RANKS[r])).length) r--;
    return pick(pool);
  });
}

const PACK_STYLE = {
  perso: { a: '#0e2a5a', b: '#2a0e4a', c: '#e9c46a', glow: '#4cc3ff', heroes: ['ilya-marr', 'sela-imran', 'morvain'] },
};
const bScene = new THREE.Scene();
bScene.background = new THREE.Color(0x05060c);
bScene.fog = new THREE.Fog(0x05060c, 9, 22);
const bCam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
bCam.position.set(0, 0.2, 6.2);
const pmrem = new THREE.PMREMGenerator(renderer);
bScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
bScene.environmentIntensity = 0.45;
const bComposer = new EffectComposer(renderer);
bComposer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
bComposer.addPass(new RenderPass(bScene, bCam));
bComposer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.35, 0.97));
bComposer.addPass(new OutputPass());
bScene.add(new THREE.HemisphereLight(0x8fa8d8, 0x0a0c12, 0.3));
const bKey = new THREE.DirectionalLight(0xffffff, 0.8); bKey.position.set(3, 4, 6); bScene.add(bKey);
const bRim = new THREE.DirectionalLight(0x7a5cff, 0.7); bRim.position.set(-4, 2, -3); bScene.add(bRim);
const leakLight = new THREE.PointLight(0xffd88a, 0, 6, 2); bScene.add(leakLight);
const bStars = (() => {
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rand(-30, 30), rand(-18, 18), rand(-30, -8)], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.08, fog: false })); bScene.add(p); return p;
})();
const nebulaTex = canvasTexture(null, 256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const bNebula = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTex, color: 0x5a3aff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
bNebula.position.set(0, 0.5, -12); bNebula.scale.set(26, 16, 1); bScene.add(bNebula);

/* --- Textures du paquet --- */
const packTexCache = {};
function crimp(g, y, w, hh, c) {
  const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#f6f0dc'); gr.addColorStop(0.5, c); gr.addColorStop(1, '#5a4a20');
  g.fillStyle = gr; g.fillRect(0, y, w, hh);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let x = 0; x < w; x += 7) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + hh); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, y + 2, w, 2);
}
function packFront(kind) {
  const P = PACK_STYLE[kind], B = DATA.rules.booster;
  return canvasTexture(null, 512, 780, (g, w, h) => {
    const sr = seeded(4242);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, P.a); gr.addColorStop(0.55, P.b); gr.addColorStop(1, '#05040a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 330); for (let i = 0; i < 48; i++) { g.rotate(Math.PI / 24); g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -700); g.lineTo(30, -700); g.fill(); } g.restore();
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + sr() * 0.7})`; g.fillRect(sr() * w, 60 + sr() * (h - 120), sr() > 0.9 ? 3 : 2, sr() > 0.9 ? 3 : 2); }
    const halo = g.createRadialGradient(w / 2, 320, 10, w / 2, 320, 210); halo.addColorStop(0, `${P.glow}55`); halo.addColorStop(0.5, `${P.glow}1a`); halo.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = halo; g.fillRect(0, 100, w, 460);
    g.strokeStyle = `${P.c}88`; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, 320, 170, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, 320, 186, 0, Math.PI * 2); g.stroke();
    const spots = [[-130, 0.62], [130, 0.62], [0, 0.85]];
    P.heroes.forEach((id, i) => { const [dx, sc] = spots[i]; g.save(); g.translate(w / 2 + dx, 470); g.scale(sc, sc); drawFigure(g, CARDS[id], 0, 0, -300, 300, seeded(i * 97 + 5)); g.restore(); });
    const band = g.createLinearGradient(0, 520, 0, 640); band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(0.3, 'rgba(0,0,0,.75)'); band.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = band; g.fillRect(0, 500, w, 160);
    g.textAlign = 'center';
    const tg = g.createLinearGradient(0, 540, 0, 600); tg.addColorStop(0, '#fff8de'); tg.addColorStop(0.5, P.c); tg.addColorStop(1, '#8a6a20');
    g.font = '900 40px "Orbitron", "Chakra Petch", sans-serif'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)';
    B.title.toUpperCase().split(' ').reduce((lines, wd) => { const last = lines[lines.length - 1]; if (last && (last + ' ' + wd).length <= 12) lines[lines.length - 1] = `${last} ${wd}`; else lines.push(wd); return lines; }, []).forEach((ln, i) => { g.strokeText(ln, w / 2, 566 + i * 44); g.fillStyle = tg; g.fillText(ln, w / 2, 566 + i * 44); });
    g.fillStyle = 'rgba(0,0,0,.6)'; roundRect(g, w / 2 - 150, 664, 300, 34, 17); g.fill(); g.strokeStyle = P.c; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffffff'; g.font = `600 18px ${cardFont}`; g.fillText(`${B.label.toUpperCase()} · ${B.size} CARTES`, w / 2, 687);
    g.save(); g.translate(w - 70, 130); g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill(); g.strokeStyle = P.c; g.lineWidth = 3; g.stroke();
    g.fillStyle = P.c; g.font = `700 13px ${cardFont}`; g.fillText('SÉRIE', 0, -4); g.font = '900 24px "Orbitron", sans-serif'; g.fillText('1', 0, 22); g.restore();
    RANKS.forEach((r, i) => { g.save(); g.translate(70 + i * 22, 132); g.rotate(Math.PI / 4); g.fillStyle = DATA.rarities[r].color; g.fillRect(-6, -6, 12, 12); g.restore(); });
    crimp(g, 0, w, 56, P.c); crimp(g, h - 56, w, 56, P.c);
    g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 110); g.lineTo(w, 110); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 98); g.lineTo(16, 110); g.lineTo(0, 122); g.fill();
    g.font = `600 13px ${cardFont}`; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('DÉCHIRER ICI', 24, 100);
    g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `400 14px ${cardFont}`;
    g.fillText(`La dernière carte est au moins ${DATA.rarities[RANKS[B.guarantee]].label}`, w / 2, 716);
  });
}
function packBack(kind) {
  const P = PACK_STYLE[kind], B = DATA.rules.booster;
  return canvasTexture(null, 512, 780, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, P.b); gr.addColorStop(1, '#05040a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; for (let i = -h; i < w; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    drawIcon(g, ICONS.e_star, w / 2, 230, 160, P.c, 1.4, 20);
    g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '900 26px "Orbitron", sans-serif'; g.fillText(B.title.toUpperCase(), w / 2, 370);
    g.font = `400 18px ${cardFont}`; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(`Contient ${B.size} cartes de la série 1.`, w / 2, 404);
    g.fillStyle = 'rgba(0,0,0,.55)'; roundRect(g, 70, 430, w - 140, 186, 14); g.fill();
    g.fillStyle = P.c; g.font = `700 16px ${cardFont}`; g.fillText('CHANCES PAR CARTE', w / 2, 458);
    const total = RANKS.reduce((s2, r) => s2 + DATA.rarities[r].weight, 0);
    RANKS.forEach((r, i) => { const R = DATA.rarities[r]; g.textAlign = 'left'; g.fillStyle = R.color; g.font = `600 17px ${cardFont}`; g.fillText(R.label, 100, 490 + i * 25); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(`${(R.weight / total * 100).toFixed(1).replace('.', ',')} %`, w - 100, 490 + i * 25); });
    g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `italic 400 14px ${cardFont}`; g.fillText('Ne pas jeter dans un trou noir.', w / 2, 650);
    for (let i = 0; i < 40; i++) { g.fillStyle = '#fff'; g.fillRect(w / 2 - 90 + i * 4.5, 670, i % 3 ? 2 : 3, 34); }
    crimp(g, 0, w, 56, P.c); crimp(g, h - 56, w, 56, P.c);
  });
}
const cardBackTex = canvasTexture(null, 512, 720, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h / 2, w); gr.addColorStop(0, '#1e3a66'); gr.addColorStop(1, '#050a14'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h / 2); for (let i = 0; i < 36; i++) { g.rotate(Math.PI / 18); g.fillStyle = 'rgba(216,180,92,.06)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-20, -500); g.lineTo(20, -500); g.fill(); } g.restore();
  g.strokeStyle = '#d8b45c'; g.lineWidth = 14; roundRect(g, 12, 12, w - 24, h - 24, 30); g.stroke();
  g.lineWidth = 2; roundRect(g, 36, 36, w - 72, h - 72, 20); g.stroke();
  [[36, 36], [w - 36, 36], [36, h - 36], [w - 36, h - 36]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = '#d8b45c'; g.fillRect(-9, -9, 18, 18); g.restore(); });
  g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, h / 2, 140, 0, Math.PI * 2); g.stroke();
  drawIcon(g, ICONS.e_diamond, w / 2, h / 2, 150, '#8fd4ff', 1.6, 24);
  g.textAlign = 'center'; g.fillStyle = '#d8b45c'; g.font = '900 22px "Orbitron", sans-serif'; g.fillText('SÉRIE 1', w / 2, h - 80);
});
const raysTex = canvasTexture(null, 512, 512, (g, w, h) => {
  g.translate(w / 2, h / 2);
  for (let i = 0; i < 18; i++) { g.rotate(Math.PI * 2 / 18); const gr = g.createLinearGradient(0, 0, 0, -256); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -256); g.lineTo(18, -256); g.fill(); }
});

/* --- Géométrie du paquet : un coussin bombé, partie haute détachable --- */
const PW = 1.7, PH = 2.6, PT = PH / 2 - 0.42;
function pillow(y0, y1, segY) {
  const geo = new THREE.PlaneGeometry(PW, y1 - y0, 28, segY); geo.translate(0, (y0 + y1) / 2, 0);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), nx = x / (PW / 2), ny = y / (PH / 2);
    pos.setZ(i, 0.12 * Math.pow(Math.max(0, Math.cos(nx * Math.PI / 2)), 0.5) * (1 - Math.pow(Math.abs(ny), 10)));
    uv.setXY(i, x / PW + 0.5, y / PH + 0.5);
  }
  geo.computeVertexNormals(); return geo;
}
const packMats = { front: new THREE.MeshPhysicalMaterial({ metalness: 0.35, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.35, iridescence: 0.3, iridescenceIOR: 1.3, envMapIntensity: 0.8 }), back: new THREE.MeshPhysicalMaterial({ metalness: 0.3, roughness: 0.5, clearcoat: 0.3, iridescence: 0.2, envMapIntensity: 0.7 }) };
const pack = new THREE.Group(); bScene.add(pack);
const packBody = new THREE.Group(); pack.add(packBody);
const bodyGeo = pillow(-PH / 2, PT, 30), topGeo = pillow(PT, PH / 2, 6);
packBody.add(new THREE.Mesh(bodyGeo, packMats.front));
const bodyBack = new THREE.Mesh(bodyGeo, packMats.back); bodyBack.rotation.y = Math.PI; packBody.add(bodyBack);
const topPivot = new THREE.Group(); topPivot.position.set(-PW / 2, PT, 0); pack.add(topPivot);
const topFront = new THREE.Mesh(topGeo, packMats.front); topFront.position.set(PW / 2, -PT, 0);
const topBack = new THREE.Mesh(topGeo, packMats.back); topBack.rotation.y = Math.PI; topBack.position.set(PW / 2, -PT, 0);
topPivot.add(topFront, topBack);
const leak = new THREE.Mesh(new THREE.PlaneGeometry(PW, 0.05), additive('#ffe0a0', 1.2, { opacity: 0 })); leak.position.set(0, PT, 0.1); pack.add(leak);

/* --- État --- */
const bo = { kind: 'perso', phase: 'idle', p: 0, dragX: null, cards: [], meshes: [], idx: 0, busy: false, legendT: 0, flash: 0, ptr: { x: 0, y: 0 }, summary: [] };
function resizeBooster(a) {
  /* écran bas (téléphone à l'horizontale) : on recule et on remonte le paquet au-dessus des boutons */
  const short = H < 500;
  bCam.aspect = a; bCam.fov = a < 0.62 ? 56 : a < 1.05 ? 48 : 40; bCam.position.z = short ? 8.6 : a < 0.62 ? 6.8 : 6.2; bCam.position.y = short ? -0.55 : 0.2; bCam.updateProjectionMatrix();
  bComposer.setSize(W, H);
}
function setPackKind(kind) {
  bo.kind = kind;
  const P = PACK_STYLE[kind];
  packTexCache[kind] ||= { front: packFront(kind), back: packBack(kind) };
  packTexCache[kind].front.anisotropy = packTexCache[kind].back.anisotropy = renderer.capabilities.getMaxAnisotropy();
  packMats.front.map = packTexCache[kind].front; packMats.back.map = packTexCache[kind].back;
  packMats.front.needsUpdate = packMats.back.needsUpdate = true;
  bRim.color.set(P.glow); bNebula.material.color.set(P.glow);
}
function clearRevealed() { bo.meshes.forEach(m => m.removeFromParent()); bo.meshes = []; $('#bBadges').innerHTML = ''; bo.summary = []; }
function enterBooster() {
  clearRevealed();
  setPackKind(bo.kind); resetPack(); renderBoosterUI();
}
function resetPack() {
  bo.phase = 'idle'; bo.p = 0; bo.dragX = null; bo.idx = 0; bo.busy = false;
  pack.visible = true; pack.position.set(0, -2.6, 0); pack.rotation.set(0, 0, 0); pack.scale.setScalar(1);
  topPivot.visible = true; topPivot.position.set(-PW / 2, PT, 0); topPivot.rotation.set(0, 0, 0);
  setTear(0);
  const has = save.boosters > 0;
  [packMats.front, packMats.back].forEach(m => { m.color.setScalar(has ? 1 : 0.35); m.opacity = 1; m.transparent = false; });
  tween(0.6, k => { pack.position.y = lerp(-2.6, 0.15, easeOutBack(k)); });
}
function renderBoosterUI() {
  const B = DATA.rules.booster, n = save.boosters, ph = bo.phase;
  $('#bCredits').textContent = save.credits;
  $('#bKinds').textContent = `${B.title} · ${B.size} cartes · ${n} à ouvrir`;
  $('#bKinds').hidden = ph !== 'idle';
  $('#tearBtn').hidden = ph !== 'idle'; $('#tearBtn').disabled = !n;
  $('#buyBtn').hidden = ph !== 'idle'; $('#buyBtn').disabled = save.credits < B.cost; $('#buyBtn').textContent = `Acheter · ${B.cost} crédits`;
  $('#nextBtn').hidden = ph !== 'reveal'; $('#flipAllBtn').hidden = ph !== 'reveal';
  $('#againBtn').hidden = ph !== 'summary' || !save.boosters; $('#doneBtn').hidden = ph !== 'summary';
  $('#bBack').disabled = ph === 'opening';
  const hint = $('#bHint');
  if (ph === 'idle') hint.innerHTML = n ? 'Glisse ton doigt sur le paquet pour le déchirer <span class="swipe" aria-hidden="true"></span>' : 'Aucun booster : achète-en un ou gagne des missions de chef (5, 10, 15 et 20).';
  else if (ph === 'reveal') hint.textContent = `Touche la carte pour la retourner · ${bo.idx} / ${bo.cards.length}`;
  else if (ph === 'summary') { const nn = bo.cards.filter(c => c.isNew).length, ups = bo.cards.filter(c => c.up).length; hint.textContent = `${nn ? `${nn} nouvelle${nn > 1 ? 's' : ''} carte${nn > 1 ? 's' : ''}` : 'Aucune nouvelle carte'}${ups ? ` · ${ups} niveau${ups > 1 ? 'x' : ''} gagné${ups > 1 ? 's' : ''}` : ''}. Touche une carte pour voir sa fiche.`; }
  else hint.textContent = '';
}
function setTear(p) {
  bo.p = p;
  topPivot.rotation.set(0, -p * 0.35, p * 0.38);
  topPivot.position.set(-PW / 2 + p * 0.04, PT + p * 0.1, p * 0.1);
  leak.scale.x = Math.max(0.001, p); leak.position.x = -PW / 2 + (PW * p) / 2;
  leak.material.opacity = p > 0 ? 0.6 : 0; leakLight.intensity = p * 1.2; leakLight.position.set(-PW / 2 + PW * p, PT + 0.2, 0.4);
}
function boosterPointer(type, e) {
  bo.ptr.x = (e.clientX / W) * 2 - 1; bo.ptr.y = -(e.clientY / H) * 2 + 1;
  if (bo.phase === 'idle') {
    if (!save.boosters) return;
    if (type === 'down') bo.dragX = e.clientX;
    if (type === 'move' && bo.dragX != null) {
      const p = clamp((e.clientX - bo.dragX) / Math.max(180, W * 0.35), 0, 1);
      if (Math.floor(p * 12) > Math.floor(bo.p * 12)) { sfx.rip(); burst(new V3(-PW / 2 + PW * p, PT + 0.15, 0.2).applyMatrix4(pack.matrixWorld), '#ffe0a0', 3, { speed: 1.2, life: 0.4, gravity: -3, parent: bScene, size: 0.02 }); }
      setTear(p);
      if (p >= 1) { bo.dragX = null; completeTear(); }
    }
    if (type === 'up' && bo.dragX != null) { bo.dragX = null; const p0 = bo.p; tween(0.25, k => setTear(p0 * (1 - k))); }
  } else if (bo.phase === 'reveal' && type === 'up') revealNext();
  else if (bo.phase === 'summary' && type === 'up') {
    /* récapitulatif : toucher une carte ouvre sa fiche */
    bRay.setFromCamera(new THREE.Vector2(bo.ptr.x, bo.ptr.y), bCam);
    const hit = bRay.intersectObjects(bo.summary, true)[0];
    if (hit) { let g = hit.object; while (g && !bo.summary.includes(g)) g = g.parent; if (g) { sfx.click(); openCard(g.userData.card.id); } }
  }
}
const bRay = new THREE.Raycaster();
function autoTear() {
  if (bo.phase !== 'idle' || !save.boosters) return;
  bo.phase = 'tearing'; renderBoosterUI();
  let last = 0;
  tween(0.8, k => { setTear(easeOut(k)); if (k - last > 0.08) { sfx.rip(); last = k; } }, completeTear);
}
function completeTear() {
  bo.phase = 'opening'; renderBoosterUI();
  save.boosters--;
  bo.cards = pullBooster().map(id => { const before = count(id), lb = levelOf(id); save.owned[id] = before + 1; return { id, before, after: before + 1, isNew: before === 0, up: levelOf(id) > lb, lvl: levelOf(id) }; })
    .sort((a, b) => RANKS.indexOf(CARDS[a.id].rarity) - RANKS.indexOf(CARDS[b.id].rarity));
  persist();
  sfx.tear(); bo.flash = 0.12;
  const top0 = topPivot.rotation.clone(), tp = topPivot.position.clone();
  tween(0.7, k => { topPivot.rotation.set(top0.x, top0.y - k * 1.2, top0.z + k * 2.4); topPivot.position.set(tp.x + k * 2.6, tp.y + k * 2.2, tp.z + k * 1.2); }, () => { topPivot.visible = false; });
  const mouth = new V3(0, PT, 0.1).applyMatrix4(pack.matrixWorld);
  burst(mouth, '#ffe0a0', 22, { speed: 2.4, life: 0.8, gravity: -2, parent: bScene, spread: 0.6, up: 2, size: 0.018 });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4), additive('#ffe0a0', 0.5, { map: columnTex })); beam.position.copy(mouth).add(new V3(0, 2, -0.05)); beam.rotation.z = Math.PI;
  addTemp(beam, 1.4, (k, o) => { o.material.opacity = 0.35 * Math.sin(Math.PI * k); }, 0, bScene);
  bo.cards.forEach((c, i) => {
    const m = makeRevealCard(c, i); bo.meshes.push(m);
    m.position.set(0, pack.position.y - 0.3, -0.05 - i * 0.01);
    tween(0.7, k => { m.position.y = lerp(pack.position.y - 0.3, 0.25, easeOutBack(k)); m.position.z = lerp(-0.05, 0.6 + (bo.cards.length - i) * 0.025, k); m.rotation.z = (i - bo.cards.length / 2) * 0.02 * k; }, null, 0.25 + i * 0.09);
  });
  tween(0.9, k => { pack.position.y = lerp(0.15, -4.2, k * k); pack.rotation.x = k * 0.6; }, () => { pack.visible = false; bo.phase = 'reveal'; renderBoosterUI(); }, 0.6);
}
function makeRevealCard(c, i) {
  const d = CARDS[c.id], rank = RANKS.indexOf(d.rarity), rc = DATA.rarities[d.rarity].color, tex = cardTex(c.id, c.lvl);
  const front = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.9, 0.9, 0.9) });
  const back = new THREE.MeshStandardMaterial({ map: cardBackTex, roughness: 0.45, metalness: 0.3, envMapIntensity: 0.5 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xd8b45c, metalness: 0.7, roughness: 0.4 });
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.83, 0.02), [edge, edge, edge, edge, back, front]);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.15), new THREE.MeshBasicMaterial({ map: slotTex, color: hdr(rc, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -0.03; g.add(glow, mesh);
  g.userData = { card: c, rank, glow, color: rc };
  bScene.add(g); return g;
}
function summarySlot(i, n) {
  const narrow = W / H < 0.8, perRow = narrow && n > 3 ? 3 : n, row = Math.floor(i / perRow), col = i % perRow, inRow = Math.min(perRow, n - row * perRow);
  const s = narrow ? 0.58 : n > 3 ? 0.66 : 0.8, gap = 1.36 * s;
  const rows = Math.ceil(n / perRow);
  return { x: (col - (inRow - 1) / 2) * gap, y: (rows > 1 ? 0.95 - row * 1.95 * s : 0.25), s };
}
function revealNext(fast = false) {
  if (bo.phase !== 'reveal' || bo.busy || bo.idx >= bo.meshes.length) return;
  bo.busy = true;
  const g = bo.meshes[bo.idx], { rank, color, glow, card } = g.userData, d = CARDS[card.id];
  const tease = rank >= 2 && !fast ? 0.35 + rank * 0.15 : 0;
  if (tease) { sfx.charge(); tween(tease, k => { glow.material.opacity = 0.5 * k; g.position.x = Math.sin(k * 60) * 0.015 * rank; }); }
  later(tease, () => {
    g.position.x = 0; sfx.flip(rank);
    const z0 = g.position.z, big = rank === 4 ? 1.35 : 1.15;
    tween(fast ? 0.32 : 0.55, k => { g.rotation.y = Math.PI * easeOut(k); g.position.z = z0 + Math.sin(Math.PI * k) * 0.8; g.scale.setScalar(1 + (big - 1) * Math.sin(Math.PI * Math.min(1, k * 1.4))); });
    later(fast ? 0.16 : 0.27, () => revealFx(g, rank, color, d, fast));
    const hold = fast ? 0.35 : [0.45, 0.6, 0.9, 1.2, 2.2][rank];
    later((fast ? 0.32 : 0.55) + hold, () => {
      const slot = summarySlot(bo.idx, bo.meshes.length), from = g.position.clone(), s0 = g.scale.x;
      tween(0.45, k => { const e = easeOut(k); g.position.set(lerp(from.x, slot.x, e), lerp(from.y, slot.y, e), lerp(from.z, 0, e)); g.scale.setScalar(lerp(s0, slot.s, e)); g.rotation.z = 0; }, () => {
        glow.material.opacity = rank < 2 ? 0 : 0.12;
        bo.summary.push(g); bo.idx++; bo.busy = false;
        if (bo.idx >= bo.meshes.length) { bo.phase = 'summary'; showBadges(); }
        renderBoosterUI();
      });
    });
  });
}
function revealFx(g, rank, color, d, fast) {
  const at = g.position.clone();
  burst(at, color, 6 + rank * 6, { speed: 1.6 + rank * 0.6, life: 0.5 + rank * 0.12, gravity: -2, parent: bScene, size: 0.02 });
  const ring = new THREE.Mesh(ringGeo, additive(color, 0.8)); ring.position.copy(at).setZ(-0.4);
  addTemp(ring, 0.7, (k, o) => { o.scale.setScalar(0.5 + (1.2 + rank * 0.6) * easeOut(k)); o.material.opacity = 0.5 * (1 - k); }, 0, bScene);
  if (rank >= 2) {
    const rays = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(color, 0.6, { map: raysTex })); rays.position.copy(at).setZ(-0.9);
    const dur = fast ? 0.8 : 1 + rank * 0.4, size = 2.6 + rank * 0.8;
    addTemp(rays, dur, (k, o) => { o.rotation.z = k * (0.6 + rank * 0.2); o.scale.setScalar(size * easeOut(Math.min(1, k * 2))); o.material.opacity = 0.28 * Math.sin(Math.PI * k); }, 0, bScene);
  }
  if (rank >= 3) { bo.flash = rank === 4 ? 0.3 : 0.12; }
  if (rank === 4) {
    sfx.legend();
    const el = $('#bLegend'); el.innerHTML = `${DATA.rarities[d.rarity].label.toUpperCase()}<small></small>`; el.querySelector('small').textContent = d.title ? `${d.name} · ${d.title}` : d.name;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    for (let i = 0; i < 3; i++) later(i * 0.2, () => burst(at.clone().add(new V3(rand(-1.2, 1.2), rand(-0.8, 0.8), -0.3)), pick(['#ffcf4a', '#fff1b8']), 10, { speed: 2, life: 0.9, gravity: -1.5, parent: bScene, size: 0.02 }));
  }
}
function showBadges() {
  const box = $('#bBadges'); box.innerHTML = '';
  bo.summary.forEach(g => {
    const c = g.userData.card, el = document.createElement('span');
    el.style.setProperty('--r', g.userData.color);
    if (c.isNew) el.textContent = 'Nouvelle !';
    else {
      const L0 = lvlFor(c.before), max = L0 >= DATA.rules.maxLevel;
      el.className = 'lvlbar';
      el.innerHTML = `<em class="l0">Niv. ${L0}</em><i class="track"><b style="width:${progressFor(c.before) * 100}%"></b></i><em class="l1">${max ? 'max' : `Niv. ${L0 + 1}`}</em>`;
      const fillTo = (pctv, then) => requestAnimationFrame(() => requestAnimationFrame(() => { const bar = el.querySelector('b'); bar.style.width = `${pctv}%`; if (then) setTimeout(then, 950); }));
      if (c.up) fillTo(100, () => {
        const L1 = lvlFor(c.after), m1 = L1 >= DATA.rules.maxLevel, bar = el.querySelector('b');
        el.classList.add('up'); sfx.power();
        el.querySelector('.l0').textContent = `Niv. ${L1}`; el.querySelector('.l1').textContent = m1 ? 'max' : `Niv. ${L1 + 1}`;
        bar.style.transition = 'none'; bar.style.width = '0%'; fillTo(progressFor(c.after) * 100);
        setTimeout(() => { bar.style.transition = ''; }, 30);
      });
      else fillTo(progressFor(c.after) * 100);
    }
    box.append(el); g.userData.badge = el;
  });
}
const bProj = new V3();
function updateBooster(dt, t) {
  if (pack.visible && bo.phase !== 'opening') {
    pack.rotation.y = lerp(pack.rotation.y, Math.sin(t * 0.6) * 0.18 + bo.ptr.x * 0.35, 1 - Math.exp(-dt * 4));
    pack.rotation.x = lerp(pack.rotation.x, -bo.ptr.y * 0.2, 1 - Math.exp(-dt * 4));
    if (bo.phase === 'idle' && !bo.dragX) pack.position.y += Math.sin(t * 1.4) * 0.0015;
  }
  bo.meshes.forEach((g, i) => { if (i >= bo.idx && bo.phase === 'reveal' && !bo.busy) g.position.y = 0.25 + Math.sin(t * 1.6 + i) * 0.01; });
  bo.summary.forEach((g, i) => { if (g.userData.rank >= 2) g.userData.glow.material.opacity = 0.1 + 0.05 * Math.sin(t * 2 + i); });
  if (bo.phase === 'summary') bo.summary.forEach(g => {
    const el = g.userData.badge; if (!el) return;
    bProj.copy(g.position).add(new V3(0, -1.0 * g.scale.x, 0)).project(bCam);
    el.style.left = `${(bProj.x * 0.5 + 0.5) * W}px`; el.style.top = `${(-bProj.y * 0.5 + 0.5) * H}px`;
  });
  bo.flash *= Math.exp(-dt * 3); $('#bFlash').style.opacity = bo.flash;
  leakLight.intensity *= bo.phase === 'idle' ? 1 : Math.exp(-dt * 2);
  bStars.rotation.z = t * 0.01;
  bComposer.render();
}
$('#tearBtn').addEventListener('click', () => { sfx.click(); autoTear(); });
$('#buyBtn').addEventListener('click', () => {
  const B = DATA.rules.booster;
  if (save.credits < B.cost) return sfx.deny();
  save.credits -= B.cost; save.boosters++; persist(); sfx.power(); resetPack(); renderBoosterUI();
});
$('#nextBtn').addEventListener('click', () => revealNext());
$('#flipAllBtn').addEventListener('click', () => {
  const step = () => { if (bo.phase !== 'reveal') return; if (!bo.busy) revealNext(true); later(0.15, step); };
  step();
});
$('#againBtn').addEventListener('click', () => { sfx.click(); clearRevealed(); resetPack(); renderBoosterUI(); });
$('#doneBtn').addEventListener('click', () => { sfx.click(); clearRevealed(); resetPack(); renderBoosterUI(); });
