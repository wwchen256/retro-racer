const Obstacles = (function() {
  const TYPES = {
    ROCK: 0,
    TREE: 1,
    CAR: 2,
    OIL: 3
    };

  let allObstacles = [];

  function createObstacle(segIndex, x, type, speed) {
    return { segment: segIndex, z: segIndex * 200, x: x, type: type, speed: speed, hit: false };
  }

  function spawnObstacles(segments) {
    allObstacles = [];
    const config = LevelConfig[Road.getCurrentLevel()];

    for (let i = 50; i < segments.length - 50; i++) {
      if (Math.random() < config.obstacleDensity * 0.08) {
        const x = (Math.random() * 2 - 1) * 0.7;
        const type = Math.floor(Math.random() * 4);
        const speed = config.obstacleSpeed * (Math.random() * 0.5 + 0.5);
        allObstacles.push(createObstacle(i, x, type, speed));
          }
        }
    return allObstacles;
  }

  function update(dt, playerZ) {
    for (let i = 0; i < allObstacles.length; i++) {
      const obs = allObstacles[i];
      if (obs.hit) continue;
      // Only CAR-type obstacles move (oncoming traffic)
      if (obs.type === TYPES.CAR && obs.speed > 0) {
        obs.z -= obs.speed * dt * 10;
        if (obs.z < 0) obs.z = 0;
        obs.segment = Math.max(0, Math.floor(obs.z / 200));
      }
      // Discard obstacles once they are well behind the player
      if (obs.z < playerZ - 300) obs.hit = true;
    }
  }

  const BASE_SIZE = { 0: 140, 1: 220, 2: 180, 3: 200 };

  function drawSprite(ctx, x, y, scale, type) {
    const size = (BASE_SIZE[type] || 180) * scale;
    if (size < 2) return;

    switch (type) {
      case TYPES.ROCK:
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.ellipse(x - size * 0.15, y - size * 0.12, size * 0.22, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case TYPES.TREE:
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x - size * 0.07, y - size * 0.5, size * 0.14, size * 0.5);
        ctx.fillStyle = '#2a7a2a';
        ctx.beginPath();
        ctx.arc(x, y - size * 0.7, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;

      case TYPES.CAR:
        ctx.fillStyle = '#c00';
        ctx.fillRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.3);
        ctx.fillStyle = '#900';
        ctx.fillRect(x - size * 0.2, y - size * 0.45, size * 0.4, size * 0.15);
        ctx.fillStyle = '#555';
        ctx.fillRect(x - size * 0.3, y - size * 0.03, size * 0.12, size * 0.08);
        ctx.fillRect(x + size * 0.18, y - size * 0.03, size * 0.12, size * 0.08);
        break;

      case TYPES.OIL:
        ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
     }

  function checkCollision(playerX, prevZ, currZ, obstacles) {
    // Swept check across the player's z-travel this frame to prevent tunneling
    const lo = Math.min(prevZ, currZ) - 50;
    const hi = Math.max(prevZ, currZ) + 150;
    const threshold = 0.15;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.hit) continue;
      if (obs.z < lo || obs.z > hi) continue;
      if (Math.abs(playerX - obs.x) < threshold) {
        obs.hit = true;
        return obs;
      }
    }
    return null;
  }

  return {
    spawnObstacles,
    update,
    drawSprite,
    checkCollision,
    getObstacles() { return allObstacles; },
    TYPES
  };
})();
