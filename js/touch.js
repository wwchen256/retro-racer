const TouchControls = (function() {
  let buttons = [];
  let container = null;
  let enabled = false;

  function isTouchDevice() {
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  // Send a synthetic keyboard event so Game's existing keydown/keyup
  // listener updates its `keys` map. Keeps this module fully decoupled.
  function emit(key, type) {
    const ev = new KeyboardEvent(type, { key, bubbles: true });
    document.dispatchEvent(ev);
  }

  function press(key, down) {
    emit(key, down ? 'keydown' : 'keyup');
  }

  function makeButton(label, key, x, y, w, h, extraStyle) {
    const btn = document.createElement('div');
    btn.textContent = label;
    btn.setAttribute('role', 'button');
    Object.assign(btn.style, {
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#fff',
      background: 'rgba(255,255,255,0.15)',
      border: '2px solid rgba(255,255,255,0.5)',
      borderRadius: '12px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
      pointerEvents: 'auto',
      zIndex: '15',
      ...extraStyle
    });

    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.style.background = 'rgba(255,255,255,0.4)';
      press(key, true);
    };
    const up = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.style.background = 'rgba(255,255,255,0.15)';
      press(key, false);
    };

    // touch
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up, { passive: false });
    btn.addEventListener('touchcancel', up, { passive: false });
    // mouse (for testing on desktop with devtools touch emulation)
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', up);

    return btn;
  }

  function build() {
    if (container) return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '15'
    });
    overlay.appendChild(container);

    // Layout: steer buttons bottom-left, gas/brake bottom-right.
    // Sizes in % of container so they scale to any screen.
    const steerY = '62%';
    const driveY = '62%';

    const left = makeButton('◀', 'ArrowLeft', '4%', steerY, '16%', '28%', {});
    const right = makeButton('▶', 'ArrowRight', '22%', steerY, '16%', '28%', {});
    const brake = makeButton('▼', 'ArrowDown', '62%', driveY, '16%', '28%',
      { color: '#fdd', borderColor: 'rgba(255,150,150,0.6)' });
    const gas = makeButton('▲', 'ArrowUp', '80%', driveY, '16%', '28%',
      { color: '#dfd', borderColor: 'rgba(150,255,150,0.6)' });

    [left, right, brake, gas].forEach(b => container.appendChild(b));
    buttons = [left, right, brake, gas];
  }

  function show(v) {
    if (!container) build();
    container.style.display = v ? 'block' : 'none';
  }

  function init() {
    if (!isTouchDevice()) return;
    enabled = true;
    build();
    show(true);
    // Also try again once DOM is definitely ready (overlay exists)
    document.addEventListener('DOMContentLoaded', build);
  }

  return { init, show, isTouchDevice };
})();

window.addEventListener('load', TouchControls.init);
