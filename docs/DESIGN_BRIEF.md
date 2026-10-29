# The Fred Verse — design constraints

This summarizes the user-provided design handoff for the project. The original raw handoff and reference media remain in private session attachments; they are not redistributed with the game.

## Confirmed requirements

- Exact title: **The Fred Verse**. Detailed 2D pixel-art RPG, never 3D.
- Consistently retro presentation, including font, HUD, inventory, item icons and world. Inventory/build choices must be substantial. Avoid the original sparse corporate-dashboard look.
- Use the user's supplied Fred character art by default. Alpha 0.3 embeds a prepared transparent derivative of the inline 53-pose atlas, with measured frame bounds, rather than pretending the original PNG was retrieved. An original PNG should replace that derivative if supplied. Do not revert the player to the crude block placeholder.
- Recognizable Hope International University, Fullerton. Every player is a Fred variant. Solo-complete play and LAN co-op are fundamental.
- Exploration, real-time combat, Nerf / lightsaber / baseball bat weapon families, equipment, upgrades, levels, healing, party support, titles, quests and professor encounters.
- Professor encounters are original nonlethal fictional challenges; professors are not depicted as evil and remain characters after victory.
- Paul Alexander is especially important and reserved for the culminating major boss. Use Paul Alexander, President Alexander, President Paul Alexander, Big P or The President; never the given name alone.
- Christian-compatible fictional equipment abilities: no faith stat, sacred-text attacks, purchasable spiritual resources, occult mechanics or invented doctrine.
- Campus layout must follow supplied evidence. Clearly label approximate floorplans and art. Large interiors scroll under independent cameras.
- Preserve Fred’s core visual features from references: slim silhouette, glasses, brown hair, facial stubble, dark clothes, skinny jeans, black sneakers and dark chain. Do not turn subjective personal roasts into facts.
- Create an original RPG. Do not reproduce Tweakin’ branding, dialogue, roster, exact balance or wanted-system loop.

## Current reversible implementation defaults

Primary delivery: self-contained browser HTML, Canvas rendering, and one authoritative JavaScript simulation. Solo runs locally without Python, internet or external assets. Browser co-op uses manual WebRTC invite/reply codes, with a host browser simulating up to four Freds. Actual WebRTC connections remain unverified because managed Chromium exposes no candidates; do not claim they passed. The previously tested Python 3.12 HTTP-hosted prototype remains an optional legacy fallback at web/legacy, with separate saves.

Dorm Fred and MLB Fred; Alpha dorm, map-relative campus, scrolling gym/chapel. Robbie Phillips Three-Point Practice is a provisional introductory encounter. The first chapter ends after remote recovery, practice, a gear upgrade and an early meeting with Big P near the chapel stage. This is a first chapter, not the complete professor progression or final fight. Browser saves are version 2 with validation, export/import and storage-denied fallback. See README.md for exact verification and deployment limitations.

Gear uses head, body, pants, shoes, accessory and backpack slots, with a 24-cell visual bag, comparisons, consumables, idempotent dorm supply pickups and per-item reinforcement. The player's prepared sprite atlas is embedded, while faculty and environmental art remain provisional. The font is embedded Pixelify Sans under SIL OFL. Royal Arts / Focus terminology, numerical balance, variants, titles and new dialogue remain provisional. No canon explanation for Fred variants, exact dorm ownership, professor routines or Uzi’s story is established.

The user also requested Google Maps / Street View research for exterior realism. Google Maps access returned proxy CONNECT 403; required Google domains were saved in the environment network draft. Do not claim those services were inspected until the network update is applied and a real inspection succeeds. In the meantime only the supplied campus map, photos and videos establish geography.

## Exterior map constraints

Nutwood Avenue north; Titan Drive west of academics; Commonwealth Avenue east; College Place south. Alpha/Omega residences and pool lower-left; Darling Library near the upper center; Nutwood West northwest; Pacific Auditorium northeast; Nutwood East east; Darling Pavilion and Lawson-Fulton Student Center south/southeast. A Nutwood West, B Pacific Auditorium/Grana Chapel, C Darling Library, D Nutwood East, E Darling Pavilion, F Lawson-Fulton Student Center, G Omega, H Alpha. Do not use retracted Hartford/Newkirk labels.

## Deferred catalog and open decisions

The original handoff proposed additional variants, weapon variants, six armor slots and sets, faculty progression, mastery, storage, trading, transmog, more quests, routines, and broader cooperative mechanics. These are future design candidates, not implemented features. Final story, origin of variants, exact interiors, professor likenesses, boss order, level cap and numerical balance remain open. See README.md for implemented behavior, verification and limitations.
