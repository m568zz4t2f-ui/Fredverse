# The Fred Verse

A playable early **2D pixel-art action RPG** prototype set in an approximate Hope International University campus. All players are Fred variants. Solo and 1–4-player local-network co-op use the same host-authoritative simulation. Original fictional game; not endorsed by HIU. Professors are nonlethal fantasy practice encounters, not villains.

## Run / host

Requires **Python 3.12 or newer** and a modern browser. No packages, Node build, accounts, internet, or external assets are required.

**Download from GitHub:** choose **Code → Download ZIP**, extract the ZIP, then double-click `PLAY_WINDOWS.bat` on Windows or run `sh PLAY_MAC.command` on macOS. Install Python 3.12+ from python.org first if you do not have it. The launcher starts the host and opens the game in your browser. Keep its terminal window open while playing. Opening `web/index.html` directly does **not** run the game; it needs the host.

```sh
cd /workspace/Fredverse  # or your local checkout directory
python server.py
```

On the host computer open its loopback address on port 8000 in a browser. For LAN play, other devices open **the host computer's actual LAN IPv4 address on port 8000**. Choose a name and Dorm Fred or MLB Fred. Both can use all three weapons and complete the slice alone. Four connected characters total, including the host. A guest browser does not need Python or project files.

The host listens on all interfaces by default. Allow inbound **TCP 8000** on a trusted local network. For a host restricted to its own computer:

```sh
python server.py --host 127.0.0.1
```

Optional discovery on a second computer with this checkout:

```sh
python server.py --discover
```

Discovery uses UDP broadcast on port 47654. Guest Wi-Fi, network isolation, or firewalls may block it. Direct-address joining does not depend on discovery. Use `--port 8010` for a different port and `--save /path/to/world.json` for a separate world. This HTTP host is for trusted LANs, not public internet deployment. No deployment or publication was performed.

## Play the slice

1. Start in an approximate Alpha shared dorm room. Walk north then east to the TV-side remote; press **E** nearby to complete the preparation quest. Bunks and large furniture have collision. The assignment of this room and belongings to the player is fictional, not a claim about a real room's ownership.
2. Walk south to the door, press E, and open **M** for the campus map. From Alpha, follow the main path north and then east to **E: Darling Pavilion**. Approach its south door and press E.
3. Approach the gym practice marker and press E to ready. All living Freds currently in the gym must ready. Solo starts immediately. Capacity and encounter difficulty freeze at this point. Guests arriving during practice wait outside for the next encounter.
4. Complete **Robbie Phillips · Three-Point Practice**. This is a provisional original encounter, not a depiction of real conduct or a verified place where he teaches. Red circles telegraph danger. Move or dodge; guard reduces damage. Switch between foam darts, quick blue-saber strikes, and committed wide bat swings. All three weapons work. Aiming matters.
5. Earn XP, three practice materials, the Chain of Personal Space, and **An Hour Early**. Return to Alpha, equip gear with I, and spend materials on a workbench upgrade. Two Personal Space pieces grant a shield after a successful guard. Repeat the encounter with a different build. At 120 total XP, level increases; each level adds 2 power.
6. Visit **B: Pacific Auditorium** for an early fictional introduction to **Big P — The President**. Paul Alexander's culminating boss encounter is deliberately not implemented in this first chapter.

### Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Mouse | Aim |
| Left click / hold J | Attack |
| Right click / hold K | Guard |
| Space | Dodge: 12 Focus, brief invulnerability |
| Q | Personal Space: 25 Focus, area attack and nearby friendly shield / Focus restoration |
| H | Emergency Chips: heal 38, three supplies per rest |
| R | Reload eight Nerf darts, 1.3 seconds |
| 1 / 2 / 3 | Nerf / lightsaber / baseball bat |
| E | Interact, enter/exit, rest, ready |
| Hold E while stationary near a downed Fred | Revive over 2.5 seconds; movement, attacking, distance, or damage interrupts |
| I / M | Equipment / map |

Touch devices have a directional pad, attack/guard/interact buttons, and ability buttons. Movement sets touch aim; weapon switching and inventory are below the viewport. Keyboard/mouse is the primary initial delivery choice; no controller support yet. Desktop aim follows the mouse; keyboard-only aim follows movement until the mouse is used. Losing window focus clears held controls.

**Dorm Fred** has a longer Personal Space shield. **MLB Fred** gains five bat damage and starts in a red jersey. All basic gear and three weapon families are available to both. Nerf has a magazine and real projectiles; saber has shorter reach and quick recovery; bat has a wider arc, longer reach, heavy hits, and longer commitment. These starter numerical values and variant names are reversible defaults.

## Saves and multiplayer behavior

