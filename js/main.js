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

  let engineTimer = 0;

  function init() {
    setupInput();
    setupButtons();
    updateHighscoreDisplay();
    if (Save.hasSave()) {
      btnContinue.classList.remove('hidden');
      }
    gameLoop(0);
    }

  function setupInput() {
    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      keys[e.key] = true;
      if (e.key === 'Escape' && gameState === 'playing') pauseGame();
      else if (e.key === 'Escape' && gameState === 'paused') resumeGame();
      if (e.key === ' ' && gameState === 'menu') { Sound.init(); startGame(1); }
     });

    document.addEventListener('keyup', (e) => {
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
    }

  function updateHighscoreDisplay() {
    highscoreEl.textContent = `High Score: ${Save.getHighScore()}`;
    }

  function showMenu() {
    gameState = 'menu';
    Sound.stopMusic();
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
    [menu, gameOverScreen, levelSelect, pauseScreen, hud].forEach(el => el.classList.add('hidden'));
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

  function update(dt) {
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
      Sound.levelComplete();
      score += 5000;
      endGame(true);
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

    Car.draw(ctx, canvas.width, canvas.height);

    Road.renderMinimap(Car.getZ());
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

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
    }

  return { init };
})();

window.addEventListener('load', Game.init);
