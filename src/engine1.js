/* ================================================================
   OUTILS
   ================================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const V3 = THREE.Vector3;
const { clamp, lerp } = THREE.MathUtils;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const envelope = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : t < a + d ? 1 - (t - a) / d : 0);
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => n.toFixed(1).replace('.', ',');
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
const pct = v => `${Math.round(v * 100)} %`;
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hpick = (id, salt, arr) => arr[hashStr(id + salt) % arr.length];
const hchance = (id, salt, p) => (hashStr(id + salt) % 1000) / 1000 < p;
const seeded = seed => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

/* ================================================================
   CATALOGUE : stats calculées par rôle et rareté, apparence par faction
   ================================================================ */
const SKINS = [0xd6a079, 0xa8754f, 0x8a5a3a, 0xf0c8a0, 0x6a4028, 0xc89070];
const HAIRS = [0x3b2618, 0x1d140d, 0xc89a5a, 0xd8d8d8, 0x7a3a1a, 0x0d0a0b, 0x5a3a20];
const LOOKS = {
  jedi: id => ({ robe: hpick(id, 'r', [0x74512f, 0x5a4630, 0x8a6a48, 0x6b5a48, 0x4a3a2a, 0x9a8a72]), tunic: hpick(id, 't', [0xdcc69c, 0xc9b48a, 0xe8d8b8, 0xb8a888]), hair: hpick(id, 'h', HAIRS), skin: hpick(id, 's', SKINS), saber: hpick(id, 'b', ['#4cc3ff', '#5be38a', '#4cc3ff', '#3cffd0']), hood: hchance(id, 'o', 0.2) }),
  sith: id => ({ robe: hpick(id, 'r', [0x1c1216, 0x2a1418, 0x161618, 0x3a1c22]), tunic: hpick(id, 't', [0x3a1c22, 0x2a2a30, 0x1a1a1e, 0x4a2026]), hair: hpick(id, 'h', [0x0d0a0b, 0x1d140d, 0x7a7a7a, 0xd8d8d8]), skin: hpick(id, 's', [0xb8aaa4, 0xd6a079, 0x8a6a5a, 0xc8b0a0, 0x9a3a3a]), saber: '#ff2a2a', hood: hchance(id, 'o', 0.5) }),
  rebellion: (id, role) => ({ armor: hpick(id, 'a', [0x6b6a4a, 0x4f5a3c, 0x5a5240, 0x6a5a44]), plate: hpick(id, 'p', [0x8c8660, 0x6c7a50, 0x9a8a68]), under: hpick(id, 'u', [0x3b3d33, 0x2b3024, 0x3a3630]), skin: hpick(id, 's', SKINS), hair: hpick(id, 'h', HAIRS), helmet: role === 'leader' || role === 'medic' ? 'none' : 'open', cape: role === 'leader' ? 0x5a4a3a : null }),
  empire: (id, role) => ({ armor: hpick(id, 'a', [0x47505c, 0x3a3f48, 0x2a2e34, 0x5b6878]), plate: hpick(id, 'p', [0x6d7684, 0x8794a4, 0x4a525e]), under: 0x1b1e24, skin: hpick(id, 's', SKINS), hair: hpick(id, 'h', HAIRS), helmet: role === 'leader' || role === 'medic' ? 'cap' : 'full', visor: '#ff3b30', cape: role === 'leader' ? 0x22262c : null }),
  pegre: id => ({ armor: hpick(id, 'a', [0x5a3a24, 0x4a2a3a, 0x3a2a1a, 0x6a4a2a, 0x2a3a4a]), plate: hpick(id, 'p', [0xe8e2d6, 0xc8b8a8, 0x9a8a7a, 0xd8c8b0]), under: hpick(id, 'u', [0x22252c, 0x2a1e1a, 0x1e2a2a]), skin: hpick(id, 's', SKINS), hair: hpick(id, 'h', HAIRS), helmet: 'none' }),
  chasseurs: id => ({ armor: hpick(id, 'a', [0x6a5a3a, 0x4a5a5a, 0x5a3a3a, 0x3a4a3a, 0x7a6a4a]), plate: hpick(id, 'p', [0x9a8a6a, 0x7a8a8a, 0xa07a5a, 0x8a9a7a]), under: 0x24221e, skin: hpick(id, 's', SKINS), hair: hpick(id, 'h', HAIRS), helmet: hchance(id, 'm', 0.65) ? 'full' : 'none', visor: hpick(id, 'v', ['#ffb347', '#7fd4ff', '#ff6a3a', '#b0ff6a']), cape: hchance(id, 'c', 0.35) ? hpick(id, 'k', [0x4a3a2a, 0x3a2a22, 0x5a4a3a]) : null }),
  droides: id => ({ armor: hpick(id, 'a', [0x8a8f96, 0x6a6f76, 0xb0a080, 0x5a5f66, 0xc8ccd2]), plate: hpick(id, 'p', [0xc0c4ca, 0x9aa0a8, 0xd8c8a0]), under: 0x2a2e34, helmet: 'full', droid: true, visor: hpick(id, 'v', ['#ffd23b', '#ff3b30', '#7ff4ff', '#9cff6a']), shell: hpick(id, 'sh', [0xd9dee6, 0xe8e0c8, 0xb8c0c8]), trim: hpick(id, 'tr', [0x2f8f66, 0x2f5f8f, 0x8f2f3a, 0xc8a040]) }),
};
function makeUnitDef(id, no, faction, [, name, title, rarity, role, mods, bio]) {
  const F = DATA.factions[faction], R = DATA.roles[role], r = RANKS.indexOf(rarity), m = DATA.rankMult[r];
  const d = { id, no, type: 'unit', name, title, rarity, role, faction, side: F.side, bio };
  ['hp', 'dmg', 'heal', 'reflectDmg'].forEach(k => { if (R[k] != null) d[k] = Math.round(R[k] * m); });
  ['rate', 'accuracy', 'every'].forEach(k => { if (R[k] != null) d[k] = R[k]; });
  if (R.parade != null) { d.parade = Math.min(0.82, R.parade + 0.04 * r); d.reflect = Math.min(0.88, R.reflect + 0.04 * r + (mods.reflect || 0)); }
  if (R.armor) d.armor = +(R.armor + 0.03 * r).toFixed(2);
  if (R.aura || mods.aura) d.aura = +((R.aura || 0.1) + 0.03 * r).toFixed(2);
  if (mods.hp) d.hp = Math.round(d.hp * mods.hp);
  if (mods.burst) { d.burst = mods.burst; d.dmg = Math.max(3, Math.round(d.dmg * (mods.burst === 2 ? 0.6 : 0.45))); }
  if (mods.crit) d.crit = mods.crit;
  if (mods.bonusVs) d.bonusVs = mods.bonusVs;
  /* espèce : choix explicite, sinon tirage stable dans la réserve de la faction (les protecteurs penchent vers les colosses) */
  const pool = SPECIES_POOL[faction];
  d.species = faction === 'droides' ? null : mods.species || (role === 'tank' && faction !== 'empire' ? hpick(id, 'sp', ['golemite', 'ursaan', 'drakkari']) : pool ? hpick(id, 'sp', pool) : 'humain');
  const S = d.species && SPECIES[d.species], sm = S ? S.mods : {};
  if (sm.hp) d.hp = Math.round(d.hp * sm.hp);
  if (sm.accuracy && d.accuracy) d.accuracy = Math.min(0.98, d.accuracy + sm.accuracy);
  if (sm.parade && d.parade) d.parade = Math.min(0.86, d.parade + sm.parade);
  if (sm.armor) d.armor = +((d.armor || 0) + sm.armor).toFixed(2);
  if (sm.crit) d.crit = +((d.crit || 0) + sm.crit).toFixed(2);
  if (sm.slow && d.rate) d.rate = d.rate.map(v => +(v * sm.slow).toFixed(2));
  ['dmgBonus', 'regen', 'dodge'].forEach(k => { if (sm[k]) d[k] = sm[k]; });
  const look = { ...LOOKS[faction](id, role) };
  if (S) { look.skin = hpick(id, 'sk', S.skins); look.species = d.species; }
  ['saber', 'hood', 'visor', 'heavy', 'pistol'].forEach(k => { if (mods[k] != null) look[k] = mods[k]; });
  if (role === 'sniper') look.rifle = 'long';
  if (role === 'tank') { if (look.heavy == null) look.heavy = true; look.backpack = true; }
  if (role === 'medic' && faction !== 'droides') look.cross = true;
  if (role === 'medic') look.unarmed = true;
  d.look = look;
  d.model = mods.model || (role === 'force' ? 'jedi' : faction === 'droides' && role === 'medic' ? 'droid' : 'soldier');
  d.glow = role === 'force' ? look.saber : look.helmet === 'full' && look.visor ? look.visor : F.glow;
  return d;
}
/* Capacités : réserve du rôle (et du camp pour la Force), décalée d'un personnage à l'autre
   pour que chacun ait sa combinaison ; les signatures (mods.sk) priment. */
