import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Music } from 'lucide-react';

// All chromatic notes with frequencies (A4 = 440Hz)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard guitar tuning
const GUITAR_STRINGS = [
  { name: 'E', string: 6, frequency: 82.41, octave: 2 },
  { name: 'A', string: 5, frequency: 110.00, octave: 2 },
  { name: 'D', string: 4, frequency: 146.83, octave: 3 },
  { name: 'G', string: 3, frequency: 196.00, octave: 3 },
  { name: 'B', string: 2, frequency: 246.94, octave: 3 },
  { name: 'E', string: 1, frequency: 329.63, octave: 4 },
];

// Find closest guitar string
const findClosestString = (freq) => {
  let closest = GUITAR_STRINGS[0];
  let minDiff = Infinity;
  
  GUITAR_STRINGS.forEach(s => {
    const diff = Math.abs(freq - s.frequency);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  });
  
  return closest;
};

export default function Tuner() {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [closestString, setClosestString] = useState(null);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);
  const [hasSignal, setHasSignal] = useState(false);
  
  // Smooth animated values for display
  const [displayCents, setDisplayCents] = useState(0);
  const [displayFrequency, setDisplayFrequency] = useState(0);
  const [needleOpacity, setNeedleOpacity] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const playContextRef = useRef(null);
  
  // Smoothing refs for professional feel
  const smoothedCentsRef = useRef(0);
  const smoothedFreqRef = useRef(0);
  const lastValidTimeRef = useRef(0);
  const signalHistoryRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Autocorrelation with YIN improvements for better accuracy
  const detectPitch = useCallback((buffer, sampleRate) => {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    const threshold = 0.1;
    
    // Find RMS for signal detection
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);
    
    if (rms < 0.008) return { frequency: -1, rms }; // Very low signal threshold
    
    // Normalized autocorrelation
    const correlations = new Float32Array(MAX_SAMPLES);
    
    for (let lag = 0; lag < MAX_SAMPLES; lag++) {
      let sum = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum;
    }
    
    // Normalize
    const c0 = correlations[0];
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlations[i] /= c0;
    }
    
    // Find the first peak after going below threshold
    let foundPeak = false;
    let bestLag = -1;
    let bestCorr = threshold;
    
    for (let lag = Math.floor(sampleRate / 500); lag < Math.floor(sampleRate / 60); lag++) {
      if (correlations[lag] < threshold) {
        foundPeak = true;
      }
      if (foundPeak && correlations[lag] > bestCorr) {
        bestCorr = correlations[lag];
        bestLag = lag;
      }
    }
    
    if (bestLag === -1) return { frequency: -1, rms };
    
    // Parabolic interpolation for sub-sample accuracy
    const y1 = correlations[bestLag - 1] || 0;
    const y2 = correlations[bestLag];
    const y3 = correlations[bestLag + 1] || 0;
    
    const a = (y1 + y3 - 2 * y2) / 2;
    const b = (y3 - y1) / 2;
    
    let refinedLag = bestLag;
    if (a !== 0) {
      refinedLag = bestLag - b / (2 * a);
    }
    
    const detectedFreq = sampleRate / refinedLag;
    
    // Confidence based on correlation strength
    const confidence = bestCorr;
    
    return { frequency: detectedFreq, rms, confidence };
  }, []);

  // Smooth animation loop - runs independently for fluid motion
  const animateNeedle = useCallback(() => {
    const now = performance.now();
    const timeSinceValid = now - lastValidTimeRef.current;
    
    // Smooth interpolation factor - higher = more responsive, lower = smoother
    const lerpFactor = 0.15;
    const decayTime = 800; // ms before needle starts fading
    const fadeTime = 400; // ms for fade out
    
    // Smoothly interpolate displayed cents
    const targetCents = smoothedCentsRef.current;
    setDisplayCents(prev => {
      const diff = targetCents - prev;
      if (Math.abs(diff) < 0.1) return targetCents;
      return prev + diff * lerpFactor;
    });
    
    // Smoothly interpolate displayed frequency
    setDisplayFrequency(prev => {
      const diff = smoothedFreqRef.current - prev;
      if (Math.abs(diff) < 0.1) return smoothedFreqRef.current;
      return prev + diff * lerpFactor;
    });
    
    // Handle needle opacity - fade when no signal
    if (timeSinceValid < decayTime) {
      setNeedleOpacity(1);
    } else if (timeSinceValid < decayTime + fadeTime) {
      const fadeProgress = (timeSinceValid - decayTime) / fadeTime;
      setNeedleOpacity(1 - fadeProgress);
    } else {
      setNeedleOpacity(0);
      // Gently return needle to center when faded
      smoothedCentsRef.current *= 0.95;
    }
    
    animationFrameRef.current = requestAnimationFrame(animateNeedle);
  }, []);

  // Main detection loop
  const detect = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const result = detectPitch(buffer, audioContextRef.current.sampleRate);
    const { frequency: detectedFreq, rms, confidence } = result;
    
    // Update volume meter
    const vol = Math.min(100, Math.round(rms * 600));
    setVolume(vol);
    
    // Valid pitch detection
    if (detectedFreq > 60 && detectedFreq < 500 && confidence > 0.8) {
      // Add to signal history for stability
      signalHistoryRef.current.push({ freq: detectedFreq, time: performance.now() });
      if (signalHistoryRef.current.length > 5) signalHistoryRef.current.shift();
      
      // Calculate median of recent readings for stability
      const recentFreqs = signalHistoryRef.current.map(s => s.freq);
      recentFreqs.sort((a, b) => a - b);
      const medianFreq = recentFreqs[Math.floor(recentFreqs.length / 2)];
      
      const guitarString = findClosestString(medianFreq);
      const stringCents = 1200 * Math.log2(medianFreq / guitarString.frequency);
      const clampedCents = Math.max(-50, Math.min(50, stringCents));
      
      // Update target values for smooth animation
      smoothedFreqRef.current = medianFreq;
      smoothedCentsRef.current = clampedCents;
      lastValidTimeRef.current = performance.now();
      
      setFrequency(medianFreq);
      setCents(Math.round(clampedCents));
      setClosestString(guitarString);
      setHasSignal(true);
    } else if (rms > 0.01) {
      // Has audio but no clear pitch - show activity
      setHasSignal(true);
    } else {
      setHasSignal(false);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [detectPitch]);

  // Start listening
  const startListening = async () => {
    try {
      setError(null);
      signalHistoryRef.current = [];
      lastValidTimeRef.current = performance.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Resume audio context (required for iOS)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0;

      // Add gain for better signal
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 2.0;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(gainNode);
      gainNode.connect(analyserRef.current);

      setIsListening(true);
      
      // Start both loops
      detect();
      animateNeedle();
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Please allow microphone access to use the tuner');
    }
  };

  // Stop listening
  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsListening(false);
    setFrequency(0);
    setCents(0);
    setClosestString(null);
    setVolume(0);
    setHasSignal(false);
    setDisplayCents(0);
    setDisplayFrequency(0);
    setNeedleOpacity(0);
    signalHistoryRef.current = [];
  }, []);

  // Play reference tone
  const playTone = (freq) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!playContextRef.current || playContextRef.current.state === 'closed') {
      playContextRef.current = new AudioContextClass();
    }
    
    const ctx = playContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = freq;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  };

  useEffect(() => {
    return () => {
      stopListening();
      if (playContextRef.current && playContextRef.current.state !== 'closed') {
        playContextRef.current.close();
      }
    };
  }, [stopListening]);

  // Determine tuning status
  const getTuningStatus = () => {
    if (!closestString || needleOpacity < 0.5) return { text: 'Play a string', color: 'text-white/60' };
    const absCents = Math.abs(cents);
    if (absCents <= 3) return { text: 'In Tune', color: 'text-emerald-400' };
    if (absCents <= 10) return { text: cents > 0 ? 'Slightly Sharp' : 'Slightly Flat', color: 'text-amber-400' };
    return { text: cents > 0 ? 'Sharp ↑' : 'Flat ↓', color: 'text-rose-400' };
  };

  const status = getTuningStatus();
  const inTune = closestString && Math.abs(cents) <= 3 && needleOpacity > 0.5;

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style matching Metronome */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Note Display */}
          <div className="pt-10 pb-6 px-8 text-center relative">
            <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${inTune ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
            </div>
            
            {/* Status Indicator */}
            {isListening && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  inTune ? 'bg-emerald-400' : hasSignal ? 'bg-amber-400 animate-pulse' : 'bg-white/30'
                }`} />
                <span className={`text-sm font-medium uppercase tracking-wider ${status.color}`}>
                  {status.text}
                </span>
              </div>
            )}
            
            {/* Giant Note */}
            <div 
              className={`text-[7rem] font-extralight tracking-tight leading-none transition-all duration-300 ${
                inTune ? 'text-emerald-400' : closestString && needleOpacity > 0.3 ? 'text-white' : 'text-white/20'
              }`}
              style={{ 
                textShadow: inTune ? '0 0 60px rgba(52, 211, 153, 0.5)' : 'none',
                opacity: closestString ? Math.max(0.2, needleOpacity) : 0.2
              }}
            >
              {closestString ? closestString.name : '—'}
            </div>
            
            {/* String & Frequency Info */}
            <div className="text-sm font-medium text-white/40 uppercase tracking-[0.3em] mt-2">
              {closestString ? (
                <span style={{ opacity: needleOpacity }}>
                  String {closestString.string} • {closestString.frequency.toFixed(0)} Hz
                </span>
              ) : (
                'Play a note'
              )}
            </div>
          </div>

          {/* Tuning Meter */}
          <div className="px-8 pb-6">
            <div className="h-24 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 overflow-hidden relative">
              {/* Gradient zones */}
              <div className="absolute inset-0 flex">
                <div className="flex-1 bg-gradient-to-r from-rose-500/15 to-transparent" />
                <div className="w-24 bg-emerald-500/20" />
                <div className="flex-1 bg-gradient-to-l from-rose-500/15 to-transparent" />
              </div>

              {/* Tick marks */}
              <div className="absolute inset-0 flex items-center justify-center">
                {Array.from({ length: 11 }, (_, i) => {
                  const value = (i - 5) * 10;
                  const isCenter = value === 0;
                  return (
                    <div
                      key={i}
                      className={`absolute ${isCenter ? 'h-12 w-1 bg-emerald-400' : 'h-6 w-0.5 bg-white/20'} rounded-full`}
                      style={{ 
                        left: `${10 + i * 8}%`,
                        boxShadow: isCenter ? '0 0 12px rgba(52, 211, 153, 0.7)' : 'none'
                      }}
                    />
                  );
                })}
              </div>

              {/* Animated needle */}
              <div
                className="absolute top-3 bottom-3 w-1.5 rounded-full transition-colors duration-200"
                style={{ 
                  left: `calc(50% + ${displayCents * 0.8}% - 3px)`,
                  opacity: needleOpacity,
                  backgroundColor: inTune ? '#34d399' : Math.abs(displayCents) <= 10 ? '#fbbf24' : '#fb7185',
                  boxShadow: inTune 
                    ? '0 0 20px rgba(52, 211, 153, 0.9), 0 0 40px rgba(52, 211, 153, 0.5)' 
                    : Math.abs(displayCents) <= 10
                      ? '0 0 16px rgba(251, 191, 36, 0.7)'
                      : '0 0 16px rgba(251, 113, 133, 0.7)'
                }}
              />
            </div>

            {/* Cents Display */}
            <div className="flex justify-between items-center mt-3 px-1">
              <span className="text-xs text-white/30">♭ Flat</span>
              <div 
                className={`px-4 py-1.5 rounded-xl text-lg font-bold transition-all duration-200 ${
                  inTune ? 'bg-emerald-500/20 text-emerald-400' : 
                  Math.abs(cents) <= 10 ? 'bg-amber-500/20 text-amber-400' : 
                  'bg-rose-500/20 text-rose-400'
                }`}
                style={{ opacity: needleOpacity > 0.3 ? 1 : 0.3 }}
              >
                {cents > 0 ? '+' : ''}{cents}¢
              </div>
              <span className="text-xs text-white/30">Sharp ♯</span>
            </div>
          </div>

          {/* Frequency Display */}
          <div className="px-8 pb-6 text-center">
            <span 
              className="text-3xl font-light text-white/50 transition-opacity duration-300"
              style={{ opacity: displayFrequency > 0 && needleOpacity > 0.3 ? needleOpacity : 0.3 }}
            >
              {displayFrequency > 0 ? displayFrequency.toFixed(1) : '—'} <span className="text-lg">Hz</span>
            </span>
          </div>

          {/* Input Level */}
          {isListening && (
            <div className="px-10 pb-6">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                  style={{ width: `${volume}%`, transition: 'width 0.05s linear' }}
                />
              </div>
            </div>
          )}

          {/* Start/Stop Button */}
          <div className="px-8 pb-8 flex justify-center">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isListening
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 shadow-xl shadow-purple-500/30'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          </div>

          {error && (
            <div className="px-8 pb-6">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <p className="text-rose-400 text-sm text-center">{error}</p>
              </div>
            </div>
          )}

          {/* String Reference Section */}
          <div className="bg-black/30 px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-4 h-4 text-white/40" />
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Reference Tones</span>
            </div>
            
            <div className="grid grid-cols-6 gap-2">
              {GUITAR_STRINGS.map((s) => {
                const isActive = closestString?.string === s.string && isListening && needleOpacity > 0.5;
                return (
                  <button
                    key={s.string}
                    onClick={() => playTone(s.frequency)}
                    className={`py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-b from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-xs mb-0.5 ${isActive ? 'text-white/80' : 'text-white/30'}`}>
                        {s.string}
                      </div>
                      <div className={`text-lg font-bold ${isActive ? 'text-white' : 'text-white/70'}`}>
                        {s.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}