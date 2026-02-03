import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Settings, ChevronDown } from 'lucide-react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default memo(function PremiumPitchHistory({
  data,
  isFrozen = false,
  timeSpan = 16,
  setTimeSpan,
  cameraEnabled = false
}) {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const animationRef = useRef(null);
  const [currentNote, setCurrentNote] = useState(null);
  
  // Extract data
  const pitch = data?.pitch || { freq: 0, note: '--', cents: 0, confidence: 0 };
  const isSilent = data?.isSilent ?? true;
  
  // Add to history
  useEffect(() => {
    if (!isFrozen && !isSilent && pitch.confidence > 0.5) {
      const now = Date.now();
      const cents = pitch.cents || 0;
      const note = pitch.note;
      
      historyRef.current.push({
        time: now,
        cents,
        note,
        confidence: pitch.confidence,
        freq: pitch.freq
      });
      
      // Limit history
      const cutoff = now - (timeSpan * 1000);
      historyRef.current = historyRef.current.filter(h => h.time > cutoff);
      
      setCurrentNote({ note, cents });
    }
  }, [data, isFrozen, timeSpan, isSilent, pitch]);
  
  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const now = Date.now();
    const cutoff = now - (timeSpan * 1000);
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal lines (cents)
    const centsRange = 50;
    const centerY = height / 2;
    for (let c = -centsRange; c <= centsRange; c += 10) {
      const y = centerY - (c / centsRange) * (height / 2 - 20);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Center line (0 cents)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let c = -30; c <= 30; c += 10) {
      const y = centerY - (c / centsRange) * (height / 2 - 20);
      ctx.fillText(`${c > 0 ? '+' : ''}${c}`, width - 4, y + 3);
    }
    
    // Draw history
    const history = historyRef.current.filter(h => h.time > cutoff);
    if (history.length < 2) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    
    // Calculate x position for each point
    const getX = (time) => {
      return ((time - cutoff) / (timeSpan * 1000)) * width;
    };
    
    const getY = (cents) => {
      return centerY - (Math.max(-centsRange, Math.min(centsRange, cents)) / centsRange) * (height / 2 - 20);
    };
    
    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(getX(history[0].time), centerY);
    history.forEach((point, i) => {
      const x = getX(point.time);
      const y = getY(point.cents);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(getX(history[history.length - 1].time), centerY);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)'); // Sharp - magenta
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)'); // Center - blue
    gradient.addColorStop(1, 'rgba(251, 146, 60, 0.3)'); // Flat - orange
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    history.forEach((point, i) => {
      const x = getX(point.time);
      const y = getY(point.cents);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Color coded segments
    history.forEach((point, i) => {
      if (i === 0) return;
      const prev = history[i - 1];
      const x1 = getX(prev.time);
      const y1 = getY(prev.cents);
      const x2 = getX(point.time);
      const y2 = getY(point.cents);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      const absCents = Math.abs(point.cents);
      if (absCents <= 5) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)'; // Green - in tune
      } else if (point.cents > 5) {
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)'; // Magenta - sharp
      } else {
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)'; // Orange - flat
      }
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Current note label
    if (currentNote && history.length > 0) {
      const lastPoint = history[history.length - 1];
      const x = getX(lastPoint.time);
      const y = getY(lastPoint.cents);
      
      // Note badge
      ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x + 5, y - 10, 35, 20, 4);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${currentNote.note} ${currentNote.cents > 0 ? '+' : ''}${Math.round(currentNote.cents)}`, x + 9, y + 4);
    }
    
    animationRef.current = requestAnimationFrame(draw);
  }, [timeSpan, currentNote]);
  
  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);
  
  return (
    <div className={`relative w-full h-full ${cameraEnabled ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/30'} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2">
        <button className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10">
          <Settings className="w-4 h-4" />
        </button>
        
        {/* Time span selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm font-mono text-white/80">{timeSpan.toFixed(1)}s</span>
          <span className="text-[10px] text-white/40">Time Span</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </div>
        
        {/* Legend */}
        <div className="flex flex-col gap-0.5 text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-pink-400">Sharp</span>
            <div className="w-2 h-2 rounded-full bg-pink-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-emerald-400">In-tune</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-orange-400">Flat</span>
            <div className="w-2 h-2 rounded-full bg-orange-400" />
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* Gesture hints */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-6 text-[10px] text-white/30">
        <span>Double-Tap to Freeze</span>
        <span>Two-Finger Tap to Expand</span>
      </div>
    </div>
  );
});