function assignSkills(ids) {
  const groups = {};
  ids.forEach(id => {
    const d = CARDS[id], P = SKILL_POOLS;
    const base = d.role === 'force' ? (d.side === 'dark' ? P.forceDark : P.forceLight) : P[d.role];
    const pools = [0, 1, 2].map(i => (d.faction === 'droides' && P.droid[i]) || (['pegre', 'chasseurs'].includes(d.faction) && P.outlaw[i] && d.role !== 'medic' && d.role !== 'tank' && d.role !== 'sniper' ? P.outlaw[i] : null) || (d.side === 'dark' && d.role === 'leader' && i === 2 ? [...base[2], ...P.dark[2]] : base[i]));
    const key = pools.map(p => p.join()).join('|'), n = (groups[key] = (groups[key] || 0) + 1) - 1;
    const auto = [pools[0][n % pools[0].length], pools[1][(n + Math.floor(n / pools[0].length)) % pools[1].length], pools[2][hashStr(id) % pools[2].length]];
    if (d.pulse) auto[0] = d.pulse === 'heal' ? 'aura-soin' : 'onde';
    d.skills = auto.map((k, i) => (d.mods.sk && d.mods.sk[i]) || k);
  });
}
const CARDS = {};
let serial = 0;
Object.entries(ROSTER).forEach(([faction, rows]) => rows.forEach(row => { serial++; CARDS[row[0]] = { ...makeUnitDef(row[0], serial, faction, row), mods: row[5], pulse: row[5].pulse }; }));
const UNIT_IDS = Object.keys(CARDS);
assignSkills(UNIT_IDS);
const cardNo = d => `${String(d.no).padStart(3, '0')}/${UNIT_IDS.length}`;

