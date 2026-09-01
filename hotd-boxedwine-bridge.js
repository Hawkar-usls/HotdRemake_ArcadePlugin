(() => {
  'use strict';

  window.hotdBridgeSetPayload = function (payload, program) {
    if (typeof payload !== 'string' || payload.length < 1024) {
      throw new Error('HOTD payload is empty');
    }
    Config.appPayload = payload;
    Config.appZipFile = '';
    Config.Program = program || 'c:/files/rundemo.exe';
    Config.ProgramArgs = [];
    Config.WorkingDir = '';
    Config.storageMode = STORAGE_MEMORY;
    return { ok: true, payloadChars: payload.length, program: Config.Program };
  };

  window.hotdBridgeStart = function () {
    if (isRunning) return false;
    start();
    return true;
  };

  window.hotdBridgeStatus = function () {
    return { running: isRunning, ready: typeof start === 'function' };
  };

  try {
    window.parent.postMessage({ type: 'hotd-boxedwine-bridge-ready' }, window.location.origin);
  } catch (_) {}
})();
