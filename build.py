import pathlib
S = pathlib.Path('src')
css = (S/'style.css').read_text()
body = (S/'body.html').read_text()
js = '\n'.join((S/f).read_text() for f in ['data.js','engine1.js','engine2.js','engine3.js','terrain.js','engine4.js','engine5.js','booster.js','galaxy.js','engine7.js'])
head = '''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>TCG Star Wars</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,400&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
<style>''' + css + '''</style>
<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"}}
</script>
</head>
<body>
'''
imports = '''import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
'''
html = head + body + '\n<script type="module">\n' + imports + js + '\n</script>\n</body>\n</html>\n'
pathlib.Path('index.html').write_text(html)
dbg = "window.__dbg={get state(){return state},get screen(){return screen},get save(){return save},killAll(){aliveFoes().forEach(f=>damage(f,99999,f.chest()))},hurtAll(){aliveAllies().forEach(a=>damage(a,99999,a.chest()))},go,startMission:i=>startMission(MISSIONS[i]),mission:i=>MISSIONS[i],grant(ids,n=1){ids.forEach(id=>save.owned[id]=(save.owned[id]||0)+n)},setDeck(u,k='board'){save.deck[k]=autoFormation(u)},win(n){MISSIONS.slice(0,n).forEach(m=>save.won[m.id]=3)},allies:()=>aliveAllies().map(a=>({id:a.id,hp:a.hp,ult:a.ult&&a.ult.id,charge:a.charge,skills:a.skills.map(s=>s.id)})),foes:()=>aliveFoes().map(a=>({id:a.id,lvl:a.lvl,boss:!!a.def.boss,skills:a.skills.map(s=>s.id),ult:a.ult&&a.ult.id})),charge(){units().forEach(u=>u.charge=1)},ult(i){return castUlt(ultUnits[i])},get stats(){return stats},cast(fx){const u=units().find(x=>x.alive&&x.def.skills.some(k=>k.fx===fx));if(!u)return 'none';const k=u.def.skills.find(k=>k.fx===fx);return castSkill(u,k,{src:opponents(u)[0]})!==false},cards:()=>Object.keys(CARDS).length,skill(key){for(const u of [...aliveAllies(),...aliveFoes()]){const r=castSkill(u,{...scaleSkill(key,2,3),unlock:1,locked:false},{src:opponents(u)[0]});if(r!==false)return u.id}return false},skillKeys:()=>Object.keys(SKILLS),hurt(){aliveAllies().forEach(u=>{u.hp=Math.max(1,u.hp*0.5);u.refreshTag()});aliveFoes().forEach(u=>{u.hp=u.maxHp*50;u.maxHp*=1})},killOne(){const a=aliveAllies()[0];if(a)damage(a,99999,a.chest())},apply(id){planetId='';applyPlanet(id)},raw:()=>units().map(u=>[u.id,+u.cool.toFixed(2),u.ready,u.alive,u.stun,u.gun]),err:[]};"
sim = "  updateTweens(dt);\n  if (state === 'fight') updateFight(dt); else markRing.visible = false;\n  units().forEach(u => updateUnit(u, dt, t));\n  updateBolts(dt); updateFx(dt);"
assert sim in html
th = html.replace('/*DBG*/', dbg).replace(sim, "  for (let _i = 0; _i < (window.__ts || 1); _i++) {\n" + sim + "\n  }")
pathlib.Path('test.html').write_text(th)
print('built', len(html))
