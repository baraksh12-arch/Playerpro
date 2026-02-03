import React, { useRef, useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const PARTIAL_NAMES = [
  'Root', '8ve', 'P5+8ve', '2×8ve', 'M3+2×8ve', 'P5+2×8ve', 'm7+2×8ve', '3×8ve',
  'M2+3×8ve', 'M3+3×8ve', 'TT+3×8ve', 'P5+3×8ve', 'm6+3×8ve', 'm7+3×8ve', 'M7+3×8ve', '4×8ve'
];

export default function HarmonicView({ data, isFrozen }) {
  const canvasRef = useRef(null);
  const [numPartials, setNumPartials] = useState(12);
  const [showCents, setShowCents] = useState(true);
  
  // Draw harmonics
  useEffect(() => {
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
    const padding = { top: 40, bottom: 60, left: 20, right: 20 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    const harmonics = data?.harmonics || [];
    const displayedHarmonics = harmonics.slice(0, numPartials);
    
    if (displayedHarmonics.length === 0) {
      // No data message
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for stable pitch...', width / 2, height / 2);
      ctx.restore();
      return;
    }
    
    const barWidth = Math.min(40, (graphWidth / numPartials) * 0.7);
    const barSpacing = graphWidth / numPartials;
    
    // Find max energy for scaling
    const maxEnergy = Math.max(...displayedHarmonics.map(h => h.energy), 0.1);
    
    // Draw bars
    displayedHarmonics.forEach((harmonic, i) => {
      const x = padding.left + barSpacing * i + (barSpacing - barWidth) / 2;
      const barHeight = (harmonic.energy / maxEnergy) * graphHeight;
      const y = padding.top + graphHeight - barHeight;
      
      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
      
      // Color based on partial number
      const hue = 180 + (i / numPartials) * 100;
      gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.3)`);
      gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0.9)`);
      
      // Draw bar
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();
      
      // Bar glow
      ctx.shadowColor = `hsla(${hue}, 70%, 60%, 0.5)`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Partial number
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${harmonic.partial}`, x + barWidth / 2, height - padding.bottom + 15);
      
      // Musical name (for first 8)
      if (i < 8 && PARTIAL_NAMES[i]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.fillText(PARTIAL_NAMES[i], x + barWidth / 2, height - padding.bottom + 28);
      }
      
      // Cents offset
      if (showCents && harmonic.centsOffset !== 0) {
        const centsText = harmonic.centsOffset > 0 ? `+${harmonic.centsOffset}` : `${harmonic.centsOffset}`;
        
        ctx.fillStyle = Math.abs(harmonic.centsOffset) > 15 
          ? 'rgba(248, 113, 113, 0.9)' 
          : Math.abs(harmonic.centsOffset) > 5 
            ? 'rgba(251, 191, 36, 0.9)'
            : 'rgba(52, 211, 153, 0.9)';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.fillText(`${centsText}¢`, x + barWidth / 2, y - 5);
      }
      
      // Energy percentage at top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(`${Math.round(harmonic.energy * 100)}%`, x + barWidth / 2, padding.top - 5);
    });
    
    // Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Harmonic Partials (f₀ = ${data?.pitch?.freq?.toFixed(1) || '--'} Hz)`, padding.left, 20);
    
    ctx.restore();
  }, [data, numPartials, showCents]);
  
  // Pinch gesture handling
  const lastPinchDistRef = useRef(null);
  
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const delta = dist - lastPinchDistRef.current;
      if (Math.abs(delta) > 20) {
        if (delta > 0) {
          setNumPartials(n => Math.min(24, n + 2));
        } else {
          setNumPartials(n => Math.max(4, n - 2));
        }
        lastPinchDistRef.current = dist;
      }
    }
  };
  
  const handleTouchEnd = () => {
    lastPinchDistRef.current = null;
  };
  
  return (
    <div className="h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNumPartials(n => Math.max(4, n - 2))}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-white/60 text-xs w-20 text-center">{numPartials} partials</span>
          <button
            onClick={() => setNumPartials(n => Math.min(24, n + 2))}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => setShowCents(!showCents)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showCents ? 'bg-blue-500/30 text-blue-400' : 'bg-white/10 text-white/60'
          }`}
        >
          Show ¢
        </button>
      </div>
      
      {/* Canvas */}
      <div 
        className="flex-1 relative rounded-xl overflow-hidden border border-white/10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {/* Pinch hint */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-white/40 text-xs">
          Pinch to adjust partials
        </div>
      </div>
    </div>
  );
}