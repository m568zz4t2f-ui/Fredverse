# The Fred Verse · browser edition

**Download `The-Fred-Verse.html` and open it in a modern desktop browser.** No Python, terminal, npm, account, internet, or external assets are required for solo play. It is a self-contained, roughly 94 KB game. `index.html` is the same build, ready for static hosting.

[Download the HTML](https://github.com/m568zz4t2f-ui/Fredverse/raw/refs/heads/main/The-Fred-Verse.html) · [Source ZIP](https://github.com/m568zz4t2f-ui/Fredverse/archive/refs/heads/main.zip)

Use the browser's actual HTML page, not a file manager's preview. On iPhone/iPad, use a hosted HTTPS page in Safari; Files/Quick Look may display an attachment without running JavaScript. Desktop direct-file play is the intended downloadable target. If browser policy blocks local files, use a static hosted copy.

## Play and share

1. Save the HTML to your computer and open it in Chrome, Edge, or Firefox.
2. Choose **New game** and a Fred variant. Later choose **Continue your Fred**.
3. Send a friend the same HTML file. The in-game Menu also has **Download this HTML**.
4. To share a play link, publish the static build as described below. A GitHub source page or raw download is not itself a hosted game page.

### GitHub Pages

The repository already has a standalone **`index.html` at its root**. In the repository's **Settings → Pages**, choose **Deploy from a branch**, **main**, **/ (root)** and save. Wait for GitHub's deployment to complete, then use the actual **Visit site** link GitHub provides. No build command, backend, or environment secrets are needed. Enable Pages only when you intend the game to be publicly accessible; availability depends on the repository/account plan.

**Publication is not confirmed.** This task could push repository files, but GitHub Pages API access returned `Forbidden`. No hosted play URL is asserted as verified. Uploading `index.html` to another ordinary static HTTPS host also works; no runtime Python server is involved.

## A complete first chapter

An original 2D pixel-art RPG prototype at an approximate Hope International University in Fullerton. Every playable character is a Fred variant. This is fictional, not an official or endorsed HIU game. Professors are nonlethal practice encounters, not villains.

- **Dorm Fred**: longer Personal Space shield. **MLB Fred**: stronger bat swings, red jersey. Both can use all weapons and finish solo.
- Find the remote beside the TV in Alpha: walk north, then east. Press **E** nearby. It remains safely at the dorm.
- Exit the south door. Open **M** to find **E: Darling Pavilion**, north/east of Alpha. Enter its south door, approach the practice marker and press E. Solo starts immediately; all living Freds in the gym must ready for a party encounter.
- Complete **Robbie Phillips · Three-Point Practice**. Red circles telegraph danger. Move, guard, or dodge. Nerf shoots magazine-fed foam projectiles, saber has quick narrow swings, and the bat has a wider, heavier committed attack. All three work against the practice boss.
- Earn 90 XP, three practice materials, a Chain of Personal Space, and **An Hour Early**. Return to Alpha, open equipment and upgrade at the workbench. Two Personal Space pieces grant a shield after a successful guard.
- Visit **B: Pacific Auditorium / Grana Chapel** and interact to meet **Big P — The President**. With the practice and upgrade done, finish chapter one: earn 35 XP and **Prepared for Convocation**. This is fictional dialogue. Paul Alexander's culminating boss is reserved for later story progression, not trivialized here.
- Repeat the practice with another build or friends. A first quest/chapter/title unlock cannot award twice; newly started repeat practices intentionally award more XP/materials.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim; keyboard-only aim follows movement until mouse use |
| Left click / hold J | Attack |
| Right click / hold K | Guard |
| Space | Dodge: 12 Focus, brief invulnerability |
| Q | Personal Space: 25 Focus, area attack, nearby allied shield/Focus |
| H | Emergency Chips: heal 38; three supplies per rest |
| R | Reload eight darts, 1.3 seconds |
| 1 / 2 / 3 | Nerf / saber / bat |
| E | Interact, enter/exit, rest, ready |
| Hold E near a downed Fred while stationary | Revive over 2.5 seconds; movement, attack, distance or damage interrupts |
| I / M / Escape | Equipment / campus map / menu |

Touch controls include movement, attack/guard/interact, reload, weapon switching, equipment and abilities without scrolling to the sidebar. Touch aim follows the directional pad. No controller support yet. Menu settings adjust pixel scale and camera smoothing. Solo pauses in menus or when hidden; a multiplayer host keeps running while menus are open. Background tab throttling can slow co-op: keep the host in the foreground.

## Saves

- Browser save format **version 2**, separate from the old Python prototype. Autosaves on important actions, every five seconds and on page hide when possible. Continue restores at Alpha with health and progression preserved; an interrupted practice resets.
- **Menu → Export save** downloads a JSON backup. **Import save** validates its version, size, identity, equipment, numerical bounds and duplicate keys before replacing anything. Existing progress requires confirmation before replacement. New Game also asks before replacing a world.
- Local storage is browser/address dependent, especially for `file://`. If unavailable or full, the game still plays in memory and shows **MEMORY ONLY · EXPORT YOUR SAVE**. Export before closing. Export/import is the supported way to move solo worlds between addresses/devices.
- Multiplayer world and characters belong to the host. Its export contains the full world and guest rejoin keys: keep backups private. Guest-only character export/import and account recovery are not implemented.

## Browser co-op: experimental, not yet connection-verified

The HTML includes **real WebRTC DataChannel code** using the same JavaScript simulation as solo. There is no fake party, public relay, Claude API, signaling backend or STUN/TURN dependency. It targets 1–4 players on the **same reachable local network**.

1. Host starts/continues a game, opens **Invite a Fred**, and creates an invite.
2. Guest opens the same HTML or hosted game, chooses **Join a Fred**, pastes the complete invite and creates a reply.
3. Guest sends the entire reply privately; host pastes it and clicks **Accept reply**.
4. Repeat with a new invite for each guest. Keep the host browser open/in the foreground. There is no automatic LAN discovery or short room code. Invitations expire after two minutes if not completed.

The host resolves positions, collision, HP, Focus, cooldowns, projectiles, boss mechanics, inventory and rewards. Guests only send validated controls with increasing sequence numbers. Session snapshots do not expose other characters' private rejoin keys. Host/guest characters have independent cameras, personal rewards and friendly fire off. Encounter participants/difficulty freeze at start, shared shielding and revives work in the simulation, and all-down/disconnect resets unblock a challenge. Returning guests exchange fresh codes; their host-owned health persists, preventing reconnect revives.

**Connection limitation:** local cloud Chromium is configured to disable non-proxied WebRTC UDP and generated **zero ICE candidates**. The connection test could not run here. The UI now reports that failure instead of displaying an unusable invite. **Do not call browser LAN co-op verified** until `test_browser.py --rtc-only` succeeds on normal browser/network devices. Separate physical LAN devices and mobile Safari/Firefox remain untested. Networks with peer isolation, restrictive browser policy or blocked WebRTC may not connect. Try static HTTPS hosting if a downloaded-file origin prevents WebRTC; different networks may need future signaling/STUN/TURN work.

### Optional legacy multiplayer fallback

The previous Python-hosted prototype is preserved at **`web/legacy/`**. It remains independent from the new browser save format and first-chapter extension. It is a fallback for developers/friends who want the previously tested HTTP co-op, **not a prerequisite for the standalone game**.

With Python 3.12+ installed, `python server.py --open` (or `PLAY_WINDOWS.bat`) opens the legacy client. LAN guests visit the host's actual LAN IP, TCP port 8000, **`/legacy/`** path. Host must permit inbound TCP 8000 on a trusted network. Its saves remain in ignored `data/world.json`, format 1. Optional `python server.py --discover` uses UDP 47654. Never expose this trusted-LAN prototype as an internet server. A running server is not required for the new HTML. Python HTTP co-op tests still run separately.

## Source and developer checks

- `web/core.js`: one authoritative JavaScript simulation, used solo and by the browser host.
- `web/session.js`: local saves, validation, WebRTC invite/reply and network transport.
- `web/game.js`, `web/style.css`, `web/index.html`: renderer, art and UI.
- `build.py`: developer-only dependency-free HTML packager. Players never run this.
- `The-Fred-Verse.html`, `index.html`: generated self-contained builds checked into GitHub.
- `server.py`, `test_game.py`, `web/legacy/`: optional prior Python HTTP prototype.

```sh
node test_core.js
python build.py --check
# Optional browser checks require Playwright and installed Chromium:
python test_browser.py --solo-only
python test_browser.py --rtc-only
# Optional legacy regression checks:
python -m unittest -v
```

Run `python build.py` after editing browser sources. It embeds all CSS and three classic scripts with no module imports or runtime file fetches. On a development machine, any static HTTP server can serve the root `index.html`; no `/api` routes are used by the new game.

### Verification outcomes

- **Passed:** JavaScript simulation completes a collision-aware solo journey from Alpha through all three weapons, practice, upgrade, chapel and chapter ending. Save roundtrip preserves health/progression and rejects invalid/duplicate data. Four-player simulation checks cover ready/scaling, party shields, interrupted revive, disconnect/downed rejoin/reset, personal credit and input validation.
- **Passed:** Chromium runs the exact standalone HTML served as a static page, then networking is disabled. A real-time UI-input walkthrough completes the chapter. Weapon switching, gear, pausing, export/import, reload/Continue, self-download/reopen, 390px mobile layout and memory-only storage fallback pass without uncaught page errors. No external assets or requests are required.
- **Blocked/unverified:** actual `file://` navigation is blocked by managed browser policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). The browser test does not bypass that policy; direct-file launch in a normal desktop browser remains unverified in this environment.
- **Blocked/unverified:** real WebRTC connection test produces zero candidates under enforced browser policy; no browser multiplayer pass is claimed. Physical LAN and cross-device latency remain untested.
- **Passed previously:** the Python prototype's two HTTP clients agreed on shared boss combat, rewards, healing and rejoin. These results do not prove browser WebRTC works.
- **Unverified:** public HTTPS deployment/GitHub Pages; API access was forbidden. The root build is prepared for static hosting.

