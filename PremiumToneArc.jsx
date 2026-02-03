import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

export default memo(function PremiumToneArc({
  stability = 0,
  cents = 0,
  isActive = false
}) {
  // Calculate arc properties based on stability
  const arcData = useMemo(() => {
    const radius = 45;
    const arcLength = 120; // degrees
    const startAngle = (180 - arcLength / 2);
    const endAngle = (180 + arcLength / 2);
    
    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Arc path
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    return {
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
      x1, y1, x2, y2
    };
  }, []);
  
  // Indicator position based on cents (center = 0 cents)
  const indicatorAngle = useMemo(() => {
    const centsNormalized = Math.max(-50, Math.min(50, cents)) / 50; // -1 to 1
    const arcLength = 120;
    const centerAngle = 180;
    return centerAngle + (centsNormalized * arcLength / 2);
  }, [cents]);
  
  const indicatorX = 50 + 45 * Math.cos((indicatorAngle * Math.PI) / 180);
  const indicatorY = 50 + 45 * Math.sin((indicatorAngle * Math.PI) / 180);
  
  // Color based on stability
  const getGradientId = () => {
    if (stability > 0.8) return 'url(#toneGradientGreen)';
    if (stability > 0.5) return 'url(#toneGradientBlue)';
    return 'url(#toneGradientPurple)';
  };
  
  return (
    <div className="relative w-24 h-16 mx-auto">
      <svg viewBox="0 0 100 60" className="w-full h-full">
        <defs>
          <linearGradient id="toneGradientPurple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="toneGradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="toneGradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* Background arc */}
        <path
          d={arcData.path}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Active arc */}
        {isActive && (
          <motion.path
            d={arcData.path}
            fill="none"
            stroke={getGradientId()}
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: stability }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Indicator dot */}
        {isActive && (
          <motion.circle
            cx={indicatorX}
            cy={indicatorY}
            r="4"
            fill="white"
            animate={{ cx: indicatorX, cy: indicatorY }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
        
        {/* Center marker */}
        <line
          x1="50"
          y1="56"
          x2="50"
          y2="60"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
      </svg>
      
      {/* Label */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-white/40">
        Tone
      </div>
    </div>
  );
});