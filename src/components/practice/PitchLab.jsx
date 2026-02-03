import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Volume2, Camera, CameraOff, Zap, Wind, Music, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Activity } from 'lucide-react';
import AnalysisTab from '../analysis/AnalysisTab';

const A4_FREQ = 440;
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ORCHESTRAL_REFERENCES = {
  'Concert': [
    { note: 'A', octave: 4, freq: 440, label: 'A4', desc: 'Standard 440Hz' },
    { note: 'Bb', octave: 4, freq: 466.16, label: 'B♭4', desc: 'Bb Instruments' },
    { note: 'F', octave: 4, freq: 349.23, label: 'F4', desc: 'Horn in F' },
  ],
  'Saxophone': [
    { note: 'Bb', octave: 3, freq: 233.08, label: 'B♭3', desc: 'Low Bb' },
    { note: 'G', octave: 4, freq: 392, label: 'G4', desc: 'Middle G' },
    { note: 'C', octave: 5, freq: 523.25, label: 'C5', desc: 'Concert C' },
    { note: 'F', octave: 5, freq: 698.46, label: 'F5', desc: 'High F' },
  ],
  'Brass': [
    { note: 'Bb', octave: 2, freq: 116.54, label: 'B♭2', desc: 'Tuba' },
    { note: 'F', octave: 3, freq: 174.61, label: 'F3', desc: 'Trombone' },
    { note: 'Bb', octave: 3, freq: 233.08, label: 'B♭3', desc: 'Euphonium' },
    { note: 'Bb', octave: 4, freq: 466.16, label: 'B♭4', desc: 'Trumpet' },
  ],
  'Voice': [
    { note: 'A', octave: 2, freq: 110, label: 'A2', desc: 'Bass' },
    { note: 'E', octave: 3, freq: 164.81, label: 'E3', desc: 'Baritone' },
    { note: 'C', octave: 4, freq: 261.63, label: 'C4', desc: 'Middle C' },
    { note: 'A', octave: 4, freq: 440, label: 'A4', desc: 'Tenor/Alto' },
    { note: 'C', octave: 5, freq: 523.25, label: 'C5', desc: 'Soprano' },
  ],
  'Woodwinds': [
    { note: 'D', octave: 4, freq: 293.66, label: 'D4', desc: 'Flute Low' },
    { note: 'A', octave: 4, freq: 440, label: 'A4', desc: 'Clarinet' },
    { note: 'E', octave: 5, freq: 659.25, label: 'E5', desc: 'Oboe' },
    { note: 'A', octave: 5, freq: 880, label: 'A5', desc: 'Piccolo' },
  ],
};

const INTERVALS = [
  { name: 'm2', semitones: 1, label: 'Minor 2nd' },
  { name: 'M2', semitones: 2, label: 'Major 2nd' },
  { name: 'm3', semitones: 3, label: 'Minor 3rd' },
  { name: 'M3', semitones: 4, label: 'Major 3rd' },
  { name: 'P4', semitones: 5, label: 'Perfect 4th' },
  { name: 'TT', semitones: 6, label: 'Tritone' },
  { name: 'P5', semitones: 7, label: 'Perfect 5th' },
  { name: 'm6', semitones: 8, label: 'Minor 6th' },
  { name: 'M6', semitones: 9, label: 'Major 6th' },
  { name: 'm7', semitones: 10, label: 'Minor 7th' },
  { name: 'M7', semitones: 11, label: 'Major 7th' },
  { name: 'P8', semitones: 12, label: 'Octave' },
];

function frequencyToNote(freq) {
  if (!freq || freq < 20) return { note: '--', octave: '', cents: 0 };
  const noteNum = 12 * (Math.log2(freq / A4_FREQ));
  const noteIndex = Math.round(noteNum) + 57;
  const note = NOTES[noteIndex % 12];
  const octave = Math.floor(noteIndex / 12);
  const cents = Math.round((noteNum - Math.round(noteNum)) * 100);
  return { note, octave, cents };
}

