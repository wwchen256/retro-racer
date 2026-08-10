// Real-time 2-player multiplayer over Firebase Realtime Database.
// Serverless: no backend code; GitHub Pages hosts the game, Firebase relays state.
const Multiplayer = (function () {
  const FB_VER = '10.12.2';

  let dbFns = null;     // imported firebase-database module
  let app = null, db = null;

  let roomCode = null;
  let myRole = null;    // 'p1' | 'p2'
  let remoteRole = null;
  let myName = 'Player';
  let level = 1;

  let unsub = [];
  let statusCb = function () {};
  let remoteCb = function () {};
  let startCb = function () {};

  let myReady = false;
  let remoteReady = false;
  let remoteLatest = null;          // last received remote snapshot
  let display = { x: 0, z: 0, speed: 0 };  // smoothed/extrapolated for rendering
  let lastSend = 0;
  let started = false;
  let opponentFinished = false;
  let opponentFinishTime = null;
  let lastRemoteSeen = 0;

  function emitStatus(s, extra) { statusCb(s, extra || {}); }

  async function init() {
    if (dbFns) return true;
    if (!window.MULTIPLAYER_ENABLED || !window.MULTIPLAYER_ENABLED()) {
      emitStatus('not_configured');
      return false;
    }
    try {
      const appMod = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app.js');
      const dbMod = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-database.js');
      app = appMod.initializeApp(window.FIREBASE_CONFIG);
      db = dbMod.getDatabase(app);
      dbFns = dbMod;
      return true;
    } catch (e) {
      console.error('Firebase init failed', e);
      emitStatus('error', { message: e.message });
      return false;
    }
  }

  function genCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)];
    return s;
  }

  async function exists(path) {
    const snap = await dbFns.get(dbFns.ref(db, path));
    return snap.exists();
  }

  async function createRoom(name, lvl) {
    if (!(await init())) return null;
    let code = null;
    for (let tries = 0; tries < 6; tries++) {
      const c = genCode();
      if (!(await exists('rooms/' + c))) { code = c; break; }
    }
    if (!code) { emitStatus('error', { message: 'Could not allocate a room code' }); return null; }
    roomCode = code; myRole = 'p1'; remoteRole = 'p2';
    myName = name || 'Player 1'; level = lvl || 1;
    await dbFns.set(dbFns.ref(db, 'rooms/' + code), {
      level: level,
      createdAt: Date.now(),
      players: { p1: { name: myName, ready: false, lastSeen: Date.now() } }
    });
    setupListeners();
    try { dbFns.onDisconnect(dbFns.ref(db, 'rooms/' + code + '/players/p1')).remove(); } catch (e) {}
    emitStatus('waiting', { code: code, myRole: myRole, level: level });
    return code;
  }

  async function joinRoom(code, name) {
    if (!(await init())) return false;
    code = (code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(code)) {
      emitStatus('error', { message: 'Enter a 4-character code' }); return false;
    }
    if (!(await exists('rooms/' + code + '/players/p1'))) {
      emitStatus('error', { message: 'Room not found' }); return false;
    }
    if (await exists('rooms/' + code + '/players/p2')) {
      emitStatus('error', { message: 'Room is full' }); return false;
    }
    roomCode = code; myRole = 'p2'; remoteRole = 'p1';
    myName = name || 'Player 2';
    const snap = await dbFns.get(dbFns.ref(db, 'rooms/' + code + '/level'));
    level = snap.exists() ? snap.val() : 1;
    await dbFns.set(dbFns.ref(db, 'rooms/' + code + '/players/p2'),
      { name: myName, ready: false, lastSeen: Date.now() });
    setupListeners();
    try { dbFns.onDisconnect(dbFns.ref(db, 'rooms/' + code + '/players/p2')).remove(); } catch (e) {}
    emitStatus('waiting', { code: code, myRole: myRole, level: level });
    return true;
  }

  function setupListeners() {
    cleanup();
    // Remote player state
    unsub.push(dbFns.onValue(
      dbFns.ref(db, 'rooms/' + roomCode + '/players/' + remoteRole),
      function (snap) {
        const v = snap.val();
        if (!v) {
          remoteReady = false;
          if (remoteLatest) { // opponent left mid-race
            emitStatus('opponent_left', { code: roomCode, myRole: myRole, level: level });
            remoteLatest = null;
          } else {
            emitStatus('waiting', { code: roomCode, myRole: myRole, level: level });
          }
          return;
        }
        remoteReady = !!v.ready;
        lastRemoteSeen = Date.now();
        remoteLatest = Object.assign({}, v, { t: performance.now() });
        if (v.finished) { opponentFinished = true; opponentFinishTime = v.finishTime; }
        remoteCb(remoteLatest);
        maybeStartCheck();
        emitStatus('ready_update', {
          remoteReady: remoteReady, myReady: myReady,
          code: roomCode, myRole: myRole, level: level,
          remoteName: v.name
        });
      }
    ));
    // Race start signal (timestamp when race should begin)
    unsub.push(dbFns.onValue(
      dbFns.ref(db, 'rooms/' + roomCode + '/start'),
      function (snap) {
        const t = snap.val();
        if (t && !started) { started = true; startCb(t, level); }
      }
    ));
  }

  function setReady(v) {
    if (!roomCode) return;
    myReady = v;
    dbFns.update(dbFns.ref(db, 'rooms/' + roomCode + '/players/' + myRole),
      { ready: v, lastSeen: Date.now() });
    maybeStartCheck();
  }

  function maybeStartCheck() {
    if (started) return;
    if (myReady && remoteReady && myRole === 'p1') {
      const t = Date.now() + 3500; // 3.5s countdown
      dbFns.set(dbFns.ref(db, 'rooms/' + roomCode + '/start'), t);
    }
  }

  function sendState(state) {
    if (!roomCode) return;
    const now = Date.now();
    if (now - lastSend < 80) return; // ~12 updates/sec
    lastSend = now;
    dbFns.update(dbFns.ref(db, 'rooms/' + roomCode + '/players/' + myRole), {
      x: state.x, z: state.z, speed: state.speed, steerX: state.steerX,
      lastSeen: now
    });
  }

  function setFinished(finishTime) {
    if (!roomCode) return;
    dbFns.update(dbFns.ref(db, 'rooms/' + roomCode + '/players/' + myRole), {
      finished: true, finishTime: finishTime, lastSeen: Date.now()
    });
  }

  // Call every frame: smooth/extrapolate the remote car + detect dropout.
  function tick(dt) {
    if (!remoteLatest) return;
    const now = performance.now();
    const dtSec = (now - remoteLatest.t) / 1000;
    // z velocity in world units = speed * 10 (matches main.js: z += speed*dt*10)
    const targetZ = remoteLatest.z + remoteLatest.speed * 10 * dtSec;
    const targetX = remoteLatest.x;
    const k = 1 - Math.exp(-12 * dt);
    display.x += (targetX - display.x) * k;
    display.z += (targetZ - display.z) * k;
    display.speed = remoteLatest.speed;
    if (Date.now() - lastRemoteSeen > 8000) {
      emitStatus('opponent_left', {});
      remoteLatest = null;
    }
  }

  function getRemote() {
    if (!remoteLatest) return null;
    return {
      x: display.x, z: display.z, speed: display.speed,
      finished: opponentFinished, finishTime: opponentFinishTime,
      name: remoteLatest.name
    };
  }

  function getOpponentFinish() {
    return opponentFinished ? opponentFinishTime : null;
  }

  function cleanup() {
    unsub.forEach(function (u) { try { u(); } catch (e) {} });
    unsub = [];
  }

  function leave() {
    if (roomCode && dbFns) {
      try { dbFns.remove(dbFns.ref(db, 'rooms/' + roomCode + '/players/' + myRole)); } catch (e) {}
    }
    cleanup();
    roomCode = null; myRole = null; remoteRole = null;
    started = false; myReady = false; remoteReady = false;
    remoteLatest = null; display = { x: 0, z: 0, speed: 0 };
    opponentFinished = false; opponentFinishTime = null;
    lastRemoteSeen = 0;
  }

  function getRoomCode() { return roomCode; }
  function getMyRole() { return myRole; }
  function getLevel() { return level; }
  function isStarted() { return started; }

  return {
    init: init,
    createRoom: createRoom,
    joinRoom: joinRoom,
    setReady: setReady,
    sendState: sendState,
    setFinished: setFinished,
    tick: tick,
    getRemote: getRemote,
    getOpponentFinish: getOpponentFinish,
    leave: leave,
    cleanup: cleanup,
    getRoomCode: getRoomCode,
    getMyRole: getMyRole,
    getLevel: getLevel,
    isStarted: isStarted,
    onStatus: function (cb) { statusCb = cb || statusCb; },
    onRemote: function (cb) { remoteCb = cb || remoteCb; },
    onStart: function (cb) { startCb = cb || startCb; }
  };
})();