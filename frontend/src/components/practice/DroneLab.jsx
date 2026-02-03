import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DRONE_TONES = ['Tanpura', 'Organ'];

const BASE_FREQUENCIES = {
  'C': 65.41, 'Db': 69.30, 'D': 73.42, 'Eb': 77.78,
  'E': 82.41, 'F': 87.31, 'Gb': 92.50, 'G': 98.00,
  'Ab': 103.83, 'A': 110.00, 'Bb': 116.54, 'B': 123.47
};

export default function DroneLab() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedKey, setSelectedKey] = useState('C');
  const [droneTone, setDroneTone] = useState('Tanpura');
  const [addFifth, setAddFifth] = useState(true);
  const [addOctave, setAddOctave] = useState(false);
  const [masterVolume, setMasterVolume] = useState(50);
  const [visualPhase, setVisualPhase] = useState(0);

  const audioContextRef = useRef(null);
  const nodesRef = useRef(null);
  const isStoppingRef = useRef(false);
  const animationRef = useRef(null);

  // Visual animation when playing
  useEffect(() => {
    if (isPlaying) {
      let frame = 0;
      const animate = () => {
        frame++;
        setVisualPhase(frame * 0.02);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setVisualPhase(0);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const cleanupAudio = useCallback(() => {
    if (nodesRef.current) {
      const { oscillators, lfos, masterGain } = nodesRef.current;
      
      // Stop all oscillators
      oscillators?.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch(e) {}
      });
      
      // Stop all LFOs
      lfos?.forEach(lfo => {
        try { lfo.osc.stop(); lfo.osc.disconnect(); lfo.gain.disconnect(); } catch(e) {}
      });
      
      // Disconnect master
      try { masterGain?.disconnect(); } catch(e) {}
      
      nodesRef.current = null;
    }
  }, []);

  const createTanpura = useCallback((ctx, frequency) => {
    const oscillators = [];
    const gains = [];
    const lfos = [];
    const output = ctx.createGain();

    const createString = (freq, brightness) => {
      // Fundamental
      const fundamental = ctx.createOscillator();
      fundamental.type = 'sine';
      fundamental.frequency.value = freq;
      const fundGain = ctx.createGain();
      fundGain.gain.value = 0.2 * brightness;
      fundamental.connect(fundGain);
      fundGain.connect(output);
      oscillators.push(fundamental);
      gains.push(fundGain);

      // Pitch drift
      const driftLFO = ctx.createOscillator();
      driftLFO.type = 'sine';
      driftLFO.frequency.value = 0.03 + Math.random() * 0.02;
      const driftGain = ctx.createGain();
      driftGain.gain.value = freq * 0.0015;
      driftLFO.connect(driftGain);
      driftGain.connect(fundamental.frequency);
      lfos.push({ osc: driftLFO, gain: driftGain });

      // Harmonics
      [2, 3, 4, 5, 6].forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * ratio * (1 + ratio * ratio * 0.00004);
        const gain = ctx.createGain();
        gain.gain.value = [0.5, 0.35, 0.25, 0.15, 0.1][idx] * brightness * 0.1;
        osc.connect(gain);
        gain.connect(output);
        oscillators.push(osc);
        gains.push(gain);
      });

      // Jawari buzz
      const buzzSaw = ctx.createOscillator();
      buzzSaw.type = 'sawtooth';
      buzzSaw.frequency.value = freq;
      const buzzFilter = ctx.createBiquadFilter();
      buzzFilter.type = 'bandpass';
      buzzFilter.frequency.value = freq * 3;
      buzzFilter.Q.value = 12;
      const buzzGain = ctx.createGain();
      buzzGain.gain.value = 0.03 * brightness;
      
      const jawariLFO = ctx.createOscillator();
      jawariLFO.type = 'sine';
      jawariLFO.frequency.value = 0.08 + Math.random() * 0.06;
      const jawariDepth = ctx.createGain();
      jawariDepth.gain.value = 0.4;
      jawariLFO.connect(jawariDepth);
      jawariDepth.connect(buzzGain.gain);
      lfos.push({ osc: jawariLFO, gain: jawariDepth });

      buzzSaw.connect(buzzFilter);
      buzzFilter.connect(buzzGain);
      buzzGain.connect(output);
      oscillators.push(buzzSaw);
      gains.push(buzzGain);
    };

    // 4 strings
    createString(frequency, 1.0);
    createString(frequency * 1.5, 0.6);
    createString(frequency * 2, 0.4);
    createString(frequency * 0.5, 0.7);

    return { oscillators, gains, lfos, output };
  }, []);

  const createOrgan = useCallback((ctx, frequency) => {
    const oscillators = [];
    const gains = [];
    const lfos = [];
    const output = ctx.createGain();

    // Drawbars
    const drawbars = [
      { feet: 16, level: 0.8 },
      { feet: 8, level: 1.0 },
      { feet: 5.33, level: 0.6 },
      { feet: 4, level: 0.7 },
      { feet: 2.67, level: 0.4 },
      { feet: 2, level: 0.5 },
      { feet: 1.6, level: 0.25 },
      { feet: 1.33, level: 0.2 },
    ];

    drawbars.forEach(db => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * (8 / db.feet);
      const gain = ctx.createGain();
      gain.gain.value = db.level * 0.06;
      osc.connect(gain);
      gain.connect(output);
      oscillators.push(osc);
      gains.push(gain);

      // Chorus pipe
      if (db.feet <= 8) {
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = frequency * (8 / db.feet);
        osc2.detune.value = 4;
        const gain2 = ctx.createGain();
        gain2.gain.value = db.level * 0.02;
        osc2.connect(gain2);
        gain2.connect(output);
        oscillators.push(osc2);
        gains.push(gain2);
      }
    });

    // Leslie effect
    const leslieLFO = ctx.createOscillator();
    leslieLFO.type = 'sine';
    leslieLFO.frequency.value = 0.7;
    const leslieAmp = ctx.createGain();
    leslieAmp.gain.value = 0.02;
    leslieLFO.connect(leslieAmp);
    leslieAmp.connect(output.gain);
    lfos.push({ osc: leslieLFO, gain: leslieAmp });

    return { oscillators, gains, lfos, output };
  }, []);

  const startDrone = useCallback(() => {
    if (isStoppingRef.current) return;
    
    // Cleanup any existing audio first
    cleanupAudio();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;

    const baseFreq = BASE_FREQUENCIES[selectedKey];
    const allOscillators = [];
    const allLfos = [];
    const allGains = [];

    // Master chain
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // Compressor
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.3;

    // Reverb
    const convolver = ctx.createConvolver();
    const reverbTime = 4;
    const length = ctx.sampleRate * reverbTime;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        channel[i] = (Math.random() * 2 - 1) * Math.exp(-1.8 * t / reverbTime) * 0.3;
      }
    }
    convolver.buffer = impulse;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.25;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.75;

    masterGain.connect(dryGain);
    masterGain.connect(convolver);
    convolver.connect(reverbGain);
    dryGain.connect(compressor);
    reverbGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Create voice based on tone
    const createVoice = droneTone === 'Tanpura' ? createTanpura : createOrgan;

    // Fundamental
    const fundamental = createVoice(ctx, baseFreq);
    fundamental.output.connect(masterGain);
    allOscillators.push(...fundamental.oscillators);
    allLfos.push(...fundamental.lfos);
    allGains.push(...fundamental.gains);

    // Fifth
    if (addFifth) {
      const fifth = createVoice(ctx, baseFreq * 1.5);
      fifth.output.gain.value = 0.5;
      fifth.output.connect(masterGain);
      allOscillators.push(...fifth.oscillators);
      allLfos.push(...fifth.lfos);
      allGains.push(...fifth.gains);
    }

    // Octave
    if (addOctave) {
      const octave = createVoice(ctx, baseFreq * 2);
      octave.output.gain.value = 0.4;
      octave.output.connect(masterGain);
      allOscillators.push(...octave.oscillators);
      allLfos.push(...octave.lfos);
      allGains.push(...octave.gains);
    }

    // Store refs
    nodesRef.current = {
      oscillators: allOscillators,
      lfos: allLfos,
      gains: allGains,
      masterGain,
      compressor,
      convolver
    };

    // Start all
    const now = ctx.currentTime;
    allOscillators.forEach(osc => {
      try { osc.start(now); } catch(e) {}
    });
    allLfos.forEach(lfo => {
      try { lfo.osc.start(now); } catch(e) {}
    });

    // Fade in
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(masterVolume / 100, now + 1.5);

    setIsPlaying(true);
  }, [selectedKey, droneTone, addFifth, addOctave, masterVolume, cleanupAudio, createTanpura, createOrgan]);

  const stopDrone = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const ctx = audioContextRef.current;
    if (!ctx || !nodesRef.current) {
      isStoppingRef.current = false;
      setIsPlaying(false);
      return;
    }

    const now = ctx.currentTime;
    const { masterGain } = nodesRef.current;

    // Fade out
    if (masterGain) {
      masterGain.gain.linearRampToValueAtTime(0, now + 1);
    }

    // Cleanup after fade
    setTimeout(() => {
      cleanupAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      isStoppingRef.current = false;
      setIsPlaying(false);
    }, 1100);
  }, [cleanupAudio]);

  // Handle key/tone change while playing
  useEffect(() => {
    if (isPlaying && !isStoppingRef.current) {
      stopDrone();
      const timeout = setTimeout(() => {
        if (!isStoppingRef.current) {
          startDrone();
        }
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [selectedKey, droneTone]);

  // Update volume in real-time
  useEffect(() => {
    if (nodesRef.current?.masterGain && audioContextRef.current) {
      const ctx = audioContextRef.current;
      nodesRef.current.masterGain.gain.linearRampToValueAtTime(
        masterVolume / 100,
        ctx.currentTime + 0.1
      );
    }
  }, [masterVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cleanupAudio]);

  // Generate visual wave rings
  const waveRings = [];
  if (isPlaying) {
    for (let i = 0; i < 5; i++) {
      const phase = (visualPhase + i * 0.4) % 2;
      const scale = 0.5 + phase * 0.5;
      const opacity = Math.max(0, 1 - phase);
      waveRings.push({ scale, opacity, delay: i * 0.15 });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black p-4 pb-safe select-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      <div className="max-w-lg mx-auto space-y-6">
        
        {/* Visual Orb */}
        <div className="relative flex items-center justify-center h-56">
          {/* Background glow */}
          <div 
            className={`absolute w-40 h-40 rounded-full transition-all duration-1000 ${
              isPlaying 
                ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30 blur-3xl scale-150' 
                : 'bg-gradient-to-br from-amber-500/10 to-orange-600/10 blur-2xl scale-100'
            }`}
          />
          
          {/* Wave rings */}
          {waveRings.map((ring, i) => (
            <div
              key={i}
              className="absolute w-32 h-32 rounded-full border-2 border-amber-400/40"
              style={{
                transform: `scale(${ring.scale * 1.5})`,
                opacity: ring.opacity * 0.6,
                transition: 'none'
              }}
            />
          ))}
          
          {/* Main orb */}
          <button
            onClick={isPlaying ? stopDrone : startDrone}
            disabled={isStoppingRef.current}
            className={`relative w-32 h-32 rounded-full transition-all duration-500 active:scale-95 ${
              isPlaying
                ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-2xl shadow-orange-500/50'
                : 'bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 shadow-xl shadow-black/50'
            }`}
          >
            {/* Inner glow */}
            <div className={`absolute inset-2 rounded-full transition-all duration-500 ${
              isPlaying 
                ? 'bg-gradient-to-br from-yellow-300/50 to-transparent' 
                : 'bg-gradient-to-br from-white/10 to-transparent'
            }`} />
            
            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isPlaying ? (
                <Square className="w-10 h-10 text-white drop-shadow-lg" />
              ) : (
                <Play className="w-10 h-10 text-white/80 ml-1 drop-shadow-lg" />
              )}
            </div>
          </button>
          
          {/* Status text */}
          <div className="absolute -bottom-2 text-center">
            <p className={`text-sm font-medium transition-colors duration-300 ${
              isPlaying ? 'text-amber-400' : 'text-gray-500'
            }`}>
              {isPlaying ? 'Playing' : 'Tap to Start'}
            </p>
          </div>
        </div>

        {/* Key Selector */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Root Note</p>
          <div className="grid grid-cols-6 gap-2">
            {KEYS.map(key => (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`h-12 rounded-xl text-lg font-semibold transition-all active:scale-95 ${
                  selectedKey === key
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Tone Selector */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Sound</p>
          <div className="grid grid-cols-2 gap-3">
            {DRONE_TONES.map(tone => (
              <button
                key={tone}
                onClick={() => setDroneTone(tone)}
                className={`h-14 rounded-2xl text-base font-semibold transition-all active:scale-95 ${
                  droneTone === tone
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Harmonics */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Harmonics</p>
          <div className="flex gap-3">
            <button
              onClick={() => setAddFifth(!addFifth)}
              className={`flex-1 h-14 rounded-2xl text-base font-semibold transition-all active:scale-95 ${
                addFifth
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5'
              }`}
            >
              + Fifth
            </button>
            <button
              onClick={() => setAddOctave(!addOctave)}
              className={`flex-1 h-14 rounded-2xl text-base font-semibold transition-all active:scale-95 ${
                addOctave
                  ? 'bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5'
              }`}
            >
              + Octave
            </button>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
          <div className="flex items-center gap-4">
            <Volume2 className={`w-5 h-5 flex-shrink-0 ${masterVolume > 0 ? 'text-amber-400' : 'text-gray-500'}`} />
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-gradient-to-br
                [&::-webkit-slider-thumb]:from-amber-400
                [&::-webkit-slider-thumb]:to-orange-500
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-orange-500/30
                [&::-webkit-slider-thumb]:cursor-pointer
              "
            />
            <span className="text-gray-400 text-sm font-mono w-10 text-right">{masterVolume}%</span>
          </div>
        </div>

        {/* Current state display */}
        <div className="text-center pb-8">
          <p className="text-gray-500 text-sm">
            {selectedKey} {droneTone}{addFifth ? ' + 5th' : ''}{addOctave ? ' + Oct' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}