## References and remaining work

`docs/DESIGN_BRIEF.md` summarizes confirmed requirements. The original handoff/reference media remain in private session attachments. Videos `IMG_1885.MOV` and `IMG_1880.MOV`, dorm photo `IMG_6258.HEIC`, and likeness photo `IMG_9166 2.HEIC` were inspected; a campus map, campus photographs and sprite atlas are visible in chat. Historical PDF/atlas files listed in the original brief are not in the checkout. Inline images do not have a usable local file binding here. No watermarked photos were redistributed as game textures.

Campus/furniture/Fred/professor art is original **provisional procedural pixel art**, not final detailed likenesses. The Sprite preview still requires an actual PNG/WebP atlas, assumes the earlier sheet's directional layout, is local/session-only, and does not establish verified slicing, multiplayer art replication or final action-frame integration. Final art requires the source asset and frame inspection.

Exterior placement follows the supplied map: residences/pool lower-left, academics upper-right, Pavilion/Student Center lower-right, Nutwood north. Angular roofs/glass and room details reference the supplied images. Footprints/interiors are approximate, not real floorplans. Alpha, gym and chapel are enterable scrolling spaces; other interiors are deferred. No real room ownership, professor routine, sacred combat system, Uzi origin or multiverse theology is asserted.

Still unfinished: final detailed art and animation; verified interiors/additional floors; more quests/faculty and the full Paul Alexander progression; weapon variants, broader mastery/crafting, full six-slot armor, storage/trading/transmog/build presets; character export/recovery; controller support; real-device LAN/phone validation; optional easy room-code infrastructure. The first chapter is playable; the full RPG catalog is not claimed complete.
