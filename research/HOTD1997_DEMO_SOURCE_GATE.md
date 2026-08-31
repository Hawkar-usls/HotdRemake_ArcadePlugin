# HOTD 1997 PC Demo → Browser proof gate

Status: **PACKAGE IDENTITY PASS / BOXEDWINE RUNTIME BUILD PASS / REDISTRIBUTION NOT YET PROVEN / MAIN UNTOUCHED**

## Goal
Run the original SEGA *The House of the Dead* Windows demo in a browser using an open-source Windows/Wine runtime, without publishing a retail ROM/disc image.

## Runtime

- **BoxedWine** — GPL-2.0 open-source x86/Wine emulator with WebAssembly/Web support.
- Official project: https://github.com/danoon2/Boxedwine
- Web configuration supports `root`, `app`, `p`, `work`, overlays, local storage and drag/drop app files.

### Machine-verified BoxedWine build

`BOXEDWINE_RUNTIME_BUILD_PASS = true`

GitHub Actions run `33447803130`, job `99670699269` completed successfully after applying a CI-only Emscripten compatibility patch: the final C++ link was changed from `$(CC)` / `emcc` to `$(CXX)` / `em++`.

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

This is **not yet `BOXEDWINE_WASM_PASS`**: that gate requires the actual HOTD demo to launch with usable graphics/input/audio.

## Demo package identity — PASS

### Historical archive lineage
Historical indexes identify a four-part Windows 95 demo distributed as:

- `HOTDDEMO.ARJ`
- `HOTDDEMO.A01`
- `HOTDDEMO.A02`
- `HOTDDEMO.A03`

Metadata: SEGA, Pentium 133, 16 MB RAM, Windows 95, DirectX, 3D acceleration support; archive date 1998-06-28.

### PC Zone #67 machine-verified package

A historical PC Zone #67 cover-CD archive was fetched only into an ephemeral GitHub runner.

Outer RAR:

- bytes: `635457476`
- SHA-256: `1a8695d904886e028b4e14aa59b85934c1d867ed03d2f3a18c9d202691efa1ba`
- format: RAR v4

The RAR contains a CloneCD image set:

- `CDZone#67.ccd`
- `CDZone#67.cue`
- `CDZone#67.img`
- `CDZone#67.sub`

`unar` successfully unpacked the container and `ccd2iso` decoded the image into an ISO 9660 filesystem labeled `DPPCZ0998`.

Decoded ISO:

- bytes: `643723264`
- SHA-256: `0959a52365b22f23ed7f18ff704de67258bf488670c25e9422e4fbea9d6a8104`

The HOTD demo was then found directly in that filesystem at:

`Gamedemo/Win95/hotd/Install.exe`

Installer identity:

- bytes: `15964271`
- MD5: `f26a2405e5c63f31aa7b2dcdafa27842`
- SHA-256: `6150da85cd5e7ba88bbe722aba8202d5f8726b66eb1e8614b2bda5e89ae76944`
- type: `PE32 executable (GUI) Intel 80386, for MS Windows`

The self-extracting archive exposes `hotd_demo/rundemo.exe` and an original `hotd_demo/README.TXT`. The README identifies itself as:

- `The House Of The Dead DEMO`
- `PC DEMO version 1/5/98`
- `DEMO (trial) version`
- installed/run through `RUNDEMO.EXE`
- requires DirectX 5
- lightgun support disabled in this demo

This independently establishes that the PC Zone package is a genuine historical HOTD PC demo distribution. Therefore:

`PACKAGE_IDENTITY_PASS = true`

### FilePlanet comparison — distinct package/revision

FilePlanet/Download.it currently lists **The House of the Dead - Demo**, developer **SEGA**, size **15.4 MB**, with MD5:

`adec3d6ca6829a024350ef1fdb890d04`

An automated fetch receives a 403 HTML anti-bot response, so the FilePlanet binary itself was not retrieved. The published FilePlanet MD5 does **not** match the PC Zone installer MD5 (`f26a2405...`). This is treated as evidence of a different wrapper/revision, not evidence against the PC Zone demo's authenticity.

`FILEPLANET_MD5_MATCH = false`

## Redistribution/license gate — still OPEN

The original package README was extracted and inspected. It contains operational/demo notes, but the automated evidence scan found **no explicit text granting redistribution, mirroring, or public hosting permission**.

`REDISTRIBUTION_TEXT_CANDIDATE = false`

Therefore:

`LICENSE_README_PASS = false`

Historical magazine/demo distribution is strong provenance evidence, but is not automatically a modern redistribution license. Until an explicit compatible permission or authorized current source is found, the SEGA demo binary stays out of GitHub and out of published artifacts.

## Required PASS gates before replacing main

1. **PACKAGE_IDENTITY_PASS** — **PASS**
   - Canonical historical PC Zone installer SHA-256: `6150da85cd5e7ba88bbe722aba8202d5f8726b66eb1e8614b2bda5e89ae76944`.

2. **LICENSE_README_PASS** — **OPEN**
   - Find explicit redistribution/hosting permission or an authorized source that can serve the package without us mirroring it.

3. **BOXEDWINE_NATIVE_PASS** — **OPEN**
   - Launch the extracted demo through BoxedWine in a sterile runtime test.

4. **BOXEDWINE_RUNTIME_BUILD_PASS** — **PASS**
   - Open-source BoxedWine Web/WASM runtime builds reproducibly.

5. **BOXEDWINE_WASM_PASS** — **OPEN**
   - Launch the demo in browser runtime with graphics/input/audio.

6. **PAGES_PASS** — **OPEN**
   - Publish only after the execution and source/license path are valid.

## Safety rule
Do **not** substitute a retail ROM, Saturn disc, arcade ROM set, abandonware RIP, encrypted copy, or unverified pirate bridge if the license gate fails. The target is the genuine historical SEGA demo with a defensible source chain.
