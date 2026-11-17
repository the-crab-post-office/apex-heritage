# Season roster and original livery artwork

**0.9 local exception/update:** Eau Rouge/Raidillon now uses a geographically anchored, photo-guided modern climb and the same local kerbs/paved apron/barriers for all eras, explicitly requested by the user. 1967 and 2023 car silhouettes are revised with shared web/native meshes. These are authored approximations, not surveys or scans. See [PHOTO-REFERENCE-NOTICE.md](PHOTO-REFERENCE-NOTICE.md); the remaining historical-layout limitations below still apply.

Reference review: 8 November 2026. Independent unofficial prototype; no affiliation or endorsement.

## Scope

`roster.json` is the authoritative constructor catalog shared by Rust and both clients. Seasons: 1967 (9), 1988 (18), 2004 (10), 2021 (10), 2023 (10). The 1967 set includes LDS but excludes Formula Two guest entries, duplicate privateer entrants and engine variants as separate constructors. Each constructor has one representative chassis/number/livery. This is not a driver-entry database or every race-specific paint variant. All 1988 constructors are selectable, including prequalifying teams; naturally aspirated entries have no turbo lag/boost. Handling is illustrative game balance, not historical measured performance.

## Reference sources

Season entrant lists are linked in `roster.json.sources`; individual car references are retained in each team's `reference` field and in the generated atlas manifest. Additional visual checks:

- AGS JH23: https://formula143.org/2022/01/19/1988-ags-jh23-streiff/ — navy/orange, Bouygues/Tennen/elf markings.
- Osella FA1L: https://www.f1technical.net/f1db/cars/622/osella-fa1l — navy/yellow, Fondmetal/Stievani.
- EuroBrun ER188: https://formula143.org/2022/01/19/1988-eurobrun-er188-larrauri/ — white/black/red, red rims, Vogue/Darwin.
- LDS Mk3: https://formula143.org/2021/04/23/1967-lds-mk-3-tingle/ — green/yellow nose, roundel.
- Minardi M188: https://f1technical.net/f1db/cars/621/minardi-m188 — navy/yellow.

Some reference views depict scale models, not primary race photographs. They inform broad colour/marking cues; they do not establish exact dimensions or all race variants. Numbers, sponsor positions, logos and paint schemes varied during seasons.

## Production and limitations

57 original 2048×1024 paletted PNG atlases are generated offline with Pillow by `scripts/build-liveries.py`. No scraped photograph pixels, downloaded decals, corporate vectors, game/mod textures or third-party car meshes are copied. Colour panels, nose numbers, sponsor lettering, simplified motifs, pinstripes and fastener rows are original authored reconstructions. Lettering uses DejaVu Sans Bold, not exact corporate typefaces; its complete license is retained in `scripts/fonts/LICENSE-DejaVu.txt` and web/native release notices. The font itself is bundled only in source; runtime uses rasterised lettering.

Cars share a stylised chassis per era rather than distinct scanned constructor chassis. Atlas placement is an approximation and can stretch on tapered surfaces; not every real marking is reproduced. Web covers body, pods, wing/endplates and tyre-sidewall bands; native covers body/pods, modern conformal decal regions and a rear-wing panel with simpler remaining surfaces. Era engine sounds remain illustrative and are not recordings of all 57 constructor-season entries. Do not describe these as museum-accurate licensed replicas or photorealistic scans.

## Rights

Team, sponsor, manufacturer and tyre names/marks belong to their respective owners. Original reconstruction does not remove trademark, trade-dress, publicity, advertising or other rights. Historic tobacco/alcohol branding can require additional jurisdiction-specific review. No permissions are represented as obtained. Public/commercial distribution may require permissions and legal review. The project's MIT code license does not grant third-party brand rights. Reference images are not redistributed.

Historical road/scenery reconstruction remains unfinished, with labelled recent-layout substitutions. See `CORNER-DETAILS-NOTICE.md` and the existing asset-specific notices; this car/menu update does not change those disclosures.


## 0.13 — full 2021 grid and modern livery refinement

There are now **57 original atlases across five eras** (9 / 18 / 10 / 10 / 10; 2021 is index 4 to preserve older saved setup/record IDs). The 2021 grid uses the photographed Austrian GP driver numbers and season-specific palettes: black/silver/turquoise W12, navy/red/yellow RB16B with Red Bull sidepod lettering rather than 2023 ORACLE, red/burgundy SF21, green/pink AMR21, papaya/blue MCL35M, blue/red/white A521, white/blue/cyan FW43B, white/navy AT02, white/red C41, white/red/blue VF-21. Other modern atlases were also reworked; 2023 keeps its own paint schemes.

New alpha-backed sponsor and race-number regions are conformally placed on the modern sidepods and engine covers, with side-dependent unmirrored UVs. Wheel sidewall UVs are restricted to the tyre region rather than sampling those decal strips. Team-specific body proportion variants affect native and browser mesh positions consistently. Paint/rubber/rim materials have different finishes, including more matte Red Bull/Ferrari paint and a more reflective W12/AMR21 finish. Native remains visually simpler and lacks browser PBR lighting.

The ten downloaded reference photographs are **not** atlases and are never applied to the cars. They are separately licensed CC BY-SA 4.0 works by Lukas Raich, displayed only in the offline comparison HTML. Exact attribution/processing/checksums: `CAR-REFERENCE-PHOTOS.md`, `car-references.json`. Game captures in that HTML use actual production car meshes/materials. Sponsor text uses original DejaVu-based lettering and stylized motifs, not official corporate vectors. Chassis, fine aero, partner inventories and positions remain approximate; this is not a licensed exact replica or verified scan conversion.
