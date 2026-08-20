const Game = (function() {
  let gameState = 'menu';
  let keys = {};
  let lastTime = 0;
  let score = 0;
  let distance = 0;
  let currentLevel = 1;

  const canvas = Road.canvas;
  const ctx = Road.ctx;

  const hud = document.getElementById('hud');
  const menu = document.getElementById('menu');
  const gameOverScreen = document.getElementById('game-over');
  const levelSelect = document.getElementById('level-select');
  const pauseScreen = document.getElementById('pause-screen');
  const btnStart = document.getElementById('btn-start');
  const btnContinue = document.getElementById('btn-continue');
  const btnLevels = document.getElementById('btn-levels');
  const btnRestart = document.getElementById('btn-restart');
  const btnMenu = document.getElementById('btn-menu');
  const btnBack = document.getElementById('btn-back');
  const btnResume = document.getElementById('btn-resume');
  const btnQuit = document.getElementById('btn-quit');
  const speedDisplay = document.getElementById('speed-display');
  const scoreDisplay = document.getElementById('score-display');
  const levelDisplay = document.getElementById('level-display');
  const distanceDisplay = document.getElementById('distance-display');
  const finalScore = document.getElementById('final-score');
  const finalDistance = document.getElementById('final-distance');
  const gameOverTitle = document.getElementById('game-over-title');
  const newHighscore = document.getElementById('new-highscore');
  const highscoreEl = document.getElementById('highscore');
  const levelGrid = document.getElementById('level-grid');
  const mpScreen = document.getElementById('mp-screen');
  const mpStatus = document.getElementById('mp-status');
  const mpCreatePane = document.getElementById('mp-create-pane');
  const mpLobby = document.getElementById('mp-lobby');
  const mpRoomCode = document.getElementById('mp-room-code');
  const mpPlayers = document.getElementById('mp-players');
  const mpName = document.getElementById('mp-name');
  const mpCode = document.getElementById('mp-code');
  const btnMp = document.getElementById('btn-multiplayer');
  const btnMpCreate = document.getElementById('btn-mp-create');
  const btnMpJoin = document.getElementById('btn-mp-join');
  const btnMpReady = document.getElementById('btn-mp-ready');
  const btnMpBack = document.getElementById('btn-mp-back');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNum = document.getElementById('countdown-num');

  let engineTimer = 0;

  // Multiplayer state
  let mpActive = false;            // true while racing online
  let mpCountdown = 0;            // seconds remaining in countdown
  let mpRaceStart = 0;            // timestamp race began
  let mpFinishTime = null;        // my finish time (ms)
  let mpRemoteName = 'Opponent';

  function init() {
    setupInput();
    setupButtons();
    updateHighscoreDisplay();
    if (Save.hasSave()) {
      btnContinue.classList.remove('hidden');
      }
    gameLoop(0);
    }

  function isTypingInField(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || t.isContentEditable;
  }

  function setupInput() {
    document.addEventListener('keydown', (e) => {
      if (isTypingInField(e)) return;   // don't hijack typing in name/code fields
      e.preventDefault();
      keys[e.key] = true;
      if (e.key === 'Escape' && gameState === 'playing') pauseGame();
      else if (e.key === 'Escape' && gameState === 'paused') resumeGame();
      if (e.key === ' ' && gameState === 'menu') { Sound.init(); startGame(1); }
     });

    document.addEventListener('keyup', (e) => {
      if (isTypingInField(e)) return;
      e.preventDefault();
      keys[e.key] = false;
     });
   }

  function setupButtons() {
    btnStart.addEventListener('click', () => { Sound.init(); startGame(1); });
    btnContinue.addEventListener('click', () => { Sound.init(); startGame(Save.getLastLevel()); });
    btnLevels.addEventListener('click', showLevelSelect);
    btnRestart.addEventListener('click', () => startGame());
    btnMenu.addEventListener('click', showMenu);
    btnBack.addEventListener('click', showMenu);
    btnResume.addEventListener('click', resumeGame);
    btnQuit.addEventListener('click', showMenu);

    btnMp.addEventListener('click', showMpScreen);
    btnMpCreate.addEventListener('click', () => {
      Sound.init();
      const name = (mpName.value || '').trim() || 'Player 1';
      Multiplayer.createRoom(name, Save.getLastLevel()).then(code => {
        if (code) enterLobby(code);
      });
    });
    btnMpJoin.addEventListener('click', () => {
      Sound.init();
      const name = (mpName.value || '').trim() || 'Player 2';
      const code = mpCode.value;
      Multiplayer.joinRoom(code, name).then(ok => {
        if (ok) enterLobby(Multiplayer.getRoomCode());
      });
    });
    btnMpReady.addEventListener('click', () => {
      Sound.menuSelect();
      Multiplayer.setReady(true);
      btnMpReady.textContent = 'READY!';
      btnMpReady.disabled = true;
      mpStatus.textContent = 'Waiting for opponent to ready up...';
    });
    btnMpBack.addEventListener('click', () => {
      Multiplayer.leave();
      showMenu();
    });

    // Multiplayer callbacks
    Multiplayer.onStatus(handleMpStatus);
    Multiplayer.onStart(handleMpStart);
  }

  function updateHighscoreDisplay() {
    highscoreEl.textContent = `High Score: ${Save.getHighScore()}`;
    }

  function showMenu() {
    gameState = 'menu';
    Sound.stopMusic();
    mpActive = false;
    mpCountdown = 0;
    mpFinishTime = null;
    keys = {};
    if (Multiplayer.getRoomCode()) Multiplayer.leave();
    showScreen(menu);
    updateHighscoreDisplay();
    if (Save.hasSave()) btnContinue.classList.remove('hidden');
    }

  function showLevelSelect() {
    gameState = 'level_select';
    Sound.menuSelect();
    showScreen(levelSelect);
    renderLevelGrid();
    }

  function renderLevelGrid() {
    levelGrid.innerHTML = '';
    const unlocked = Save.getUnlockedLevels();
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn' + (i > unlocked ? ' locked' : '');
      const config = getLevel(i);
      btn.textContent = `${i}: ${config.name}`;
      if (i <= unlocked) {
        btn.addEventListener('click', () => {
          currentLevel = i;
          startGame();
          });
        }
      levelGrid.appendChild(btn);
      }
    }

  function showScreen(screen) {
    [menu, gameOverScreen, levelSelect, pauseScreen, hud, mpScreen, countdownOverlay].forEach(el => el.classList.add('hidden'));
    screen.classList.remove('hidden');
    }

  function startGame(level) {
    if (level != null) currentLevel = level;
    gameState = 'playing';
    score = 0;
    distance = 0;
    Car.reset();
    Road.setCurrentLevel(currentLevel);
    Obstacles.spawnObstacles(Road.getSegments());
    Save.saveProgress(currentLevel);
    showScreen(hud);
    Sound.startMusic();
  }

  function pauseGame() {
    gameState = 'paused';
    Sound.stopMusic();
    pauseScreen.classList.remove('hidden');
    }

  function resumeGame() {
    gameState = 'playing';
    pauseScreen.classList.add('hidden');
    Sound.startMusic();
    }

  function endGame(completed) {
    gameState = 'gameover';
    Sound.stopMusic();
    gameOverTitle.textContent = completed ? 'STAGE COMPLETE!' : 'GAME OVER';
    const finalScoreVal = Math.floor(score);
    const prevHigh = Save.getHighScore();
    Save.setHighScore(finalScoreVal);
    Save.saveLevelScore(currentLevel, finalScoreVal);

    newHighscore.classList.toggle('hidden', finalScoreVal <= prevHigh);

    if (finalScoreVal > currentLevel * 1000 && currentLevel < 5) {
      Save.unlockLevel(currentLevel + 1);
      }

    finalScore.textContent = `Score: ${finalScoreVal}`;
    finalDistance.textContent = `Distance: ${Math.floor(distance)}m`;
    showScreen(gameOverScreen);
    }

  // ---------- Multiplayer ----------
  function showMpScreen() {
    gameState = 'mp_lobby';
    Sound.menuSelect();
    // reset lobby UI
    mpCreatePane.classList.remove('hidden');
    mpLobby.classList.add('hidden');
    btnMpReady.disabled = false;
    btnMpReady.textContent = 'READY';
    mpStatus.innerHTML = window.MULTIPLAYER_ENABLED()
      ? 'Create a room and share the code, or join a friend\'s code.'
      : '<span style="color:#f88">Multiplayer not configured.\nEdit js/firebase-config.js with your Firebase keys.</span>';
    mpCode.value = '';
    [menu, gameOverScreen, levelSelect, pauseScreen, hud, countdownOverlay].forEach(el => el.classList.add('hidden'));
    mpScreen.classList.remove('hidden');
  }

  function enterLobby(code) {
    mpCreatePane.classList.add('hidden');
    mpLobby.classList.remove('hidden');
    mpRoomCode.textContent = 'CODE: ' + code;
    mpPlayers.textContent = 'You: ' + (mpName.value || 'Player') + '   |   Opponent: waiting...';
    mpStatus.textContent = 'Waiting for opponent...';
  }

  function handleMpStatus(s, extra) {
    if (s === 'not_configured') return;
    if (s === 'error') { mpStatus.textContent = 'Error: ' + (extra.message || ''); return; }
    if (s === 'opponent_left') {
      if (mpActive) {
        // mid-race dropout -> end the game in our favor
        if (gameState === 'playing' || gameState === 'countdown') {
          mpWin('Opponent left - you win!');
        }
      } else {
        mpStatus.textContent = 'Opponent left. Waiting for a new opponent...';
        btnMpReady.disabled = false;
        btnMpReady.textContent = 'READY';
        Multiplayer.setReady(false);
      }
      return;
    }
    if (s === 'ready_update') {
      mpPlayers.textContent = 'You: ' + (mpName.value || 'Player') +
        '   |   Opponent: ' + (extra.remoteName || 'Player') +
        (extra.remoteReady ? ' (READY)' : '');
      if (extra.remoteReady && extra.myReady) mpStatus.textContent = 'Starting...';
      return;
    }
    if (s === 'waiting') {
      mpStatus.textContent = 'Waiting for opponent...';
    }
  }

  function handleMpStart(startTs, lvl) {
    currentLevel = Number(lvl) || 1;
    Road.setCurrentLevel(currentLevel);
    if (Road.getSegments().length === 0) {
      console.error('MP start: segments empty after setCurrentLevel, rebuilding...');
      Road.setCurrentLevel(currentLevel);
    }
    console.log('MP start: level', currentLevel, 'segments', Road.getSegments().length);
    Car.reset();
    Obstacles.spawnObstacles(Road.getSegments());
    gameState = 'countdown';
    score = 0; distance = 0;
    keys = {};
    // Broadcast a zero-state so the opponent renders at the start line immediately.
    Multiplayer.sendState({ x: 0, z: 0, speed: 0, steerX: 0 });
    [menu, gameOverScreen, levelSelect, pauseScreen, mpScreen, pauseScreen].forEach(el => el.classList.add('hidden'));
    hud.classList.remove('hidden');
    countdownOverlay.classList.remove('hidden');
    updateCountdown(startTs);
  }

  function updateCountdown(startTs) {
    const remaining = (startTs - Date.now()) / 1000;
    if (remaining <= 0) {
      countdownOverlay.classList.add('hidden');
      gameState = 'playing';
      mpActive = true;
      mpRaceStart = Date.now();
      mpFinishTime = null;
      Sound.startMusic();
      return;
    }
    const n = Math.ceil(remaining);
    countdownNum.textContent = n <= 0 ? 'GO!' : String(n);
    setTimeout(() => updateCountdown(startTs), 100);
  }

  function mpWin(message) {
    gameState = 'gameover';
    mpActive = false;
    Sound.stopMusic();
    Sound.levelComplete();
    gameOverTitle.textContent = message;
    finalScore.textContent = 'Distance: ' + Math.floor(distance) + 'm';
    const ft = mpFinishTime != null ? (mpFinishTime / 1000).toFixed(1) + 's' : '--';
    finalDistance.textContent = 'Finish: ' + ft;
    newHighscore.classList.add('hidden');
    showScreen(gameOverScreen);
  }

  function drawRemoteCar(ctx, config, rs) {
    if (!rs) return;
    if (!Number.isFinite(rs.x) || !Number.isFinite(rs.z)) return;
    const segIdx = Math.min(Math.floor(rs.z / config.segmentLength), Road.getSegments().length - 1);
    const seg = Road.getSegment(segIdx);
    if (!seg) return;
    const project = Road.getProjectFn();
    // Project the road centerline at the opponent's z, then offset laterally
    // by rs.x as a fraction of the road half-width (same convention as obstacles).
    const p = project({ x: seg.worldX, z: rs.z, w: config.roadWidth });
    if (!p) return;
    const size = 90 * p.scale;
    if (size < 3 || p.y < 0 || p.y > ctx.canvas.height) return;
    const x = p.x + rs.x * p.w;
    const y = p.y;
    // blue rival car (blocky, mirrors player style)
    ctx.fillStyle = '#333';
    ctx.fillRect(x - size*0.5 - size*0.06, y - size*0.18, size*0.2, size*0.28);
    ctx.fillRect(x + size*0.5 - size*0.14, y - size*0.18, size*0.2, size*0.28);
    ctx.fillStyle = '#24c';
    ctx.fillRect(x - size*0.5, y - size*0.5, size, size*0.56);
    ctx.fillStyle = '#159';
    ctx.fillRect(x - size*0.5 + size*0.08, y - size*0.45, size*0.84, size*0.22);
    ctx.fillStyle = '#9ef';
    ctx.fillRect(x - size*0.4, y - size*0.42, size*0.3, size*0.14);
    ctx.fillRect(x + size*0.1, y - size*0.42, size*0.3, size*0.14);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(x - size*0.45, y - size*0.12, size*0.1, size*0.08);
    ctx.fillRect(x + size*0.35, y - size*0.12, size*0.1, size*0.08);
    // name label
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = Math.max(8, Math.floor(size*0.18)) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rs.name || 'Opponent', x, y - size*0.6);
    ctx.restore();
  }

  function update(dt) {
    if (gameState === 'countdown') {
      // Keep the remote car smooth during countdown; no driving yet.
      Multiplayer.tick(dt);
      return;
    }
    if (gameState !== 'playing') return;

    const config = getLevel(currentLevel);

    const preZ = Car.getZ();
    const preSegIndex = Math.min(Math.floor(preZ / config.segmentLength), Road.getSegments().length - 1);
    const preSeg = Road.getSegments()[preSegIndex];
    const roadCenterX = preSeg ? preSeg.worldX / 1200 : 0;
    const roadHalfWidth = config.roadWidth / 30000;

    Car.update(dt, keys, config, roadCenterX, roadHalfWidth);

    Car.state.z += Car.getSpeed() * dt * 10;

    const playerZ = Car.getZ();
    const steerX = Car.getSteerX();
    const currentSegIndex = Math.min(Math.floor(playerZ / config.segmentLength), Road.getSegments().length - 1);
    const currentSeg = Road.getSegments()[currentSegIndex];
    if (currentSeg) {
      Car.state.steerX -= currentSeg.curve * (Car.getSpeed() / config.maxSpeed) * dt * 0.5;
      }

    Obstacles.update(dt, playerZ);
    const collision = Obstacles.checkCollision(Car.getX(), preZ, playerZ, Obstacles.getObstacles());
    if (collision) {
      Car.hitObstacle();
      if (collision.type === Obstacles.TYPES.OIL) {
        Car.setSliding();
        }
      }

    distance += Car.getSpeed() * dt / 10;
    score = distance;

    speedDisplay.textContent = `Speed: ${Math.floor(Car.getSpeed())}`;
    scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
    levelDisplay.textContent = `Level: ${currentLevel}`;
    distanceDisplay.textContent = `Dist: ${distance.toFixed(1)}m`;

    engineTimer += dt;
    if (engineTimer > 0.1 && Car.getSpeed() > 20) {
      Sound.engineSound();
      engineTimer = 0;
      }

    const totalSegments = config.segmentsPerLevel;
    if (Math.floor(playerZ / config.segmentLength) >= totalSegments - 10) {
      Sound.stopMusic();
      if (mpActive) {
        mpFinishTime = Date.now() - mpRaceStart;
        Multiplayer.setFinished(mpFinishTime);
        // decide win/lose against opponent
        const opp = Multiplayer.getOpponentFinish();
        if (opp != null && opp < mpFinishTime) mpWin('YOU LOSE!');
        else if (opp != null) mpWin('YOU WIN!');
        else {
          // finished first; wait for opponent but show win-for-now
          Sound.levelComplete();
          mpWin('YOU WIN! (opponent still racing)');
        }
        return;
      }
      Sound.levelComplete();
      score += 5000;
      endGame(true);
      }

    // Push our state to Firebase for the other player.
    if (mpActive) {
      Multiplayer.tick(dt);
      Multiplayer.sendState({
        x: Car.getX(), z: Car.getZ(), speed: Car.getSpeed(), steerX: Car.getSteerX()
      });
      // If the opponent already finished, show that they beat us.
      const opp = Multiplayer.getOpponentFinish();
      if (opp != null) {
        mpWin('YOU LOSE!');
        return;
      }
    }
    }

  function render() {
    const config = getLevel(Road.getCurrentLevel());

     // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    grad.addColorStop(0, '#1a1a4a');
    grad.addColorStop(1, config.colors.sky);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    if (gameState === 'menu') {
      renderStars();
      return;
       }

    Road.render();

    const project = Road.getProjectFn();

     // Obstacles - draw back to front
    const obstacles = Obstacles.getObstacles();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      if (obs.hit) continue;

      const seg = Road.getSegment(obs.segment);
      if (!seg) continue;

      const p = project({ x: seg.worldX, z: obs.z, w: config.roadWidth });
      if (!p || p.y < 0 || p.y > canvas.height) continue;

      const spriteX = p.x + (obs.x * p.w);
      Obstacles.drawSprite(ctx, spriteX, p.y, p.scale, obs.type);
       }

    // Remote opponent car (multiplayer)
    if (mpActive || gameState === 'countdown') {
      const rs = Multiplayer.getRemote();
      if (rs) drawRemoteCar(ctx, config, rs);
    }

    if (gameState === 'playing' || gameState === 'countdown') {
      Car.draw(ctx, canvas.width, canvas.height);
    }

    renderTouchHint(ctx);

    Road.renderMinimap(Car.getZ());
      }

  function renderTouchHint(ctx) {
    if (typeof TouchControls === 'undefined' || !TouchControls.isTouchDevice()) return;
    const t = Date.now() / 1000;
    const fade = Math.max(0, 1 - distance / 60);  // fades out after a little driving
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.5 * fade * (0.6 + 0.4 * Math.sin(t * 2));
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('touch around the car to drive', canvas.width / 2, canvas.height / 2 - 40);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  function renderStars() {
    const time = Date.now() / 1000;
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 127.1 + time * 0.1) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(i * 311.7 + time * 0.05) * 0.5 + 0.5) * canvas.height * 0.4;
      const brightness = Math.sin(time * 2 + i) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 200, ${brightness})`;
      ctx.fillRect(x, y, 2, 2);
      }
    }

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    try {
      update(dt);
      render();
    } catch (e) {
      console.error('gameLoop error:', e);
    }

    requestAnimationFrame(gameLoop);
    }

  return { init };
})();

window.addEventListener('load', Game.init);
