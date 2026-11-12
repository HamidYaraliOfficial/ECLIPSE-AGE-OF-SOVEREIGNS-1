# ECLIPSE: AGE OF SOVEREIGNS
**English** | [فارسی](README.fa.md) | [中文](README.zh.md)

A 3D grand-strategy game in the browser (Three.js, no build step). Created by **Hamid Yarali** — https://github.com/HamidYaraliOfficial

## Status: vertical slice v0.1 (honest scope)
Implemented and tested: 3D globe with orbit/zoom/city selection and camera fly-to, 1 player nation + 3 AI nations, 5 cities, economy (money, food, iron, energy, population, happiness, taxes), 8-tech branching tree, recruiting, auto-resolved battles (tech, morale, supply, terrain), diplomacy (trade deal, war, peace — AI remembers), AI that builds/researches/recruits/declares war/attacks, victory conditions (military, scientific, economic), save/load (3 slots + autosave, versioned and checksummed, corrupt saves rejected safely).

**Not implemented yet (so not shown in the game):** real-time 3D tactical battles, weather, espionage, internal politics/factions, 200+ techs, 40+ countries, audio, multiplayer, debug panel. See the roadmap in your original spec; each system is meant to become a new module next to `src/sim.js`.

Graphics: HDR bloom, filmic tone mapping, procedural terrain with bump mapping, city lights on the night side, animated clouds, atmosphere shader, day/night cycle, pulsing territory rings, animated trade (gold) and war (red) routes, cinematic intro. Also: dynamic event engine (state-driven, with cooldowns) and adaptive procedural audio.

## Run
```
npm start        # or: python3 -m http.server 8080
```
Open http://localhost:8080 (internet needed once for the Three.js CDN). Space = end turn.

## Test
```
npm test         # 12 automated tests (economy, tech, combat, diplomacy, AI, save/load)
```
## License
All rights reserved © 2026 Hamid Yarali. See [LICENSE](LICENSE).