const SCALED = ['hp', 'dmg', 'heal', 'reflectDmg'], SKILL_SCALED = ['damage', 'splash', 'heal'];
/* Une capacité à la puissance de sa carte : rareté × niveau */
function scaleSkill(key, rank, lvl) {
  const S = SKILLS[key], k = DATA.rankMult[rank] * (1 + DATA.rules.levelBonus * (lvl - 1)), s = { ...S, id: key };
  SKILL_SCALED.forEach(f => { if (typeof S[f] === 'number') s[f] = Math.round(S[f] * k); });
  return s;
}
function scaleDef(id, lvl = 1, boss = false) {
  const base = CARDS[id], k = 1 + DATA.rules.levelBonus * (lvl - 1), d = { ...base, lvl }, rank = RANKS.indexOf(base.rarity);
  SCALED.forEach(key => { if (typeof base[key] === 'number') d[key] = Math.round(base[key] * k); });
  if (boss) { d.hp = Math.round(d.hp * DATA.rules.bossHp); d.boss = true; }
  /* les chefs maîtrisent toutes leurs capacités */
  d.skills = base.skills.map((key, i) => ({ ...scaleSkill(key, rank, lvl), unlock: DATA.rules.unlock[i], locked: !boss && lvl < DATA.rules.unlock[i] }));
  return d;
}
const TRIG = { shot: 'À chaque tir', parry: 'Quand il pare un tir', hit: 'Quand il est touché', low: 'Sous 35 % de PV (une fois)', death: 'À sa chute', heal: 'Quand il soigne' };
const TRIG_SHORT = { shot: 'au tir', parry: 'en parant', hit: 'touché', low: 'PV bas', death: 'à sa chute', heal: 'en soignant' };
const skillText = s => s.text.replace(/\{(\w+)\}/g, (_, k) => String(s[k]).replace('.', ','));
const chanceTxt = s => (s.chance >= 1 ? '' : `${pct(s.chance)} de chances : `);
function skillLine(s) {
  if (s.trig === 'ult') return `Ultime, chargé en ${s.charge} s : ${skillText(s)}`;
  const when = s.trig === 'tick' ? `Toutes les ${s.every} s` : TRIG[s.trig];
  return `${when}, ${chanceTxt(s).toLowerCase()}${skillText(s)}`;
}
const skillShort = s => (s.trig === 'ult' ? 'ULTIME' : `${s.chance < 1 ? `${pct(s.chance)} · ` : ''}${s.trig === 'tick' ? `toutes les ${s.every} s` : TRIG_SHORT[s.trig]}`);
function unitRules(d) {
  const p = [];
  if (d.role === 'tank') p.push(`Attire les tirs et encaisse ${pct(d.armor)} de dégâts en moins.`);
  if (d.role === 'force') p.push(`Pare ${pct(d.parade)} des tirs et en renvoie ${pct(d.reflect)}.`);
  if (['shooter', 'tank', 'leader'].includes(d.role)) p.push(d.burst > 1 ? `Rafales de ${d.burst} × ${d.dmg} dégâts.` : `Tire ${d.dmg} dégâts.`);
  if (d.role === 'sniper') p.push(`Tir lent de ${d.dmg} dégâts sur l'ennemi le plus faible.`);
  if (d.role === 'medic') p.push(`Soigne l'allié le plus blessé de ${d.heal} PV toutes les ${d.every} s.`);
  if (d.aura) p.push(`Ses alliés font +${pct(d.aura)} de dégâts.`);
  if (d.crit) p.push(`${pct(d.crit)} de coups critiques.`);
  if (d.bonusVs) p.push('+60 % de dégâts contre la Force.');
  return p.join(' ');
}
/* Composition : 16 cases (4 × 4), ligne 0 = ligne avant. Placement auto selon le rôle. */
const CELLS = DATA.rules.cols * DATA.rules.rows;
const COL_ORDER = [1, 2, 0, 3];
const ROLE_ROW = { tank: 0, force: 0, leader: 1, shooter: 1, medic: 2, sniper: 3 };
const cellOrder = row => COL_ORDER.map(c => row * DATA.rules.cols + c);
function autoFormation(ids) {
  const board = Array(CELLS).fill(null);
  [...ids].filter(Boolean).sort((a, b) => ROLE_ROW[CARDS[a].role] - ROLE_ROW[CARDS[b].role]).forEach(id => {
    const want = ROLE_ROW[CARDS[id].role];
    const order = [want, ...[0, 1, 2, 3].filter(r => r !== want).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))].flatMap(cellOrder);
    const free = order.find(i => !board[i]); if (free != null) board[free] = id;
  });
  return board;
}
const boardUnits = board => board.filter(Boolean);
const firstFreeCell = (board, isFree = i => !board[i]) => [0, 1, 2, 3].flatMap(cellOrder).find(isFree);
const describe = d => unitRules(d);

