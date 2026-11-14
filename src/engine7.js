/* ================================================================
   CAMÉRA ET BOUCLE
   ================================================================ */
/* QG : vue plongeante d'origine. Combat : vue de côté cinématique (3/4 sur écran étroit) */
const cam = { off: 0, hub: {}, side: {} };
function resize() {
  W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); composer.setSize(W, H);
  const a = W / H;
  if (a < 0.62) { cam.hub = { yaw: 0, dist: 15.5, height: 15 }; cam.side = { yaw: 0.32, dist: 13, height: 10, look: new V3(), fov: 56 }; camera.fov = 56; }
  else if (a < 1.05) { cam.hub = { yaw: 0.2, dist: 14, height: 12 }; cam.side = { yaw: 1.0, dist: 13, height: 6.5, look: new V3(), fov: 50 }; camera.fov = 50; }
  else { cam.hub = { yaw: 0.15, dist: 12.2, height: 9.4 }; cam.side = { yaw: Math.PI / 2 - 0.2, dist: 10.6, height: 4.4, look: new V3(), fov: 44 }; camera.fov = 44; }
  camera.aspect = a; camera.updateProjectionMatrix();
  fitSide();
  resizeBooster(a); resizeGalaxy(a);
}
/* Cadrage auto : on cherche le point visé et le recul minimal pour que tout le plateau
   (deux camps, figurines comprises) tienne entre le bandeau du haut et la barre du bas */
