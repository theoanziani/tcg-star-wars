/* ================================================================
   UNITÉS
   ================================================================ */
const labels = $('#labels');
const GUN = new Set(['shooter', 'sniper', 'tank', 'leader']);
const ST = ['invuln', 'guard', 'perfect', 'haste', 'rage', 'taunt', 'evade'];
class Unit {
  constructor(id, side, cell, lvl = 1, boss = false) {
    this.id = id; this.side = side; this.cell = cell; this.meleeT = rand(3, 5); this.def = scaleDef(id, lvl, boss); this.lvl = lvl;
    if (this.def.role === 'force') this.def.meleeDmg = Math.round(this.def.reflectDmg * 1.3);
    this.hp = this.maxHp = this.def.hp; this.alive = true; this.ready = false; this.thrown = false; this.busy = false;
    this.stun = 0; this.marked = 0; this.cool = rand(1, 2); this.lowDone = false;
    this.skills = this.def.skills.filter(k => !k.locked && k.trig !== 'ult');
    this.ult = this.def.skills.find(k => !k.locked && k.trig === 'ult') || null;
    this.charge = DATA.rules.ultStart; this.cd = {}; this.tick = {}; this.st = {};
    ST.forEach(k => (this.st[k] = 0));
    this.skills.forEach(k => { if (k.trig === 'tick') this.tick[k.id] = rand(1.5, k.every); });
    this.swingT = this.knockT = this.hitT = this.recoilT = 9; this.swingPose = 0; this.flashK = 0;
    this.group = new THREE.Group(); this.group.position.copy(cellPos(side, cell)); scene.add(this.group);
    this.card = makeCard(id, lvl); this.card.position.y = CARD_Y; this.group.add(this.card);
    this.slot = slotGlow(fac(this.def).glow); this.group.add(this.slot);
    this.model = MODELS[this.def.model](this.def); scaleSpecies(this.model, this.def);
    this.model.root.position.y = HIDDEN_Y; this.model.root.scale.multiplyScalar(FIG_SCALE);
    if (side === 'player') this.model.root.rotation.y = Math.PI;
    this.group.add(this.model.root);
    this.tag = document.createElement('div');
    this.tag.className = `tag ${side}${this.def.boss ? ' boss' : ''}`;
    this.tag.innerHTML = `<div><span class="tname"></span><span class="bar"><i></i></span>${this.ult ? '<span class="ubar"><i></i></span>' : ''}<span class="hpn"></span></div>`;
    this.tag.querySelector('.tname').textContent = this.def.title ? `${this.def.name} · ${this.def.title}` : this.def.name;
    this.tag.style.opacity = 0; labels.append(this.tag);
    this.bar = this.tag.querySelector('.bar i'); this.ubar = this.tag.querySelector('.ubar i'); this.hpn = this.tag.querySelector('.hpn');
    this.refreshTag();
  }
  get role() { return this.def.role; }
  get gun() { return GUN.has(this.role); }
  get canParry() { return this.role === 'force' && this.model.saber.power > 0.9 && !this.thrown && !this.busy; }
  chest(v = new V3()) { return this.model.chest.getWorldPosition(v); }
  head() { return this.group.position.clone().setY(this.model.height * FIG_SCALE + 0.12); }
  refreshTag() { this.bar.style.transform = `scaleX(${Math.max(0, this.hp / this.maxHp)})`; this.hpn.textContent = `${Math.max(0, Math.ceil(this.hp))} / ${this.maxHp}`; }
  dim() { const f = this.card.userData.face; f.color.setScalar(0.35); f.emissiveIntensity = 0.02; this.slot.material.opacity = 0.12; }
  showNow() { this.model.root.position.y = BASE_Y; this.ready = true; if (this.model.saber) this.model.saber.setPower(1); }
  dispose() { scene.remove(this.group); this.tag.remove(); }
}

/* ================================================================
   ÉTAT DU COMBAT
   ================================================================ */
let screen = 'hub', state = 'hub', mission = null, side = 'light', waveIdx = 0, shake = 0, flashV = 0;
let allies = Array(CELLS).fill(null), foes = [], prepBoard = null, stats = null;
const BUFF_KEYS = ['barriere', 'bouclier', 'rage', 'stim', 'fumee'];
const mkBuffs = () => ({ barriere: 0, bouclier: 0, rage: 0, rageBonus: 0, stim: 0, fumee: 0 });
const buffs = { player: mkBuffs(), foe: mkBuffs() };
const BUFF_INFO = { barriere: ['Barrière', '#ffd166'], bouclier: ['Bouclier', '#6fd8ff'], rage: ['Rage', '#ff4b3e'], stim: ['Cadence ×2', '#9cff6a'], fumee: ['Fumigène', '#b8c4d4'] };
const units = () => [...allies.filter(Boolean), ...foes];
const aliveAllies = () => allies.filter(a => a && a.alive && a.ready);
const aliveFoes = () => foes.filter(f => f.alive && f.ready);
const team = s => (s === 'player' ? aliveAllies() : aliveFoes());
const otherSide = s => (s === 'player' ? 'foe' : 'player');
const opponents = u => team(otherSide(u.side));
const deadOf = s => (s === 'player' ? allies.filter(a => a && !a.alive) : foes.filter(f => !f.alive));
const panOf = x => clamp(x / 4, -1, 1);
const byHp = (list, dir = -1) => [...list].sort((a, b) => dir * (a.hp - b.hp))[0];
const mostHurt = list => [...list].filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
const auraOf = s => Math.min(0.5, team(s).reduce((acc, u) => acc + (u.def.aura || 0), 0));
/* multiplicateur de dégâts d'un personnage : meneurs, rage du camp, colère, espèce */
const dmgOut = u => (1 + auraOf(u.side) + (buffs[u.side].rage > 0 ? buffs[u.side].rageBonus : 0) + (u.st.rage > 0 ? 0.6 : 0)) * (1 + (u.def.dmgBonus || 0));
const domes = [];
const mTitle = m => m.title[side];

