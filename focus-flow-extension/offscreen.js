// Focus Flow – offscreen.js
// Runs in an invisible offscreen document created by background.js.
// Two jobs:
//   1. Synthesize short, priority-based announcement alert chimes (Web Audio).
//   2. Host the persistent real-time Firestore announcement listener — the MV3
//      service worker gets suspended after ~30s, but this offscreen document
//      stays alive, so the live connection delivers announcements within seconds
//      even when the popup is closed. On each change it wakes the SW to fire the
//      notification + badge (and the SW tells us to chime).

import {
  auth, db, collection, query, where, onSnapshot, onAuthStateChanged,
} from './firebase-config.js';

let AC = null;
function ctx() {
  if (!AC) AC = new (self.AudioContext || self.webkitAudioContext)();
  return AC;
}

// One beep: oscillator -> gain envelope -> output. Exponential ramps keep it click-free.
function beep({ freq = 880, start = 0, dur = 0.15, type = 'sine', gain = 0.25 }) {
  const ac  = ctx();
  const t0  = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// Same alert alarm for every announcement, regardless of priority — a repeating
// two-tone alarm (~2s), loud + square wave so it's clearly audible.
function playChime(/* priority (unused — uniform alarm) */) {
  const ac = ctx();
  if (ac.state === 'suspended') ac.resume();

  let t = 0;
  for (let i = 0; i < 5; i++) {
    beep({ freq: 880, start: t,        dur: 0.16, type: 'square', gain: 0.34 });
    beep({ freq: 660, start: t + 0.18, dur: 0.16, type: 'square', gain: 0.34 });
    t += 0.40;
  }
}

/* ────────────────────────────────────────────────────────────
   REAL-TIME ANNOUNCEMENT LISTENER
   Lives here (not the SW) because the offscreen document persists,
   so Firestore's live connection delivers changes instantly.
   NOTE: offscreen documents only get `chrome.runtime` — NOT chrome.storage —
   so the orgId is pushed in by the service worker via messages, not read here.
──────────────────────────────────────────────────────────── */
let annUnsub   = null;
let listenOrg  = null;   // org the onSnapshot is currently attached to
let desiredOrg = null;   // org the SW told us to watch (null = none)
let authedUser = null;   // current Firebase user (auth works here via IndexedDB)

function reconcile() {
  const wantOrg = (authedUser && desiredOrg) ? desiredOrg : null;
  if (wantOrg === listenOrg) return;            // already in the desired state
  if (annUnsub) { annUnsub(); annUnsub = null; }
  listenOrg = wantOrg;
  if (!wantOrg) return;

  annUnsub = onSnapshot(
    query(collection(db, 'organisations', wantOrg, 'announcements'), where('active', '==', true)),
    (snap) => {
      const active = snap.docs
        .map(d => ({
          id:       d.id,
          message:  d.data().message || '',
          priority: d.data().priority || 'information',
        }))
        .filter(a => a.message);
      // Wake the service worker to notify + recompute the badge + trigger the chime.
      chrome.runtime.sendMessage({ type: 'ANNOUNCEMENTS_SNAPSHOT', active }).catch(() => {});
    },
    (err) => console.warn('[FF] offscreen ann listener:', err)
  );
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.target !== 'offscreen') return;
  if (msg.type === 'PLAY_ANNOUNCEMENT_SOUND') {
    try { playChime(msg.priority || 'information'); }
    catch (e) { console.warn('[FF] chime:', e); }
  } else if (msg.type === 'START_ANN_LISTENER') {
    desiredOrg = msg.orgId || null;
    reconcile();
  }
});

// Firebase auth restores from IndexedDB (works in offscreen); attach once ready.
onAuthStateChanged(auth, (u) => { authedUser = u; reconcile(); });

// Ask the service worker for the current org (it has chrome.storage; we don't).
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => {});
