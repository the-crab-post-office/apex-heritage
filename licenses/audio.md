# Real recording attribution — CC BY-SA 3.0

The six `.pcm` files are adaptations of recordings by **Edvvc (Ed Pond)**, made at Goodwood Festival of Speed on 3 July 2010. The audio assets are licensed separately from the MIT code, under **Creative Commons Attribution-ShareAlike 3.0 Unported**:
https://creativecommons.org/licenses/by-sa/3.0/
Legal text: https://creativecommons.org/licenses/by-sa/3.0/legalcode

| Adapted loops | Original recording and source page |
|---|---|
| `classic-low.pcm`, `classic-high.pcm` | [Lotus-BRM 24 (1962)](https://commons.wikimedia.org/wiki/File:Lotus-BRM_24_(1962).ogg) |
| `turbo-low.pcm`, `turbo-high.pcm` | [Toleman-Hart TG183B (1983)](https://commons.wikimedia.org/wiki/File:Toleman-Hart_TG183B_(1983).ogg) |
| `v10-low.pcm`, `v10-high.pcm` | [Williams-Renault FW18 (1996)](https://commons.wikimedia.org/wiki/File:Williams-Renault_FW18_(1996).ogg) |

Changes by APEX / HERITAGE (0.4): short-window harmonic analysis of the credited recordings, DC removal and normalization, converted to stable periodic low/high timbre tables (16 repeated cycles in signed 16-bit PCM). Source-window frequencies are retained in `recordings.json`. Playback is phase-locked to simulated engine firing frequency; recorded pass-by Doppler/acceleration sweeps are no longer looped underneath steady game RPM. The original recordings inform timbre; this is recording-derived resynthesis, not unmodified natural audio or measured source RPM. Reference RPM values are authored timbre-blend anchors. Share adapted audio under CC BY-SA 3.0, retain attribution, link the license and indicate changes. No endorsement is implied.

License basis: the explicit Commons file pages, fetched 8 November 2026, list Edvvc's own work under CC BY-SA 3.0 (also GFDL). We select the CC BY-SA 3.0 grant. The older embedded Vorbis description still mentions Attribution-Noncommercial-ShareAlike 2.0 UK; that obsolete metadata is not the license grant relied upon here. See the author-uploaded file pages for the explicit later license. This is not public-domain or exclusive proprietary audio.

These are real **trackside pull-away recordings**, not an isolated multi-RPM studio bank, and not exact replicas of the game's 1967/1988/2004 cars. The Toleman Hart source is a turbo four-cylinder, not the 1988 V6. The new periodic resynthesis removes the looping source pitch sweep but does not reconstruct the exact original engine. The 2023 preset is still procedural: no verified matching modern V6 recording was bundled. The 1962/1983/1996 references are not mislabeled as matching the selected roster year.
