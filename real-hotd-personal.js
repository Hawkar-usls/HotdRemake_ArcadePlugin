(() => {
  'use strict';

  const DRIVE_FILE_ID = '1ammROnbRNYVlqbiaBcSUJcLqTDZjClm-';
  const EXPECTED_BYTES = 16078013;
  const EXPECTED_SHA256 = '5421733293af7a57d5b7f3c4e4d53d52109c47be7b888f4b0308feb15f9ccfe6';
  const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
  const RUNTIME_URL = './vendor/boxedwine26r1/boxedwine.html?auto=false&resolution=640x480&bpp=16&sound=true&disableHideCursor=true&storage=memory';
  const BRIDGE_URL = new URL('./hotd-boxedwine-bridge.js', location.href).href;

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
  let bridgeInjected = false;

  function setStatus(title, text, kind = '') {
    status.textContent = title;
    detail.textContent = text || '';
    document.body.dataset.state = kind;
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
    setStatus('PRIVATE DRIVE GATE READY', 'Press PLAY. Google will ask for read-only Drive access.', 'ready');
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
    if (buffer.byteLength !== EXPECTED_BYTES) throw new Error(`Unexpected hotd.zip size: ${buffer.byteLength} bytes`);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hex !== EXPECTED_SHA256) throw new Error(`hotd.zip hash mismatch: ${hex}`);
    return new Uint8Array(buffer);
  }

  function toBase64(bytes) {
    setStatus('ARMING BOXEDWINE', 'Verified demo is being mounted from RAM…', 'busy');
    const parts = [];
    const size = 0x8000;
    for (let i = 0; i < bytes.length; i += size) {
      parts.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length))));
    }
    return btoa(parts.join(''));
  }

  function loadRuntime() {
    if (!frame.getAttribute('src') || frame.getAttribute('src') === 'about:blank') frame.src = RUNTIME_URL;
    frameWrap.hidden = false;
  }

  function injectBridge() {
    if (bridgeInjected) return;
    const doc = frame.contentDocument;
    if (!doc || doc.readyState === 'loading') return;
    if (doc.querySelector('script[data-hotd-bridge]')) {
      bridgeInjected = true;
      return;
    }
    const script = doc.createElement('script');
    script.src = BRIDGE_URL;
    script.dataset.hotdBridge = '1';
    doc.head.appendChild(script);
    bridgeInjected = true;
  }

  function waitForBridge(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        try {
          injectBridge();
          const w = frame.contentWindow;
          if (typeof w?.hotdBridgeSetPayload === 'function' && typeof w?.hotdBridgeStart === 'function') return resolve(w);
        } catch (_) {}
        if (Date.now() - start > timeout) return reject(new Error('BoxedWine personal bridge did not become ready'));
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  async function launch() {
    if (busy) return;
    const clientId = getClientId();
    if (!clientId) {
      oauthBox.hidden = false;
      clientInput.focus();
      setStatus('ONE-TIME GOOGLE SETUP', 'This private route needs your Google Web OAuth client ID once. It is stored only in this browser.', 'warn');
      return;
    }

    busy = true;
    play.disabled = true;
    try {
      await waitForGoogle();
      setStatus('GOOGLE DRIVE SIGN-IN', 'Authorize read-only access to your Drive copy.', 'busy');
      const accessToken = await requestToken(clientId);
      const bytes = await fetchPrivateZip(accessToken);
      bridgeInjected = false;
      loadRuntime();
      const runtime = await waitForBridge();
      const payload = toBase64(bytes);
      runtime.hotdBridgeSetPayload(payload, 'c:/files/rundemo.exe');
      setStatus('STARTING THE HOUSE OF THE DEAD', 'Private Drive → RAM → BoxedWine. No game file is being published by this page.', 'ready');
      runtime.hotdBridgeStart();
      frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  frame.addEventListener('load', () => { try { injectBridge(); } catch (_) {} });

  const existing = getClientId();
  if (existing) {
    clientInput.value = existing;
    setStatus('PRIVATE DRIVE GATE READY', 'Press PLAY. Your hotd.zip stays private in Google Drive.', 'ready');
  } else {
    setStatus('PRIVATE DRIVE GATE BUILT', 'One-time Google OAuth client ID setup remains before PLAY can authenticate to your Drive.', 'warn');
  }
})();
