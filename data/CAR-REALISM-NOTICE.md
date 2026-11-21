# Photo-guided car geometry update — 0.18

The user supplied ten reference images and explicitly assigned them as follows:

- **2026: images 1, 2, 3, 7** (`image-15`, `image-16`, `image-17`, `image-21`). The first three supply FIA concept/proportion views, not individual constructor CAD. Image 7 supplies an Aston Martin visual reference. Concept paint is not assigned to every 2026 team.
- **2023: images 4, 5, 6, 8** (`image-18`, `image-19`, `image-20`, `image-22`). The multi-car side view, Ferrari, slim-sidepod Mercedes and Ferrari special treatment inform year-specific silhouettes, paint boundaries and materials. Mercedes represents the early slim-sidepod configuration; not every in-season update.
- **2021: images 9, 10** (`image-23`, `image-24`). Aston Martin and Red Bull references preserve open-spoke smaller rims, five-element/squared wing treatment and flat-floor/bargeboard character, instead of borrowing later covered wheels or venturi surfaces.

Original source checksums and the explicit year assignment are retained in `data/car-realism-reference.json`. Original user images remain private workspace references. No rights to redistribute them are assumed, and their pixels are not included in public pages, car textures or generated meshes.

## Implemented geometry and finish

- Monotone compound longitudinal profiles replace coarse straight section transitions on modern bodies. Nose and survival-cell sections have shouldered rather than circular cross-sections.
- Skin **and end-cap winding** is explicitly correct for either section direction. Modern ellipsoid normals point outwards. Dedicated geometric regression tests guard both errors.
- Asymmetric shouldered/undercut pod surfaces replace elliptical tubes. Open duct mouths have a separate rolled lip, recessed internal walls, a back radiator plane and thin core fins; they are not black stickers over a closed painted cap.
- A separate rebuilt 2023 ground-effect body has lower downwash flanks, sculpted dorsal spine, floor inlet fences, thinner spoon wings, smaller supports and a bounded rear assembly.
- Ferrari bowl, Red Bull downwash and early slim Mercedes proportions are estimated contour variants. Matching pod ducts, radiator pieces and conformal sponsor patches receive exactly the same deformation. This is not exact team-specific retopology.
- Wing camber/thickness follows chord rather than one oversized constant section. Separate static flaps, endplates and structural supports remain visible. 2026 active aero is **not simulated**.
- Coaming, fairings, a camera T-bar and pushrods extend all three modern bases. Smaller modern centre locks, satin wheel covers, preserved open-spoke 2021 wheels, restrained woven carbon bump and deterministic rubber micro-grain improve material separation. Fine textures are original procedural work.
- Showroom ground/lighting and shadow precision are revised without changing the menu layout or race HUD. The same car meshes/materials are used in races; native shares the geometry and contour transforms but retains simpler shading.

## Preserved / limitations

The 1967, 1988 and 2004 model arrays are unchanged. Contact/wheel centres, tyre support radii, Rust driving/braking/steering, circuit/kerb/banking/pit geometry, the existing HUD and race loop remain unchanged. The new version requires rebuilt WASM only for coherent build provenance; the physics is not a new model.

These remain original real-time approximations: **not photorealistic replicas, scans, constructor CAD, calibrated photogrammetry or exact sponsor vectors**. Reference lighting, cameras and launch/race configurations vary. The three common modern bases are differentiated by estimated team contours; not every small aerodynamic update is represented. Public comparisons contain actual old/new game renders, never generated concept images. Software-GPU validation is not a claim of hardware performance.
