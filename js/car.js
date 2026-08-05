const Car = (function() {
  let state = {
    x: 0,
    z: 0,
    speed: 0,
    steerX: 0,
    isSliding: false,
    slideTimer: 0
   };

  const SPEED_LIMIT = 250;
  const ACCELERATION = 120;
  const BRAKE_FORCE = 180;
  const STEER_RATE = 0.7;
  const STEER_RECENTER = 10;
  const GRASS_DRAG_K = 8;
  const MAX_STEER = 0.6;

  function reset() {
    state.x = 0;
    state.z = 0;
    state.speed = 0;
    state.steerX = 0;
    state.isSliding = false;
    state.slideTimer = 0;
    }

  function update(dt, keys, levelConfig, roadCenterX, roadHalfWidth) {
    if (state.speed < 0) state.speed = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      state.speed += ACCELERATION * dt;
       }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      state.speed -= BRAKE_FORCE * dt;
       }

    const onGrass = roadHalfWidth != null
      ? Math.abs(state.x - roadCenterX) > roadHalfWidth
      : Math.abs(state.x) > 1;

    if (state.isSliding) {
      state.slideTimer -= dt;
      if (state.slideTimer <= 0) {
        state.isSliding = false;
        Sound.brake();
        state.speed *= 0.6;
        }
       } else {
        const steerScale = onGrass ? 0.6 : Math.max(state.speed / 100, 0.4);
        let input = 0;
        if (keys.ArrowLeft || keys.a || keys.A) input -= 1;
        if (keys.ArrowRight || keys.d || keys.D) input += 1;
        if (input !== 0) {
          state.steerX += input * STEER_RATE * steerScale * dt;
        } else {
          state.steerX *= Math.exp(-STEER_RECENTER * dt);
        }
        }

    state.steerX = Math.max(-MAX_STEER, Math.min(MAX_STEER, state.steerX));
    const lateralFactor = onGrass ? state.speed * 0.004 : Math.max(state.speed / 360, 0.2);
    state.x += state.steerX * dt * lateralFactor;

    const maxSpd = levelConfig ? levelConfig.maxSpeed : SPEED_LIMIT;
    state.speed = Math.min(state.speed, maxSpd);

   if (onGrass) {
      state.speed -= GRASS_DRAG_K * state.speed * dt;
      if (state.speed < 0) state.speed = 0;
       }

    if (!Number.isFinite(state.speed)) state.speed = 0;
    if (!Number.isFinite(state.steerX)) state.steerX = 0;
    if (!Number.isFinite(state.x)) state.x = 0;
     }

  function hitObstacle() {
    state.speed *= 0.3;
    Sound.collision();
    Sound.stopMusic();
  }

  function setSliding() {
    state.isSliding = true;
    state.slideTimer = 1.0;
    }

  function getX() { return state.x; }
  function getZ() { return state.z; }
  function getSpeed() { return state.speed; }
  function getSteerX() { return state.steerX; }

  function draw(ctx, canvasW, canvasH) {
    const carW = 80;
    const carH = 45;
    const bounce = Math.sin(Date.now() / 100) * (state.speed / SPEED_LIMIT) * 3;
    const cx = canvasW / 2 + state.steerX * 50;
    const cy = canvasH - 90 + bounce;

    const lean = state.steerX * 8;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#333';
    ctx.fillRect(-carW / 2 - 6, carH / 2 - 8, carW / 5, 14);
    ctx.fillRect(carW / 2 - 6, carH / 2 - 8, carW / 5, 14);

    ctx.fillStyle = '#d00';
    ctx.fillRect(-carW / 2, -carH / 2, carW, carH);

    ctx.fillStyle = '#a00';
    ctx.fillRect(-carW / 2 + 6, -carH / 2 + 3, carW - 12, carH * 0.4);

    ctx.fillStyle = '#4af';
    ctx.fillRect(-carW / 2 + 12, -carH / 2 + 6, 16, 10);
    ctx.fillRect(carW / 2 - 28, -carH / 2 + 6, 16, 10);

    ctx.fillStyle = '#ff0';
    ctx.fillRect(-carW / 2 + 5, carH / 2 - 14, 8, 5);
    ctx.fillRect(carW / 2 - 13, carH / 2 - 14, 8, 5);

    ctx.fillStyle = '#f00';
    ctx.fillRect(-carW / 2 + 5, -carH / 2 - 2, 10, 4);
    ctx.fillRect(carW / 2 - 15, -carH / 2 - 2, 10, 4);

    ctx.restore();
    }

  return {
    reset,
    update,
    hitObstacle,
    setSliding,
    draw,
    getX,
    getZ,
    getSpeed,
    getSteerX,
    get state() { return state; }
    };
})();