/* ================================================================
   CAMPAGNE : missions générées à partir des données de chaque planète
   ================================================================ */
const MISSIONS = [], MISSIONS_BY_ID = {};
const missionPool = (P, i, side) => P.pools[side].slice(0, i <= 6 ? 1 : i <= 13 ? 2 : 3).flat();
function buildWaves(P, M, i, side, chef) {
  const rnd = seeded(hashStr(`${P.id}${i}${side}`) % 233280);
  const nW = i <= 3 ? 1 : i <= 10 ? 2 : 3, size = Math.min(8, 2 + Math.ceil(i / 3));
  const pool = missionPool(P, i, side), focus = (M.focus && M.focus[side]) || [];
  return Array.from({ length: nW }, (_, w) => {
    const list = Array.from({ length: Math.max(3, size - (nW - 1 - w)) }, () => pool[Math.floor(rnd() * pool.length)]);
    focus.forEach((id, k) => { if (k < list.length) list[k] = id; });
    if (chef >= 0 && w === nW - 1) list[0] = `${P.chefs[side][chef]}!`;
    return list;
  });
}
DATA.campaign.forEach((P, pi) => {
  P.index = pi; P.list = [];
  (P.missions || []).forEach((M, mi) => {
    const i = mi + 1, chef = i % 5 === 0 ? i / 5 - 1 : -1;
    const m = {
      id: `${P.id}-${i}`, planet: P.id, pi, i, chef: chef >= 0, boss: i === 20, story: P.story && P.story[i],
      title: { light: M.t.light || M.t, dark: M.t.dark || M.t }, text: { light: M.light, dark: M.dark },
      lvl: clamp(1 + pi + Math.floor((i - 1) / 7), 1, 5),
      reward: Math.round((40 + 5 * i) * (1 + 0.5 * pi)), boosters: i === 20 ? 2 : chef >= 0 ? 1 : 0,
    };
    m.waves = { light: buildWaves(P, M, i, 'light', chef), dark: buildWaves(P, M, i, 'dark', chef) };
    m.pool = { light: missionPool(P, i, 'light'), dark: missionPool(P, i, 'dark') };
    P.list.push(m); MISSIONS.push(m); MISSIONS_BY_ID[m.id] = m;
  });
});
const planetDone = P => P.list.length > 0 && P.list.every(m => save.won[m.id]);
const planetOpen = pi => pi === 0 || planetDone(DATA.campaign[pi - 1]);
/* Les ennemis s'adaptent à l'escouade : au moins autant d'ennemis que de personnages
   (un de plus face à un chef), et un niveau au moins égal à la moyenne de l'équipe */
