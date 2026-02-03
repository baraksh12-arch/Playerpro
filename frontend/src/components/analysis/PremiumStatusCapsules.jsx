import React, { useState, useEffect, memo } from 'react';
import { Timer, Zap, Music2 } from 'lucide-react';

export default memo(function PremiumStatusCapsules({ 
  isListening,
  a4Frequency = 440,
  temperament = 'Equal',
  metronomeBpm = 120
}) {
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(null);
  
  // Track session time
  useEffect(() => {
    if (isListening && !sessionStarted) {
      setSessionStarted(Date.now());
    }
    
    if (isListening) {
      const interval = setInterval(() => {
        if (sessionStarted) {
          setSessionTime(Math.floor((Date.now() - sessionStarted) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isListening, sessionStarted]);
  
  // Format time
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };
  
  return (
    <div className="flex items-center justify-between w-full px-2">
      {/* Temperament Capsule */}
      <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <span className="text-[9px] text-white/40 uppercase tracking-wider">Temperament</span>
        <span className="text-sm font-medium text-amber-400">{temperament}</span>
      </div>
      
      {/* Session & Power Capsule */}
      <div className="flex items-center gap-4 px-4 py-1.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-white/50" />
          <span className="text-sm font-mono text-white/80">{formatTime(sessionTime)}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-sm text-emerald-400">1 d</span>
        </div>
      </div>
      
      {/* Metronome Capsule */}
      <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <span className="text-[9px] text-white/40 uppercase tracking-wider">Metronome</span>
        <span className="text-sm font-medium text-amber-400">{metronomeBpm} bpm</span>
      </div>
    </div>
  );
});