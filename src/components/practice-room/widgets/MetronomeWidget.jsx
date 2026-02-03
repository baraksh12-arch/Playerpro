import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function MetronomeWidget() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSignature, setTimeSignature] = useState(4);
  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playClick = (time, isAccent) => {
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();

    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    osc.frequency.value = isAccent ? 1200 : 800;
    gain.gain.value = isAccent ? 0.5 : 0.3;

    osc.start(time);
    osc.stop(time + 0.05);
  };

  const scheduleNote = () => {
    const secondsPerBeat = 60.0 / bpm;
    
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      const isAccent = currentBeat === 0;
      playClick(nextNoteTimeRef.current, isAccent);
      
      setCurrentBeat((prev) => (prev + 1) % timeSignature);
      nextNoteTimeRef.current += secondsPerBeat;
    }
    
    timerIdRef.current = setTimeout(scheduleNote, 25);
  };

  const startMetronome = () => {
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsPlaying(true);
    setCurrentBeat(0);
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    scheduleNote();
  };

  const stopMetronome = () => {
    setIsPlaying(false);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
    }
    setCurrentBeat(0);
  };

  const handleToggle = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  return (
    <div className="space-y-6">
      {/* BPM Display */}
      <div className="text-center">
        <div className="text-6xl font-black text-white mb-2">{bpm}</div>
        <div className="text-white/60 text-sm">BPM</div>
      </div>

      {/* BPM Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={() => setBpm(Math.max(30, bpm - 5))}
          size="icon"
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div className="flex-1 max-w-xs">
          <Slider
            value={[bpm]}
            onValueChange={([value]) => setBpm(value)}
            min={30}
            max={240}
            step={1}
            className="w-full"
          />
        </div>
        <Button
          onClick={() => setBpm(Math.min(240, bpm + 5))}
          size="icon"
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Time Signature */}
      <div className="flex justify-center gap-2">
        {[3, 4, 5, 6].map((ts) => (
          <button
            key={ts}
            onClick={() => setTimeSignature(ts)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              timeSignature === ts
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {ts}/4
          </button>
        ))}
      </div>

      {/* Beat Indicators */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: timeSignature }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
              isPlaying && currentBeat === i
                ? i === 0
                  ? 'bg-cyan-500 scale-110 shadow-lg shadow-cyan-500/50'
                  : 'bg-white scale-110 shadow-lg'
                : 'bg-white/10'
            } ${i === 0 ? 'text-cyan-900' : 'text-white'}`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Play/Pause Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleToggle}
          size="lg"
          className={`w-24 h-24 rounded-full ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } shadow-2xl`}
        >
          {isPlaying ? (
            <Pause className="w-12 h-12" />
          ) : (
            <Play className="w-12 h-12 ml-1" />
          )}
        </Button>
      </div>

      {/* Preset Tempos */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: 'Slow', bpm: 60 },
          { name: 'Medium', bpm: 120 },
          { name: 'Fast', bpm: 180 },
        ].map((preset) => (
          <button
            key={preset.name}
            onClick={() => setBpm(preset.bpm)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all"
          >
            {preset.name}
            <div className="text-xs text-white/60">{preset.bpm} BPM</div>
          </button>
        ))}
      </div>
    </div>
  );
}