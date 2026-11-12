import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as S from './sim.js';
const $ = id => document.getElementById(id);
let g = S.newGame(Date.now() % 100000 | 0), sel = null, auto = null;
const log = (...a) => console.error('[ECLIPSE]', ...a);

// ---- 3D globe ----
const R = 5, scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 800);
cam.position.set(0, 14, 60);
const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setPixelRatio(Math.min(devicePixelRatio, 2)); ren.setSize(innerWidth, innerHeight);
ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.1; document.body.prepend(ren.domElement);
const comp = new EffectComposer(ren); comp.addPass(new RenderPass(scene, cam)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .55, .7, .82)); comp.addPass(new OutputPass());
const ctl = new OrbitControls(cam, ren.domElement); ctl.enableDamping = true; ctl.minDistance = 6.5; ctl.maxDistance = 40; ctl.autoRotate = true; ctl.autoRotateSpeed = .25;
ctl.addEventListener('start', () => { ctl.autoRotate = false; flyTo = null; });
scene.add(new THREE.AmbientLight(0x3a4a78, .55)); const sun = new THREE.DirectionalLight(0xfff0d0, 3); scene.add(sun);
const ll = (lat, lon, r = R) => { const a = lat * Math.PI / 180, b = lon * Math.PI / 180; return new THREE.Vector3(r * Math.cos(a) * Math.sin(b), r * Math.sin(a), r * Math.cos(a) * Math.cos(b)); };
// procedural planet: seamless 3D noise sampled on the sphere; land is guaranteed under every city
const hs = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }, sm = t => t * t * (3 - 2 * t);
const n3 = (x, y, z) => { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k), L = (a, b, c) => a + (b - a) * c;
  return L(L(L(hs(i, j, k), hs(i + 1, j, k), u), L(hs(i, j + 1, k), hs(i + 1, j + 1, k), u), v), L(L(hs(i, j, k + 1), hs(i + 1, j, k + 1), u), L(hs(i, j + 1, k + 1), hs(i + 1, j + 1, k + 1), u), v), w); };
