# Upstream package notice omissions

Small fallback notices for published Rust crates that omit root licence files. `scripts/package-release.py` uses these when gathering notices; all other package notices come from the installed Cargo/Node sources. These are dependency licences, not the project's MIT grant.

- **gilrs 0.11.2 / gilrs-core 0.6.8:** upstream declares Apache-2.0/MIT. Exact root texts retrieved from https://gitlab.com/gilrs-project/gilrs/-/raw/master/LICENSE-MIT and https://gitlab.com/gilrs-project/gilrs/-/raw/master/LICENSE-APACHE on 8 November 2026. The separate SDL controller database notice is also copied directly from gilrs's published `SDL_GameControllerDB/LICENSE` during packaging.
- **dasp_sample 0.11.0:** upstream declares MIT OR Apache-2.0. MIT alternative copied from its declared repository, https://raw.githubusercontent.com/RustAudio/sample/master/LICENSE-MIT (RustAudio Developers), on 8 November 2026.
- **quad-rand 0.2.3:** the published Cargo.toml declares MIT and author `not-fl3 <not.fl3@gmail.com>`; the crate and repository omit a standalone licence. `QUAD-RAND-MIT.txt` documents that declaration and reproduces the standard MIT terms with the upstream author, rather than pretending it is a copied upstream file. Repository: https://github.com/not-fl3/quad-rand .

System OpenGL/X11/ALSA/libudev libraries are not redistributed in the Linux ZIP; install them through the operating system. This collection is practical attribution, not trademark clearance or certification for an official F1 release.
