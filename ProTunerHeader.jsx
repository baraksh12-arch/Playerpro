import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Unlock, ChevronUp, ChevronDown, Volume2, VolumeX,
  Target, Minus, Plus, HelpCircle, CheckCircle, Sparkles
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import TargetTuner from './tuner/TargetTuner';
import BarTuner from './tuner/BarTuner';
import TunerSettingsPopover from './tuner/TunerSettingsPopover';
import NoteSelector from './tuner/NoteSelector';
import {
  NOTES,
  NOTE_FLATS,
  SENSITIVITY_PRESETS,
  TRANSPOSITIONS,
  CALIBRATION_RANGE,
  frequencyToNoteWithRef,
  transposeNote,
  noteToFrequencyWithRef,
  centsToTargetNote
} from './tuner/TunerConstants';

// Simple metronome click sound
function playClickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialDecayTo?.(0.001, ctx.currentTime + 0.05) || 
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
    setTimeout(() => ctx.close(), 100);
  } catch (e) {}
}

// Reference tone generator
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
      
      this.osc.type = 'sine';
      this.osc.frequency.value = frequency;
      this.gain.gain.value = 0.15;
      
      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
      this.isPlaying = true;
    } catch (e) {
      console.error('Reference tone error:', e);
    }
  }
  
  setFrequency(frequency) {
    if (this.osc && this.isPlaying) {
      this.osc.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.01);
    }
  }
  
  stop() {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.osc = null;
    this.gain = null;
    this.ctx = null;
    this.isPlaying = false;
  }
}

