import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Music2, Volume2, Shuffle, Repeat, Settings2, Pencil, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_QUALITIES = {
  'maj': { name: 'Major', intervals: [0, 4, 7], symbol: '' },
  'min': { name: 'Minor', intervals: [0, 3, 7], symbol: 'm' },
  '7': { name: 'Dom7', intervals: [0, 4, 7, 10], symbol: '7' },
  'maj7': { name: 'Maj7', intervals: [0, 4, 7, 11], symbol: 'Δ7' },
  'min7': { name: 'Min7', intervals: [0, 3, 7, 10], symbol: 'm7' },
  'dim': { name: 'Dim', intervals: [0, 3, 6], symbol: '°' },
  'dim7': { name: 'Dim7', intervals: [0, 3, 6, 9], symbol: '°7' },
  'aug': { name: 'Aug', intervals: [0, 4, 8], symbol: '+' },
  'sus4': { name: 'Sus4', intervals: [0, 5, 7], symbol: 'sus4' },
  'sus2': { name: 'Sus2', intervals: [0, 2, 7], symbol: 'sus2' },
  '9': { name: 'Dom9', intervals: [0, 4, 7, 10, 14], symbol: '9' },
  'min9': { name: 'Min9', intervals: [0, 3, 7, 10, 14], symbol: 'm9' },
  'maj9': { name: 'Maj9', intervals: [0, 4, 7, 11, 14], symbol: 'Δ9' },
  '6': { name: '6th', intervals: [0, 4, 7, 9], symbol: '6' },
  'min6': { name: 'Min6', intervals: [0, 3, 7, 9], symbol: 'm6' },
  '13': { name: '13th', intervals: [0, 4, 7, 10, 14, 21], symbol: '13' },
};

const PLAY_MODES = [
  { key: 'block', name: 'Whole Bar', icon: '▮' },
  { key: 'arpeggio', name: 'Arpeggio', icon: '↗' },
  { key: 'rhythm', name: 'Rhythm', icon: '♪' },
];

const PRESETS = [
  { name: 'I-V-vi-IV', chords: [
    { root: 0, quality: 'maj' }, { root: 7, quality: 'maj' }, 
    { root: 9, quality: 'min' }, { root: 5, quality: 'maj' }
  ]},
  { name: 'ii-V-I Jazz', chords: [
    { root: 2, quality: 'min7' }, { root: 7, quality: '7' }, 
    { root: 0, quality: 'maj7' }, null
  ]},
  { name: '12-Bar Blues', chords: [
    { root: 9, quality: '7' }, { root: 9, quality: '7' }, { root: 9, quality: '7' }, { root: 9, quality: '7' },
    { root: 2, quality: '7' }, { root: 2, quality: '7' }, { root: 9, quality: '7' }, { root: 9, quality: '7' },
    { root: 4, quality: '7' }, { root: 2, quality: '7' }, { root: 9, quality: '7' }, { root: 4, quality: '7' }
  ]},
  { name: 'Autumn Leaves', chords: [
    { root: 9, quality: 'min7' }, { root: 2, quality: '7' },
    { root: 7, quality: 'maj7' }, { root: 0, quality: 'maj7' },
    { root: 5, quality: 'min7' }, { root: 11, quality: '7' },
    { root: 4, quality: 'min7' }, { root: 4, quality: 'min7' }
  ]},
  { name: 'Bossa Nova', chords: [
    { root: 2, quality: 'maj7' }, { root: 4, quality: 'min7' },
    { root: 9, quality: '7' }, { root: 2, quality: 'maj7' }
  ]},
];

const TEMPO_PRESETS = [60, 80, 100, 120, 140];

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM ELECTRIC PIANO - Additive Synthesis with Natural Harmonics
// Pure sine wave additive synthesis - no FM artifacts, no clicks
// ═══════════════════════════════════════════════════════════════════════════════

class RhodesEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this.initialized = false;
    this.activeVoices = new Map();
  }

  async init() {
    if (this.initialized && this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Clean master output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    
    // Soft limiter to prevent any clipping
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 4;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.1;
    
    // Warmth - gentle low shelf boost
    this.warmth = this.ctx.createBiquadFilter();
    this.warmth.type = 'lowshelf';
    this.warmth.frequency.value = 250;
    this.warmth.gain.value = 2;
    
    // Air - subtle high shelf
    this.air = this.ctx.createBiquadFilter();
    this.air.type = 'highshelf';
    this.air.frequency.value = 4000;
    this.air.gain.value = 1;
    
    // Anti-alias filter
    this.antiAlias = this.ctx.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 8000;
    this.antiAlias.Q.value = 0.5;
    
    // Connect chain
    this.masterGain.connect(this.warmth);
    this.warmth.connect(this.air);
    this.air.connect(this.antiAlias);
    this.antiAlias.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);
    
    this.initialized = true;
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE SYNTHESIS - Pure harmonics, no FM clicks
  // Real electric piano has these harmonic characteristics:
  // - Strong fundamental
  // - Bell-like 2nd and 3rd harmonics that decay faster
  // - Subtle higher partials for brightness
  // ═══════════════════════════════════════════════════════════════════════════
  
  async playNote(midi, velocity = 0.6, duration = 2) {
    await this.init();
    
    const freq = this.midiToFreq(midi);
    const now = this.ctx.currentTime;
    
    // Register: 0 = bass, 1 = treble
    const register = Math.max(0, Math.min(1, (midi - 36) / 48));
    
    // Velocity response - natural curve
    const vel = velocity * velocity; // Quadratic for natural feel
    const baseVol = 0.12 * vel;
    
    // Voice output node
    const voiceOut = this.ctx.createGain();
    voiceOut.gain.value = 1;
    voiceOut.connect(this.masterGain);
    
    const oscillators = [];
    const gains = [];
    
    // ─────────────────────────────────────────────────────────────────
    // HARMONIC 1: Fundamental - the body of the tone
    // ─────────────────────────────────────────────────────────────────
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    
    const gain1 = this.ctx.createGain();
    const vol1 = baseVol;
    // Smooth envelope - no sudden jumps
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(vol1, now + 0.008);
    gain1.gain.setTargetAtTime(vol1 * 0.7, now + 0.05, 0.15);
    gain1.gain.setTargetAtTime(vol1 * 0.5, now + 0.3, 0.4);
    gain1.gain.setTargetAtTime(vol1 * 0.3, now + 1, 1);
    gain1.gain.setTargetAtTime(0.0001, now + duration, duration * 0.3);
    
    osc1.connect(gain1);
    gain1.connect(voiceOut);
    oscillators.push(osc1);
    gains.push(gain1);
    
    // ─────────────────────────────────────────────────────────────────
    // HARMONIC 2: Octave - adds warmth in bass, clarity in treble
    // ─────────────────────────────────────────────────────────────────
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    
    const gain2 = this.ctx.createGain();
    const vol2 = baseVol * (0.35 - register * 0.15) * (0.7 + vel * 0.3);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(vol2, now + 0.005);
    gain2.gain.setTargetAtTime(vol2 * 0.4, now + 0.08, 0.12);
    gain2.gain.setTargetAtTime(vol2 * 0.15, now + 0.4, 0.5);
    gain2.gain.setTargetAtTime(0.0001, now + duration * 0.7, duration * 0.25);
    
    osc2.connect(gain2);
    gain2.connect(voiceOut);
    oscillators.push(osc2);
    gains.push(gain2);
    
    // ─────────────────────────────────────────────────────────────────
    // HARMONIC 3: Fifth above octave - the "bell" character
    // ─────────────────────────────────────────────────────────────────
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;
    
    const gain3 = this.ctx.createGain();
    const vol3 = baseVol * (0.2 - register * 0.1) * vel;
    gain3.gain.setValueAtTime(0.0001, now);
    gain3.gain.exponentialRampToValueAtTime(vol3, now + 0.003);
    gain3.gain.setTargetAtTime(vol3 * 0.2, now + 0.04, 0.08);
    gain3.gain.setTargetAtTime(0.0001, now + 0.5, 0.3);
    
    osc3.connect(gain3);
    gain3.connect(voiceOut);
    oscillators.push(osc3);
    gains.push(gain3);
    
    // ─────────────────────────────────────────────────────────────────
    // HARMONIC 4: Two octaves - adds sparkle on attack
    // ─────────────────────────────────────────────────────────────────
    const osc4 = this.ctx.createOscillator();
    osc4.type = 'sine';
    osc4.frequency.value = freq * 4;
    
    const gain4 = this.ctx.createGain();
    const vol4 = baseVol * 0.12 * vel * vel;
    gain4.gain.setValueAtTime(0.0001, now);
    gain4.gain.exponentialRampToValueAtTime(vol4, now + 0.002);
    gain4.gain.setTargetAtTime(vol4 * 0.1, now + 0.02, 0.04);
    gain4.gain.setTargetAtTime(0.0001, now + 0.15, 0.1);
    
    osc4.connect(gain4);
    gain4.connect(voiceOut);
    oscillators.push(osc4);
    gains.push(gain4);
    
    // ─────────────────────────────────────────────────────────────────
    // HARMONIC 5: Adds the distinctive "tine" brightness
    // ─────────────────────────────────────────────────────────────────
    if (vel > 0.3 && freq < 2000) {
      const osc5 = this.ctx.createOscillator();
      osc5.type = 'sine';
      osc5.frequency.value = freq * 5;
      
      const gain5 = this.ctx.createGain();
      const vol5 = baseVol * 0.06 * vel * (1 - register * 0.5);
      gain5.gain.setValueAtTime(0.0001, now);
      gain5.gain.exponentialRampToValueAtTime(vol5, now + 0.002);
      gain5.gain.setTargetAtTime(0.0001, now + 0.03, 0.03);
      
      osc5.connect(gain5);
      gain5.connect(voiceOut);
      oscillators.push(osc5);
      gains.push(gain5);
    }
    
    // ─────────────────────────────────────────────────────────────────
    // SUBTLE CHORUS - two detuned copies for width
    // ─────────────────────────────────────────────────────────────────
    const chorus1 = this.ctx.createOscillator();
    chorus1.type = 'sine';
    chorus1.frequency.value = freq;
    chorus1.detune.value = 6;
    
    const chorus2 = this.ctx.createOscillator();
    chorus2.type = 'sine';
    chorus2.frequency.value = freq;
    chorus2.detune.value = -6;
    
    const chorusGain = this.ctx.createGain();
    const chorusVol = baseVol * 0.08;
    chorusGain.gain.setValueAtTime(0.0001, now);
    chorusGain.gain.exponentialRampToValueAtTime(chorusVol, now + 0.02);
    chorusGain.gain.setTargetAtTime(chorusVol * 0.5, now + 0.2, 0.3);
    chorusGain.gain.setTargetAtTime(0.0001, now + duration, duration * 0.3);
    
    chorus1.connect(chorusGain);
    chorus2.connect(chorusGain);
    chorusGain.connect(voiceOut);
    oscillators.push(chorus1, chorus2);
    
    // ─────────────────────────────────────────────────────────────────
    // VOICE FILTER - gentle rolloff that follows velocity
    // ─────────────────────────────────────────────────────────────────
    const voiceFilter = this.ctx.createBiquadFilter();
    voiceFilter.type = 'lowpass';
    const cutoff = 1500 + vel * 4000 + register * 1000;
    voiceFilter.frequency.value = cutoff;
    voiceFilter.Q.value = 0.5;
    
    // Reconnect through filter
    voiceOut.disconnect();
    voiceOut.connect(voiceFilter);
    voiceFilter.connect(this.masterGain);
    
    // Start all oscillators
    oscillators.forEach(osc => osc.start(now));
    
    // Stop after duration + tail
    const stopTime = now + duration + 1;
    oscillators.forEach(osc => osc.stop(stopTime));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHORD VOICING with musical dynamics
  // ═══════════════════════════════════════════════════════════════════════════
  
  async playChord(root, intervals, velocity = 0.6, duration = 2, mode = 'block', tempo = 100) {
    await this.init();
    
    const baseMidi = 48 + root;
    
    // Voice the chord for clarity
    const voicedNotes = intervals.map((interval, i) => {
      let midi = baseMidi + interval;
      // Drop root for fuller sound
      if (i === 0 && intervals.length > 3) midi -= 12;
      return midi;
    });

    const beatMs = (60 / tempo) * 1000;

    if (mode === 'block') {
      // Block chord with gentle humanization
      voicedNotes.forEach((midi, i) => {
        // Slight strum timing
        const delay = i * 12 + Math.random() * 8;
        // Natural velocity curve - bass stronger, upper voices lighter
        const noteVel = velocity * (0.9 - i * 0.08) * (0.95 + Math.random() * 0.1);
        setTimeout(() => this.playNote(midi, Math.max(0.2, noteVel), duration * 0.9), delay);
      });
      
    } else if (mode === 'arpeggio') {
      // 16th note arpeggio
      const sixteenthMs = beatMs / 4;
      const pattern = this.generateArpPattern(voicedNotes.length);
      
      pattern.forEach((noteIdx, i) => {
        if (noteIdx === -1) return;
        const midi = voicedNotes[noteIdx % voicedNotes.length];
        // Musical accents
        const accent = i % 4 === 0 ? 1.0 : i % 2 === 0 ? 0.75 : 0.55;
        const noteVel = velocity * accent * (0.85 + Math.random() * 0.15);
        const noteDur = sixteenthMs / 1000 * 2.5;
        
        setTimeout(() => this.playNote(midi, noteVel, noteDur), i * sixteenthMs);
      });
      
    } else if (mode === 'rhythm') {
      // Quarter note comping
      for (let beat = 0; beat < 4; beat++) {
        setTimeout(() => {
          voicedNotes.forEach((midi, i) => {
            const delay = i * 8;
            const accent = (beat === 0 || beat === 2) ? 1.0 : 0.7;
            const noteVel = velocity * accent * (0.9 + Math.random() * 0.1);
            setTimeout(() => this.playNote(midi, noteVel, beatMs / 1000 * 0.75), delay);
          });
        }, beat * beatMs);
      }
    }
  }

  generateArpPattern(chordSize) {
    const patterns = [
      [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
      [0, 1, 2, 0, 1, 2, 3, 2, 0, 1, 2, 0, 1, 2, 3, 2],
      [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 0, 2, 1, 3],
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern.map(idx => idx >= chordSize ? idx % chordSize : idx);
  }
}

const rhodes = new RhodesEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - Apple Timer Style
// ═══════════════════════════════════════════════════════════════════════════════

export default function SmartProgressions() {
  const [bars, setBars] = useState(Array(16).fill(null).map((_, i) => 
    i < 4 ? { root: [0, 7, 9, 5][i], quality: i === 2 ? 'min' : 'maj' } : null
  ));
  const [selectedBar, setSelectedBar] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);
  const [tempo, setTempo] = useState(100);
  const [playMode, setPlayMode] = useState('block');
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [volume, setVolume] = useState(65);
  const [showSettings, setShowSettings] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const playingRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    rhodes.setVolume(volume / 100);
  }, [volume]);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentBar(-1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startPlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    
    playingRef.current = true;
    setIsPlaying(true);
    
    let bar = 0;
    
    const playBar = () => {
      if (!playingRef.current) return;
      
      setCurrentBar(bar);
      
      const chord = bars[bar];
      if (chord) {
        const quality = CHORD_QUALITIES[chord.quality];
        if (quality) {
          const beatDuration = (60 / tempo) * 4;
          rhodes.playChord(chord.root, quality.intervals, 0.7, beatDuration * 0.95, playMode, tempo);
        }
      }
      
      bar++;
      if (bar >= 16) {
        if (loopEnabled) {
          bar = 0;
        } else {
          stopPlayback();
          return;
        }
      }
    };
    
    playBar();
    intervalRef.current = setInterval(playBar, (60 / tempo) * 4 * 1000);
  }, [isPlaying, bars, tempo, playMode, loopEnabled, stopPlayback]);

  const handleBarClick = (index) => {
    setSelectedBar(index);
    setEditorOpen(true);
    setShowSettings(false);
  };

  const updateBar = (root, quality) => {
    if (selectedBar === null) return;
    const newBars = [...bars];
    newBars[selectedBar] = { root, quality };
    setBars(newBars);
  };

  const clearBar = () => {
    if (selectedBar === null) return;
    const newBars = [...bars];
    newBars[selectedBar] = null;
    setBars(newBars);
  };

  const applyPreset = (preset) => {
    const newBars = Array(16).fill(null);
    preset.chords.forEach((chord, i) => {
      if (i < 16 && chord) newBars[i] = { ...chord };
    });
    const len = preset.chords.length;
    for (let i = len; i < 16; i++) {
      const src = preset.chords[i % len];
      if (src) newBars[i] = { ...src };
    }
    setBars(newBars);
  };

  const shuffleChords = () => {
    const newBars = bars.map(bar => {
      if (!bar) return null;
      const qualities = Object.keys(CHORD_QUALITIES);
      return {
        root: Math.floor(Math.random() * 12),
        quality: qualities[Math.floor(Math.random() * qualities.length)]
      };
    });
    setBars(newBars);
  };

  const resetBars = () => {
    setBars(Array(16).fill(null).map((_, i) => 
      i < 4 ? { root: [0, 7, 9, 5][i], quality: i === 2 ? 'min' : 'maj' } : null
    ));
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getChordLabel = (chord) => {
    if (!chord) return '—';
    const quality = CHORD_QUALITIES[chord.quality];
    return `${NOTES[chord.root]}${quality?.symbol || ''}`;
  };

  const getProgress = () => {
    if (currentBar < 0) return 0;
    return ((currentBar + 1) / 16) * 100;
  };

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (getProgress() / 100) * circumference;

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Header */}
          <div className="pt-8 pb-2 px-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-center gap-2 mb-1">
              <Music2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white/90">Progressions</h2>
            </div>
            <p className="text-[10px] text-white/40">{tempo} BPM • {PLAY_MODES.find(m => m.key === playMode)?.name}</p>
          </div>

          {/* Circular Progress Display */}
          <div className="px-8 py-6 flex flex-col items-center">
            <div className="relative w-60 h-60 flex items-center justify-center">
              {/* Background Circle */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="6"
                />
                {/* Progress Circle */}
                {isPlaying && (
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    className="transition-all duration-300"
                  />
                )}
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Current Chord Display */}
              <div className="relative z-10 text-center">
                <div className={`text-5xl font-bold transition-all duration-200 ${isPlaying ? 'text-white scale-110' : 'text-white/70'}`}>
                  {currentBar >= 0 && bars[currentBar] 
                    ? getChordLabel(bars[currentBar])
                    : '—'
                  }
                </div>
                <div className="mt-2 text-sm text-white/40 font-mono">
                  Bar {currentBar >= 0 ? currentBar + 1 : '—'} / 16
                </div>
                {isPlaying && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-amber-400">Playing</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 16-Bar Grid - Mini or Edit Mode */}
          <div className="px-4 sm:px-6 pb-4">
            {/* Edit Mode Toggle */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  editMode
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {editMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>

            {editMode ? (
              /* Edit Mode - Large 4x4 Grid */
              <div className="space-y-2">
                {[0, 1, 2, 3].map(row => (
                  <div key={row} className="grid grid-cols-4 gap-2">
                    {bars.slice(row * 4, row * 4 + 4).map((chord, i) => {
                      const idx = row * 4 + i;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleBarClick(idx)}
                          className={`relative aspect-[4/3] rounded-2xl text-lg font-bold transition-all duration-200 flex flex-col items-center justify-center ${
                            currentBar === idx
                              ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/40 scale-[1.02]'
                              : selectedBar === idx
                                ? 'bg-amber-500/25 text-amber-400 border-2 border-amber-500/60'
                                : chord
                                  ? 'bg-white/10 text-white/90 hover:bg-white/15 active:scale-[0.98]'
                                  : 'bg-white/5 text-white/30 hover:bg-white/10 active:scale-[0.98] border border-dashed border-white/10'
                          }`}
                        >
                          {chord ? (
                            <>
                              <span className="text-xl sm:text-2xl">{NOTES[chord.root]}</span>
                              <span className={`text-[10px] sm:text-xs ${currentBar === idx ? 'text-white/80' : 'text-white/50'}`}>
                                {CHORD_QUALITIES[chord.quality]?.symbol || chord.quality}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl opacity-30">+</span>
                          )}
                          <span className={`absolute top-1 left-2 text-[9px] font-medium ${currentBar === idx ? 'text-white/60' : 'text-white/30'}`}>
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              /* Mini Grid - 8x2 */
              <div className="grid grid-cols-8 gap-1">
                {bars.map((chord, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBarClick(idx)}
                    className={`aspect-square rounded-lg text-[9px] font-bold transition-all ${
                      currentBar === idx
                        ? 'bg-amber-500 text-white scale-110 shadow-lg shadow-amber-500/40'
                        : selectedBar === idx
                          ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                          : chord
                            ? 'bg-white/10 text-white/80 hover:bg-white/15'
                            : 'bg-white/5 text-white/20 hover:bg-white/10'
                    }`}
                  >
                    {chord ? NOTES[chord.root] : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Play Controls */}
          <div className="px-8 pb-6 flex justify-center items-center gap-4">
            <button
              onClick={shuffleChords}
              className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
            >
              <Shuffle className="w-5 h-5 text-white/60" />
            </button>
            
            <button
              onClick={startPlayback}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isPlaying
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50'
              }`}
            >
              {isPlaying 
                ? <Pause className="w-10 h-10 text-white" fill="white" />
                : <Play className="w-10 h-10 ml-1 text-white" fill="white" />
              }
            </button>
            
            <button
              onClick={resetBars}
              className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Play Mode Selection */}
          <div className="px-6 pb-4">
            <div className="bg-white/5 rounded-2xl p-1 flex">
              {PLAY_MODES.map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setPlayMode(mode.key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    playMode === mode.key
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <span>{mode.icon}</span>
                  <span className="hidden sm:inline">{mode.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-black/30 px-6 py-5 space-y-4">
            {/* Volume */}
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-white/40" />
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-white/40 w-8 text-right font-mono">{volume}%</span>
            </div>

            {/* Tempo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Tempo</label>
                <button
                  onClick={() => setLoopEnabled(!loopEnabled)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                    loopEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'
                  }`}
                >
                  <Repeat className="w-3 h-3" />
                  Loop
                </button>
              </div>
              <div className="flex gap-2">
                {TEMPO_PRESETS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTempo(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      tempo === t
                        ? 'bg-amber-500/25 text-amber-400 border border-amber-500/40'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Presets</label>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Settings2 className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.slice(0, showSettings ? PRESETS.length : 3).map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-xs font-medium transition-all"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chord Editor Modal */}
      {editorOpen && selectedBar !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setEditorOpen(false); setSelectedBar(null); }}>
          <div 
            className="w-full max-w-lg bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-3xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-white">Bar {selectedBar + 1}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearBar}
                    className="px-3 py-1.5 rounded-lg text-xs bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => { setEditorOpen(false); setSelectedBar(null); }}
                    className="px-4 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
              
              {/* Root Note */}
              <div className="mb-5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-medium">Root Note</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {NOTES.map((note, i) => (
                    <button
                      key={note}
                      onClick={() => updateBar(i, bars[selectedBar]?.quality || 'maj')}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        bars[selectedBar]?.root === i
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Quality */}
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-medium">Chord Quality</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CHORD_QUALITIES).map(([key, q]) => (
                    <button
                      key={key}
                      onClick={() => updateBar(bars[selectedBar]?.root || 0, key)}
                      className={`px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                        bars[selectedBar]?.quality === key
                          ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/40'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {q.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}