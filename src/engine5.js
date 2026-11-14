/* ================================================================
   MENUS : QG, missions, boosters, albums, deck
   ================================================================ */
const SCREENS = ['hub', 'missions', 'booster', 'collection', 'deck', 'prep'];
function go(name) {
  screen = name;
  SCREENS.forEach(s => ($(`#${s}`).hidden = s !== name));
  $('#battleHud').hidden = name !== 'battle';
  $('#quitBtn').hidden = name !== 'battle';
  $('#end').hidden = true;
  if (name === 'hub') { showHub(); if (save.refunded) setTimeout(() => { save.refunded = 0; persist(); $('#refundNote').hidden = true; }, 15000); }
  if (name === 'missions') enterGalaxy();
  if (name === 'booster') enterBooster();
  if (name === 'collection') renderCollection();
  if (name === 'deck') renderDeck();
  if (name === 'prep') renderPrep();
}
const ownedOf = ids => ids.filter(id => count(id)).length;
function deckSide() {
  const sides = new Set(boardUnits(save.deck.board).map(id => CARDS[id].side));
  return sides.has('light') && sides.has('dark') ? 'mixed' : sides.has('dark') ? 'dark' : sides.has('light') ? 'light' : 'neutral';
}
function deckProblem() {
  const s = deckSide();
  if (!boardUnits(save.deck.board).length) return 'Ajoute au moins un personnage sur le plateau.';
  if (s === 'mixed') return 'Un deck ne peut pas mélanger le côté lumineux et le côté obscur.';
  return '';
}
const sideLabel = s => (s === 'mixed' ? 'Deck mélangé' : s === 'neutral' ? 'Deck neutre' : DATA.sides[s]);
const totalStars = () => Object.values(save.won).reduce((a, b) => a + b, 0);
function currentMission() { return MISSIONS.find(m => missionOpen(m) && !save.won[m.id]) || null; }
function refreshHub() {
  const b = save.boosters, s = deckSide(), cur = currentMission();
  $('#credits').textContent = save.credits; $('#boosterCount').textContent = b;
  $('#persoCount').textContent = `${ownedOf(UNIT_IDS)} / ${UNIT_IDS.length}`; $('#starCount').textContent = totalStars();
  $('#hubTitle').textContent = s === 'dark' ? 'Base impériale' : s === 'neutral' ? 'Repaire de la Bordure' : 'QG de l\'Alliance';
  const won = MISSIONS.filter(m => save.won[m.id]).length;
  $('#mMissions').textContent = cur ? `${DATA.campaign[cur.pi].name} · mission ${cur.i} / 20 · ${won} gagnée${won > 1 ? 's' : ''}` : `${won} / ${MISSIONS.length} missions gagnées`;
  $('#mBooster').textContent = b ? `${b} booster${b > 1 ? 's' : ''} à ouvrir` : 'Achète-en avec tes crédits';
  $('#mBoosterBtn').classList.toggle('alert', b > 0);
  $('#mColl').textContent = `${ownedOf(UNIT_IDS)} / ${UNIT_IDS.length} personnages`;
  const p = deckProblem();
  $('#mDeck').textContent = p ? 'Deck à corriger' : `${sideLabel(s)} · ${boardUnits(save.deck.board).length} personnages`;
  const note = $('#refundNote'); note.hidden = !save.refunded;
  if (save.refunded) note.textContent = `Les cartes Capacités ont disparu : chaque personnage a maintenant les siennes. Tes anciennes capacités t'ont rapporté ${save.refunded} crédits.`;
}
function showHub() { refreshHub(); showHubScene(); }
$$('[data-go]').forEach(b => b.addEventListener('click', () => { sfx.click(); go(b.dataset.go); }));
addEventListener('pointerdown', () => sfx.init());
addEventListener('keydown', () => sfx.init());

