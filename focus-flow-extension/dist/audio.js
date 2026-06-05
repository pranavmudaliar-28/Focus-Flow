var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// audio.js
var require_audio = __commonJS({
  "audio.js"() {
    var AC = null;
    var masterGain = null;
    var layers = [];
    var currentId = null;
    var pollTimer = null;
    var SOUNDS = {
      rain: {
        name: "\u{1F327}\uFE0F Rain",
        layers: [
          // Main shower: pink noise → bandpass around 1.5kHz (gentle shower)
          { type: "pink", vol: 0.7, filter: { type: "bandpass", freq: 1500, Q: 0.5 }, lfo: { rate: 0.15, depth: 0.15 } },
          // Low rumble: brown noise → lowpass at 200Hz
          { type: "brown", vol: 0.5, filter: { type: "lowpass", freq: 200, Q: 0.7 }, lfo: { rate: 0.06, depth: 0.12 } }
        ]
      },
      storm: {
        name: "\u26C8\uFE0F Storm",
        layers: [
          { type: "brown", vol: 0.8, filter: { type: "lowpass", freq: 180, Q: 0.5 }, lfo: { rate: 0.05, depth: 0.35 } },
          { type: "pink", vol: 0.65, filter: { type: "bandpass", freq: 2e3, Q: 0.4 }, lfo: { rate: 0.2, depth: 0.25 } },
          { type: "white", vol: 0.3, filter: { type: "highpass", freq: 3e3, Q: 0.5 }, lfo: { rate: 0.35, depth: 0.4 } }
        ]
      },
      forest: {
        name: "\u{1F332} Forest",
        layers: [
          { type: "pink", vol: 0.5, filter: { type: "bandpass", freq: 800, Q: 0.6 }, lfo: { rate: 0.08, depth: 0.1 } },
          { type: "brown", vol: 0.35, filter: { type: "lowpass", freq: 150, Q: 0.5 }, lfo: { rate: 0.03, depth: 0.08 } }
        ]
      },
      ocean: {
        name: "\u{1F30A} Ocean",
        layers: [
          { type: "brown", vol: 0.8, filter: { type: "lowpass", freq: 250, Q: 0.4 }, lfo: { rate: 0.08, depth: 0.45 } },
          { type: "pink", vol: 0.4, filter: { type: "bandpass", freq: 600, Q: 0.5 }, lfo: { rate: 0.12, depth: 0.2 } }
        ]
      },
      fire: {
        name: "\u{1F525} Fireplace",
        layers: [
          { type: "brown", vol: 0.75, filter: { type: "lowpass", freq: 160, Q: 0.6 }, lfo: { rate: 0.1, depth: 0.28 } },
          { type: "pink", vol: 0.35, filter: { type: "bandpass", freq: 500, Q: 0.7 }, lfo: { rate: 0.18, depth: 0.32 } }
        ]
      },
      cafe: {
        name: "\u2615 Caf\xE9",
        layers: [
          { type: "pink", vol: 0.55, filter: { type: "bandpass", freq: 1e3, Q: 0.45 }, lfo: { rate: 0.12, depth: 0.14 } },
          { type: "brown", vol: 0.35, filter: { type: "lowpass", freq: 300, Q: 0.5 }, lfo: { rate: 0.04, depth: 0.08 } }
        ]
      },
      wind: {
        name: "\u{1F343} Wind",
        layers: [
          { type: "pink", vol: 0.6, filter: { type: "bandpass", freq: 600, Q: 0.4 }, lfo: { rate: 0.07, depth: 0.38 } },
          { type: "brown", vol: 0.35, filter: { type: "lowpass", freq: 120, Q: 0.5 }, lfo: { rate: 0.03, depth: 0.22 } }
        ]
      },
      brown: {
        name: "\u{1F3A7} Brown Noise",
        layers: [
          { type: "brown", vol: 0.85, filter: { type: "lowpass", freq: 800, Q: 0.5 }, lfo: { rate: 0.02, depth: 0.04 } }
        ]
      },
      white: {
        name: "\u{1F4FB} White Noise",
        layers: [
          { type: "white", vol: 0.65, filter: { type: "lowpass", freq: 8e3, Q: 0.5 }, lfo: { rate: 0.01, depth: 0.03 } }
        ]
      }
    };
    function makePink(ctx) {
      const SECS = 15;
      const buf = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      }
      return buf;
    }
    function makeBrown(ctx) {
      const SECS = 15;
      const buf = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
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
      const buf = ctx.createBuffer(2, ctx.sampleRate * SECS, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) {
          d[i] = (Math.random() * 2 - 1) * 0.7;
        }
      }
      return buf;
    }
    function buildLayer(ctx, def, dest) {
      const buf = def.type === "pink" ? makePink(ctx) : def.type === "brown" ? makeBrown(ctx) : makeWhite(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = Math.random() * 7;
      src.loopEnd = 15;
      const filt = ctx.createBiquadFilter();
      filt.type = def.filter.type;
      filt.frequency.value = def.filter.freq;
      filt.Q.value = def.filter.Q || 0.5;
      const gain = ctx.createGain();
      gain.gain.value = def.vol;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = def.lfo.rate;
      lfoGain.gain.value = def.lfo.depth * def.vol * 0.8;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(dest);
      src.start(0);
      lfo.start(0);
      return { src, lfo, gain };
    }
    function playSound(id, volume) {
      stopSound();
      const meta = SOUNDS[id];
      if (!meta) {
        console.warn("[audio] unknown sound:", id);
        return;
      }
      try {
        AC = new AudioContext({ sampleRate: 44100 });
      } catch (e) {
        AC = new webkitAudioContext();
      }
      if (AC.state === "suspended") AC.resume();
      masterGain = AC.createGain();
      masterGain.gain.value = clamp(volume, 0, 1);
      masterGain.connect(AC.destination);
      currentId = id;
      layers = meta.layers.map((def) => buildLayer(AC, def, masterGain));
      const sname = document.getElementById("sname");
      const eq = document.getElementById("eq");
      if (sname) sname.textContent = meta.name;
      if (eq) eq.style.display = "flex";
    }
    function stopSound() {
      layers.forEach((l) => {
        try {
          l.src.stop(0);
        } catch (_) {
        }
        try {
          l.lfo.stop(0);
        } catch (_) {
        }
      });
      layers = [];
      currentId = null;
      if (AC) {
        try {
          AC.close();
        } catch (_) {
        }
        AC = null;
      }
      masterGain = null;
      const sname = document.getElementById("sname");
      const eq = document.getElementById("eq");
      if (sname) sname.textContent = "Stopped";
      if (eq) eq.style.display = "none";
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
    function clamp(v, lo, hi) {
      return Math.min(hi, Math.max(lo, v));
    }
    async function pollCommands() {
      try {
        const { audioCmd } = await chrome.storage.local.get("audioCmd");
        if (!audioCmd) return;
        await chrome.storage.local.remove("audioCmd");
        switch (audioCmd.type) {
          case "PLAY":
            playSound(audioCmd.id, audioCmd.volume ?? 0.6);
            break;
          case "STOP":
            stopSound();
            break;
          case "VOLUME":
            setVolume(audioCmd.volume ?? 0.6);
            break;
          case "LAYER":
            setLayerGain(audioCmd.index, audioCmd.volume ?? 0.5);
            break;
        }
      } catch (_) {
      }
    }
    document.addEventListener("DOMContentLoaded", async () => {
      await chrome.storage.local.set({ audioTabOpen: true });
      try {
        const { sound } = await chrome.storage.local.get("sound");
        if (sound?.id) {
          playSound(sound.id, sound.volume ?? 0.6);
        } else {
          document.getElementById("sname").textContent = "No sound selected";
        }
      } catch (_) {
      }
      pollTimer = setInterval(pollCommands, 300);
    });
    window.addEventListener("beforeunload", async () => {
      clearInterval(pollTimer);
      stopSound();
      try {
        await chrome.storage.local.set({ audioTabOpen: false });
      } catch (_) {
      }
    });
  }
});
export default require_audio();
//# sourceMappingURL=audio.js.map