function clearScene() {
  units().forEach(u => u.dispose());
  allies = Array(CELLS).fill(null); foes = [];
  clearBolts(); fx.forEach(p => p.m.removeFromParent()); fx.length = 0;
  temp.forEach(m => m.removeFromParent()); temp.length = 0; tweens.length = 0;
  domes.forEach(d => scene.remove(d.m)); domes.length = 0;
  sfx.humOff(); ['player', 'foe'].forEach(k => Object.assign(buffs[k], mkBuffs()));
}
function spawnAllies(board) { allies = board.map((id, i) => (id ? new Unit(id, 'player', i, levelOf(id)) : null)); }
function spawnFoes(list) {
  const bossId = (list.find(r => r.endsWith('!')) || '').slice(0, -1);
  let bossDone = false;
  return autoFormation(list.map(r => r.replace('!', ''))).map((id, cell) => {
    if (!id) return null;
    const boss = !bossDone && id === bossId; if (boss) bossDone = true;
    return new Unit(id, 'foe', cell, boss ? Math.min(5, mission.lvl + 1) : mission.lvl, boss);
  }).filter(Boolean);
}
function emerge(u, delay, done) {
  later(delay, () => {
    const pos = u.group.position;
    lightColumn(pos, u.def.glow); sfx.emerge();
    burst(pos.clone().setY(0.1), u.def.glow, 22, { speed: 0.5, life: 0.9, gravity: 2.6, spread: 0.55, size: 0.024 });
    const face = u.card.userData.face;
    tween(0.9, k => { face.emissiveIntensity = 0.16 + 0.9 * Math.sin(Math.PI * k); });
    tween(0.85, k => { u.model.root.position.y = lerp(HIDDEN_Y, BASE_Y, easeOutBack(k)); }, () => {
      u.ready = true;
      if (u.model.saber) { sfx.ignite(); tween(0.35, k => u.model.saber.setPower(easeOut(k))); }
      done && done();
    });
  });
}

/* --- Déroulé d'une mission --- */
function showHubScene() {
  clearScene(); applyPlanet('qg'); state = 'hub';
  spawnAllies(save.deck.board); allies.forEach(a => a && a.showNow());
}
/* Préparation : la composition de base s'affiche, on peut l'ajuster avant l'affrontement */
function startPrep(m) {
  if (deckProblem()) { go('deck'); return; }
  mission = m; side = deckSide() === 'dark' ? 'dark' : 'light';
  clearScene(); applyPlanet(m.planet); state = 'prep'; waveIdx = 0;
  prepBoard = [...save.deck.board];
  spawnAllies(prepBoard); foes = spawnFoes(m.waves[side][0]);
  go('prep');
  boardUnits(allies).forEach((a, i) => emerge(a, 0.1 + i * 0.1));
  foes.forEach((f, i) => emerge(f, 0.5 + i * 0.1));
  if (m.i === 1 && m.story && !save.seen[m.id]) showStory(m);
}
function rearrange(board) {
  prepBoard = board;
  allies.forEach(a => a && a.dispose());
  spawnAllies(prepBoard); allies.forEach(a => a && a.showNow());
}
function beginFight() {
  stats = { parried: 0, skills: 0, ults: 0 };
  renderUlts(); go('battle'); state = 'opening'; $('.dock').hidden = false;
  units().forEach(u => { if (!u.ready) u.showNow(); });
  sfx.ignite(); if (units().some(u => u.model.saber)) sfx.humOn();
  later(0.6, () => { showBanner(`Vague 1 / ${mission.waves[side].length}`); state = 'fight'; });
  updateWaveLabel();
}
const startMission = m => startPrep(m);
function nextWave() {
  state = 'transition'; clearBolts();
  const waves = mission.waves[side];
  if (waveIdx + 1 >= waves.length) return win();
  waveIdx++;
  later(0.9, () => {
    foes.forEach((u, i) => tween(0.55, k => { u.group.position.y = 2.5 * k * k; u.card.rotation.z = k * 2; }, () => u.dispose(), i * 0.08));
    showBanner(`Vague ${waveIdx + 1} / ${waves.length}`);
    foes = spawnFoes(waves[waveIdx]); updateWaveLabel();
    foes.forEach((u, i) => {
      const tx = u.group.position.x; u.group.position.x = tx + 8; u.card.rotation.z = Math.PI;
      tween(0.55, k => { const e = easeOut(k); u.group.position.x = lerp(tx + 8, tx, e); u.group.position.y = Math.sin(Math.PI * k) * 0.6; u.card.rotation.z = Math.PI * (1 - e); }, null, 0.3 + i * 0.08);
      emerge(u, 0.85 + i * 0.08);
    });
    later(1.9 + foes.length * 0.08, () => { state = 'fight'; });
  });
}
/* Étoiles : 3 sans perte, 2 si la moitié de l'escouade tient debout, 1 sinon */
function starsFor() {
  const all = allies.filter(Boolean), up = all.filter(a => a.alive).length;
  return up === all.length ? 3 : up * 2 >= all.length ? 2 : 1;
}
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function win() {
  state = 'win'; sfx.win();
  aliveAllies().forEach(a => { a.swingPose = 2; a.swingT = 0; burst(a.head(), a.def.glow, 24, { speed: 3.5, life: 0.9, gravity: -3 }); });
  const prev = save.won[mission.id] || 0, stars = starsFor(), first = !prev;
  const credits = first ? mission.reward : Math.round(mission.reward / 2), bonus = Math.max(0, stars - prev) * 15;
  save.credits += credits + bonus;
  if (first) save.boosters += mission.boosters;
  save.won[mission.id] = Math.max(prev, stars); persist();
  const rewards = [`+${credits + bonus} crédits`, ...(first && mission.boosters ? [`+${mission.boosters} booster${mission.boosters > 1 ? 's' : ''}`] : [])];
  later(1.0, () => { showEnd(true, rewards, stars); if (mission.story && mission.i > 1 && !save.seen[mission.id]) showStory(mission); });
}
function lose() {
  state = 'lose'; sfx.humOff(); sfx.retract(); sfx.lose();
  const gain = Math.round(mission.reward * DATA.rules.consolation);
  save.credits += gain; persist();
  later(1.3, () => showEnd(false, [`+${gain} crédits`], 0));
}
const nextMission = m => MISSIONS[MISSIONS.indexOf(m) + 1];
function showEnd(won, rewards, stars) {
  const P = DATA.campaign[mission.pi], nm = nextMission(mission);
  $('#endEyebrow').textContent = `${P.name} · mission ${mission.i} / ${P.list.length}`;
  $('#endTitle').textContent = won ? 'Victoire' : 'Défaite';
  $('#endStars').textContent = won ? starStr(stars) : ''; $('#endStars').hidden = !won;
  const next = DATA.campaign[mission.pi + 1];
  $('#endText').textContent = won
    ? (mission.boss ? `${P.name} est terminée.${next ? ` ${next.name} se débloque${next.soon ? ' dès que ses missions seront prêtes' : ''}.` : ''}` : `${stars < 3 ? 'Gagne sans perdre personne pour obtenir 3 étoiles. ' : ''}Mission suivante : ${nm ? mTitle(nm) : '—'}.`)
    : 'Ton escouade est tombée. Change ta composition ou renforce ton deck avec des boosters, puis réessaie.';
  $('#endRewards').innerHTML = rewards.map(r => `<span>${r}</span>`).join('');
  $('#stAlive').textContent = allies.filter(a => a && a.alive).length;
  $('#stParry').textContent = stats.parried; $('#stSkills').textContent = stats.skills;
  $('#endNext').hidden = !(won && nm && missionOpen(nm) && nm.pi === mission.pi);
  $('.dock').hidden = true;
  $('#end').hidden = false; $(won && !$('#endNext').hidden ? '#endNext' : '#endAgain').focus({ preventScroll: true });
}

