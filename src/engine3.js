/* ================================================================
   FIGURINES 3D (formes simples, designs originaux)
   ================================================================ */
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...o });
function part(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function buildSaber(hexc, withLight = true) {
  const group = new THREE.Group();
  const hilt = [
    part(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 12), M(0xb8bec8, { metalness: 0.9, roughness: 0.25 }), group),
    part(new THREE.CylinderGeometry(0.029, 0.029, 0.035, 12), M(0x22262c, { metalness: 0.6, roughness: 0.4 }), group, 0, 0.075, 0),
  ];
  const blade = new THREE.Group(); blade.position.y = 0.1; group.add(blade);
  const coreGeo = new THREE.CylinderGeometry(0.014, 0.017, 1, 10); coreGeo.translate(0, 0.5, 0);
  const glowGeo = new THREE.CylinderGeometry(0.036, 0.042, 1.04, 12); glowGeo.translate(0, 0.5, 0);
  const glowMat = new THREE.MeshBasicMaterial({ color: hdr(hexc, 2), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  blade.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.9, 2.1) })), glow);
  const light = withLight ? new THREE.PointLight(new THREE.Color(hexc), 0, 3.5, 2) : null; if (light) { light.position.y = 0.4; blade.add(light); }
  const api = {
    group, glow, light, power: 0, color: hexc,
    setPower(p) { api.power = p; blade.scale.y = Math.max(0.001, p * 0.78); if (light) light.intensity = p * 2.4; },
    setHidden(h) { hilt.forEach(m => (m.visible = !h)); if (h) api.setPower(0); },
    setColor(c) { api.color = c; glowMat.color.copy(hdr(c, 2)); if (light) light.color.set(c); },
  };
  api.setPower(0);
  return api;
}
function stunRing(parent, y) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: hdr('#9ad8ff', 2.5) }));
  r.position.y = y; r.rotation.x = Math.PI / 2; r.visible = false; parent.add(r); return r;
}
/* ================================================================
   ESPÈCES : têtes, queues, cornes, tentacules, antennes, carapaces
   ================================================================ */
