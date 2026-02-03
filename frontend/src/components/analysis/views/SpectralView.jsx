import React, { useRef, useEffect, useState } from 'react';

export default function SpectralView({ data, isFrozen, mode = 'line' }) {
  const canvasRef = useRef(null);
  const [frozenSpectrum, setFrozenSpectrum] = useState(null);
  
  // Store frozen spectrum
  useEffect(() => {
    if (isFrozen && data?.spectrum && !frozenSpectrum) {
      setFrozenSpectrum(new Uint8Array(data.spectrum));
    } else if (!isFrozen) {
      setFrozenSpectrum(null);
    }
  }, [isFrozen, data?.spectrum, frozenSpectrum]);
  
  // Draw spectrum
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
    const labelWidth = 50;
    const bottomPadding = 30;
    const graphWidth = width - labelWidth;
    const graphHeight = height - bottomPadding;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Frequency grid (0-10kHz)
    const freqMarkers = [100, 500, 1000, 2000, 5000, 10000];
    const sampleRate = data?.sampleRate || 48000;
    const nyquist = sampleRate / 2;
    const maxDisplayFreq = 10000;
    
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    
    freqMarkers.forEach(freq => {
      if (freq <= maxDisplayFreq) {
        const x = labelWidth + (freq / maxDisplayFreq) * graphWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, graphHeight);
        ctx.stroke();
        
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
        ctx.fillText(label, x, height - 10);
      }
    });
    
    // dB grid
    ctx.textAlign = 'right';
    for (let db = 0; db >= -60; db -= 20) {
      const y = ((0 - db) / 60) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(labelWidth, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      ctx.fillText(`${db}dB`, labelWidth - 5, y + 4);
    }
    
    // Draw spectrum
    const spectrum = data?.spectrum;
    if (!spectrum) {
      ctx.restore();
      return;
    }
    
    const binWidth = nyquist / spectrum.length;
    const maxBin = Math.min(spectrum.length, Math.floor(maxDisplayFreq / binWidth));
    
    // Draw frozen spectrum if available (in different color)
    if (frozenSpectrum) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.lineWidth = 1;
      
      drawSpectrum(ctx, frozenSpectrum, labelWidth, graphWidth, graphHeight, maxBin, mode);
    }
    
    // Draw live spectrum
    if (!isFrozen || !frozenSpectrum) {
      const gradient = ctx.createLinearGradient(labelWidth, 0, width, 0);
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0.8)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)');
      
      ctx.strokeStyle = gradient;
      
      const fillGradient = ctx.createLinearGradient(labelWidth, 0, width, 0);
      fillGradient.addColorStop(0, 'rgba(34, 211, 238, 0.15)');
      fillGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
      fillGradient.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
      
      ctx.fillStyle = fillGradient;
      ctx.lineWidth = 1.5;
      
      drawSpectrum(ctx, spectrum, labelWidth, graphWidth, graphHeight, maxBin, mode);
    }
    
    // Draw fundamental frequency marker
    if (data?.pitch?.freq > 0 && data.pitch.freq < maxDisplayFreq) {
      const fundamentalX = labelWidth + (data.pitch.freq / maxDisplayFreq) * graphWidth;
      
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(fundamentalX, 0);
      ctx.lineTo(fundamentalX, graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`f₀ ${data.pitch.freq.toFixed(0)}Hz`, fundamentalX, 15);
    }
    
    ctx.restore();
  }, [data, isFrozen, frozenSpectrum, mode]);
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {/* Info overlay */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-white/60 text-xs">
          0 - 10 kHz
        </div>
        
        {frozenSpectrum && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-white/60 text-xs">Frozen</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-white/60 text-xs">Live</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function drawSpectrum(ctx, spectrum, labelWidth, graphWidth, graphHeight, maxBin, mode) {
  ctx.beginPath();
  ctx.moveTo(labelWidth, graphHeight);
  
  for (let i = 0; i < maxBin; i++) {
    const x = labelWidth + (i / maxBin) * graphWidth;
    const magnitude = spectrum[i] / 255;
    const db = magnitude > 0 ? 20 * Math.log10(magnitude) : -60;
    const normalizedDb = Math.max(0, (db + 60) / 60);
    const y = graphHeight - normalizedDb * graphHeight;
    
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  
  if (mode === 'filled') {
    ctx.lineTo(labelWidth + graphWidth, graphHeight);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.stroke();
}