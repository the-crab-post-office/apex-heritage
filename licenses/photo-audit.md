# Broad photograph audit — 0.14

## Photographs and rights

`photo-audit-references.json` records fifteen individually credited reference photographs: ten circuit views and five representative car eras. Fourteen newly retained JPEGs are in `photo-audit-images/`; the 2021 Red Bull photograph reuses the existing licensed Lukas Raich image in `car-reference-images/`. Every entry records the source file page, original image URL, author, individual Creative Commons license and link, date field, local checksum, processing, observation, implementation and remaining uncertainty.

The photographs were resized to fit 960 × 640 and JPEG-recompressed, without retouching. Resized adaptations retain their individual original licenses (CC BY / CC BY-SA 2.0–4.0 or CC0, as specified per entry). They are embedded beside actual production captures in `photo-accuracy.html`. They are **not car, track or scenery textures**. Original code/geometry/screenshots are separate works in this collection; no photographic pixels enter the authored game atlases. Credits and license/source links remain visible per image, including in the offline HTML.

The supplied `image-8.png` is a racing-game view. It guides the desired La Source composition, not real-world measurements. Additional La Source aerial images were reviewed through https://nl.pinterest.com/pin/372461831689721859/ and https://www.reddit.com/r/formula1/comments/1m3a6aw/aerial_view_of_the_preparations_at/ . Their capture dates/redistribution permissions were not independently established. Those pixels are **not included in the project or release packages**; only the separately licensed Commons photographs are embedded in the audit page.

## What was changed

- **Wheel wobble:** independent Y-steering hub and X-spinning tyre. The old single XYZ Euler combined both and changed the axle direction with wheel phase. Player and AI now use the same bounded spin/radius helper. This is a rendering correction, not a new tyre-force model.
- **1967:** smaller front than rear tyre radii, with matching shared contact support; dark representative Lotus helmet. Original wingless/open-engine/cigar-body treatment retained.
- **1988:** narrower shared track/tread, 0.33 m nominal tyre radius, lower sidepods/driver/hoop and smaller wings; white McLaren sidepods with red upper/rear treatment, yellow representative Senna helmet and unmirrored conformal period sponsor patches.
- **2004:** narrower shared track/tread, estimated 3.05 m wheelbase, 0.33 m nominal radius, smaller wings and pinched rear sidepods; revised Ferrari white/red panel placement, red representative Schumacher helmet and conformal period sponsor patches. Four dry-tyre grooves retained.
- **2021 / 2023:** rear-wing assemblies lowered to approximately 0.95 m top; existing ten-team 2021 liveries and 2023 wheel covers retained. Dark representative Verstappen helmet for 2023.
- **Spa / La Source:** recent-surface paved outer escape area and short apex/exit kerbs, with consistent modern red/yellow paint. Legal track centreline/white-line width and pit routing are unchanged; this is not a full reconstructed variable-width hairpin. Existing user-selected all-era Eau Rouge geometry is preserved.
- **Monza / Rettifilo:** separate right/left apex kerbs, exit kerb and green adjacent paving.
- **Silverstone / Vale–Club:** separate left/right apex/exit windows and a green apron.
- **Interlagos / Senna S:** separate left/right apices, green/yellow kerbs and green apron.
- **Hockenheim / Spitzkehre:** blue/white kerbs and a shorter hairpin apex window.
- **Monaco, Suzuka, Imola, Nürburgring GP and Montréal:** photographs reviewed; existing mapped facilities/surfacing retained rather than moving them on insufficient evidence. Each retained decision and uncertainty appears in the page and manifest.

All new track changes affect **only the latest surface profile**, also used as an explicitly labelled substitute for the 2021 car selection. The previous three historical surface profiles remain byte-identical, including existing all-era Spa/Monaco exceptions. No new historical road reconstruction is claimed. Rendered terrain and shoulder grass is also clipped out of shared physical kerb/gravel/paving footprints, so sloping aprons are not hidden by coarse grass triangles. Paving/paint is clipped away from both racing and pit roads and mapped building footprints, replacing overlapping escape surfacing rather than stacking coplanar surfaces.

## Limits and reproduction

Photographs have differing dates and viewpoints; several depict restorations or off-session circuits. An upload date is not necessarily a capture date. Images are not camera-registered and there is no visual similarity score. Vehicle/kerb dimensions are authored estimates, not constructor CAD, calibrated photogrammetry or surveyed road geometry. Models remain shared era bases with estimated team variants: **0/57 verified chassis scans**. Sponsor typography and fine aero remain approximate.

Regenerate roster refinements, shapes/liveries and corner details; build/serve the game; run `scripts/capture-car-comparison.mjs` and `scripts/capture-track-audit.mjs`; run `scripts/build-car-comparison.py` and `scripts/build-photo-audit.py`; rebuild the distribution. `photo-audit-captures.json` records capture checksums, actual cameras and hashes of the shared shape/layout/roster/variant/livery/corner inputs.