/* --- Dégâts et soins --- */
function damage(u, dmg, at, o = {}) {
  if (!u.alive) return;
  if (buffs[u.side].barriere > 0 || u.st.invuln > 0) { pop(u.head(), 'Bloqué', 'parry'); burst(at, '#ffd166', 6, { speed: 1.6, life: 0.3 }); return; }
  if (buffs[u.side].bouclier > 0) { dmg /= 2; burst(at, '#6fd8ff', 6, { speed: 1.6, life: 0.3 }); }
  if (u.st.guard > 0) dmg /= 2;
  if (u.def.armor) dmg *= 1 - u.def.armor;
  if (u.marked > 0) dmg *= 1.5;
  if (o.bonusVs && o.bonusVs === u.role) dmg *= 1.6;
  dmg = Math.max(1, Math.round(dmg));
  u.hp -= dmg; u.hitT = 0; u.refreshTag();
  if (o.stun) { u.stun = Math.max(u.stun, o.stun); pop(u.head().add(new V3(0, 0.3, 0)), 'Étourdi', 'parry'); }
  pop(u.head(), `-${dmg}`, u.side === 'player' ? 'hurt' : o.crit ? 'crit' : 'dmg');
  burst(at, u.side === 'player' ? '#ff5a3c' : '#ffd08a', o.crit ? 16 : 9, { speed: 2.6, life: 0.32 });
  sfx.hit(panOf(at.x));
  if (u.side === 'player') { flashV = Math.max(flashV, 0.35); shake = Math.max(shake, 0.08); }
  if (u.hp <= 0) return kill(u);
  if (!u.lowDone && u.hp < u.maxHp * DATA.rules.lowHp) { u.lowDone = true; trySkill(u, 'low'); }
  trySkill(u, 'hit', { src: o.src });
}
function heal(u, amount) {
  if (!u || !u.alive) return 0;
  const h = Math.min(Math.round(amount), u.maxHp - u.hp); if (h <= 0) return 0;
  u.hp += h; u.refreshTag(); pop(u.head(), `+${h}`, 'heal');
  burst(u.group.position.clone().setY(0.1), '#5be38a', 14, { speed: 0.4, life: 1, gravity: 2.2, spread: 0.5, size: 0.024 });
  return h;
}
function kill(u) {
  u.alive = false; u.stun = 0; u.marked = 0; sfx.down(panOf(u.group.position.x));
  burst(u.chest(), u.def.glow, 18, { speed: 2.4, life: 0.6 });
  if (u.model.saber) tween(0.3, k => u.model.saber.setPower(1 - k));
  const m = u.model;
  tween(0.5, k => { m.body.rotation.x = -1.4 * easeOut(k); }, () => tween(0.7, k => { m.root.position.y = lerp(BASE_Y, HIDDEN_Y, k * k); }, () => u.dim(), 0.25));
  trySkill(u, 'death');
  if (u.side === 'player' && state === 'fight' && !allies.some(a => a && a.alive)) lose();
}

