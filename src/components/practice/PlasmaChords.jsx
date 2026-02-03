import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Shuffle, Play, Lock, Unlock } from 'lucide-react';

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MODES = ['Simple', 'Musician', 'Genius'];

// Comprehensive chord formulas
const CHORD_FORMULAS = {
  // Basic Triads
  major: { formula: [0, 4, 7], symbol: '', category: 'Triad' },
  minor: { formula: [0, 3, 7], symbol: 'm', category: 'Triad' },
  dim: { formula: [0, 3, 6], symbol: '°', category: 'Triad' },
  aug: { formula: [0, 4, 8], symbol: '+', category: 'Triad' },
  sus2: { formula: [0, 2, 7], symbol: 'sus2', category: 'Sus' },
  sus4: { formula: [0, 5, 7], symbol: 'sus4', category: 'Sus' },
  
  // 7th Chords
  maj7: { formula: [0, 4, 7, 11], symbol: 'maj7', category: '7th' },
  min7: { formula: [0, 3, 7, 10], symbol: 'm7', category: '7th' },
  dom7: { formula: [0, 4, 7, 10], symbol: '7', category: '7th' },
  dim7: { formula: [0, 3, 6, 9], symbol: '°7', category: '7th' },
  halfDim7: { formula: [0, 3, 6, 10], symbol: 'ø7', category: '7th' },
  minMaj7: { formula: [0, 3, 7, 11], symbol: 'mMaj7', category: '7th' },
  aug7: { formula: [0, 4, 8, 10], symbol: '+7', category: '7th' },
  augMaj7: { formula: [0, 4, 8, 11], symbol: '+maj7', category: '7th' },
  dom7sus4: { formula: [0, 5, 7, 10], symbol: '7sus4', category: '7th' },
  
  // 9th Chords
  maj9: { formula: [0, 4, 7, 11, 14], symbol: 'maj9', category: '9th' },
  min9: { formula: [0, 3, 7, 10, 14], symbol: 'm9', category: '9th' },
  dom9: { formula: [0, 4, 7, 10, 14], symbol: '9', category: '9th' },
  dom7b9: { formula: [0, 4, 7, 10, 13], symbol: '7♭9', category: '9th' },
  dom7sharp9: { formula: [0, 4, 7, 10, 15], symbol: '7#9', category: '9th' },
  add9: { formula: [0, 4, 7, 14], symbol: 'add9', category: '9th' },
  minAdd9: { formula: [0, 3, 7, 14], symbol: 'm(add9)', category: '9th' },
  
  // 11th Chords
  maj11: { formula: [0, 4, 7, 11, 14, 17], symbol: 'maj11', category: '11th' },
  min11: { formula: [0, 3, 7, 10, 14, 17], symbol: 'm11', category: '11th' },
  dom11: { formula: [0, 4, 7, 10, 14, 17], symbol: '11', category: '11th' },
  dom7sharp11: { formula: [0, 4, 7, 10, 14, 18], symbol: '7#11', category: '11th' },
  maj7sharp11: { formula: [0, 4, 7, 11, 14, 18], symbol: 'maj7#11', category: '11th' },
  
  // 13th Chords
  maj13: { formula: [0, 4, 7, 11, 14, 21], symbol: 'maj13', category: '13th' },
  min13: { formula: [0, 3, 7, 10, 14, 21], symbol: 'm13', category: '13th' },
  dom13: { formula: [0, 4, 7, 10, 14, 21], symbol: '13', category: '13th' },
  dom13b9: { formula: [0, 4, 7, 10, 13, 21], symbol: '13♭9', category: '13th' },
  
  // Altered & Jazz
  alt: { formula: [0, 4, 8, 10, 13], symbol: 'alt', category: 'Altered' },
  dom7b5: { formula: [0, 4, 6, 10], symbol: '7♭5', category: 'Altered' },
  dom7sharp5: { formula: [0, 4, 8, 10], symbol: '7#5', category: 'Altered' },
  dom7b9b5: { formula: [0, 4, 6, 10, 13], symbol: '7♭9♭5', category: 'Altered' },
  dom7sharp9sharp5: { formula: [0, 4, 8, 10, 15], symbol: '7#9#5', category: 'Altered' },
  
  // Quartal (4ths)
  quartal3: { formula: [0, 5, 10], symbol: 'Q3', category: 'Quartal' },
  quartal4: { formula: [0, 5, 10, 15], symbol: 'Q4', category: 'Quartal' },
  quartal5: { formula: [0, 5, 10, 15, 20], symbol: 'Q5', category: 'Quartal' },
  quartalSus: { formula: [0, 5, 10, 14], symbol: 'Qsus', category: 'Quartal' },
  
  // Quintal (5ths)
  quintal3: { formula: [0, 7, 14], symbol: '5th×3', category: 'Quintal' },
  quintal4: { formula: [0, 7, 14, 21], symbol: '5th×4', category: 'Quintal' },
  openFifth: { formula: [0, 7, 12, 19], symbol: 'Open5', category: 'Quintal' },
  
  // German/Italian/French Augmented 6th
  italian6: { formula: [0, 4, 10], symbol: 'It+6', category: 'Geographic' },
  german6: { formula: [0, 4, 7, 10], symbol: 'Ger+6', category: 'Geographic' },
  french6: { formula: [0, 4, 6, 10], symbol: 'Fr+6', category: 'Geographic' },
  
  // Special Jazz Voicings
  so_what: { formula: [0, 5, 10, 15, 19], symbol: 'So What', category: 'Jazz' },
  kenny_barron: { formula: [0, 4, 7, 10, 14, 17], symbol: 'KB', category: 'Jazz' },
  herbie: { formula: [0, 3, 6, 10, 14], symbol: 'Herbie', category: 'Jazz' },
};

