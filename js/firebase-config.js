// ============================================================
//  FIREBASE CONFIG  —  fill this in with your own project keys
// ============================================================
//  1. Go to https://console.firebase.google.com  ->  Add project
//  2. Click the Web icon (</>)  ->  register an app  ->  copy the config
//  3. Build  ->  Realtime Database  ->  Create database
//       ->  "Start in test mode" (open access for 30 days)
//       (or set rules below for safer access)
//  4. Paste the values below.
//
//  Leave apiKey === 'YOUR_API_KEY' to keep multiplayer disabled
//  (single-player still works fine).
//
//  Suggested Realtime Database rules (allow 2-player rooms):
//  {
//    "rules": {
//      "rooms": {
//        "$room": {
//          "players": {
//            "$player": {
//              ".read":  "data.parent().parent().child('players').exists()",
//              ".write": "auth == null && !data.exists() || !data.exists() || data.child('name').exists()"
//            }
//          },
//          "start":   { ".read": true, ".write": "data.parent().child('players/p1').exists()" },
//          "level":   { ".read": true, ".write": "data.parent().child('players/p1').exists()" }
//        }
//      }
//    }
//  }
//  (For a toy you can just leave test mode on.)
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC62aBdvD0eOhlTLPsyI6wP9kX7xXdtBtk',
  authDomain: 'retro-racer-online.firebaseapp.com',
  databaseURL: 'https://retro-racer-online-default-rtdb.firebaseio.com',
  projectId: 'retro-racer-online',
  storageBucket: 'retro-racer-online.firebasestorage.app',
  messagingSenderId: '888550556094',
  appId: '1:888550556094:web:541dc6c31da25b910af9ef'
};

// True when real keys are present.
window.MULTIPLAYER_ENABLED = function () {
  const c = window.FIREBASE_CONFIG;
  return !!(c && c.apiKey && c.apiKey !== 'YOUR_API_KEY' && c.databaseURL);
};