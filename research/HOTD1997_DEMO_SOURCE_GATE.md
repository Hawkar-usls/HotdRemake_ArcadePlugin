# HOTD 1997 PC Demo → Browser proof gate

Status: **SOURCE FOUND / REDISTRIBUTION NOT YET PROVEN / MAIN UNTOUCHED**

## Goal
Run the original SEGA *The House of the Dead* Windows demo in a browser using an open-source Windows/Wine runtime, without publishing a retail ROM/disc image.

## Runtime candidate

- **BoxedWine** — GPL-2.0 open-source x86/Wine emulator with WebAssembly/Web support.
- Official project: https://github.com/danoon2/Boxedwine
- Web configuration supports `root`, `app`, `p`, `work`, overlays, local storage and drag/drop app files.
- Current docs warn that Web/WASM performance is slower than native; old DirectDraw/Direct3D-era titles are the target class, but HOTD itself still needs an execution test.

## Demo evidence

### PC demo package
Historical archive indexes identify a four-part Windows 95 demo distributed as:

- `HOTDDEMO.ARJ` — part 1/4
- `HOTDDEMO.A01` — part 2/4
- `HOTDDEMO.A02` — part 3/4
- `HOTDDEMO.A03` — part 4/4

Metadata: SEGA, Pentium 133, 16 MB RAM, Windows 95, DirectX, 3D acceleration support. Historical date: 1998-06-28.

### Current mirror metadata
FilePlanet/Download.it currently lists **The House of the Dead - Demo** as a free download, developer **SEGA**, size **15.4 MB**, MD5:

`adec3d6ca6829a024350ef1fdb890d04`

Source page:
https://fileplanet.download.it/p-46299/The-House-of-the-Dead-Demo

### Independent historical distribution evidence
The demo was also listed on magazine cover media as **Démo / shareware**, including PC Zone #67 and Génération 4 #114. This is strong evidence that SEGA intentionally distributed a promotional PC demo through third parties in 1998, but it is **not by itself a modern redistribution license**.

## Required PASS gates before replacing main

1. **PACKAGE_IDENTITY_PASS**
   - Obtain the demo package from a reputable historical/free-demo source.
   - Verify MD5 `adec3d6ca6829a024350ef1fdb890d04` if that exact FilePlanet package is used.
   - Record SHA-256 as the canonical project hash.

2. **LICENSE_README_PASS**
   - Inspect the original package README/EULA/license.
   - Require explicit permission compatible with hosting/mirroring, or use an authorized source that serves the package directly without us mirroring it.
   - If redistribution is not explicitly allowed, keep the game binary out of GitHub.

3. **BOXEDWINE_NATIVE_PASS**
   - Install/run the demo under BoxedWine native first, per BoxedWine guidance.

4. **BOXEDWINE_WASM_PASS**
   - Package the installed demo into a BoxedWine app/root zip.
   - Launch in browser with mouse/lightgun mapping and audio.

5. **PAGES_PASS**
   - Publish proof build from this research branch or an isolated Pages artifact.
   - Only after browser execution is verified should `main` be converted from the current playable fallback to HOTD 1997.

## Safety rule
Do **not** substitute a retail ROM, Saturn disc, arcade ROM set, abandonware RIP, encrypted copy, or third-party pirate archive if the demo/license gate fails. The whole point of this track is a real SEGA demo with a defensible source chain.
