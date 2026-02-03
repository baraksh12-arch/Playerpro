import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Save, ZoomIn, ZoomOut, Clock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export default function WaveformView({ data, isFrozen, engine }) {
  const canvasRef = useRef(null);
  const [timeSpan, setTimeSpan] = useState(5); // seconds
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const loopSourceRef = useRef(null);
  
  // Draw waveform
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
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Time grid
    const timeGridInterval = Math.max(0.5, timeSpan / 10);
    const pixelsPerSecond = width / timeSpan;
    
    for (let t = 0; t <= timeSpan; t += timeGridInterval) {
      const x = t * pixelsPerSecond;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s`, x, height - 5);
    }
    
    if (!data?.waveform || !data?.history) {
      ctx.restore();
      return;
    }
    
    const waveform = data.waveform;
    const history = data.history;
    
    // Draw real-time waveform (last ~50ms)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const waveformStart = width * 0.8; // Show waveform on right side
    const waveformWidth = width * 0.2;
    
    for (let i = 0; i < waveform.length; i++) {
      const x = waveformStart + (i / waveform.length) * waveformWidth;
      const y = height / 2 + waveform[i] * (height / 2) * 0.8;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw pitch history with intonation colors
    const now = Date.now();
    const startTime = now - timeSpan * 1000;
    
    // Filter history to time range
    const visibleHistory = history.filter(h => h.time >= startTime && h.time <= now);
    
    if (visibleHistory.length > 1) {
      let lastSilent = true;
      let segmentStart = null;
      
      visibleHistory.forEach((point, i) => {
        const x = ((point.time - startTime) / (timeSpan * 1000)) * width * 0.8;
        const nextPoint = visibleHistory[i + 1];
        
        if (point.isSilent !== lastSilent) {
          if (point.isSilent && segmentStart !== null) {
            // Draw dotted silence separator
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, height * 0.2);
            ctx.lineTo(x, height * 0.8);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          lastSilent = point.isSilent;
          segmentStart = i;
        }
        
        if (!point.isSilent && nextPoint && !nextPoint.isSilent) {
          const nextX = ((nextPoint.time - startTime) / (timeSpan * 1000)) * width * 0.8;
          
          // Color based on cents
          const absCents = Math.abs(point.cents);
          let color;
          if (absCents < 5) color = 'rgba(52, 211, 153, 0.9)'; // green
          else if (absCents < 15) color = 'rgba(251, 191, 36, 0.9)'; // orange
          else color = 'rgba(248, 113, 113, 0.9)'; // red
          
          // Normalize frequency to Y position (simple mapping)
          const minFreq = 80;
          const maxFreq = 1000;
          const freqRange = Math.log2(maxFreq / minFreq);
          const normalizedY = point.freq > 0 
            ? 1 - (Math.log2(point.freq / minFreq) / freqRange)
            : 0.5;
          const y = height * 0.15 + normalizedY * height * 0.7;
          
          const nextNormalizedY = nextPoint.freq > 0
            ? 1 - (Math.log2(nextPoint.freq / minFreq) / freqRange)
            : 0.5;
          const nextY = height * 0.15 + nextNormalizedY * height * 0.7;
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();
        }
      });
    }
    
    // Draw loop selection if active
    if (loopStart !== null && loopEnd !== null) {
      const loopStartX = ((loopStart - startTime) / (timeSpan * 1000)) * width * 0.8;
      const loopEndX = ((loopEnd - startTime) / (timeSpan * 1000)) * width * 0.8;
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
      
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loopStartX, 0);
      ctx.lineTo(loopStartX, height);
      ctx.moveTo(loopEndX, 0);
      ctx.lineTo(loopEndX, height);
      ctx.stroke();
    }
    
    // Current position indicator
    const currentX = width * 0.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
    
    ctx.restore();
  }, [data, timeSpan, loopStart, loopEnd, zoomLevel]);
  
  // Handle canvas click for loop selection
  const handleCanvasClick = useCallback((e) => {
    if (!isFrozen) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;
    
    if (relativeX > 0.8) return; // Ignore clicks on waveform area
    
    const now = Date.now();
    const clickTime = now - timeSpan * 1000 + (relativeX / 0.8) * timeSpan * 1000;
    
    if (loopStart === null) {
      setLoopStart(clickTime);
    } else if (loopEnd === null) {
      if (clickTime > loopStart) {
        setLoopEnd(clickTime);
      } else {
        setLoopEnd(loopStart);
        setLoopStart(clickTime);
      }
    } else {
      // Reset
      setLoopStart(clickTime);
      setLoopEnd(null);
    }
  }, [isFrozen, timeSpan, loopStart]);
  
  // Play loop
  const playLoop = useCallback(() => {
    if (!engine || loopStart === null || loopEnd === null) return;
    
    if (isPlaying && loopSourceRef.current) {
      loopSourceRef.current.stop();
      loopSourceRef.current = null;
      setIsPlaying(false);
      return;
    }
    
    const source = engine.playLoop(loopStart, loopEnd);
    if (source) {
      loopSourceRef.current = source;
      setIsPlaying(true);
      source.onended = () => {
        setIsPlaying(false);
        loopSourceRef.current = null;
      };
    }
  }, [engine, loopStart, loopEnd, isPlaying]);
  
  // Save loop
  const saveLoop = useCallback(async () => {
    if (!engine || loopStart === null || loopEnd === null) return;
    
    const blob = await engine.exportLoop(loopStart, loopEnd);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loop-${new Date().toISOString().slice(0, 19)}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [engine, loopStart, loopEnd]);
  
  return (
    <div className="h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimeSlider(!showTimeSlider)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs font-medium transition-all"
          >
            <Clock className="w-3 h-3" />
            {timeSpan}s
          </button>
          
          <button
            onClick={() => setZoomLevel(z => Math.max(0.5, z / 1.5))}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(z => Math.min(4, z * 1.5))}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        {/* Loop controls */}
        {isFrozen && loopStart !== null && loopEnd !== null && (
          <div className="flex items-center gap-2">
            <button
              onClick={playLoop}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isPlaying ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={saveLoop}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Time span slider */}
      {showTimeSlider && (
        <div className="mb-3 flex items-center gap-3 px-2">
          <span className="text-xs text-white/40">20ms</span>
          <Slider
            value={[timeSpan]}
            onValueChange={(v) => setTimeSpan(v[0])}
            min={0.02}
            max={60}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-white/40">60s</span>
        </div>
      )}
      
      {/* Canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
        />
        
        {/* Loop hint */}
        {isFrozen && loopStart === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/60 text-white/60 text-xs">
            Click to set loop start point
          </div>
        )}
        {isFrozen && loopStart !== null && loopEnd === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/60 text-white/60 text-xs">
            Click to set loop end point
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-white/50">In tune</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-white/50">Slightly off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-white/50">Out of tune</span>
        </div>
      </div>
    </div>
  );
}