"use client";

import { useEffect, useRef } from "react";
import { useFeedStore } from "@/lib/store";

const N: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.0,
};

const MELODY: [string, number][] = [
  ["E5", 1], ["D5", 0.5], ["C5", 0.5], ["D5", 1], ["E5", 1], ["G5", 2],
  ["F5", 1], ["E5", 0.5], ["D5", 0.5], ["C5", 1], ["E5", 1], ["D5", 2],
  ["C5", 1], ["E5", 0.5], ["G5", 0.5], ["A5", 1], ["G5", 1], ["E5", 2],
  ["D5", 1], ["F5", 0.5], ["E5", 0.5], ["D5", 1], ["C5", 1], ["C5", 2],
  ["G4", 1], ["C5", 1], ["E5", 1], ["D5", 1.5], ["C5", 0.5], ["B4", 1],
  ["C5", 1], ["D5", 1], ["E5", 1], ["C5", 2], ["G4", 1],
  ["A4", 1], ["C5", 1], ["E5", 1], ["D5", 1], ["G5", 1], ["F5", 1],
  ["E5", 1.5], ["D5", 0.5], ["C5", 3],
];

const BASS: [string, number][] = [
  ["C4", 1], ["G4", 1], ["E4", 1],
  ["F4", 1], ["C5", 1], ["A4", 1],
  ["G4", 1], ["D5", 1], ["B4", 1],
  ["A4", 1], ["E5", 1], ["C5", 1],
];

const BEAT = 0.35;
const MELODY_BEATS = MELODY.reduce((sum, [, d]) => sum + d, 0);
const LOOP_SEC = MELODY_BEATS * BEAT + 1.5;

// Event types to listen for user gestures — declared at module level
const GESTURE_EVENTS = ["click", "touchstart", "touchend", "keydown", "scroll"];

export default function BgmPlayer() {
  const bgmMutedRef = useRef(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep bgmMutedRef in sync with store
  const { bgmMuted, setBgmMuted } = useFeedStore();
  useEffect(() => {
    bgmMutedRef.current = bgmMuted;
  }, [bgmMuted]);

  // Start audio on first user gesture
  useEffect(() => {
    const startAudio = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      // Remove all listeners immediately
      GESTURE_EVENTS.forEach((e) => document.removeEventListener(e, startAudio));

      try {
        // Create AudioContext synchronously inside gesture handler (critical!)
        const ctx = new AudioContext();
        ctxRef.current = ctx;

        // Resume if suspended (iOS Safari)
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const master = ctx.createGain();
        master.gain.value = 0.35; // Start at full volume
        master.connect(ctx.destination);
        gainRef.current = master;

        const playNote = (freq: number, time: number, dur: number, vol: number) => {
          const c = ctxRef.current;
          if (!c || c.state === "closed") return;

          const osc = c.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = freq;

          // Vibrato
          const vib = c.createOscillator();
          vib.frequency.value = 4.5;
          const vibG = c.createGain();
          vibG.gain.value = 1.5;
          vib.connect(vibG);
          vibG.connect(osc.frequency);
          vib.start(time);
          vib.stop(time + dur + 0.5);

          const g = c.createGain();
          g.gain.setValueAtTime(0, time);
          g.gain.linearRampToValueAtTime(vol, time + 0.015);
          g.gain.setValueAtTime(vol, time + dur * 0.6);
          g.gain.exponentialRampToValueAtTime(0.001, time + dur + 0.3);

          osc.connect(g);
          g.connect(master);
          osc.start(time);
          osc.stop(time + dur + 0.4);
        };

        const scheduleLoop = () => {
          const c = ctxRef.current;
          if (!c || c.state === "closed") return;
          const base = c.currentTime + 0.05;

          let t = base;
          for (const [note, dur] of MELODY) {
            playNote(N[note], t, dur * BEAT, 0.12);
            t += dur * BEAT;
          }

          let bt = base;
          let bi = 0;
          while (bt < t) {
            const [note, dur] = BASS[bi % BASS.length];
            playNote(N[note], bt, dur * BEAT, 0.04);
            bt += dur * BEAT;
            bi++;
          }
        };

        scheduleLoop();
        timerRef.current = setInterval(scheduleLoop, LOOP_SEC * 1000);

        // Set store to unmuted (don't use setBgmMuted here to avoid
        // triggering the sync effect which would cancel gain ramps)
        setBgmMuted(false);
      } catch (e) {
        console.error("BGM init failed:", e);
        startedRef.current = false;
      }
    };

    GESTURE_EVENTS.forEach((e) =>
      document.addEventListener(e, startAudio, { once: true, passive: true })
    );

    return () => {
      GESTURE_EVENTS.forEach((e) => document.removeEventListener(e, startAudio));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mute — only apply after initial startup
  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx || ctx.state === "closed") return;

    // Skip if AudioContext was just created (< 1 second old)
    if (ctx.currentTime < 1) return;

    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(bgmMuted ? 0 : 0.35, now + 0.4);
  }, [bgmMuted]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        ctxRef.current.close();
      }
    };
  }, []);

  return null;
}