// Drop voicings generator
function generateDropVoicing(formula, dropType) {
  const notes = [...formula];
  if (notes.length < 4) return notes;
  
  if (dropType === 'drop2' && notes.length >= 4) {
    const second = notes[notes.length - 2];
    notes.splice(notes.length - 2, 1);
    notes.unshift(second - 12);
  } else if (dropType === 'drop3' && notes.length >= 4) {
    const third = notes[notes.length - 3];
    notes.splice(notes.length - 3, 1);
    notes.unshift(third - 12);
  } else if (dropType === 'drop24' && notes.length >= 4) {
    const second = notes[notes.length - 2];
    const fourth = notes[notes.length - 4] || notes[0];
    notes.splice(notes.length - 2, 1);
    notes.splice(notes.length - 4 >= 0 ? notes.length - 3 : 0, 1);
    notes.unshift(second - 12, fourth - 12);
    notes.sort((a, b) => a - b);
  }
  return notes.sort((a, b) => a - b);
}

const CATEGORIES = ['All', 'Triad', 'Sus', '7th', '9th', '11th', '13th', 'Altered', 'Quartal', 'Quintal', 'Geographic', 'Jazz'];
const VOICING_TYPES = ['Close', 'Drop 2', 'Drop 3', 'Drop 2&4', 'Spread'];

const SCALE_DEGREES = {
  Simple: [
    { degree: 0, type: 'major' },
    { degree: 2, type: 'minor' },
    { degree: 4, type: 'minor' },
    { degree: 5, type: 'major' },
    { degree: 7, type: 'major' },
    { degree: 9, type: 'minor' },
  ],
  Musician: [
    { degree: 0, type: 'maj9' },
    { degree: 2, type: 'min9' },
    { degree: 4, type: 'min7' },
    { degree: 5, type: 'maj9' },
    { degree: 7, type: 'dom9' },
    { degree: 9, type: 'min9' },
    { degree: 0, type: 'sus2' },
    { degree: 0, type: 'sus4' },
    { degree: 0, type: 'add9' },
    { degree: 0, type: 'dom13' },
    { degree: 7, type: 'dom13' },
  ],
  Genius: [
    { degree: 0, type: 'maj13' },
    { degree: 0, type: 'maj7sharp11' },
    { degree: 2, type: 'min13' },
    { degree: 2, type: 'min11' },
    { degree: 4, type: 'min9' },
    { degree: 5, type: 'maj13' },
    { degree: 7, type: 'dom13' },
    { degree: 7, type: 'dom7sharp11' },
    { degree: 7, type: 'alt' },
    { degree: 7, type: 'dom7b9' },
    { degree: 7, type: 'dom7sharp9' },
    { degree: 7, type: 'dom13b9' },
    { degree: 9, type: 'halfDim7' },
    { degree: 11, type: 'dim7' },
    { degree: 1, type: 'dom7' }, // bII
    { degree: 8, type: 'maj7' }, // bVI
    { degree: 10, type: 'dom7' }, // bVII
    { degree: 0, type: 'quartal4' },
    { degree: 7, type: 'quartal4' },
    { degree: 0, type: 'so_what' },
    { degree: 0, type: 'german6' },
    { degree: 0, type: 'french6' },
    { degree: 0, type: 'kenny_barron' },
  ],
};

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getChordNotes(rootMidi, formula, inversion = 0, voicing = 'Close', spread = 0) {
  let notes = formula.map(interval => rootMidi + interval);
  
  // Apply voicing
  if (voicing === 'Drop 2') {
    notes = generateDropVoicing(notes, 'drop2');
  } else if (voicing === 'Drop 3') {
    notes = generateDropVoicing(notes, 'drop3');
  } else if (voicing === 'Drop 2&4') {
    notes = generateDropVoicing(notes, 'drop24');
  }
  
  // Apply inversion
  for (let i = 0; i < inversion && i < notes.length - 1; i++) {
    notes[i] += 12;
  }
  notes.sort((a, b) => a - b);
  
  // Apply spread
  if (voicing === 'Spread' || spread > 0) {
    const spreadAmount = spread > 0 ? spread : 1;
    notes = notes.map((note, i) => note + Math.floor(i * spreadAmount / 2) * 12);
  }
  
  return notes;
}

