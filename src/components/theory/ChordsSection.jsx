import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Accurate chord formulas (intervals from root)
const CHORD_TYPES = {
  // Triads
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Sus2': [0, 2, 7],
  'Sus4': [0, 5, 7],
  
  // Seventh Chords
  'Major 7': [0, 4, 7, 11],
  'Dominant 7': [0, 4, 7, 10],
  'Minor 7': [0, 3, 7, 10],
  'Minor Major 7': [0, 3, 7, 11],
  'Half Diminished 7 (m7♭5)': [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
  
  // Extended Chords
  'Major 9': [0, 4, 7, 11, 14],
  'Dominant 9': [0, 4, 7, 10, 14],
  'Minor 9': [0, 3, 7, 10, 14],
  'Add 9': [0, 4, 7, 14],
  'Minor Add 9': [0, 3, 7, 14],
  '6': [0, 4, 7, 9],
  'Minor 6': [0, 3, 7, 9],
  '6/9': [0, 4, 7, 9, 14],
  
  // Altered
  '7♭9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  '7♭5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10],
};

// Multiple guitar voicings for each common chord (EADGBE)
const GUITAR_VOICINGS = {
  'C Major': [
    { name: 'Open', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barrePos: null },
    { name: 'Barre 3rd', frets: [-1, 3, 5, 5, 5, 3], fingers: [0, 1, 3, 4, 4, 1], barrePos: 3 },
    { name: 'Barre 8th', frets: [8, 10, 10, 9, 8, 8], fingers: [1, 3, 4, 2, 1, 1], barrePos: 8 },
  ],
  'C Minor': [
    { name: 'Barre 3rd', frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barrePos: 3 },
    { name: 'Barre 8th', frets: [8, 10, 10, 8, 8, 8], fingers: [1, 3, 4, 1, 1, 1], barrePos: 8 },
  ],
  'D Major': [
    { name: 'Open', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], barrePos: null },
    { name: 'Barre 5th', frets: [-1, 5, 7, 7, 7, 5], fingers: [0, 1, 3, 4, 4, 1], barrePos: 5 },
    { name: 'Barre 10th', frets: [10, 12, 12, 11, 10, 10], fingers: [1, 3, 4, 2, 1, 1], barrePos: 10 },
  ],
  'D Minor': [
    { name: 'Open', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], barrePos: null },
    { name: 'Barre 5th', frets: [-1, 5, 7, 7, 6, 5], fingers: [0, 1, 3, 4, 2, 1], barrePos: 5 },
    { name: 'Barre 10th', frets: [10, 12, 12, 10, 10, 10], fingers: [1, 3, 4, 1, 1, 1], barrePos: 10 },
  ],
  'E Major': [
    { name: 'Open', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], barrePos: null },
    { name: 'Barre 7th', frets: [-1, 7, 9, 9, 9, 7], fingers: [0, 1, 3, 4, 4, 1], barrePos: 7 },
    { name: 'Barre 12th', frets: [0, 12, 14, 14, 13, 12], fingers: [0, 1, 3, 4, 2, 1], barrePos: 12 },
  ],
  'E Minor': [
    { name: 'Open', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 1, 2, 0, 0, 0], barrePos: null },
    { name: 'Barre 7th', frets: [-1, 7, 9, 9, 8, 7], fingers: [0, 1, 3, 4, 2, 1], barrePos: 7 },
    { name: 'Barre 12th', frets: [0, 12, 14, 14, 12, 12], fingers: [0, 1, 4, 3, 1, 1], barrePos: 12 },
  ],
  'F Major': [
    { name: 'Barre 1st', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barrePos: 1 },
    { name: 'Barre 8th', frets: [-1, 8, 10, 10, 10, 8], fingers: [0, 1, 3, 4, 4, 1], barrePos: 8 },
  ],
  'G Major': [
    { name: 'Open', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], barrePos: null },
    { name: 'Barre 3rd', frets: [3, 5, 5, 4, 3, 3], fingers: [1, 3, 4, 2, 1, 1], barrePos: 3 },
    { name: 'Barre 10th', frets: [-1, 10, 12, 12, 12, 10], fingers: [0, 1, 3, 4, 4, 1], barrePos: 10 },
  ],
  'G Minor': [
    { name: 'Barre 3rd', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barrePos: 3 },
    { name: 'Barre 10th', frets: [-1, 10, 12, 12, 11, 10], fingers: [0, 1, 3, 4, 2, 1], barrePos: 10 },
  ],
  'A Major': [
    { name: 'Open', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], barrePos: null },
    { name: 'Barre 5th', frets: [5, 7, 7, 6, 5, 5], fingers: [1, 3, 4, 2, 1, 1], barrePos: 5 },
    { name: 'Barre 12th', frets: [-1, 12, 14, 14, 14, 12], fingers: [0, 1, 3, 4, 4, 1], barrePos: 12 },
  ],
  'A Minor': [
    { name: 'Open', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], barrePos: null },
    { name: 'Barre 5th', frets: [5, 7, 7, 5, 5, 5], fingers: [1, 3, 4, 1, 1, 1], barrePos: 5 },
    { name: 'Barre 12th', frets: [-1, 12, 14, 14, 13, 12], fingers: [0, 1, 3, 4, 2, 1], barrePos: 12 },
  ],
  'B Major': [
    { name: 'Barre 2nd', frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 3, 4, 4, 1], barrePos: 2 },
    { name: 'Barre 7th', frets: [7, 9, 9, 8, 7, 7], fingers: [1, 3, 4, 2, 1, 1], barrePos: 7 },
  ],
  'B Minor': [
    { name: 'Barre 2nd', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barrePos: 2 },
    { name: 'Barre 7th', frets: [7, 9, 9, 7, 7, 7], fingers: [1, 3, 4, 1, 1, 1], barrePos: 7 },
  ],
};