function humanFace(body, y, skin) {
  const white = M(0xf4f0ea, { roughness: 0.3 }), iris = M(0x2a1a10, { roughness: 0.2 });
  [-1, 1].forEach(s => { part(new THREE.SphereGeometry(0.02, 10, 8), white, body, 0.04 * s, y + 0.02, 0.098).castShadow = false; part(new THREE.SphereGeometry(0.011, 8, 6), iris, body, 0.04 * s, y + 0.02, 0.114).castShadow = false; part(new THREE.BoxGeometry(0.04, 0.008, 0.01), M(0x2a1a10), body, 0.04 * s, y + 0.05, 0.105).castShadow = false; });
  part(new THREE.SphereGeometry(0.018, 8, 6), skin, body, 0, y - 0.005, 0.112);
}
const GAIT = { humain: [2.2, 0.012], drakkari: [1.8, 0.016], ursaan: [1.4, 0.02], octavii: [2.0, 0.014], kryth: [5.5, 0.008], golemite: [1.0, 0.022], lumari: [1.6, 0.01], vexx: [4.2, 0.03] };
function speciesKit(d, body, y, exposed) {
  const sp = d.species, S = sp && SPECIES[sp], anim = [];
  const res = { head: false, anim: (u, t) => anim.forEach(f => f(t, u)) };
  if (!S || sp === 'humain') return res;
  res.head = exposed;
  const skin = M(d.look.skin, { roughness: sp === 'golemite' ? 0.95 : sp === 'kryth' ? 0.32 : 0.6, metalness: sp === 'kryth' ? 0.35 : 0, flatShading: sp === 'golemite' });
  const glowEyes = ['lumari', 'kryth', 'golemite'].includes(sp);
  const eyeMat = new THREE.MeshBasicMaterial({ color: hdr(S.eyes, glowEyes ? 1.8 : 1) });
  const head = new THREE.Group(); head.position.y = y; if (exposed) body.add(head);
  const eyes = (x, yy, z, r, sx = 1) => [-1, 1].forEach(s => { const e = part(new THREE.SphereGeometry(r, 12, 10), eyeMat, head, s * x, yy, z); e.castShadow = false; e.scale.x = sx; });
  if (sp === 'drakkari') {
    if (exposed) {
      part(new THREE.SphereGeometry(0.115, 18, 14), skin, head).scale.set(1, 0.92, 1.15);
      part(new THREE.BoxGeometry(0.11, 0.07, 0.15), skin, head, 0, -0.035, 0.12);
      eyes(0.055, 0.03, 0.085, 0.02, 1.4);
      for (let i = 0; i < 4; i++) part(new THREE.ConeGeometry(0.022, 0.08, 6), skin, head, 0, 0.1 - 0.015 * i, -0.01 - 0.05 * i).rotation.x = -0.7;
    }
    const tail = new THREE.Group(); tail.position.set(0, 0.44, -0.12); body.add(tail);
    let seg = tail;
    for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(0, i ? -0.16 : 0, 0); g.rotation.x = i ? 0.35 : 2.2; seg.add(g); part(new THREE.CylinderGeometry(0.05 - 0.01 * i, 0.04 - 0.01 * i, 0.18, 10), skin, g, 0, -0.08, 0); seg = g; }
    anim.push(t => { tail.rotation.y = Math.sin(t * 1.8) * 0.4; tail.rotation.z = Math.sin(t * 1.3) * 0.1; });
  } else if (sp === 'ursaan') {
    const fur2 = M(new THREE.Color(d.look.skin).multiplyScalar(0.7), { roughness: 1 });
    if (exposed) {
      part(new THREE.SphereGeometry(0.135, 18, 14), skin, head).scale.set(1.1, 1, 1);
      part(new THREE.SphereGeometry(0.06, 12, 10), fur2, head, 0, -0.035, 0.12);
      part(new THREE.SphereGeometry(0.02, 8, 6), M(0x111111), head, 0, -0.01, 0.175);
      eyes(0.05, 0.035, 0.118, 0.015);
      [-1, 1].forEach(s => { const h = part(new THREE.TorusGeometry(0.06, 0.02, 8, 14, Math.PI * 1.3), M(0xd8ccb0, { roughness: 0.5 }), head, s * 0.12, 0.07, -0.01); h.rotation.set(0, s * Math.PI / 2, s > 0 ? 0.6 : 2.5); });
    }
    part(new THREE.SphereGeometry(0.2, 16, 12), skin, body, 0, 0.98, -0.03).scale.set(1.35, 0.55, 0.95);
  } else if (sp === 'octavii') {
    if (exposed) {
      part(new THREE.SphereGeometry(0.12, 18, 14), skin, head).scale.set(1, 1.12, 1);
      eyes(0.052, 0.035, 0.095, 0.026);
      const tents = [];
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i * 0.12) + Math.PI, g = new THREE.Group(); g.position.set(Math.cos(a) * 0.075, -0.07, Math.sin(a) * 0.07 + 0.05); head.add(g); part(new THREE.CylinderGeometry(0.02, 0.006, 0.24, 8), skin, g, 0, -0.12, 0); tents.push(g); }
      anim.push(t => tents.forEach((g, i) => { g.rotation.x = Math.sin(t * 2 + i) * 0.2 - 0.1; g.rotation.z = Math.cos(t * 1.6 + i * 1.3) * 0.18; }));
    }
  } else if (sp === 'kryth') {
    if (exposed) {
      part(new THREE.SphereGeometry(0.1, 16, 12), skin, head).scale.set(0.85, 1.15, 1.1);
      eyes(0.052, 0.035, 0.065, 0.042);
      [-1, 1].forEach(s => { const mnd = part(new THREE.ConeGeometry(0.016, 0.08, 6), skin, head, s * 0.03, -0.075, 0.09); mnd.rotation.set(Math.PI / 2 + 0.5, 0, s * 0.3); });
      const ants = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.03, 0.1, 0.03); head.add(g); part(new THREE.CylinderGeometry(0.005, 0.004, 0.24, 6), skin, g, 0, 0.12, 0); part(new THREE.SphereGeometry(0.014, 8, 6), eyeMat, g, 0, 0.24, 0).castShadow = false; return [g, s]; });
      anim.push(t => ants.forEach(([g, s]) => { g.rotation.z = -s * (0.35 + Math.sin(t * 6 + s) * 0.12); g.rotation.x = 0.3 + Math.sin(t * 4.3 + s) * 0.1; }));
    }
    [-1, 1].forEach(s => part(new THREE.CapsuleGeometry(0.025, 0.16, 4, 8), skin, body, s * 0.16, 0.72, 0.1).rotation.set(-1.1, 0, s * 0.5));
  } else if (sp === 'golemite') {
    if (exposed) {
      const hb = part(new THREE.DodecahedronGeometry(0.13), skin, head); hb.scale.set(1.1, 1, 1);
      part(new THREE.BoxGeometry(0.24, 0.05, 0.12), skin, head, 0, 0.07, 0.05);
      eyes(0.05, 0.0, 0.11, 0.017);
    }
    for (let i = 0; i < 3; i++) part(new THREE.DodecahedronGeometry(0.15), skin, body, 0, 0.98 - 0.2 * i, -0.16).scale.set(1.3, 0.6, 0.5);
    [-1, 1].forEach(s => part(new THREE.DodecahedronGeometry(0.1), skin, body, s * 0.24, 1.0, 0));
  } else if (sp === 'lumari') {
    const marks = new THREE.MeshBasicMaterial({ color: hdr(S.marks, 2) });
    if (exposed) {
      part(new THREE.SphereGeometry(0.11, 18, 14), skin, head).scale.set(0.9, 1.35, 1); head.rotation.x = -0.15;
      eyes(0.045, 0.02, 0.088, 0.02, 1.7);
      [-1, 1].forEach(s => part(new THREE.BoxGeometry(0.008, 0.08, 0.004), marks, head, s * 0.062, -0.035, 0.092).castShadow = false);
      part(new THREE.SphereGeometry(0.012, 8, 6), marks, head, 0, 0.1, 0.09).castShadow = false;
    }
    anim.push(t => marks.color.copy(hdr(S.marks, 1.5 + Math.sin(t * 2) * 0.8)));
  } else if (sp === 'vexx') {
    if (exposed) {
      part(new THREE.SphereGeometry(0.14, 18, 14), skin, head).scale.set(1.1, 0.95, 1);
      eyes(0.058, 0.02, 0.118, 0.032);
      [-1, 1].forEach(s => { const e = part(new THREE.SphereGeometry(0.012, 6, 4), M(0x111111), head, s * 0.058, 0.02, 0.15); e.castShadow = false; });
      const ears = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.13, 0.03, 0); head.add(g); const c = part(new THREE.ConeGeometry(0.055, 0.26, 10), skin, g, s * 0.11, 0.02, 0); c.rotation.z = -s * Math.PI / 2.3; c.scale.z = 0.35; return [g, s]; });
      anim.push(t => ears.forEach(([g, s]) => { g.rotation.z = s * Math.sin(t * 3.1 + s) * 0.12; }));
    }
  }
  return res;
}
function scaleSpecies(model, d) {
  const S = d.species && SPECIES[d.species]; if (!S) return;
  model.root.scale.multiply(new V3(...S.scale)); model.height *= S.scale[1];
  model.gait = GAIT[d.species];
}
const GUARD = new THREE.Euler(-1.05, 0, -0.15);
const SWINGS = [new THREE.Euler(-1.35, 0.7, 0.85), new THREE.Euler(-1.25, -0.6, -0.75), new THREE.Euler(-2.0, 0, 0.1)];
function buildJedi(d) {
  const L = d.look, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const robe = M(L.robe, { roughness: 0.92 }), robeDS = M(new THREE.Color(L.robe).multiplyScalar(0.82), { roughness: 0.92, side: THREE.DoubleSide });
  const tunic = M(L.tunic, { roughness: 0.85 }), skin = M(L.skin || 0xd6a079, { roughness: 0.6 }), dark = M(0x2b1a10, { roughness: 0.9 });
  const prof = [[0, 0], [0.36, 0], [0.33, 0.12], [0.25, 0.42], [0.21, 0.62], [0, 0.64]].map(([x, y]) => new THREE.Vector2(x, y));
  part(new THREE.LatheGeometry(prof, 28), robe, body);
  part(new THREE.CylinderGeometry(0.16, 0.21, 0.42, 20), tunic, body, 0, 0.83, 0);
  part(new THREE.CylinderGeometry(0.218, 0.218, 0.07, 20), dark, body, 0, 0.64, 0);
  const kit = speciesKit(d, body, 1.14, true);
  if (!kit.head) { part(new THREE.SphereGeometry(0.115, 20, 16), skin, body, 0, 1.14, 0.01); humanFace(body, 1.14, skin); }
  if (L.hood) {
    part(new THREE.SphereGeometry(0.155, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), robeDS, body, 0, 1.16, -0.03).rotation.x = -0.45;
    part(new THREE.CylinderGeometry(0.21, 0.4, 0.95, 24, 1, true, Math.PI * 0.32, Math.PI * 1.36), robeDS, body, 0, 0.55, 0);
  } else {
    if (!kit.head) part(new THREE.SphereGeometry(0.123, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(L.hair, { roughness: 0.8 }), body, 0, 1.15, -0.012).rotation.x = -0.35;
    part(new THREE.TorusGeometry(0.13, 0.05, 10, 24), robeDS, body, 0, 1.03, -0.02).rotation.x = Math.PI / 2 - 0.25;
  }
  [-1, 1].forEach(sd => part(new THREE.BoxGeometry(0.13, 0.4, 0.02), M(new THREE.Color(L.tunic).multiplyScalar(0.78), { roughness: 0.9 }), body, 0, 0.83, 0.19 * sd));
  const lArm = new THREE.Group(); lArm.position.set(-0.22, 1.0, 0); lArm.rotation.set(-0.35, 0, 0.3); body.add(lArm);
  part(new THREE.CapsuleGeometry(0.055, 0.28, 4, 10), robe, lArm, 0, -0.19, 0);
  part(new THREE.SphereGeometry(0.045, 10, 8), skin, lArm, 0, -0.39, 0);
  const rArm = new THREE.Group(); rArm.position.set(0.22, 1.0, 0); body.add(rArm);
  part(new THREE.CapsuleGeometry(0.055, 0.28, 4, 10), robe, rArm, 0, -0.19, 0);
  const hand = new THREE.Group(); hand.position.set(0, -0.39, 0.02); rArm.add(hand);
  part(new THREE.SphereGeometry(0.045, 10, 8), skin, hand);
  const saber = buildSaber(L.saber, false); saber.group.rotation.set(1.55, 0, 0.55); hand.add(saber.group);
  const chest = new THREE.Object3D(); chest.position.set(0, 0.9, 0.05); body.add(chest);
  const stun = stunRing(body, 1.36);
  rArm.rotation.copy(GUARD);
  return {
    root, body, hand, saber, chest, height: 1.42, mats: [robe, robeDS, tunic, dark],
    update(u, dt, t) {
      const w = envelope(u.swingT, 0.06, 0.26), P = SWINGS[u.swingPose];
      rArm.rotation.set(lerp(GUARD.x, P.x, w), lerp(GUARD.y, P.y, w), lerp(GUARD.z, P.z, w));
      const perfect = u.st && u.st.perfect > 0;
      saber.glow.material.opacity = (0.5 + 0.08 * Math.sin(t * 41)) * (perfect ? 1.25 : 1);
      saber.glow.scale.set(perfect ? 1.8 : 1, 1, perfect ? 1.8 : 1);
      stun.visible = u.alive && u.stun > 0; stun.rotation.z = t * 6;
      kit.anim(u, t);
    },
  };
}
function buildSoldier(d) {
  const L = d.look, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const armor = M(L.armor, { metalness: L.droid ? 0.75 : 0.5, roughness: L.droid ? 0.3 : 0.45 }), plate = M(L.plate, { metalness: 0.5, roughness: 0.4 }), under = M(L.under, { roughness: 0.8 });
  const skin = M(L.skin || 0xd6a079, { roughness: 0.6 }), glowCol = L.visor || d.glow;
  const visor = new THREE.MeshBasicMaterial({ color: hdr(glowCol, 2.6) });
  const armed = !L.unarmed, bare = L.helmet === 'none' || L.helmet === 'cap';
  [-1, 1].forEach(s => {
    part(new THREE.CapsuleGeometry(0.066, 0.3, 4, 10), under, body, 0.09 * s, 0.24, 0);
    part(new THREE.BoxGeometry(0.11, 0.07, 0.17), armor, body, 0.09 * s, 0.035, 0.02);
    if (!bare || L.heavy) part(new THREE.SphereGeometry(L.heavy ? 0.12 : 0.1, 12, 10), plate, body, 0.205 * s, 0.97, 0).scale.set(1, 0.7, 1);
  });
  part(new THREE.BoxGeometry(0.3, 0.12, 0.19), under, body, 0, 0.47, 0);
  const belt = M(0x2a2018, { roughness: 0.7 }); part(new THREE.BoxGeometry(0.34, 0.05, 0.22), belt, body, 0, 0.55, 0);
  [-1, 0, 1].forEach(s => part(new THREE.BoxGeometry(0.06, 0.06, 0.04), belt, body, s * 0.1, 0.54, 0.12));
  [-1, 1].forEach(s => part(new THREE.BoxGeometry(0.08, 0.07, 0.04), plate, body, 0.09 * s, 0.26, 0.065));
  part(new THREE.CapsuleGeometry(0.165, 0.26, 4, 14), armor, body, 0, 0.77, 0);
  part(new THREE.BoxGeometry(0.29, 0.2, 0.08), plate, body, 0, 0.85, 0.13);
  const kit = speciesKit(d, body, 1.13, L.helmet !== 'full');
  if (L.helmet === 'full') {
    part(new THREE.SphereGeometry(0.135, 18, 14), armor, body, 0, 1.15, 0);
    part(new THREE.BoxGeometry(0.25, 0.04, 0.2), plate, body, 0, 1.22, 0.02);
    if (L.droid) [-1, 1].forEach(s => { part(new THREE.SphereGeometry(0.026, 10, 8), visor, body, 0.05 * s, 1.15, 0.12).castShadow = false; });
    else part(new THREE.BoxGeometry(0.2, 0.048, 0.06), visor, body, 0, 1.14, 0.11).castShadow = false;
  } else {
    if (!kit.head) { part(new THREE.SphereGeometry(0.115, 18, 14), skin, body, 0, 1.13, 0.01); humanFace(body, 1.13, skin); }
    if (L.helmet === 'open') part(new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), plate, body, 0, 1.15, -0.01).rotation.x = -0.2;
    else if (L.helmet === 'cap') { part(new THREE.CylinderGeometry(0.12, 0.125, 0.08, 18), under, body, 0, 1.23, 0); part(new THREE.BoxGeometry(0.16, 0.015, 0.08), under, body, 0, 1.2, 0.12); }
    else if (!kit.head) part(new THREE.SphereGeometry(0.122, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(L.hair, { roughness: 0.8 }), body, 0, 1.15, -0.015).rotation.x = -0.35;
  }
  if (L.cape) part(new THREE.CylinderGeometry(0.22, 0.36, 0.9, 20, 1, true, Math.PI * 0.35, Math.PI * 1.3), M(L.cape, { roughness: 0.9, side: THREE.DoubleSide }), body, 0, 0.55, 0);
  if (L.backpack) part(new THREE.BoxGeometry(0.3, 0.36, 0.15), plate, body, 0, 0.86, -0.18);
  if (L.cross) { const cm = new THREE.MeshBasicMaterial({ color: hdr('#7dffb0', 1.8) }); part(new THREE.BoxGeometry(0.04, 0.12, 0.01), cm, body, 0, 0.86, 0.175).castShadow = false; part(new THREE.BoxGeometry(0.12, 0.04, 0.01), cm, body, 0, 0.86, 0.175).castShadow = false; }
  const gun = new THREE.Group(); gun.position.set(0.1, 0.83, 0.2); body.add(gun);
  const gl = L.pistol ? 0.2 : L.rifle === 'long' ? 0.58 : L.heavy ? 0.46 : 0.34;
  if (armed) {
    part(new THREE.BoxGeometry(L.heavy ? 0.12 : 0.075, L.heavy ? 0.13 : 0.095, gl), under, gun);
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10), M(0x2c3036, { metalness: 0.8, roughness: 0.3 }), gun, 0, 0.01, gl / 2 + 0.08).rotation.x = Math.PI / 2;
    if (L.rifle === 'long') part(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 10), M(0x1a1d22, { metalness: 0.7 }), gun, 0, 0.08, 0.02).rotation.x = Math.PI / 2;
  } else part(new THREE.BoxGeometry(0.12, 0.1, 0.08), plate, body, -0.2, 0.55, 0.05);
  const limb = bare ? plate : armor;
  part(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), limb, body, 0.2, 0.86, 0.08).rotation.x = armed ? -1.25 : -0.2;
  part(new THREE.CapsuleGeometry(0.05, 0.24, 4, 8), limb, body, -0.07, 0.84, 0.17).rotation.set(armed ? -1.3 : -0.2, 0, armed ? 0.9 : 0.3);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.01, gl / 2 + 0.17); gun.add(muzzle);
  const chest = new THREE.Object3D(); chest.position.set(0, 0.86, 0.05); body.add(chest);
  const stun = stunRing(body, 1.36);
  if (L.heavy) root.scale.setScalar(1.18);
  const gunZ = gun.position.z;
  return {
    root, body, chest, muzzle, height: L.heavy ? 1.68 : 1.42, mats: [armor, plate, under],
    update(u, dt, t) {
      gun.position.z = gunZ - 0.06 * envelope(u.recoilT, 0.02, 0.15);
      stun.visible = u.alive && u.stun > 0; stun.rotation.z = t * 6;
      if (L.visor && L.helmet === 'full') visor.color.copy(hdr(glowCol, u.stun > 0 ? 0.8 : 2.6));
      kit.anim(u, t);
    },
  };
}
function buildDroid(d) {
  const L = d.look, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = M(L.shell || 0xd9dee6, { metalness: 0.6, roughness: 0.3 }), trim = M(L.trim || 0x2f8f66, { metalness: 0.5, roughness: 0.4 });
  const core = new THREE.Group(); core.position.y = 0.85; body.add(core);
  part(new THREE.SphereGeometry(0.24, 24, 18), shell, core);
  const ring = part(new THREE.TorusGeometry(0.32, 0.03, 8, 40), trim, core); ring.rotation.x = Math.PI / 2;
  part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), M(0x1b1e24), core, 0.08, 0.06, 0.21).rotation.x = Math.PI / 2;
  part(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: hdr(L.visor || '#7ff4ff', 2.4) }), core, 0.08, 0.06, 0.245).castShadow = false;
  [-1, 1].forEach(s => { const a = part(new THREE.CapsuleGeometry(0.025, 0.18, 4, 8), trim, core, 0.26 * s, -0.12, 0.04); a.rotation.z = 0.5 * s; part(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: hdr(d.glow, 2) }), core, 0.33 * s, -0.24, 0.04).castShadow = false; });
  part(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), trim, core, -0.08, 0.3, 0);
  if (d.role === 'sniper') for (let i = 0; i < 4; i++) { const leg = part(new THREE.CylinderGeometry(0.01, 0.006, 0.42, 6), trim, core, Math.cos(i * 1.57) * 0.12, -0.38, Math.sin(i * 1.57) * 0.12); leg.rotation.z = Math.cos(i * 1.57) * 0.3; leg.rotation.x = -Math.sin(i * 1.57) * 0.3; }
  const thruster = part(new THREE.ConeGeometry(0.09, 0.16, 16), new THREE.MeshBasicMaterial({ color: hdr('#7ff4ff', 1.4), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), core, 0, -0.3, 0);
  thruster.rotation.x = Math.PI; thruster.castShadow = false;
  const chest = new THREE.Object3D(); core.add(chest);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.08, 0.06, 0.28); core.add(muzzle);
  const stun = stunRing(core, 0.46);
  return {
    root, body, chest, muzzle, height: 1.32, mats: [shell, trim],
    update(u, dt, t) { core.position.y = 0.85 + Math.sin(t * 2.4 + u.group.position.x) * 0.06; ring.rotation.z = t * 1.5; stun.visible = u.alive && u.stun > 0; },
  };
}
const MODELS = { jedi: buildJedi, soldier: buildSoldier, droid: buildDroid };

