import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Minus, Plus, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// Sound presets with different characteristics
const SOUND_PRESETS = {
  classic: { name: 'Classic', accent: { freq: 880, type: 'sine', attack: 0.001, decay: 0.08 }, normal: { freq: 440, type: 'sine', attack: 0.001, decay: 0.06 } },
  wood: { name: 'Wood Block', accent: { freq: 1200, type: 'triangle', attack: 0.001, decay: 0.04 }, normal: { freq: 800, type: 'triangle', attack: 0.001, decay: 0.03 } },
  digital: { name: 'Digital', accent: { freq: 1500, type: 'square', attack: 0.001, decay: 0.02 }, normal: { freq: 1000, type: 'square', attack: 0.001, decay: 0.015 } },
  soft: { name: 'Soft Click', accent: { freq: 600, type: 'sine', attack: 0.005, decay: 0.12 }, normal: { freq: 400, type: 'sine', attack: 0.005, decay: 0.1 } },
  hihat: { name: 'Hi-Hat', accent: { freq: 8000, type: 'noise', attack: 0.001, decay: 0.05 }, normal: { freq: 6000, type: 'noise', attack: 0.001, decay: 0.03 } },
  rimshot: { name: 'Rim Shot', accent: { freq: 1800, type: 'triangle', attack: 0.001, decay: 0.025 }, normal: { freq: 1400, type: 'triangle', attack: 0.001, decay: 0.02 } },
};

const TIME_SIGNATURES = [
  { value: '4/4', beats: 4 },
  { value: '3/4', beats: 3 },
  { value: '2/4', beats: 2 },
  { value: '5/4', beats: 5 },
  { value: '6/8', beats: 6 },
  { value: '7/8', beats: 7 },
  { value: '9/8', beats: 9 },
  { value: '12/8', beats: 12 },
];

const SUBDIVISIONS = [
  { value: 1, label: '1', name: 'Quarter' },
  { value: 2, label: '2', name: 'Eighth' },
  { value: 3, label: '3', name: 'Triplet' },
  { value: 4, label: '4', name: 'Sixteenth' },
];

const POLYRHYTHMS = [
  { primary: 2, secondary: 3, name: '2:3' },
  { primary: 3, secondary: 4, name: '3:4' },
  { primary: 3, secondary: 2, name: '3:2' },
  { primary: 4, secondary: 3, name: '4:3' },
  { primary: 5, secondary: 4, name: '5:4' },
  { primary: 4, secondary: 5, name: '4:5' },
  { primary: 5, secondary: 3, name: '5:3' },
  { primary: 7, secondary: 4, name: '7:4' },
];

