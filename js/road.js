const Road = (function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 480;

  const CAMERA_DEPTH = canvas.height * 0.8;
  const DRAW_DISTANCE = 150;
  const SEGMENT_LENGTH = 200;
  const HORIZON_Y = canvas.height / 2;
  const GROUND_OFFSET = 55;

  let segments = [];
  let currentLevel = 1;

  function project(p) {
    const cameraZ = Car ? Car.state.z : 0;
    const worldZ = p.z;
    const relZ = worldZ - cameraZ;
    if (relZ <= 50) return null;

    const scale = CAMERA_DEPTH / relZ;

    return { x: 0, y: 0, w: 0, scale: scale };
  }

  function buildRoad() {
    segments = [];
    const config = LevelConfig[currentLevel];

    for (let i = 0; i < config.segmentsPerLevel; i++) {
      let curve = 0;
      if (config.curveAmount > 0) {
        if (i > 50 && i < 150) curve = config.curveAmount * 0.1;
        else if (i > 200 && i < 300) curve = -config.curveAmount * 0.1;
        else if (i > 350 && i < 500) curve = config.curveAmount * 0.15;
        else if (i > 550 && i < 700) curve = -config.curveAmount * 0.15;
        else if (i > 750 && i < 900) curve = config.curveAmount * 0.2;
        else if (i > 1000 && i < 1200) curve = -config.curveAmount * 0.2;
      }
      segments.push({
        index: i,
        curve: curve,
        sprites: []
      });
    }

    let cumulativeX = 0;
    let cumulativeDX = 0;
    for (let i = 0; i < segments.length; i++) {
      segments[i].worldX = cumulativeX;
      cumulativeX += cumulativeDX;
      cumulativeDX += segments[i].curve;
    }
  }

  function render() {
    const config = LevelConfig[currentLevel];
    const playerZ = Car ? Car.state.z : 0;
    const playerX = Car ? Car.state.x : 0;

    ctx.fillStyle = config.colors.grass;
    ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y);

    const baseSegmentIndex = Math.max(0, Math.floor(playerZ / SEGMENT_LENGTH));

    if (!segments || segments.length === 0) return;  // guard: road not built yet

    // Render back to front
    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
      const idx = (baseSegmentIndex + n) % segments.length;
      const nextIdx = (baseSegmentIndex + n - 1) % segments.length;

      const currentSeg = segments[idx];
      const nextSeg = segments[nextIdx];

      const z1 = currentSeg.index * SEGMENT_LENGTH;
      const z2 = nextSeg.index * SEGMENT_LENGTH;

      // Simple projection
      const relZ1 = z1 - playerZ;
      const relZ2 = z2 - playerZ;
      if (relZ1 <= 50 || relZ2 <= 50) continue;

      const scale1 = CAMERA_DEPTH / relZ1;
      const scale2 = CAMERA_DEPTH / relZ2;

      const camX = playerX * 1200;

      const x1 = canvas.width / 2 + scale1 * (currentSeg.worldX - camX);
      const y1 = HORIZON_Y + scale1 * GROUND_OFFSET;
      const w1 = scale1 * config.roadWidth / 25;

      const x2 = canvas.width / 2 + scale2 * (nextSeg.worldX - camX);
      const y2 = HORIZON_Y + scale2 * GROUND_OFFSET;
      const w2 = scale2 * config.roadWidth / 25;

      if (y1 >= y2) continue;
      if (y2 < 0) continue;

      const isEven = Math.floor(currentSeg.index / 3) % 2 === 0;

      // Grass strip
      ctx.fillStyle = isEven ? config.colors.grass : '#2a6a24';
      ctx.fillRect(0, y1, canvas.width, y2 - y1);

      // Road
      ctx.fillStyle = isEven ? config.colors.road : '#333';
      drawPoly(x1, y1, w1, x2, y2, w2);

      // Rumble strips
      if (isEven) {
        ctx.fillStyle = config.colors.rumble;
        const rw1 = w1 / 25;
        const rw2 = w2 / 25;
        drawPoly(x1 - w1 - rw1, y1, rw1, x2 - w2 - rw2, y2, rw2);
        drawPoly(x1 + w1 + rw1, y1, rw1, x2 + w2 + rw2, y2, rw2);
      }

      // Lane markers
      if (currentSeg.index % 6 < 4) {
        ctx.fillStyle = config.colors.roadBorder;
        for (let lane = 1; lane < config.laneCount; lane++) {
          const off = (lane / config.laneCount) * 2 - 1;
          const lw1 = w1 / 60;
          const lw2 = w2 / 60;
          drawPoly(x1 + w1 * off, y1, lw1, x2 + w2 * off, y2, lw2);
        }
      }
    }
  }

  function drawPoly(x1, y1, w1, x2, y2, w2) {
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2 - w2, y2);
    ctx.closePath();
    ctx.fill();
  }

  function renderMinimap(playerZ) {
    if (!segments.length) return;
    const mw = 56;
    const mh = 320;
    const mx = canvas.width - mw - 12;
    const my = 80;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = '#aaa';
    ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);

    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].worldX < minX) minX = segments[i].worldX;
      if (segments[i].worldX > maxX) maxX = segments[i].worldX;
    }
    const cx = (minX + maxX) / 2;
    const xRange = Math.max(maxX - minX, 1);
    const total = segments.length;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < total; i += 4) {
      const t = i / (total - 1);
      const x = mx + mw / 2 + ((segments[i].worldX - cx) / xRange) * (mw - 8);
      const y = my + mh - t * mh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const playerSeg = Math.max(0, Math.min(Math.floor(playerZ / SEGMENT_LENGTH), total - 1));
    const t = playerSeg / (total - 1);
    const px = mx + mw / 2 + ((segments[playerSeg].worldX - cx) / xRange) * (mw - 8);
    const py = my + mh - t * mh;
    ctx.fillStyle = '#ff3';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRACK', mx + mw / 2, my - 8);
    ctx.fillText(`${Math.floor(t * 100)}%`, mx + mw / 2, my + mh + 16);
    ctx.textAlign = 'start';
  }

  // Get the screen projection of a world point (for obstacles)
  function getProjectFn() {
    return function(projectPoint) {
      const playerZ = Car ? Car.state.z : 0;
      const playerX = Car ? Car.state.x : 0;
      const camX = playerX * 1200;

      const relZ = projectPoint.z - playerZ;
      if (relZ <= 50) return null;
      const scale = CAMERA_DEPTH / relZ;

      return {
        x: canvas.width / 2 + scale * (projectPoint.x - camX),
        y: HORIZON_Y + scale * GROUND_OFFSET,
        w: scale * projectPoint.w / 25,
        scale: scale
      };
    };
  }

  // Expose segment info for obstacle rendering
  function getSegment(worldIndex) {
    if (worldIndex < 0 || worldIndex >= segments.length) return null;
    return segments[worldIndex];
  }

  function getCurrentLevel() { return currentLevel; }
  function setCurrentLevel(level) {
    currentLevel = level;
    buildRoad();
  }
  function getSegments() { return segments; }

  return {
    render,
    renderMinimap,
    getSegment,
    getCurrentLevel,
    setCurrentLevel,
    getSegments,
    getProjectFn,
    canvas,
    ctx,
    get SEGMENT_LENGTH() { return SEGMENT_LENGTH; },
    get DRAW_DISTANCE() { return DRAW_DISTANCE; }
  };
})();
