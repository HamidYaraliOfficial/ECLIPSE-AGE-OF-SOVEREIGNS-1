// Pure simulation core (no DOM) - deterministic, testable.
export const VERSION = 1;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function rnd(g) { let t = (g.rs = (g.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export const BUILD = { farm: { cost: 200, name: 'Farm' }, plant: { cost: 300, name: 'Power plant' }, mine: { cost: 250, name: 'Mine' }, factory: { cost: 400, name: 'Factory' }, lab: { cost: 350, name: 'Research lab' } };
export const TECHS = {
  agri: { n: 'Irrigation', c: 30, r: [], fx: { farm: .25 } }, eng: { n: 'Grid Engineering', c: 30, r: [], fx: { plant: .25 } },
  met: { n: 'Metallurgy', c: 40, r: [], fx: { mine: .25 } }, sci: { n: 'Scientific Method', c: 60, r: ['eng'], fx: { sci: .25 } },
  ind: { n: 'Industrialization', c: 70, r: ['met', 'eng'], fx: { money: .15 } }, mech: { n: 'Mechanization', c: 80, r: ['ind'], fx: { army: .2 } },
  bio: { n: 'Biotech Crops', c: 80, r: ['agri', 'ind'], fx: { farm: .3 } }, arm: { n: 'Combined Arms', c: 120, r: ['mech', 'sci'], fx: { army: .3 } } };
export const RECRUIT = { units: 5, money: 150, iron: 10 };
export const bonus = (n, k) => n.done.reduce((s, t) => s + (TECHS[t].fx[k] || 0), 0);
const TERRAIN = { plains: 1, forest: 1.2, mountain: 1.4, desert: 1.05 };
const key = (a, b) => Math.min(a, b) + '|' + Math.max(a, b);
export const atWar = (g, a, b) => g.wars.some(w => w.k === key(a, b));

export function newGame(seed = 1) {
  const N = (id, name, color, p, gov, cities) => ({ id, name, color, ai: id > 0, p, gov, cities, money: 800, food: 60, iron: 40, rp: 0, research: null, done: [], tax: .2, units: 10, morale: 70, ef: 1, stab: 60, sci: 0, trade: [], dead: false, rel: { 0: 0, 1: 0, 2: 0, 3: 0 } });
  const C = (name, nat, lat, lon, terrain, pop) => ({ name, nat, lat, lon, terrain, pop, happy: 60, b: { farm: 2, plant: 1, mine: 1, factory: 1, lab: 0 } });
  return { v: VERSION, seed, rs: seed, turn: 1, wars: [], log: ['Your reign begins.'], winner: null,
    nations: [N(0, 'Aurelia', '#e8b04a', {}, 'Republic', [0, 1]), N(1, 'Borealis', '#5ec2d6', { aggr: .7, trade: .3 }, 'Military Government', [2]),
      N(2, 'Cindara', '#c46bd1', { aggr: .3, trade: .8 }, 'Democracy', [3]), N(3, 'Dravon', '#d9604c', { aggr: .9, trade: .1 }, 'Authoritarian State', [4])],
    cities: [C('Solmere', 0, 10, -40, 'plains', 20000), C('Karith', 0, 25, -10, 'forest', 16000), C('Nordhaven', 1, 55, 20, 'mountain', 18000), C('Veyra', 2, -15, 60, 'desert', 17000), C('Ironmoor', 3, 20, 120, 'plains', 19000)] };
}
const say = (g, m) => { g.log.unshift(`T${g.turn}: ${m}`); g.log.length = Math.min(g.log.length, 40); };

export function tick(g) {
  g.turn++;
  for (const n of g.nations) {
    if (n.dead) continue;
    let sci = 0, efs = 0, happy = 0, food = 0, money = 0, iron = 0;
    for (const c of n.cities.map(i => g.cities[i])) {
      const b = c.b, prod = b.plant * 20 * (1 + bonus(n, 'plant')), use = c.pop / 1000 * .6 + (b.factory + b.mine + b.lab) * 4;
      const ef = use > 0 ? clamp(prod / use, .2, 1) : 1; efs += ef;
      const cf = b.farm * 14 * (1 + bonus(n, 'farm')) - c.pop / 1000; food += cf;
      iron += b.mine * 8 * (1 + bonus(n, 'mine')) * ef;
      money += (c.pop * .004 * n.tax + b.factory * 25 * (1 + bonus(n, 'money')) * ef) - Object.values(b).reduce((a, x) => a + x, 0) * 3;
      sci += (b.lab * 6 + c.pop / 10000) * ef * (1 + bonus(n, 'sci'));
      c.happy = clamp(c.happy + (n.food + cf < 0 ? -8 : 1) - (n.tax - .2) * 30 - (ef < .7 ? 3 : 0), 0, 100);
      c.pop = Math.floor(c.pop * (1 + (c.happy > 50 ? .004 : -.004))); happy += c.happy;
    }
    const k = n.cities.length; n.ef = efs / k; n.stab = happy / k; n.sci = sci;
    n.food = Math.max(0, n.food + food); n.iron += iron; n.money += money - n.units * 1.5 + n.trade.length * 20;
    if (n.food === 0 && n.id === 0) say(g, 'Famine! Happiness is falling.');
    if (n.stab < 20 && n.money > 0) { n.money *= .9; if (n.id === 0) say(g, 'Unrest: riots cost you 10% of your treasury.'); }
    n.morale = clamp(n.morale + (n.stab > 50 ? 1 : -2), 20, 100);
    if (n.research) { n.research.prog += sci; const t = TECHS[n.research.id]; if (n.research.prog >= t.c) { n.done.push(n.research.id); say(g, `${n.name} discovered ${t.n}.`); n.research = null; } }
    n.money = Math.max(n.money, -500);
  }
  g.nations.forEach(n => !n.dead && runEvents(g, n));
  for (const a of g.nations) for (const b of a.trade) if (!atWar(g, a.id, b)) a.rel[b] = clamp(a.rel[b] + 1, -100, 100);
  g.nations.filter(n => n.ai && !n.dead).forEach(n => aiTurn(g, n));
  return checkVictory(g);
}
export function canResearch(n, id) { return !n.done.includes(id) && TECHS[id].r.every(r => n.done.includes(r)); }
export function startResearch(g, nid, id) { const n = g.nations[nid]; if (!TECHS[id] || !canResearch(n, id)) return { ok: false, msg: 'Prerequisites missing.' }; n.research = { id, prog: 0 }; return { ok: true, msg: `Researching ${TECHS[id].n}.` }; }
export function build(g, nid, ci, type) { const n = g.nations[nid], c = g.cities[ci], B = BUILD[type]; if (!B || c.nat !== nid) return { ok: false, msg: 'Not your city.' }; if (n.money < B.cost) return { ok: false, msg: 'Not enough money.' }; n.money -= B.cost; c.b[type]++; return { ok: true, msg: `${B.name} built in ${c.name}.` }; }
export function recruit(g, nid) { const n = g.nations[nid]; if (n.money < RECRUIT.money || n.iron < RECRUIT.iron) return { ok: false, msg: 'Need 150 money and 10 iron.' }; n.money -= RECRUIT.money; n.iron -= RECRUIT.iron; n.units += RECRUIT.units; return { ok: true, msg: '+5 units.' }; }
export function setTax(g, nid, t) { g.nations[nid].tax = clamp(t, .05, .5); }

const strength = (g, n) => n.units * (1 + bonus(n, 'army')) * n.morale / 100;
export function declareWar(g, a, b) { if (a === b || atWar(g, a, b)) return { ok: false, msg: 'Invalid.' }; g.wars.push({ k: key(a, b), t: g.turn });
  g.nations[a].trade = g.nations[a].trade.filter(x => x !== b); g.nations[b].trade = g.nations[b].trade.filter(x => x !== a);
  g.nations.forEach(n => { if (n.id !== a) n.rel[a] = clamp(n.rel[a] - 10, -100, 100); }); g.nations[b].rel[a] = -60;
  say(g, `${g.nations[a].name} declared war on ${g.nations[b].name}.`); return { ok: true, msg: 'War declared.' }; }
export function proposePeace(g, a, b) { const w = g.wars.find(x => x.k === key(a, b)); if (!w) return { ok: false, msg: 'Not at war.' }; const o = g.nations[b], me = g.nations[a];
  const ok = strength(g, o) < strength(g, me) * 1.2 || g.turn - w.t > 6; if (!ok) return { ok: false, msg: `${o.name} refuses: it believes it is winning.` };
  g.wars.splice(g.wars.indexOf(w), 1); me.rel[b] = o.rel[a] = -25; say(g, `Peace between ${me.name} and ${o.name}.`); return { ok: true, msg: 'Peace signed.' }; }
export function proposeTrade(g, a, b) { const A = g.nations[a], B = g.nations[b]; if (atWar(g, a, b)) return { ok: false, msg: 'At war.' }; if (A.trade.includes(b)) return { ok: false, msg: 'Already active.' };
  const s = B.rel[a] + (B.p.trade || .5) * 30 - (B.p.aggr || 0) * 10; if (s < 10) return { ok: false, msg: `${B.name} declines (relations too low).` };
  A.trade.push(b); B.trade.push(a); say(g, `Trade agreement: ${A.name} & ${B.name}.`); return { ok: true, msg: 'Trade agreement signed (+20 money/turn each).' }; }

export function attack(g, aid, ci) { const A = g.nations[aid], c = g.cities[ci], D = g.nations[c.nat];
  if (!atWar(g, aid, c.nat)) return { ok: false, msg: 'Not at war.' }; if (A.units < 3) return { ok: false, msg: 'Army too small.' };
  const supply = A.iron >= A.units * .3 ? 1 : .7; A.iron = Math.max(0, A.iron - A.units * .3);
  const att = strength(g, A) * supply * (.8 + rnd(g) * .4), def = strength(g, D) * (TERRAIN[c.terrain] + .1) * (.8 + rnd(g) * .4);
  const win = att > def, r = att / def;
  A.units = Math.max(1, Math.floor(A.units * (win ? .75 : .6))); D.units = Math.max(0, Math.floor(D.units * (win ? .55 : .8)));
  A.morale = clamp(A.morale + (win ? 8 : -10), 20, 100); D.morale = clamp(D.morale + (win ? -10 : 8), 20, 100);
  if (win && r > 1.3) { D.cities = D.cities.filter(x => x !== ci); A.cities.push(ci); c.nat = aid; c.happy = 40;
    if (!D.cities.length) { D.dead = true; g.wars = g.wars.filter(w => !w.k.split('|').includes(String(D.id))); } say(g, `${A.name} captured ${c.name}!`); return { ok: true, msg: `${c.name} captured!` }; }
  const m = `${A.name} ${win ? 'won' : 'lost'} the battle for ${c.name} (${r.toFixed(2)}x).`; say(g, m); return { ok: true, msg: m }; }

function aiTurn(g, n) {
  const ci = n.cities[Math.floor(rnd(g) * n.cities.length)];
  const need = n.ef < .9 ? 'plant' : n.food < 30 ? 'farm' : ['factory', 'mine', 'lab', 'farm'][Math.floor(rnd(g) * 4)];
  if (n.money > BUILD[need].cost + 150) build(g, n.id, ci, need);
  if (!n.research) { const o = Object.keys(TECHS).filter(t => canResearch(n, t)).sort((a, b) => TECHS[a].c - TECHS[b].c)[0]; if (o) n.research = { id: o, prog: 0 }; }
  if (n.money > 400 && n.iron > 20) recruit(g, n.id);
  const foes = g.nations.filter(o => !o.dead && o.id !== n.id && atWar(g, n.id, o.id));
  if (!foes.length && g.turn > 8 && n.p.aggr > .5) { const t = g.nations.filter(o => !o.dead && o.id !== n.id).sort((a, b) => strength(g, a) - strength(g, b) + (n.rel[a.id] - n.rel[b.id]) * .05)[0];
    if (t && strength(g, n) > strength(g, t) * 1.4) declareWar(g, n.id, t.id); }
  for (const f of foes) { const tc = [...f.cities].sort((a, b) => g.cities[a].pop - g.cities[b].pop)[0]; if (tc !== undefined && strength(g, n) > strength(g, f) * 1.1) attack(g, n.id, tc); }
}
export function score(g, n) { return Math.round(n.cities.reduce((s, i) => s + g.cities[i].pop / 1000, 0) + n.units + n.done.length * 15 + n.money / 100 + n.trade.length * 5); }
export function checkVictory(g) { const p = g.nations[0];
  if (p.dead) g.winner = 'Defeat: Aurelia has fallen.'; else if (g.nations.slice(1).every(n => n.dead)) g.winner = 'Military victory!';
  else if (p.done.length === Object.keys(TECHS).length) g.winner = 'Scientific victory!'; else if (p.money >= 20000) g.winner = 'Economic victory!';
  return g.winner; }

// ---- Save system: versioned, checksummed, never throws ----
const sum = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };
export function serialize(g) { const body = JSON.stringify(g); return JSON.stringify({ v: VERSION, meta: { turn: g.turn, nation: g.nations[0].name, time: Date.now() }, sum: sum(body), body }); }
export function deserialize(txt) { try { const f = JSON.parse(txt); if (!f || typeof f.body !== 'string') return { ok: false, err: 'Malformed save.' };
  if (f.v > VERSION) return { ok: false, err: 'Save is from a newer version.' }; if (sum(f.body) !== f.sum) return { ok: false, err: 'Save is corrupted (checksum).' };
  const g = JSON.parse(f.body); if (!Array.isArray(g.nations) || g.nations.length !== 4 || !Array.isArray(g.cities)) return { ok: false, err: 'Invalid save contents.' }; return { ok: true, game: g }; } catch (e) { return { ok: false, err: 'Unreadable save: ' + e.message }; } }

// ---- Event engine: events fire from real game state, with cooldowns (no identical repeats) ----
const EVENTS = [
  { id: 'famine', p: .2, when: (g, n) => n.food < 15 && n.stab < 55, fx: (g, n) => n.cities.forEach(i => g.cities[i].happy = Math.max(0, g.cities[i].happy - 10)), msg: 'Food crisis: hunger sparks protests.' },
  { id: 'blackout', p: .2, when: (g, n) => n.ef < .6, fx: (g, n) => { n.money *= .9; }, msg: 'Blackouts cripple industry (-10% treasury).' },
  { id: 'crash', p: .15, when: (g, n) => n.money > 2500, fx: (g, n) => { n.money *= .85; }, msg: 'Market crash wipes out 15% of the treasury.' },
  { id: 'oil', p: .04, when: g => g.turn > 5, fx: (g, n) => { n.money += 400; }, msg: 'Oil discovered: +400 money.' },
  { id: 'ore', p: .04, when: g => g.turn > 5, fx: (g, n) => { n.iron += 40; }, msg: 'Rich iron seam found: +40 iron.' },
  { id: 'breakthrough', p: .05, when: (g, n) => !!n.research, fx: (g, n) => { n.research.prog += 15; }, msg: 'Scientific breakthrough: +15 research.' },
  { id: 'drought', p: .05, when: g => g.turn > 10, fx: (g, n) => { n.food *= .5; }, msg: 'Drought halves food stocks.' }];
function runEvents(g, n) { g.cd ??= {}; for (const e of EVENTS) { const k = n.id + ':' + e.id; if ((g.cd[k] || 0) > g.turn || !e.when(g, n) || rnd(g) > e.p) continue; g.cd[k] = g.turn + 12; e.fx(g, n); say(g, `${n.name}: ${e.msg}`); } }
