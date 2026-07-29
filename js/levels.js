const LevelConfig = {
  1: {
    name: 'Straight Road',
    description: 'A simple straight road',
    roadWidth: 2000,
    laneCount: 4,
    curveAmount: 0,
    obstacleDensity: 0.3,
    obstacleSpeed: 0,
    maxSpeed: 200,
    segmentLength: 200,
    segmentsPerLevel: 400,
    colors: {
      sky: '#7ec8e3',
      road: '#444',
      roadBorder: '#fff',
      grass: '#2d5a27',
      rumble: '#c00'
    }
  },
  2: {
    name: 'Gentle Curves',
    description: 'Basic curves introduced',
    roadWidth: 2000,
    laneCount: 4,
    curveAmount: 2,
    obstacleDensity: 0.4,
    obstacleSpeed: 0,
    maxSpeed: 220,
    segmentLength: 200,
    segmentsPerLevel: 1000,
    colors: {
      sky: '#5b9bd5',
      road: '#555',
      roadBorder: '#ff0',
      grass: '#3a7a34',
      rumble: '#ff0'
    }
  },
  3: {
    name: 'Winding Highway',
    description: 'Tighter curves and more obstacles',
    roadWidth: 2200,
    laneCount: 6,
    curveAmount: 4,
    obstacleDensity: 0.5,
    obstacleSpeed: 30,
    maxSpeed: 240,
    segmentLength: 200,
    segmentsPerLevel: 1200,
    colors: {
      sky: '#3a6bc5',
      road: '#3a3a3a',
      roadBorder: '#0ff',
      grass: '#4a9a44',
      rumble: '#0f0'
    }
  },
  4: {
    name: 'Mountain Pass',
    description: 'Sharp curves, higher difficulty',
    roadWidth: 2200,
    laneCount: 6,
    curveAmount: 5,
    obstacleDensity: 0.6,
    obstacleSpeed: 50,
    maxSpeed: 250,
    segmentLength: 200,
    segmentsPerLevel: 1400,
    colors: {
      sky: '#2c4a8c',
      road: '#2a2a2a',
      roadBorder: '#f0f',
      grass: '#5aaa54',
      rumble: '#f0f'
    }
  },
  5: {
    name: 'Speed Demon',
    description: 'Maximum difficulty with fast obstacles',
    roadWidth: 2400,
    laneCount: 6,
    curveAmount: 7,
    obstacleDensity: 0.7,
    obstacleSpeed: 80,
    maxSpeed: 280,
    segmentLength: 200,
    segmentsPerLevel: 1600,
    colors: {
      sky: '#1a2a5c',
      road: '#1a1a1a',
      roadBorder: '#f80',
      grass: '#6aba64',
      rumble: '#f80'
    }
  }
};

function getLevel(levelNum) {
  return LevelConfig[levelNum] || LevelConfig[1];
}
