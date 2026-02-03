import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_LABELS = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E/F♭', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B/C♭'];

// Premium reference tone generator
class ReferenceTone {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.isPlaying = false;
  }
  
  start(frequency) {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      
      // Premium warm tone
      this.osc.type = 'sine';
      this.osc.frequency.value = frequency;
      this.gain.gain.value = 0;
      this.gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.05);
      
      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
      this.isPlaying = true;
    } catch (e) {}
  }
  
  setFrequency(frequency) {
    if (this.osc && this.isPlaying) {
      this.osc.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.01);
    }
  }
  
  stop() {
    if (this.gain && this.ctx) {
      try {
        this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
        setTimeout(() => {
          if (this.osc) {
            this.osc.stop();
            this.osc.disconnect();
          }
          if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close();
          }
        }, 60);
      } catch (e) {}
    }
    this.osc = null;
    this.gain = null;
    this.ctx = null;
    this.isPlaying = false;
  }
}

// Smiley face component
const SmileyFace = memo(function SmileyFace({ isInTune, isActive, octave }) {
  const eyeSize = isInTune ? 6 : 5;
  const mouthCurve = isInTune ? 8 : (isActive ? 4 : 0);
  
  return (
    <motion.div 
      className="relative w-16 h-16 flex items-center justify-center"
      animate={{ scale: isInTune ? 1.1 : 1 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      {/* Eyes */}
      <div className="absolute flex gap-4" style={{ top: '35%' }}>
        <motion.div 
          className={`rounded-full ${isInTune ? 'bg-emerald-400' : 'bg-white/60'}`}
          animate={{ width: eyeSize, height: eyeSize }}
        />
        <motion.div 
          className={`rounded-full ${isInTune ? 'bg-emerald-400' : 'bg-white/60'}`}
          animate={{ width: eyeSize, height: eyeSize }}
        />
      </div>
      
      {/* Mouth */}
      <svg className="absolute" style={{ top: '55%' }} width="24" height="12" viewBox="0 0 24 12">
        <motion.path
          d={`M 2 ${6 - mouthCurve/2} Q 12 ${6 + mouthCurve} 22 ${6 - mouthCurve/2}`}
          stroke={isInTune ? '#34d399' : 'rgba(255,255,255,0.6)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ d: `M 2 ${6 - mouthCurve/2} Q 12 ${6 + mouthCurve} 22 ${6 - mouthCurve/2}` }}
        />
      </svg>
      
      {/* Octave indicator */}
      {octave > 0 && (
        <span className="absolute text-xs font-mono text-white/30" style={{ bottom: '15%' }}>
          {octave}
        </span>
      )}
    </motion.div>
  );
});

// Note wedge for the wheel
const NoteWedge = memo(function NoteWedge({ index, isActive, isPlaying, onClick, label }) {
  const angle = (index * 30) - 90; // Start from top
  const innerRadius = 70;
  const outerRadius = 110;
  
  // Calculate wedge path
  const startAngle = (angle - 15) * Math.PI / 180;
  const endAngle = (angle + 15) * Math.PI / 180;
  
  const x1 = Math.cos(startAngle) * innerRadius;
  const y1 = Math.sin(startAngle) * innerRadius;
  const x2 = Math.cos(startAngle) * outerRadius;
  const y2 = Math.sin(startAngle) * outerRadius;
  const x3 = Math.cos(endAngle) * outerRadius;
  const y3 = Math.sin(endAngle) * outerRadius;
  const x4 = Math.cos(endAngle) * innerRadius;
  const y4 = Math.sin(endAngle) * innerRadius;
  
  const path = `
    M ${x1} ${y1}
    L ${x2} ${y2}
    A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
    L ${x4} ${y4}
    A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
  `;
  
  // Label position
  const midAngle = angle * Math.PI / 180;
  const labelRadius = (innerRadius + outerRadius) / 2;
  const labelX = Math.cos(midAngle) * labelRadius;
  const labelY = Math.sin(midAngle) * labelRadius;
  
  return (
    <g onClick={onClick} className="cursor-pointer">
      <motion.path
        d={path}
        fill={isActive ? (isPlaying ? '#f59e0b' : '#3b82f6') : 'rgba(255,255,255,0.08)'}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        animate={{ 
          fill: isActive ? (isPlaying ? '#f59e0b' : '#3b82f6') : 'rgba(255,255,255,0.08)',
          scale: isActive ? 1.02 : 1
        }}
        whileHover={{ fill: 'rgba(255,255,255,0.15)' }}
        style={{ transformOrigin: 'center' }}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`text-[8px] font-medium pointer-events-none select-none ${
          isActive ? 'fill-white' : 'fill-white/50'
        }`}
      >
        {label.split('/').map((l, i) => (
          <tspan key={i} x={labelX} dy={i === 0 ? 0 : 10}>{l}</tspan>
        ))}
      </text>
    </g>
  );
});

export default memo(function PremiumTunerCircle({ 
  data, 
  isListening,
  a4Frequency = 440,
  cameraEnabled = false
}) {
  const [wheelMode, setWheelMode] = useState(false);
  const [playingNote, setPlayingNote] = useState(null);
  const [playingOctave, setPlayingOctave] = useState(4);
  const referenceToneRef = useRef(new ReferenceTone());
  
  // Extract pitch data
  const pitch = data?.pitch || { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0 };
  const rms = data?.rms || 0;
  const isSilent = data?.isSilent ?? true;
  
  // Calculate tuning state
  const cents = pitch.cents || 0;
  const absCents = Math.abs(cents);
  const isInTune = !isSilent && pitch.confidence > 0.7 && absCents <= 5;
  const isActive = !isSilent && pitch.confidence > 0.5;
  
  // Get current note index
  const currentNoteIndex = NOTES.indexOf(pitch.note?.replace('♯', '#')?.replace('♭', 'b'));
  
  // Calculate gradient based on tuning
  const getGradient = () => {
    if (!isActive) return 'from-gray-800/50 via-gray-900/50 to-gray-800/50';
    if (isInTune) return 'from-emerald-900/40 via-emerald-950/30 to-emerald-900/40';
    if (absCents <= 15) return 'from-amber-900/30 via-amber-950/20 to-amber-900/30';
    return 'from-rose-900/30 via-rose-950/20 to-rose-900/30';
  };
  
  // Handle note play
  const handleNoteClick = (noteIndex) => {
    if (playingNote === noteIndex) {
      // Stop playing
      referenceToneRef.current.stop();
      setPlayingNote(null);
    } else {
      // Calculate frequency and play
      const semitones = noteIndex - 9; // A is index 9
      const freq = a4Frequency * Math.pow(2, (semitones + (playingOctave - 4) * 12) / 12);
      referenceToneRef.current.start(freq);
      setPlayingNote(noteIndex);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => referenceToneRef.current.stop();
  }, []);
  
  // Toggle wheel mode
  const handleCircleClick = () => {
    if (!wheelMode) {
      setWheelMode(true);
    }
  };
  
  const handleCloseWheel = () => {
    referenceToneRef.current.stop();
    setPlayingNote(null);
    setWheelMode(false);
  };
  
  // Outer glow color
  const glowColor = isInTune ? 'rgba(52, 211, 153, 0.4)' : (isActive ? 'rgba(147, 51, 234, 0.3)' : 'rgba(59, 130, 246, 0.2)');
  
  return (
    <div className="relative flex items-center justify-center">
      {/* Main Circular Display */}
      <motion.div
        className={`relative w-56 h-56 rounded-full flex items-center justify-center cursor-pointer ${
          cameraEnabled ? 'bg-black/40 backdrop-blur-md' : ''
        }`}
        onClick={handleCircleClick}
        animate={{
          boxShadow: `0 0 60px ${glowColor}, inset 0 0 30px rgba(0,0,0,0.5)`
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: cameraEnabled 
            ? 'rgba(0,0,0,0.5)' 
            : `radial-gradient(circle at center, rgba(30,30,35,0.9) 0%, rgba(15,15,20,0.95) 100%)`
        }}
      >
        {/* Inner gradient ring */}
        <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${getGradient()} opacity-60`} />
        
        {/* Decorative "ear" shapes */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-12 rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/20" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-12 rounded-full bg-gradient-to-l from-purple-600/30 to-blue-600/20" />
        
        {/* Note Wheel (when active) */}
        <AnimatePresence>
          {wheelMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0"
            >
              <svg className="w-full h-full" viewBox="-120 -120 240 240">
                {NOTE_LABELS.map((label, i) => (
                  <NoteWedge
                    key={i}
                    index={i}
                    label={label}
                    isActive={currentNoteIndex === i}
                    isPlaying={playingNote === i}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNoteClick(i);
                    }}
                  />
                ))}
              </svg>
              
              {/* Close button */}
              <button
                onClick={handleCloseWheel}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:bg-white/20 transition-all z-10"
              >
                ×
              </button>
              
              {/* Tap to silence hint */}
              {playingNote !== null && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-white/40 whitespace-nowrap">
                  Tap to silence note
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Central Smiley (always visible) */}
        <div className={`relative z-10 ${wheelMode ? 'scale-75' : ''} transition-transform`}>
          <SmileyFace 
            isInTune={isInTune} 
            isActive={isActive}
            octave={wheelMode ? playingOctave : 0}
          />
        </div>
        
        {/* Note neighborhood indicator (right side) */}
        {!wheelMode && currentNoteIndex >= 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
            {[-1, 0, 1].map((offset) => {
              const idx = (currentNoteIndex + offset + 12) % 12;
              const isCenter = offset === 0;
              return (
                <div 
                  key={offset}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    isCenter 
                      ? 'bg-white/20 text-white font-medium' 
                      : 'text-white/30'
                  }`}
                >
                  {NOTE_LABELS[idx].split('/')[0]}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
      
      {/* Octave selector (wheel mode) */}
      {wheelMode && (
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {[6, 5, 4, 3, 2].map((oct) => (
            <button
              key={oct}
              onClick={() => {
                setPlayingOctave(oct);
                if (playingNote !== null) {
                  const semitones = playingNote - 9;
                  const freq = a4Frequency * Math.pow(2, (semitones + (oct - 4) * 12) / 12);
                  referenceToneRef.current.setFrequency(freq);
                }
              }}
              className={`w-7 h-7 rounded-lg text-xs font-mono transition-all ${
                playingOctave === oct 
                  ? 'bg-blue-500/40 text-blue-300 border border-blue-500/50' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {oct}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});