const fbm = (x, y, z, o = 5) => { let s = 0, a = .5, f = 1; for (let q = 0; q < o; q++) { s += a * n3(x * f, y * f, z * f); a /= 2; f *= 2.03; } return s; };
const cdir = g.cities.map(c => ll(c.lat, c.lon, 1));
function planet() { const W = 1024, H = 512, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); return [c, x, x.createImageData(W, H)]; };
  const [cc, cx, ci] = mk(), [hc, hx, hi] = mk(), [rc, rx, ri] = mk(), [ec, ex, ei] = mk(), [kc, kx, ki] = mk(), d = new THREE.Vector3();
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const ph = px / W * 2 * Math.PI, th = py / H * Math.PI, o = (py * W + px) * 4; d.set(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
    let bump = 0, glow = 0; for (const c of cdir) { const dt = d.dot(c) - 1; bump += Math.exp(dt * 22) * .4; glow += Math.exp(dt * 500); }
    const h = fbm(d.x * 2.2 + 9, d.y * 2.2, d.z * 2.2) * 1.15 + bump - .08, land = h > .52, la = Math.abs(d.y), ice = la > .86 + fbm(d.x * 6, d.y * 6, d.z * 6, 3) * .08;
    let col; if (ice) col = [238, 244, 250]; else if (!land) { const dp = Math.min(1, (.52 - h) * 3.2); col = [8 + 30 * (1 - dp), 40 + 70 * (1 - dp), 90 + 80 * (1 - dp)]; }
    else { const e = (h - .52) * 3, v = fbm(d.x * 12, d.y * 12, d.z * 12, 3), dry = Math.max(0, 1 - la * 2.4) * (fbm(d.x * 3 + 4, d.y * 3, d.z * 3) > .5 ? 1 : 0);
      col = e > .75 ? [150 + v * 90, 145 + v * 90, 140 + v * 90] : e > .45 ? [95 + v * 40, 85 + v * 30, 65 + v * 20] : dry ? [190 + v * 30, 160 + v * 25, 105] : [38 + v * 50 + e * 40, 88 + v * 60, 40 + v * 25]; }
    ci.data.set([col[0], col[1], col[2], 255], o); const hv = land || ice ? 90 + Math.min(165, (h - .5) * 380) : 40; hi.data.set([hv, hv, hv, 255], o);
    const r = land || ice ? 235 : 55; ri.data.set([r, r, r, 255], o); const lg = land && !ice ? Math.min(1, glow * (.5 + n3(d.x * 70, d.y * 70, d.z * 70))) * 255 : 0; ei.data.set([lg, lg * .72, lg * .35, 255], o);
    const cl = Math.max(0, Math.min(1, (fbm(d.x * 3.2 + 20, d.y * 3.2, d.z * 3.2 + 5) - .5) * 4.5)) * 255; ki.data.set([255, 255, 255, cl], o); }
  [[cx, ci], [hx, hi], [rx, ri], [ex, ei], [kx, ki]].forEach(([x, i]) => x.putImageData(i, 0, 0));
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }; return { col: T(cc, 1), hgt: T(hc), rough: T(rc), emis: T(ec, 1), cloud: T(kc, 1) }; }
const tx = planet();
scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ map: tx.col, bumpMap: tx.hgt, bumpScale: 4, roughnessMap: tx.rough, roughness: 1, emissiveMap: tx.emis, emissive: 0xffffff, emissiveIntensity: 1.6 })));
const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 96, 64), new THREE.MeshStandardMaterial({ map: tx.cloud, transparent: true, depthWrite: false, roughness: 1, opacity: .85 })); scene.add(clouds);
scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 96, 64), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { c: { value: new THREE.Color(0x5aa6ff) } },
  vertexShader: 'varying vec3 n;varying vec3 v;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'varying vec3 n;varying vec3 v;uniform vec3 c;void main(){float f=pow(max(0.,dot(-n,v)),1.3);gl_FragColor=vec4(c*f*2.4,f);}' })));
{ const P = [], C = [], col = new THREE.Color(); for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(200 + Math.random() * 250); P.push(v.x, v.y, v.z); col.setHSL(.55 + Math.random() * .15, .4, .55 + Math.random() * .4); C.push(col.r, col.g, col.b); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, sizeAttenuation: false }))); }
const markers = g.cities.map((c, i) => { const geo = new THREE.CylinderGeometry(.09, .13, .5, 12); geo.translate(0, .25, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  m.position.copy(ll(c.lat, c.lon, R + .02)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), m.position.clone().normalize()); m.userData.i = i;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; m.add(ring); m.userData.ring = ring; scene.add(m); return m; });
const lines = new THREE.Group(), pulses = []; scene.add(lines);
function refreshLines() { lines.children.slice().forEach(o => { o.geometry.dispose(); lines.remove(o); }); pulses.length = 0;
  const cap = n => markers[n.cities[0]]?.position, arc = (A, B, hex) => { if (!A || !B) return; const mid = A.clone().add(B).multiplyScalar(.5).normalize().multiplyScalar(R + A.distanceTo(B) * .32), cv = new THREE.QuadraticBezierCurve3(A.clone(), mid, B.clone());
    const color = new THREE.Color(hex).multiplyScalar(2.2); lines.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 48, .018, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8 })));
    const pm = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color })); lines.add(pm); pulses.push({ pm, cv, t: Math.random(), sp: .15 + Math.random() * .1 }); };
  for (const a of g.nations) { if (a.dead) continue; for (const b of a.trade) if (a.id < b) arc(cap(a), cap(g.nations[b]), '#e8b04a'); }
  for (const w of g.wars) { const [x, y] = w.k.split('|').map(Number); if (!g.nations[x].dead && !g.nations[y].dead) arc(cap(g.nations[x]), cap(g.nations[y]), '#ff3b2f'); } }
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
ren.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; startDrone(); });
ren.domElement.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, cam);
  const hit = ray.intersectObjects(markers)[0]; if (hit) { sel = hit.object.userData.i; fly(markers[sel].position); snd(520, .1); ui(); } });
let flyTo = new THREE.Vector3(0, 4, 17); const fly = p => flyTo = p.clone().normalize().multiplyScalar(11);
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); ren.setSize(innerWidth, innerHeight); comp.setSize(innerWidth, innerHeight); });
// ---- sound: procedural UI blips + adaptive drone (dissonant during war) ----
let ac, mute = false, drone = null; const aud = () => ac ??= new AudioContext();
function snd(f = 440, d = .08, type = 'sine', v = .05) { if (mute) return; try { const c = aud(), o = c.createOscillator(), gn = c.createGain(); o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(v, c.currentTime); gn.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(gn).connect(c.destination); o.start(); o.stop(c.currentTime + d); } catch (e) { log('audio', e); } }
function startDrone() { if (drone) return; try { const c = aud(), gn = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; gn.gain.value = mute ? 0 : .04; const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.frequency.value = 55; o2.frequency.value = 82.4; o1.type = 'sawtooth'; o2.type = 'triangle';
  o1.connect(lp); o2.connect(lp); lp.connect(gn).connect(c.destination); o1.start(); o2.start(); drone = { o1, o2, g: gn }; } catch (e) { log('audio', e); } }
