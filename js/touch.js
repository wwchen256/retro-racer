const TouchControls = (function() {
  let enabled = false;
  let container = null;
  let pauseBtn = null;

  // Active key state we currently have emitted, so we only send events on change.
  let active = { left: false, right: false, up: false, down: false };

  const KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };

  function isTouchDevice() {
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function emit(key, type) {
    document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
  }

  // Convert the car's on-canvas position to on-screen pixel coordinates,
  // accounting for the canvas being letterboxed via object-fit: contain.
  function getCarScreenPos() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return { x: window.innerWidth / 2, y: window.innerHeight * 0.81 };
    const rect = canvas.getBoundingClientRect();
    const s = Math.min(rect.width / 640, rect.height / 480);
    const drawnW = 640 * s, drawnH = 480 * s;
    const offX = (rect.width - drawnW) / 2;
    const offY = (rect.height - drawnH) / 2;

    // Car draw logic (see Car.draw): cx = 320 + steerX*50, cy = 480 - 90
    const steerX = (typeof Car !== 'undefined' && Car.state) ? Car.state.steerX : 0;
    const carCanvasX = 320 + steerX * 50;
    const carCanvasY = 480 - 90;

    return {
      x: rect.left + offX + carCanvasX * s,
      y: rect.top + offY + carCanvasY * s,
      scale: s
    };
  }

  function isPlaying() {
    const hud = document.getElementById('hud');
    return hud ? !hud.classList.contains('hidden') : false;
  }

  // Classify each active touch relative to the car and OR the directions together.
  function computeDirections(touches) {
    const want = { left: false, right: false, up: false, down: false };
    if (!isPlaying()) return want;

    const car = getCarScreenPos();
    const dead = Math.min(window.innerWidth, window.innerHeight) * 0.10;

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      // Ignore the pause button and any overlay button touches.
      if (t.target && t.target.closest && t.target.closest('#rr-pause-btn')) continue;
      if (t.target && t.target.closest && t.target.closest('.menu-btn, .level-btn')) continue;

      const dx = t.clientX - car.x;
      const dy = t.clientY - car.y;
      const ad = Math.abs(dx), bd = Math.abs(dy);
      if (Math.max(ad, bd) < dead) continue;

      if (ad > bd) {
        if (dx < 0) want.left = true; else want.right = true;
      } else {
        if (dy < 0) want.up = true; else want.down = true;
      }
    }
    return want;
  }

  function applyState(want) {
    for (const dir of ['left', 'right', 'up', 'down']) {
      if (want[dir] && !active[dir]) emit(KEY[dir], 'keydown');
      else if (!want[dir] && active[dir]) emit(KEY[dir], 'keyup');
      active[dir] = want[dir];
    }
  }

  function onTouchChange(e) {
    if (isPlaying()) e.preventDefault();
    applyState(computeDirections(e.touches));
  }

  function onTouchEnd(e) {
    if (isPlaying()) e.preventDefault();
    // Release everything that no longer has a supporting touch.
    applyState(computeDirections(e.touches));
  }

  function releaseAll() {
    applyState({ left: false, right: false, up: false, down: false });
  }

  // ---- Pause button (kept small and out of the way) ----
  function makePauseButton() {
    const btn = document.createElement('div');
    btn.id = 'rr-pause-btn';
    btn.textContent = 'II';
    btn.setAttribute('role', 'button');
    Object.assign(btn.style, {
      position: 'absolute',
      right: '4%',
      top: '3%',
      width: '11%',
      height: '7%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#fff',
      background: 'rgba(0,0,0,0.4)',
      border: '2px solid rgba(255,255,255,0.4)',
      borderRadius: '8px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
      pointerEvents: 'auto',
      zIndex: '15'
    });
    const tap = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.style.background = 'rgba(255,255,255,0.4)';
      emit('Escape', 'keydown');
      setTimeout(() => { btn.style.background = 'rgba(0,0,0,0.4)'; emit('Escape', 'keyup'); }, 80);
    };
    btn.addEventListener('touchstart', tap, { passive: false });
    btn.addEventListener('mousedown', tap);
    return btn;
  }

  function build() {
    if (container) return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;
    container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '15'
    });
    overlay.appendChild(container);
    pauseBtn = makePauseButton();
    container.appendChild(pauseBtn);

    document.addEventListener('touchstart', onTouchChange, { passive: false });
    document.addEventListener('touchmove', onTouchChange, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // If the page is hidden (e.g. user switches apps), release all keys.
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  }

  function init() {
    if (!isTouchDevice()) return;
    enabled = true;
    build();
    document.addEventListener('DOMContentLoaded', build);
  }

  return { init, isTouchDevice };
})();

window.addEventListener('load', TouchControls.init);
