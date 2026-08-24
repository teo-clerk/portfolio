/**
 * Shared Web Audio context for procedural sound effects.
 *
 * Previously each sound constructed its own `AudioContext` and never closed it.
 * Chrome caps hardware contexts around six and iOS Safari is stricter, so audio
 * died silently after a handful of effects while the contexts leaked. There is
 * exactly one context here, created lazily on first use.
 */

let ctx = null;

const getContext = () => {
  if (ctx) return ctx;
  const Ctor =
    typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch (err) {
    console.warn('Web Audio unavailable:', err);
    return null;
  }
  return ctx;
};

const PRESETS = {
  eat: { freq: 600, rampTo: 800, duration: 0.1, type: 'square' },
  die: { freq: 150, rampTo: 50, duration: 0.5, type: 'sawtooth' },
};

/**
 * Play a short procedural tone. Safe to call before any user gesture — it will
 * simply be inaudible until the browser unlocks audio.
 */
export const playTone = (name) => {
  const preset = PRESETS[name];
  if (!preset) {
    console.warn(`Unknown sound preset: ${name}`);
    return;
  }

  const audio = getContext();
  if (!audio) return;

  // Browsers suspend the context until a user gesture; resume opportunistically.
  if (audio.state === 'suspended') {
    audio.resume().catch(() => { /* still locked — the tone is just silent */ });
  }

  try {
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.freq, now);
    osc.frequency.exponentialRampToValueAtTime(preset.rampTo, now + preset.duration);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(now);
    osc.stop(now + preset.duration);

    // Release the nodes once they have finished rather than letting them
    // accumulate on the graph for the lifetime of the context.
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch (err) {
    console.warn('Failed to play tone:', err);
  }
};