const teamLvl = board => { const ids = boardUnits(board); return ids.length ? Math.round(ids.reduce((a, id) => a + levelOf(id), 0) / ids.length) : 1; };
const foeLvlFor = (m, board) => clamp(Math.max(m.lvl, teamLvl(board)), 1, DATA.rules.maxLevel);
function fitWaves(m, sd, board) {
  const n = boardUnits(board).length;
  return m.waves[sd].map((base, w) => {
    const chef = base.some(r => r.endsWith('!')), want = Math.min(DATA.rules.deckUnits, n + (chef ? 1 : 0));
    const rnd = seeded(hashStr(`${m.id}${sd}${w}+`) % 233280), list = [...base];
    while (list.length < want) list.push(m.pool[sd][Math.floor(rnd() * m.pool[sd].length)]);
    return list;
  });
}
/* ================================================================
   SURVIE : les vagues s'enchaînent jusqu'à la chute de l'escouade
   ================================================================ */
/* deux compositions : la base (8 personnages) et la survie étendue (16, tout le plateau) */
const DECKS = { board: { cap: 8, best: 'best', label: 'Survie' }, board16: { cap: CELLS, best: 'best16', label: 'Survie étendue' } };
function survivalMission(key = 'board') {
  const planets = DATA.campaign.map(P => P.id), L = DECKS[key].label;
  return { id: `survie-${key}`, survival: true, deckKey: key, planet: pick(planets), pi: -1, i: 0, title: { light: L, dark: L },
    text: { light: 'Les vagues ne s\'arrêtent jamais. Tiens le plus longtemps possible.', dark: 'Les vagues ne s\'arrêtent jamais. Tiens le plus longtemps possible.' }, lvl: 1, reward: 0, live: [] };
}
/* Vague k : autant d'ennemis que tes personnages (+1 toutes les 5 vagues), raretés et niveau qui montent,
   un chef toutes les 5 vagues ; au-delà du niveau 5, les ennemis gagnent 4 % de puissance par vague */
function survivalWave(m, sd, board, k) {
  const foeSide = id => CARDS[id].side !== sd, rank = id => RANKS.indexOf(CARDS[id].rarity);
  const top = Math.min(4, Math.floor((k - 1) / 4));
  const pool = UNIT_IDS.filter(id => foeSide(id) && !isUnique(id) && rank(id) <= top);
  const n = Math.min(DECKS[m.deckKey].cap, boardUnits(board).length + Math.floor(k / 5));
  const list = Array.from({ length: n }, () => pick(pool));
  if (k % 5 === 0) { const chefs = UNIT_IDS.filter(id => foeSide(id) && isUnique(id) && rank(id) <= Math.min(4, k / 5)); list[0] = `${pick(chefs)}!`; }
  m.foeLvl = clamp(teamLvl(board) + Math.floor((k - 1) / 5), 1, DATA.rules.maxLevel);
  m.boost = 1 + DATA.rules.survival.boost * (k - 1);
  return list;
}
const missionOpen = m => planetOpen(m.pi) && (m.i === 1 || !!save.won[`${m.planet}-${m.i - 1}`]);

/* ================================================================
   ANIMATIONS
   ================================================================ */