export default function Metronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentSubBeat, setCurrentSubBeat] = useState(-1);
  const [subdivision, setSubdivision] = useState(1);
  const [soundPreset, setSoundPreset] = useState('classic');
  const [volume, setVolume] = useState(0.7);
  const [accentVolume, setAccentVolume] = useState(1.0);
  
  // Polyrhythm state
  const [polyrhythmMode, setPolyrhythmMode] = useState(false);
  const [selectedPolyrhythm, setSelectedPolyrhythm] = useState(0);
  const [polyBeatPrimary, setPolyBeatPrimary] = useState(-1);
  const [polyBeatSecondary, setPolyBeatSecondary] = useState(-1);
  
  const audioContextRef = useRef(null);
  const schedulerRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const currentSubBeatRef = useRef(0);
  // Polyrhythm refs - track next note time for each rhythm independently
  const nextPrimaryTimeRef = useRef(0);
  const nextSecondaryTimeRef = useRef(0);
  const primaryBeatRef = useRef(0);
  const secondaryBeatRef = useRef(0);
  const lookahead = 25.0; // ms
  const scheduleAheadTime = 0.1; // seconds

  const beatsPerMeasure = TIME_SIGNATURES.find(t => t.value === timeSignature)?.beats || 4;
  const polyrhythm = POLYRHYTHMS[selectedPolyrhythm];

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const createNoiseBuffer = useCallback(() => {
    const ctx = audioContextRef.current;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  const playSound = useCallback((time, isAccent = false, isSecondary = false) => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') {
      ctx?.resume();
      return;
    }

    const preset = SOUND_PRESETS[soundPreset];
    const config = isAccent ? preset.accent : preset.normal;
    const vol = isAccent ? volume * accentVolume : volume * 0.6;

    const gainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = isSecondary ? 3000 : 8000;

    if (config.type === 'noise') {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer();
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = config.freq;
      bandpass.Q.value = 1;
      noiseSource.connect(bandpass);
      bandpass.connect(gainNode);
      gainNode.connect(filterNode);
      filterNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(vol * 0.5, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + config.decay);
      noiseSource.start(time);
      noiseSource.stop(time + config.decay);
    } else {
      const oscillator = ctx.createOscillator();
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(isSecondary ? config.freq * 0.7 : config.freq, time);
      oscillator.connect(gainNode);
      gainNode.connect(filterNode);
      filterNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(vol * 0.4, time + config.attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + config.decay);
      oscillator.start(time);
      oscillator.stop(time + config.decay + 0.01);
    }
  }, [soundPreset, volume, accentVolume, createNoiseBuffer]);

  const scheduleNote = useCallback((beatNumber, subBeatNumber, time) => {
    const isDownbeat = beatNumber === 0 && subBeatNumber === 0;
    const isMainBeat = subBeatNumber === 0;
    
    if (isMainBeat) {
      playSound(time, isDownbeat);
    } else {
      playSound(time, false);
    }

    // Update visual state
    setTimeout(() => {
      setCurrentBeat(beatNumber);
      setCurrentSubBeat(subBeatNumber);
    }, (time - audioContextRef.current.currentTime) * 1000);
  }, [playSound]);

  // Schedule a single primary beat
  const schedulePrimaryBeat = useCallback((time, beatIndex, isFirst) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    playSound(time, isFirst, false);
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => setPolyBeatPrimary(beatIndex), delay);
  }, [playSound]);

  // Schedule a single secondary beat  
  const scheduleSecondaryBeat = useCallback((time, beatIndex) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    playSound(time, false, true);
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => setPolyBeatSecondary(beatIndex), delay);
  }, [playSound]);

  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (polyrhythmMode) {
      // Polyrhythm mode: schedule primary and secondary rhythms independently
      const { primary, secondary } = polyrhythm;
      // Calculate intervals based on a common cycle
      // LCM approach: both rhythms complete in the same total time
      const cycleDuration = (60.0 / bpm) * primary; // One full cycle = primary beats at the BPM
      const primaryInterval = cycleDuration / primary;
      const secondaryInterval = cycleDuration / secondary;

      // Schedule primary rhythm beats
      while (nextPrimaryTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const isFirstBeat = primaryBeatRef.current === 0;
        schedulePrimaryBeat(nextPrimaryTimeRef.current, primaryBeatRef.current, isFirstBeat);
        
        nextPrimaryTimeRef.current += primaryInterval;
        primaryBeatRef.current = (primaryBeatRef.current + 1) % primary;
      }

      // Schedule secondary rhythm beats
      while (nextSecondaryTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        scheduleSecondaryBeat(nextSecondaryTimeRef.current, secondaryBeatRef.current);
        
        nextSecondaryTimeRef.current += secondaryInterval;
        secondaryBeatRef.current = (secondaryBeatRef.current + 1) % secondary;
      }
    } else {
      // Normal metronome mode
      while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        scheduleNote(currentBeatRef.current, currentSubBeatRef.current, nextNoteTimeRef.current);
        
        const secondsPerBeat = 60.0 / bpm;
        const secondsPerSubBeat = secondsPerBeat / subdivision;
        nextNoteTimeRef.current += secondsPerSubBeat;

        currentSubBeatRef.current++;
        if (currentSubBeatRef.current >= subdivision) {
          currentSubBeatRef.current = 0;
          currentBeatRef.current++;
          if (currentBeatRef.current >= beatsPerMeasure) {
            currentBeatRef.current = 0;
          }
        }
      }
    }
  }, [bpm, beatsPerMeasure, subdivision, polyrhythmMode, polyrhythm, scheduleNote, schedulePrimaryBeat, scheduleSecondaryBeat]);

  const startMetronome = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx?.state === 'suspended') ctx.resume();
    
    // Reset normal metronome refs
    currentBeatRef.current = 0;
    currentSubBeatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime;
    
    // Reset polyrhythm refs
    primaryBeatRef.current = 0;
    secondaryBeatRef.current = 0;
    nextPrimaryTimeRef.current = ctx.currentTime;
    nextSecondaryTimeRef.current = ctx.currentTime;
    
    schedulerRef.current = setInterval(scheduler, lookahead);
    setIsPlaying(true);
  }, [scheduler]);

  const stopMetronome = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
    setCurrentSubBeat(-1);
    setPolyBeatPrimary(-1);
    setPolyBeatSecondary(-1);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      stopMetronome();
      startMetronome();
    }
  }, [bpm, timeSignature, subdivision, polyrhythmMode, selectedPolyrhythm]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const adjustBpm = (delta) => {
    setBpm(prev => Math.min(300, Math.max(20, prev + delta)));
  };

  const tapTimesRef = useRef([]);
  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 20 && newBpm <= 300) setBpm(newBpm);
    }
    setTimeout(() => { tapTimesRef.current = []; }, 2000);
  };

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* BPM Display */}
          <div className="pt-10 pb-6 px-8 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => adjustBpm(-1)}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <Minus className="w-6 h-6 text-white/70" />
              </button>
              
              <div className="relative">
                <div className="text-[6rem] font-extralight text-white tracking-tight leading-none">
                  {bpm}
                </div>
                <div className="text-sm font-medium text-white/40 uppercase tracking-[0.3em] mt-1">
                  BPM
                </div>
              </div>
              
              <button
                onClick={() => adjustBpm(1)}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="w-6 h-6 text-white/70" />
              </button>
            </div>
          </div>

          {/* BPM Slider */}
          <div className="px-10 pb-6">
            <Slider
              value={[bpm]}
              onValueChange={(v) => setBpm(v[0])}
              min={20}
              max={300}
              step={1}
              className="w-full [&_[role=slider]]:w-6 [&_[role=slider]]:h-6 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg"
            />
            <div className="flex justify-between text-xs text-white/30 mt-2 px-1">
              <span>20</span>
              <span>300</span>
            </div>
          </div>

          {/* Beat Visualizer */}
          <div className="px-8 pb-6">
            {polyrhythmMode ? (
              <div className="space-y-4">
                {/* Primary Rhythm */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: polyrhythm.primary }).map((_, i) => (
                    <div
                      key={`p-${i}`}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-sm transition-all duration-75 ${
                        polyBeatPrimary === i && isPlaying
                          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white scale-110 shadow-lg shadow-orange-500/30'
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Secondary Rhythm */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: polyrhythm.secondary }).map((_, i) => (
                    <div
                      key={`s-${i}`}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-sm transition-all duration-75 ${
                        polyBeatSecondary === i && isPlaying
                          ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white scale-110 shadow-lg shadow-cyan-500/30'
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: beatsPerMeasure }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold transition-all duration-75 ${
                      currentBeat === i && isPlaying
                        ? i === 0
                          ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white scale-110 shadow-lg shadow-orange-500/40'
                          : 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white scale-105 shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Play Button */}
          <div className="px-8 pb-8 flex justify-center">
            <button
              onClick={handlePlayPause}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isPlaying
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 shadow-xl shadow-orange-500/30'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" fill="white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              )}
            </button>
          </div>

          {/* Controls Section */}
          <div className="bg-black/30 px-6 py-6 space-y-5">
            
            {/* Time Signature & Subdivision */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                  Time Signature
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SIGNATURES.slice(0, 4).map((ts) => (
                    <button
                      key={ts.value}
                      onClick={() => !isPlaying && setTimeSignature(ts.value)}
                      disabled={isPlaying}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        timeSignature === ts.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {ts.value}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                  Subdivision
                </label>
                <div className="flex gap-1.5">
                  {SUBDIVISIONS.map((sub) => (
                    <button
                      key={sub.value}
                      onClick={() => setSubdivision(sub.value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        subdivision === sub.value
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Polyrhythm Mode */}
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-white">Polyrhythm Mode</span>
                  <p className="text-xs text-white/40 mt-0.5">Practice complex rhythms</p>
                </div>
                <Switch
                  checked={polyrhythmMode}
                  onCheckedChange={setPolyrhythmMode}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              
              {polyrhythmMode && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                  {POLYRHYTHMS.map((pr, idx) => (
                    <button
                      key={pr.name}
                      onClick={() => setSelectedPolyrhythm(idx)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedPolyrhythm === idx
                          ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pr.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sound Selection */}
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Sound
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SOUND_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setSoundPreset(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      soundPreset === key
                        ? 'bg-white text-gray-900'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {preset.name}
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

            {/* Tap Tempo */}
            <button
              onClick={handleTapTempo}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 text-sm font-medium transition-all active:scale-[0.98]"
            >
              Tap Tempo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}