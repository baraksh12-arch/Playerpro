import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const CLEFS = [
  { id: 'treble', name: 'Treble', midiRange: [60, 84] }, // C4 to C6
  { id: 'bass', name: 'Bass', midiRange: [36, 60] }, // C2 to C4
  { id: 'tenor', name: 'Tenor', midiRange: [48, 72] },
  { id: 'alto', name: 'Alto', midiRange: [48, 72] },
  { id: 'grand', name: 'Grand', midiRange: [36, 84] },
];

const NOTE_POSITIONS = {
  // Treble clef - middle C (60) is on first ledger line below
  treble: { baseY: 0, baseMidi: 64 }, // E4 is on bottom line
  bass: { baseY: 0, baseMidi: 43 }, // G2 is on bottom line
  tenor: { baseY: 0, baseMidi: 48 },
  alto: { baseY: 0, baseMidi: 48 },
  grand: { baseY: 0, baseMidi: 60 },
};

export default function NoteStaffView({ data, isFrozen, engine }) {
  const canvasRef = useRef(null);
  const [clef, setClef] = useState('treble');
  const [timeSpan, setTimeSpan] = useState(10); // seconds
  const [showWave, setShowWave] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Draw staff
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
    const padding = { top: 30, bottom: 30, left: 60, right: 20 };
    const staffHeight = height - padding.top - padding.bottom;
    const lineSpacing = staffHeight / 8; // Space between staff lines
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw staff lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    const staffTop = padding.top + lineSpacing;
    for (let i = 0; i < 5; i++) {
      const y = staffTop + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Clef symbol (simplified)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clef === 'treble' ? '𝄞' : clef === 'bass' ? '𝄢' : '𝄡', padding.left - 25, staffTop + lineSpacing * 2 + 8);
    
    // Get history data
    const history = data?.history || [];
    const now = Date.now();
    const startTime = now - timeSpan * 1000;
    
    // Filter to time range
    const visibleHistory = history.filter(h => h.time >= startTime && h.time <= now && !h.isSilent);
    
    if (visibleHistory.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Play a note...', width / 2, height / 2);
      ctx.restore();
      return;
    }
    
    // Group consecutive notes
    const noteBlocks = [];
    let currentBlock = null;
    
    visibleHistory.forEach((point, i) => {
      const noteKey = `${point.note}${point.octave}`;
      
      if (!currentBlock || currentBlock.noteKey !== noteKey || point.time - currentBlock.endTime > 100) {
        if (currentBlock) {
          noteBlocks.push(currentBlock);
        }
        currentBlock = {
          noteKey,
          note: point.note,
          octave: point.octave,
          midiNumber: point.midiNumber || (point.octave + 1) * 12 + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(point.note),
          startTime: point.time,
          endTime: point.time,
          cents: [point.cents],
          freq: point.freq
        };
      } else {
        currentBlock.endTime = point.time;
        currentBlock.cents.push(point.cents);
      }
    });
    if (currentBlock) noteBlocks.push(currentBlock);
    
    // Draw note blocks
    const graphWidth = width - padding.left - padding.right;
    const clefConfig = NOTE_POSITIONS[clef] || NOTE_POSITIONS.treble;
    const clefMidiRange = CLEFS.find(c => c.id === clef)?.midiRange || [60, 84];
    
    noteBlocks.forEach(block => {
      const startX = padding.left + ((block.startTime - startTime) / (timeSpan * 1000)) * graphWidth;
      const endX = padding.left + ((block.endTime - startTime) / (timeSpan * 1000)) * graphWidth;
      const blockWidth = Math.max(4, endX - startX);
      
      // Calculate Y position based on MIDI number
      const midiRange = clefMidiRange[1] - clefMidiRange[0];
      const normalizedMidi = Math.max(0, Math.min(1, (block.midiNumber - clefMidiRange[0]) / midiRange));
      const y = staffTop + (1 - normalizedMidi) * staffHeight;
      
      // Average cents for coloring
      const avgCents = block.cents.reduce((a, b) => a + b, 0) / block.cents.length;
      const absCents = Math.abs(avgCents);
      
      // Color based on intonation
      let color, bgColor;
      if (absCents < 5) {
        color = 'rgba(52, 211, 153, 0.9)';
        bgColor = 'rgba(52, 211, 153, 0.2)';
      } else if (absCents < 15) {
        color = 'rgba(251, 191, 36, 0.9)';
        bgColor = 'rgba(251, 191, 36, 0.2)';
      } else {
        color = 'rgba(248, 113, 113, 0.9)';
        bgColor = 'rgba(248, 113, 113, 0.2)';
      }
      
      // Draw note bar
      const barHeight = lineSpacing * 0.8;
      
      // Sharp/flat shading (lighter top = sharp, lighter bottom = flat)
      const gradient = ctx.createLinearGradient(startX, y - barHeight / 2, startX, y + barHeight / 2);
      if (avgCents > 3) {
        // Sharp - lighter top
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, bgColor);
      } else if (avgCents < -3) {
        // Flat - lighter bottom
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(1, color);
      } else {
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color);
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(startX, y - barHeight / 2, blockWidth, barHeight, 3);
      ctx.fill();
      
      // Note name on bar (if wide enough)
      if (blockWidth > 30) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(block.noteKey, startX + blockWidth / 2, y + 4);
      }
      
      // Ledger lines if needed
      const ledgerY = y;
      if (ledgerY < staffTop) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let ly = staffTop - lineSpacing; ly >= ledgerY - lineSpacing / 2; ly -= lineSpacing) {
          ctx.beginPath();
          ctx.moveTo(startX - 5, ly);
          ctx.lineTo(startX + blockWidth + 5, ly);
          ctx.stroke();
        }
      } else if (ledgerY > staffTop + lineSpacing * 4) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let ly = staffTop + lineSpacing * 5; ly <= ledgerY + lineSpacing / 2; ly += lineSpacing) {
          ctx.beginPath();
          ctx.moveTo(startX - 5, ly);
          ctx.lineTo(startX + blockWidth + 5, ly);
          ctx.stroke();
        }
      }
    });
    
    // Current time marker
    const currentX = width - padding.right;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, padding.top);
    ctx.lineTo(currentX, height - padding.bottom);
    ctx.stroke();
    
    ctx.restore();
  }, [data, clef, timeSpan, showWave, scrollOffset]);
  
  return (
    <div className="h-full flex flex-col p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {CLEFS.slice(0, 4).map(c => (
            <button
              key={c.id}
              onClick={() => setClef(c.id)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                clef === c.id
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeSpan(t => Math.max(2, t / 1.5))}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <span className="text-white/50 text-xs w-12 text-center">{timeSpan}s</span>
          <button
            onClick={() => setTimeSpan(t => Math.min(60, t * 1.5))}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span className="text-white/50">In tune</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-b from-amber-400 to-amber-400/30" />
          <span className="text-white/50">Sharp ↑</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-b from-red-400/30 to-red-400" />
          <span className="text-white/50">Flat ↓</span>
        </div>
      </div>
    </div>
  );
}