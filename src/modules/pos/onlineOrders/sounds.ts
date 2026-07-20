import type { OnlinePlatformId, OnlineSoundKind } from './types';
import { getPlatform } from './platforms';

/** Lightweight Web Audio beeps — distinct per channel, no asset downloads */
function beep(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.08) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000);
    setTimeout(() => void ctx.close(), durationMs + 50);
  } catch {
    /* ignore autoplay blocks */
  }
}

export function playSound(kind: OnlineSoundKind) {
  switch (kind) {
    case 'swiggy':
      beep(520, 120, 'triangle');
      setTimeout(() => beep(660, 140, 'triangle'), 100);
      break;
    case 'zomato':
      beep(440, 100, 'square', 0.06);
      setTimeout(() => beep(380, 160, 'square', 0.06), 90);
      break;
    case 'website':
      beep(700, 90, 'sine');
      setTimeout(() => beep(880, 110, 'sine'), 80);
      break;
    case 'high_priority':
      beep(880, 80, 'sawtooth', 0.07);
      setTimeout(() => beep(880, 80, 'sawtooth', 0.07), 120);
      setTimeout(() => beep(1100, 120, 'sawtooth', 0.07), 240);
      break;
    case 'late_pickup':
      beep(300, 200, 'square', 0.05);
      setTimeout(() => beep(280, 250, 'square', 0.05), 220);
      break;
    default:
      beep(600, 100);
  }
}

export function playPlatformSound(platformId: OnlinePlatformId, mutedPlatforms: OnlinePlatformId[], soundsEnabled: boolean) {
  if (!soundsEnabled) return;
  if (mutedPlatforms.includes(platformId)) return;
  playSound(getPlatform(platformId).sound);
}