/* --- Albums --- */
const inDeck = id => save.deck.board.filter(x => x === id).length;
function tile(id, onClick) {
  const d = CARDS[id], b = document.createElement('button'), rar = DATA.rarities[d.rarity];
  b.type = 'button'; b.style.setProperty('--r', rar.color);
  if (!count(id)) { b.className = 'tile missing'; b.innerHTML = '<span class="no"></span><b>?</b><span></span>'; b.querySelector('.no').textContent = `#${cardNo(d)}`; b.lastChild.textContent = rar.label; b.setAttribute('aria-label', `Carte ${cardNo(d)} pas encore obtenue`); b.disabled = true; return b; }
  b.className = `tile${inDeck(id) ? ' indeck' : ''}${RANKS.indexOf(d.rarity) >= 2 ? ' holo' : ''}${levelOf(id) >= DATA.rules.unlock[2] ? ' ult' : ''}`;
  b.innerHTML = `<img alt="" loading="lazy" src="${cardImg(id, levelOf(id))}"><span class="cnt">Niv. ${levelOf(id)}</span>`;
  b.querySelector('img').alt = `${d.name}, niveau ${levelOf(id)}${isUnique(id) ? ', personnage unique' : ''}`;
  b.addEventListener('click', () => onClick(id));
  return b;
}
const UNIT_FACTIONS = Object.keys(ROSTER);
const view = { filter: 'all', poolFilter: 'all' };
function chipsFor(container, current, onPick) {
  const groups = UNIT_FACTIONS, ids = UNIT_IDS;
  container.innerHTML = '';
  [['all', 'Toutes', ownedOf(ids), ids.length], ...groups.map(g => { const gi = ids.filter(id => CARDS[id].faction === g); return [g, DATA.factions[g].label, ownedOf(gi), gi.length]; })].forEach(([k, label, n, tot]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fchip'; b.setAttribute('aria-pressed', String(k === current));
    b.innerHTML = `${k === 'all' ? '' : `<img alt="" src="${emblemImg(k)}">`}<span></span>`; b.querySelector('span').textContent = `${label} · ${n}/${tot}`;
    b.addEventListener('click', () => onPick(k)); container.append(b);
  });
}
function renderCollection() {
  chipsFor($('#collChips'), view.filter, k => { view.filter = k; renderCollection(); });
  const body = $('#collBody'); body.innerHTML = '';
  const groups = UNIT_FACTIONS, ids = UNIT_IDS;
  groups.filter(g => view.filter === 'all' || view.filter === g).forEach(g => {
    const F = DATA.factions[g], gi = ids.filter(id => CARDS[id].faction === g), n = ownedOf(gi), sec = document.createElement('section');
    sec.className = 'album';
    sec.innerHTML = `<div class="album-head"><img alt="" src="${emblemImg(g)}"><div><h3></h3><span class="side"></span></div><span class="cnt2">${n} / ${gi.length}</span><div class="prog"><i style="width:${(n / gi.length) * 100}%"></i></div></div><div class="grid"></div>`;
    sec.querySelector('h3').textContent = F.label; sec.querySelector('.side').textContent = DATA.sides[F.side];
    const grid = sec.querySelector('.grid'); gi.forEach(id => grid.append(tile(id, openCard)));
    body.append(sec);
  });
}
let modalId = null;
function openCard(id) {
  modalId = id; const lvl = levelOf(id), d = scaleDef(id, lvl), n = count(id), max = lvl >= DATA.rules.maxLevel, F = fac(d);
  $('#cmImg').src = cardImg(id, lvl); $('#cmImg').alt = d.name;
  $('#cmRarity').textContent = `${DATA.rarities[d.rarity].label} · n° ${cardNo(d)}`;
  $('#cmName').textContent = d.title ? `${d.name} · ${d.title}` : d.name;
  $('#cmMeta').textContent = `${F.label} · ${DATA.roles[d.role].label}${d.species ? ` · ${SPECIES[d.species].label}` : ''} · ${DATA.sides[d.side]}`;
  $('#cmText').textContent = describe(d) + (d.species ? ` ${SPECIES[d.species].label} · ${SPECIES[d.species].bonus}` : '');
  $('#cmSkills').innerHTML = d.skills.map(k => `<li class="${k.locked ? 'locked' : ''}${k.trig === 'ult' ? ' ultk' : ''}" style="--c:${k.color}">${svgIcon(k.art)}<div><b></b><span></span></div><em>${k.locked ? `Niv. ${k.unlock}` : k.trig === 'ult' ? 'Ultime' : 'Active'}</em></li>`).join('');
  [...$('#cmSkills').children].forEach((li, i) => { li.querySelector('b').textContent = d.skills[i].name; li.querySelector('span').textContent = skillLine(d.skills[i]); });
  $('#cmBio').textContent = d.bio ? `« ${d.bio} »` : ''; $('#cmBio').hidden = !d.bio;
  $('#cmLevel').textContent = max ? `Niveau ${lvl} : maximum atteint${isUnique(id) ? ' · personnage unique' : ''}` : `Niveau ${lvl} · ${n} / ${DATA.rules.levels[lvl]} exemplaires pour le niveau ${lvl + 1} (+${Math.round(DATA.rules.levelBonus * 100)} % de puissance)${isUnique(id) ? ' · personnage unique' : ''}`;
  $('#cmProg').style.width = `${progressFor(n) * 100}%`;
  $('#cmDeck').textContent = 'Ajouter au deck'; $('#cmRemove').hidden = !inDeck(id);
  $('#cmMsg').hidden = true; $('#cardModal').hidden = false; $('#cmClose').focus({ preventScroll: true });
}
$('#cmClose').addEventListener('click', () => { $('#cardModal').hidden = true; });
$('#cardModal').addEventListener('click', e => { if (e.target.id === 'cardModal') $('#cardModal').hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') $('#cardModal').hidden = true; });
$('#cmDeck').addEventListener('click', () => { if (addToDeck(modalId)) return; $('#cardModal').hidden = true; if (screen === 'collection') renderCollection(); else renderDeck(); });
$('#cmRemove').addEventListener('click', () => { removeFromDeck(modalId); $('#cardModal').hidden = true; if (screen === 'collection') renderCollection(); else renderDeck(); });

/* --- Deck : composition 4 × 4 --- */
const ROW_NAMES = ['Ligne avant', 'Ligne 2', 'Ligne 3', 'Arrière'];
const pick4 = { deck: null, prep: null };
function addToDeck(id) {
  const d = CARDS[id], board = save.deck.board;
  if (isUnique(id) && inDeck(id)) return flashWarn(`${CARDS[id].name} est un personnage unique : il est déjà dans ton deck.`);
  if (boardUnits(board).length >= DATA.rules.deckUnits) return flashWarn(`Ton plateau a déjà ${DATA.rules.deckUnits} personnages : retires-en un d'abord.`);
  const s = deckSide(); if ((s === 'light' && d.side === 'dark') || (s === 'dark' && d.side === 'light')) return flashWarn(`Ton deck est du ${DATA.sides[s].toLowerCase()} : ce personnage n'y a pas sa place.`);
  const want = ROLE_ROW[d.role], cell = [want, ...[0, 1, 2, 3].filter(r => r !== want)].flatMap(cellOrder).find(i => !board[i]);
  board[cell] = id;
  persist(); sfx.click(); return '';
}
function removeFromDeck(id, index) {
  const i = index ?? save.deck.board.lastIndexOf(id); if (i >= 0) save.deck.board[i] = null;
  persist(); sfx.click();
}
function flashWarn(msg) { const w = $(screen === 'deck' ? '#dWarn' : '#cmMsg'); w.hidden = false; w.textContent = msg; sfx.deny(); return msg; }
/* Grille partagée par le deck et la préparation : touche une carte puis une case pour la déplacer ou l'échanger */
function renderBoard(el, board, key, onChange) {
  el.innerHTML = '';
  for (let r = 0; r < DATA.rules.rows; r++) {
    const lab = document.createElement('span'); lab.className = 'rowlab'; lab.textContent = ROW_NAMES[r]; el.append(lab);
    for (let c = 0; c < DATA.rules.cols; c++) {
      const i = r * DATA.rules.cols + c, id = board[i], b = document.createElement('button');
      b.type = 'button'; b.className = `cell${pick4[key] === i ? ' sel' : ''}${id ? '' : ' empty'}`;
      if (id) { b.innerHTML = `<img alt="" src="${cardImg(id, levelOf(id))}">`; b.setAttribute('aria-label', `${ROW_NAMES[r]}, case ${c + 1} : ${CARDS[id].name}`); }
      else b.setAttribute('aria-label', `${ROW_NAMES[r]}, case ${c + 1} : vide`);
      b.addEventListener('click', () => {
        const sel = pick4[key];
        if (sel == null) { if (id) { pick4[key] = i; sfx.click(); } }
        else if (sel === i) pick4[key] = null;
        else { [board[sel], board[i]] = [board[i], board[sel]]; pick4[key] = null; sfx.click(); onChange(board); }
        renderBoard(el, board, key, onChange); el.dispatchEvent(new Event('boardchange'));
      });
      el.append(b);
    }
  }
}
function renderDeck() {
  const pool = $('#dPool'); pool.innerHTML = '';
  renderBoard($('#dBoard'), save.deck.board, 'deck', () => persist());
  $('#dUnitsN').textContent = `${boardUnits(save.deck.board).length} / ${DATA.rules.deckUnits}`;
  const sel = pick4.deck; $('#dRemove').hidden = sel == null || !save.deck.board[sel];
  const s = deckSide(), chip = $('#dSide'); chip.className = `sidechip ${s}`; chip.textContent = sideLabel(s);
  const p = deckProblem(), w = $('#dWarn'); w.hidden = !p; w.textContent = p;
  chipsFor($('#poolChips'), view.poolFilter, k => { view.poolFilter = k; renderDeck(); });
  const ids = UNIT_IDS.filter(id => count(id) && (view.poolFilter === 'all' || CARDS[id].faction === view.poolFilter));
  ids.forEach(id => { const t = tile(id, () => { const m = addToDeck(id); renderDeck(); if (m) { const w = $('#dWarn'); w.hidden = false; w.textContent = m; } }); if (!(isUnique(id) && inDeck(id))) t.classList.remove('indeck'); pool.append(t); });
  if (!ids.length) { const e = document.createElement('p'); e.className = 'warn'; e.textContent = 'Aucune carte disponible ici. Ouvre des boosters pour en obtenir.'; pool.append(e); }
}
$('#dBoard').addEventListener('boardchange', () => renderDeck());
$('#dRemove').addEventListener('click', () => { const i = pick4.deck; if (i == null) return; removeFromDeck(save.deck.board[i], i); pick4.deck = null; renderDeck(); });
$('#dAuto').addEventListener('click', () => { save.deck.board = autoFormation(boardUnits(save.deck.board)); pick4.deck = null; persist(); sfx.click(); renderDeck(); });

/* --- Préparation avant combat --- */
function renderPrep() {
  const P = DATA.campaign[mission.pi], W2 = mission.waves[side];
  $('#pTitle').textContent = `${P.name} ${mission.i} · ${mTitle(mission)}`;
  $('#pBrief').textContent = mission.text[side];
  const names = W2[0].map(r => CARDS[r.replace('!', '')].name), cnt = {};
  names.forEach(n => (cnt[n] = (cnt[n] || 0) + 1));
  $('#pFoes').textContent = `${W2.length} vague${W2.length > 1 ? 's' : ''} · ennemis niveau ${mission.lvl}. Vague 1 : ${Object.entries(cnt).map(([n, k]) => (k > 1 ? `${k} × ${n}` : n)).join(', ')}.${mission.chef ? ' Un chef attend à la dernière vague.' : ''}`;
  renderBoard($('#pBoard'), prepBoard, 'prep', b => rearrange(b));
  $('#pSave').disabled = prepBoard.every((id, i) => id === save.deck.board[i]);
}
$('#pBoard').addEventListener('boardchange', () => { $('#pSave').disabled = prepBoard.every((id, i) => id === save.deck.board[i]); });
$('#pFight').addEventListener('click', () => { sfx.click(); pick4.prep = null; beginFight(); });
$('#pReset').addEventListener('click', () => { sfx.click(); pick4.prep = null; rearrange([...save.deck.board]); renderPrep(); });
$('#pAuto').addEventListener('click', () => { sfx.click(); pick4.prep = null; rearrange(autoFormation(boardUnits(prepBoard))); renderPrep(); });
$('#pSave').addEventListener('click', () => { save.deck.board = [...prepBoard]; persist(); sfx.power(); renderPrep(); });

/* --- Combat : boutons --- */
$('#quitBtn').addEventListener('click', () => { sfx.click(); go('hub'); });
$('#endHub').addEventListener('click', () => { sfx.click(); go('hub'); });
$('#endAgain').addEventListener('click', () => { sfx.click(); startPrep(mission); });
$('#endNext').addEventListener('click', () => { sfx.click(); const nm = nextMission(mission); if (nm) startPrep(nm); });
$('#endMap').addEventListener('click', () => { sfx.click(); go('missions'); });

/* --- Histoire --- */
function showStory(m) {
  const S = m.story, P = DATA.campaign[m.pi];
  $('#stEyebrow').textContent = `${P.name} · chapitre ${[1, 5, 10, 15, 20].indexOf(m.i) + 1}`;
  $('#stTitle').textContent = S.title; $('#stText').textContent = S[side];
  save.seen[m.id] = 1; persist();
  storyHid = !$('#end').hidden; $('#end').hidden = true;
  $('#story').hidden = false; $('#stClose').focus({ preventScroll: true });
}
let storyHid = false;
$('#stClose').addEventListener('click', () => { sfx.click(); $('#story').hidden = true; if (storyHid) { $('#end').hidden = false; storyHid = false; } });
$('#muteBtn').addEventListener('click', e => {
  const muted = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(muted)); e.currentTarget.textContent = muted ? 'Activer le son' : 'Couper le son';
  sfx.init(); sfx.setMuted(muted);
});