/* --- Tirs --- */
function chooseTarget(u) {
  const opp = opponents(u); if (!opp.length) return null;
  const taunt = opp.filter(o => o.st.taunt > 0); if (taunt.length) return pick(taunt);
  if (u.role === 'sniper') return byHp(opp, 1);
  /* la ligne avant encaisse : poids 6 / 3 / 1,5 / 1 selon la ligne occupée, protecteurs ×2 */
  const rowOf = o => Math.floor(o.cell / DATA.rules.cols), front = Math.min(...opp.map(rowOf));
  const w = opp.map(o => [6, 3, 1.5, 1][Math.min(3, rowOf(o) - front)] * (o.role === 'tank' ? 2 : 1)), total = w.reduce((a, b) => a + b, 0);
  let x = Math.random() * total; for (let i = 0; i < opp.length; i++) { x -= w[i]; if (x <= 0) return opp[i]; } return opp[0];
}
function shoot(u, o = {}) {
  const t = o.target && o.target.alive ? o.target : chooseTarget(u); if (!t) return;
  const from = u.model.muzzle.getWorldPosition(new V3());
  const to = t.chest().add(new V3(rand(-0.08, 0.08), rand(-0.1, 0.15), 0));
  let acc = u.def.accuracy || 0.85; if (buffs[otherSide(u.side)].fumee > 0) acc *= 0.5;
  const miss = !o.sure && Math.random() > acc;
  if (miss) to.add(new V3(pick([-1, 1]) * rand(0.9, 1.4), rand(0.3, 0.9), 0));
  const crit = Math.random() < (u.def.crit || 0) + (o.crit || 0);
  const dmg = (u.def.dmg || 10) * dmgOut(u) * (crit ? 2 : 1) * (o.mult || 1);
  spawnBolt(from, to, { side: u.side, target: t, dmg, miss, crit, bonusVs: u.def.bonusVs, unblockable: o.unblockable, mat: o.mat, big: o.big, stun: o.stun, src: u });
  flashLight.color.set(u.side === 'player' ? '#5ab8ff' : '#ff5040'); flashLight.position.copy(from); flashLight.intensity = 4;
  burst(from, u.side === 'player' ? '#7fd4ff' : '#ff6a4a', 4, { speed: 1.5, life: 0.12, gravity: 0 });
  u.recoilT = 0; sfx.blaster(panOf(from.x), u.side === 'player');
}
/* Une rafale ; « first » modifie le premier tir (capacités « au tir ») */
function volley(u, n, gap = 0.15, o = {}, first = null) {
  for (let i = 0; i < n; i++) later(i * gap, () => { if (u.alive && u.stun <= 0 && state === 'fight') shoot(u, i === 0 && first ? { ...o, ...first } : { ...o }); });
}
function fire(u) { volley(u, u.def.burst || 1, 0.15, {}, trySkill(u, 'shot')); }
function arrive(b) {
  const t = b.target, p = b.m.position;
  if (!b.unblockable && (t.st.evade > 0 || (t.def.dodge && Math.random() < t.def.dodge))) { pop(p, 'Esquive', 'parry'); t.knockT = 0.3; b.target = null; b.miss = true; return; }
  const perfect = t.st.perfect > 0;
  if (!b.unblockable && t.canParry && (perfect || Math.random() < t.def.parade)) {
    if (t.side === 'player') stats.parried++;
    t.swingT = 0; t.swingPose = p.y > t.chest().y + 0.25 ? 2 : (p.x >= t.group.position.x ? 1 : 0);
    sfx.deflect(panOf(p.x)); sfx.humSwing();
    burst(p, '#ffe0b0', 10, { speed: 3.2, life: 0.35 }); burst(p, t.def.glow, 6, { speed: 2, life: 0.3 });
    pop(p, 'Paré', 'parry');
    const opp = opponents(t), r = trySkill(t, 'parry') || {};
    if (opp.length && (r.riposte || perfect || Math.random() < t.def.reflect)) {
      const nt = b.src && b.src.alive && r.riposte ? b.src : pick(opp);
      Object.assign(b, { side: t.side, target: nt, dmg: t.def.reflectDmg * dmgOut(t) * (r.riposte || 1), speed: 12, reflected: true, crit: !!r.riposte, bonusVs: null, stun: 0, src: t });
      b.m.material = BOLT_MAT[r.riposte ? 'gold' : t.side];
      b.dir.copy(nt.chest()).sub(p).normalize();
    } else { b.target = null; b.dir.set(rand(-1, 1), rand(0.6, 1.2), rand(-0.2, 0.5)).normalize(); }
    b.m.quaternion.setFromUnitVectors(UP, b.dir);
  } else { b.dead = true; damage(t, b.dmg, p.clone(), b); }
}
const tmp = new V3();
function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i], p = b.m.position; b.life += dt;
    if (b.target && !b.target.alive) b.target = null;
    if (b.target && (b.reflected || b.homing)) { b.target.chest(tmp); b.dir.lerp(tmp.clone().sub(p).normalize(), Math.min(1, dt * 8)).normalize(); b.m.quaternion.setFromUnitVectors(UP, b.dir); }
    p.addScaledVector(b.dir, b.speed * dt);
    if (b.target && !b.miss && state === 'fight' && p.distanceTo(b.target.chest(tmp)) < (b.target.canParry && !b.unblockable ? 0.6 : 0.42)) arrive(b);
    if (b.dead || b.life > 3.5 || p.y < -0.5 || Math.abs(p.z) > 14) { scene.remove(b.m); bolts.splice(i, 1); }
  }
}

/* --- Comportements automatiques --- */
function medicTick(u) {
  const hurt = mostHurt(team(u.side)); if (!hurt) return;
  beam(u.chest(), hurt.chest(), '#5be38a'); heal(hurt, u.def.heal); if (u.side === 'player') sfx.heal();
  trySkill(u, 'heal');
}

/* --- Corps à corps : les utilisateurs de la Force chargent la ligne avant adverse --- */
const camFx = { at: new V3(), t: 0 };
function camFocus(at, dur = 1.1) { if (reduceMotion) return; camFx.at.copy(at); camFx.t = dur; }
/* Déplacement aller-retour de la figurine vers une cible (charge, bond) */
function dash(u, t, hop, onHit, stay = 0.3) {
  const root = u.model.root, dir = t.group.position.clone().sub(u.group.position), dist = dir.length();
  const off = dir.clone().multiplyScalar(Math.max(0, dist - 0.8) / dist);
  u.busy = true; sfx.swing();
  tween(0.4, k => { if (!u.alive) return; root.rotation.y = Math.atan2(dir.x, dir.z); root.position.set(off.x * easeOut(k), BASE_Y + Math.sin(Math.PI * k) * hop, off.z * easeOut(k)); }, () => {
    if (!u.alive || !t.alive) return back();
    later(onHit() || stay, back);
  });
  function back() {
    const p0 = root.position.clone();
    tween(0.4, k => { if (u.alive) root.position.set(p0.x * (1 - easeOut(k)), BASE_Y + Math.sin(Math.PI * k) * hop * 0.6, p0.z * (1 - easeOut(k))); else { root.position.x = root.position.z = 0; } }, () => { if (u.alive) root.position.set(0, BASE_Y, 0); u.busy = false; });
  }
}
function melee(u) {
  const opp = opponents(u); if (!opp.length) return;
  const rowOf = o => Math.floor(o.cell / DATA.rules.cols), front = Math.min(...opp.map(rowOf));
  const t = opp.filter(o => rowOf(o) === front).sort((a, b) => a.group.position.distanceTo(u.group.position) - b.group.position.distanceTo(u.group.position))[0];
  dash(u, t, 0.8, () => {
    u.swingPose = pick([0, 1, 2]); u.swingT = 0;
    const at = t.chest().lerp(u.chest(), 0.45);
    if (t.role === 'force' && t.canParry && Math.random() < t.def.parade * 0.75) {
      t.swingPose = 2; t.swingT = 0; sfx.deflect(panOf(at.x)); sfx.humSwing();
      burst(at, '#ffffff', 16, { speed: 3.5, life: 0.4 }); burst(at, u.def.glow, 8, { speed: 2.2, life: 0.4 }); burst(at, t.def.glow, 8, { speed: 2.2, life: 0.4 });
      pop(at, 'Duel', 'parry'); shake = Math.max(shake, 0.12); camFocus(at);
      later(0.28, () => {
        if (!u.alive || !t.alive) return;
        u.swingPose = pick([0, 1]); u.swingT = 0; t.swingPose = u.swingPose ? 0 : 1; t.swingT = 0;
        if (Math.random() < 0.5) damage(t, u.def.meleeDmg * dmgOut(u) * 0.7, t.chest(), { src: u }); else { burst(at, '#ffffff', 10, { speed: 3, life: 0.3 }); sfx.deflect(panOf(at.x)); }
      });
      return 0.6;
    }
    damage(t, u.def.meleeDmg * dmgOut(u), t.chest(), { src: u }); t.knockT = 0;
    return 0.3;
  });
}

