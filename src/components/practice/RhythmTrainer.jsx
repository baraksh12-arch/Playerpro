import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Minus, Plus, Volume2, Music } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const RHYTHM_PATTERNS = {
  'Rock': {
    'Basic Rock': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    'Rock Backbeat': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    'Rock Shuffle': [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
  },
  'Funk': {
    'Funk Groove': [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1],
    'Syncopated': [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
  },
  'Jazz': {
    'Jazz Swing': [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    'Bossa Nova': [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  },
  'Latin': {
    'Son Clave': [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
    'Samba': [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0],
  },
  'Blues': {
    'Shuffle': [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    'Straight': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
};

const STYLES = Object.keys(RHYTHM_PATTERNS);

export default function RhythmTrainer() {
  const [selectedStyle, setSelectedStyle] = useState('Rock');
  const [selectedPattern, setSelectedPattern] = useState('Basic Rock');
  const [bpm, setBpm] = useState(80);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentNoteRef = useRef(0);

  const pattern = RHYTHM_PATTERNS[selectedStyle][selectedPattern];
  const beatDuration = 60 / bpm / 4;

  const scheduleNote = () => {
    if (!audioContextRef.current) return;
    const currentTime = audioContextRef.current.currentTime;

    while (nextNoteTimeRef.current < currentTime + 0.1) {
      const beatIndex = currentNoteRef.current % pattern.length;
      
      if (pattern[beatIndex] === 1) {
        const isAccent = beatIndex % 4 === 0;
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = isAccent ? 1200 : 800;
        oscillator.type = 'sine';

        const scheduleTime = nextNoteTimeRef.current;
        gainNode.gain.setValueAtTime(0, scheduleTime);
        gainNode.gain.linearRampToValueAtTime(volume * (isAccent ? 0.4 : 0.2), scheduleTime + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.001, scheduleTime + 0.05);

        oscillator.start(scheduleTime);
        oscillator.stop(scheduleTime + 0.05);
      }

      const displayBeat = beatIndex;
      setTimeout(() => setCurrentBeat(displayBeat), (nextNoteTimeRef.current - currentTime) * 1000);

      nextNoteTimeRef.current += beatDuration;
      currentNoteRef.current++;
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      setCurrentBeat(-1);
    } else {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      nextNoteTimeRef.current = audioContextRef.current.currentTime;
      currentNoteRef.current = 0;
      intervalRef.current = setInterval(scheduleNote, 25);
      setIsPlaying(true);
    }
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setCurrentBeat(-1);
    currentNoteRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => { reset(); }, [selectedStyle, selectedPattern, bpm]);

  const adjustBpm = (delta) => setBpm(prev => Math.min(200, Math.max(40, prev + delta)));

  const patternNames = Object.keys(RHYTHM_PATTERNS[selectedStyle]);

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Header */}
          <div className="pt-8 pb-4 px-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Music className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white/90">Rhythm Trainer</h2>
            </div>
            <p className="text-sm text-white/40">{selectedStyle} - {selectedPattern}</p>
          </div>

          {/* BPM Display */}
          <div className="px-8 pb-4 text-center">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => adjustBpm(-5)}
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <Minus className="w-5 h-5 text-white/70" />
              </button>
              
              <div className="relative">
                <div className="text-[4.5rem] font-extralight text-white tracking-tight leading-none">
                  {bpm}
                </div>
                <div className="text-xs font-medium text-white/40 uppercase tracking-[0.2em] mt-1">
                  BPM
                </div>
              </div>
              
              <button
                onClick={() => adjustBpm(5)}
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>

          {/* BPM Slider */}
          <div className="px-10 pb-4">
            <Slider
              value={[bpm]}
              onValueChange={(v) => setBpm(v[0])}
              min={40}
              max={200}
              step={1}
              className="w-full [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg"
            />
            <div className="flex justify-between text-xs text-white/30 mt-2 px-1">
              <span>40</span>
              <span>200</span>
            </div>
          </div>

          {/* Pattern Visualization */}
          <div className="px-6 pb-6">
            <div className="flex flex-wrap justify-center gap-1.5">
              {pattern.map((hit, index) => {
                const isCurrentBeat = isPlaying && currentBeat === index;
                const isDownbeat = index % 4 === 0;
                
                return (
                  <div
                    key={index}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-medium text-sm transition-all duration-75 ${
                      isCurrentBeat && hit === 1
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white scale-125 shadow-lg shadow-orange-500/40'
                        : isCurrentBeat
                        ? 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white scale-110 shadow-lg shadow-blue-500/30'
                        : hit === 1
                        ? 'bg-gradient-to-br from-orange-500/80 to-red-500/80 text-white'
                        : 'bg-white/5 text-white/30'
                    } ${isDownbeat && !isCurrentBeat ? 'ring-1 ring-orange-400/50' : ''}`}
                  >
                    {hit === 1 ? '♪' : '·'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Play Button */}
          <div className="px-8 pb-6 flex justify-center gap-4">
            <button
              onClick={togglePlayback}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isPlaying
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-gradient-to-br from-orange-400 to-red-600 hover:from-orange-500 hover:to-red-700 shadow-xl shadow-orange-500/30'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" fill="white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              )}
            </button>
            
            {isPlaying && (
              <button
                onClick={reset}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95 self-center"
              >
                <RotateCcw className="w-6 h-6 text-white/70" />
              </button>
            )}
          </div>

          {/* Controls Section */}
          <div className="bg-black/30 px-6 py-6 space-y-5">
            
            {/* Style Selection */}
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Style
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      setSelectedStyle(style);
                      setSelectedPattern(Object.keys(RHYTHM_PATTERNS[style])[0]);
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedStyle === style
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern Selection */}
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Pattern
              </label>
              <div className="flex flex-wrap gap-1.5">
                {patternNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedPattern(name)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedPattern === name
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-4">
              <Volume2 className="w-4 h-4 text-white/40" />
              <Slider
                value={[volume * 100]}
                onValueChange={(v) => setVolume(v[0] / 100)}
                max={100}
                step={1}
                className="flex-1 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:bg-white"
              />
              <span className="text-xs text-white/40 w-8">{Math.round(volume * 100)}%</span>
            </div>

            {/* Tips */}
            <div className="bg-white/5 rounded-2xl p-4">
              <ul className="text-xs text-white/50 space-y-1">
                <li>• Orange ring = Downbeat (beat 1)</li>
                <li>• Start slow and increase speed gradually</li>
                <li>• Tap along with your foot or hand</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}