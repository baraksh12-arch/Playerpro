import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';

export default memo(function PremiumLoudnessBar({
  rms = 0,
  confidence = 0,
  isSilent = true
}) {
  const [avgDb, setAvgDb] = useState(0);
  const [dbHistory, setDbHistory] = useState([]);
  const [smoothingWindow, setSmoothingWindow] = useState(9);
  
  // Convert RMS to dB
  const rmsToDb = (rmsValue) => {
    if (rmsValue <= 0) return -60;
    return Math.max(-60, 20 * Math.log10(rmsValue * 10));
  };
  
  const currentDb = rmsToDb(rms);
  
  // Track average dB
  useEffect(() => {
    if (!isSilent && currentDb > -60) {
      setDbHistory(prev => {
        const newHistory = [...prev.slice(-19), currentDb];
        const avg = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
        setAvgDb(Math.round(avg));
        return newHistory;
      });
    }
  }, [currentDb, isSilent]);
  
  // Normalize dB to percentage for display
  const normalizedDb = Math.max(0, Math.min(100, ((currentDb + 60) / 60) * 100));
  const confidencePercent = Math.round(confidence * 100);
  
  // Determine bar color based on level
  const getBarGradient = () => {
    if (normalizedDb > 90) return 'from-red-500 via-orange-500 to-yellow-500';
    if (normalizedDb > 70) return 'from-yellow-500 via-green-500 to-green-400';
    return 'from-green-500 via-green-400 to-emerald-400';
  };
  
  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center gap-4">
        {/* dB Display */}
        <div className="flex flex-col items-center min-w-[50px]">
          <span className="text-lg font-mono text-white/90">
            {currentDb > -60 ? Math.round(currentDb) : '—'}
          </span>
          <span className="text-[10px] text-white/40">dB</span>
          <span className="text-[9px] text-white/30">
            ({avgDb > -60 ? avgDb : '—'} avg)
          </span>
        </div>
        
        {/* Main confidence/stability bar */}
        <div className="flex-1">
          <div className="relative h-6 rounded-full bg-white/5 overflow-hidden border border-white/10">
            {/* Gradient fill */}
            <motion.div 
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getBarGradient()}`}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ duration: 0.1 }}
            />
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-white/90 drop-shadow-lg">
                {confidencePercent}%
              </span>
            </div>
            
            {/* Scale markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              {[0, 25, 50, 75, 100].map((mark) => (
                <div 
                  key={mark} 
                  className="w-px h-2 bg-white/20"
                  style={{ opacity: mark === 50 ? 0.4 : 0.2 }}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Smoothing window */}
        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-lg font-mono text-white/90">{smoothingWindow}s</span>
          <span className="text-[9px] text-white/30">window</span>
        </div>
        
        {/* Environmental indicator */}
        <div className="flex flex-col items-center px-2 py-1 rounded-lg bg-white/5 border border-white/10">
          <Wind className="w-3.5 h-3.5 text-white/50 mb-0.5" />
          <span className="text-[9px] text-white/40">Wind</span>
          <span className="text-[10px] text-emerald-400 font-medium">Low</span>
        </div>
      </div>
    </div>
  );
});