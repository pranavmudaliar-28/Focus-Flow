// Focus Flow – audio.js
// Runs in the persistent audio.html tab.
// AudioContext starts from a real user-visible page so no autoplay issues.
// Receives commands from popup.js via chrome.storage (polling).

'use strict';

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────── */
let AC         = null;
let masterGain = null;
let layers     = [];
let currentId  = null;
let pollTimer  = null;

/* ────────────────────────────────────────────────────────────
   SOUND DEFINITIONS
   Format: [noiseType, vol, lpFreq, resonance, lfoHz, lfoDepth]
   ALL sounds route through a LOW-PASS filter so actual sound
   reaches the speakers. BandPass was cutting everything.
──────────────────────────────────────────────────────────── */
const SOUNDS = {
  rain: {
    name: '🌧️ Rain',
    layers: [
      // Main shower: pink noise → bandpass around 1.5kHz (gentle shower)
      { type:'pink',  vol:0.7, filter:{ type:'bandpass', freq:1500, Q:0.5 }, lfo:{ rate:0.15, depth:0.15 } },
      // Low rumble: brown noise → lowpass at 200Hz
      { type:'brown', vol:0.5, filter:{ type:'lowpass',  freq:200,  Q:0.7 }, lfo:{ rate:0.06, depth:0.12 } },
    ]
  },
  storm: {
    name: '⛈️ Storm',
    layers: [
      { type:'brown', vol:0.8, filter:{ type:'lowpass',  freq:180,  Q:0.5 }, lfo:{ rate:0.05, depth:0.35 } },
      { type:'pink',  vol:0.65,filter:{ type:'bandpass', freq:2000, Q:0.4 }, lfo:{ rate:0.20, depth:0.25 } },
      { type:'white', vol:0.3, filter:{ type:'highpass', freq:3000, Q:0.5 }, lfo:{ rate:0.35, depth:0.40 } },
    ]
  },
  forest: {
    name: '🌲 Forest',
    layers: [
      { type:'pink',  vol:0.5, filter:{ type:'bandpass', freq:800,  Q:0.6 }, lfo:{ rate:0.08, depth:0.10 } },
      { type:'brown', vol:0.35,filter:{ type:'lowpass',  freq:150,  Q:0.5 }, lfo:{ rate:0.03, depth:0.08 } },
    ]
  },
  ocean: {
    name: '🌊 Ocean',
    layers: [
      { type:'brown', vol:0.8, filter:{ type:'lowpass',  freq:250,  Q:0.4 }, lfo:{ rate:0.08, depth:0.45 } },
      { type:'pink',  vol:0.4, filter:{ type:'bandpass', freq:600,  Q:0.5 }, lfo:{ rate:0.12, depth:0.20 } },
    ]
  },
  fire: {
    name: '🔥 Fireplace',
    layers: [
      { type:'brown', vol:0.75,filter:{ type:'lowpass',  freq:160,  Q:0.6 }, lfo:{ rate:0.10, depth:0.28 } },
      { type:'pink',  vol:0.35,filter:{ type:'bandpass', freq:500,  Q:0.7 }, lfo:{ rate:0.18, depth:0.32 } },
    ]
  },
  cafe: {
    name: '☕ Café',
    layers: [
      { type:'pink',  vol:0.55,filter:{ type:'bandpass', freq:1000, Q:0.45}, lfo:{ rate:0.12, depth:0.14 } },
      { type:'brown', vol:0.35,filter:{ type:'lowpass',  freq:300,  Q:0.5 }, lfo:{ rate:0.04, depth:0.08 } },
    ]
  },
  wind: {
    name: '🍃 Wind',
    layers: [
      { type:'pink',  vol:0.6, filter:{ type:'bandpass', freq:600,  Q:0.4 }, lfo:{ rate:0.07, depth:0.38 } },
      { type:'brown', vol:0.35,filter:{ type:'lowpass',  freq:120,  Q:0.5 }, lfo:{ rate:0.03, depth:0.22 } },
    ]
  },
  brown: {
    name: '🎧 Brown Noise',
    layers: [
      { type:'brown', vol:0.85,filter:{ type:'lowpass',  freq:800,  Q:0.5 }, lfo:{ rate:0.02, depth:0.04 } },
    ]
  },
  white: {
    name: '📻 White Noise',
    layers: [
      { type:'white', vol:0.65,filter:{ type:'lowpass',  freq:8000, Q:0.5 }, lfo:{ rate:0.01, depth:0.03 } },
    ]
  },
};

/* ────────────────────────────────────────────────────────────
   NOISE BUFFER GENERATORS
   Each generates 15 seconds of stereo noise, slightly different
   per channel to create a natural stereo image.
──────────────────────────────────────────────────────────── */
function makePink(ctx) {
  const SECS = 15;
  const buf  = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function makeBrown(ctx) {
  const SECS = 15;
  const buf  = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = Math.max(-1, Math.min(1, last * 3.5));
    }
  }
  return buf;
}

function makeWhite(ctx) {
  const SECS = 15;
  const buf  = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.7;
    }
  }
  return buf;
}

