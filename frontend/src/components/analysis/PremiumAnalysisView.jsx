import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Music, Waves, BarChart3, Activity, Wind,
  ChevronDown, Battery, Volume2, GitBranch, X,
  Pause, Play, Box, Camera, CameraOff, FlipHorizontal2, Mic, MicOff
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { getAnalysisEngine, destroyAnalysisEngine } from './AnalysisEngine';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FLATS = { 'C#': 'D♭', 'D#': 'E♭', 'F#': 'G♭', 'G#': 'A♭', 'A#': 'B♭' };

// Premium Metronome Engine with better sound
class PremiumMetronome {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.bpm = 120;
    this.beatCount = 0;
    this.beatsPerMeasure = 4;
  }
  
  start(bpm = 120) {
    this.stop();
    this.bpm = bpm;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = true;
    this.beatCount = 0;
    this.tick();
    const interval = 60000 / bpm;
    this.intervalId = setInterval(() => this.tick(), interval);
  }
  
  tick() {
    if (!this.ctx || !this.isPlaying) return;
    
    const isDownbeat = this.beatCount % this.beatsPerMeasure === 0;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Higher pitch and louder for downbeat
    osc.frequency.value = isDownbeat ? 1200 : 800;
    const volume = isDownbeat ? 0.25 : 0.15;
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.08);
    
    this.beatCount++;
  }
  
  setBpm(bpm) {
    if (this.isPlaying) {
      this.start(bpm);
    }
    this.bpm = bpm;
  }
  
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Key/Temperament Menu - Quarter circle top-left
const KeyTemperamentMenu = memo(function KeyTemperamentMenu({
  temperament, setTemperament, keyCenter, setKeyCenter, 
  preferFlats, setPreferFlats, a4Frequency, setA4Frequency
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-20">
          <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-end justify-end pr-8 pb-8 shadow-2xl border border-white/5">
            <div className="text-right">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Key</div>
              <div className="text-lg font-semibold text-white">{keyCenter}</div>
              <div className="text-[10px] text-amber-400/80">{temperament}</div>
            </div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 p-4 bg-gray-900/98 backdrop-blur-xl border-white/10 text-white ml-4 mt-4">
        <div className="space-y-5">
          <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Key & Temperament</div>
          
          {/* Temperament */}
          <div>
            <div className="text-[10px] text-white/40 uppercase mb-2 font-medium">Temperament</div>
            <div className="grid grid-cols-2 gap-2">
              {['Equal', 'Just/Pure'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTemperament(t)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
                    temperament === t 
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50 shadow-lg shadow-amber-500/20' 
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          {/* Key Center - Piano style */}
          <div>
            <div className="text-[10px] text-white/40 uppercase mb-2 font-medium">Key Center</div>
            <div className="flex gap-1 justify-center">
              {NOTES.map((note) => {
                const isSharp = note.includes('#');
                const display = preferFlats && NOTE_FLATS[note] ? NOTE_FLATS[note] : note.replace('#', '♯');
                return (
                  <button
                    key={note}
                    onClick={() => setKeyCenter(note)}
                    className={`w-6 py-3 rounded text-[9px] font-bold transition-all ${
                      keyCenter === note 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                        : isSharp 
                          ? 'bg-gray-700 text-white/70 hover:bg-gray-600' 
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {display[0]}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Sharp/Flat + A4 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Prefer Flats (♭)</span>
              <Switch checked={preferFlats} onCheckedChange={setPreferFlats} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">A=</span>
              <Input
                type="number"
                value={a4Frequency}
                onChange={(e) => setA4Frequency(Math.min(450, Math.max(430, Number(e.target.value) || 440)))}
                className="w-16 h-7 text-xs text-center bg-white/5 border-white/10 text-white"
              />
              <span className="text-[10px] text-white/40">Hz</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// Metronome Menu - Quarter circle top-right (tap to toggle, long press for settings)
const MetronomeMenu = memo(function MetronomeMenu({ bpm, setBpm, isActive, setIsActive, metronomeRef }) {
  const [showSettings, setShowSettings] = useState(false);
  const longPressRef = useRef(null);
  const isLongPress = useRef(false);
  
  const handleTouchStart = () => {
    isLongPress.current = false;
    longPressRef.current = setTimeout(() => {
      isLongPress.current = true;
      setShowSettings(true);
    }, 400);
  };
  
  const handleTouchEnd = (e) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (!isLongPress.current) {
      e.preventDefault();
      // Toggle metronome on tap
      if (isActive) {
        metronomeRef.current?.stop();
        setIsActive(false);
      } else {
        metronomeRef.current?.start(bpm);
        setIsActive(true);
      }
    }
  };
  
  return (
    <>
      <button 
        className="absolute top-0 right-0 w-24 h-24 overflow-hidden z-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => longPressRef.current && clearTimeout(longPressRef.current)}
      >
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full transform translate-x-1/2 -translate-y-1/2 flex items-end justify-start pl-8 pb-8 transition-all backdrop-blur-xl border border-white/5 ${
          isActive 
            ? 'bg-gradient-to-bl from-emerald-700/95 to-emerald-900/95 shadow-2xl shadow-emerald-500/30' 
            : 'bg-gradient-to-bl from-gray-800/95 to-gray-900/95'
        }`}>
          <div className="text-left">
            <div className="text-[9px] text-white/40 uppercase tracking-wider">Metro</div>
            <div className={`text-2xl font-mono font-bold ${isActive ? 'text-emerald-400' : 'text-white'}`}>{bpm}</div>
            <div className={`text-[9px] font-semibold ${isActive ? 'text-emerald-400' : 'text-white/40'}`}>
              {isActive ? '● ON' : 'TAP'}
            </div>
          </div>
        </div>
      </button>
      
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="bg-gray-900/98 backdrop-blur-xl border-white/10 text-white w-72">
          <SheetHeader>
            <SheetTitle className="text-white">Metronome</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <div className="text-xs text-white/50 uppercase mb-3 font-medium">BPM</div>
              <Input
                type="number"
                value={bpm}
                onChange={(e) => {
                  const val = Math.min(300, Math.max(30, Number(e.target.value) || 120));
                  setBpm(val);
                  if (isActive) metronomeRef.current?.start(val);
                }}
                className="h-14 text-center text-3xl font-mono bg-white/5 border-white/10 text-white"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[60, 80, 100, 120, 140, 160, 180, 200].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBpm(b);
                    if (isActive) metronomeRef.current?.start(b);
                  }}
                  className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    bpm === b ? 'bg-emerald-500/40 text-emerald-400' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                if (isActive) {
                  metronomeRef.current?.stop();
                  setIsActive(false);
                } else {
                  metronomeRef.current?.start(bpm);
                  setIsActive(true);
                }
              }}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                isActive 
                  ? 'bg-red-500/30 text-red-400 hover:bg-red-500/40' 
                  : 'bg-emerald-500/30 text-emerald-400 hover:bg-emerald-500/40'
              }`}
            >
              {isActive ? 'Stop Metronome' : 'Start Metronome'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});

// Premium Tone Generator - High quality synthesized reference tones with sustained playback
class PremiumToneGenerator {
  constructor() {
    this.ctx = null;
    this.activeOscillators = new Map();
    this.sustainedNote = null;
  }
  
  getContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }
  
  noteToFreq(note, octave = 4, a4 = 440) {
    const noteIndex = NOTES.indexOf(note);
    if (noteIndex === -1) return 440;
    const semitonesFromA4 = noteIndex - 9 + (octave - 4) * 12;
    return a4 * Math.pow(2, semitonesFromA4 / 12);
  }
  
  // Play sustained tone until stopped - premium quality with harmonics
  playSustained(note, octave = 4, a4 = 440) {
    // If same note, stop it (toggle behavior)
    if (this.sustainedNote === note) {
      this.stopSustained();
      return false;
    }
    
    // Stop any existing sustained note
    this.stopSustained();
    
    const ctx = this.getContext();
    const freq = this.noteToFreq(note, octave, a4);
    const now = ctx.currentTime;
    
    // Master gain with compressor for clean sound
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    
    const masterGain = ctx.createGain();
    masterGain.connect(compressor);
    
    const oscillators = [];
    
    // Fundamental - warm sine
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.45;
    osc1.connect(gain1);
    gain1.connect(masterGain);
    oscillators.push(osc1);
    
    // Second harmonic (octave)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.12;
    osc2.connect(gain2);
    gain2.connect(masterGain);
    oscillators.push(osc2);
    
    // Third harmonic - adds brightness
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;
    const gain3 = ctx.createGain();
    gain3.gain.value = 0.04;
    osc3.connect(gain3);
    gain3.connect(masterGain);
    oscillators.push(osc3);
    
    // Fifth harmonic - slight shimmer
    const osc4 = ctx.createOscillator();
    osc4.type = 'sine';
    osc4.frequency.value = freq * 5;
    const gain4 = ctx.createGain();
    gain4.gain.value = 0.015;
    osc4.connect(gain4);
    gain4.connect(masterGain);
    oscillators.push(osc4);
    
    // Sub (octave below) - warmth
    const osc5 = ctx.createOscillator();
    osc5.type = 'sine';
    osc5.frequency.value = freq / 2;
    const gain5 = ctx.createGain();
    gain5.gain.value = 0.06;
    osc5.connect(gain5);
    gain5.connect(masterGain);
    oscillators.push(osc5);
    
    // Smooth attack envelope
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.5, now + 0.06);
    masterGain.gain.linearRampToValueAtTime(0.4, now + 0.15);
    
    oscillators.forEach(osc => osc.start(now));
    
    this.activeOscillators.set('sustained', { oscillators, masterGain, compressor });
    this.sustainedNote = note;
    
    return true;
  }
  
  stopSustained() {
    const active = this.activeOscillators.get('sustained');
    if (active) {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      active.masterGain.gain.cancelScheduledValues(now);
      active.masterGain.gain.setValueAtTime(active.masterGain.gain.value, now);
      active.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      setTimeout(() => {
        active.oscillators.forEach(osc => {
          try { osc.stop(); } catch(e) {}
        });
      }, 200);
      this.activeOscillators.delete('sustained');
    }
    this.sustainedNote = null;
  }
  
  getSustainedNote() {
    return this.sustainedNote;
  }
  
  stopAll() {
    this.stopSustained();
    this.activeOscillators.forEach((_, key) => {
      if (key !== 'sustained') {
        const active = this.activeOscillators.get(key);
        if (active) {
          active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
        }
      }
    });
    this.activeOscillators.clear();
  }
}

let toneGeneratorInstance = null;
const getToneGenerator = () => {
  if (!toneGeneratorInstance) {
    toneGeneratorInstance = new PremiumToneGenerator();
  }
  return toneGeneratorInstance;
};

// Enharmonic note names for display
const NOTE_ENHARMONICS = {
  'C': ['C', ''],
  'C#': ['C♯', 'D♭'],
  'D': ['D', ''],
  'D#': ['D♯', 'E♭'],
  'E': ['E', 'F♭'],
  'F': ['F', ''],
  'F#': ['F♯', 'G♭'],
  'G': ['G', ''],
  'G#': ['G♯', 'A♭'],
  'A': ['A', ''],
  'A#': ['A♯', 'B♭'],
  'B': ['B', 'C♭'],
};

// Premium Tuner Circle - Chromatic wedge wheel with tap-to-play, Tonal Energy style
const TunerCircle = memo(function TunerCircle({ rms, pitch, isSilent, isInTune, absCents, cents, preferFlats, a4Frequency = 440, selectedOctave = 4 }) {
  const [playingNote, setPlayingNote] = useState(null);
  const [wheelMode, setWheelMode] = useState(false);
  const [octave, setOctave] = useState(selectedOctave);
  const toneGen = useRef(null);
  
  useEffect(() => {
    toneGen.current = getToneGenerator();
    return () => toneGen.current?.stopAll();
  }, []);
  
  // Sync with external octave
  useEffect(() => {
    setOctave(selectedOctave);
  }, [selectedOctave]);
  
  const earScale = Math.min(1.8, Math.max(0.4, 0.4 + rms * 12));
  const isActive = !isSilent && pitch.confidence > 0.5;
  const isSharp = (cents || 0) > 0;
  const isFlat = (cents || 0) < 0;
  const deviationPercent = Math.min(100, (absCents / 50) * 100);
  
  const getDeviationColor = () => {
    if (absCents <= 5) return { r: 34, g: 197, b: 94 };
    if (absCents <= 15) return { r: 234, g: 179, b: 8 };
    if (absCents <= 30) return { r: 249, g: 115, b: 22 };
    return { r: 239, g: 68, b: 68 };
  };
  
  const devColor = getDeviationColor();
  const glowColor = isInTune ? 'rgba(52, 211, 153, 0.6)' : (isActive ? `rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.5)` : 'rgba(80, 80, 100, 0.2)');
  const borderColor = isInTune ? 'rgba(52, 211, 153, 0.4)' : (isActive ? `rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.3)` : 'rgba(255, 255, 255, 0.08)');
  
  const detectedNoteIndex = isActive && pitch.note ? NOTES.indexOf(pitch.note) : -1;
  
  // Handle note tap - toggle sustained playback
  const handleNoteTap = (note) => {
    const isNowPlaying = toneGen.current?.playSustained(note, octave, a4Frequency);
    setPlayingNote(isNowPlaying ? note : null);
  };
  
  // Toggle wheel mode by tapping center
  const handleCenterTap = () => {
    if (playingNote) {
      toneGen.current?.stopSustained();
      setPlayingNote(null);
    } else {
      setWheelMode(prev => !prev);
    }
  };
  
  // SVG wedge path generator for 30° segments
  const createWedgePath = (index, innerR, outerR) => {
    const startAngle = (index * 30 - 90 - 15) * (Math.PI / 180);
    const endAngle = (index * 30 - 90 + 15) * (Math.PI / 180);
    
    const x1 = 50 + Math.cos(startAngle) * innerR;
    const y1 = 50 + Math.sin(startAngle) * innerR;
    const x2 = 50 + Math.cos(startAngle) * outerR;
    const y2 = 50 + Math.sin(startAngle) * outerR;
    const x3 = 50 + Math.cos(endAngle) * outerR;
    const y3 = 50 + Math.sin(endAngle) * outerR;
    const x4 = 50 + Math.cos(endAngle) * innerR;
    const y4 = 50 + Math.sin(endAngle) * innerR;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`;
  };
  
  // Get text position for note label
  const getNotePosition = (index, radius) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius
    };
  };
  
  return (
    <div className="relative w-56 h-56 flex items-center justify-center">
      {/* Chromatic Wheel - 12 wedge segments */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        <defs>
          {/* Gradients for each note */}
          {NOTES.map((note, i) => (
            <radialGradient key={`grad-${note}`} id={`noteGrad-${i}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(60, 60, 70, 0.95)" />
              <stop offset="100%" stopColor="rgba(35, 35, 45, 0.98)" />
            </radialGradient>
          ))}
          {/* Highlight gradient for active/playing note */}
          <radialGradient id="highlightGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.9)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0.8)" />
          </radialGradient>
          {/* Detected note gradient */}
          <radialGradient id="detectedGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={`rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.8)`} />
            <stop offset="100%" stopColor={`rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.6)`} />
          </radialGradient>
        </defs>
        
        {/* Note wedges */}
        {NOTES.map((note, i) => {
          const isDetected = detectedNoteIndex === i;
          const isPlaying = playingNote === note;
          const enharmonics = NOTE_ENHARMONICS[note];
          const pos = getNotePosition(i, 38);
          
          return (
            <g key={note}>
              {/* Wedge background */}
              <path
                d={createWedgePath(i, 22, 48)}
                fill={isPlaying ? 'url(#highlightGrad)' : isDetected ? 'url(#detectedGrad)' : `url(#noteGrad-${i})`}
                stroke={isPlaying ? '#fbbf24' : isDetected ? `rgb(${devColor.r}, ${devColor.g}, ${devColor.b})` : 'rgba(255,255,255,0.08)'}
                strokeWidth={isPlaying || isDetected ? 1.5 : 0.5}
                className="cursor-pointer transition-all"
                onClick={() => handleNoteTap(note)}
                style={{ 
                  filter: isPlaying ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' : isDetected ? `drop-shadow(0 0 6px rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.5))` : 'none'
                }}
              />
              
              {/* Note text - main name */}
              <text
                x={pos.x}
                y={pos.y - (enharmonics[1] ? 2 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                style={{
                  fontSize: isPlaying || isDetected ? '6px' : '5px',
                  fontWeight: 700,
                  fill: isPlaying ? '#1a1a1a' : isDetected ? '#fff' : 'rgba(255,255,255,0.85)',
                  textShadow: isPlaying ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {enharmonics[0]}
              </text>
              
              {/* Enharmonic equivalent (smaller, below) */}
              {enharmonics[1] && (
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  style={{
                    fontSize: '3.5px',
                    fontWeight: 500,
                    fill: isPlaying ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {enharmonics[1]}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Inner circle background */}
        <circle cx="50" cy="50" r="20" fill="rgba(15, 15, 20, 0.98)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        
        {/* Flat indicator (TOP) */}
        {isActive && isFlat && (
          <path
            d={`M 50 50 L 50 ${50 - deviationPercent * 0.16} A ${deviationPercent * 0.16} ${deviationPercent * 0.16} 0 0 1 ${50 + Math.sin(Math.PI * 0.8) * deviationPercent * 0.16} ${50 - Math.cos(Math.PI * 0.8) * deviationPercent * 0.16} Z`}
            fill={`rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.6)`}
          />
        )}
        
        {/* Sharp indicator (BOTTOM) */}
        {isActive && isSharp && (
          <path
            d={`M 50 50 L 50 ${50 + deviationPercent * 0.16} A ${deviationPercent * 0.16} ${deviationPercent * 0.16} 0 0 0 ${50 + Math.sin(Math.PI * 0.8) * deviationPercent * 0.16} ${50 + Math.cos(Math.PI * 0.8) * deviationPercent * 0.16} Z`}
            fill={`rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.6)`}
          />
        )}
        
        {/* Center target ring */}
        <circle cx="50" cy="50" r="8" fill="none" stroke={isInTune ? 'rgba(52, 211, 153, 0.6)' : 'rgba(255,255,255,0.1)'} strokeWidth="1" />
        <circle cx="50" cy="50" r="3" fill={isInTune ? '#34d399' : (isActive ? `rgb(${devColor.r}, ${devColor.g}, ${devColor.b})` : 'rgba(255,255,255,0.2)')} />
      </svg>
      
      {/* Center interactive area */}
      <motion.div
        className="absolute w-20 h-20 rounded-full flex items-center justify-center cursor-pointer z-20"
        onClick={handleCenterTap}
        animate={{
          boxShadow: playingNote ? '0 0 30px rgba(251, 191, 36, 0.5)' : `0 0 40px ${glowColor}`,
        }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(30,30,40,0.99) 0%, rgba(10,10,15,1) 100%)',
          border: `2px solid ${playingNote ? 'rgba(251, 191, 36, 0.5)' : borderColor}`
        }}
      >
        {/* Smiley face */}
        <AnimatePresence>
          {(isActive || playingNote) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="relative w-10 h-10 flex items-center justify-center"
            >
              {/* Octave number (faint) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[28px] font-light text-white/10">{octave}</span>
              </div>
              
              {/* Eyes */}
              <div className="absolute flex gap-3" style={{ top: '15%' }}>
                <motion.div 
                  className="rounded-full"
                  animate={{ 
                    width: isInTune || playingNote ? 8 : 5, 
                    height: isInTune || playingNote ? 8 : 5,
                    backgroundColor: isInTune ? '#34d399' : playingNote ? '#fbbf24' : `rgb(${devColor.r}, ${devColor.g}, ${devColor.b})`,
                    boxShadow: (isInTune || playingNote) ? `0 0 8px ${isInTune ? 'rgba(52, 211, 153, 0.8)' : 'rgba(251, 191, 36, 0.8)'}` : 'none'
                  }}
                />
                <motion.div 
                  className="rounded-full"
                  animate={{ 
                    width: isInTune || playingNote ? 8 : 5, 
                    height: isInTune || playingNote ? 8 : 5,
                    backgroundColor: isInTune ? '#34d399' : playingNote ? '#fbbf24' : `rgb(${devColor.r}, ${devColor.g}, ${devColor.b})`,
                    boxShadow: (isInTune || playingNote) ? `0 0 8px ${isInTune ? 'rgba(52, 211, 153, 0.8)' : 'rgba(251, 191, 36, 0.8)'}` : 'none'
                  }}
                />
              </div>
              
              {/* Mouth */}
              <svg className="absolute" style={{ top: '55%' }} width="20" height="12" viewBox="0 0 20 12">
                <motion.path
                  d={
                    (isInTune || playingNote)
                      ? "M 2 3 Q 10 14 18 3"
                      : absCents <= 10 
                        ? "M 2 5 Q 10 10 18 5"
                        : absCents <= 20 
                          ? "M 2 7 L 18 7"
                          : "M 2 10 Q 10 4 18 10"
                  }
                  stroke={isInTune ? '#34d399' : playingNote ? '#fbbf24' : `rgb(${devColor.r}, ${devColor.g}, ${devColor.b})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Flat/Sharp symbols */}
        <AnimatePresence>
          {isActive && isFlat && absCents > 3 && !playingNote && (
            <motion.div 
              className="absolute -top-1 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className={`text-sm font-bold ${absCents <= 15 ? 'text-yellow-400' : 'text-red-400'}`}>♭</span>
            </motion.div>
          )}
          {isActive && isSharp && absCents > 3 && !playingNote && (
            <motion.div 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className={`text-sm font-bold ${absCents <= 15 ? 'text-yellow-400' : 'text-red-400'}`}>♯</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Dynamic ears */}
      <motion.div 
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 rounded-full z-0"
        animate={{ 
          height: 28 * earScale,
          background: isInTune 
            ? 'linear-gradient(to right, rgba(52, 211, 153, 0.5), rgba(52, 211, 153, 0.2))' 
            : playingNote
              ? 'linear-gradient(to right, rgba(251, 191, 36, 0.5), rgba(251, 191, 36, 0.2))'
              : `linear-gradient(to right, rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.4), rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.1))`
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />
      <motion.div 
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 rounded-full z-0"
        animate={{ 
          height: 28 * earScale,
          background: isInTune 
            ? 'linear-gradient(to left, rgba(52, 211, 153, 0.5), rgba(52, 211, 153, 0.2))' 
            : playingNote
              ? 'linear-gradient(to left, rgba(251, 191, 36, 0.5), rgba(251, 191, 36, 0.2))'
              : `linear-gradient(to left, rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.4), rgba(${devColor.r}, ${devColor.g}, ${devColor.b}, 0.1))`
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />
      
      {/* "Tap to silence" hint when playing */}
      <AnimatePresence>
        {playingNote && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-[9px] text-amber-400/70">Tap to silence note</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Main Premium Analysis View
export default function PremiumAnalysisView({ onClose }) {
  // State
  const [isFrozen, setIsFrozen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [frozenData, setFrozenData] = useState(null);
  
  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [cameraDim, setCameraDim] = useState(40);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  
  // Settings
  const [temperament, setTemperament] = useState('Equal');
  const [keyCenter, setKeyCenter] = useState('C');
  const [preferFlats, setPreferFlats] = useState(false);
  const [a4Frequency, setA4Frequency] = useState(440);
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [windFilter, setWindFilter] = useState('Low');
  const [timeSpan, setTimeSpan] = useState(16);
  const [showSettings, setShowSettings] = useState(false);
  const [view3D, setView3D] = useState(false); // 3D vertical waterfall view
  
  // Refs
  const engineRef = useRef(null);
  const metronomeRef = useRef(new PremiumMetronome());
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const containerRef = useRef(null);
  const lastTapRef = useRef(0);
  const touchCountRef = useRef(0);
  
  // CRITICAL: Waveform history buffer - stores waveform segments over time
  const waveformHistoryRef = useRef([]);
  
  // Camera functions
  const startCamera = async () => {
    try {
      setCameraEnabled(true);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraEnabled(false);
    }
  };
  
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };
  
  const flipCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (cameraEnabled) {
      stopCamera();
      setTimeout(() => {
        setCameraFacing(newFacing);
        startCamera();
      }, 100);
    }
  };
  
  // Initialize engine
  useEffect(() => {
    engineRef.current = getAnalysisEngine();
    
    const unsubscribe = engineRef.current.subscribe((data) => {
      if (data.type === 'frame' && !isFrozen) {
        setAnalysisData(data);
        
        // Store waveform history with timestamp and note info
        const now = Date.now();
        const isActive = !data.isSilent && data.pitch?.confidence > 0.5;
        
        // Sample the waveform at regular intervals
        if (data.waveform && data.waveform.length > 0) {
          // Get a compressed representation of the waveform
          const samples = [];
          const step = Math.max(1, Math.floor(data.waveform.length / 64));
          for (let i = 0; i < 64; i++) {
            const idx = Math.min(data.waveform.length - 1, i * step);
            samples.push(data.waveform[idx] || 0);
          }
          
          waveformHistoryRef.current.push({
            time: now,
            samples,
            rms: data.rms || 0,
            isActive,
            note: isActive ? data.pitch?.note : null,
            cents: data.pitch?.cents || 0,
            confidence: data.pitch?.confidence || 0
          });
          
          // Trim history
          const cutoff = now - (timeSpan * 1000);
          waveformHistoryRef.current = waveformHistoryRef.current.filter(h => h.time > cutoff);
        }
      }
    });
    
    return () => unsubscribe();
  }, [isFrozen, timeSpan]);
  
  // Auto-start listening
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await engineRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      metronomeRef.current?.stop();
      stopCamera();
      destroyAnalysisEngine();
    };
  }, []);
  
  // Extract data
  const currentData = isFrozen ? frozenData : analysisData;
  const pitch = currentData?.pitch || { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0 };
  const rms = currentData?.rms || 0;
  const isSilent = currentData?.isSilent ?? true;
  
  const cents = pitch.cents || 0;
  const absCents = Math.abs(cents);
  const isInTune = !isSilent && pitch.confidence > 0.7 && absCents <= 5;
  const isActive = !isSilent && pitch.confidence > 0.5;
  
  // Format note
  const formatNote = useCallback((note) => {
    if (!note || note === '--') return '—';
    if (preferFlats && NOTE_FLATS[note]) return NOTE_FLATS[note];
    return note.replace('#', '♯');
  }, [preferFlats]);
  
  // RMS to dB
  const rmsToDb = (r) => r <= 0 ? -60 : Math.max(-60, 20 * Math.log10(r * 10));
  const currentDb = Math.round(rmsToDb(rms));
  const dbPercent = Math.max(0, Math.min(100, ((currentDb + 60) / 60) * 100));
  
  // Draw premium scrolling waveform canvas - 2D or 3D vertical waterfall
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const now = Date.now();
    const cutoff = now - (timeSpan * 1000);
    const centerY = height / 2;
    const centsRange = 50;
    
    // Clear with dark background
    ctx.fillStyle = cameraEnabled ? `rgba(8, 8, 12, ${cameraDim / 100})` : '#08080c';
    ctx.fillRect(0, 0, width, height);
    
    const history = waveformHistoryRef.current;
    
    if (view3D) {
      // ========== 3D VERTICAL WATERFALL VIEW ==========
      // Time flows from top to bottom, waveform amplitude goes left-right
      const perspective = 0.7; // Perspective factor
      const depthScale = 0.4; // How much depth affects size
      
      // Draw time axis labels on left
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '9px SF Pro Display, system-ui, sans-serif';
      ctx.textAlign = 'right';
      for (let t = 0; t <= timeSpan; t += 4) {
        const y = (t / timeSpan) * height;
        ctx.fillText(`-${timeSpan - t}s`, 28, y + 3);
      }
      
      // Draw vertical center line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw waveforms as horizontal lines stacked vertically (waterfall)
      if (history.length > 0) {
        // Sample history at regular intervals for 3D display
        const numSlices = Math.min(120, history.length);
        const sliceStep = Math.max(1, Math.floor(history.length / numSlices));
        
        for (let i = 0; i < numSlices; i++) {
          const histIdx = Math.min(history.length - 1, i * sliceStep);
          const entry = history[histIdx];
          if (!entry || !entry.samples) continue;
          
          // Calculate Y position (time) - newest at bottom
          const timeProgress = (entry.time - cutoff) / (timeSpan * 1000);
          const y = timeProgress * height;
          
          if (y < 0 || y > height) continue;
          
          // Depth factor - farther = smaller/dimmer
          const depth = 1 - (timeProgress * depthScale);
          const alpha = 0.3 + timeProgress * 0.7;
          
          // Waveform amplitude scaling - 3X larger
          const waveScale = Math.min(1, (entry.rms || 0) * 24) * (width / 3) * depth;
          
          // Color based on note detection
          const isNoteActive = entry.isActive;
          const baseColor = isNoteActive ? [59, 130, 246] : [140, 140, 160];
          
          // Draw waveform as horizontal line at this Y
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha * 0.8})`;
          ctx.lineWidth = 1.5 * depth;
          
          const samples = entry.samples;
          const centerX = width / 2;
          
          for (let j = 0; j < samples.length; j++) {
            const progress = j / (samples.length - 1);
            const sampleVal = samples[j] || 0;
            const x = centerX + sampleVal * waveScale * 3; // 3X amplification
            const sliceY = y + (progress - 0.5) * 3 * depth; // Slight vertical spread
            
            if (j === 0) ctx.moveTo(x, sliceY);
            else ctx.lineTo(x, sliceY);
          }
          ctx.stroke();
          
          // Add glow effect for active notes
          if (isNoteActive && timeProgress > 0.8) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.3})`;
            ctx.lineWidth = 4 * depth;
            ctx.stroke();
          }
        }
        
        // Draw pitch line overlay (vertical colored line showing cents)
        ctx.lineWidth = 3;
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1];
          const curr = history[i];
          
          if (!curr.isActive) continue;
          
          const y1 = ((prev.time - cutoff) / (timeSpan * 1000)) * height;
          const y2 = ((curr.time - cutoff) / (timeSpan * 1000)) * height;
          
          if (y2 < 0 || y1 > height) continue;
          
          // X position based on cents (left = flat, right = sharp)
          const x1 = width / 2 + (prev.cents || 0) * (width / 100);
          const x2 = width / 2 + (curr.cents || 0) * (width / 100);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          
          const ac = Math.abs(curr.cents || 0);
          if (ac <= 5) {
            ctx.strokeStyle = '#22c55e';
          } else if (ac <= 15) {
            ctx.strokeStyle = '#eab308';
          } else {
            ctx.strokeStyle = '#ef4444';
          }
          ctx.stroke();
        }
      }
      
      // Labels for flat/sharp
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px SF Pro Display, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♭ FLAT', width * 0.2, height - 10);
      ctx.fillText('SHARP ♯', width * 0.8, height - 10);
      
    } else {
      // ========== 2D HORIZONTAL SCROLLING VIEW ==========
      // Grid lines - subtle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let c = -40; c <= 40; c += 10) {
        const y = centerY - (c / centsRange) * (height / 2 - 25);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Y-axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '10px SF Pro Display, system-ui, sans-serif';
      ctx.textAlign = 'right';
      for (let c = -30; c <= 30; c += 10) {
        const y = centerY - (c / centsRange) * (height / 2 - 25);
        ctx.fillText(`${c > 0 ? '+' : ''}${c}`, width - 6, y + 3);
      }
      
      // Draw center line (0 cents) - prominent
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      
      // Helper functions
      const getX = (time) => ((time - cutoff) / (timeSpan * 1000)) * width;
      const getY = (c) => centerY - (Math.max(-centsRange, Math.min(centsRange, c)) / centsRange) * (height / 2 - 25);
      
      // Draw scrolling waveform - 3X larger amplitude
      if (history.length > 1) {
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1];
          const curr = history[i];
          
          const x1 = getX(prev.time);
          const x2 = getX(curr.time);
          const segmentWidth = x2 - x1;
          
          if (segmentWidth <= 0 || x2 < 0 || x1 > width) continue;
          
          const samples = curr.samples;
          // 3X LARGER amplitude
          const amplitude = Math.min(1.5, (curr.rms || 0) * 24) * (height / 3);
          
          // Color based on whether note is active - BLUE when detected, GREY when silent
          const waveColor = curr.isActive 
            ? 'rgba(59, 130, 246, 0.85)'
            : 'rgba(120, 120, 140, 0.45)';
          
          ctx.beginPath();
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 1.5;
          
          for (let j = 0; j < samples.length; j++) {
            const sampleX = x1 + (j / samples.length) * segmentWidth;
            const sampleY = centerY + (samples[j] || 0) * amplitude * 3; // 3X
            
            if (j === 0) ctx.moveTo(sampleX, sampleY);
            else ctx.lineTo(sampleX, sampleY);
          }
          ctx.stroke();
        }
        
        // Draw pitch tracking line ONLY (no blue background on note changes)
        ctx.lineWidth = 3;
        let lastNote = null;
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1];
          const curr = history[i];
          
          if (!curr.isActive || !prev.isActive) continue;
          
          const x1 = getX(prev.time);
          const y1 = getY(prev.cents || 0);
          const x2 = getX(curr.time);
          const y2 = getY(curr.cents || 0);
          
          if (x2 < 0 || x1 > width) continue;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          
          const ac = Math.abs(curr.cents || 0);
          if (ac <= 5) {
            ctx.strokeStyle = '#22c55e'; // Green - in tune
          } else if (ac <= 15) {
            ctx.strokeStyle = '#eab308'; // Yellow - close
          } else {
            ctx.strokeStyle = '#ef4444'; // Red - out of tune
          }
          ctx.stroke();
          
          // Note label at note changes (no background)
          if (prev.note !== curr.note && curr.note) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 10px SF Pro Display, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(formatNote(curr.note), x2, height - 8);
          }
        }
      }
      
      // Current note label
      if (isActive && pitch.note && pitch.note !== '--') {
        const labelX = width * 0.88;
        ctx.fillStyle = 'rgba(134, 239, 172, 0.15)';
        ctx.beginPath();
        ctx.roundRect(labelX - 24, centerY - 12, 48, 24, 6);
        ctx.fill();
        
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 14px SF Pro Display, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatNote(pitch.note), labelX, centerY + 5);
      }
    }
    
    animationRef.current = requestAnimationFrame(draw);
  }, [timeSpan, pitch, isActive, formatNote, cameraEnabled, cameraDim, view3D]);
  
  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);
  
  // Touch handlers
  const handleTouchStart = (e) => {
    touchCountRef.current = e.touches.length;
  };
  
  const handleTouchEnd = (e) => {
    const now = Date.now();
    
    // Double tap to freeze
    if (now - lastTapRef.current < 300) {
      if (!isFrozen && analysisData) setFrozenData({ ...analysisData });
      setIsFrozen(prev => !prev);
    }
    lastTapRef.current = now;
  };
  
  // Time display
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // dB meter color
  const getDbColor = () => {
    if (dbPercent > 85) return 'bg-red-500';
    if (dbPercent > 60) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#08080a] flex flex-col overflow-hidden select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Camera Background */}
      {cameraEnabled && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          <div className="absolute inset-0 bg-black z-0" style={{ opacity: cameraDim / 100 }} />
        </>
      )}
      
      {/* TOP SECTION */}
      <div className="relative flex-shrink-0 z-10" style={{ height: '42%' }}>
        {/* Quarter circle menus */}
        <KeyTemperamentMenu
          temperament={temperament} setTemperament={setTemperament}
          keyCenter={keyCenter} setKeyCenter={setKeyCenter}
          preferFlats={preferFlats} setPreferFlats={setPreferFlats}
          a4Frequency={a4Frequency} setA4Frequency={setA4Frequency}
        />
        
        <MetronomeMenu
          bpm={metronomeBpm} setBpm={setMetronomeBpm}
          isActive={metronomeActive} setIsActive={setMetronomeActive}
          metronomeRef={metronomeRef}
        />
        
        {/* Center top bar - time, camera controls, close */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          <span className="text-[11px] font-mono text-white/50">{time}</span>
          <Battery className="w-4 h-4 text-white/40" />
          
          <button
            onClick={cameraEnabled ? stopCamera : startCamera}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              cameraEnabled ? 'bg-blue-500/40 text-blue-400' : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}
          >
            {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>
          
          {cameraEnabled && (
            <button
              onClick={flipCamera}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Main center area */}
        <div className="absolute inset-0 flex items-center justify-center pt-10">
          {/* Left info */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-left space-y-1">
            <div className="text-[9px] text-white/35 uppercase tracking-wider">A = {a4Frequency}Hz</div>
            <div className="text-[9px] text-white/35 uppercase tracking-wider">Key: {keyCenter}</div>
            <div className="text-base font-mono text-cyan-400/90 mt-2">
              {pitch.freq > 0 ? `${pitch.freq.toFixed(1)}Hz` : '—'}
            </div>
          </div>
          
          {/* Center Circle */}
          <TunerCircle
            rms={rms}
            pitch={pitch}
            isSilent={isSilent}
            isInTune={isInTune}
            absCents={absCents}
            cents={cents}
            preferFlats={preferFlats}
            a4Frequency={a4Frequency}
          />
          
          {/* Right info - Note display */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right">
            <motion.div 
              className={`text-5xl font-light tracking-tight ${
                isInTune ? 'text-emerald-400' : (isActive ? 'text-white' : 'text-white/25')
              }`}
              animate={{ scale: isInTune ? 1.05 : 1 }}
              style={{ textShadow: isInTune ? '0 0 20px rgba(52, 211, 153, 0.5)' : 'none' }}
            >
              {formatNote(pitch.note)}
            </motion.div>
            <div className={`text-xl font-light ${isActive ? 'text-white/50' : 'text-white/15'}`}>
              {pitch.octave > 0 ? pitch.octave : ''}
            </div>
            <div className={`text-lg font-mono mt-1 ${
              isInTune ? 'text-emerald-400' : (absCents <= 15 ? 'text-amber-400' : 'text-white/40')
            }`}>
              {isActive ? (cents > 0 ? '+' : '') + cents.toFixed(1) : '0.0'}¢
            </div>
          </div>
        </div>
        
        {/* Bottom row - dB meter, settings */}
        <div className="absolute bottom-2 left-0 right-0 px-4 flex items-center gap-3">
          {/* dB meter */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-mono text-white/40 w-10">{currentDb}dB</span>
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${getDbColor()} rounded-full`}
                animate={{ width: `${dbPercent}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </div>
          
          {/* Wind filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">
                <Wind className="w-3 h-3 text-white/40" />
                <span className="text-[10px] text-emerald-400">{windFilter}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-28 p-2 bg-gray-900/98 border-white/10 text-white">
              {['Off', 'Low', 'Med', 'High'].map((level) => (
                <button
                  key={level}
                  onClick={() => setWindFilter(level)}
                  className={`w-full py-1.5 rounded text-xs ${windFilter === level ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/5 text-white/50'}`}
                >
                  {level}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          
          {/* Time span */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-[10px] font-mono text-white/50">{timeSpan}s</span>
                <ChevronDown className="w-3 h-3 text-white/30" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-28 p-2 bg-gray-900/98 border-white/10 text-white">
              {[4, 8, 16, 24, 32].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeSpan(t)}
                  className={`w-full py-1.5 rounded text-xs ${timeSpan === t ? 'bg-blue-500/30 text-blue-400' : 'bg-white/5 text-white/50'}`}
                >
                  {t}s
                </button>
              ))}
            </PopoverContent>
          </Popover>
          
          {/* Settings */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-gray-900/98 backdrop-blur-xl border-white/10 text-white w-80">
              <SheetHeader>
                <SheetTitle className="text-white">Analysis Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {cameraEnabled && (
                  <div>
                    <div className="text-xs text-white/50 uppercase mb-3">Camera Dim</div>
                    <Slider
                      value={[cameraDim]}
                      onValueChange={(v) => setCameraDim(v[0])}
                      min={0}
                      max={80}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-white/40 mt-1 text-center">{cameraDim}%</div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs text-white/50 uppercase mb-3">Display</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Prefer Flats (♭)</span>
                      <Switch checked={preferFlats} onCheckedChange={setPreferFlats} />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-white/40">
                    • Double-tap waveform to freeze<br/>
                    • Tap metronome to toggle<br/>
                    • Long-press metronome for settings
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* BOTTOM SECTION - Waveform Display */}
      <div 
        className="flex-1 relative z-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Canvas */}
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        
        {/* Frozen indicator */}
        {isFrozen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 rounded-full bg-amber-500/30 text-amber-400 text-sm font-bold flex items-center gap-2 border border-amber-500/50 backdrop-blur-sm"
          >
            <Pause className="w-4 h-4" />
            FROZEN
          </motion.div>
        )}
        
        {/* Gesture hints */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center text-[9px] text-white/20">
          Double-tap to freeze
        </div>
        
        {/* Top controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {/* 3D Toggle */}
          <button
            onClick={() => setView3D(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              view3D 
                ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50' 
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {view3D ? '3D WATERFALL' : '2D VIEW'}
          </button>
          
          {/* Color legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-white/40">In tune</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[8px] text-white/40">Close</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[8px] text-white/40">Off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}