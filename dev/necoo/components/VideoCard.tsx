"use client";

import { useRef, useEffect, useState } from "react";
import PawLoader from "./PawLoader";
import type { Video } from "@/lib/types";

const PALETTES = [
  { bg: "#0d0d1a", accent: "#ff6b9d" },
  { bg: "#0a1628", accent: "#ffd93d" },
  { bg: "#1a0a2e", accent: "#6bcfff" },
  { bg: "#0f1a12", accent: "#a8e6cf" },
  { bg: "#1a1008", accent: "#ff8a5c" },
  { bg: "#120a1a", accent: "#dda0dd" },
  { bg: "#0a0f1e", accent: "#88d8b0" },
  { bg: "#1a0f0f", accent: "#ff6f61" },
];

interface VideoCardProps {
  video: Video;
  index: number;
  nextBg?: string;
  priority?: boolean;
}

export default function VideoCard({ video, index, nextBg, priority = false }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const visibleRef = useRef(false);

  const palette = PALETTES[index % PALETTES.length];
  const bgColor = palette.bg;
  const bgNext = nextBg || bgColor;

  const aspectRatio = video.width && video.height
    ? video.height / video.width
    : 16 / 9;

  function tryPlay() {
    const vid = videoRef.current;
    if (!vid || !visibleRef.current) return;
    if (!vid.paused) {
      setPlaying(true);
      return;
    }
    vid.muted = true;
    vid.play().then(() => setPlaying(true)).catch(() => {});
  }

  // Intersection Observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        const vid = videoRef.current;
        if (!vid) return;

        if (entry.isIntersecting) {
          vid.muted = true;
          vid.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          vid.pause();
          setPlaying(false);
        }
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Retry autoplay after user gesture (for browsers that block initial autoplay)
  useEffect(() => {
    const retryPlay = () => {
      const vid = videoRef.current;
      if (!vid || !visibleRef.current || !vid.paused) return;
      vid.muted = true;
      vid.play().then(() => setPlaying(true)).catch(() => {});
    };

    const events = ["click", "touchstart", "scroll"];
    events.forEach((e) => document.addEventListener(e, retryPlay, { once: true, passive: true }));

    return () => {
      events.forEach((e) => document.removeEventListener(e, retryPlay));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex justify-center items-center overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor} 70%, ${bgNext} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${palette.accent}06 0%, transparent 70%)`,
        }}
      />

      {[0, 1, 2].map((j) => (
        <div
          key={j}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + j * 2,
            height: 2 + j * 2,
            background: palette.accent,
            opacity: 0.06 + j * 0.02,
            left: `${18 + j * 28}%`,
            top: `${25 + j * 18}%`,
            animation: `float${j} ${3 + j * 1.5}s ease-in-out infinite`,
            animationDelay: `${j * 0.3 + index * 0.15}s`,
          }}
        />
      ))}

      <div className="relative w-full max-w-[420px] mx-auto">
        <div
          className="w-full bg-black/60"
          style={{ paddingBottom: `${aspectRatio * 100}%` }}
        />

        <video
          ref={videoRef}
          src={video.url}
          poster={video.poster}
          autoPlay
          loop
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          onCanPlay={tryPlay}
          onLoadedData={tryPlay}
          onPlaying={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Poster fades out when playing */}
        {video.poster && (
          <img
            src={video.poster}
            alt=""
            loading={priority ? "eager" : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${
              playing ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {!video.poster && !playing && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(160deg, #f5ebe0 0%, #eddcd2 40%, #e8d5c4 100%)" }}
          >
            <PawLoader variant="inline" />
          </div>
        )}
      </div>
    </div>
  );
}
