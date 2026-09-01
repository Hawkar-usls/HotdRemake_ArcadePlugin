(() => {
  'use strict';

  const DRIVE_FILE_ID = '1QWJJNKgCC-tpTAaJg72zJRr6dCpSlHp_';
  const EXPECTED_BYTES = 16078013;
  const EXPECTED_SHA256 = '5421733293af7a57d5b7f3c4e4d53d52109c47be7b888f4b0308feb15f9ccfe6';
  const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
  const RUNTIME_URL = './vendor/boxedwine26r1/boxedwine.html?auto=false&resolution=640x480&bpp=16&sound=true&disableHideCursor=true&storage=memory';
  const BRIDGE_URL = new URL('./hotd-boxedwine-bridge.js?v=3', location.href).href;
  const DB_NAME = 'hotd-private-cache-v1';
  const DB_STORE = 'payloads';
  const DB_KEY = 'hotd.zip';

  const $ = (id) => document.getElementById(id);
  const play = $('play');
  const status = $('statusText');
  const detail = $('statusDetail');
  const oauthBox = $('oauthBox');
  const clientInput = $('clientId');
  const saveClient = $('saveClient');
  const frame = $('runtime');
  const frameWrap = $('runtimeWrap');

  let tokenClient = null;
  let busy = false;

  function setStatus(title, text, kind = '') {
    status.textContent = title;
    detail.textContent = text || '';
    document.body.dataset.state = kind;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
  }

  async function cacheGet() {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(DB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } finally { db.close(); }
  }

  async function cachePut(buffer) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put({
          buffer,
          bytes: buffer.byteLength,
          sha256: EXPECTED_SHA256,
          savedAt: Date.now()
        }, DB_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    } finally { db.close(); }
  }

  async function verifyBuffer(buffer) {
    if (!(buffer instanceof ArrayBuffer)) throw new Error('HOTD payload is not an ArrayBuffer');
    if (buffer.byteLength !== EXPECTED_BYTES) throw new Error(`Unexpected hotd.zip size: ${buffer.byteLength} bytes`);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hex !== EXPECTED_SHA256) throw new Error(`hotd.zip hash mismatch: ${hex}`);
    return buffer;
  }

  async function getCachedBuffer() {
    const entry = await cacheGet().catch(() => null);
    if (!entry?.buffer || entry.bytes !== EXPECTED_BYTES || entry.sha256 !== EXPECTED_SHA256) return null;
    try { return await verifyBuffer(entry.buffer); }
    catch (_) { return null; }
  }

  function getClientId() {
    const url = new URL(location.href);
    const fromUrl = url.searchParams.get('client_id');
    if (fromUrl) {
      localStorage.setItem('hotd_google_client_id', fromUrl);
      url.searchParams.delete('client_id');
      history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
      return fromUrl;
    }
    return localStorage.getItem('hotd_google_client_id') || '';
  }

  function saveClientId() {
    const value = clientInput.value.trim();
    if (!value.endsWith('.apps.googleusercontent.com')) {
      setStatus('GOOGLE OAUTH CLIENT ID NEEDED', 'Paste a Web OAuth client ID ending in .apps.googleusercontent.com.', 'warn');
      return;
    }
    localStorage.setItem('hotd_google_client_id', value);
    oauthBox.hidden = true;
    tokenClient = null;
    setStatus('PRIVATE DRIVE GATE READY', 'Press PLAY once. After a verified fetch, hotd.zip is cached locally for future auto-start.', 'ready');
  }

  function waitForGoogle(timeout = 15000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (window.google?.accounts?.oauth2) return resolve();
        if (Date.now() - start > timeout) return reject(new Error('Google Identity Services did not load'));
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  function requestToken(clientId) {
    return new Promise((resolve, reject) => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response?.error) reject(new Error(response.error));
          else if (!response?.access_token) reject(new Error('Google returned no access token'));
          else resolve(response.access_token);
        },
        error_callback: (err) => reject(new Error(err?.message || err?.type || 'Google OAuth failed'))
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  async function fetchPrivateZip(accessToken) {
    setStatus('READING YOUR DRIVE', 'Downloading private hotd.zip into browser memory…', 'busy');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(DRIVE_FILE_ID)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Drive download failed: HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    await verifyBuffer(buffer);
    setStatus('PRIVATE COPY VERIFIED', 'SHA-256 matches. Saving a private browser copy for future launches…', 'busy');
    await cachePut(buffer);
    return buffer;
  }

  function toBase64(bytes) {
    setStatus('ARMING BOXEDWINE', 'Verified demo is being mounted into the emulator filesystem…', 'busy');
    const parts = [];
    const size = 0x8000;
    for (let i = 0; i < bytes.length; i += size) {
      parts.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length))));
    }
    return btoa(parts.join(''));
  }

  function loadRuntime() {
    frameWrap.hidden = false;
    const current = frame.getAttribute('src');
    if (!current || current === 'about:blank') frame.src = RUNTIME_URL;
  }

  function boxedWineDocumentReady() {
    try {
      const href = frame.contentWindow?.location?.href || '';
      return href.includes('/boxedwine.html') && frame.contentDocument && frame.contentDocument.readyState !== 'loading';
    } catch (_) {
      return false;
    }
  }

  function injectBridge() {
    if (!boxedWineDocumentReady()) return false;
    const w = frame.contentWindow;
    const doc = frame.contentDocument;
    if (typeof w.hotdBridgeSetPayload === 'function' && typeof w.hotdBridgeStart === 'function') return true;
    if (doc.querySelector('script[data-hotd-bridge]')) return false;

    const script = doc.createElement('script');
    script.src = BRIDGE_URL;
    script.dataset.hotdBridge = '1';
    script.onload = () => console.log('HOTD bridge loaded into BoxedWine frame');
    script.onerror = () => console.error('HOTD bridge failed to load');
    doc.head.appendChild(script);
    return false;
  }

  function waitForBridge(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        try {
          injectBridge();
          const w = frame.contentWindow;
          if (boxedWineDocumentReady() && typeof w?.hotdBridgeSetPayload === 'function' && typeof w?.hotdBridgeStart === 'function') {
            return resolve(w);
          }
        } catch (_) {}
        if (Date.now() - start > timeout) {
          let href = 'unavailable';
          try { href = frame.contentWindow?.location?.href || href; } catch (_) {}
          return reject(new Error(`BoxedWine personal bridge did not become ready; frame=${href}`));
        }
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  async function launchBuffer(buffer, source) {
    const bytes = new Uint8Array(buffer);
    loadRuntime();
    const runtime = await waitForBridge();
    const payload = toBase64(bytes);
    const mounted = runtime.hotdBridgeSetPayload(payload, 'rundemo.exe');
    if (!mounted?.ok || !mounted?.payloadBytes) throw new Error('BoxedWine did not mount the private HOTD payload');
    setStatus('STARTING THE HOUSE OF THE DEAD', `${source} → BoxedWine/Wine6 → rundemo.exe`, 'ready');
    runtime.hotdBridgeStart();
    frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function launch() {
    if (busy) return;
    busy = true;
    play.disabled = true;
    try {
      const cached = await getCachedBuffer();
      if (cached) {
        await launchBuffer(cached, 'PRIVATE BROWSER CACHE');
        return;
      }

      const clientId = getClientId();
      if (!clientId) {
        oauthBox.hidden = false;
        clientInput.focus();
        setStatus('ONE-TIME GOOGLE SETUP', 'Google requires a Web OAuth client ID for a private Drive file. After the first verified fetch, later launches use the browser cache.', 'warn');
        return;
      }

      await waitForGoogle();
      setStatus('GOOGLE DRIVE SIGN-IN', 'Authorize read-only access to your private Drive copy once.', 'busy');
      const accessToken = await requestToken(clientId);
      const buffer = await fetchPrivateZip(accessToken);
      await launchBuffer(buffer, 'PRIVATE DRIVE');
    } catch (err) {
      console.error(err);
      setStatus('LAUNCH FAILED', err?.message || String(err), 'fail');
    } finally {
      busy = false;
      play.disabled = false;
    }
  }

  play.addEventListener('click', launch);
  saveClient.addEventListener('click', saveClientId);
  clientInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveClientId(); });
  frame.addEventListener('load', () => {
    try { injectBridge(); } catch (_) {}
  });

  (async () => {
    const cached = await getCachedBuffer();
    if (cached) {
      setStatus('PRIVATE HOTD CACHED', 'Verified copy found in this browser. Auto-starting…', 'ready');
      setTimeout(() => launch(), 250);
      return;
    }
    const existing = getClientId();
    if (existing) {
      clientInput.value = existing;
      setStatus('PRIVATE DRIVE GATE READY', 'Press PLAY once. Future launches can auto-start from this browser.', 'ready');
    } else {
      setStatus('PRIVATE DRIVE GATE BUILT', 'Runtime and private Drive source are wired. One-time Google OAuth client setup remains before the first fetch.', 'warn');
    }
  })();
})();