/* ================================================================
   CAPACITÉS : déclenchement et effets (valables pour les deux camps)
   ================================================================ */
function trySkill(u, trig, ctx = {}, only = null) {
  if (state !== 'fight' || (trig !== 'death' && (!u.alive || u.stun > 0))) return null;
  for (const k of only ? [only] : u.skills) {
    if (k.trig !== trig || u.cd[k.id] > 0 || Math.random() >= k.chance) continue;
    const r = castSkill(u, k, ctx);
    if (r === false) continue;
    u.cd[k.id] = DATA.rules.skillCd; return r || {};
  }
  return null;
}
function castSkill(u, k, ctx) {
  const r = FX[k.fx](u, k, ctx); if (r === false) return false;
  pop(u.head().add(new V3(0, 0.42, 0)), k.name, `skill ${u.side}${k.trig === 'ult' ? ' big' : ''}`);
  if (u.side === 'player') stats.skills++;
  return r;
}
/* Ultimes : tu les lances ; l'adversaire les lance seul quand ils sont chargés */
const ULT_NEED = {
  revive: u => (deadOf(u.side).length ? '' : 'Personne à relever'),
  healAll: u => (team(u.side).some(a => a.hp < a.maxHp) ? '' : 'Personne de blessé'),
  summon: u => (freeCell(u.side) != null && team(u.side).length < DATA.rules.deckUnits ? '' : 'Plateau complet'),
  throw: u => (u.thrown || u.busy ? 'Occupé' : ''),
  shieldTeam: () => '', barrier: () => '', rage: () => '', haste: () => '', fortress: () => '',
};
function ultBlock(u) {
  if (!u.ult) return 'none';
  if (!u.alive) return 'Hors combat';
  if (state !== 'fight' || !u.ready) return 'wait';
  if (u.stun > 0) return 'Étourdi';
  if (u.charge < 1) return 'charge';
  const need = ULT_NEED[u.ult.fx];
  return need ? need(u) : opponents(u).length ? '' : 'Aucune cible';
}
function castUlt(u) {
  if (ultBlock(u)) { if (u.side === 'player') sfx.deny(); return false; }
  u.charge = 0; if (u.side === 'player') stats.ults++;
  sfx.power(); camFocus(u.chest(), 0.8);
  shockRing(u.group.position, u.ult.color, 2.4, 0.7); burst(u.chest(), u.ult.color, 26, { speed: 2.4, life: 0.8, gravity: -1 });
  castSkill(u, u.ult, {});
  return true;
}
function domesOn(sd, key, color) {
  for (let i = domes.length - 1; i >= 0; i--) if (domes[i].key === key && domes[i].side === sd) { scene.remove(domes[i].m); domes.splice(i, 1); }
  team(sd).forEach(a => { const m = new THREE.Mesh(domeGeo, additive(color, 1, { opacity: 0 })); m.position.copy(a.group.position).setY(0.05); m.scale.set(1, 1.6, 1); scene.add(m); domes.push({ m, key, side: sd }); });
}
const freeCell = sd => (sd === 'player'
  ? firstFreeCell(allies, i => !allies[i] || !allies[i].alive)
  : firstFreeCell(null, i => { const f = foes.find(x => x.cell === i); return !f || !f.alive; }));
