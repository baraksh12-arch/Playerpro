import React, { useState, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BPMTapWidget() {
  const [bpm, setBpm] = useState(0);
  const [taps, setTaps] = useState([]);
  const lastTapRef = useRef(null);

  const handleTap = () => {
    const now = Date.now();
    
    if (lastTapRef.current && (now - lastTapRef.current) > 2000) {
      // Reset if more than 2 seconds between taps
      setTaps([now]);
      lastTapRef.current = now;
      setBpm(0);
      return;
    }

    const newTaps = [...taps, now];
    setTaps(newTaps);
    lastTapRef.current = now;

    if (newTaps.length >= 2) {
      // Calculate average time between taps
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
    }
  };

  const handleReset = () => {
    setTaps([]);
    setBpm(0);
    lastTapRef.current = null;
  };

  return (
    <div className="space-y-4">
      {/* BPM Display */}
      <div className="text-center p-8 bg-white/10 rounded-2xl border border-white/20">
        <div className="text-7xl font-black text-white mb-2">
          {bpm || '--'}
        </div>
        <div className="text-sm text-purple-200">BPM</div>
      </div>

      {/* Tap Button */}
      <button
        onClick={handleTap}
        className="w-full h-32 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-2xl transition-all active:scale-95 shadow-2xl"
      >
        TAP
      </button>

      {/* Tap Count & Reset */}
      <div className="flex items-center justify-between">
        <div className="text-white text-sm">
          {taps.length > 0 ? `${taps.length} taps` : 'Start tapping'}
        </div>
        <Button
          onClick={handleReset}
          className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-xl border border-white/30"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}