/* ================================================================
   EFFETS
   ================================================================ */
const UP = new V3(0, 1, 0);
const fx = [];
const sparkGeo = new THREE.SphereGeometry(1, 6, 4);
const glowMats = {};
const glowMat = hexc => (glowMats[hexc] ||= new THREE.MeshBasicMaterial({ color: hdr(hexc, 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
function burst(pos, hexc, n, o = {}) {
  const { speed = 3, life = 0.4, gravity = -7, size = 0.028, spread = 0, up = 0, parent = scene } = o;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sparkGeo, glowMat(hexc)); m.position.copy(pos);
    if (spread) { const a = rand(0, Math.PI * 2), r = rand(0.2, 1) * spread; m.position.x += Math.cos(a) * r; m.position.z += Math.sin(a) * r; }
    const vel = new V3().randomDirection().multiplyScalar(speed * rand(0.35, 1)); vel.y += up;
    parent.add(m); fx.push({ m, vel, life: life * rand(0.6, 1.2), max: life, gravity, size, parent });
  }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.life -= dt;
    if (p.life <= 0) { p.parent.remove(p.m); fx.splice(i, 1); continue; }
    p.vel.y += p.gravity * dt; p.m.position.addScaledVector(p.vel, dt); p.m.scale.setScalar(p.size * Math.min(1, p.life / p.max * 1.4));
  }
}
const temp = [];
function addTemp(m, dur, fn, delay = 0, parent = scene) { parent.add(m); temp.push(m); tween(dur, k => fn(k, m), () => { m.removeFromParent(); m.material.dispose(); const i = temp.indexOf(m); if (i >= 0) temp.splice(i, 1); }, delay); }
const additive = (hexc, k = 1.6, o = {}) => new THREE.MeshBasicMaterial({ color: hdr(hexc, k), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...o });
const columnTex = canvasTexture(null, 4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const columnGeo = new THREE.CylinderGeometry(0.48, 0.48, 2.4, 32, 1, true); columnGeo.translate(0, 1.2, 0);
function lightColumn(pos, hexc) {
  const m = new THREE.Mesh(columnGeo, additive(hexc, 1.6, { map: columnTex })); m.position.copy(pos).setY(0.05);
  addTemp(m, 1.2, (k, o) => { o.scale.y = 0.2 + 0.8 * easeOut(Math.min(1, k * 2)); o.material.opacity = 0.85 * Math.sin(Math.PI * k); });
}
const ringGeo = new THREE.RingGeometry(0.9, 1, 64);
function shockRing(pos, hexc, maxScale, dur, delay = 0) {
  const m = new THREE.Mesh(ringGeo, additive(hexc, 2)); m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(0.12);
  addTemp(m, dur, (k, o) => { o.scale.setScalar(0.3 + maxScale * easeOut(k)); o.material.opacity = 0.9 * (1 - k); }, delay);
}
const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
function beam(a, b, hexc, dur = 0.45) {
  const m = new THREE.Mesh(beamGeo, additive(hexc, 2.2)); const dir = b.clone().sub(a);
  m.position.copy(a).addScaledVector(dir, 0.5); m.scale.y = dir.length(); m.quaternion.setFromUnitVectors(UP, dir.normalize());
  addTemp(m, dur, (k, o) => { o.material.opacity = 0.9 * Math.sin(Math.PI * k); });
}
function zigzag(a, b, hexc, dur = 0.45) {
  const pts = [], n = 9;
  for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); if (i && i < n) p.add(new V3(rand(-0.25, 0.25), rand(-0.25, 0.25), rand(-0.25, 0.25))); pts.push(p); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hdr(hexc, 3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  addTemp(line, dur, (k, o) => { o.material.opacity = k < 0.8 ? (Math.random() > 0.3 ? 1 : 0.3) : 1 - (k - 0.8) * 5; });
}
const domeGeo = new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const bolts = [];
const boltGeo = new THREE.CapsuleGeometry(0.028, 0.36, 4, 8);
const BOLT_MAT = { foe: new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 0.55, 0.4) }), player: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.9, 4.2) }), gold: new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 3.2, 0.8) }) };
function spawnBolt(from, to, o) {
  const m = new THREE.Mesh(boltGeo, BOLT_MAT[o.mat || o.side]); m.position.copy(from); scene.add(m);
  if (o.big) m.scale.set(2, 1.4, 2);
  const b = { m, dir: to.clone().sub(from).normalize(), speed: 9, life: 0, ...o };
  m.quaternion.setFromUnitVectors(UP, b.dir); bolts.push(b); return b;
}
function clearBolts() { bolts.forEach(b => scene.remove(b.m)); bolts.length = 0; }

