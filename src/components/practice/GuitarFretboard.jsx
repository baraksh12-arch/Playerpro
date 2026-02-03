import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Volume2, Music, Layers, Grid3X3, Zap, ChevronLeft, ChevronRight, Square } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC THEORY CONSTANTS - Accurate and Complete
// ═══════════════════════════════════════════════════════════════════════════════

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const STRING_TUNING = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2 (MIDI) - Standard tuning
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const FRET_COUNT = 24;

// Fret markers (standard dots)
const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_DOT_FRETS = [12, 24];

// ═══════════════════════════════════════════════════════════════════════════════
// SCALES - Complete Collection
// ═══════════════════════════════════════════════════════════════════════════════

const SCALES = {
  'Major (Ionian)': [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
  'Whole Tone': [0, 2, 4, 6, 8, 10],
  'Diminished (H-W)': [0, 1, 3, 4, 6, 7, 9, 10],
  'Diminished (W-H)': [0, 2, 3, 5, 6, 8, 9, 11],
  'Bebop Dominant': [0, 2, 4, 5, 7, 9, 10, 11],
  'Altered': [0, 1, 3, 4, 6, 8, 10],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHORDS - Complete Voicing Library with Drop Voicings
// ═══════════════════════════════════════════════════════════════════════════════

const CHORD_TYPES = {
  // Triads
  'Major': { intervals: [0, 4, 7], category: 'Triad' },
  'Minor': { intervals: [0, 3, 7], category: 'Triad' },
  'Diminished': { intervals: [0, 3, 6], category: 'Triad' },
  'Augmented': { intervals: [0, 4, 8], category: 'Triad' },
  'Sus2': { intervals: [0, 2, 7], category: 'Triad' },
  'Sus4': { intervals: [0, 5, 7], category: 'Triad' },
  
  // 7th Chords
  'Maj7': { intervals: [0, 4, 7, 11], category: '7th' },
  'Dom7': { intervals: [0, 4, 7, 10], category: '7th' },
  'Min7': { intervals: [0, 3, 7, 10], category: '7th' },
  'Min(maj7)': { intervals: [0, 3, 7, 11], category: '7th' },
  'Dim7': { intervals: [0, 3, 6, 9], category: '7th' },
  'Half-dim7': { intervals: [0, 3, 6, 10], category: '7th' },
  'Aug7': { intervals: [0, 4, 8, 10], category: '7th' },
  '7sus4': { intervals: [0, 5, 7, 10], category: '7th' },
  
  // Extended
  'Maj9': { intervals: [0, 4, 7, 11, 14], category: 'Extended' },
  'Dom9': { intervals: [0, 4, 7, 10, 14], category: 'Extended' },
  'Min9': { intervals: [0, 3, 7, 10, 14], category: 'Extended' },
  '7b9': { intervals: [0, 4, 7, 10, 13], category: 'Extended' },
  '7#9': { intervals: [0, 4, 7, 10, 15], category: 'Extended' },
  'Dom13': { intervals: [0, 4, 7, 10, 14, 21], category: 'Extended' },
  
  // Add Chords
  'Add9': { intervals: [0, 4, 7, 14], category: 'Add' },
  'Add11': { intervals: [0, 4, 7, 17], category: 'Add' },
  '6': { intervals: [0, 4, 7, 9], category: 'Add' },
  'Min6': { intervals: [0, 3, 7, 9], category: 'Add' },
};

// Arpeggios
const ARPEGGIOS = {
  'Major': { intervals: [0, 4, 7, 12], category: 'Basic' },
  'Minor': { intervals: [0, 3, 7, 12], category: 'Basic' },
  'Dim': { intervals: [0, 3, 6, 12], category: 'Basic' },
  'Aug': { intervals: [0, 4, 8, 12], category: 'Basic' },
  'Maj7': { intervals: [0, 4, 7, 11, 12], category: '7th' },
  'Dom7': { intervals: [0, 4, 7, 10, 12], category: '7th' },
  'Min7': { intervals: [0, 3, 7, 10, 12], category: '7th' },
  'Dim7': { intervals: [0, 3, 6, 9, 12], category: '7th' },
  'Min7b5': { intervals: [0, 3, 6, 10, 12], category: '7th' },
};

const CHORD_CATEGORIES = ['All', 'Triad', '7th', 'Extended', 'Add'];

// ═══════════════════════════════════════════════════════════════════════════════
// CAGED SYSTEM - 5 Position Shapes (Industry Standard)
// Each shape corresponds to open chord form: C, A, G, E, D
// CAGED order connects shapes across the neck
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CAGED SYSTEM - Musically Correct Implementation
// Order: C → A → G → E → D (the standard "CAGED" order, looping)
// Each shape has a specific fret span: most are 4-5, G shape needs 6
// ═══════════════════════════════════════════════════════════════════════════════

const CAGED_SHAPES = {
  C: { name: 'C Shape', color: 'from-red-500 to-rose-600', fretSpan: 4 },
  A: { name: 'A Shape', color: 'from-orange-500 to-amber-600', fretSpan: 4 },
  G: { name: 'G Shape', color: 'from-yellow-500 to-amber-500', fretSpan: 6 }, // G needs more room
  E: { name: 'E Shape', color: 'from-green-500 to-emerald-600', fretSpan: 4 },
  D: { name: 'D Shape', color: 'from-blue-500 to-cyan-600', fretSpan: 5 },
};

// Standard CAGED order - this is how guitarists learn it
const CAGED_ORDER = ['C', 'A', 'G', 'E', 'D'];

// Position offsets relative to root note (semitones from root to position start)
// These create overlapping positions that connect smoothly across the neck
const CAGED_POSITION_OFFSETS = {
  C: 0,   // C shape starts at root
  A: 3,   // A shape starts 3 frets up
  G: 5,   // G shape starts 5 frets up  
  E: 8,   // E shape starts 8 frets up
  D: 10,  // D shape starts 10 frets up
};

// Calculate CAGED positions for any root note
function getCAGEDPositions(rootNote) {
  const positions = {};
  CAGED_ORDER.forEach((shape, idx) => {
    const offset = CAGED_POSITION_OFFSETS[shape];
    const startFret = (rootNote + offset) % 12;
    const fretSpan = CAGED_SHAPES[shape].fretSpan;
    
    positions[shape] = {
      startFret: startFret,
      endFret: startFret + fretSpan - 1,
      fretSpan,
      shape,
      index: idx,
    };
  });
  return positions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DROP 2 VOICINGS - Jazz Guitar Standard (Industry Correct)
// ═══════════════════════════════════════════════════════════════════════════════
// Close position (e.g., Cmaj7): C-E-G-B stacked (root-3rd-5th-7th bottom to top)
// 
// DROP 2: Take the 2nd note FROM THE TOP, drop it an octave to become bass
// Close: C-E-G-B → Drop 2nd from top (G) → Result: G-B-C-E (bass is 5th)
// This creates the characteristic spread: 5-7-1-3 interval structure
//
// DROP 2 INVERSIONS (all 4 inversions for jazz guitar):
// Root Position Drop 2:    5-1-3-7 (G-C-E-B for Cmaj7)
// 1st Inversion Drop 2:    7-3-5-1 (B-E-G-C)
// 2nd Inversion Drop 2:    1-5-7-3 (C-G-B-E) 
// 3rd Inversion Drop 2:    3-7-1-5 (E-B-C-G)
//
// DROP 3: Take the 3rd note FROM THE TOP, drop it an octave
// Close: C-E-G-B → Drop 3rd from top (E) → Result: E-G-B-C
// This creates: 3-5-7-1 interval structure
// ═══════════════════════════════════════════════════════════════════════════════

// Note: For guitar fretboard display, we show the chord TONES available 
// Drop voicing affects the ACTUAL guitar shapes played on specific string sets

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM GUITAR SYNTHESIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class PremiumGuitarEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this.activeVoices = new Map();
  }

  init() {
    if (this.ctx && this.ctx.state !== 'closed') return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    
    // Studio-quality compression
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    
    // Cabinet simulation
    const cabinet = this.ctx.createBiquadFilter();
    cabinet.type = 'lowpass';
    cabinet.frequency.value = 5000;
    cabinet.Q.value = 0.7;
    
    const presence = this.ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3000;
    presence.gain.value = 3;
    presence.Q.value = 1.5;
    
    const warmth = this.ctx.createBiquadFilter();
    warmth.type = 'lowshelf';
    warmth.frequency.value = 200;
    warmth.gain.value = 2;
    
    // Subtle reverb
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.1;
    const delay1 = this.ctx.createDelay();
    delay1.delayTime.value = 0.02;
    const delay2 = this.ctx.createDelay();
    delay2.delayTime.value = 0.035;
    
    // Routing
    this.masterGain.connect(warmth);
    warmth.connect(presence);
    presence.connect(cabinet);
    cabinet.connect(compressor);
    
    compressor.connect(delay1);
    compressor.connect(delay2);
    delay1.connect(reverbGain);
    delay2.connect(reverbGain);
    reverbGain.connect(this.ctx.destination);
    
    compressor.connect(this.ctx.destination);
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  playNote(midi, velocity = 0.8, duration = 1.5) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const freq = this.midiToFreq(midi);
    const now = this.ctx.currentTime;
    
    // String character based on register
    const register = Math.max(0, Math.min(1, (midi - 40) / 40));
    const brightness = 0.4 + register * 0.4;
    
    // Main oscillator (saw + triangle mix for guitar character)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 1.002; // Slight detune
    
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 0.5; // Sub for body
    
    // Pickup simulation
    const pickup = this.ctx.createBiquadFilter();
    pickup.type = 'peaking';
    pickup.frequency.value = freq * 2;
    pickup.gain.value = 5 * brightness;
    pickup.Q.value = 2;
    
    // String damping filter
    const damping = this.ctx.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = 2000 + velocity * 4000;
    damping.Q.value = 0.6;
    
    // Envelope
    const env = this.ctx.createGain();
    const attackTime = 0.002;
    const decayTime = 0.1;
    const sustainLevel = 0.3 * velocity;
    
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(velocity * 0.5, now + attackTime);
    env.gain.exponentialRampToValueAtTime(sustainLevel, now + decayTime);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Brightness decay
    damping.frequency.setValueAtTime(2000 + velocity * 4000, now);
    damping.frequency.exponentialRampToValueAtTime(500, now + duration * 0.8);
    
    // Mixer
    const mixer = this.ctx.createGain();
    mixer.gain.value = 0.25;
    
    const subMixer = this.ctx.createGain();
    subMixer.gain.value = 0.1;
    
    // Connect
    osc1.connect(mixer);
    osc2.connect(mixer);
    osc3.connect(subMixer);
    mixer.connect(pickup);
    subMixer.connect(pickup);
    pickup.connect(damping);
    damping.connect(env);
    env.connect(this.masterGain);
    
    // Start
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
    osc3.stop(now + duration + 0.1);
    
    return { freq, midi };
  }

  playChord(midiNotes, velocity = 0.75) {
    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        this.playNote(midi, velocity * 0.9, 2);
      }, i * 20); // Slight strum effect
    });
  }
}