function fitSide() {
  const C = cam.side, k = C.height / C.dist, ex = 1.5 * 1.2 + 0.45, ez = 1.05 + 3 * 1.42 + 0.6, v = new V3(), look = new V3();
  const corners = [-1, 1].flatMap(x => [-1, 1].flatMap(z => [0, 1.7].map(y => new V3(x * ex, y, z * ez))));
  const fits = d => { camera.position.copy(look).add(new V3(Math.sin(C.yaw) * d, k * d, Math.cos(C.yaw) * d)); camera.lookAt(look); camera.updateMatrixWorld();
    return corners.every(c => { v.copy(c).project(camera); return Math.abs(v.x) < 0.94 && v.y > -0.72 && v.y < 0.8; }); };
  let best = { d: 45, y: 0, z: 0 };
  for (let ly = -3; ly <= 3; ly += 0.5) for (let lz = -3; lz <= 3; lz += 0.5) {
    look.set(0, ly, lz);
    for (let d = 5; d < best.d; d *= 1.03) if (fits(d)) { best = { d, y: ly, z: lz }; break; }
  }
  C.fit = best.d; C.look = new V3(0, best.y, best.z);
}
addEventListener('resize', resize); resize();
let drag = null;
const SPECIAL = { booster: (t, e) => boosterPointer(t, e), missions: (t, e) => galaxyPointer(t, e) };
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); if (SPECIAL[screen]) return SPECIAL[screen]('down', e); drag = { x: e.clientX, y: e.clientY, off: cam.off, moved: 0 }; });
canvas.addEventListener('pointermove', e => { if (SPECIAL[screen]) return SPECIAL[screen]('move', e); if (drag) { drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y)); cam.off = clamp(drag.off - (e.clientX - drag.x) * 0.006, -0.9, 0.9); } });
canvas.addEventListener('pointerup', e => { if (SPECIAL[screen]) return SPECIAL[screen]('up', e); if (drag && drag.moved < 8 && screen === 'battle') tapUnit(e.clientX, e.clientY); drag = null; });
canvas.addEventListener('pointercancel', e => { if (SPECIAL[screen]) return SPECIAL[screen]('up', e); drag = null; });
function updateCamera(dt, t) {
  const hub = screen !== 'battle' && screen !== 'prep', wide = W > 720, still = reduceMotion || drag;
  let look, pos;
  if (hub) {
    const C = cam.hub, yaw = C.yaw + cam.off + (still ? 0 : Math.sin(t * 0.12) * 0.3), drift = reduceMotion ? 0 : Math.sin(t * 0.25) * 0.12;
    look = new V3(wide ? -1.6 : 0, 0.5, PLAYER_Z + (wide ? 0 : 0.6));
    pos = new V3(Math.sin(yaw) * C.dist * 0.6 + drift, C.height * 0.48, Math.cos(yaw) * C.dist * 0.6 + PLAYER_Z * 0.6);
  } else {
    /* de profil : ton escouade à gauche, l'ennemi à droite ; léger travelling */
    const C = cam.side, d = C.fit, k = C.height / C.dist;
    const yaw = C.yaw + cam.off + (still ? 0 : Math.sin(t * 0.09) * 0.05);
    look = C.look.clone();
    if (screen === 'prep') { if (wide) look.z += 3.4; else look.y -= d * 0.3; }
    pos = look.clone().add(new V3(Math.sin(yaw) * d, k * d, Math.cos(yaw) * d + (reduceMotion ? 0 : Math.sin(t * 0.2) * 0.4)));
  }
  if (camFx.t > 0 && screen === 'battle') { camFx.t -= dt; const w = Math.min(1, camFx.t * 2) * 0.35; look.lerp(camFx.at, w); pos.lerp(camFx.at, w * 0.3); }
  camera.position.copy(pos);
  if (!reduceMotion && shake > 0.001) camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake));
  shake *= Math.exp(-dt * 9);
  camera.lookAt(look);
}
function updateUnit(u, dt, t) {
  u.swingT += dt; u.knockT += dt; u.hitT += dt; u.recoilT += dt;
  const m = u.model;
  if (u.alive && u.hp > 0) {
    const [gf, ga] = m.gait || [2.2, 0.012]; m.body.position.y = Math.abs(Math.sin(t * gf + u.group.position.x)) * ga * (gf > 4 ? 1 : 0) + Math.sin(t * gf + u.group.position.x) * ga * (gf > 4 ? 0.3 : 1);
    m.body.rotation.x = -0.55 * envelope(u.knockT, 0.08, 0.6);
    const opp = opponents(u);
    if (opp.length && !u.busy) {
      const c = opp.reduce((acc, f) => acc.add(f.group.position), new V3()).divideScalar(opp.length);
      m.root.rotation.y = lerpAngle(m.root.rotation.y, Math.atan2(c.x - u.group.position.x, c.z - u.group.position.z), 1 - Math.exp(-dt * 6));
    }
  }
  const h = envelope(u.hitT, 0.01, 0.25);
  if (h !== u.flashK) { m.mats.forEach(mt => mt.emissive.setRGB(h * 0.9, h * 0.12, h * 0.08)); u.flashK = h; }
  m.update(u, dt, t);
}
function updateFight(dt) {
  ['player', 'foe'].forEach(sd => BUFF_KEYS.forEach(k => { buffs[sd][k] = Math.max(0, buffs[sd][k] - dt); }));
  let marked = null;
  units().forEach(u => {
    if (!u.alive || !u.ready) return;
    ST.forEach(k => { if (u.st[k] > 0) u.st[k] -= dt; });
    for (const k in u.cd) u.cd[k] -= dt;
    if (u.marked > 0) { u.marked -= dt; marked = u; }
    if (u.def.regen && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + u.def.regen * dt); u.regenT = (u.regenT || 0) + dt; if (u.regenT > 0.5) { u.regenT = 0; u.refreshTag(); } }
    if (u.ult && u.charge < 1) { u.charge = Math.min(1, u.charge + dt / u.ult.charge); if (u.charge >= 1 && u.side === 'player') { sfx.beep(); pop(u.head().add(new V3(0, 0.4, 0)), 'Ultime prêt', 'buff'); } }
    if (u.stun > 0) { u.stun -= dt; return; }
    if (u.side === 'foe' && u.charge >= 1 && Math.random() < dt * 0.6) castUlt(u);
    u.skills.forEach(k => { if (k.trig !== 'tick') return; u.tick[k.id] -= dt; if (u.tick[k.id] <= 0) { u.tick[k.id] = k.every; trySkill(u, 'tick', {}, k); } });
    if (u.gun) { u.cool -= dt * (buffs[u.side].stim > 0 || u.st.haste > 0 ? 2 : 1); if (u.cool <= 0) { u.cool = rand(...u.def.rate); fire(u); } }
    if (u.role === 'medic') { u.cool -= dt; if (u.cool <= 0) { u.cool = u.def.every; medicTick(u); } }
    if (u.role === 'force') { u.meleeT -= dt; if (u.meleeT <= 0 && !u.busy && !u.thrown) { u.meleeT = rand(4, 6.5); melee(u); } }
  });
  markRing.visible = !!marked;
  if (marked) markRing.position.copy(marked.head()).setY(marked.model.height * FIG_SCALE + 0.05);
  if (foes.length && foes.every(f => !f.alive)) nextWave();
}
const timer = new THREE.Timer(); timer.connect(document);
const RENDER_BEHIND = new Set(['hub', 'battle', 'prep']);
function frame(now) {
  requestAnimationFrame(frame);
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.getElapsed();
  updateTweens(dt);
  if (state === 'fight') updateFight(dt); else markRing.visible = false;
  units().forEach(u => updateUnit(u, dt, t));
  updateBolts(dt); updateFx(dt); updateDust(dt, t);
  domes.forEach((d, i) => { const left = buffs[d.side][d.key]; d.m.material.opacity = left > 0 ? Math.min(0.14, left) * (0.75 + 0.25 * Math.sin(t * 6 + i)) : 0; });
  markRing.rotation.z = t * 2;
  flashLight.intensity *= Math.exp(-dt * 18); flashV *= Math.exp(-dt * 5);
  units().forEach(u => { if (u.alive) u.slot.material.opacity = 0.42 + 0.14 * Math.sin(t * 2 + u.group.position.x); });
  stars.rotation.y = t * 0.004;
  updateCamera(dt, t);
  if (screen === 'booster') updateBooster(dt, t);
  else if (screen === 'missions') updateGalaxy(dt, t);
  else if (RENDER_BEHIND.has(screen)) composer.render();
  updateHud();
}

/* ================================================================
   DÉMARRAGE
   ================================================================ */
try { await Promise.race([Promise.all([document.fonts.load(`700 40px ${cardFont}`), document.fonts.load(`400 22px ${cardFont}`), document.fonts.load(`italic 400 17px ${cardFont}`), document.fonts.load('900 40px "Orbitron"')]), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* police de secours */ }
go('hub');
/*DBG*/
frame();
connectStore();
