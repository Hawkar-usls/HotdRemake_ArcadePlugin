(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const reloadButton = document.getElementById('reloadButton');
  const damageFlash = document.getElementById('damageFlash');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const lifeEl = document.getElementById('life');
  const ammoEl = document.getElementById('ammo');
  const waveLabel = document.getElementById('waveLabel');
  const comboLabel = document.getElementById('comboLabel');
  const creditLabel = document.getElementById('creditLabel');

  const W = canvas.width;
  const H = canvas.height;
  const MAX_LIFE = 5;
  const MAX_AMMO = 6;
  const aim = { x: W / 2, y: H / 2, active: true };

  const plans = [
    { quota: 8, interval: 0.92, speed: [0.075, 0.105], types: ['walker'] },
    { quota: 12, interval: 0.72, speed: [0.09, 0.13], types: ['walker', 'runner'] },
    { quota: 16, interval: 0.58, speed: [0.105, 0.15], types: ['walker', 'runner', 'brute'] },
    { quota: 20, interval: 0.48, speed: [0.12, 0.17], types: ['runner', 'walker', 'brute'] },
    { quota: 1, interval: 0.1, speed: [0.055, 0.055], types: ['boss'] }
  ];

  let enemies = [];
  let particles = [];
  let tracers = [];
  let last = performance.now();
  let sceneClock = 0;
  let spawnTimer = 0;
  let waveClearTimer = 0;
  let shake = 0;
  let audio = null;

  const state = {
    mode: 'attract',
    credits: 0,
    score: 0,
    high: loadHighScore(),
    life: MAX_LIFE,
    ammo: MAX_AMMO,
    reloading: false,
    reloadTime: 0,
    wave: 1,
    spawned: 0,
    kills: 0,
    combo: 0,
    banner: 'INSERT COIN',
    bannerTime: 0,
    elapsed: 0
  };

  function loadHighScore() {
    try { return Number(localStorage.getItem('hotdArcadeWebHigh') || 0); }
    catch { return 0; }
  }

  function saveHighScore() {
    if (state.score <= state.high) return;
    state.high = state.score;
    try { localStorage.setItem('hotdArcadeWebHigh', String(state.high)); }
    catch { /* storage can be unavailable */ }
  }

  function fmt(n) {
    return Math.max(0, Math.floor(n)).toString().padStart(7, '0');
  }

  function updateHud() {
    scoreEl.textContent = fmt(state.score);
    highScoreEl.textContent = fmt(Math.max(state.high, state.score));
    lifeEl.textContent = state.life > 0 ? Array(state.life).fill('♥').join(' ') : '—';
    ammoEl.textContent = state.reloading ? 'RELOADING…' : `${'● '.repeat(state.ammo)}${'○ '.repeat(MAX_AMMO - state.ammo)}`.trim();
    waveLabel.textContent = state.wave <= plans.length ? `WAVE ${state.wave} / ${plans.length}` : 'AREA CLEAR';
    comboLabel.textContent = state.combo >= 3 ? `×${state.combo} COMBO` : '';
    creditLabel.textContent = `CREDITS ${state.credits}`;
  }

  function ensureAudio() {
    if (!audio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audio = new AudioCtx();
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(freq, duration, type = 'square', volume = 0.035, slide = 0) {
    ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function sfx(kind) {
    if (kind === 'shot') {
      tone(105, 0.055, 'square', 0.055, -55);
      setTimeout(() => tone(52, 0.08, 'sawtooth', 0.025, -22), 15);
    } else if (kind === 'hit') {
      tone(210, 0.05, 'sawtooth', 0.025, -90);
    } else if (kind === 'head') {
      tone(520, 0.06, 'square', 0.035, 180);
    } else if (kind === 'reload') {
      tone(190, 0.045, 'square', 0.02, 80);
      setTimeout(() => tone(310, 0.055, 'square', 0.018, 120), 270);
    } else if (kind === 'hurt') {
      tone(72, 0.18, 'sawtooth', 0.055, -30);
    } else if (kind === 'coin') {
      tone(760, 0.05, 'square', 0.028, 220);
      setTimeout(() => tone(1040, 0.07, 'square', 0.02, 120), 70);
    } else if (kind === 'start') {
      tone(330, 0.06, 'square', 0.026, 180);
      setTimeout(() => tone(660, 0.09, 'square', 0.026, 200), 85);
    }
  }

  function showOverlay(title, text, buttonText) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    startButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function addCredit() {
    state.credits = Math.min(99, state.credits + 1);
    sfx('coin');
    updateHud();
    if (state.mode === 'attract') {
      showOverlay('PRESS START', `Credit accepted. Press <kbd>1</kbd> or the button below.`, 'START GAME');
    }
  }

  function startGame() {
    if (state.mode === 'playing') return;
    if (state.credits < 1) {
      addCredit();
      return;
    }
    state.credits--;
    state.mode = 'playing';
    state.score = 0;
    state.life = MAX_LIFE;
    state.ammo = MAX_AMMO;
    state.reloading = false;
    state.reloadTime = 0;
    state.wave = 1;
    state.spawned = 0;
    state.kills = 0;
    state.combo = 0;
    state.elapsed = 0;
    state.banner = 'WAVE 1';
    state.bannerTime = 1.7;
    enemies = [];
    particles = [];
    tracers = [];
    spawnTimer = 0.25;
    waveClearTimer = 0;
    sfx('start');
    hideOverlay();
    updateHud();
  }

  function oneClickStart() {
    ensureAudio();
    if (state.mode === 'playing') return;
    if (state.credits < 1) addCredit();
    startGame();
  }

  function endGame(victory) {
    saveHighScore();
    state.mode = victory ? 'victory' : 'gameover';
    enemies = [];
    state.reloading = false;
    updateHud();
    if (victory) {
      state.score += Math.max(0, state.life) * 2500;
      saveHighScore();
      updateHud();
      showOverlay('AREA CLEAR', `Final score <b>${fmt(state.score)}</b><br>All five waves survived.`, 'PLAY AGAIN');
    } else {
      showOverlay('GAME OVER', `Score <b>${fmt(state.score)}</b> · High <b>${fmt(Math.max(state.high, state.score))}</b>`, 'CONTINUE');
    }
  }

  function plan() {
    return plans[Math.min(plans.length - 1, state.wave - 1)];
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function choose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function spawnEnemy() {
    const p = plan();
    let type = choose(p.types);
    if (state.wave === 5) type = 'boss';
    const hp = type === 'brute' ? 4 : type === 'boss' ? 34 : type === 'runner' ? 1 : 2;
    const lane = rand(0.12, 0.88);
    const speedBase = rand(p.speed[0], p.speed[1]) * (type === 'runner' ? 1.35 : type === 'brute' ? 0.76 : 1);
    enemies.push({
      id: Math.random().toString(36).slice(2),
      type,
      lane,
      phase: rand(0, Math.PI * 2),
      p: type === 'boss' ? -0.05 : rand(-0.22, -0.08),
      speed: speedBase,
      hp,
      maxHp: hp,
      attack: rand(0.75, 1.45),
      flash: 0,
      sway: rand(0.7, 1.6),
      dead: false
    });
    state.spawned++;
  }

  function enemyPose(e, t = sceneClock) {
    const depth = Math.max(0, e.p);
    const boss = e.type === 'boss';
    const size = boss ? 118 + depth * 210 : 58 + depth * 118;
    const xBase = W * e.lane;
    const x = xBase + Math.sin(t * e.sway + e.phase) * (boss ? 55 : 34) * (0.35 + depth);
    const y = 265 + depth * (boss ? 280 : 320) + Math.sin(t * 1.7 + e.phase) * 5;
    return { x, y, size };
  }

  function reload() {
    if (state.mode !== 'playing' || state.reloading || state.ammo === MAX_AMMO) return;
    state.reloading = true;
    state.reloadTime = 0.72;
    state.combo = 0;
    sfx('reload');
    updateHud();
  }

  function shoot(x, y) {
    if (state.mode !== 'playing') return;
    if (state.reloading) return;
    if (state.ammo <= 0) {
      reload();
      return;
    }

    state.ammo--;
    shake = Math.max(shake, 7);
    sfx('shot');
    tracers.push({ x1: W * 0.5, y1: H + 25, x2: x, y2: y, life: 0.075 });

    let hitIndex = -1;
    let headshot = false;
    let bestDepth = -Infinity;

    enemies.forEach((e, i) => {
      if (e.dead) return;
      const pos = enemyPose(e);
      const bossScale = e.type === 'boss' ? 1.18 : 1;
      const head = { x: pos.x, y: pos.y - pos.size * 0.49, r: pos.size * 0.18 * bossScale };
      const dxh = x - head.x;
      const dyh = y - head.y;
      const inHead = dxh * dxh + dyh * dyh <= head.r * head.r;
      const bodyW = pos.size * (e.type === 'boss' ? 0.58 : 0.43);
      const bodyH = pos.size * (e.type === 'boss' ? 0.96 : 0.82);
      const inBody = Math.abs(x - pos.x) <= bodyW && y >= pos.y - pos.size * 0.34 && y <= pos.y + bodyH * 0.55;
      if ((inHead || inBody) && e.p > bestDepth) {
        bestDepth = e.p;
        hitIndex = i;
        headshot = inHead;
      }
    });

    if (hitIndex >= 0) {
      const e = enemies[hitIndex];
      const pos = enemyPose(e);
      const damage = headshot ? (e.type === 'boss' ? 3 : 2) : 1;
      e.hp -= damage;
      e.flash = 0.09;
      state.combo++;
      const comboBonus = Math.min(10, state.combo) * 25;
      state.score += (headshot ? 350 : 150) + comboBonus;
      burst(x, y, headshot ? 13 : 8, headshot ? '#ffdb76' : '#d84a50');
      sfx(headshot ? 'head' : 'hit');
      if (e.hp <= 0) {
        e.dead = true;
        state.kills++;
        state.score += e.type === 'boss' ? 12000 : e.type === 'brute' ? 900 : 500;
        burst(pos.x, pos.y - pos.size * 0.1, e.type === 'boss' ? 46 : 24, '#c62834');
        setTimeout(() => {
          enemies = enemies.filter(item => item.id !== e.id);
        }, 80);
      }
    } else {
      state.combo = 0;
      burst(x, y, 3, '#d6dde8');
    }

    if (state.ammo === 0) setTimeout(reload, 150);
    updateHud();
  }

  function burst(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(35, 210);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.18, 0.58),
        max: rand(0.18, 0.58),
        size: rand(2, 7),
        color
      });
    }
  }

  function hurt(amount = 1) {
    if (state.mode !== 'playing') return;
    state.life = Math.max(0, state.life - amount);
    state.combo = 0;
    shake = Math.max(shake, 18);
    damageFlash.classList.remove('hit');
    void damageFlash.offsetWidth;
    damageFlash.classList.add('hit');
    sfx('hurt');
    updateHud();
    if (state.life <= 0) endGame(false);
  }

  function nextWave() {
    if (state.wave >= plans.length) {
      endGame(true);
      return;
    }
    state.wave++;
    state.spawned = 0;
    spawnTimer = 0.5;
    waveClearTimer = 0;
    state.banner = state.wave === plans.length ? 'WARNING · FINAL WAVE' : `WAVE ${state.wave}`;
    state.bannerTime = 1.8;
    state.life = Math.min(MAX_LIFE, state.life + 1);
    state.ammo = MAX_AMMO;
    state.reloading = false;
    updateHud();
  }

  function update(dt) {
    sceneClock += dt;
    shake *= Math.pow(0.025, dt);

    particles.forEach(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.16, dt);
      p.vy += 190 * dt;
    });
    particles = particles.filter(p => p.life > 0);

    tracers.forEach(t => t.life -= dt);
    tracers = tracers.filter(t => t.life > 0);

    if (state.bannerTime > 0) state.bannerTime -= dt;
    if (state.mode !== 'playing') return;

    state.elapsed += dt;

    if (state.reloading) {
      state.reloadTime -= dt;
      if (state.reloadTime <= 0) {
        state.reloading = false;
        state.ammo = MAX_AMMO;
        updateHud();
      }
    }

    const p = plan();
    if (state.spawned < p.quota) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = p.interval * rand(0.74, 1.18);
      }
    }

    for (const e of enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.p += e.speed * dt;
      if (e.p > 0.58) {
        e.attack -= dt * (e.type === 'boss' ? 1.2 : 1);
        if (e.attack <= 0) {
          hurt(1);
          e.attack = rand(1.05, 1.75);
          e.p = Math.max(0.53, e.p - (e.type === 'boss' ? 0.015 : 0.055));
          if (state.mode !== 'playing') break;
        }
      }
      if (e.p > 1.04 && e.type !== 'boss') {
        e.dead = true;
        hurt(1);
      }
    }
    enemies = enemies.filter(e => !e.dead);

    if (state.mode === 'playing' && state.spawned >= p.quota && enemies.length === 0) {
      waveClearTimer += dt;
      if (waveClearTimer > 1.4) nextWave();
    } else {
      waveClearTimer = 0;
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#071017');
    g.addColorStop(0.45, '#10151a');
    g.addColorStop(1, '#030405');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const horizon = 250;
    ctx.fillStyle = '#11171c';
    ctx.fillRect(0, horizon, W, H - horizon);

    ctx.fillStyle = '#161c22';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(330, horizon);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W - 330, horizon);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(128,145,158,.19)';
    ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) {
      const x = W / 2 + i * 120;
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 26, horizon);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    const travel = (sceneClock * 0.16) % 1;
    for (let i = 0; i < 11; i++) {
      const z = ((i / 10 + travel) % 1);
      const y = horizon + Math.pow(z, 2.2) * (H - horizon);
      const half = 40 + Math.pow(z, 1.6) * W * 0.52;
      ctx.strokeStyle = `rgba(148,159,168,${0.06 + z * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(W / 2 - half, y);
      ctx.lineTo(W / 2 + half, y);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i++) {
      const y = 88 + i * 84;
      const pulse = 0.35 + Math.sin(sceneClock * 3 + i) * 0.15;
      ctx.fillStyle = `rgba(232,52,65,${pulse})`;
      ctx.fillRect(18, y, 34, 8);
      ctx.fillRect(W - 52, y, 34, 8);
    }

    ctx.fillStyle = '#0b0e12';
    ctx.fillRect(W / 2 - 150, 125, 300, 126);
    ctx.strokeStyle = '#28323a';
    ctx.strokeRect(W / 2 - 150, 125, 300, 126);
    ctx.fillStyle = '#202b31';
    ctx.fillRect(W / 2 - 10, 125, 20, 126);
    ctx.fillStyle = 'rgba(220,48,58,.3)';
    ctx.fillRect(W / 2 - 84, 149, 168, 7);

    const fog = ctx.createRadialGradient(W / 2, 310, 20, W / 2, 310, 420);
    fog.addColorStop(0, 'rgba(115,128,133,.08)');
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEnemy(e) {
    const { x, y, size } = enemyPose(e);
    const boss = e.type === 'boss';
    const brute = e.type === 'brute';
    const runner = e.type === 'runner';
    const body = e.flash > 0 ? '#f0d0c4' : boss ? '#54252a' : brute ? '#39452f' : runner ? '#37434a' : '#495044';
    const skin = e.flash > 0 ? '#fff0dc' : boss ? '#8a4b4a' : '#7f8571';

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.max(0.22, Math.min(1, 0.45 + e.p * 0.8));

    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.48, size * 0.45, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = body;
    ctx.lineWidth = size * (boss ? 0.16 : 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.12);
    ctx.lineTo(-size * (boss ? 0.62 : 0.52), size * 0.12 + Math.sin(sceneClock * 4 + e.phase) * size * 0.07);
    ctx.moveTo(size * 0.22, -size * 0.1);
    ctx.lineTo(size * (boss ? 0.62 : 0.52), size * 0.13 - Math.sin(sceneClock * 4 + e.phase) * size * 0.07);
    ctx.stroke();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-size * (boss ? 0.42 : 0.31), -size * 0.3);
    ctx.quadraticCurveTo(0, -size * 0.42, size * (boss ? 0.42 : 0.31), -size * 0.3);
    ctx.lineTo(size * (boss ? 0.35 : 0.25), size * 0.34);
    ctx.lineTo(-size * (boss ? 0.35 : 0.25), size * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#242824';
    ctx.lineWidth = size * (boss ? 0.16 : 0.13);
    ctx.beginPath();
    ctx.moveTo(-size * 0.14, size * 0.28);
    ctx.lineTo(-size * 0.18, size * 0.62);
    ctx.moveTo(size * 0.14, size * 0.28);
    ctx.lineTo(size * 0.18, size * 0.62);
    ctx.stroke();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5, size * (boss ? 0.22 : 0.18), size * (boss ? 0.24 : 0.21), Math.sin(e.phase) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef3946';
    const eyeY = -size * 0.53;
    const eyeDX = size * 0.07;
    ctx.beginPath();
    ctx.arc(-eyeDX, eyeY, Math.max(1.5, size * 0.018), 0, Math.PI * 2);
    ctx.arc(eyeDX, eyeY, Math.max(1.5, size * 0.018), 0, Math.PI * 2);
    ctx.fill();

    if (boss || brute) {
      const w = size * (boss ? 0.82 : 0.58);
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(-w / 2, -size * 0.86, w, 7);
      ctx.fillStyle = boss ? '#ef3946' : '#c9a349';
      ctx.fillRect(-w / 2, -size * 0.86, w * Math.max(0, e.hp / e.maxHp), 7);
    }

    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      const a = Math.max(0, Math.min(1, p.life / 0.45));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawTracers() {
    tracers.forEach(t => {
      ctx.globalAlpha = Math.min(1, t.life / 0.075);
      ctx.strokeStyle = '#ffe7b5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
      ctx.fillStyle = '#fff4ce';
      ctx.beginPath();
      ctx.arc(t.x2, t.y2, 10, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawCrosshair() {
    const x = aim.x;
    const y = aim.y;
    const pulse = 1 + Math.sin(sceneClock * 6) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = state.reloading ? '#cfd6df' : '#ef3946';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-34, 0); ctx.lineTo(-12, 0);
    ctx.moveTo(34, 0); ctx.lineTo(12, 0);
    ctx.moveTo(0, -34); ctx.lineTo(0, -12);
    ctx.moveTo(0, 34); ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  function drawBanner() {
    if (state.bannerTime <= 0) return;
    const alpha = Math.min(1, state.bannerTime * 1.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(0, H * 0.42, W, 92);
    ctx.fillStyle = '#f4f6f8';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner, W / 2, H * 0.42 + 58);
    ctx.restore();
  }

  function drawVignette() {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.82);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    ctx.save();
    if (shake > 0.4) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawBackground();

    const ordered = [...enemies].sort((a, b) => a.p - b.p);
    ordered.forEach(drawEnemy);
    drawParticles();
    drawTracers();
    drawVignette();
    drawBanner();
    if (state.mode === 'playing') drawCrosshair();
    ctx.restore();
  }

  function pointerToCanvas(e) {
    const r = canvas.getBoundingClientRect();
    aim.x = Math.max(0, Math.min(W, (e.clientX - r.left) * W / r.width));
    aim.y = Math.max(0, Math.min(H, (e.clientY - r.top) * H / r.height));
  }

  canvas.addEventListener('pointermove', pointerToCanvas);
  canvas.addEventListener('pointerdown', e => {
    pointerToCanvas(e);
    ensureAudio();
    if (state.mode === 'playing') shoot(aim.x, aim.y);
  });
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    reload();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Digit5' || e.code === 'Numpad5') {
      e.preventDefault();
      addCredit();
    } else if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'Enter') {
      e.preventDefault();
      if (state.mode !== 'playing') startGame();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      reload();
    }
  });

  startButton.addEventListener('click', oneClickStart);
  reloadButton.addEventListener('click', reload);
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.querySelector('.cabinet').requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* fullscreen can be blocked */ }
  });

  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });

  function loop(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  updateHud();
  requestAnimationFrame(loop);
})();