/* Fait entrer un personnage sur une case (renforts, réanimation) */
function respawn(sd, cell, id, ratio, lvl) {
  const u = new Unit(id, sd, cell, lvl, false);
  if (sd === 'player') { if (allies[cell]) allies[cell].dispose(); allies[cell] = u; }
  else { const old = foes.find(x => x.cell === cell); if (old) { old.dispose(); foes[foes.indexOf(old)] = u; } else foes.push(u); }
  u.hp = Math.round(u.maxHp * ratio); u.refreshTag();
  const dz = sd === 'player' ? 4 : -4, tz = u.group.position.z; u.group.position.z = tz + dz;
  tween(0.5, k => { u.group.position.z = lerp(tz + dz, tz, easeOut(k)); u.group.position.y = Math.sin(Math.PI * k) * 0.5; });
  emerge(u, 0.5);
  return u;
}
function explode(at, color, size) {
  sfx.boom(); shake = Math.max(shake, 0.25);
  flashLight.color.set(color); flashLight.position.copy(at); flashLight.intensity = 9;
  burst(at, color, 36, { speed: 5, life: 0.6, gravity: -4 }); burst(at, '#fff0c0', 14, { speed: 3, life: 0.35 });
  shockRing(at, color, size, 0.5);
}
const near = (list, at, n) => [...list].sort((a, b) => a.group.position.distanceTo(at) - b.group.position.distanceTo(at)).slice(0, n);
const hitList = (u, list, amount, o = {}, gap = 0.05, delay = 0.2) => list.forEach((t, i) => later(delay + i * gap, () => { if (t.alive) { if (o.stun) t.stun = Math.max(t.stun, o.stun); t.knockT = 0; damage(t, amount * dmgOut(u), t.chest(), { src: u }); } }));
function throwGrenade(u, main, k) {
  const g = new THREE.Group();
  part(new THREE.SphereGeometry(0.09, 16, 12), M(0x2a2f36, { metalness: 0.8, roughness: 0.3 }), g);
  part(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: hdr('#ff5a3a', 3) }), g, 0, 0.06, 0.06);
  const from = u.chest(), to = main.chest(); scene.add(g); sfx.whoosh();
  tween(0.75, kk => { g.position.lerpVectors(from, to, kk); g.position.y += Math.sin(Math.PI * kk) * 2; g.rotation.x = kk * 12; }, () => {
    scene.remove(g); explode(to, k.color, k.big ? 3.2 : 2);
    if (main.alive) damage(main, k.damage * dmgOut(u), to, { src: u });
    opponents(u).filter(t => t !== main && t.group.position.distanceTo(main.group.position) < 1.9).forEach(t => damage(t, k.splash * dmgOut(u), t.chest(), { src: u }));
  });
}
function smokeOn(list, dur) {
  list.forEach(f => { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9aa4b4, transparent: true, opacity: 0, depthWrite: false })); m.position.copy(f.group.position).add(new V3(rand(-0.6, 0.6), rand(0.3, 1.2), rand(-0.5, 0.5))); addTemp(m, dur, (kk, o) => { o.material.opacity = 0.24 * Math.sin(Math.PI * kk); o.scale.setScalar(1 + kk * 0.8); }); } });
}
const aura = (u, color, n = 14) => burst(u.chest(), color, n, { speed: 1.8, life: 0.7, gravity: 1.2 });
const caster = u => { if (u.role === 'force') { u.swingPose = 2; u.swingT = 0; } };
const FX = {
  /* modificateurs du tir en cours */
  pierce: (u, k) => ({ mult: k.mult, unblockable: true, mat: 'gold', big: true }),
  critShot: () => ({ sure: true, crit: 1 }),
  stunShot: (u, k) => ({ stun: k.stun }),
  riposte: (u, k) => ({ riposte: k.mult }),
  extraShot(u, k) { if (!u.gun) return false; later(0.3, () => volley(u, k.n, 0.12)); },
  /* attaques */
  grenade(u, k) { const opp = opponents(u); if (!opp.length) return false; throwGrenade(u, k.big ? byHp(opp) : chooseTarget(u), k); },
  charges(u, k) {
    const list = opponents(u); if (!list.length) return false;
    list.forEach(t => { const m = new THREE.Mesh(sparkGeo, additive('#ff3a2a', 3, { opacity: 1 })); m.scale.setScalar(0.06); m.position.copy(t.group.position).setY(0.1); addTemp(m, 1.2, (kk, o) => { o.material.opacity = Math.sin(kk * 40) > 0 ? 1 : 0.1; }); });
    sfx.beep(); later(1.2, () => list.forEach(t => { if (t.alive) { explode(t.group.position.clone().setY(0.4), k.color, 1.6); damage(t, k.damage * dmgOut(u), t.chest(), { src: u }); } }));
  },
  push(u, k) {
    const list = opponents(u); if (!list.length) return false;
    caster(u); sfx.push(); shake = Math.max(shake, 0.15 + k.rings * 0.05);
    for (let r = 0; r < k.rings; r++) shockRing(u.group.position, k.color, 7.5, 0.65, r * 0.12);
    hitList(u, list, k.damage, { stun: k.stun }, 0.04);
  },
  lightning(u, k, c, all) {
    const list = all ? opponents(u) : shuffle(opponents(u)).slice(0, k.n); if (!list.length) return false;
    caster(u); sfx.zap(); flashV = Math.max(flashV, 0.1);
    const from = u.chest().add(new V3(0, 0.2, 0));
    list.forEach((t, i) => later(i * 0.08, () => { if (!t.alive) return; for (let j = 0; j < 3; j++) zigzag(from, t.chest(), k.color, 0.5); t.knockT = 0; damage(t, k.damage * dmgOut(u), t.chest(), { src: u }); }));
  },
  lightningAll: (u, k) => FX.lightning(u, k, null, true),
  grip(u, k) {
    const t = byHp(opponents(u)); if (!t) return false;
    caster(u); sfx.push(); t.stun = Math.max(t.stun, k.stun); const root = t.model.root;
    burst(t.chest(), k.color, 16, { speed: 1, life: 1, gravity: 0, spread: 0.3 });
    tween(k.stun, kk => { if (t.alive) root.position.y = BASE_Y + 0.6 * (kk < 0.15 ? kk / 0.15 : kk > 0.85 ? (1 - kk) / 0.15 : 1); });
    later(0.3, () => damage(t, k.damage * dmgOut(u), t.chest(), { src: u }));
  },
  drain(u, k, c) {
    const t = c.src && c.src.alive && c.src.side !== u.side ? c.src : byHp(opponents(u)); if (!t) return false;
    sfx.zap(); beam(t.chest(), u.chest(), k.color, 0.8);
    later(0.3, () => { damage(t, k.damage * dmgOut(u), t.chest(), { src: u }); heal(u, k.damage); });
  },
  drainAll(u, k) {
    const list = opponents(u); if (!list.length) return false;
    caster(u); sfx.zap();
    list.forEach(t => beam(t.chest(), u.chest(), k.color, 0.8));
    later(0.35, () => { list.forEach(t => damage(t, k.damage * dmgOut(u), t.chest(), { src: u })); const mates = team(u.side), share = (k.damage * list.length) / 2 / Math.max(1, mates.length); mates.forEach(a => heal(a, share)); });
  },
  stunAll(u, k) {
    const list = opponents(u); if (!list.length) return false;
    caster(u); sfx.push(); shockRing(u.group.position, k.color, 7, 0.9);
    list.forEach(t => { t.stun = Math.max(t.stun, k.stun); burst(t.head(), k.color, 12, { speed: 1, life: 0.8, gravity: 1 }); damage(t, k.damage * dmgOut(u), t.chest(), { src: u }); });
  },
  leap(u, k) {
    const t = byHp(opponents(u), 1); if (!t || u.busy || u.thrown) return false;
    dash(u, t, 2.2, () => { u.swingPose = 2; u.swingT = 0; sfx.deflect(panOf(t.group.position.x)); shake = 0.2; damage(t, k.damage * dmgOut(u), t.chest(), { crit: true, src: u }); shockRing(t.group.position, k.color, 1.6, 0.4); return 0.3; });
  },
  throw(u, k) {
    if (!u.model.saber || u.thrown || u.busy) return false;
    const targets = opponents(u).sort((a, b) => a.cell - b.cell).slice(0, 5).sort((a, b) => a.group.position.x - b.group.position.x); if (!targets.length) return false;
    const fly = new THREE.Group(), spin = new THREE.Group(), sab = buildSaber(u.def.look.saber, false); fly.add(spin);
    sab.group.rotation.z = Math.PI / 2; sab.group.position.x = 0.39; spin.add(sab.group); scene.add(fly); sab.setPower(1);
    u.thrown = true; u.model.saber.setHidden(true);
    const start = u.model.hand.getWorldPosition(new V3());
    const curve = new THREE.CatmullRomCurve3([start, ...targets.map(t => t.chest().add(new V3(0, 0.1, 0))), start.clone()]);
    const n = targets.length + 1, dur = 0.42 * n; let next = 1, last = 0;
    sfx.swing();
    tween(dur, kk => {
      curve.getPoint(kk, fly.position); spin.rotation.y = -kk * dur * 24;
      if (kk - last > 0.16 / dur) { sfx.whoosh(); last = kk; }
      while (next < n && kk * n >= next) { const t = targets[next - 1]; if (t.alive) damage(t, k.damage * dmgOut(u), fly.position.clone(), { src: u }); next++; }
    }, () => {
      scene.remove(fly); u.thrown = false;
      if (u.alive) { u.model.saber.setHidden(false); u.model.saber.setPower(1); sfx.humSwing(); }
    });
  },
  orbital(u, k) {
    const list = opponents(u); if (!list.length) return false; sfx.zap();
    list.forEach((t, i) => { for (let j = 0; j < 3; j++) later(i * 0.15 + j * 0.12, () => spawnBolt(t.chest().add(new V3(rand(-0.6, 0.6), 10, rand(-0.6, 0.6))), t.group.position.clone().setY(0.2), { side: u.side, mat: 'gold', speed: 22, big: true })); });
    later(0.6, () => list.forEach(t => { if (t.alive) { explode(t.group.position.clone().setY(0.3), k.color, 2.4); damage(t, k.damage * dmgOut(u), t.chest(), { src: u }); } }));
  },
  execute(u, k) { const t = byHp(opponents(u)); if (!t || !u.gun) return false; shoot(u, { target: t, mult: k.mult, sure: true, unblockable: true, mat: 'gold', big: true }); },
  retaliate(u, k, c) { if (!u.gun || !c.src || !c.src.alive || c.src.side === u.side) return false; later(0.15, () => shoot(u, { target: c.src, mult: k.mult, sure: true })); },
  bounty(u, k) { const t = byHp(opponents(u)); if (!t) return false; t.marked = k.duration; sfx.beep(); if (u.gun) volley(u, k.n, 0.15, { target: t }); },
  mark(u, k) { const t = byHp(opponents(u)); if (!t) return false; t.marked = k.duration; sfx.beep(); },
  deathBlast(u, k) {
    const at = u.group.position.clone().setY(0.5), list = near(opponents(u), at, 3); if (!list.length) return false;
    explode(at, k.color, 2.6); list.forEach(t => damage(t, k.damage * dmgOut(u), t.chest(), { src: u }));
  },
  volleyAll(u, k) {
    const g = team(u.side).filter(a => a.gun); if (!g.length || !opponents(u).length) return false;
    g.forEach((a, i) => later(i * 0.05, () => volley(a, k.n, 0.13, { crit: k.crit || 0 })));
  },
  /* soutien */
  smoke(u, k) { const list = opponents(u); if (!list.length) return false; buffs[u.side].fumee = k.duration; smokeOn(list, k.duration); sfx.whoosh(); },
  haste(u, k) { buffs[u.side].stim = k.duration; sfx.power(); team(u.side).filter(a => a.gun).forEach(a => aura(a, k.color, 10)); },
  rage(u, k) { buffs[u.side].rage = k.duration; buffs[u.side].rageBonus = k.bonus / 100; sfx.power(); team(u.side).forEach(a => aura(a, k.color)); },
  shieldTeam(u, k) { buffs[u.side].bouclier = k.duration; sfx.power(); domesOn(u.side, 'bouclier', k.color); },
  barrier(u, k) { buffs[u.side].barriere = k.duration; sfx.power(); caster(u); domesOn(u.side, 'barriere', k.color); },
  healSelf(u, k) { if (u.hp >= u.maxHp) return false; heal(u, k.heal); shockRing(u.group.position, k.color, 1.1, 0.7); if (u.side === 'player') sfx.heal(); },
  healMost(u, k) { const t = mostHurt(team(u.side)); if (!t) return false; beam(u.chest(), t.chest(), k.color); heal(t, k.heal); },
  healAll(u, k) { const list = team(u.side); if (!list.some(a => a.hp < a.maxHp)) return false; caster(u); sfx.heal(); shockRing(u.group.position, k.color, 3, 0.8); list.forEach(a => heal(a, k.heal)); },
  invulnMost(u, k) { const t = mostHurt(team(u.side)); if (!t) return false; t.st.invuln = k.duration; beam(u.chest(), t.chest(), k.color); aura(t, k.color); },
  revive(u, k) {
    const dead = deadOf(u.side)[0]; if (!dead) return false;
    sfx.rise(); lightColumn(dead.group.position, '#bfe9ff');
    later(0.4, () => { const r = respawn(u.side, dead.cell, dead.id, k.pct / 100, dead.lvl); pop(r.head(), 'Relevé', 'buff'); });
  },
  summon(u, k) {
    const cell = freeCell(u.side); if (cell == null || team(u.side).length >= DATA.rules.deckUnits) return false;
    const id = SUMMON[u.def.side]; respawn(u.side, cell, id, 1, u.side === 'player' ? levelOf(id) || 1 : mission.lvl);
  },
  /* sur soi */
  hasteSelf(u, k) { u.st.haste = k.duration; aura(u, k.color); },
  guardSelf(u, k) { u.st.guard = k.duration; aura(u, k.color, 10); },
  invulnSelf(u, k) { u.st.invuln = k.duration; aura(u, k.color, 18); },
  evadeSelf(u, k) { u.st.evade = k.duration; aura(u, k.color, 10); },
  perfectSelf(u, k) { if (!u.model.saber) return false; u.st.perfect = k.duration; aura(u, k.color); },
  rageSelf(u, k) { u.st.rage = k.duration; if (u.model.saber) u.st.perfect = k.duration; aura(u, k.color, 20); },
  taunt(u, k) { u.st.taunt = k.duration; shockRing(u.group.position, k.color, 2, 0.6); sfx.beep(); },
  fortress(u, k) { u.st.taunt = u.st.invuln = k.duration; shockRing(u.group.position, k.color, 2.4, 0.7); aura(u, k.color, 22); },
};
const markRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 32), new THREE.MeshBasicMaterial({ color: hdr('#ffb347', 2.5) }));
markRing.rotation.x = Math.PI / 2; markRing.visible = false; scene.add(markRing);
/* ================================================================
   HUD DE COMBAT : barre des ultimes
   ================================================================ */