export default function PlasmaChords() {
  const [selectedKey, setSelectedKey] = useState('C');
  const [mode, setMode] = useState('Musician');
  const [selectedChord, setSelectedChord] = useState('maj7');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [voicing, setVoicing] = useState('Close');
  const [inversion, setInversion] = useState(0);
  const [spread, setSpread] = useState(0);
  const [isRandom, setIsRandom] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sustainMode, setSustainMode] = useState(false);
  const [currentChord, setCurrentChord] = useState('');
  const [orbIntensity, setOrbIntensity] = useState(0);
  const [plasmaHue, setPlasmaHue] = useState(260);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const activeNotesRef = useRef([]);
  const masterGainRef = useRef(null);
  const particlesRef = useRef([]);

  // Elite plasma animation with particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    let time = 0;
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: 50 + Math.random() * 80,
          speed: 0.005 + Math.random() * 0.01,
          size: 1 + Math.random() * 3,
          alpha: 0.3 + Math.random() * 0.5,
          hueOffset: Math.random() * 60 - 30,
        });
      }
    }
    
    const animate = () => {
      time += 0.016;
      const intensity = orbIntensity;
      
      // Clear with fade trail
      ctx.fillStyle = `rgba(6, 6, 10, ${0.15 + intensity * 0.1})`;
      ctx.fillRect(0, 0, width, height);
      
      const baseRadius = Math.min(width, height) * 0.28;
      const pulseRadius = baseRadius + Math.sin(time * 2) * 8 + intensity * 40;
      
      // Outer plasma rings
      for (let ring = 6; ring >= 0; ring--) {
        const ringRadius = pulseRadius + ring * 25 + Math.sin(time * 1.5 + ring) * 12;
        const ringAlpha = (0.03 + intensity * 0.08) * (1 - ring / 7);
        
        const gradient = ctx.createRadialGradient(centerX, centerY, ringRadius * 0.3, centerX, centerY, ringRadius);
        const h1 = (plasmaHue + ring * 15 + time * 20) % 360;
        const h2 = (plasmaHue + 40 + ring * 10) % 360;
        gradient.addColorStop(0, `hsla(${h1}, 80%, 60%, ${ringAlpha})`);
        gradient.addColorStop(0.4, `hsla(${h2}, 70%, 50%, ${ringAlpha * 0.6})`);
        gradient.addColorStop(0.7, `hsla(${plasmaHue}, 60%, 40%, ${ringAlpha * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Electric arcs when playing
      if (intensity > 0.3) {
        ctx.strokeStyle = `hsla(${plasmaHue + 60}, 100%, 70%, ${intensity * 0.5})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const arcAngle = time * 3 + i * Math.PI * 0.4;
          const arcRadius = pulseRadius * (0.8 + Math.random() * 0.4);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          let x = centerX, y = centerY;
          for (let j = 0; j < 8; j++) {
            const segLen = arcRadius / 8;
            x += Math.cos(arcAngle + (Math.random() - 0.5) * 1.5) * segLen;
            y += Math.sin(arcAngle + (Math.random() - 0.5) * 1.5) * segLen;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      
      // Animated particles
      particlesRef.current.forEach(p => {
        p.angle += p.speed * (1 + intensity * 2);
        const px = centerX + Math.cos(p.angle) * (p.radius + intensity * 30);
        const py = centerY + Math.sin(p.angle) * (p.radius + intensity * 30);
        
        const particleGrad = ctx.createRadialGradient(px, py, 0, px, py, p.size * (2 + intensity * 3));
        particleGrad.addColorStop(0, `hsla(${plasmaHue + p.hueOffset}, 80%, 70%, ${p.alpha * (0.5 + intensity)})`);
        particleGrad.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(px, py, p.size * (2 + intensity * 3), 0, Math.PI * 2);
        ctx.fillStyle = particleGrad;
        ctx.fill();
      });
      
      // Inner plasma core
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius * 0.6);
      coreGrad.addColorStop(0, `hsla(0, 0%, 100%, ${0.4 + intensity * 0.5})`);
      coreGrad.addColorStop(0.2, `hsla(${plasmaHue + 30}, 70%, 75%, ${0.3 + intensity * 0.4})`);
      coreGrad.addColorStop(0.5, `hsla(${plasmaHue}, 80%, 55%, ${0.2 + intensity * 0.3})`);
      coreGrad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      
      // Bright center point
      const dotGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20 + intensity * 15);
      dotGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 + intensity * 0.2})`);
      dotGrad.addColorStop(0.5, `hsla(${plasmaHue + 60}, 80%, 80%, ${0.4 + intensity * 0.3})`);
      dotGrad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20 + intensity * 15, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [orbIntensity, plasmaHue]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stopCurrentChord = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    activeNotesRef.current.forEach(({ osc, osc2, gain, extras }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        setTimeout(() => {
          try { osc.stop(); } catch(e) {}
          try { osc2?.stop(); } catch(e) {}
          if (extras) extras.forEach(e => { try { e.stop(); } catch(err) {} });
        }, 450);
      } catch(e) {}
    });
    activeNotesRef.current = [];
    setIsPlaying(false);
    setOrbIntensity(prev => Math.max(0, prev - 0.5));
  }, []);

  const playChord = useCallback(() => {
    const ctx = getAudioContext();
    
    // In sustain mode, stop previous chord first
    if (!sustainMode) {
      stopCurrentChord();
    } else if (activeNotesRef.current.length > 0) {
      stopCurrentChord();
    }
    
    // Get chord info
    const keyIndex = KEYS.indexOf(selectedKey);
    const baseMidi = 48 + keyIndex; // C3 = 48 (one octave below middle C)
    
    let chordInfo;
    let chordKey = selectedChord;
    
    if (isRandom) {
      const degrees = SCALE_DEGREES[mode];
      chordInfo = degrees[Math.floor(Math.random() * degrees.length)];
      chordKey = chordInfo.type;
    } else {
      chordInfo = { degree: 0, type: selectedChord };
    }
    
    const chordData = CHORD_FORMULAS[chordKey];
    if (!chordData) return;
    
    const rootMidi = baseMidi + (chordInfo?.degree || 0);
    const notes = getChordNotes(rootMidi, chordData.formula, inversion, voicing, spread);
    
    // Update display
    const rootNote = KEYS[(keyIndex + (chordInfo?.degree || 0)) % 12];
    setCurrentChord(`${rootNote}${chordData.symbol}`);
    setPlasmaHue((keyIndex * 30 + 200) % 360);
    
    // Create master chain
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    
    // Gentle compression (glue)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.15;
    
    // === RHODES AMP SIMULATION (Fender Twin style) ===
    // Plate reverb (classic Rhodes pairing)
    const reverb = ctx.createConvolver();
    const reverbTime = 1.8;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * reverbTime;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Plate reverb character - dense, smooth decay
        const predelay = t < 0.02 ? 0 : 1;
        const decay = Math.exp(-4 * t / reverbTime) * predelay;
        const diffusion = (Math.random() * 2 - 1);
        // Slight modulation for lushness
        const mod = Math.sin(t * 3) * 0.02;
        channel[i] = diffusion * decay * (1 + mod) * 0.5;
      }
    }
    reverb.buffer = impulse;
    
    // Reverb EQ (warm plate sound)
    const reverbHighCut = ctx.createBiquadFilter();
    reverbHighCut.type = 'lowpass';
    reverbHighCut.frequency.value = 3500;
    reverbHighCut.Q.value = 0.7;
    
    const reverbLowCut = ctx.createBiquadFilter();
    reverbLowCut.type = 'highpass';
    reverbLowCut.frequency.value = 150;
    reverbLowCut.Q.value = 0.5;
    
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.22; // Slightly more reverb for spaciousness
    
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.78;
    
    // Very subtle tremolo for warmth
    const tremoloLFO = ctx.createOscillator();
    tremoloLFO.type = 'sine';
    tremoloLFO.frequency.value = 3; // Gentle rate
    
    const tremoloDepth = ctx.createGain();
    tremoloDepth.gain.value = 0.02; // Very subtle
    
    const tremoloMix = ctx.createGain();
    tremoloMix.gain.value = 1;
    
    tremoloLFO.connect(tremoloDepth);
    tremoloDepth.connect(tremoloMix.gain);
    
    // Clean pass-through (no saturation for pristine sound)
    const cleanPass = ctx.createGain();
    cleanPass.gain.value = 1;
    
    // Final EQ (clean piano voicing)
    const ampBass = ctx.createBiquadFilter();
    ampBass.type = 'lowshelf';
    ampBass.frequency.value = 150;
    ampBass.gain.value = 1;
    
    const ampMid = ctx.createBiquadFilter();
    ampMid.type = 'peaking';
    ampMid.frequency.value = 600;
    ampMid.Q.value = 0.5;
    ampMid.gain.value = 0.5;
    
    const ampPresence = ctx.createBiquadFilter();
    ampPresence.type = 'peaking';
    ampPresence.frequency.value = 3000;
    ampPresence.Q.value = 0.7;
    ampPresence.gain.value = 1;
    
    // Gentle limiter (transparent)
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 10;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.15;
    
    // Signal chain (clean path)
    masterGain.connect(tremoloMix);
    tremoloMix.connect(cleanPass);
    cleanPass.connect(ampBass);
    ampBass.connect(ampMid);
    ampMid.connect(ampPresence);
    
    // Dry path
    ampPresence.connect(dryGain);
    dryGain.connect(compressor);
    
    // Reverb path
    ampPresence.connect(reverb);
    reverb.connect(reverbLowCut);
    reverbLowCut.connect(reverbHighCut);
    reverbHighCut.connect(reverbGain);
    reverbGain.connect(compressor);
    
    compressor.connect(limiter);
    limiter.connect(ctx.destination);
    
    masterGainRef.current = masterGain;
    
    setOrbIntensity(1);
    setIsPlaying(true);
    
    const sustainDuration = sustainMode ? 30 : 6;
    const now = ctx.currentTime;
    
    // Start LFO for tremolo
    tremoloLFO.start(now);
    
    // === ELITE FENDER RHODES MARK I FM SYNTHESIS ===
    // Rhodes uses tine + tone bar system - modeled with FM synthesis
    // Carrier:Modulator ratio of 1:1 or 1:14 creates the classic bell-like tone
    
    notes.forEach((midi, i) => {
      const freq = midiToFreq(midi);
      const velocity = 0.9 + Math.random() * 0.05; // Very consistent velocity
      const noteVol = volume * 0.08 * velocity / Math.pow(notes.length, 0.55); // Lower, cleaner levels
      
      // Voice mixer
      const voiceMixer = ctx.createGain();
      voiceMixer.gain.value = 1;
      voiceMixer.connect(masterGain);
      
      // === FM SYNTHESIS CORE (Tine + Tonebar) ===
      // The Rhodes sound comes from a hammer hitting a tine (tuning fork)
      // which vibrates near a tonebar pickup - this creates the FM character
      
      // Modulator oscillator (represents the tine vibration)
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      // Ratio 1:1 for low notes, increasing for higher notes (brighter)
      const modRatio = midi < 60 ? 1 : midi < 72 ? 1.5 : 2;
      modulator.frequency.value = freq * modRatio;
      
      // Modulation depth (index) - minimal for pristine clean tone
      const modGain = ctx.createGain();
      // Very low FM index for pure, clean piano sound
      const modIndex = (midi < 48 ? 15 : midi < 60 ? 25 : midi < 72 ? 35 : 45) * velocity;
      modGain.gain.setValueAtTime(modIndex, now);
      modGain.gain.exponentialRampToValueAtTime(modIndex * 0.15, now + 0.15);
      modGain.gain.exponentialRampToValueAtTime(modIndex * 0.05, now + 0.6);
      modGain.gain.setTargetAtTime(modIndex * 0.01, now + 2, 2.5);
      if (!sustainMode) {
        modGain.gain.setTargetAtTime(0.001, now + sustainDuration - 1, 0.5);
      }
      
      // Carrier oscillator (main tone)
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = freq;
      
      // Connect modulator to carrier frequency (FM)
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      
      // Carrier amplitude envelope (classic Rhodes ADSR)
      const carrierGain = ctx.createGain();
      carrierGain.gain.setValueAtTime(0, now);
      // Fast attack with slight "bark"
      carrierGain.gain.linearRampToValueAtTime(noteVol * 1.15, now + 0.002);
      carrierGain.gain.linearRampToValueAtTime(noteVol, now + 0.015);
      // Decay to sustain
      carrierGain.gain.exponentialRampToValueAtTime(noteVol * 0.7, now + 0.1);
      carrierGain.gain.exponentialRampToValueAtTime(noteVol * 0.5, now + 0.5);
      carrierGain.gain.setTargetAtTime(noteVol * 0.35, now + 1, 2);
      if (!sustainMode) {
        carrierGain.gain.setTargetAtTime(0.001, now + sustainDuration - 0.8, 0.4);
      }
      
      carrier.connect(carrierGain);
      
      // === PURE SECOND HARMONIC (subtle octave shimmer) ===
      const carrier2 = ctx.createOscillator();
      carrier2.type = 'sine';
      carrier2.frequency.value = freq * 2; // Pure octave harmonic
      
      const carrierGain2 = ctx.createGain();
      carrierGain2.gain.setValueAtTime(0, now);
      carrierGain2.gain.linearRampToValueAtTime(noteVol * 0.12, now + 0.01);
      carrierGain2.gain.exponentialRampToValueAtTime(noteVol * 0.04, now + 0.3);
      carrierGain2.gain.setTargetAtTime(0.001, now + 4, 1.5);
      
      carrier2.connect(carrierGain2);
      
      // === SOFT HAMMER ATTACK (very gentle transient) ===
      const hammerAttack = ctx.createOscillator();
      hammerAttack.type = 'sine';
      hammerAttack.frequency.value = freq * 3; // Gentle harmonic
      
      const hammerGain = ctx.createGain();
      hammerGain.gain.setValueAtTime(noteVol * 0.08 * velocity, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      hammerAttack.connect(hammerGain);
      hammerGain.connect(voiceMixer);
      hammerAttack.start(now);
      hammerAttack.stop(now + 0.06);
      
      // === VERY SUBTLE CHORUS/DETUNE (minimal width) ===
      const chorusOsc = ctx.createOscillator();
      chorusOsc.type = 'sine';
      chorusOsc.frequency.value = freq;
      chorusOsc.detune.value = 3; // Very subtle detune
      
      const chorusGain = ctx.createGain();
      chorusGain.gain.setValueAtTime(0, now);
      chorusGain.gain.linearRampToValueAtTime(noteVol * 0.06, now + 0.03);
      chorusGain.gain.setTargetAtTime(noteVol * 0.03, now + 0.8, 1.5);
      if (!sustainMode) {
        chorusGain.gain.setTargetAtTime(0.001, now + sustainDuration - 0.5, 0.4);
      }
      
      chorusOsc.connect(chorusGain);
      chorusGain.connect(voiceMixer);
      
      // === CLEAN PIANO EQ CURVE ===
      // Warm low-mids, gentle presence
      const warmthEQ = ctx.createBiquadFilter();
      warmthEQ.type = 'peaking';
      warmthEQ.frequency.value = 250;
      warmthEQ.Q.value = 0.6;
      warmthEQ.gain.value = 2;
      
      const clarityEQ = ctx.createBiquadFilter();
      clarityEQ.type = 'peaking';
      clarityEQ.frequency.value = 2000;
      clarityEQ.Q.value = 0.8;
      clarityEQ.gain.value = 1.5;
      
      // Smooth high frequencies
      const highCut = ctx.createBiquadFilter();
      highCut.type = 'lowpass';
      highCut.frequency.value = 6000;
      highCut.Q.value = 0.5;
      
      // Connect main voice through EQ (clean path)
      carrierGain.connect(warmthEQ);
      carrierGain2.connect(voiceMixer); // Octave harmonic bypasses EQ for purity
      warmthEQ.connect(clarityEQ);
      clarityEQ.connect(highCut);
      highCut.connect(voiceMixer);
      
      // Start oscillators
      modulator.start(now);
      carrier.start(now);
      carrier2.start(now);
      chorusOsc.start(now);
      
      if (!sustainMode) {
        const stopTime = now + sustainDuration + 0.5;
        modulator.stop(stopTime);
        carrier.stop(stopTime);
        carrier2.stop(stopTime);
        chorusOsc.stop(stopTime);
      }
      
      activeNotesRef.current.push({ 
        osc: carrier, 
        osc2: chorusOsc, 
        gain: carrierGain,
        extras: [modulator, carrier2]
      });
    });
    
    // Orb intensity decay
    if (!sustainMode) {
      setTimeout(() => setOrbIntensity(0.5), 150);
      setTimeout(() => setOrbIntensity(0.2), 800);
      setTimeout(() => {
        setOrbIntensity(0);
        setIsPlaying(false);
      }, sustainDuration * 1000);
    }
  }, [selectedKey, mode, selectedChord, voicing, inversion, spread, isRandom, volume, sustainMode, getAudioContext, stopCurrentChord]);

  const handleCanvasClick = () => {
    playChord();
  };

  // Filter chords by category
  const filteredChords = Object.entries(CHORD_FORMULAS).filter(([key, data]) => 
    selectedCategory === 'All' || data.category === selectedCategory
  );

  useEffect(() => {
    return () => {
      stopCurrentChord();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopCurrentChord]);

  return (
    <div className="min-h-screen bg-[#06060a] text-white p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Plasma Chords
          </h2>
          <p className="text-white/40 mt-1 text-sm">Touch the plasma to generate harmonies</p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap gap-2 justify-center items-center bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            variant={isRandom ? 'default' : 'outline'}
            onClick={() => setIsRandom(!isRandom)}
            className={`h-9 ${isRandom ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
          >
            <Shuffle className="w-4 h-4 mr-1.5" />
            Random
          </Button>

          <Button
            variant={sustainMode ? 'default' : 'outline'}
            onClick={() => {
              if (sustainMode) stopCurrentChord();
              setSustainMode(!sustainMode);
            }}
            className={`h-9 ${sustainMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
          >
            {sustainMode ? <Lock className="w-4 h-4 mr-1.5" /> : <Unlock className="w-4 h-4 mr-1.5" />}
            Sustain
          </Button>
        </div>

        {/* Plasma Orb */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/50">
          <canvas
            ref={canvasRef}
            className="w-full aspect-[4/3] md:aspect-[16/9] cursor-pointer"
            onClick={handleCanvasClick}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className={`text-4xl md:text-5xl font-bold transition-all duration-200 ${isPlaying ? 'text-white scale-110' : 'text-white/70'}`}>
                {currentChord || 'Tap'}
              </div>
              {!currentChord && <div className="text-white/30 text-sm mt-2">Touch to play</div>}
              {sustainMode && isPlaying && (
                <div className="text-amber-400/80 text-xs mt-2 animate-pulse">♪ Sustaining...</div>
              )}
            </div>
          </div>
        </div>

        {/* Chord Selection */}
        {!isRandom && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Chord Grid */}
            <div className="flex flex-wrap gap-1.5 justify-center max-h-40 overflow-y-auto py-2">
              {filteredChords.map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => setSelectedChord(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedChord === key
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/[0.06]'
                  }`}
                >
                  {data.symbol || key}
                </button>
              ))}
            </div>

            {/* Voicing Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Voicing</label>
                <Select value={voicing} onValueChange={setVoicing}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICING_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Inversion: {inversion}</label>
                <Slider
                  value={[inversion]}
                  onValueChange={([v]) => setInversion(v)}
                  max={4}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider">Spread: {spread}</label>
                <Slider
                  value={[spread]}
                  onValueChange={([v]) => setSpread(v)}
                  max={4}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={playChord}
                  className="w-full h-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Play
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Volume */}
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
          <Volume2 className="w-4 h-4 text-white/40" />
          <Slider
            value={[volume * 100]}
            onValueChange={([v]) => setVolume(v / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-white/40 w-10 text-right font-mono">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}