const music = () => { if (drone) drone.o2.frequency.setTargetAtTime(g.wars.some(w => w.k.split('|').includes('0')) ? 77.8 : 82.4, aud().currentTime, 1.5); };
const clock = new THREE.Clock(); let sunA = 0.6;
(function loop() { requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .1), tt = clock.elapsedTime; sunA += dt * .04; sun.position.set(Math.cos(sunA) * 14, 5, Math.sin(sunA) * 14); clouds.rotation.y += dt * .01;
  if (flyTo) { cam.position.lerp(flyTo, .035); if (cam.position.distanceTo(flyTo) < .15) flyTo = null; }
  for (const p of pulses) { p.t = (p.t + dt * p.sp) % 1; p.pm.position.copy(p.cv.getPoint(p.t)); }
  markers.forEach((m, i) => { const r = m.userData.ring, k = 1 + .25 * Math.sin(tt * 2 + i); r.scale.setScalar(i === sel ? 1.6 + .2 * Math.sin(tt * 4) : k); });
  ctl.update(); comp.render(); })();

// ---- UI ----
const P = () => g.nations[0], say = (m, bad) => { const t = $('toast'); t.textContent = m; t.style.display = 'block'; t.style.borderColor = bad ? '#d9604c' : '#e8b04a'; clearTimeout(say.t); say.t = setTimeout(() => t.style.display = 'none', 2600); };
const act = r => { say(r.msg, !r.ok); r.ok ? snd(660, .12) : snd(150, .15, 'sawtooth', .04); ui(); }, f = x => Math.round(x).toLocaleString();
function ui() {
  markers.forEach((m, i) => { const nc = g.nations[g.cities[i].nat].color; m.material.color.set(nc).multiplyScalar(1.8); m.userData.ring.material.color.set(nc).multiplyScalar(1.6); m.scale.setScalar(i === sel ? 1.5 : 1); }); refreshLines(); music();
  const p = P(), pop = p.cities.reduce((s, i) => s + g.cities[i].pop, 0);
  $('top').innerHTML = `<b>ECLIPSE</b><span>Turn <em>${g.turn}</em></span><span>Money <em>${f(p.money)}</em></span><span>Food <em>${f(p.food)}</em></span><span>Iron <em>${f(p.iron)}</em></span><span>Energy <em>${Math.round(p.ef * 100)}%</em></span><span>Population <em>${f(pop)}</em></span><span>Research <em>+${p.sci.toFixed(1)}</em></span><span>Stability <em>${Math.round(p.stab)}</em></span><span>Army <em>${p.units}</em> (morale ${Math.round(p.morale)})</span>`;
  let L = '<h3>Selected city</h3>';
  if (sel === null) L += '<span style="color:var(--dim)">Click a city marker on the globe.</span>'; else { const c = g.cities[sel], o = g.nations[c.nat], mine = c.nat === 0;
    L += `<b>${c.name}</b> — <span style="color:${o.color}">${o.name}</span><br>Terrain: ${c.terrain}<br>Population: ${f(c.pop)}<br>Happiness: ${Math.round(c.happy)}<div class="bar"><i style="width:${c.happy}%"></i></div>
    <br>${Object.entries(c.b).map(([k, v]) => `${S.BUILD[k].name}: ${v}`).join('<br>')}`;
    if (mine) L += '<h3>Build</h3>' + Object.entries(S.BUILD).map(([k, b]) => `<button data-b="${k}">${b.name} (${b.cost})</button>`).join('');
    else if (S.atWar(g, 0, c.nat)) L += `<h3>War</h3><button data-atk="1">Attack ${c.name}</button>`; else L += '<br><span style="color:var(--dim)">Declare war to attack this city.</span>'; }
  L += `<h3>Tax rate: ${Math.round(p.tax * 100)}%</h3><input type="range" id="tax" min="5" max="50" value="${p.tax * 100}" style="width:100%"><small style="color:var(--dim)">Higher tax: more money, less happiness.</small>`;
  $('left').innerHTML = L;
  $('left').querySelectorAll('[data-b]').forEach(b => b.onclick = () => act(S.build(g, 0, sel, b.dataset.b)));
  const ak = $('left').querySelector('[data-atk]'); if (ak) ak.onclick = () => { act(S.attack(g, 0, sel)); if (S.checkVictory(g)) end(); };
  $('tax').oninput = e => { S.setTax(g, 0, e.target.value / 100); }; $('tax').onchange = ui;
  let Rt = `<button class="go" id="end">End turn</button><button id="auto">${auto ? 'Stop auto-play' : 'Auto-play'}</button><button id="mute">${mute ? 'Sound off' : 'Sound on'}</button><h3>Research</h3>`;
  Rt += p.research ? `Researching <b>${S.TECHS[p.research.id].n}</b><div class="bar"><i style="width:${p.research.prog / S.TECHS[p.research.id].c * 100}%"></i></div>` : '<small style="color:var(--dim)">Pick a technology:</small><br>';
  Rt += Object.entries(S.TECHS).map(([k, t]) => p.done.includes(k) ? `<div style="color:var(--gold)">✔ ${t.n}</div>` : `<button data-t="${k}" ${S.canResearch(p, k) && !p.research ? '' : 'disabled'} title="Needs: ${t.r.map(r => S.TECHS[r].n).join(', ') || 'nothing'}">${t.n} (${t.c})</button>`).join('');
  Rt += `<h3>Military</h3><button id="rec">Recruit 5 units (150 money, 10 iron)</button><h3>Diplomacy</h3>`;
  for (const n of g.nations.slice(1)) { const w = S.atWar(g, 0, n.id); Rt += n.dead ? `<div style="color:var(--dim)">${n.name} — fallen</div>` : `<div><span style="color:${n.color}">●</span> <b>${n.name}</b> (${n.gov})<br><small>Relations ${n.rel[0]} · army ${n.units}${w ? ' · AT WAR' : p.trade.includes(n.id) ? ' · trade' : ''}</small><br>
    ${w ? `<button data-pe="${n.id}">Ask for peace</button>` : `<button data-tr="${n.id}">Trade deal</button><button data-wr="${n.id}">Declare war</button>`}</div>`; }
  Rt += `<h3>Save / Load</h3>${[1, 2, 3].map(i => `<button data-sv="${i}">Save ${i}</button>`).join('')}<br>${[1, 2, 3].map(i => `<button data-ld="${i}">${slotLabel(i)}</button>`).join('')}<h3>Log</h3><div id="log">${g.log.join('<br>')}</div>`;
  $('right').innerHTML = Rt;
  const R2 = $('right'); $('end').onclick = turn; $('auto').onclick = () => { auto = auto ? clearInterval(auto) : setInterval(turn, 700); ui(); }; $('rec').onclick = () => act(S.recruit(g, 0)); $('mute').onclick = () => { mute = !mute; if (drone) drone.g.gain.value = mute ? 0 : .04; ui(); };
  R2.querySelectorAll('[data-t]').forEach(b => b.onclick = () => act(S.startResearch(g, 0, b.dataset.t)));
  R2.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => act(S.proposeTrade(g, 0, +b.dataset.tr)));
  R2.querySelectorAll('[data-wr]').forEach(b => b.onclick = () => act(S.declareWar(g, 0, +b.dataset.wr)));
  R2.querySelectorAll('[data-pe]').forEach(b => b.onclick = () => act(S.proposePeace(g, 0, +b.dataset.pe)));
  R2.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => save(b.dataset.sv)); R2.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => load(b.dataset.ld));
}
function slotLabel(i) { try { const f = JSON.parse(localStorage.getItem('eclipse.slot' + i)); return f ? `Load ${i} (T${f.meta.turn})` : `Load ${i} (empty)`; } catch { return `Load ${i} (empty)`; } }
function save(i) { try { localStorage.setItem('eclipse.slot' + i, S.serialize(g)); say(`Saved to slot ${i}.`); ui(); } catch (e) { log(e); say('Save failed: ' + e.message, true); } }
function load(i) { const t = localStorage.getItem('eclipse.slot' + i); if (!t) return say('Slot is empty.', true); const r = S.deserialize(t); if (!r.ok) { log(r.err); return say(r.err, true); } g = r.game; sel = null; say(`Loaded slot ${i}.`); ui(); }
function turn() { try { snd(330, .1, 'triangle'); const w = S.tick(g); if (g.turn % 5 === 0) { try { localStorage.setItem('eclipse.auto', S.serialize(g)); } catch (e) { log(e); } } ui(); if (w) end(); } catch (e) { log(e); say('Simulation error: ' + e.message, true); clearInterval(auto); auto = null; } }
function end() { clearInterval(auto); auto = null; say(g.winner); alert(g.winner + ' Reload to play again.'); }
addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); turn(); } });
ui();
