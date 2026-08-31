# HOTD 1997 PC Demo → Browser proof gate

Status: **SOURCE FOUND / BOXEDWINE RUNTIME BUILD PASS / REDISTRIBUTION NOT YET PROVEN / MAIN UNTOUCHED**

## Goal
Run the original SEGA *The House of the Dead* Windows demo in a browser using an open-source Windows/Wine runtime, without publishing a retail ROM/disc image.

## Runtime candidate

- **BoxedWine** — GPL-2.0 open-source x86/Wine emulator with WebAssembly/Web support.
- Official project: https://github.com/danoon2/Boxedwine
- Web configuration supports `root`, `app`, `p`, `work`, overlays, local storage and drag/drop app files.
- Current docs warn that Web/WASM performance is slower than native; old DirectDraw/Direct3D-era titles are the target class, but HOTD itself still needs an execution test.

### Machine-verified BoxedWine build

`BOXEDWINE_RUNTIME_BUILD_PASS = true`

GitHub Actions run `33447803130`, job `99670699269` completed successfully after applying a CI-only compatibility patch to the upstream Emscripten makefile: the final C++ link was changed from `$(CC)` / `emcc` to `$(CXX)` / `em++`.

Verified outputs:

- `boxedwine.html`
- `boxedwine.js`
- `boxedwine.wasm`
- `boxedwine-shell.js`
- `boxedwine.css`

Upstream BoxedWine revision:

`2473488cfcf1ba914daf5aad097da0c59bb16073`

Runtime proof artifact:

- artifact ID: `9778739317`
- artifact name: `hotd1997-boxedwine-web-runtime`
- artifact SHA-256 digest: `d92e1dc6d891cdeaa34f9dd9bc2cf4599ac9be28fc795c79b8ecc80a3d9f3029`

This is **not yet `BOXEDWINE_WASM_PASS`**: the runtime itself builds, but that final gate requires the actual HOTD demo to launch in-browser with input/audio.

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

An automated ephemeral source probe received a `403` HTML anti-bot response from the download endpoint, so FilePlanet has **not** passed package identity verification. No binary from that probe was persisted or uploaded.

### Independent historical distribution evidence
The demo appears in historical demo archives and magazine cover-media catalogs. A Taiwanese *Computer Player* catalog identifies a Windows 95 HOTD demo directory and installer as `\hotd\hotd_demo.exe`.

PC Zone #67 archival media was machine-probed as a 606 MiB RAR. Its outer archive SHA-256 is:

`1a8695d904886e028b4e14aa59b85934c1d867ed03d2f3a18c9d202691efa1ba`

The RAR contains a CloneCD image set rather than a directly visible filesystem:

- `CDZone#67.ccd`
- `CDZone#67.cue`
- `CDZone#67.img`
- `CDZone#67.sub`

The first probe's `7z` extraction segfaulted on the RAR v4 stream before the CD image could be inspected. A successor probe now uses `unar` followed by `ccd2iso` and scans the decoded ISO. This is an extraction-tool fault, not negative evidence about HOTD presence.

Historical third-party distribution is strong provenance evidence, but is **not by itself a modern redistribution license**.

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

4. **BOXEDWINE_RUNTIME_BUILD_PASS** — **PASS**
   - Build the open-source BoxedWine Web/WASM runtime reproducibly on GitHub Actions.

5. **BOXEDWINE_WASM_PASS**
   - Package the installed demo into a BoxedWine app/root zip.
   - Launch in browser with mouse/lightgun mapping and audio.

6. **PAGES_PASS**
   - Publish proof build from this research branch or an isolated Pages artifact.
   - Only after browser execution is verified should `main` be converted from the current playable fallback to HOTD 1997.

## Safety rule
Do **not** substitute a retail ROM, Saturn disc, arcade ROM set, abandonware RIP, encrypted copy, or third-party pirate archive if the demo/license gate fails. The whole point of this track is a real SEGA demo with a defensible source chain.
