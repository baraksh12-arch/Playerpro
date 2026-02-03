import React, { memo } from 'react';
import { motion } from 'framer-motion';

const NOTE_FLATS = { 'C#': 'D♭', 'D#': 'E♭', 'F#': 'G♭', 'G#': 'A♭', 'A#': 'B♭' };

export default memo(function PremiumPitchDisplay({ 
  data,
  transposition = 0,
  preferFlats = false,
  a4Frequency = 440
}) {
  const pitch = data?.pitch || { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0 };
  const isSilent = data?.isSilent ?? true;
  
  const cents = pitch.cents || 0;
  const absCents = Math.abs(cents);
  const isInTune = !isSilent && pitch.confidence > 0.7 && absCents <= 5;
  const isActive = !isSilent && pitch.confidence > 0.5;
  
  // Format note name
  const formatNote = (note) => {
    if (!note || note === '--') return '—';
    if (preferFlats && NOTE_FLATS[note]) return NOTE_FLATS[note];
    return note.replace('#', '♯');
  };
  
  // Determine color
  const getColor = () => {
    if (!isActive) return 'text-white/30';
    if (isInTune) return 'text-emerald-400';
    if (absCents <= 15) return 'text-amber-400';
    return 'text-white';
  };
  
  return (
    <div className="flex flex-col items-end">
      {/* Main note display */}
      <div className="flex items-baseline gap-1">
        <motion.span 
          className={`text-5xl font-extralight tracking-tight ${getColor()}`}
          animate={{ scale: isInTune ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {formatNote(pitch.note)}
        </motion.span>
        <span className={`text-2xl font-light ${isActive ? 'text-white/60' : 'text-white/20'}`}>
          {pitch.octave > 0 ? pitch.octave : ''}
        </span>
      </div>
      
      {/* Cents deviation */}
      <motion.div 
        className={`text-2xl font-mono tracking-tight ${
          isInTune ? 'text-emerald-400' : (isActive && absCents <= 15 ? 'text-amber-400' : 'text-white/50')
        }`}
        animate={{ 
          x: cents * 0.5 // Subtle visual shift based on cents
        }}
      >
        {isActive ? (cents > 0 ? '+' : '') : ''}{isActive ? cents.toFixed(1) : '0.0'}
        <span className="text-sm opacity-60 ml-0.5">¢</span>
      </motion.div>
      
      {/* Frequency */}
      <div className="text-xs text-white/40 font-mono mt-1">
        {pitch.freq > 0 ? `${pitch.freq.toFixed(1)} Hz` : '—'}
      </div>
    </div>
  );
});