/* ================================================================
   AUDIO (synthétisé)
   ================================================================ */
const sfx = (() => {
  let ctx = null, out = null, noise = null, hum = null, muted = false;
  function init() {
    if (ctx) { ctx.resume && ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ctx = new AC(); out = ctx.createGain(); out.gain.value = muted ? 0 : 0.5; out.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const dd = noise.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function route(nodes, pan) {
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); nodes.push(p); }
    nodes.push(out); for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  }
  function gainEnv(t, attack, dur, peak) { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); return g; }
  function filter(type, f0, f1, t, dur, q = 1) { const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); return f; }
  function tone({ type = 'sine', f0, f1 = f0, dur, gain = 0.2, attack = 0.005, lp, pan = 0, delay = 0 }) {
    if (!ctx) return; const t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    route([o, ...(lp ? [filter('lowpass', lp, lp, t, dur)] : []), gainEnv(t, attack, dur, gain)], pan); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss({ dur, gain = 0.2, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, pan = 0, attack = 0.005, delay = 0 }) {
    if (!ctx) return; const t = ctx.currentTime + delay, s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    route([s, filter(type, f0, f1, t, dur, q), gainEnv(t, attack, dur, gain)], pan); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  const notes = (list, type, dur, step, gain = 0.08) => list.forEach((f, i) => tone({ type, f0: f, dur, gain, delay: i * step }));
  return {
    init,
    blaster: (p, hi) => { tone({ type: 'square', f0: hi ? 2100 : 1700, f1: 160, dur: 0.2, gain: 0.07, lp: 3200, pan: p }); tone({ type: 'sawtooth', f0: 900, f1: 120, dur: 0.16, gain: 0.035, pan: p }); },
    deflect: p => { hiss({ dur: 0.09, gain: 0.3, type: 'highpass', f0: 2500, pan: p }); tone({ f0: 2600, f1: 1900, dur: 0.18, gain: 0.11, pan: p }); tone({ type: 'triangle', f0: 1300, f1: 900, dur: 0.14, gain: 0.07, pan: p }); },
    swing: () => hiss({ dur: 0.22, gain: 0.16, f0: 300, f1: 1400, q: 2, attack: 0.06 }),
    hit: (p = 0) => { tone({ f0: 180, f1: 55, dur: 0.16, gain: 0.26, pan: p }); hiss({ dur: 0.08, gain: 0.13, type: 'lowpass', f0: 1800, pan: p }); },
    ignite: () => { tone({ type: 'sawtooth', f0: 60, f1: 180, dur: 0.5, gain: 0.13, lp: 900 }); hiss({ dur: 0.4, gain: 0.18, f0: 400, f1: 3000, q: 1.5, attack: 0.02 }); },
    retract: () => tone({ type: 'sawtooth', f0: 180, f1: 50, dur: 0.45, gain: 0.12, lp: 800 }),
    push: () => { hiss({ dur: 0.6, gain: 0.42, type: 'lowpass', f0: 1600, f1: 90, attack: 0.01 }); tone({ f0: 90, f1: 40, dur: 0.6, gain: 0.32 }); },
    boom: () => { hiss({ dur: 0.9, gain: 0.55, type: 'lowpass', f0: 2200, f1: 60, attack: 0.005 }); tone({ f0: 120, f1: 30, dur: 0.8, gain: 0.4 }); },
    zap: () => { hiss({ dur: 0.45, gain: 0.25, type: 'highpass', f0: 3000, f1: 1500 }); tone({ type: 'sawtooth', f0: 1200, f1: 180, dur: 0.4, gain: 0.06 }); },
    beep: () => tone({ type: 'square', f0: 1600, dur: 0.06, gain: 0.04 }),
    heal: () => notes([523, 659, 784, 1046], 'triangle', 0.35, 0.08),
    rise: () => notes([392, 523, 659, 784, 1046], 'sine', 0.5, 0.09, 0.07),
    power: () => { tone({ type: 'sawtooth', f0: 200, f1: 600, dur: 0.35, gain: 0.07, lp: 1500 }); tone({ f0: 880, f1: 1320, dur: 0.3, gain: 0.06, delay: 0.05 }); },
    whoosh: () => hiss({ dur: 0.16, gain: 0.15, f0: 500, f1: 1800, q: 3, attack: 0.04 }),
    emerge: () => { tone({ type: 'triangle', f0: 220, f1: 660, dur: 0.7, gain: 0.05 }); hiss({ dur: 0.7, gain: 0.06, type: 'highpass', f0: 3000, attack: 0.2 }); },
    down: (p = 0) => tone({ type: 'square', f0: 300, f1: 60, dur: 0.4, gain: 0.06, lp: 900, pan: p }),
    deny: () => tone({ type: 'square', f0: 160, f1: 120, dur: 0.12, gain: 0.05 }),
    click: () => tone({ type: 'triangle', f0: 900, f1: 1200, dur: 0.06, gain: 0.04 }),
    flip: r => { hiss({ dur: 0.12, gain: 0.12, f0: 1500, f1: 4000, q: 1 }); notes([[660], [660, 880], [660, 880, 1100], [660, 880, 1100, 1320], [523, 784, 1046, 1318, 1568]][r], 'triangle', 0.4, 0.07, 0.06); },
    tear: () => hiss({ dur: 0.35, gain: 0.3, f0: 800, f1: 5000, q: 0.8 }),
    rip: () => hiss({ dur: 0.05, gain: 0.12, type: 'highpass', f0: 2500 + Math.random() * 2000, q: 2 }),
    charge: () => { tone({ type: 'sawtooth', f0: 200, f1: 900, dur: 0.6, gain: 0.05, lp: 2000 }); hiss({ dur: 0.6, gain: 0.08, f0: 500, f1: 4000, q: 2, attack: 0.3 }); },
    legend: () => { notes([523, 659, 784, 1046, 1318, 1568], 'triangle', 0.9, 0.09, 0.07); hiss({ dur: 1.2, gain: 0.12, type: 'highpass', f0: 4000, attack: 0.05 }); },
    win: () => notes([392, 523, 659, 784], 'triangle', 0.6, 0.12),
    lose: () => notes([392, 330, 262], 'triangle', 0.7, 0.18),
    humOn() {
      if (!ctx || hum) return;
      const g = ctx.createGain(); g.gain.value = 0.028; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 82; o2.frequency.value = 85.5;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(out); o1.start(); o2.start(); hum = { g, f, o1, o2 };
    },
    humOff() { if (!hum) return; const t = ctx.currentTime; hum.g.gain.setTargetAtTime(0, t, 0.08); hum.o1.stop(t + 0.4); hum.o2.stop(t + 0.4); hum = null; },
    humSwing() { if (!hum) return; const t = ctx.currentTime; hum.f.frequency.cancelScheduledValues(t); hum.f.frequency.setValueAtTime(1100, t); hum.f.frequency.setTargetAtTime(320, t + 0.05, 0.12); },
    setMuted(m) { muted = m; if (out) out.gain.value = m ? 0 : 0.5; },
  };
})();
