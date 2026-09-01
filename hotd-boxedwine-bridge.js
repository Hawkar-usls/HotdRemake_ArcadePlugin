(() => {
  'use strict';

  function bridgeStatus() {
    let appZipReady = false;
    const fsReady = typeof FS !== 'undefined' && typeof FS.writeFile === 'function';
    const configReady = typeof Config !== 'undefined';
    const startReady = typeof start === 'function';
    if (fsReady) {
      try { appZipReady = !!FS.stat('/app.zip'); } catch (_) {}
    }
    return {
      bridgeReady: true,
      fsReady,
      configReady,
      startReady,
      running: typeof isRunning !== 'undefined' ? !!isRunning : false,
      appZipReady
    };
  }

  window.hotdBridgeStatus = bridgeStatus;

  window.hotdBridgeSetPayload = function (payload, program) {
    if (typeof payload !== 'string' || payload.length < 1024) {
      throw new Error('HOTD payload is empty');
    }
    const state = bridgeStatus();
    if (!state.fsReady || !state.configReady) {
      throw new Error('BoxedWine filesystem/config is not ready');
    }
    if (typeof getBase64Data !== 'function') {
      throw new Error('BoxedWine payload decoder is not ready');
    }

    const bytes = getBase64Data(payload);
    Config.payloadZipFile = 'app.zip';
    try { FS.unlink('/' + Config.payloadZipFile); } catch (_) {}
    FS.writeFile('/' + Config.payloadZipFile, bytes);

    // initialSetup already ran with no app-payload. Keep this flag non-empty so
    // getEmulatorParams mounts the pre-written app.zip at Config.appDirPrefix.
    Config.appPayload = 'private-drive-mounted';
    Config.appZipFile = '';
    Config.Program = program || 'rundemo.exe';
    Config.ProgramArgs = [];
    Config.WorkingDir = '';
    Config.appSubfolder = '';

    const mounted = bridgeStatus();
    if (!mounted.appZipReady) throw new Error('app.zip was not mounted into Emscripten FS');
    return {
      ok: true,
      payloadBytes: bytes.length,
      mountedAs: Config.payloadZipFile,
      program: Config.Program,
      appZipReady: mounted.appZipReady
    };
  };

  window.hotdBridgeStart = function () {
    const state = bridgeStatus();
    if (!state.startReady) throw new Error('BoxedWine start() is not ready');
    if (!state.appZipReady) throw new Error('HOTD app.zip is not mounted');
    if (state.running) return false;
    start();
    return true;
  };

  try {
    window.parent.postMessage({ type: 'hotd-boxedwine-bridge-ready' }, window.location.origin);
  } catch (_) {}
})();
