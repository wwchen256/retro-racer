const Save = (function() {
  const STORAGE_KEY = 'retro_racer_save';

  function getDefaultData() {
    return {
      unlockedLevels: 1,
      highScore: 0,
      levelScores: {},
      totalPlayTime: 0,
      lastLevel: 1
    };
  }

  function load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return getDefaultData();
   }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
   }

  function getHighScore() {
    return load().highScore;
   }

  function setHighScore(score) {
    const data = load();
    data.highScore = Math.max(data.highScore, score);
    save(data);
    return data.highScore;
   }

  function getUnlockedLevels() {
    return load().unlockedLevels;
   }

  function unlockLevel(level) {
    const data = load();
    if (level > data.unlockedLevels && level <= 5) {
      data.unlockedLevels = level;
      save(data);
     }
   }

  function saveLevelScore(level, score) {
    const data = load();
    if (!data.levelScores[level] || score > data.levelScores[level]) {
      data.levelScores[level] = score;
      save(data);
    }
  }

  function saveProgress(level) {
    const data = load();
    data.lastLevel = level;
    save(data);
  }

  function getLastLevel() {
    return load().lastLevel || 1;
  }

  function hasSave() {
    return !!localStorage.getItem(STORAGE_KEY);
   }

  return {
    load,
    save,
    getHighScore,
    setHighScore,
    getUnlockedLevels,
    unlockLevel,
    saveLevelScore,
    saveProgress,
    getLastLevel,
    hasSave
  };
})();
