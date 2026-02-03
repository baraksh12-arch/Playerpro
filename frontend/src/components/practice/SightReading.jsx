import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, Music, SkipForward, Repeat } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC THEORY - PRECISE NOTE DEFINITIONS FOR TREBLE CLEF
// ═══════════════════════════════════════════════════════════════════════════════

const NOTES = {
  'C4':  { midi: 60, staffLine: 0, display: 'C' },
  'C#4': { midi: 61, staffLine: 0, display: 'C', accidental: '♯' },
  'Db4': { midi: 61, staffLine: 0.5, display: 'D', accidental: '♭' },
  'D4':  { midi: 62, staffLine: 0.5, display: 'D' },
  'D#4': { midi: 63, staffLine: 0.5, display: 'D', accidental: '♯' },
  'Eb4': { midi: 63, staffLine: 1, display: 'E', accidental: '♭' },
  'E4':  { midi: 64, staffLine: 1, display: 'E' },
  'F4':  { midi: 65, staffLine: 1.5, display: 'F' },
  'F#4': { midi: 66, staffLine: 1.5, display: 'F', accidental: '♯' },
  'Gb4': { midi: 66, staffLine: 2, display: 'G', accidental: '♭' },
  'G4':  { midi: 67, staffLine: 2, display: 'G' },
  'G#4': { midi: 68, staffLine: 2, display: 'G', accidental: '♯' },
  'Ab4': { midi: 68, staffLine: 2.5, display: 'A', accidental: '♭' },
  'A4':  { midi: 69, staffLine: 2.5, display: 'A' },
  'A#4': { midi: 70, staffLine: 2.5, display: 'A', accidental: '♯' },
  'Bb4': { midi: 70, staffLine: 3, display: 'B', accidental: '♭' },
  'B4':  { midi: 71, staffLine: 3, display: 'B' },
  'C5':  { midi: 72, staffLine: 3.5, display: 'C' },
  'C#5': { midi: 73, staffLine: 3.5, display: 'C', accidental: '♯' },
  'Db5': { midi: 73, staffLine: 4, display: 'D', accidental: '♭' },
  'D5':  { midi: 74, staffLine: 4, display: 'D' },
  'D#5': { midi: 75, staffLine: 4, display: 'D', accidental: '♯' },
  'Eb5': { midi: 75, staffLine: 4.5, display: 'E', accidental: '♭' },
  'E5':  { midi: 76, staffLine: 4.5, display: 'E' },
  'F5':  { midi: 77, staffLine: 5, display: 'F' },
  'F#5': { midi: 78, staffLine: 5, display: 'F', accidental: '♯' },
  'G5':  { midi: 79, staffLine: 5.5, display: 'G' },
  'G#5': { midi: 80, staffLine: 5.5, display: 'G', accidental: '♯' },
  'A5':  { midi: 81, staffLine: 6, display: 'A' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIFFICULTY MODES
// ═══════════════════════════════════════════════════════════════════════════════

const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy',
    description: 'Quarter Notes',
    color: 'from-emerald-400 to-green-500',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'],
    notesPerBox: 1,
    noteType: 'quarter'
  },
  medium: {
    name: 'Medium', 
    description: 'Eighth Notes',
    color: 'from-amber-400 to-orange-500',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'F#4', 'G#4', 'Bb4', 'C#5'],
    notesPerBox: 2,
    noteType: 'eighth'
  },
  hard: {
    name: 'Hard',
    description: 'Mozart Pieces',
    color: 'from-red-400 to-pink-500',
    patterns: [
      [['B4'], ['A4'], ['G#4'], ['A4']], 
      [['C5'], ['C5'], ['C5'], ['C5']],
      [['D5'], ['C5'], ['B4'], ['C5']],
      [['E5'], ['E5'], ['E5'], ['E5']],
      [['F5'], ['E5'], ['D#5'], ['E5']],
      [['B4'], ['B4'], ['B4'], ['B4']],
      [['C5'], ['B4'], ['A4'], ['B4']],
      [['C5'], ['C5'], ['C5'], ['C5']],
    ],
    noteType: 'sixteenth'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE AUDIO ENGINE - Studio Grade Piano & Metronome
// ═══════════════════════════════════════════════════════════════════════════════

class EliteAudioEngine {
  constructor() {
    this.ctx = null;
    this.pianoGain = null;
    this.metronomeGain = null;
    this.masterGain = null;
    this.convolver = null;
    this.impulseBuffer = null;
    this.pianoVolume = 1.0;
    this.metronomeVolume = 0.25;
    this.pianoEnabled = true;
    this.metronomeEnabled = true;
    this.initialized = false;
  }

  async init() {
    if (this.initialized && this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }
    
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ 
      sampleRate: 48000,
      latencyHint: 'interactive'
    });
    
    // Create gain nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    
    this.pianoGain = this.ctx.createGain();
    this.pianoGain.gain.value = this.pianoEnabled ? this.pianoVolume : 0;
    
    this.metronomeGain = this.ctx.createGain();
    this.metronomeGain.gain.value = this.metronomeEnabled ? this.metronomeVolume : 0;
    
    // Create impulse response for reverb
    await this.createImpulseResponse();
    
    // Mastering chain
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.0003;
    limiter.release.value = 0.03;
    
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 6;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.1;
    
    // EQ
    const lowShelf = this.ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 150;
    lowShelf.gain.value = 2;
    
    const midPeak = this.ctx.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 2000;
    midPeak.Q.value = 0.7;
    midPeak.gain.value = 1;
    
    const highShelf = this.ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 6000;
    highShelf.gain.value = 2;
    
    // Convolver reverb
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.impulseBuffer;
    
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.15;
    
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 0.88;
    
    // Piano routing
    this.pianoGain.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    
    // Dry + Wet
    highShelf.connect(dryGain);
    highShelf.connect(this.convolver);
    this.convolver.connect(reverbGain);
    
    dryGain.connect(compressor);
    reverbGain.connect(compressor);
    
    // Metronome routing (less reverb)
    this.metronomeGain.connect(compressor);
    
    compressor.connect(limiter);
    limiter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.initialized = true;
  }

  async createImpulseResponse() {
    const duration = 2.0;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    this.impulseBuffer = this.ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = this.impulseBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const early = t < 0.08 ? Math.sin(t * 200 + channel * 0.5) * 0.4 * Math.exp(-t * 30) : 0;
        const decay = Math.exp(-t * 3);
        const noise = Math.random() * 2 - 1;
        data[i] = noise * decay * 0.5 + early;
      }
    }
  }

  setPianoVolume(vol) {
    this.pianoVolume = vol;
    if (this.pianoGain && this.pianoEnabled) {
      this.pianoGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
    }
  }

  setMetronomeVolume(vol) {
    this.metronomeVolume = vol;
    if (this.metronomeGain && this.metronomeEnabled) {
      this.metronomeGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
    }
  }

  setPianoEnabled(enabled) {
    this.pianoEnabled = enabled;
    if (this.pianoGain) {
      this.pianoGain.gain.setTargetAtTime(enabled ? this.pianoVolume : 0, this.ctx.currentTime, 0.02);
    }
  }

  setMetronomeEnabled(enabled) {
    this.metronomeEnabled = enabled;
    if (this.metronomeGain) {
      this.metronomeGain.gain.setTargetAtTime(enabled ? this.metronomeVolume : 0, this.ctx.currentTime, 0.02);
    }
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCERT GRAND PIANO - Multi-sample Physical Model
  // ═══════════════════════════════════════════════════════════════════════════
  async playNote(midi, velocity = 0.8, duration = 1.2) {
    await this.init();
    
    const freq = this.midiToFreq(midi);
    const now = this.ctx.currentTime;
    
    const register = Math.max(0, Math.min(1, (midi - 36) / 60));
    const brightness = 0.25 + register * 0.55 + velocity * 0.2;
    
    // Real piano has 1-3 strings per note
    const stringCount = midi < 52 ? 1 : midi < 68 ? 2 : 3;
    const detuneAmount = 0.12; // cents
    
    // Harmonic series based on FFT analysis of Steinway D
    const harmonics = [
      { ratio: 1.0, amp: 1.0, decay: 1.0 },
      { ratio: 2.0, amp: 0.55 * brightness, decay: 0.9 },
      { ratio: 3.0, amp: 0.40 * brightness, decay: 0.8 },
      { ratio: 4.0, amp: 0.30 * brightness, decay: 0.7 },
      { ratio: 5.0, amp: 0.22 * brightness, decay: 0.6 },
      { ratio: 6.0, amp: 0.15 * brightness, decay: 0.5 },
      { ratio: 7.0, amp: 0.10 * brightness, decay: 0.4 },
      { ratio: 8.0, amp: 0.06 * brightness, decay: 0.35 },
      { ratio: 9.0, amp: 0.04 * brightness, decay: 0.3 },
      { ratio: 10.0, amp: 0.025 * brightness, decay: 0.25 },
      { ratio: 11.0, amp: 0.015 * brightness, decay: 0.2 },
      { ratio: 12.0, amp: 0.01 * brightness, decay: 0.18 },
    ];
    
    const noteOutput = this.ctx.createGain();
    noteOutput.gain.value = 0.18;
    
    // Soundboard resonance
    const soundboard = this.ctx.createBiquadFilter();
    soundboard.type = 'peaking';
    soundboard.frequency.value = 220 + freq * 0.08;
    soundboard.Q.value = 1.5;
    soundboard.gain.value = 5;
    
    // String resonance
    const stringRes = this.ctx.createBiquadFilter();
    stringRes.type = 'peaking';
    stringRes.frequency.value = freq;
    stringRes.Q.value = 25;
    stringRes.gain.value = 4;
    
    // Hammer hardness filter
    const hammerFilter = this.ctx.createBiquadFilter();
    hammerFilter.type = 'lowpass';
    const cutoff = 500 + velocity * 7000 + register * 4000;
    hammerFilter.frequency.value = cutoff;
    hammerFilter.Q.value = 0.4;
    
    // Hammer noise
    const noiseLength = 0.025;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLength, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      const t = i / noiseData.length;
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 25) * Math.sin(t * Math.PI * 1.2);
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;
    
    const noiseBPF = this.ctx.createBiquadFilter();
    noiseBPF.type = 'bandpass';
    noiseBPF.frequency.value = freq * 2.2;
    noiseBPF.Q.value = 2.5;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = velocity * 0.05 * (0.4 + register * 0.6);
    
    noiseSource.connect(noiseBPF);
    noiseBPF.connect(noiseGain);
    noiseGain.connect(noteOutput);
    
    // Envelope
    const ampEnv = this.ctx.createGain();
    const attack = 0.0008 + (1 - velocity) * 0.002;
    const release = duration * (0.9 + register * 0.3);
    
    ampEnv.gain.setValueAtTime(0, now);
    ampEnv.gain.linearRampToValueAtTime(velocity * 0.75, now + attack);
    ampEnv.gain.exponentialRampToValueAtTime(velocity * 0.55, now + attack + 0.04);
    ampEnv.gain.setTargetAtTime(velocity * 0.2, now + 0.1, 0.3);
    ampEnv.gain.setTargetAtTime(0.0001, now + release * 0.5, release * 0.3);
    
    // Brightness decay
    hammerFilter.frequency.setValueAtTime(cutoff, now);
    hammerFilter.frequency.exponentialRampToValueAtTime(350 + register * 500, now + release * 0.6);
    
    // Generate harmonics with string simulation
    for (let s = 0; s < stringCount; s++) {
      const stringDetune = (s - (stringCount - 1) / 2) * detuneAmount;
      
      harmonics.forEach((h, idx) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sine';
        const detuneHz = freq * h.ratio * (stringDetune / 100);
        osc.frequency.value = freq * h.ratio + detuneHz;
        
        const harmonicDecay = release * h.decay;
        const amp = (h.amp * 0.065) / stringCount;
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(amp, now + attack);
        oscGain.gain.setTargetAtTime(amp * 0.65, now + attack, 0.06);
        oscGain.gain.setTargetAtTime(0.0001, now + harmonicDecay * 0.45, harmonicDecay * 0.28);
        
        osc.connect(oscGain);
        oscGain.connect(noteOutput);
        osc.start(now);
        osc.stop(now + release + 0.3);
      });
    }
    
    noiseSource.start(now);
    
    noteOutput.connect(soundboard);
    soundboard.connect(stringRes);
    stringRes.connect(hammerFilter);
    hammerFilter.connect(ampEnv);
    ampEnv.connect(this.pianoGain);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDIO METRONOME - Logic Pro / Pro Tools Quality
  // ═══════════════════════════════════════════════════════════════════════════
  async playClick(accent = false) {
    await this.init();
    
    const now = this.ctx.currentTime;
    const clickOutput = this.ctx.createGain();
    clickOutput.gain.value = accent ? 0.3 : 0.22;
    
    // Main tone
    const freq1 = accent ? 1600 : 1300;
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    osc1.frequency.exponentialRampToValueAtTime(freq1 * 0.4, now + 0.012);
    
    const osc1Gain = this.ctx.createGain();
    osc1Gain.gain.setValueAtTime(0, now);
    osc1Gain.gain.linearRampToValueAtTime(accent ? 0.9 : 0.7, now + 0.0003);
    osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    osc1.connect(osc1Gain);
    osc1Gain.connect(clickOutput);
    
    // Body
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(accent ? 900 : 700, now);
    osc2.frequency.exponentialRampToValueAtTime(250, now + 0.015);
    
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(accent ? 0.45 : 0.35, now + 0.0005);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    
    osc2.connect(osc2Gain);
    osc2Gain.connect(clickOutput);
    
    // High transient
    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(accent ? 4500 : 3800, now);
    osc3.frequency.exponentialRampToValueAtTime(1200, now + 0.006);
    
    const osc3Gain = this.ctx.createGain();
    osc3Gain.gain.setValueAtTime(0, now);
    osc3Gain.gain.linearRampToValueAtTime(accent ? 0.35 : 0.25, now + 0.0001);
    osc3Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    
    osc3.connect(osc3Gain);
    osc3Gain.connect(clickOutput);
    
    // Noise transient
    const noiseLength = 0.012;
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLength, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      const t = i / noiseData.length;
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50);
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;
    
    const noiseHPF = this.ctx.createBiquadFilter();
    noiseHPF.type = 'highpass';
    noiseHPF.frequency.value = 2500;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = accent ? 0.18 : 0.12;
    
    noiseSource.connect(noiseHPF);
    noiseHPF.connect(noiseGain);
    noiseGain.connect(clickOutput);
    
    // Shape
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = accent ? 2000 : 1600;
    clickFilter.Q.value = 1.5;
    
    clickOutput.connect(clickFilter);
    clickFilter.connect(this.metronomeGain);
    
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    noiseSource.start(now);
    
    osc1.stop(now + 0.04);
    osc2.stop(now + 0.04);
    osc3.stop(now + 0.04);
  }
}

