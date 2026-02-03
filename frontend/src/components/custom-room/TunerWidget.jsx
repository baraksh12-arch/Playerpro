import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GUITAR_STRINGS = [
  { name: 'E', frequency: 82.41 },
  { name: 'A', frequency: 110.00 },
  { name: 'D', frequency: 146.83 },
  { name: 'G', frequency: 196.00 },
  { name: 'B', frequency: 246.94 },
  { name: 'E', frequency: 329.63 },
];

export default function TunerWidget() {
  const [isListening, setIsListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState('--');
  const [cents, setCents] = useState(0);
  const audioContextRef = useRef(null);

  const playReferenceTone = (frequency) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.2);
  };

  const getTuningColor = () => {
    if (Math.abs(cents) <= 5) return 'text-green-400';
    if (Math.abs(cents) <= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Note Display */}
      <div className="text-center">
        <div className={`text-7xl font-black transition-colors ${getTuningColor()}`}>
          {detectedNote}
        </div>
        <div className="text-sm text-purple-200 mt-2">Detected Note</div>
      </div>

      {/* Cents Display */}
      <div className="h-3 bg-white/20 rounded-full overflow-hidden relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-green-400 z-10 transform -translate-x-1/2" />
        <div
          className="absolute top-0 bottom-0 w-1 bg-white transition-all"
          style={{
            left: `${50 + Math.max(-50, Math.min(50, cents))}%`,
          }}
        />
      </div>

      {/* Reference Tones */}
      <div className="grid grid-cols-3 gap-2">
        {GUITAR_STRINGS.map((string, idx) => (
          <button
            key={idx}
            onClick={() => playReferenceTone(string.frequency)}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all hover:scale-105 border border-white/20"
          >
            {string.name}
          </button>
        ))}
      </div>

      {/* Mic Button */}
      <Button
        onClick={() => setIsListening(!isListening)}
        className={`w-full h-14 rounded-2xl font-bold text-lg ${
          isListening
            ? 'bg-red-500/30 hover:bg-red-500/40 border-red-500/50'
            : 'bg-cyan-500/30 hover:bg-cyan-500/40 border-cyan-500/50'
        } backdrop-blur-xl border`}
      >
        {isListening ? <MicOff className="w-6 h-6 mr-2" /> : <Mic className="w-6 h-6 mr-2" />}
        {isListening ? 'Stop Tuner' : 'Start Tuner'}
      </Button>
    </div>
  );
}