(() => {
  'use strict';

  window.hotdBridgeSetPayload = function (payload, program) {
    if (typeof payload !== 'string' || payload.length < 1024) {
      throw new Error('HOTD payload is empty');
    }
    if (typeof FS === 'undefined' || typeof FS.writeFile !== 'function') {
      throw new Error('BoxedWine filesystem is not ready');
    }

    const bytes = getBase64Data(payload);
    Config.payloadZipFile = 'app.zip';
    try { FS.unlink('/' + Config.payloadZipFile); } catch (_) {}
    FS.writeFile('/' + Config.payloadZipFile, bytes);

    // Keep appPayload non-empty so getEmulatorParams mounts app.zip at c:/files.
    // The bytes themselves are already in the Emscripten filesystem above.
    Config.appPayload = 'private-drive-mounted';
    Config.appZipFile = '';
    Config.Program = program || 'rundemo.exe';
    Config.ProgramArgs = [];
    Config.WorkingDir = '';
    Config.storageMode = STORAGE_MEMORY;
    Config.appSubfolder = '';

    return {
      ok: true,
      payloadBytes: bytes.length,
      mountedAs: Config.payloadZipFile,
      program: Config.Program
    };
  };

  window.hotdBridgeStart = function () {
    if (isRunning) return false;
    start();
    return true;
  };

  window.hotdBridgeStatus = function () {
    let appZipReady = false;
    try { appZipReady = !!FS.stat('/app.zip'); } catch (_) {}
    return { running: isRunning, ready: typeof start === 'function', appZipReady };
  };

  try {
    window.parent.postMessage({ type: 'hotd-boxedwine-bridge-ready' }, window.location.origin);
  } catch (_) {}
})();