function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return { freq: -1, rms };

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.15;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  const buf = buffer.slice(r1, r2);
  if (buf.length < 10) return { freq: -1, rms };
  
  const c = new Array(buf.length).fill(0);
  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < buf.length - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (d < c.length - 1 && c[d] > c[d + 1]) d++;
  
  let maxval = -1, maxpos = -1;
  for (let i = d; i < buf.length; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  if (maxpos < 1 || maxpos >= buf.length - 1) return { freq: -1, rms };

  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return { freq: sampleRate / T0, rms };
}

function generateNoteLines(minFreq, maxFreq) {
  const lines = [];
  for (let octave = 1; octave <= 7; octave++) {
    NOTES.forEach((note, i) => {
      const freq = A4_FREQ * Math.pow(2, (octave - 4) + (i - 9) / 12);
      if (freq >= minFreq && freq <= maxFreq) {
        const isC = note === 'C';
        const isA = note === 'A';
        const isNatural = !note.includes('#');
        lines.push({ 
          note: `${note}${octave}`, 
          freq, 
          major: isC || (isA && octave === 4),
          show: isNatural
        });
      }
    });
  }
  return lines;
}

export default function PitchLab() {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [noteInfo, setNoteInfo] = useState({ note: '--', octave: '', cents: 0 });
  const [stability, setStability] = useState(0);
  const [volume, setVolume] = useState(60);
  const [inputLevel, setInputLevel] = useState(0);
  const [breathLevel, setBreathLevel] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Concert');
  const [selectedInterval, setSelectedInterval] = useState(INTERVALS[6]);
  const [autoInterval, setAutoInterval] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [targetFreq, setTargetFreq] = useState(null);
  const [playingRef, setPlayingRef] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [centerFreq, setCenterFreq] = useState(350);
  const [cameraOpacity, setCameraOpacity] = useState(40);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [bottomSheetTab, setBottomSheetTab] = useState('interval');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const hasAutoStartedRef = useRef(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const animationRef = useRef(null);
  const pitchHistoryRef = useRef([]);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const stableNoteDataRef = useRef({ note: '', count: 0, freq: 0 });
  const spectroDataRef = useRef([]);
  const activeOscillatorsRef = useRef([]);
  const peakLevelRef = useRef(0);
  const peakDecayRef = useRef(0);
  const intervalVoiceRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const autoAdjustRangeRef = useRef({ min: 80, max: 800 });
  
  const getFreqRange = useCallback(() => {
    const autoRange = autoAdjustRangeRef.current;
    const baseMin = autoRange.min;
    const baseMax = autoRange.max;
    
    const logMin = Math.log2(baseMin);
    const logMax = Math.log2(baseMax);
    const logCenter = Math.log2(centerFreq);
    const logRange = (logMax - logMin) / zoomLevel;
    
    let newLogMin = logCenter - logRange / 2;
    let newLogMax = logCenter + logRange / 2;
    
    const absoluteMin = 60;
    const absoluteMax = 2100;
    
    if (newLogMin < Math.log2(absoluteMin)) {
      newLogMin = Math.log2(absoluteMin);
      newLogMax = newLogMin + logRange;
    }
    if (newLogMax > Math.log2(absoluteMax)) {
      newLogMax = Math.log2(absoluteMax);
      newLogMin = newLogMax - logRange;
    }
    
    return { 
      min: Math.pow(2, newLogMin), 
      max: Math.pow(2, newLogMax) 
    };
  }, [zoomLevel, centerFreq]);

  const freqToY = useCallback((freq, height) => {
    const { min, max } = getFreqRange();
    if (freq < min) return height;
    if (freq > max) return 0;
    return height - ((Math.log2(freq / min) / Math.log2(max / min)) * height);
  }, [getFreqRange]);

  const getNoteColor = useCallback((note, alpha = 1) => {
    const colors = {
      'C': `rgba(239, 68, 68, ${alpha})`,
      'D': `rgba(249, 115, 22, ${alpha})`,
      'E': `rgba(234, 179, 8, ${alpha})`,
      'F': `rgba(34, 197, 94, ${alpha})`,
      'G': `rgba(6, 182, 212, ${alpha})`,
      'A': `rgba(99, 102, 241, ${alpha})`,
      'B': `rgba(168, 85, 247, ${alpha})`,
    };
    const baseName = note.replace(/[0-9#]/g, '');
    return colors[baseName] || `rgba(255, 255, 255, ${alpha})`;
  }, []);

  const renderSpectrogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    
    const width = rect.width;
    const height = rect.height;
    const data = spectroDataRef.current;
    const labelWidth = 50;
    const { min: minFreq, max: maxFreq } = getFreqRange();
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Background
    if (cameraOn && cameraReady) {
      ctx.clearRect(0, 0, width, height);
      const overlayOpacity = Math.max(0.3, 0.8 - (cameraOpacity / 100) * 0.5);
      ctx.fillStyle = `rgba(10, 10, 15, ${overlayOpacity})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0c0c14');
      bgGrad.addColorStop(0.5, '#08080f');
      bgGrad.addColorStop(1, '#0a0a12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Note lines with non-overlapping labels
    const noteLines = generateNoteLines(minFreq * 0.85, maxFreq * 1.15);
    const drawnLabels = [];
    const minLabelSpacing = 28;
    
    noteLines.forEach(({ note, freq, major, show }) => {
      const y = freqToY(freq, height);
      if (y > 5 && y < height - 5) {
        // Draw line
        if (show) {
          const lineAlpha = major ? 0.25 : 0.08;
          ctx.strokeStyle = getNoteColor(note, lineAlpha);
          ctx.lineWidth = major ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(labelWidth, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        
        // Check if label would overlap
        if (show) {
          const canDrawLabel = drawnLabels.every(prevY => Math.abs(prevY - y) >= minLabelSpacing);
          
          if (canDrawLabel) {
            drawnLabels.push(y);
            
            const pillHeight = major ? 20 : 16;
            const pillWidth = major ? 42 : 36;
            const pillX = 4;
            const pillY = y - pillHeight / 2;
            
            // Pill background
            ctx.fillStyle = getNoteColor(note, major ? 0.2 : 0.1);
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
            ctx.fill();
            
            // Pill border
            ctx.strokeStyle = getNoteColor(note, major ? 0.4 : 0.2);
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Note text
            ctx.font = `${major ? '600 11px' : '500 10px'} -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.fillStyle = getNoteColor(note, major ? 0.95 : 0.75);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(note, pillX + pillWidth / 2, y);
          }
        }
      }
    });
    
    // Target line
    if (targetFreq && targetFreq >= minFreq * 0.9 && targetFreq <= maxFreq * 1.1) {
      const targetY = freqToY(targetFreq, height);
      
      const glowGrad = ctx.createLinearGradient(0, targetY - 30, 0, targetY + 30);
      glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0)');
      glowGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
      glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(labelWidth, targetY - 30, width - labelWidth, 60);
      
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(labelWidth, targetY);
      ctx.lineTo(width, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Target badge
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.beginPath();
      ctx.roundRect(width - 70, targetY - 10, 60, 20, 5);
      ctx.fill();
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(147, 197, 253, 1)';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET', width - 40, targetY + 1);
    }
    
    // Pitch trail
    if (data.length > 1) {
      const validPoints = [];
      const graphWidth = width - labelWidth;
      
      data.forEach((point, i) => {
        if (point.freq >= minFreq * 0.7 && point.freq <= maxFreq * 1.3) {
          const noteInfo = frequencyToNote(point.freq);
          validPoints.push({
            x: labelWidth + ((i / Math.max(data.length - 1, 1)) * graphWidth),
            y: freqToY(point.freq, height),
            freq: point.freq,
            note: noteInfo.note
          });
        }
      });
      
      if (validPoints.length > 1) {
        // Trail glow
        for (let i = 1; i < validPoints.length; i++) {
          const prev = validPoints[i - 1];
          const curr = validPoints[i];
          const alpha = 0.3 + (i / validPoints.length) * 0.7;
          
          ctx.shadowColor = getNoteColor(curr.note, 1);
          ctx.shadowBlur = 15;
          ctx.strokeStyle = getNoteColor(curr.note, alpha * 0.8);
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
        
        // White core
        ctx.shadowBlur = 0;
        for (let i = 1; i < validPoints.length; i++) {
          const prev = validPoints[i - 1];
          const curr = validPoints[i];
          const alpha = 0.4 + (i / validPoints.length) * 0.6;
          
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
        
        // Current position dot
        const last = validPoints[validPoints.length - 1];
        const lastNoteColor = getNoteColor(last.note);
        
        ctx.beginPath();
        ctx.arc(last.x, last.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = getNoteColor(last.note, 0.25);
        ctx.shadowColor = lastNoteColor;
        ctx.shadowBlur = 25;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = lastNoteColor;
        ctx.shadowBlur = 15;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    }
    
    // Edge fades
    const fadeTop = ctx.createLinearGradient(0, 0, 0, 15);
    fadeTop.addColorStop(0, 'rgba(10,10,18,0.9)');
    fadeTop.addColorStop(1, 'rgba(10,10,18,0)');
    ctx.fillStyle = fadeTop;
    ctx.fillRect(0, 0, width, 15);
    
    const fadeBottom = ctx.createLinearGradient(0, height - 15, 0, height);
    fadeBottom.addColorStop(0, 'rgba(10,10,18,0)');
    fadeBottom.addColorStop(1, 'rgba(10,10,18,0.9)');
    ctx.fillStyle = fadeBottom;
    ctx.fillRect(0, height - 15, width, 15);
    
    ctx.restore();
  }, [freqToY, targetFreq, getFreqRange, getNoteColor, cameraOn, cameraReady, cameraOpacity]);

  // Professional synthesizer
  const playProfessionalTone = useCallback((freq, duration = 2) => {
    const ctx = getAudioContext();
    
    activeOscillatorsRef.current.forEach(({ osc, gain }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        setTimeout(() => osc.stop(), 100);
      } catch(e) {}
    });
    activeOscillatorsRef.current = [];

    const masterGain = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    const harmonics = [
      { ratio: 1, gain: 1, type: 'sine' },
      { ratio: 2, gain: 0.35, type: 'sine' },
      { ratio: 3, gain: 0.12, type: 'sine' },
      { ratio: 4, gain: 0.06, type: 'sine' },
    ];

    const maxVol = (volume / 100) * 0.15;
    const now = ctx.currentTime;

    harmonics.forEach(({ ratio, gain: harmGain, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq * ratio;
      
      if (ratio === 1) {
        const detunedOsc = ctx.createOscillator();
        const detunedGain = ctx.createGain();
        detunedOsc.type = 'sine';
        detunedOsc.frequency.value = freq * 1.002;
        detunedGain.gain.value = maxVol * 0.25;
        detunedOsc.connect(detunedGain);
        detunedGain.connect(masterGain);
        detunedOsc.start(now);
        detunedOsc.stop(now + duration);
      }
      
      gain.gain.value = maxVol * harmGain;
      osc.connect(gain);
      gain.connect(masterGain);
      
      activeOscillatorsRef.current.push({ osc, gain });
      osc.start(now);
      osc.stop(now + duration);
    });

    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(1, now + 0.02);
    masterGain.gain.setValueAtTime(1, now + 0.02);
    masterGain.gain.linearRampToValueAtTime(0.7, now + 0.1);
    masterGain.gain.setValueAtTime(0.7, now + duration - 0.4);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  }, [volume, getAudioContext]);

  // Interval tone engine
  const startIntervalTone = useCallback((freq) => {
    if (intervalVoiceRef.current?.isPlaying) {
      const oldVoice = intervalVoiceRef.current;
      oldVoice.isPlaying = false;
      const ctx = audioContextRef.current;
      if (ctx) {
        const now = ctx.currentTime;
        try {
          oldVoice.masterGain.gain.setValueAtTime(oldVoice.masterGain.gain.value, now);
          oldVoice.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        } catch(e) {}
        setTimeout(() => {
          oldVoice.oscillators.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch(e) {}
          });
        }, 150);
      }
    }
    
    const ctx = getAudioContext();
    
    const voice = {
      oscillators: [],
      gains: [],
      masterGain: ctx.createGain(),
      isPlaying: true
    };
    
    const harmonics = [
      { ratio: 1, gain: 1.0, type: 'sine' },
      { ratio: 2, gain: 0.2, type: 'sine' },
      { ratio: 3, gain: 0.06, type: 'sine' },
    ];
    
    const maxVol = (volume / 100) * 0.15;
    const now = ctx.currentTime;
    
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 40;
    compressor.ratio.value = 4;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    filter.Q.value = 0.5;
    
    voice.masterGain.connect(filter);
    filter.connect(compressor);
    compressor.connect(ctx.destination);
    
    harmonics.forEach(({ ratio, gain: harmGain, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq * ratio;
      
      if (ratio === 1) {
        const chorusOsc = ctx.createOscillator();
        const chorusGain = ctx.createGain();
        chorusOsc.type = 'sine';
        chorusOsc.frequency.value = freq * 1.002;
        chorusGain.gain.value = maxVol * 0.15;
        chorusOsc.connect(chorusGain);
        chorusGain.connect(voice.masterGain);
        chorusOsc.start(now);
        voice.oscillators.push(chorusOsc);
      }
      
      gain.gain.value = maxVol * harmGain;
      osc.connect(gain);
      gain.connect(voice.masterGain);
      
      voice.oscillators.push(osc);
      voice.gains.push(gain);
      osc.start(now);
    });
    
    voice.masterGain.gain.setValueAtTime(0, now);
    voice.masterGain.gain.linearRampToValueAtTime(1, now + 0.4);
    
    intervalVoiceRef.current = voice;
  }, [volume, getAudioContext]);

  const stopIntervalTone = useCallback(() => {
    if (!intervalVoiceRef.current || !intervalVoiceRef.current.isPlaying) return;
    
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return;
    
    const voice = intervalVoiceRef.current;
    voice.isPlaying = false;
    
    const now = ctx.currentTime;
    
    try {
      voice.masterGain.gain.cancelScheduledValues(now);
      voice.masterGain.gain.setValueAtTime(voice.masterGain.gain.value, now);
      voice.masterGain.gain.linearRampToValueAtTime(0.001, now + 1.2);
    } catch(e) {}
    
    const voiceToCleanup = voice;
    setTimeout(() => {
      voiceToCleanup.oscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch(e) {}
      });
      if (intervalVoiceRef.current === voiceToCleanup) {
        intervalVoiceRef.current = null;
      }
    }, 1300);
  }, []);

  const playIntervalResponse = useCallback((baseFreq, detectedNote) => {
    if (!autoInterval || !selectedInterval) {
      if (intervalVoiceRef.current?.isPlaying) stopIntervalTone();
      stableNoteDataRef.current = { note: '', count: 0, freq: 0 };
      return;
    }
    
    const stableData = stableNoteDataRef.current;
    
    if (detectedNote !== stableData.note) {
      if (intervalVoiceRef.current?.isPlaying) stopIntervalTone();
      stableNoteDataRef.current = { note: detectedNote, count: 1, freq: baseFreq };
      return;
    }
    
    stableData.count++;
    stableData.freq = (stableData.freq * 0.9) + (baseFreq * 0.1);
    
    if (stableData.count >= 12 && !intervalVoiceRef.current?.isPlaying) {
      const intervalFreq = stableData.freq * Math.pow(2, selectedInterval.semitones / 12);
      startIntervalTone(intervalFreq);
    }
  }, [autoInterval, selectedInterval, startIntervalTone, stopIntervalTone]);

  // Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      setCameraOn(true);
      
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      
      videoStreamRef.current = stream;
      
      const tryAttachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => setCameraReady(true)).catch(e => console.error(e));
          };
        } else {
          setTimeout(tryAttachStream, 50);
        }
      };
      tryAttachStream();
      
    } catch (err) {
      console.error('Camera error:', err);
      setCameraOn(false);
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setCameraReady(false);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      micStreamRef.current = stream;

      const audioContext = getAudioContext();
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const detect = () => {
        analyser.getFloatTimeDomainData(buffer);
        analyser.getByteFrequencyData(freqData);
        
        const { freq, rms } = autoCorrelate(buffer, audioContext.sampleRate);
        
        const dbLevel = rms > 0 ? 20 * Math.log10(rms) + 60 : 0;
        const normalizedLevel = Math.max(0, Math.min(100, dbLevel * 1.8));
        
        if (normalizedLevel > peakLevelRef.current) {
          peakLevelRef.current = normalizedLevel;
          peakDecayRef.current = 0;
        } else {
          peakDecayRef.current++;
          if (peakDecayRef.current > 30) {
            peakLevelRef.current = Math.max(normalizedLevel, peakLevelRef.current - 2);
          }
        }
        
        setInputLevel(normalizedLevel);
        
        const nyquist = audioContext.sampleRate / 2;
        const lowBinEnd = Math.floor(400 / nyquist * freqData.length);
        const midBinEnd = Math.floor(2000 / nyquist * freqData.length);
        
        let lowSum = 0, midSum = 0;
        for (let i = 1; i < lowBinEnd; i++) lowSum += freqData[i];
        for (let i = lowBinEnd; i < midBinEnd; i++) midSum += freqData[i];
        
        const lowAvg = lowSum / lowBinEnd;
        const midAvg = midSum / (midBinEnd - lowBinEnd);
        const breathRatio = lowAvg / (midAvg + 1);
        const breathValue = Math.min(100, breathRatio * 8 + lowAvg * 0.3);
        
        setBreathLevel(prev => prev * 0.7 + breathValue * 0.3);
        
        if (freq > 60 && freq < 2000) {
          setFrequency(freq);
          const info = frequencyToNote(freq);
          setNoteInfo(info);
          
          setCenterFreq(prev => prev * 0.95 + freq * 0.05);

          pitchHistoryRef.current.push(freq);
          if (pitchHistoryRef.current.length > 25) pitchHistoryRef.current.shift();

          if (pitchHistoryRef.current.length > 5) {
            const avg = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length;
            const variance = pitchHistoryRef.current.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0) / pitchHistoryRef.current.length;
            const stab = Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 1.5));
            setStability(stab);
            
            if (stab > 55 && info.note !== '--') {
              playIntervalResponse(freq, `${info.note}${info.octave}`);
            } else if (stab < 35 && intervalVoiceRef.current?.isPlaying) {
              stopIntervalTone();
              stableNoteDataRef.current = { note: '', count: 0, freq: 0 };
            }
          }

          spectroDataRef.current.push({ freq, time: Date.now() });
          if (spectroDataRef.current.length > 200) spectroDataRef.current.shift();
        } else {
          if (intervalVoiceRef.current?.isPlaying) {
            stopIntervalTone();
            stableNoteDataRef.current = { note: '', count: 0, freq: 0 };
          }
        }
        
        renderSpectrogram();
        animationRef.current = requestAnimationFrame(detect);
      };

      detect();
      setIsListening(true);
    } catch (err) {
      console.error('Mic error:', err);
    }
  }, [playIntervalResponse, renderSpectrogram, getAudioContext, stopIntervalTone]);

  const stopListening = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (intervalVoiceRef.current?.isPlaying) stopIntervalTone();
    setIsListening(false);
    setFrequency(0);
    setNoteInfo({ note: '--', octave: '', cents: 0 });
    setStability(0);
    setInputLevel(0);
    setBreathLevel(0);
    pitchHistoryRef.current = [];
    spectroDataRef.current = [];
  }, [stopIntervalTone]);

  const playReference = useCallback((ref) => {
    setTargetFreq(ref.freq);
    setPlayingRef(ref.label);
    setCenterFreq(ref.freq);
    playProfessionalTone(ref.freq, 2.5);
    setTimeout(() => setPlayingRef(null), 2500);
  }, [playProfessionalTone]);

  // Navigation handlers
  const handleScrollUp = useCallback(() => {
    setCenterFreq(f => Math.min(1800, f * 1.12));
  }, []);
  
  const handleScrollDown = useCallback(() => {
    setCenterFreq(f => Math.max(80, f / 1.12));
  }, []);

  const handleScrollLeft = useCallback(() => {
    setZoomLevel(z => Math.max(0.5, z / 1.3));
  }, []);

  const handleScrollRight = useCallback(() => {
    setZoomLevel(z => Math.min(5, z * 1.3));
  }, []);

  useEffect(() => {
    if (frequency > 60) {
      const currentRange = autoAdjustRangeRef.current;
      if (frequency > currentRange.max * 0.85) {
        autoAdjustRangeRef.current = { min: currentRange.min, max: Math.min(2100, frequency * 1.4) };
      } else if (frequency < currentRange.min * 1.15) {
        autoAdjustRangeRef.current = { min: Math.max(60, frequency * 0.7), max: currentRange.max };
      }
    }
  }, [frequency]);

  useEffect(() => {
    let animationId;
    const loop = () => {
      renderSpectrogram();
      animationId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationId);
  }, [renderSpectrogram]);

  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [startListening]);

  useEffect(() => {
    return () => {
      stopListening();
      stopCamera();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopListening, stopCamera]);

  const getCentsColor = () => {
    const absCents = Math.abs(noteInfo.cents);
    if (absCents < 5) return { text: 'text-emerald-400', bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50' };
    if (absCents < 10) return { text: 'text-green-400', bg: 'bg-green-500', glow: 'shadow-green-500/50' };
    if (absCents < 20) return { text: 'text-yellow-400', bg: 'bg-yellow-500', glow: 'shadow-yellow-500/50' };
    return { text: 'text-orange-400', bg: 'bg-orange-500', glow: 'shadow-orange-500/50' };
  };

  const centsStyle = getCentsColor();

  // Show Analysis Tab
  if (showAnalysis) {
    return <AnalysisTab onClose={() => setShowAnalysis(false)} />;
  }

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Header */}
          <div className="pt-6 pb-2 px-5 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${isListening ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-xs font-semibold text-white/50 tracking-wider">PITCH LAB PRO</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Analysis Tab Button */}
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 hover:from-violet-500/30 hover:to-purple-500/30 border border-violet-500/30"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <button
                  onClick={cameraOn ? stopCamera : startCamera}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${cameraOn ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`h-9 px-4 rounded-full font-semibold text-xs transition-all flex items-center gap-1.5 ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-cyan-500 text-white hover:bg-cyan-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isListening ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          </div>

          {/* Note Display */}
          <div className="px-5 py-4">
            <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
              <div className="flex items-center justify-center gap-6">
                <div className="relative">
                  <span className={`text-6xl font-extralight tracking-tight ${centsStyle.text} transition-colors`}>
                    {noteInfo.note}
                  </span>
                  <span className="absolute -right-4 top-1 text-xl text-white/25 font-light">{noteInfo.octave}</span>
                </div>
                
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-xl font-mono font-medium ${centsStyle.text}`}>
                    {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents}<span className="text-xs opacity-60">¢</span>
                  </span>
                  <span className="text-white/30 text-xs font-mono">
                    {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '—'}
                  </span>
                </div>
                
                <div className="w-20">
                  <div className="relative h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/10 -translate-x-1/2" />
                    <div 
                      className={`absolute top-1/2 w-3.5 h-3.5 rounded-full ${centsStyle.bg} transition-all duration-75 shadow-lg ${centsStyle.glow}`}
                      style={{ left: `${Math.max(8, Math.min(92, 50 + (noteInfo.cents / 50) * 42))}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spectrogram */}
          <div className="px-5 pb-3">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0a12]">
              {cameraOn && (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)', opacity: cameraOpacity / 100 }}
                />
              )}
              <canvas ref={canvasRef} className="relative w-full h-[35vh] min-h-[200px]" />
              
              {/* Navigation Controls */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Left/Right nav */}
                <button onClick={handleScrollLeft} className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 w-8 h-16 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/50 hover:text-white/80 transition-all active:scale-95">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={handleScrollRight} className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 w-8 h-16 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/50 hover:text-white/80 transition-all active:scale-95">
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Up/Down nav */}
                <button onClick={handleScrollUp} className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 w-16 h-8 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/50 hover:text-white/80 transition-all active:scale-95">
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button onClick={handleScrollDown} className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-8 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/50 hover:text-white/80 transition-all active:scale-95">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              
              {/* Zoom indicator */}
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-[10px] text-white/50 font-mono">
                {zoomLevel.toFixed(1)}×
              </div>
            </div>
          </div>

          {/* Meters */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {/* Level */}
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span className="text-[9px] text-white/40 font-medium">LEVEL</span>
                </div>
                <div className="flex items-end justify-center gap-[2px] h-8">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const threshold = (i / 10) * 100;
                    const active = inputLevel > threshold;
                    const color = i < 6 ? 'bg-cyan-500' : i < 8 ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                      <div
                        key={i}
                        className={`w-[4px] rounded-sm transition-all ${active ? color : 'bg-white/[0.08]'}`}
                        style={{ height: `${(i + 1) * 9}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Air/Breath */}
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wind className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] text-white/40 font-medium">AIR</span>
                </div>
                <div className="h-8 bg-black/40 rounded-lg overflow-hidden relative border border-white/[0.06]">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-cyan-400/50 transition-all duration-100"
                    style={{ height: `${breathLevel}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/90">{breathLevel.toFixed(0)}</span>
                </div>
              </div>

              {/* Stability */}
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] text-white/40 font-medium">STABLE</span>
                </div>
                <div className="h-8 flex flex-col justify-center">
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all" style={{ width: `${stability}%` }} />
                  </div>
                  <span className="text-center text-[10px] text-white/50 font-mono mt-1">{stability.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Camera Controls */}
          {cameraOn && cameraReady && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2 border border-white/[0.04]">
                <span className="text-[10px] text-white/40 pl-2">Camera</span>
                <Slider
                  value={[cameraOpacity]}
                  onValueChange={(v) => setCameraOpacity(v[0])}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-white/50 w-8 pr-2">{cameraOpacity}%</span>
              </div>
            </div>
          )}

          {/* Controls Section */}
          <div className="bg-black/30 px-5 py-5 space-y-4">
            {/* Auto Interval */}
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${autoInterval ? 'text-amber-400' : 'text-white/40'}`} />
                <div>
                  <p className="text-sm font-medium text-white/80">Auto Interval</p>
                  <p className="text-[10px] text-white/40">Plays harmony on stable notes</p>
                </div>
              </div>
              <Switch checked={autoInterval} onCheckedChange={setAutoInterval} />
            </div>
            
            {autoInterval && (
              <div className="grid grid-cols-6 gap-1.5">
                {INTERVALS.map(int => (
                  <button
                    key={int.name}
                    onClick={() => setSelectedInterval(int)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedInterval?.name === int.name
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    {int.name}
                  </button>
                ))}
              </div>
            )}

            {/* Reference Tones */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-blue-400" />
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Reference Tones</label>
              </div>
              
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-2">
                {Object.keys(ORCHESTRAL_REFERENCES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-500/25 text-blue-300'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                {ORCHESTRAL_REFERENCES[selectedCategory]?.map((ref, i) => (
                  <button
                    key={i}
                    onClick={() => playReference(ref)}
                    className={`py-2 px-3 rounded-xl text-left transition-all border ${
                      playingRef === ref.label
                        ? 'bg-blue-500/25 text-blue-300 border-blue-500/40'
                        : 'bg-white/[0.04] text-white/70 border-transparent hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{ref.label}</span>
                    <span className="text-[9px] text-white/40">{ref.desc}</span>
                  </button>
                ))}
              </div>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}