const tweens = [];
function tween(dur, fn, done, delay = 0) { tweens.push({ t: -delay, dur, fn, done }); }
const later = (s, fn) => tween(s, () => {}, fn);
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (!tw) continue;
    tw.t += dt;
    if (tw.t < 0) continue;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(k);
    if (k >= 1) { const at = tweens.indexOf(tw); if (at >= 0) tweens.splice(at, 1); tw.done && tw.done(); }
  }
}
function canvasTexture(source, w, h, draw) {
  const c = source || document.createElement('canvas');
  if (!source) { c.width = w; c.height = h; draw(c.getContext('2d'), w, h); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/* ================================================================
   SAUVEGARDE : compte claude.ai si disponible, sinon cet appareil
   ================================================================ */
const KEY = 'tcg-star-wars-save-v1';
const fresh = () => ({ v: 4, updatedAt: 0, credits: DATA.starter.credits, boosters: DATA.starter.boosters, owned: { ...DATA.starter.owned }, deck: { board: autoFormation(DATA.starter.deck), board16: autoFormation(DATA.starter.deck) }, won: {}, seen: {}, best: 0, best16: 0 });
function normalize(s) {
  const base = fresh();
  if (!s || typeof s !== 'object') return base;
  const fix = id => (CARDS[id] ? id : CARDS[MIGRATE[id]] ? MIGRATE[id] : null);
  /* v3 → v4 : les anciennes cartes capacités et leurs boosters sont remboursés en crédits */
  const owned = {}; let refund = 0;
  Object.entries(s.owned || {}).forEach(([id, n]) => { const k = fix(id); if (k && n > 0) owned[k] = (owned[k] || 0) + Math.floor(n); else if (n > 0 && (s.v || 0) < 4) refund += Math.floor(n) * DATA.rules.refund; });
  const b = s.boosters, nb = typeof b === 'number' ? b : Math.max(0, Number(b && b.perso) || 0);
  if (b && typeof b === 'object') refund += Math.max(0, Number(b.cap) || 0) * 80;
  const deck = s.deck || base.deck;
  const okUnit = id => fix(id);
  let board = Array.isArray(deck.board) && deck.board.length === CELLS ? deck.board.map(okUnit) : autoFormation((deck.units || []).map(okUnit));
  const limit = (b, n) => { let placed = 0; return b.map(id => (id && placed < n ? (placed++, id) : null)); };
  board = limit(board, DATA.rules.deckUnits);
  const board16 = limit(Array.isArray(deck.board16) && deck.board16.length === CELLS ? deck.board16.map(okUnit) : [...board], CELLS);
  const won = {}; Object.entries(s.won || {}).forEach(([k, v]) => { if (MISSIONS_BY_ID[k]) won[k] = clamp(Number(v) || 1, 1, 3); });
  return {
    v: 4, updatedAt: Number(s.updatedAt) || 0,
    credits: Math.max(0, Number(s.credits) || 0) + refund,
    boosters: nb,
    owned: Object.keys(owned).length ? owned : base.owned,
    deck: { board, board16 },
    won, seen: { ...(s.seen || {}) }, best: Math.max(0, Math.floor(Number(s.best) || 0)), best16: Math.max(0, Math.floor(Number(s.best16) || 0)),
    refunded: refund || 0,
  };
}
let save = (() => { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return fresh(); } })();
const store = { doc: null, timer: 0, chain: Promise.resolve() };
function persist() {
  save.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible */ }
  clearTimeout(store.timer);
  store.timer = setTimeout(() => {
    if (!store.doc) return;
    const body = structuredClone(save);
    store.chain = store.chain.then(() => store.doc.set(body)).catch(e => { if (['invalid_argument', 'revoked', 'not_granted'].includes(e && e.code)) store.doc = null; });
  }, 700);
}
async function connectStore() {
  if (!window.claude || !window.claude.use) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const doc = db.doc(`data/users/${uid}/save`);
    const snap = await Promise.race([doc.get(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
    store.doc = doc;
    const remote = snap.exists ? snap.data() : null;
    if (remote && (Number(remote.updatedAt) || 0) > save.updatedAt) {
      save = normalize(remote); persist();
      if (screen === 'hub') showHub(); else refreshHub();
    } else persist();
    $('#saveNote').textContent = 'Sauvegarde sur ton compte : ta collection te suit sur tous tes appareils.';
  } catch (e) { /* on reste sur la sauvegarde locale */ }
}
const count = id => save.owned[id] || 0;
/* Niveau selon le nombre d'exemplaires obtenus : 1, 2, 3, 5 puis 8 exemplaires */
const LV = DATA.rules.levels;
const lvlFor = n => Math.max(1, LV.filter(t => n >= t).length);
const levelOf = id => lvlFor(count(id));
const progressFor = n => { const L = lvlFor(n); if (L >= DATA.rules.maxLevel) return 1; return (n - LV[L - 1]) / (LV[L] - LV[L - 1]); };
/* Un personnage nommé est unique dans un deck ; soldats et droïdes de série se répètent librement */
const isUnique = id => !!CARDS[id].title;