const svgIcon = key => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key].map(d => `<path d="${d}"/>`).join('')}</svg>`;
const ultEl = $('#ults');
let ultUnits = [];
function renderUlts() {
  ultEl.innerHTML = '';
  ultUnits = allies.filter(a => a && a.ult);
  $('#ultHint').textContent = ultUnits.length
    ? 'Touche un personnage chargé (ou son bouton) pour lancer son ultime.'
    : `Aucun ultime dans ton escouade : ils se débloquent au niveau ${DATA.rules.unlock[2]} des cartes. Tes personnages se battent seuls avec leurs capacités.`;
  ultUnits.forEach((u, i) => {
    const k = u.ult, b = document.createElement('button');
    b.type = 'button'; b.className = 'ultb'; b.style.setProperty('--c', k.color);
    b.setAttribute('aria-label', `${k.name} de ${u.def.name} : ${skillText(k)}`);
    b.innerHTML = `<span class="uimg"><img alt="" src="${cardImg(u.id, u.lvl)}"></span><span class="ufill"></span>${svgIcon(k.art)}<span class="uname"></span><span class="uwho"></span><span class="ureq"></span><kbd>${i + 1}</kbd>`;
    b.querySelector('.uname').textContent = k.name; b.querySelector('.uwho').textContent = u.def.name;
    b.addEventListener('click', () => castUlt(u));
    ultEl.append(b); u.ultBtn = b;
  });
}
addEventListener('keydown', e => { if (screen !== 'battle') return; const u = ultUnits[Number(e.key) - 1]; if (u) castUlt(u); });
/* Toucher une figurine sur le plateau lance son ultime */
function tapUnit(x, y) {
  let best = null, bd = 70;
  aliveAllies().filter(a => a.ult).forEach(a => { const [sx, sy] = toScreen(a.chest()), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = a; } });
  if (best) castUlt(best);
}
function updateWaveLabel() {
  if (!mission) return;
  $('#waveLabel').textContent = `${DATA.campaign[mission.pi].name} ${mission.i} · Vague ${waveIdx + 1} / ${mission.waves[side].length}`;
  const left = foes.filter(f => f.alive).length;
  $('#foesLabel').textContent = left ? `${left} ennemi${left > 1 ? 's' : ''} sur le plateau` : 'Vague repoussée';
}
const bannerEl = $('#banner');
function showBanner(text) { bannerEl.textContent = text; bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show'); }
const proj = new V3();
function toScreen(v) { proj.copy(v).project(camera); return [(proj.x * 0.5 + 0.5) * W, (-proj.y * 0.5 + 0.5) * H, proj.z < 1]; }
function pop(world, text, cls) {
  const [x, y] = toScreen(world), el = document.createElement('div');
  el.className = `pop ${cls}`; el.textContent = text; el.style.left = `${x}px`; el.style.top = `${y}px`;
  labels.append(el); setTimeout(() => el.remove(), cls.includes('skill') ? 1400 : 1000);
}
let lastFoeCount = -1, lastBuffKey = '';
function updateHud() {
  units().forEach(u => {
    const show = u.ready && u.alive && screen === 'battle';
    u.tag.style.opacity = show ? 1 : 0; if (!show) return;
    const [x, y, front] = toScreen(u.head()); if (front) u.tag.style.transform = `translate(${x}px,${y}px)`;
    if (u.ubar) { u.ubar.style.transform = `scaleX(${u.charge})`; u.tag.classList.toggle('uready', u.charge >= 1); }
  });
  $('#flash').style.opacity = flashV;
  if (screen !== 'battle') return;
  ultUnits.forEach(u => {
    const r = ultBlock(u), b = u.ultBtn;
    b.classList.toggle('ready', !r); b.classList.toggle('dead', !u.alive);
    b.querySelector('.ufill').style.transform = `scaleY(${u.alive ? u.charge : 0})`;
    const msg = r && !['wait', 'charge', 'none'].includes(r) ? r : r === 'charge' ? `${Math.floor(u.charge * 100)} %` : '';
    const req = b.querySelector('.ureq'); if (req.textContent !== msg) req.textContent = msg;
  });
  const active = ['player', 'foe'].flatMap(sd => BUFF_KEYS.filter(k => buffs[sd][k] > 0).map(k => [sd, k]));
  const keyb = active.map(([sd, k]) => `${sd}${k}${fmt(buffs[sd][k])}`).join();
  if (keyb !== lastBuffKey) { lastBuffKey = keyb; $('#buffs').innerHTML = active.map(([sd, k]) => `<div class="chip ${sd}" style="--c:${BUFF_INFO[k][1]}"><span>${sd === 'foe' ? 'Ennemi · ' : ''}${BUFF_INFO[k][0]}</span><b>${fmt(buffs[sd][k])} s</b></div>`).join(''); }
  const n = foes.filter(f => f.alive).length; if (n !== lastFoeCount) { lastFoeCount = n; updateWaveLabel(); }
}
