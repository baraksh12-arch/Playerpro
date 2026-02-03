import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Pause, Play, Volume2, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const INTERVAL_NAMES = {
  0: 'Unison',
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3',
  5: 'P4',
  6: 'TT',
  7: 'P5',
  8: 'm6',
  9: 'M6',
  10: 'm7',
  11: 'M7',
  12: 'P8',
};

function getIntervalName(semitones) {
  const absSemitones = Math.abs(semitones);
  const octaves = Math.floor(absSemitones / 12);
  const remainder = absSemitones % 12;
  
  if (octaves === 0) {
    return INTERVAL_NAMES[remainder] || `${remainder}st`;
  } else if (octaves === 1 && remainder === 0) {
    return 'P8';
  } else {
    const intervalPart = INTERVAL_NAMES[remainder] || '';
    return `${octaves}oct${intervalPart ? '+' + intervalPart : ''}`;
  }
}

export default function IntervalTrainerView({ data, isFrozen, engine }) {
  const [noteCards, setNoteCards] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [sustainNote, setSustainNote] = useState(null);
  const [playingCardId, setPlayingCardId] = useState(null);
  
  const audioContextRef = useRef(null);
  const sustainOscRef = useRef(null);
  
  // Get audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);
  
  // Listen to note events from engine
  useEffect(() => {
    if (!engine) return;
    
    const unsubscribe = engine.subscribe((eventData) => {
      if (eventData.type === 'noteEvent' && !isPaused && !isFrozen) {
        const event = eventData.event;
        
        setNoteCards(prev => {
          const newCards = [...prev];
          
          // Calculate interval from previous card
          let interval = null;
          let direction = null;
          if (newCards.length > 0) {
            const lastCard = newCards[newCards.length - 1];
            const semitones = event.intervalSemitones || 0;
            interval = {
              semitones: Math.abs(semitones),
              name: getIntervalName(semitones),
              direction: semitones > 0 ? 'up' : semitones < 0 ? 'down' : 'same'
            };
            direction = interval.direction;
          }
          
          const newCard = {
            id: event.id,
            note: event.note,
            octave: event.octave,
            freq: event.freq,
            cents: event.cents,
            duration: event.duration,
            interval,
            direction
          };
          
          // Keep max 20 cards
          if (newCards.length >= 20) {
            newCards.shift();
          }
          
          return [...newCards, newCard];
        });
      } else if (eventData.type === 'noteEventsCleared') {
        setNoteCards([]);
      }
    });
    
    return () => unsubscribe();
  }, [engine, isPaused, isFrozen]);
  
  // Play a note tone
  const playNote = useCallback((freq, cardId) => {
    const ctx = getAudioContext();
    
    // Stop any currently playing note
    if (playingCardId) {
      setPlayingCardId(null);
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1);
    
    setPlayingCardId(cardId);
    setTimeout(() => setPlayingCardId(null), 1000);
  }, [getAudioContext, playingCardId]);
  
  // Sustain reference tone
  const toggleSustain = useCallback((freq, note, octave) => {
    const ctx = getAudioContext();
    
    if (sustainOscRef.current) {
      sustainOscRef.current.osc.stop();
      sustainOscRef.current = null;
      setSustainNote(null);
      return;
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    
    sustainOscRef.current = { osc, gain };
    setSustainNote({ note, octave, freq });
  }, [getAudioContext]);
  
  // Clear notes
  const clearNotes = useCallback(() => {
    setNoteCards([]);
    engine?.clearNoteEvents();
    
    if (sustainOscRef.current) {
      sustainOscRef.current.osc.stop();
      sustainOscRef.current = null;
      setSustainNote(null);
    }
  }, [engine]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sustainOscRef.current) {
        sustainOscRef.current.osc.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Get intonation color
  const getIntonationColor = (cents) => {
    const absCents = Math.abs(cents);
    if (absCents < 5) return 'text-emerald-400';
    if (absCents < 15) return 'text-amber-400';
    return 'text-red-400';
  };
  
  const getIntonationBg = (cents) => {
    const absCents = Math.abs(cents);
    if (absCents < 5) return 'bg-emerald-500/20 border-emerald-500/30';
    if (absCents < 15) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };
  
  return (
    <div className="h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              isPaused
                ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button
            onClick={clearNotes}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white/10 text-white/70 hover:bg-white/20 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
        
        {/* Sustain indicator */}
        {sustainNote && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <Volume2 className="w-3 h-3 text-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400 font-medium">
              Sustaining {sustainNote.note}{sustainNote.octave}
            </span>
            <button
              onClick={() => toggleSustain(sustainNote.freq, sustainNote.note, sustainNote.octave)}
              className="text-blue-400 hover:text-blue-300"
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      {/* Note Cards Grid */}
      <div className="flex-1 overflow-y-auto">
        {noteCards.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Volume2 className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/50">Play notes to detect intervals</p>
              <p className="text-white/30 text-sm mt-1">Hold a card to sustain the reference tone</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence>
              {noteCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => playNote(card.freq, card.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleSustain(card.freq, card.note, card.octave);
                  }}
                  className={`relative p-3 rounded-xl border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                    playingCardId === card.id
                      ? 'bg-blue-500/30 border-blue-500/50 shadow-lg shadow-blue-500/20'
                      : getIntonationBg(card.cents)
                  }`}
                >
                  {/* Interval arrow */}
                  {card.direction && index > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      {card.direction === 'up' ? (
                        <ArrowUp className="w-3 h-3 text-emerald-400" />
                      ) : card.direction === 'down' ? (
                        <ArrowDown className="w-3 h-3 text-orange-400" />
                      ) : (
                        <Minus className="w-3 h-3 text-white/50" />
                      )}
                    </div>
                  )}
                  
                  {/* Note name */}
                  <div className="text-center mb-2">
                    <span className={`text-2xl font-light ${getIntonationColor(card.cents)}`}>
                      {card.note}
                    </span>
                    <span className="text-sm text-white/40">{card.octave}</span>
                  </div>
                  
                  {/* Cents target/bullseye */}
                  <div className="relative h-8 bg-black/30 rounded-lg overflow-hidden mb-2">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20" />
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                        Math.abs(card.cents) < 5 ? 'bg-emerald-400' :
                        Math.abs(card.cents) < 15 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{
                        left: `${Math.max(10, Math.min(90, 50 + card.cents))}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-white/50">
                      {card.cents > 0 ? '+' : ''}{card.cents}¢
                    </span>
                  </div>
                  
                  {/* Interval */}
                  {card.interval && (
                    <div className="text-center">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/70 font-medium">
                        {card.interval.name}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-3 text-center text-xs text-white/30">
        Tap to play • Long press to sustain reference
      </div>
    </div>
  );
}