# HOTD 1997 PC Demo → Browser proof gate

Status: **PACKAGE IDENTITY PASS / BOXEDWINE NATIVE HOTD PASS / BOXEDWINE RUNTIME BUILD PASS / REDISTRIBUTION NOT PROVEN / WASM OPEN / MAIN UNTOUCHED**

## Goal
Run the original SEGA *The House of the Dead* Windows demo in a browser using an open-source Windows/Wine runtime, without publishing a retail ROM/disc image or mirroring unlicensed demo bytes.

## Runtime

- **BoxedWine** — GPL-2.0 open-source x86/Wine emulator with WebAssembly/Web support.
- Official project: https://github.com/danoon2/Boxedwine
- Web configuration supports filesystem/app URLs, overlays, local storage and user-file input.

### Modern machine-verified Web/WASM build

`BOXEDWINE_RUNTIME_BUILD_PASS = true`

GitHub Actions run `33447803130`, job `99670699269` completed successfully after a CI-only Emscripten compatibility patch changed the final C++ link from `$(CC)` / `emcc` to `$(CXX)` / `em++`.

Verified outputs:

- `boxedwine.html`
- `boxedwine.js`
- `boxedwine.wasm`
- `boxedwine-shell.js`
- `boxedwine.css`

Upstream revision: `2473488cfcf1ba914daf5aad097da0c59bb16073`.

Runtime proof artifact:

- artifact ID `9778739317`
- artifact name `hotd1997-boxedwine-web-runtime`
- artifact SHA-256 digest `d92e1dc6d891cdeaa34f9dd9bc2cf4599ac9be28fc795c79b8ecc80a3d9f3029`

This is runtime-build evidence only; the genuine HOTD browser execution gate is still open.

## Exact-era native execution — PASS

A second proof line locked BoxedWine to historical revision:

`5a2195ba47a169455c2dbe6bcb4bae4c256c9bad`

The initial `build64.sh` x64/hard-MMU/multithreaded core was rejected: it SIGSEGVed even on Debian `/bin/ls /`, with GDB localizing the host crash to `allocNativeMemory` during `Memory::Memory()` startup. Therefore that failure was not attributed to HOTD.

The same revision's `project/linux/build.sh` uses the **normal CPU + softMMU + single-threaded** execution path. The same `normal + softmmu` core family is used by the historical Emscripten/Web build, making it the relevant native predictor.

Normal-core native binary SHA-256:

`963d975f1003e35963dd990a5bfb51ef9474f2a8d8446c7df714ebd2ae554e9c`

### Semantic Wine baseline

GitHub Actions run `33460686139` tested four filesystem lanes. Historical BoxedWine returns exit code `1` after a successful `wine --version`, so PASS was defined semantically: a `wine-*` banner, `Boxedwine shutdown`, and no crash/debugger/fatal signature.

All four lanes passed:

- split Debian10 + Wine 1.7 — PASS
- split Debian10 + Wine 5.0 — PASS
- combined Debian10-Wine-1.7 — PASS
- combined Debian10-Wine-5.0 with required `debian10.zip` dependency supplied — PASS

`WINE_SEMANTIC_PASS_COUNT = 4 / 4`

### Genuine HOTD launch proof

The verified PC Zone demo was recovered only inside the ephemeral runner and never uploaded. `THOTDEMO.exe` SHA-256 was rechecked before launch:

`96951e783957858d20d181884ecd0566d53f91a88586345dc6fd126ca986d29f`

The genuine demo was then launched through `/bin/wine d:\\THOTDEMO.exe` at 640×480. Screenshots existed only transiently in the runner; they were reduced to numerical pixel-delta evidence and deleted before artifact upload.

Run `33460686139`, artifact `9783267687`, artifact digest:

`ab095e639186fc0d1de467c97c28aaf68f02600ed36bebf906b9f6565a704084`

Results:

| Lane | Process | Crash | Visual delta from blank | Motion delta after input | Windows | Launch | Motion |
|---|---|---:|---:|---:|---:|---|---|
| split Wine 1.7 | ALIVE | false | 306281 | 48303 | 4 | PASS | PASS |
| split Wine 5.0 | ALIVE | false | 0 | 0 | 3 | FAIL | FAIL |
| full Wine 1.7 | ALIVE | false | 306281 | 48343 | 4 | PASS | PASS |
| full Wine 5.0 | ALIVE | false | 0 | 0 | 3 | FAIL | FAIL |

The winning Wine-1.7 lanes both logged:

- filesystem load success
- `Launching "/bin/wine" "d:\\THOTDEMO.exe"`
- `Creating Window: 640x480`
- a live process with no crash signature
- a large non-zero visual delta from the blank X display
- a non-zero frame delta after Enter/click input

Therefore:

`BOXEDWINE_NATIVE_PASS = true`

`BOXEDWINE_NATIVE_HOTD_LAUNCH_PASS = true`

`BOXEDWINE_NATIVE_HOTD_MOTION_PASS = true`

The canonical successor lane for browser work is **BoxedWine 20.1.2 normal/softMMU + Wine 1.7**.

## Demo package identity — PASS

### PC Zone #67 machine-verified package

A historical PC Zone #67 cover-CD archive was fetched only into an ephemeral GitHub runner.

Outer RAR:

- bytes `635457476`
- SHA-256 `1a8695d904886e028b4e14aa59b85934c1d867ed03d2f3a18c9d202691efa1ba`
- format RAR v4

The RAR contains a CloneCD image set. `unar` unpacked it and `ccd2iso` decoded the image into ISO 9660 filesystem `DPPCZ0998`.

Decoded ISO:

- bytes `643723264`
- SHA-256 `0959a52365b22f23ed7f18ff704de67258bf488670c25e9422e4fbea9d6a8104`

HOTD installer:

`Gamedemo/Win95/hotd/Install.exe`

- bytes `15964271`
- MD5 `f26a2405e5c63f31aa7b2dcdafa27842`
- SHA-256 `6150da85cd5e7ba88bbe722aba8202d5f8726b66eb1e8614b2bda5e89ae76944`
- type `PE32 executable (GUI) Intel 80386, for MS Windows`

The self-extracting archive exposes the HOTD demo files and original `README.TXT`, identifying `The House Of The Dead DEMO`, `PC DEMO version 1/5/98`, DirectX 5 requirement, and disabled lightgun support in the demo.

`PACKAGE_IDENTITY_PASS = true`

### FilePlanet comparison

FilePlanet/Download.it lists a SEGA demo with published MD5 `adec3d6ca6829a024350ef1fdb890d04`. Automated retrieval receives a 403 anti-bot page, and that published MD5 does not match the PC Zone installer MD5. It remains a distinct wrapper/revision candidate, not the canonical project package.

## Redistribution/license gate — OPEN

The original package README contains operational/demo notes but no explicit grant to redistribute, mirror, or publicly host the demo package.

`LICENSE_README_PASS = false`

Therefore the SEGA binary stays out of GitHub, Pages assets, and uploaded CI artifacts. The browser successor must either obtain explicit compatible permission/authorized hosting or use a **local user-provided demo import** while Pages hosts only the open-source runtime and integration code.

## Current gates

1. **PACKAGE_IDENTITY_PASS** — **PASS**
2. **LICENSE_README_PASS** — **OPEN / FALSE**
3. **BOXEDWINE_NATIVE_PASS** — **PASS**
4. **BOXEDWINE_RUNTIME_BUILD_PASS** — **PASS**
5. **BOXEDWINE_WASM_PASS** — **OPEN**
6. **PAGES_PASS** — **OPEN**

## Next successor

Build the exact BoxedWine `20.1.2` Emscripten normal/softMMU runtime and reproduce the winning Wine-1.7 execution lane in a sterile browser test. The demo bytes must remain ephemeral/local-only until the redistribution gate changes.

## Safety rule
Do **not** substitute a retail ROM, Saturn disc, arcade ROM set, abandonware RIP, encrypted copy, or unverified pirate bridge if the license gate fails. The target is the genuine historical SEGA demo with a defensible source chain.