const NOTES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
const SIMPLE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function ChordsSection() {
  const [rootNote, setRootNote] = useState('C');
  const [chordType, setChordType] = useState('Major');
  const [selectedVoicing, setSelectedVoicing] = useState(0);
  const audioContextRef = useRef(null);

  const getChordNotes = () => {
    const rootIndex = SIMPLE_NOTES.indexOf(rootNote);
    const intervals = CHORD_TYPES[chordType];
    return intervals.map(interval => {
      const noteIndex = (rootIndex + (interval % 12)) % 12;
      return NOTES[noteIndex];
    });
  };

  // Play realistic soft upright piano note
  const playPianoNote = (ctx, frequency, startTime, duration = 1.2) => {
    const velocity = 0.5;
    const sustainDuration = duration * 1.5;
    
    // Master compressor for warmth
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    
    // Body resonance filter
    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = 250;
    bodyResonance.Q.value = 2;
    bodyResonance.gain.value = 3;
    bodyResonance.connect(compressor);
    
    // Soft mellow lowpass
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2800 + (frequency / 440) * 800;
    warmth.Q.value = 0.7;
    warmth.connect(bodyResonance);
    
    // High shelf cut for soft felt-like tone
    const softness = ctx.createBiquadFilter();
    softness.type = 'highshelf';
    softness.frequency.value = 2500;
    softness.gain.value = -6;
    softness.connect(warmth);
    
    // Upright piano harmonics
    const harmonics = [
      { ratio: 1, gain: 1.0, detune: 0, decay: 1.0 },
      { ratio: 2, gain: 0.38, detune: 0.8, decay: 0.85 },
      { ratio: 3, gain: 0.18, detune: 2.2, decay: 0.7 },
      { ratio: 4, gain: 0.09, detune: 4.0, decay: 0.55 },
      { ratio: 5, gain: 0.04, detune: 6.5, decay: 0.4 },
      { ratio: 6, gain: 0.02, detune: 9.5, decay: 0.3 },
    ];
    
    const detuneSpread = 1.5;
    
    harmonics.forEach((h, idx) => {
      [-1, 1].forEach(side => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        const panner = ctx.createStereoPanner();
        panner.pan.value = side * 0.15 * (idx / harmonics.length);
        
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(softness);
        
        osc.frequency.value = frequency * h.ratio;
        osc.detune.value = h.detune + (side * detuneSpread * h.ratio * 0.3);
        osc.type = 'sine';
        
        const harmonicDecay = sustainDuration * h.decay;
        const level = h.gain * velocity * 0.08;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(level, startTime + 0.012);
        gain.gain.setTargetAtTime(level * 0.7, startTime + 0.02, 0.08);
        gain.gain.setTargetAtTime(level * 0.4, startTime + 0.15, 0.2);
        gain.gain.setTargetAtTime(0.0001, startTime + harmonicDecay * 0.4, harmonicDecay * 0.3);
        
        osc.start(startTime);
        osc.stop(startTime + sustainDuration + 0.5);
      });
    });
    
    // Soft felt hammer thump
    const thumpLength = 0.018;
    const thumpBuffer = ctx.createBuffer(1, ctx.sampleRate * thumpLength, ctx.sampleRate);
    const thumpData = thumpBuffer.getChannelData(0);
    for (let i = 0; i < thumpData.length; i++) {
      const t = i / thumpData.length;
      const env = Math.exp(-t * 8) * (1 - t);
      thumpData[i] = (Math.random() * 2 - 1) * env * 0.25;
    }
    
    const thumpSource = ctx.createBufferSource();
    thumpSource.buffer = thumpBuffer;
    
    const thumpFilter = ctx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.value = Math.min(frequency * 2.5, 3000);
    thumpFilter.Q.value = 1;
    
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(velocity * 0.06, startTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + thumpLength);
    
    thumpSource.connect(thumpFilter);
    thumpFilter.connect(thumpGain);
    thumpGain.connect(softness);
    thumpSource.start(startTime);
    
    // Soundboard resonance
    const soundboard = ctx.createOscillator();
    const sbGain = ctx.createGain();
    const sbFilter = ctx.createBiquadFilter();
    
    soundboard.frequency.value = frequency * 0.5;
    soundboard.type = 'sine';
    
    sbFilter.type = 'lowpass';
    sbFilter.frequency.value = 400;
    sbFilter.Q.value = 3;
    
    soundboard.connect(sbFilter);
    sbFilter.connect(sbGain);
    sbGain.connect(bodyResonance);
    
    sbGain.gain.setValueAtTime(0, startTime);
    sbGain.gain.linearRampToValueAtTime(velocity * 0.012, startTime + 0.1);
    sbGain.gain.setTargetAtTime(0.0001, startTime + sustainDuration * 0.3, sustainDuration * 0.25);
    
    soundboard.start(startTime);
    soundboard.stop(startTime + sustainDuration + 0.5);
  };

  const playChord = () => {
    const rootIndex = SIMPLE_NOTES.indexOf(rootNote);
    const intervals = CHORD_TYPES[chordType];
    
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    intervals.forEach((interval, idx) => {
      const noteIndex = (rootIndex + interval) % 12;
      const octave = Math.floor(interval / 12) + 4;
      const frequency = 440 * Math.pow(2, ((noteIndex - 9) / 12) + (octave - 4));
      
      // Slight strum effect - each note slightly delayed
      playPianoNote(ctx, frequency, now + idx * 0.03, 1.5);
    });
  };

  const chordNotes = getChordNotes();
  const displayChordName = `${rootNote} ${chordType}`;
  const voicingKey = `${rootNote} ${chordType}`;
  const voicings = GUITAR_VOICINGS[voicingKey] || [];
  const currentVoicing = voicings[selectedVoicing];

  // Generate TAB notation from current voicing
  const generateTab = () => {
    if (!currentVoicing) return null;
    const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
    return currentVoicing.frets.map((fret, idx) => ({
      string: strings[idx],
      fret: fret === -1 ? 'x' : fret
    }));
  };

  const tabNotation = generateTab();

  // Calculate minimum fret for diagram positioning
  const getMinFret = (frets) => {
    const playedFrets = frets.filter(f => f > 0);
    return playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
  };

  const minFret = currentVoicing ? getMinFret(currentVoicing.frets) : 0;
  const startFret = minFret > 1 ? minFret : 0;

  return (
    <div className="space-y-8">
      {/* Chord Selector */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chord Builder</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Root Note</label>
            <Select value={rootNote} onValueChange={setRootNote}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMPLE_NOTES.map(note => (
                  <SelectItem key={note} value={note}>{NOTES[SIMPLE_NOTES.indexOf(note)]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Chord Type</label>
            <Select value={chordType} onValueChange={setChordType}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CHORD_TYPES).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={playChord}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-bold"
            >
              <Play className="w-5 h-5 mr-2" />
              Play Chord
            </Button>
          </div>
        </div>
      </div>

      {/* Chord Notes Display */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{displayChordName}</h2>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          {chordNotes.map((note, idx) => (
            <div
              key={idx}
              className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg transition-all ${
                idx === 0
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white scale-110'
                  : 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-900'
              }`}
            >
              {note}
            </div>
          ))}
        </div>
        
        {/* Interval Names */}
        <div className="flex flex-wrap gap-2 justify-center">
          {CHORD_TYPES[chordType].map((interval, idx) => {
            const intervalNames = {
              0: 'Root', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4',
              6: 'Tritone', 7: 'P5', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7',
              12: 'R', 13: 'm9', 14: 'M9', 15: '#9', 17: 'P11', 21: 'M13'
            };
            return (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
              >
                {intervalNames[interval] || interval}
              </span>
            );
          })}
        </div>
      </div>

      {/* Piano Roll Visualization */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Piano Keyboard</h2>
        <div className="overflow-x-auto">
          <div className="inline-flex rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-300 mx-auto">
            {[...Array(2)].map((_, octaveIdx) => (
              <React.Fragment key={octaveIdx}>
                {NOTES.map((note, index) => {
                  const isBlackKey = note.includes('♯') || note.includes('♭');
                  const simpleName = SIMPLE_NOTES[index];
                  const isInChord = chordNotes.some(n => n.includes(simpleName) || n.startsWith(simpleName));
                  const isRoot = chordNotes[0]?.includes(simpleName) || chordNotes[0]?.startsWith(simpleName);
                  
                  return (
                    <div
                      key={`${octaveIdx}-${index}`}
                      className={`relative ${isBlackKey ? '-mx-3 z-10' : 'z-0'}`}
                      style={{ marginLeft: isBlackKey && index > 0 ? '-12px' : '0' }}
                    >
                      <div
                        className={`flex flex-col items-center justify-end transition-all ${
                          isBlackKey
                            ? 'w-12 h-32 bg-gradient-to-b from-gray-800 to-gray-900'
                            : 'w-16 h-48 bg-white border-r border-gray-300'
                        } ${
                          isInChord && !isBlackKey ? 'bg-gradient-to-b from-blue-50 to-purple-50' : ''
                        } ${
                          isInChord && isBlackKey ? 'bg-gradient-to-b from-purple-700 to-purple-900' : ''
                        }`}
                      >
                        {isInChord && (
                          <div className={`mb-2 ${isBlackKey ? 'text-white' : 'text-gray-900'}`}>
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isRoot
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                  : isBlackKey
                                  ? 'bg-white text-gray-900'
                                  : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                              }`}
                            >
                              {isRoot ? 'R' : '●'}
                            </div>
                          </div>
                        )}
                        <span
                          className={`text-xs font-semibold mb-2 ${
                            isBlackKey ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          {note.split('/')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Guitar Chord Diagrams */}
      {voicings.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Guitar Chord Diagrams</h2>
          
          {/* Voicing Selector */}
          <div className="flex gap-2 mb-8 justify-center flex-wrap">
            {voicings.map((voicing, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedVoicing(idx)}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all ${
                  selectedVoicing === idx
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {voicing.name}
              </button>
            ))}
          </div>

          {currentVoicing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Enhanced Chord Diagram */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
                <h3 className="font-bold text-gray-900 mb-2 text-center text-xl">{currentVoicing.name} Position</h3>
                {startFret > 1 && (
                  <p className="text-center text-sm text-purple-600 font-semibold mb-6">
                    Fret {startFret}
                  </p>
                )}
                
                <div className="flex justify-center">
                  <div className="relative inline-block" style={{ width: '280px' }}>
                    {/* Nut (top thick line) - only show if starting at fret 0 */}
                    {startFret === 0 && (
                      <div className="absolute w-full h-2 bg-gray-900 rounded-sm" style={{ top: '-2px', left: 0 }} />
                    )}
                    
                    {/* Fret number indicator on left */}
                    {startFret > 1 && (
                      <div className="absolute -left-10 top-8 text-xl font-bold text-gray-700">
                        {startFret}
                      </div>
                    )}
                    
                    {/* Fretboard Grid */}
                    <div className="relative">
                      {/* Frets (horizontal lines) */}
                      {Array.from({ length: 6 }).map((_, fretIdx) => (
                        <div key={fretIdx} className="h-14" style={{ position: 'relative' }}>
                          <div className="w-full border-t-2 border-gray-400" style={{ position: 'absolute', top: 0 }} />
                        </div>
                      ))}
                      
                      {/* Strings (vertical lines) */}
                      {Array.from({ length: 6 }).map((_, stringIdx) => (
                        <div
                          key={stringIdx}
                          className="absolute bg-gray-600"
                          style={{ 
                            left: `${stringIdx * 44 + 6}px`, 
                            top: 0,
                            width: `${3 - stringIdx * 0.3}px`,
                            height: '336px'
                          }}
                        />
                      ))}
                      
                      {/* Barre indicator bar */}
                      {currentVoicing.barrePos && (
                        <div 
                          className="absolute w-full h-9 bg-gradient-to-r from-purple-300 via-purple-400 to-purple-300 rounded-full opacity-30"
                          style={{ 
                            left: 0,
                            right: 0,
                            top: `${((currentVoicing.barrePos - startFret) * 56) + 24}px`,
                            zIndex: 5
                          }}
                        />
                      )}
                      
                      {/* Finger positions with fret numbers */}
                      {currentVoicing.frets.map((fret, stringIdx) => {
                        if (fret === -1) {
                          // Muted string
                          return (
                            <div
                              key={stringIdx}
                              className="absolute text-red-600 font-black text-3xl"
                              style={{ 
                                left: `${stringIdx * 44}px`, 
                                top: '-42px',
                                zIndex: 20
                              }}
                            >
                              ✕
                            </div>
                          );
                        }
                        if (fret === 0) {
                          // Open string
                          return (
                            <div
                              key={stringIdx}
                              className="absolute w-8 h-8 border-4 border-gray-900 rounded-full bg-white shadow-md"
                              style={{ 
                                left: `${stringIdx * 44 - 10}px`, 
                                top: '-40px',
                                zIndex: 20
                              }}
                            />
                          );
                        }
                        // Fretted note with fret number - normalize position relative to startFret
                        const normalizedFret = fret - startFret;
                        
                        return (
                          <div
                            key={stringIdx}
                            className="absolute"
                            style={{
                              left: `${stringIdx * 44 - 18}px`,
                              top: `${normalizedFret * 56 - 18}px`,
                              zIndex: 15
                            }}
                          >
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full border-4 border-purple-800 flex items-center justify-center shadow-xl">
                                <span className="text-white text-xl font-black">{fret}</span>
                              </div>
                              {/* Finger number below */}
                              {currentVoicing.fingers && currentVoicing.fingers[stringIdx] > 0 && (
                                <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {currentVoicing.fingers[stringIdx]}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* String names at bottom */}
                      <div className="absolute w-full" style={{ top: '352px' }}>
                        {['E', 'A', 'D', 'G', 'B', 'e'].map((name, idx) => (
                          <div
                            key={idx}
                            className="absolute text-base font-black text-gray-700"
                            style={{ left: `${idx * 44 - 2}px` }}
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-8 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-3 border-gray-900 rounded-full bg-white" />
                    <span className="text-gray-600">Open String</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold text-xl">✕</span>
                    <span className="text-gray-600">Muted String</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span className="text-gray-600">Finger Number</span>
                  </div>
                </div>
              </div>

              {/* TAB Notation */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
                <h3 className="font-bold text-gray-900 mb-6 text-center text-lg">TAB Notation</h3>
                <div className="bg-white rounded-xl p-6 font-mono text-sm">
                  {tabNotation && tabNotation.map((line, idx) => (
                    <div key={idx} className="flex items-center mb-2">
                      <span className="text-gray-600 w-8 font-bold">{line.string}|</span>
                      <span className="text-2xl font-bold text-purple-900">
                        {line.fret === 'x' ? '--x--' : `--${line.fret}--`}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Fingering suggestion */}
                <div className="mt-6 bg-purple-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">💡 Playing Tips:</p>
                  <ul className="text-sm text-purple-800 space-y-1">
                    {currentVoicing.barrePos ? (
                      <>
                        <li>• Use index finger (1) for barre at fret {currentVoicing.barrePos}</li>
                        <li>• Apply even pressure across all barred strings</li>
                        <li>• Angle your wrist slightly for better reach</li>
                      </>
                    ) : (
                      <>
                        <li>• Curve your fingers for clean notes</li>
                        <li>• Press just behind the fret for best tone</li>
                        <li>• Strum only the indicated strings</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Fretboard View */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chord Tones on Fretboard</h2>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Fret markers */}
            <div className="flex mb-2 pl-16">
              {[...Array(13)].map((_, fret) => (
                <div
                  key={fret}
                  className="flex-shrink-0 w-20 text-center text-sm font-semibold text-gray-600"
                >
                  {fret}
                </div>
              ))}
            </div>

            {/* Strings */}
            {['E', 'A', 'D', 'G', 'B', 'E'].map((stringName, stringIdx) => (
              <div key={stringIdx} className="flex items-center mb-1">
                <div className="w-16 text-right pr-4 font-bold text-gray-700">
                  {6 - stringIdx}:{stringName}
                </div>

                <div className="flex flex-1 items-center">
                  {[...Array(13)].map((_, fret) => {
                    const baseNotes = [4, 9, 2, 7, 11, 4]; // EADGBE in semitones from C
                    const noteIndex = (baseNotes[stringIdx] + fret) % 12;
                    const noteName = SIMPLE_NOTES[noteIndex];
                    const fullNoteName = NOTES[noteIndex];
                    const isInChord = chordNotes.some(n => n.includes(noteName) || n.startsWith(noteName));
                    const isRoot = chordNotes[0]?.includes(noteName) || chordNotes[0]?.startsWith(noteName);

                    return (
                      <div
                        key={fret}
                        className="relative flex-shrink-0 w-20 h-12 flex items-center justify-center"
                        style={{
                          borderLeft: fret === 0 ? '4px solid #1f2937' : '2px solid #d1d5db',
                          borderRight: fret === 12 ? '2px solid #d1d5db' : 'none',
                        }}
                      >
                        {/* String line */}
                        <div
                          className="absolute w-full bg-gray-400"
                          style={{ height: `${3 - stringIdx * 0.3}px`, top: '50%', transform: 'translateY(-50%)' }}
                        />


                        {/* Fret markers */}
                        {[3, 5, 7, 9].includes(fret) && stringIdx === 3 && (
                          <div className="absolute w-3 h-3 bg-gray-300 rounded-full" style={{ top: '-20px' }} />
                        )}
                        {fret === 12 && [1, 4].includes(stringIdx) && (
                          <div className="absolute w-3 h-3 bg-gray-300 rounded-full" 
                            style={{ top: stringIdx === 1 ? '-20px' : '32px' }} 
                          />
                        )}

                        {/* Note dots for chord tones */}
                        {isInChord && (
                          <div
                            className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all hover:scale-110 ${
                              isRoot
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                                : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            }`}
                          >
                            {fullNoteName.split('/')[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Music Theory Info */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-2 border-purple-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chord Theory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-bold text-purple-900 mb-4">Chord Formula</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {CHORD_TYPES[chordType].map((interval, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-purple-100 text-purple-900 rounded-xl text-sm font-bold"
                >
                  {interval}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600">Semitones from root note</p>
          </div>

          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-bold text-purple-900 mb-4">Chord Information</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                <strong>Notes:</strong> {chordNotes.join(', ')}
              </p>
              <p className="text-gray-700">
                <strong>Number of notes:</strong> {chordNotes.length}
              </p>
              <p className="text-gray-700">
                <strong>Voicings available:</strong> {voicings.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}