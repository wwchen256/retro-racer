const Sound = (function() {
  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicPlaying = false;
  let musicInterval = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(ctx.destination);
  }

  function playTone(frequency, duration, type = 'square', gainNode = null) {
    if (!ctx) return;
    if (!Number.isFinite(frequency) || frequency <= 0) {
      console.warn('playTone: bad frequency', frequency);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode || sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playNote(freq, duration) {
    playTone(freq, duration, 'square');
  }

  function engineSound() {
    if (!ctx) return;
    playTone(80 + (Car ? Car.getSpeed() * 2 : 0), 0.1, 'sawtooth');
  }

  function accelerate() {
    playTone(220, 0.08, 'square');
  }

  function brake() {
    playTone(110, 0.15, 'sawtooth');
  }

  function collision() {
    if (!ctx) return;
    const now = ctx.currentTime;
    playTone(80, 0.3, 'sawtooth');
    playTone(60, 0.4, 'square');
  }

  function levelComplete() {
    if (!ctx) return;
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((note, i) => {
      setTimeout(() => playTone(note, 0.15, 'square'), i * 100);
    });
  }

  function menuSelect() {
    playTone(440, 0.05, 'square');
  }

  const bassMelody = [110, 110, 146, 146, 130, 130, 98, 98];
  let bassIndex = 0;

  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    bassIndex = 0;
    const tempo = 200;
    musicInterval = setInterval(() => {
      if (!musicPlaying) return;
      const note = bassMelody[bassIndex % bassMelody.length];
      playTone(note, 0.15, 'triangle', musicGain);
      playTone(note * 2, 0.1, 'square', musicGain);
      bassIndex++;
    }, tempo);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  return { init, engineSound, accelerate, brake, collision, levelComplete, menuSelect, startMusic, stopMusic };
})();