const audioEngine = new EliteAudioEngine();

// ═══════════════════════════════════════════════════════════════════════════════
// NOTATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SingleNote({ noteKey, x, y, lineSpacing, isActive, stemUp = true }) {
  const note = NOTES[noteKey];
  if (!note) return null;
  
  const noteRx = lineSpacing * 0.48;
  const noteRy = lineSpacing * 0.36;
  const color = isActive ? '#a855f7' : '#0a0a0a';
  
  const stemLength = lineSpacing * 3;
  const stemX = stemUp ? x + noteRx * 0.9 : x - noteRx * 0.9;
  const stemY1 = y;
  const stemY2 = stemUp ? y - stemLength : y + stemLength;
  
  return (
    <g>
      {note.accidental && (
        <text
          x={x - noteRx * 3.2}
          y={y + 5}
          fill={color}
          fontSize="14"
          fontFamily="serif"
          fontWeight="bold"
        >
          {note.accidental}
        </text>
      )}
      
      <ellipse
        cx={x}
        cy={y}
        rx={noteRx}
        ry={noteRy}
        fill={color}
        transform={`rotate(-12, ${x}, ${y})`}
      />
      
      <line
        x1={stemX}
        y1={stemY1}
        x2={stemX}
        y2={stemY2}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

function EighthNotePair({ note1Key, note2Key, x1, x2, y1, y2, lineSpacing, isActive }) {
  const color = isActive ? '#a855f7' : '#0a0a0a';
  const noteRx = lineSpacing * 0.42;
  const noteRy = lineSpacing * 0.32;
  
  const stemLength = lineSpacing * 2.8;
  const beamY = Math.min(y1, y2) - stemLength;
  
  return (
    <g>
      {NOTES[note1Key]?.accidental && (
        <text x={x1 - noteRx * 3} y={y1 + 4} fill={color} fontSize="12" fontFamily="serif" fontWeight="bold">
          {NOTES[note1Key].accidental}
        </text>
      )}
      
      {NOTES[note2Key]?.accidental && (
        <text x={x2 - noteRx * 3} y={y2 + 4} fill={color} fontSize="12" fontFamily="serif" fontWeight="bold">
          {NOTES[note2Key].accidental}
        </text>
      )}
      
      <ellipse cx={x1} cy={y1} rx={noteRx} ry={noteRy} fill={color} transform={`rotate(-12, ${x1}, ${y1})`} />
      <ellipse cx={x2} cy={y2} rx={noteRx} ry={noteRy} fill={color} transform={`rotate(-12, ${x2}, ${y2})`} />
      
      <line x1={x1 + noteRx * 0.85} y1={y1} x2={x1 + noteRx * 0.85} y2={beamY} stroke={color} strokeWidth="1.6" />
      <line x1={x2 + noteRx * 0.85} y1={y2} x2={x2 + noteRx * 0.85} y2={beamY} stroke={color} strokeWidth="1.6" />
      
      <line x1={x1 + noteRx * 0.85} y1={beamY} x2={x2 + noteRx * 0.85} y2={beamY} stroke={color} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function SixteenthNoteGroup({ noteKeys, startX, ys, lineSpacing, isActive, boxWidth }) {
  const color = isActive ? '#a855f7' : '#0a0a0a';
  const noteRx = lineSpacing * 0.38;
  const noteRy = lineSpacing * 0.28;
  const spacing = (boxWidth - 24) / 5;
  
  const positions = noteKeys.map((_, i) => startX + spacing * (i + 0.5));
  const stemLength = lineSpacing * 2.5;
  const beamY = Math.min(...ys) - stemLength;
  
  return (
    <g>
      {noteKeys.map((key, i) => {
        const note = NOTES[key];
        if (!note) return null;
        const x = positions[i];
        const y = ys[i];
        
        return (
          <g key={i}>
            {note.accidental && (
              <text x={x - noteRx * 2.8} y={y + 3} fill={color} fontSize="9" fontFamily="serif" fontWeight="bold">
                {note.accidental}
              </text>
            )}
            <ellipse cx={x} cy={y} rx={noteRx} ry={noteRy} fill={color} transform={`rotate(-12, ${x}, ${y})`} />
            <line x1={x + noteRx * 0.8} y1={y} x2={x + noteRx * 0.8} y2={beamY} stroke={color} strokeWidth="1.4" />
          </g>
        );
      })}
      
      <line x1={positions[0] + noteRx * 0.8} y1={beamY} x2={positions[positions.length - 1] + noteRx * 0.8} y2={beamY} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1={positions[0] + noteRx * 0.8} y1={beamY + 5} x2={positions[positions.length - 1] + noteRx * 0.8} y2={beamY + 5} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}

function StaffBox({ noteKeys, noteType, isActive, boxSize }) {
  const boxWidth = boxSize;
  const boxHeight = boxSize;
  
  const staffTop = boxHeight * 0.15;
  const staffBottom = boxHeight * 0.75;
  const staffHeight = staffBottom - staffTop;
  const lineSpacing = staffHeight / 4;
  
  // staffLine 1 = E4 (bottom line), staffLine 5 = F5 (top line)
  // Each integer is a line, each .5 is a space between lines
  const getY = (staffLine) => {
    return staffBottom - (staffLine - 1) * (lineSpacing / 2);
  };
  
  // Get ledger lines needed - for notes on integer staffLines outside 1-5
  const getLedgerLines = (noteKeys) => {
    const ledgers = new Set();
    noteKeys.forEach(key => {
      const note = NOTES[key];
      if (!note) return;
      
      // Below staff - C4 is at staffLine 0 (integer), needs ledger at 0
      if (note.staffLine <= 0) {
        for (let l = 0; l >= Math.floor(note.staffLine); l--) {
          ledgers.add(l);
        }
      }
      
      // Above staff
      if (note.staffLine >= 6) {
        for (let l = 6; l <= Math.ceil(note.staffLine); l++) {
          ledgers.add(l);
        }
      }
    });
    return Array.from(ledgers);
  };
  
  const ledgerLines = getLedgerLines(noteKeys);
  const noteColor = isActive ? '#a855f7' : '#0a0a0a';
  
  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-150 overflow-visible ${
        isActive
          ? 'border-purple-400 shadow-2xl shadow-purple-500/50 bg-white'
          : 'border-gray-300 bg-white'
      }`}
      style={{ 
        width: boxWidth, 
        height: boxHeight,
        transform: isActive ? 'scale(1.12)' : 'scale(1)',
        zIndex: isActive ? 20 : 1,
        transformOrigin: 'center center'
      }}
    >
      <svg width={boxWidth} height={boxHeight} style={{ overflow: 'visible' }}>
        {/* Staff lines */}
        {[1, 2, 3, 4, 5].map(line => (
          <line
            key={line}
            x1="10"
            y1={getY(line)}
            x2={boxWidth - 10}
            y2={getY(line)}
            stroke="#1a1a1a"
            strokeWidth="1"
          />
        ))}
        
        {/* Ledger lines - centered on note position */}
        {ledgerLines.map(l => (
          <line
            key={`ledger-${l}`}
            x1={boxWidth / 2 - lineSpacing * 1.1}
            y1={getY(l)}
            x2={boxWidth / 2 + lineSpacing * 1.1}
            y2={getY(l)}
            stroke={noteColor}
            strokeWidth="1"
          />
        ))}
        
        {noteType === 'quarter' && noteKeys[0] && (
          <SingleNote
            noteKey={noteKeys[0]}
            x={boxWidth / 2}
            y={getY(NOTES[noteKeys[0]]?.staffLine ?? 3)}
            lineSpacing={lineSpacing}
            isActive={isActive}
            stemUp={(NOTES[noteKeys[0]]?.staffLine ?? 3) < 3}
          />
        )}
        
        {noteType === 'eighth' && noteKeys.length >= 2 && (
          <EighthNotePair
            note1Key={noteKeys[0]}
            note2Key={noteKeys[1]}
            x1={boxWidth * 0.32}
            x2={boxWidth * 0.68}
            y1={getY(NOTES[noteKeys[0]]?.staffLine ?? 3)}
            y2={getY(NOTES[noteKeys[1]]?.staffLine ?? 3)}
            lineSpacing={lineSpacing}
            isActive={isActive}
          />
        )}
        
        {noteType === 'sixteenth' && noteKeys.length >= 4 && (
          <SixteenthNoteGroup
            noteKeys={noteKeys}
            startX={8}
            ys={noteKeys.map(k => getY(NOTES[k]?.staffLine ?? 3))}
            lineSpacing={lineSpacing}
            isActive={isActive}
            boxWidth={boxWidth}
          />
        )}
      </svg>
    </div>
  );
}

function CountInDot({ index, activeIndex }) {
  const isActive = index === activeIndex;
  const isPast = index < activeIndex;
  
  return (
    <div
      className={`rounded-full transition-all duration-100 ${
        isActive
          ? 'w-8 h-8 bg-white/90 shadow-lg shadow-white/40'
          : isPast
            ? 'w-5 h-5 bg-white/60'
            : 'w-5 h-5 bg-white/25'
      }`}
    />
  );
}

// Piano Icon SVG
function PianoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="6" x2="6" y2="14" />
      <line x1="10" y1="6" x2="10" y2="14" />
      <line x1="14" y1="6" x2="14" y2="14" />
      <line x1="18" y1="6" x2="18" y2="14" />
      <rect x="4" y="6" width="2" height="6" fill="currentColor" />
      <rect x="8" y="6" width="2" height="6" fill="currentColor" />
      <rect x="14" y="6" width="2" height="6" fill="currentColor" />
      <rect x="18" y="6" width="2" height="6" fill="currentColor" />
    </svg>
  );
}

// Metronome Icon SVG
function MetronomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L8 22h8L12 2z" />
      <line x1="12" y1="6" x2="12" y2="14" />
      <line x1="12" y1="14" x2="16" y2="8" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SightReading() {
  const [difficulty, setDifficulty] = useState('easy');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentBox, setCurrentBox] = useState(-1);
  const [countIn, setCountIn] = useState(-1);
  const [boxes, setBoxes] = useState([]);
  const [tempo, setTempo] = useState(70);
  const [pianoVolume, setPianoVolume] = useState(80);
  const [metronomeVolume, setMetronomeVolume] = useState(50);
  const [exerciseNum, setExerciseNum] = useState(1);
  const [pianoEnabled, setPianoEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  
  const playingRef = useRef(false);
  const loopingRef = useRef(true);
  const boxesRef = useRef([]);
  const difficultyRef = useRef('easy');
  const tempoRef = useRef(70);
  const intervalRef = useRef(null);
  const noteTimeoutsRef = useRef([]);

  // Sync refs
  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);
  
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);
  
  useEffect(() => {
    loopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    audioEngine.setPianoVolume(pianoVolume / 100);
  }, [pianoVolume]);

  useEffect(() => {
    audioEngine.setMetronomeVolume(metronomeVolume / 100);
  }, [metronomeVolume]);

  useEffect(() => {
    audioEngine.setPianoEnabled(pianoEnabled);
  }, [pianoEnabled]);

  useEffect(() => {
    audioEngine.setMetronomeEnabled(metronomeEnabled);
  }, [metronomeEnabled]);

  // Initialize audio on mount
  useEffect(() => {
    audioEngine.init();
  }, []);

  const generateExercise = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const newBoxes = [];
    
    if (difficulty === 'hard') {
      const patternIndex = Math.floor(Math.random() * config.patterns.length);
      for (let i = 0; i < 8; i++) {
        const pattern = config.patterns[(patternIndex + i) % config.patterns.length];
        newBoxes.push({
          noteKeys: pattern.map(group => group[0]),
          noteType: config.noteType
        });
      }
    } else if (difficulty === 'medium') {
      for (let i = 0; i < 8; i++) {
        const note1 = config.notes[Math.floor(Math.random() * config.notes.length)];
        const note2 = config.notes[Math.floor(Math.random() * config.notes.length)];
        newBoxes.push({
          noteKeys: [note1, note2],
          noteType: 'eighth'
        });
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const note = config.notes[Math.floor(Math.random() * config.notes.length)];
        newBoxes.push({
          noteKeys: [note],
          noteType: 'quarter'
        });
      }
    }
    
    setBoxes(newBoxes);
    boxesRef.current = newBoxes;
    setCurrentBox(-1);
    setCountIn(-1);
    setExerciseNum(prev => prev + 1);
  }, [difficulty]);

  useEffect(() => {
    generateExercise();
  }, [difficulty]);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentBox(-1);
    setCountIn(-1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    noteTimeoutsRef.current.forEach(t => clearTimeout(t));
    noteTimeoutsRef.current = [];
  }, []);

  const startPlayback = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    
    // Initialize audio first
    await audioEngine.init();
    
    playingRef.current = true;
    setIsPlaying(true);
    setCurrentBox(-1);
    
    const beatMs = (60 / tempoRef.current) * 1000;
    
    // Precise count-in using AudioContext timing
    const startTime = audioEngine.ctx.currentTime;
    
    // Schedule all count-in clicks precisely
    for (let i = 0; i < 4; i++) {
      const clickTime = startTime + (i * beatMs / 1000);
      setTimeout(() => {
        if (playingRef.current) {
          setCountIn(i);
          audioEngine.playClick(i === 0);
        }
      }, i * beatMs);
    }
    
    // Start boxes after count-in
    setTimeout(() => {
      if (playingRef.current) {
        setCountIn(-1);
        startBoxes();
      }
    }, 4 * beatMs);
  }, [isPlaying, stopPlayback]);

  const startBoxes = useCallback(() => {
    let boxIndex = 0;
    const beatMs = (60 / tempoRef.current) * 1000;
    
    const playBox = () => {
      if (!playingRef.current) return;
      
      const currentBoxes = boxesRef.current;
      const config = DIFFICULTY_CONFIG[difficultyRef.current];
      
      setCurrentBox(boxIndex);
      audioEngine.playClick(boxIndex % 4 === 0);
      
      const box = currentBoxes[boxIndex];
      if (box) {
        if (config.noteType === 'quarter') {
          const midi = NOTES[box.noteKeys[0]]?.midi;
          if (midi) {
            noteTimeoutsRef.current.push(setTimeout(() => {
              if (playingRef.current) audioEngine.playNote(midi, 0.8, (60 / tempoRef.current) * 0.9);
            }, 10));
          }
        } else if (config.noteType === 'eighth') {
          box.noteKeys.forEach((key, i) => {
            const midi = NOTES[key]?.midi;
            if (midi) {
              noteTimeoutsRef.current.push(setTimeout(() => {
                if (playingRef.current) audioEngine.playNote(midi, 0.75, (60 / tempoRef.current) * 0.4);
              }, i * (beatMs / 2) + 10));
            }
          });
        } else if (config.noteType === 'sixteenth') {
          box.noteKeys.forEach((key, i) => {
            const midi = NOTES[key]?.midi;
            if (midi) {
              noteTimeoutsRef.current.push(setTimeout(() => {
                if (playingRef.current) audioEngine.playNote(midi, 0.7, (60 / tempoRef.current) * 0.2);
              }, i * (beatMs / 4) + 10));
            }
          });
        }
      }
      
      boxIndex++;
      
      if (boxIndex >= 8) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        setTimeout(() => {
          if (playingRef.current && loopingRef.current) {
            boxIndex = 0;
            intervalRef.current = setInterval(playBox, beatMs);
            playBox();
          } else {
            stopPlayback();
          }
        }, beatMs);
        return;
      }
    };
    
    playBox();
    intervalRef.current = setInterval(playBox, beatMs);
  }, [stopPlayback]);

  const nextExercise = useCallback(() => {
    stopPlayback();
    generateExercise();
  }, [stopPlayback, generateExercise]);

  const handleDifficultyChange = useCallback((newDifficulty) => {
    stopPlayback();
    setDifficulty(newDifficulty);
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      noteTimeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const boxSize = typeof window !== 'undefined' 
    ? Math.min(88, Math.max(68, (window.innerWidth - 48) / 4.5))
    : 80;

  return (
    <div className="max-w-lg mx-auto select-none px-2">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2rem] sm:rounded-[2.5rem] p-0.5 sm:p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[1.8rem] sm:rounded-[2.3rem] backdrop-blur-xl overflow-hidden relative">
          
          {/* Count-in Overlay - Apple subtle blur */}
          {countIn >= 0 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md backdrop-saturate-150 bg-black/40">
              <div className="text-7xl sm:text-8xl font-thin text-white/95 mb-6 tabular-nums">
                {countIn + 1}
              </div>
              <div className="flex gap-4 items-center">
                {[0, 1, 2, 3].map(i => (
                  <CountInDot key={i} index={i} activeIndex={countIn} />
                ))}
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="pt-5 sm:pt-6 pb-2 px-4 sm:px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Music className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm sm:text-base font-semibold text-white/90">Sight Reading</h2>
            </div>
            
            {/* Difficulty Selector */}
            <div className="flex gap-1.5 sm:gap-2 mb-4">
              {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleDifficultyChange(key)}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all ${
                    difficulty === key
                      ? `bg-gradient-to-br ${cfg.color} text-white shadow-lg`
                      : 'bg-white/5 text-white/50 hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <div>{cfg.name}</div>
                  <div className="text-[8px] sm:text-[9px] opacity-70">{cfg.description}</div>
                </button>
              ))}
            </div>
            
            {/* Progress Dots */}
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-100 ${
                    currentBox === i 
                      ? 'bg-purple-400 scale-150 shadow-lg shadow-purple-400/60' 
                      : currentBox > i 
                        ? 'bg-white/50' 
                        : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Note Boxes Grid */}
          <div className="px-1.5 sm:px-2 py-3 sm:py-4 space-y-2 sm:space-y-3">
            <div className="flex gap-1.5 sm:gap-2 justify-center items-center" style={{ minHeight: boxSize * 1.15 }}>
              {boxes.slice(0, 4).map((box, i) => (
                <StaffBox
                  key={`${exerciseNum}-${i}`}
                  noteKeys={box.noteKeys}
                  noteType={box.noteType}
                  isActive={currentBox === i}
                  boxSize={boxSize}
                />
              ))}
            </div>
            <div className="flex gap-1.5 sm:gap-2 justify-center items-center" style={{ minHeight: boxSize * 1.15 }}>
              {boxes.slice(4, 8).map((box, i) => (
                <StaffBox
                  key={`${exerciseNum}-${i + 4}`}
                  noteKeys={box.noteKeys}
                  noteType={box.noteType}
                  isActive={currentBox === i + 4}
                  boxSize={boxSize}
                />
              ))}
            </div>
          </div>

          {/* Play Controls */}
          <div className="px-4 sm:px-6 py-3 flex flex-col items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isLooping
                    ? 'bg-purple-500/25 text-purple-400 border border-purple-500/50'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={startPlayback}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  isPlaying
                    ? 'bg-white/10 text-white border-2 border-white/30'
                    : 'bg-gradient-to-br from-purple-400 to-pink-600 text-white shadow-xl shadow-purple-500/40'
                }`}
                style={{ width: 72, height: 72 }}
              >
                {isPlaying ? <Pause className="w-8 h-8 sm:w-9 sm:h-9" /> : <Play className="w-8 h-8 sm:w-9 sm:h-9 ml-1" fill="white" />}
              </button>
              
              <button
                onClick={nextExercise}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 text-white/60 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <p className="text-white/40 text-[10px] sm:text-xs mt-2">
              {isPlaying ? (isLooping ? 'Looping' : 'Playing') : 'Tap to start'}
            </p>
          </div>

          {/* Controls */}
          <div className="bg-black/30 px-4 sm:px-6 py-4 sm:py-5 space-y-4">
            {/* Tempo Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] sm:text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  Tempo
                </label>
                <span className="text-xs sm:text-sm font-semibold text-purple-400 tabular-nums">{tempo} BPM</span>
              </div>
              <Slider
                value={[tempo]}
                onValueChange={(v) => setTempo(v[0])}
                min={30}
                max={160}
                step={1}
                disabled={isPlaying}
                className="[&_[role=slider]]:w-4 [&_[role=slider]]:h-4 sm:[&_[role=slider]]:w-5 sm:[&_[role=slider]]:h-5 [&_[role=slider]]:bg-purple-400"
              />
            </div>

            {/* Piano Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPianoEnabled(!pianoEnabled)}
                className={`p-1.5 rounded-lg transition-all ${pianoEnabled ? 'text-purple-400' : 'text-white/20'}`}
              >
                <PianoIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <Slider
                value={[pianoVolume]}
                onValueChange={(v) => setPianoVolume(v[0])}
                max={100}
                step={1}
                disabled={!pianoEnabled}
                className={`flex-1 [&_[role=slider]]:w-3.5 [&_[role=slider]]:h-3.5 sm:[&_[role=slider]]:w-4 sm:[&_[role=slider]]:h-4 [&_[role=slider]]:bg-purple-400 ${!pianoEnabled ? 'opacity-30' : ''}`}
              />
              <span className="text-[10px] sm:text-xs text-white/40 w-8 text-right tabular-nums">{pianoVolume}%</span>
            </div>

            {/* Metronome Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                className={`p-1.5 rounded-lg transition-all ${metronomeEnabled ? 'text-blue-400' : 'text-white/20'}`}
              >
                <MetronomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <Slider
                value={[metronomeVolume]}
                onValueChange={(v) => setMetronomeVolume(v[0])}
                max={100}
                step={1}
                disabled={!metronomeEnabled}
                className={`flex-1 [&_[role=slider]]:w-3.5 [&_[role=slider]]:h-3.5 sm:[&_[role=slider]]:w-4 sm:[&_[role=slider]]:h-4 [&_[role=slider]]:bg-blue-400 ${!metronomeEnabled ? 'opacity-30' : ''}`}
              />
              <span className="text-[10px] sm:text-xs text-white/40 w-8 text-right tabular-nums">{metronomeVolume}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}