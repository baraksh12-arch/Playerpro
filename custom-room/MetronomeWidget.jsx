import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MetronomeWidget() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [currentBeat, setCurrentBeat] = useState(0);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const beatsPerMeasure = 4;

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playClick = (isAccent = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = isAccent ? 1200 : 880;
    gainNode.gain.value = isAccent ? 0.3 : 0.15;

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  useEffect(() => {
    if (isPlaying) {
      const interval = (60 / bpm) * 1000;
      intervalRef.current = setInterval(() => {
        setCurrentBeat((prev) => {
          const nextBeat = (prev + 1) % beatsPerMeasure;
          playClick(nextBeat === 0);
          return nextBeat;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setCurrentBeat(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm]);

  return (
    <div className="space-y-4">
      {/* BPM Display */}
      <div className="text-center">
        <div className="text-7xl font-black text-white mb-2">
          {bpm}
        </div>
        <div className="text-sm text-purple-200">BPM</div>
      </div>

      {/* BPM Slider */}
      <input
        type="range"
        min="30"
        max="240"
        value={bpm}
        onChange={(e) => setBpm(parseInt(e.target.value))}
        className="w-full h-3 bg-white/20 rounded-full appearance-none cursor-pointer slider-white"
      />

      {/* Beat Indicator */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: beatsPerMeasure }).map((_, index) => (
          <div
            key={index}
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
              index === currentBeat && isPlaying
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white scale-110 shadow-lg shadow-green-500/50'
                : 'bg-white/20 text-white/60'
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* Play/Pause */}
      <Button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-full h-14 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-lg backdrop-blur-xl border border-white/30"
      >
        {isPlaying ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
        {isPlaying ? 'Stop' : 'Start'}
      </Button>
    </div>
  );
}