const guitar = new PremiumGuitarEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GuitarFretboard() {
  const [mode, setMode] = useState('notes'); // notes, scales, chords, arpeggios
  const [rootNote, setRootNote] = useState(0); // 0 = C
  const [selectedScale, setSelectedScale] = useState('Major (Ionian)');
  const [selectedChord, setSelectedChord] = useState('Maj7');
  const [selectedArpeggio, setSelectedArpeggio] = useState('Maj7');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cagedShape, setCagedShape] = useState('C'); // Current CAGED shape - starts with C
  const [showFullNeck, setShowFullNeck] = useState(false); // Toggle full neck vs position view
  const [volume, setVolume] = useState(70);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [lastPlayed, setLastPlayed] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const sequenceRef = useRef(null);
  
  // CAGED positions for current root
  const cagedPositions = getCAGEDPositions(rootNote);

  useEffect(() => {
    guitar.setVolume(volume / 100);
  }, [volume]);

  // Calculate which frets to show based on current CAGED position
  // Dynamic fret window: 4 default, 5 for D shape, 6 for G shape
  const getFretRange = useCallback(() => {
    if (showFullNeck) return { start: 0, end: FRET_COUNT, showNut: true, fretCount: FRET_COUNT + 1 };
    
    const shapeData = cagedPositions[cagedShape];
    const start = shapeData.startFret;
    const fretSpan = shapeData.fretSpan;
    const end = start + fretSpan - 1;
    
    return { 
      start, 
      end, 
      showNut: start === 0,
      fretCount: fretSpan 
    };
  }, [showFullNeck, cagedShape, cagedPositions]);

  const fretRange = getFretRange();
  
  // Navigate through CAGED positions: C → A → G → E → D → C (looping)
  const navigatePosition = useCallback((direction) => {
    const currentIdx = CAGED_ORDER.indexOf(cagedShape);
    const newIdx = (currentIdx + direction + 5) % 5;
    setCagedShape(CAGED_ORDER[newIdx]);
  }, [cagedShape]);

  // Get highlighted notes based on mode
  const getHighlightedNotes = useCallback(() => {
    const highlighted = new Map();
    
    // Helper to get scale/chord intervals (semitones from root)
    const getIntervals = () => {
      if (mode === 'scales') return SCALES[selectedScale] || [];
      if (mode === 'chords') {
        const chordData = CHORD_TYPES[selectedChord];
        // Return unique semitone intervals (mod 12 for octave equivalence)
        return chordData ? [...new Set(chordData.intervals.map(i => ((i % 12) + 12) % 12))] : [];
      }
      if (mode === 'arpeggios') {
        const arpData = ARPEGGIOS[selectedArpeggio];
        return arpData ? [...new Set(arpData.intervals.map(i => ((i % 12) + 12) % 12))] : [];
      }
      return [];
    };
    
    const intervals = getIntervals();
    
    if (mode === 'notes') {
      // Highlight all instances of selected note
      for (let string = 0; string < 6; string++) {
        for (let fret = fretRange.start; fret <= fretRange.end; fret++) {
          const midi = STRING_TUNING[string] + fret;
          const noteIndex = midi % 12;
          if (noteIndex === rootNote) {
            highlighted.set(`${string}-${fret}`, { isRoot: true, interval: 0, degree: 0, cagedShape: null });
          }
        }
      }
    } else {
      // For scales, chords, arpeggios - show notes in the visible fret range
      for (let string = 0; string < 6; string++) {
        for (let fret = fretRange.start; fret <= fretRange.end; fret++) {
          const midi = STRING_TUNING[string] + fret;
          const noteIndex = midi % 12;
          const interval = ((noteIndex - rootNote) % 12 + 12) % 12; // Semitones from root
          
          if (intervals.includes(interval)) {
            const intervalIndex = intervals.indexOf(interval);
            highlighted.set(`${string}-${fret}`, { 
              isRoot: interval === 0, 
              interval: intervalIndex,
              degree: interval,
              cagedShape: !showFullNeck ? cagedShape : null,
            });
          }
        }
      }
    }
    
    return highlighted;
  }, [mode, rootNote, selectedScale, selectedChord, selectedArpeggio, fretRange, showFullNeck, cagedShape]);

  const highlightedNotes = getHighlightedNotes();

  // Play a single fret
  const handleFretClick = useCallback((stringIndex, fret) => {
    const midi = STRING_TUNING[stringIndex] + fret;
    const result = guitar.playNote(midi);
    setLastPlayed({ ...result, note: NOTES[midi % 12], octave: Math.floor(midi / 12) - 1 });
    
    const key = `${stringIndex}-${fret}`;
    setActiveNotes(prev => new Set([...prev, key]));
    
    setTimeout(() => {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);
  }, []);

  // Play all highlighted notes
  const playPattern = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (sequenceRef.current) clearTimeout(sequenceRef.current);
      return;
    }
    
    setIsPlaying(true);
    
    const notesToPlay = [];
    const seenMidi = new Set();
    
    // Collect unique notes
    for (let fret = fretRange.start; fret <= fretRange.end; fret++) {
      for (let string = 5; string >= 0; string--) {
        const key = `${string}-${fret}`;
        if (highlightedNotes.has(key)) {
          const midi = STRING_TUNING[string] + fret;
          if (!seenMidi.has(midi)) {
            seenMidi.add(midi);
            notesToPlay.push({ string, fret, midi, data: highlightedNotes.get(key) });
          }
        }
      }
    }
    
    notesToPlay.sort((a, b) => a.midi - b.midi);
    
    // Play first octave of notes
    const playNotes = notesToPlay.slice(0, mode === 'chords' ? notesToPlay.length : 8);
    
    if (mode === 'chords') {
      // Play as chord (simultaneous)
      const midiNotes = playNotes.map(n => n.midi);
      guitar.playChord(midiNotes);
      playNotes.forEach(n => {
        const key = `${n.string}-${n.fret}`;
        setActiveNotes(prev => new Set([...prev, key]));
      });
      setTimeout(() => {
        setActiveNotes(new Set());
        setIsPlaying(false);
      }, 1500);
    } else {
      // Play as sequence
      let i = 0;
      const playNext = () => {
        if (i >= playNotes.length) {
          setIsPlaying(false);
          return;
        }
        handleFretClick(playNotes[i].string, playNotes[i].fret);
        i++;
        sequenceRef.current = setTimeout(playNext, 250);
      };
      playNext();
    }
  }, [isPlaying, highlightedNotes, mode, fretRange, handleFretClick]);

  const getNoteLabel = (stringIndex, fret) => {
    const midi = STRING_TUNING[stringIndex] + fret;
    return NOTES[midi % 12];
  };

  const getIntervalColor = (data) => {
    if (!data) return '';
    
    // In position view, use CAGED shape colors
    if (!showFullNeck && data.cagedShape) {
      const shapeColor = CAGED_SHAPES[data.cagedShape]?.color || 'from-gray-400 to-gray-500';
      if (data.isRoot) {
        return `bg-gradient-to-br ${shapeColor} text-white shadow-lg shadow-current/50 ring-2 ring-white/50`;
      }
      return `bg-gradient-to-br ${shapeColor} text-white shadow-lg opacity-90`;
    }
    
    // Standard interval colors for full neck view
    if (data.isRoot) return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/50';
    
    const colors = [
      'bg-gradient-to-br from-amber-400 to-orange-500', // Root
      'bg-gradient-to-br from-blue-400 to-cyan-500',    // 2nd
      'bg-gradient-to-br from-purple-400 to-pink-500',  // 3rd
      'bg-gradient-to-br from-green-400 to-emerald-500',// 4th
      'bg-gradient-to-br from-cyan-400 to-blue-500',    // 5th
      'bg-gradient-to-br from-pink-400 to-rose-500',    // 6th
      'bg-gradient-to-br from-violet-400 to-purple-500',// 7th
    ];
    return `${colors[data.interval % colors.length]} text-white shadow-lg`;
  };

  // Filter chords by category
  const filteredChords = Object.entries(CHORD_TYPES).filter(([_, data]) =>
    selectedCategory === 'All' || data.category === selectedCategory
  );

  const visibleFrets = [];
  for (let f = fretRange.start; f <= fretRange.end; f++) {
    visibleFrets.push(f);
  }

  return (
    <div className="min-h-screen bg-[#06060a] text-white p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="text-center py-2">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Guitar Fretboard
          </h2>
          <p className="text-white/40 mt-1 text-sm">
            {lastPlayed ? `${lastPlayed.note}${lastPlayed.octave} • ${lastPlayed.freq.toFixed(1)}Hz` : 'Tap the fretboard to play'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1.5 justify-center bg-white/[0.03] rounded-xl p-2 border border-white/[0.06]">
          {[
            { id: 'notes', label: 'Notes', icon: Music },
            { id: 'scales', label: 'Scales', icon: Layers },
            { id: 'chords', label: 'Chords', icon: Grid3X3 },
            { id: 'arpeggios', label: 'Arpeggios', icon: Zap },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                mode === m.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <m.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.label.slice(0, 3)}</span>
            </button>
          ))}
        </div>

        {/* Root Note Selector */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-medium">
            {mode === 'notes' ? 'Select Note' : 'Root Note'}
          </label>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {NOTES.map((note, i) => (
              <button
                key={note}
                onClick={() => setRootNote(i)}
                className={`w-11 h-11 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                  rootNote === i
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/[0.08]'
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Position Navigation - Simple CAGED Navigation */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Left Arrow - Previous Position */}
            <button
              onClick={() => navigatePosition(-1)}
              disabled={showFullNeck}
              className={`w-14 h-14 rounded-full border flex items-center justify-center active:scale-95 transition-all touch-manipulation ${
                showFullNeck 
                  ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            
            {/* Current Position Display */}
            <div className="flex-1 max-w-[200px]">
              {showFullNeck ? (
                <div className="text-center py-3 px-4 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 shadow-lg">
                  <div className="text-white font-bold text-lg">Full Neck</div>
                  <div className="text-white/60 text-[10px] uppercase tracking-wider">
                    All 24 Frets
                  </div>
                </div>
              ) : (
                <div className={`text-center py-3 px-4 rounded-xl bg-gradient-to-r ${CAGED_SHAPES[cagedShape].color} shadow-lg transition-all duration-300`}>
                  <div className="text-white font-bold text-xl">{cagedShape}</div>
                  <div className="text-white/80 text-[11px] tracking-wide">
                    Frets {fretRange.start}–{fretRange.end}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Arrow - Next Position */}
            <button
              onClick={() => navigatePosition(1)}
              disabled={showFullNeck}
              className={`w-14 h-14 rounded-full border flex items-center justify-center active:scale-95 transition-all touch-manipulation ${
                showFullNeck 
                  ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>
          
          {/* CAGED Quick Select + Full Neck Toggle */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {CAGED_ORDER.map(shape => (
              <button
                key={shape}
                onClick={() => {
                  setCagedShape(shape);
                  setShowFullNeck(false);
                }}
                className={`w-11 h-11 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                  !showFullNeck && cagedShape === shape
                    ? `bg-gradient-to-br ${CAGED_SHAPES[shape].color} text-white shadow-lg scale-105`
                    : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/[0.06]'
                }`}
              >
                {shape}
              </button>
            ))}
            
            {/* Separator */}
            <div className="w-px h-8 bg-white/10 mx-1" />
            
            {/* Full Neck Toggle */}
            <button
              onClick={() => setShowFullNeck(!showFullNeck)}
              className={`px-3 h-11 rounded-lg text-xs font-bold transition-all touch-manipulation ${
                showFullNeck
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/[0.06]'
              }`}
            >
              ALL
            </button>
          </div>
        </div>

        {/* Fretboard */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06] overflow-hidden">
          {/* Position Context Banner */}
          {!showFullNeck && (
            <div className={`mb-3 py-2 px-4 rounded-lg bg-gradient-to-r ${CAGED_SHAPES[cagedShape].color} text-center transition-all duration-300`}>
              <span className="text-white/90 text-xs font-medium">
                {NOTES[rootNote]} {mode === 'scales' ? selectedScale : mode === 'chords' ? selectedChord : mode === 'arpeggios' ? selectedArpeggio : ''} • {cagedShape} Position
              </span>
            </div>
          )}
          
          {/* Fret Numbers */}
          <div className="flex mb-2 pl-8">
            {visibleFrets.map((fret) => (
              <React.Fragment key={fret}>
                <div 
                  className="flex-1 text-center text-[10px] text-white/40 font-mono"
                  style={{ minWidth: showFullNeck ? '28px' : '60px' }}
                >
                  {fret === 0 ? '' : fret}
                </div>
                {/* Nut spacer after 0 */}
                {fret === 0 && fretRange.showNut && (
                  <div className="w-3" />
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Strings */}
          <div className="relative bg-gradient-to-b from-amber-950/30 to-amber-900/20 rounded-xl overflow-hidden">
            {/* Fret markers background */}
            <div className="absolute inset-0 flex pl-8">
              {visibleFrets.map(fret => (
                <React.Fragment key={fret}>
                  <div 
                    className="flex-1 flex items-center justify-center relative"
                    style={{ minWidth: showFullNeck ? '28px' : '60px' }}
                  >
                    {fret > 0 && (
                      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-400/30 via-gray-300/40 to-gray-400/30" />
                    )}
                    {FRET_MARKERS.includes(fret) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {DOUBLE_DOT_FRETS.includes(fret) ? (
                          <div className="flex flex-col gap-6">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                          </div>
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                        )}
                      </div>
                    )}
                  </div>
                  {/* Nut spacer after fret 0 */}
                  {fret === 0 && fretRange.showNut && (
                    <div className="w-3" />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {STRING_TUNING.map((_, stringIndex) => (
              <div key={stringIndex} className="flex items-center h-12 relative">
                {/* String name */}
                <div className="w-8 text-center text-[10px] text-white/40 font-mono">
                  {STRING_NAMES[stringIndex]}
                </div>
                
                {/* String line */}
                <div 
                  className="absolute left-8 right-0 z-0"
                  style={{
                    height: `${1 + stringIndex * 0.5}px`,
                    background: `linear-gradient(90deg, rgba(212,175,55,0.8), rgba(180,150,40,0.6))`,
                  }}
                />
                
                {/* Fret buttons */}
                {visibleFrets.map((fret) => {
                  const key = `${stringIndex}-${fret}`;
                  const isActive = activeNotes.has(key);
                  const noteData = highlightedNotes.get(key);
                  const isHighlighted = !!noteData;
                  const isOpenString = fret === 0;
                  const showNutAfterOpen = isOpenString && fretRange.showNut;
                  
                  return (
                    <React.Fragment key={fret}>
                      <div 
                        className="flex-1 flex items-center justify-center relative z-10"
                        style={{ minWidth: showFullNeck ? '28px' : '60px' }}
                      >
                        <button
                          onClick={() => handleFretClick(stringIndex, fret)}
                          className={`rounded-full flex items-center justify-center font-bold transition-all duration-150 touch-manipulation ${
                            showFullNeck ? 'w-6 h-6 text-[8px]' : 'w-11 h-11 text-sm'
                          } ${
                            isActive
                              ? 'bg-white text-black scale-125 shadow-xl shadow-white/50'
                              : isHighlighted
                                ? `${getIntervalColor(noteData)} scale-100`
                                : 'bg-transparent text-transparent hover:bg-white/20 hover:text-white/60 hover:scale-110'
                          }`}
                        >
                          {(isHighlighted || isActive) && getNoteLabel(stringIndex, fret)}
                        </button>
                      </div>
                      {/* NUT - after open string position */}
                      {showNutAfterOpen && (
                        <div className="w-3 h-full flex items-center justify-center relative z-20">
                          <div className="w-[6px] h-full bg-gradient-to-b from-gray-100 via-white to-gray-200 shadow-lg shadow-black/30" 
                               style={{ borderRadius: '1px' }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Mode-specific Controls */}
        {mode === 'scales' && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-medium">
                Scale Type — {NOTES[rootNote]} {selectedScale}
              </label>
              <div className="flex flex-wrap gap-1.5 justify-center max-h-32 overflow-y-auto">
                {Object.keys(SCALES).map(scale => (
                  <button
                    key={scale}
                    onClick={() => setSelectedScale(scale)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium transition-all touch-manipulation ${
                      selectedScale === scale
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/[0.06]'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scale Degrees Info */}
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-[10px] text-white/50 text-center flex flex-wrap justify-center gap-1">
                {SCALES[selectedScale]?.map((interval, i) => {
                  const noteIdx = (rootNote + interval) % 12;
                  const degreeNames = ['1', 'b2', '2', 'b3', '3', '4', 'b5/♯4', '5', 'b6/♯5', '6', 'b7', '7'];
                  return (
                    <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded">
                      {NOTES[noteIdx]}
                      <span className="text-white/30 text-[9px] ml-0.5">({degreeNames[interval]})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mode === 'chords' && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-medium">
                Category
              </label>
              <div className="flex gap-1.5 justify-center flex-wrap">
                {CHORD_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chord Type */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-medium">
                Chord Type — {NOTES[rootNote]}{selectedChord}
              </label>
              <div className="flex flex-wrap gap-1.5 justify-center max-h-28 overflow-y-auto">
                {filteredChords.map(([chord]) => (
                  <button
                    key={chord}
                    onClick={() => setSelectedChord(chord)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                      selectedChord === chord
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/[0.06]'
                    }`}
                  >
                    {chord}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chord Tones Info */}
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-[10px] text-white/50 text-center">
                <span className="font-medium text-white/70">Chord Tones: </span>
                {CHORD_TYPES[selectedChord]?.intervals.map((interval, i) => {
                  const noteIdx = (rootNote + interval) % 12;
                  const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7', 'R', 'b9', '9', '#9'];
                  return (
                    <span key={i} className="mx-1">
                      {NOTES[noteIdx]}
                      <span className="text-white/30 text-[9px] ml-0.5">({intervalNames[interval] || interval})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mode === 'arpeggios' && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-medium">
                Arpeggio Type — {NOTES[rootNote]} {selectedArpeggio}
              </label>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {Object.keys(ARPEGGIOS).map(arp => (
                  <button
                    key={arp}
                    onClick={() => setSelectedArpeggio(arp)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium transition-all touch-manipulation ${
                      selectedArpeggio === arp
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/[0.06]'
                    }`}
                  >
                    {arp}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Arpeggio Notes Info */}
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-[10px] text-white/50 text-center">
                <span className="font-medium text-white/70">Arpeggio Tones: </span>
                {[...new Set(ARPEGGIOS[selectedArpeggio]?.intervals.map(i => i % 12))].map((interval, i) => {
                  const noteIdx = (rootNote + interval) % 12;
                  const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'];
                  return (
                    <span key={i} className="mx-1">
                      {NOTES[noteIdx]}
                      <span className="text-white/30 text-[9px] ml-0.5">({intervalNames[interval]})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Play Button */}
        {mode !== 'notes' && (
          <div className="flex justify-center">
            <button
              onClick={playPattern}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-white/10 text-white border-2 border-white/30'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/40 hover:shadow-amber-500/60 active:scale-95'
              }`}
            >
              <Play className={`w-8 h-8 ${isPlaying ? '' : 'ml-1'}`} fill={isPlaying ? 'none' : 'white'} />
            </button>
          </div>
        )}

        {/* Volume */}
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
          <Volume2 className="w-4 h-4 text-white/40" />
          <Slider
            value={[volume]}
            onValueChange={(v) => setVolume(v[0])}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-white/40 w-10 text-right font-mono">{volume}%</span>
        </div>
        
        {/* Position Map - Visual overview of all CAGED positions */}
        {!showFullNeck && (
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {CAGED_ORDER.map((shape, idx) => {
                const pos = cagedPositions[shape];
                const isActive = cagedShape === shape;
                return (
                  <button
                    key={shape}
                    onClick={() => setCagedShape(shape)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg transition-all touch-manipulation ${
                      isActive 
                        ? `bg-gradient-to-r ${CAGED_SHAPES[shape].color} shadow-lg scale-105` 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/50'}`}>
                      {shape}
                    </div>
                    <div className={`text-[9px] ${isActive ? 'text-white/80' : 'text-white/30'}`}>
                      {pos.startFret}–{pos.endFret}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}