/* ────────────────────────────────────────────────────────────
   BUILD ONE LAYER
──────────────────────────────────────────────────────────── */
function buildLayer(ctx, def, dest) {
  // 1. Generate noise buffer
  const buf = def.type === 'pink'  ? makePink(ctx)
            : def.type === 'brown' ? makeBrown(ctx)
            : makeWhite(ctx);

  // 2. Looping source — randomise loop point so layers don't phase-lock
  const src = ctx.createBufferSource();
  src.buffer    = buf;
  src.loop      = true;
  src.loopStart = Math.random() * 7;
  src.loopEnd   = 15;

  // 3. Filter — shape the noise into the right texture
  const filt = ctx.createBiquadFilter();
  filt.type            = def.filter.type;
  filt.frequency.value = def.filter.freq;
  filt.Q.value         = def.filter.Q || 0.5;

  // 4. Layer gain
  const gain = ctx.createGain();
  gain.gain.value = def.vol;

  // 5. LFO — makes the volume breathe organically (rain gusts, fire crackle)
  const lfo     = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type            = 'sine';
  lfo.frequency.value = def.lfo.rate;
  lfoGain.gain.value  = def.lfo.depth * def.vol * 0.8;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);   // LFO modulates the layer gain

  // 6. Signal chain: src → filter → gain → masterGain → speakers
  src.connect(filt);
  filt.connect(gain);
  gain.connect(dest);

  // 7. Start
  src.start(0);
  lfo.start(0);

  return { src, lfo, gain };
}

/* ────────────────────────────────────────────────────────────
   PLAY / STOP / VOLUME
──────────────────────────────────────────────────────────── */
function playSound(id, volume) {
  stopSound();

  const meta = SOUNDS[id];
  if (!meta) { console.warn('[audio] unknown sound:', id); return; }

  // Create context — this page is visible so autoplay is allowed
  try {
    AC = new AudioContext({ sampleRate: 44100 });
  } catch(e) {
    AC = new webkitAudioContext();
  }

  // Resume in case browser suspended it
  if (AC.state === 'suspended') AC.resume();

  masterGain = AC.createGain();
  masterGain.gain.value = clamp(volume, 0, 1);
  masterGain.connect(AC.destination);

  currentId = id;
  layers    = meta.layers.map(def => buildLayer(AC, def, masterGain));

  // Update UI
  const sname = document.getElementById('sname');
  const eq    = document.getElementById('eq');
  if (sname) sname.textContent = meta.name;
  if (eq)    eq.style.display  = 'flex';
}

function stopSound() {
  layers.forEach(l => {
    try { l.src.stop(0); } catch(_) {}
    try { l.lfo.stop(0); } catch(_) {}
  });
  layers    = [];
  currentId = null;

  if (AC) {
    try { AC.close(); } catch(_) {}
    AC = null;
  }
  masterGain = null;

  // Update UI
  const sname = document.getElementById('sname');
  const eq    = document.getElementById('eq');
  if (sname) sname.textContent = 'Stopped';
  if (eq)    eq.style.display  = 'none';
}

function setVolume(v) {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(clamp(v, 0, 1), AC.currentTime, 0.05);
  }
}

function setLayerGain(index, v) {
  if (layers[index]) {
    layers[index].gain.gain.setTargetAtTime(clamp(v, 0, 1), AC.currentTime, 0.05);
  }
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/* ────────────────────────────────────────────────────────────
   COMMAND POLLING
   Popup writes commands to chrome.storage.local.
   We poll every 300ms and execute them here.
   This is the most reliable cross-context communication method.
──────────────────────────────────────────────────────────── */
async function pollCommands() {
  try {
    const { audioCmd } = await chrome.storage.local.get('audioCmd');
    if (!audioCmd) return;

    // Clear the command so we don't re-process
    await chrome.storage.local.remove('audioCmd');

    switch (audioCmd.type) {
      case 'PLAY':
        playSound(audioCmd.id, audioCmd.volume ?? 0.6);
        break;
      case 'STOP':
        stopSound();
        break;
      case 'VOLUME':
        setVolume(audioCmd.volume ?? 0.6);
        break;
      case 'LAYER':
        setLayerGain(audioCmd.index, audioCmd.volume ?? 0.5);
        break;
    }
  } catch(_) {}
}

/* ────────────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Mark this audio tab as open
  await chrome.storage.local.set({ audioTabOpen: true });

  // Restore any sound that was playing
  try {
    const { sound } = await chrome.storage.local.get('sound');
    if (sound?.id) {
      playSound(sound.id, sound.volume ?? 0.6);
    } else {
      document.getElementById('sname').textContent = 'No sound selected';
    }
  } catch(_) {}

  // Poll for commands from popup
  pollTimer = setInterval(pollCommands, 300);
});

// Cleanup when tab is closed
window.addEventListener('beforeunload', async () => {
  clearInterval(pollTimer);
  stopSound();
  try { await chrome.storage.local.set({ audioTabOpen: false }); } catch(_) {}
});