// Success animation component
const SuccessAnimation = memo(function SuccessAnimation({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const ProTunerHeader = memo(function ProTunerHeader({ engine, data, className = '' }) {
  // Display mode
  const [tunerMode, setTunerMode] = useState('target'); // 'target' | 'bar'
  
  // Lock/target note
  const [isLocked, setIsLocked] = useState(false);
  const [targetNote, setTargetNote] = useState('A');
  const [targetOctave, setTargetOctave] = useState(4);
  
  // Calibration & transposition
  const [a4Frequency, setA4Frequency] = useState(CALIBRATION_RANGE.default);
  const [transposition, setTransposition] = useState('concert');
  const [customTransposeSemitones, setCustomTransposeSemitones] = useState(0);
  
  // Sensitivity
  const [sensitivityPreset, setSensitivityPreset] = useState('medium');
  
  // Feedback options
  const [referenceToneEnabled, setReferenceToneEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [preferFlats, setPreferFlats] = useState(false);
  
  // Internal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [peakHoldCents, setPeakHoldCents] = useState(null);
  const [noteHold, setNoteHold] = useState(null);
  
  // Refs
  const referenceToneRef = useRef(new ReferenceTone());
  const successCooldownRef = useRef(false);
  const inTuneStartRef = useRef(null);
  const lastStableNoteRef = useRef(null);
  const noteHoldTimeoutRef = useRef(null);
  const peakHoldTimeoutRef = useRef(null);
  
  // Get current preset thresholds
  const currentPreset = SENSITIVITY_PRESETS[sensitivityPreset];
  const { inTuneThreshold, warningThreshold, successHoldMs } = currentPreset;
  
  // Get transposition semitones
  const getTransposeSemitones = () => {
    if (transposition === 'custom') return customTransposeSemitones;
    const preset = TRANSPOSITIONS.find(t => t.id === transposition);
    return preset?.semitones || 0;
  };
  
  // Extract pitch data
  const pitch = data?.pitch || { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0 };
  const rms = data?.rms || 0;
  const isSilent = data?.isSilent ?? true;
  
  // Calculate displayed note with transposition
  const transposeSemitones = getTransposeSemitones();
  const concertNote = frequencyToNoteWithRef(pitch.freq, a4Frequency);
  const writtenNote = transposeSemitones !== 0 
    ? transposeNote(concertNote.note, concertNote.octave, transposeSemitones)
    : { note: concertNote.note, octave: concertNote.octave };
  
  // Calculate cents (either vs detected note or vs locked target)
  let displayCents = concertNote.cents;
  if (isLocked && pitch.freq > 0) {
    displayCents = centsToTargetNote(pitch.freq, targetNote, targetOctave, a4Frequency);
  }
  
  const absCents = Math.abs(displayCents);
  const isInTune = !isSilent && pitch.confidence > 0.7 && absCents <= inTuneThreshold;
  
  // Get display note name
  const getDisplayNoteName = (note) => {
    if (preferFlats && NOTE_FLATS[note]) return NOTE_FLATS[note];
    return note.replace('#', '♯');
  };
  
  // Note hold logic (keep last note for 1s after silence)
  useEffect(() => {
    if (!isSilent && pitch.note !== '--') {
      lastStableNoteRef.current = { note: writtenNote.note, octave: writtenNote.octave };
      if (noteHoldTimeoutRef.current) {
        clearTimeout(noteHoldTimeoutRef.current);
        noteHoldTimeoutRef.current = null;
      }
      setNoteHold(null);
    } else if (lastStableNoteRef.current) {
      if (!noteHoldTimeoutRef.current) {
        setNoteHold(lastStableNoteRef.current);
        noteHoldTimeoutRef.current = setTimeout(() => {
          setNoteHold(null);
          lastStableNoteRef.current = null;
          noteHoldTimeoutRef.current = null;
        }, 1000);
      }
    }
    
    return () => {
      if (noteHoldTimeoutRef.current) {
        clearTimeout(noteHoldTimeoutRef.current);
      }
    };
  }, [isSilent, pitch.note, writtenNote.note, writtenNote.octave]);
  
  // Peak hold logic (track closest to center in last 2-3s)
  useEffect(() => {
    if (!isSilent && pitch.confidence > 0.7) {
      if (peakHoldCents === null || absCents < Math.abs(peakHoldCents)) {
        setPeakHoldCents(displayCents);
      }
      
      // Reset peak hold after 2.5s
      if (peakHoldTimeoutRef.current) {
        clearTimeout(peakHoldTimeoutRef.current);
      }
      peakHoldTimeoutRef.current = setTimeout(() => {
        setPeakHoldCents(null);
      }, 2500);
    }
    
    return () => {
      if (peakHoldTimeoutRef.current) {
        clearTimeout(peakHoldTimeoutRef.current);
      }
    };
  }, [displayCents, isSilent, pitch.confidence, absCents, peakHoldCents]);
  
  // Success trigger logic
  useEffect(() => {
    if (isInTune && !successCooldownRef.current) {
      if (!inTuneStartRef.current) {
        inTuneStartRef.current = Date.now();
      } else if (Date.now() - inTuneStartRef.current >= successHoldMs) {
        // Trigger success!
        setShowSuccess(true);
        successCooldownRef.current = true;
        
        // Haptic feedback
        if (hapticEnabled && navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Sound feedback
        if (soundEnabled) {
          playClickSound();
        }
        
        // Hide success animation
        setTimeout(() => setShowSuccess(false), 400);
      }
    } else {
      inTuneStartRef.current = null;
      
      // Exit cooldown after being out of tune for 120ms
      if (!isInTune && successCooldownRef.current) {
        setTimeout(() => {
          successCooldownRef.current = false;
        }, 120);
      }
    }
  }, [isInTune, successHoldMs, hapticEnabled, soundEnabled]);
  
  // Reference tone
  useEffect(() => {
    if (referenceToneEnabled && isLocked) {
      const freq = noteToFrequencyWithRef(targetNote, targetOctave, a4Frequency);
      referenceToneRef.current.start(freq);
    } else {
      referenceToneRef.current.stop();
    }
    
    return () => referenceToneRef.current.stop();
  }, [referenceToneEnabled, isLocked, targetNote, targetOctave, a4Frequency]);
  
  // Update reference tone frequency when target changes
  useEffect(() => {
    if (referenceToneEnabled && isLocked && referenceToneRef.current.isPlaying) {
      const freq = noteToFrequencyWithRef(targetNote, targetOctave, a4Frequency);
      referenceToneRef.current.setFrequency(freq);
    }
  }, [targetNote, targetOctave, a4Frequency, referenceToneEnabled, isLocked]);
  
  // Lock current note
  const handleLock = () => {
    if (isLocked) {
      setIsLocked(false);
    } else if (pitch.note !== '--') {
      setTargetNote(concertNote.note);
      setTargetOctave(concertNote.octave);
      setIsLocked(true);
    }
  };
  
  // Adjust target by semitone
  const adjustTargetSemitone = (delta) => {
    const currentIndex = NOTES.indexOf(targetNote);
    let newIndex = currentIndex + delta;
    let newOctave = targetOctave;
    
    if (newIndex < 0) {
      newIndex = 11;
      newOctave--;
    } else if (newIndex > 11) {
      newIndex = 0;
      newOctave++;
    }
    
    setTargetNote(NOTES[newIndex]);
    setTargetOctave(Math.max(1, Math.min(7, newOctave)));
  };
  
  // Handle note selection from picker
  const handleNoteSelect = (note, octave) => {
    setTargetNote(note);
    setTargetOctave(octave);
  };
  
  // Displayed note (with hold)
  const displayedNote = isSilent && noteHold 
    ? noteHold 
    : { note: writtenNote.note, octave: writtenNote.octave };
  
  const hasValidNote = displayedNote.note && displayedNote.note !== '--';
  
  return (
    <div className={`relative bg-black/50 backdrop-blur-xl border-b border-white/10 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Tuner Visualization */}
          <div className="relative flex-shrink-0">
            {tunerMode === 'target' ? (
              <TargetTuner
                cents={displayCents}
                confidence={pitch.confidence}
                isInTune={isInTune}
                inTuneThreshold={inTuneThreshold}
                warningThreshold={warningThreshold}
                isSilent={isSilent}
                size={100}
              />
            ) : (
              <BarTuner
                cents={displayCents}
                confidence={pitch.confidence}
                isInTune={isInTune}
                inTuneThreshold={inTuneThreshold}
                warningThreshold={warningThreshold}
                isSilent={isSilent}
                width={160}
                height={40}
              />
            )}
            <SuccessAnimation show={showSuccess} />
          </div>
          
          {/* Note Display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              {/* Main Note */}
              <span className={`text-4xl font-extralight tracking-tight transition-colors ${
                hasValidNote 
                  ? (isInTune ? 'text-emerald-400' : (absCents <= warningThreshold ? 'text-amber-400' : 'text-white'))
                  : 'text-white/30'
              } ${noteHold && isSilent ? 'opacity-50' : ''}`}>
                {hasValidNote ? getDisplayNoteName(displayedNote.note) : '—'}
              </span>
              <span className={`text-xl font-light ${hasValidNote ? 'text-white/60' : 'text-white/20'}`}>
                {hasValidNote ? displayedNote.octave : ''}
              </span>
              
              {/* Transposition indicator */}
              {transposeSemitones !== 0 && hasValidNote && (
                <span className="text-[10px] text-purple-400 ml-2 px-1.5 py-0.5 bg-purple-500/20 rounded">
                  Written
                </span>
              )}
            </div>
            
            {/* Cents & Frequency */}
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-lg font-mono tracking-tight ${
                hasValidNote
                  ? (isInTune ? 'text-emerald-400' : (absCents <= warningThreshold ? 'text-amber-400' : 'text-orange-400'))
                  : 'text-white/30'
              }`}>
                {hasValidNote ? (displayCents > 0 ? '+' : '') : ''}{hasValidNote ? displayCents : 0}
                <span className="text-xs opacity-60">¢</span>
              </span>
              
              <span className="text-xs text-white/40 font-mono">
                {pitch.freq > 0 ? `${pitch.freq.toFixed(1)} Hz` : '—'}
              </span>
              
              {/* Confidence */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-100"
                  style={{ width: `${(pitch.confidence || 0) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Lock info & concert pitch */}
            <div className="flex items-center gap-2 mt-1">
              {isLocked && (
                <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {getDisplayNoteName(targetNote)}{targetOctave}
                </span>
              )}
              
              {transposeSemitones !== 0 && hasValidNote && (
                <span className="text-[10px] text-white/40">
                  Concert: {getDisplayNoteName(concertNote.note)}{concertNote.octave}
                </span>
              )}
              
              {peakHoldCents !== null && (
                <span className="text-[10px] text-white/30">
                  Peak: {peakHoldCents > 0 ? '+' : ''}{peakHoldCents}¢
                </span>
              )}
            </div>
          </div>
          
          {/* Controls Column */}
          <div className="flex flex-col items-center gap-2">
            {/* Lock Button */}
            <button
              onClick={handleLock}
              disabled={!hasValidNote && !isLocked}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isLocked
                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            
            {/* Semitone adjust (when locked) */}
            {isLocked && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustTargetSemitone(-1)}
                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <NoteSelector
                  selectedNote={targetNote}
                  selectedOctave={targetOctave}
                  onSelect={handleNoteSelect}
                  preferFlats={preferFlats}
                >
                  <button className="w-8 h-6 rounded bg-white/10 hover:bg-white/20 text-white/60 text-[10px] font-medium">
                    {getDisplayNoteName(targetNote)}{targetOctave}
                  </button>
                </NoteSelector>
                <button
                  onClick={() => adjustTargetSemitone(1)}
                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          
          {/* Settings & Help */}
          <div className="flex flex-col items-center gap-2">
            <TunerSettingsPopover
              a4Frequency={a4Frequency}
              setA4Frequency={setA4Frequency}
              transposition={transposition}
              setTransposition={setTransposition}
              customTransposeSemitones={customTransposeSemitones}
              setCustomTransposeSemitones={setCustomTransposeSemitones}
              sensitivityPreset={sensitivityPreset}
              setSensitivityPreset={setSensitivityPreset}
              tunerMode={tunerMode}
              setTunerMode={setTunerMode}
              referenceToneEnabled={referenceToneEnabled}
              setReferenceToneEnabled={setReferenceToneEnabled}
              hapticEnabled={hapticEnabled}
              setHapticEnabled={setHapticEnabled}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              preferFlats={preferFlats}
              setPreferFlats={setPreferFlats}
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/60 transition-all">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="max-w-[280px] text-xs p-3 bg-gray-900/95 border-white/10 text-white">
                <p className="font-semibold mb-1">Pro Tuner</p>
                <p className="text-white/70 mb-2">
                  <strong>Lock:</strong> Tap to lock the current note as your target. The tuner will show cents offset from that note.
                </p>
                <p className="text-white/70 mb-2">
                  <strong>Cents (¢):</strong> Pitch deviation in cents. 100 cents = 1 semitone. ±{inTuneThreshold}¢ is considered in-tune.
                </p>
                <p className="text-white/70">
                  <strong>Transpose:</strong> For B♭/E♭ instruments, shows written note vs concert pitch.
                </p>
              </PopoverContent>
            </Popover>
            
            {/* Reference tone indicator */}
            {referenceToneEnabled && isLocked && (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Volume2 className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
        
        {/* RMS Level Bar */}
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-75 ${
              isSilent ? 'bg-white/20' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
            }`}
            style={{ width: `${Math.min(100, rms * 500)}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default ProTunerHeader;