- Host owns the world and every character, stored in ignored `data/world.json`. Save format version 1. Writes use an atomic replacement after flushing the temporary file. Important actions save immediately; movement saves every five seconds; clean shutdown saves. Save errors appear in the HUD. Preserve this folder when moving the host.
- A private rejoin token lives in browser local storage, scoped to the host address and port. Use the **same browser, host address and port** to resume a Fred. Clearing browser storage loses access to that character; guest export/import, account recovery, and character selection are not implemented. No real identity information is needed.
- The host simulates movement, collision, health, Focus, cooldowns, projectiles, gear, quest credit, boss state and rewards at 30 Hz. Browsers send controls and poll snapshots around 12 Hz; rendering interpolates positions. Clients cannot assign damage, coordinates, rewards, or health. This is actual HTTP multiplayer, not simulated party members or client-resolved combat. Rejoin tokens never appear in shared snapshots.
- After five seconds without controls, the host marks the guest offline and frees the slot. Stale controls stop movement and attacks after half a second. An expired session rejoins at Alpha with health and gear preserved; a quick browser reload resumes the existing active session. Reload/rejoin never revives a downed Fred. Interrupted world encounters reset on host restart; character health remains saved.
- Encounter participants, boss health scaling, and simultaneous hazard count freeze at start. All encounter participants receive personal rewards, including a participant briefly disconnected at victory. This is a generous prototype credit rule. First remote recovery and title unlocks are idempotent; repeating a newly started practice intentionally gives more XP/materials. There are no enemy/student loot farms.
- Friendly fire and player collision are off. Personal Space helps the caster and nearby Freds. A stationary living teammate can revive a downed Fred. When nobody in the encounter is alive and online, the challenge resets; players may recover at Alpha with equipment intact. No irreversible item loss, free mid-boss reconnect revival, or mandatory multi-person mechanic.
- JSON inputs are size/type checked, same-origin browser writes enforced, and commands validated. This is a trusted-friends LAN prototype, not production anti-cheat or an internet-hardened service. No accounts, cloud backend, host migration, or public matchmaking.

## Verification

```sh
python -m unittest -v
node --check web/game.js  # optional syntax check when Node is installed
```

The three standard-library checks cover a collision-aware solo trip from Alpha to the gym and back; the remote quest; boss completion using all three weapon families; shared buffs; four-player ready checks/scaling; downed/revive interruption; disconnect/reset/rejoin; personal rewards without duplicate completion; gear upgrades and save reload; rejected invalid controls; and **two real HTTP clients** agreeing on host state and equipment. Socket tests require permission to bind loopback ports.

Additional Chromium checks in this environment exercised keyboard movement, weapon switch, gear equip, map, three independent browser contexts, party state, browser-reload rejoin, and the 390px touch layout with no page errors. These are local checks. **Independent physical LAN devices, broadcast discovery across a real LAN, and device-to-device latency have not been verified.**

## Art, references and scope

- The user-provided handoff is summarized in `docs/DESIGN_BRIEF.md`; the original remains in the private session attachments. Confirmed requirements and proposed catalogs remain distinct. The supplied campus-map image establishes relative exterior placement: residences lower-left, academics upper-right, Pavilion/Student Center lower-right, Nutwood north. Footprints, distances, roads and playable floorplans are approximate. This is not an architectural reconstruction or navigation guide.
- Accessible references: `IMG_1885.MOV`, `IMG_1880.MOV`, `IMG_6258.HEIC`, `IMG_9166 2.HEIC`; map, campus photographs and a Fred atlas displayed in chat. The videos and HEICs were inspected. Original reference media remain outside this checkout. Watermarked photographs were not redistributed as game textures.
- The PDF and most historical photos/atlases named in the handoff are **not present in this workspace**. Library IDs are not usable local file paths. The inline atlas is visible for reference but has no downloadable file binding here.
- Campus, furniture, Freds, professor figure and effects are original **procedurally drawn placeholder pixel art** with nearest-neighbor rendering. Campus glass, angular roofs, wooden bunks, mirrored closet, beige carpet, yellow suitcase and lived-in objects draw from references. The final desired likeness/detail is not complete. Professor sprite is not a likeness.
- The Sprite dialog can locally preview a PNG/WebP of the supplied atlas (10 columns; first five directional rows; row pitch 1.0625 × cell width). It is session-only and is not uploaded or replicated. It does not yet support action frames, per-player art, persistence, or equipment overlays. Final atlas integration needs the actual file and verified slicing.
- Alpha, gym and chapel are scrolling playable spaces. Gym and chapel extend beyond a screen. Other building exteriors are present; their interiors are deferred. The gym/chapel floorplans and objects are approximations. No exact room number, room ownership, professor routine, campus schedule, origin of variants, Uzi story, or supernatural explanation was invented as fact.
- Combat uses sporting/foam equipment and fictional Focus-based abilities. Faith, Scripture, prayer and worship are not damage spells, currencies or stats. Professor practice is nonlethal. Real-life subjective roasts are not character facts.

### Unfinished after this first slice

Final detailed sprite/portrait art and action animations; map-accurate footprints and verified interiors; additional floors/quests/faculty; the full Paul Alexander progression and culminating boss; additional weapon variants; crafting and mastery depth; six armor slots (current slice has body/shoes/accessory), storage, trading, transmog and outfit/build presets; expanded solo/party interactions and map pings; gamepad; physical LAN validation and a friendlier discovery UI. Campus NPC routines, final story and the full proposed catalog remain design work. No claim is made that the complete RPG in the handoff is finished.
