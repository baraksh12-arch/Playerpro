import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Hand, RotateCcw } from 'lucide-react';

export default function BPMTapWidget() {
  const [bpm, setBpm] = useState(0);
  const [taps, setTaps] = useState([]);
  const [avgBpm, setAvgBpm] = useState(0);
  const tapTimesRef = useRef([]);

  const handleTap = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-8); // Keep last 8 taps

    if (tapTimesRef.current.length >= 2) {
      // Calculate intervals between taps
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }

      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Convert to BPM (60000 ms in a minute)
      const calculatedBpm = Math.round(60000 / avgInterval);
      
      if (calculatedBpm > 30 && calculatedBpm < 300) {
        setBpm(calculatedBpm);
        
        // Calculate running average
        const allBpms = intervals.map(interval => 60000 / interval);
        const avg = Math.round(allBpms.reduce((a, b) => a + b, 0) / allBpms.length);
        setAvgBpm(avg);
      }
    }

    setTaps([...taps, now].slice(-4));

    // Visual feedback
    const button = document.getElementById('tap-button');
    if (button) {
      button.classList.add('scale-95');
      setTimeout(() => button.classList.remove('scale-95'), 100);
    }
  };

  const handleReset = () => {
    setBpm(0);
    setAvgBpm(0);
    setTaps([]);
    tapTimesRef.current = [];
  };

  // Auto-reset if no tap for 3 seconds
  useEffect(() => {
    if (taps.length > 0) {
      const timer = setTimeout(() => {
        if (Date.now() - taps[taps.length - 1] > 3000) {
          handleReset();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [taps]);

  const getTempo = (bpm) => {
    if (bpm < 60) return 'Largo';
    if (bpm < 76) return 'Adagio';
    if (bpm < 108) return 'Andante';
    if (bpm < 120) return 'Moderato';
    if (bpm < 168) return 'Allegro';
    if (bpm < 200) return 'Presto';
    return 'Prestissimo';
  };

  return (
    <div className="space-y-6">
      {/* BPM Display */}
      <div className="text-center">
        <div className="text-7xl font-black text-white mb-2">
          {bpm || '---'}
        </div>
        <div className="text-white/60 text-sm">BPM</div>
        {bpm > 0 && (
          <div className="text-white/40 text-xs mt-2">
            {getTempo(bpm)}
          </div>
        )}
      </div>

      {/* Average BPM */}
      {avgBpm > 0 && taps.length > 2 && (
        <div className="text-center bg-white/10 rounded-lg p-3">
          <div className="text-white/60 text-xs mb-1">Average</div>
          <div className="text-2xl font-bold text-cyan-400">{avgBpm} BPM</div>
          <div className="text-white/40 text-xs mt-1">
            Based on {tapTimesRef.current.length} taps
          </div>
        </div>
      )}

      {/* Tap Button */}
      <div className="flex justify-center">
        <Button
          id="tap-button"
          onClick={handleTap}
          size="lg"
          className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-2xl transition-transform active:scale-95"
        >
          <div className="flex flex-col items-center gap-2">
            <Hand className="w-16 h-16" />
            <span className="text-xl font-bold">TAP</span>
          </div>
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-white/60">
        {taps.length === 0 ? (
          <p>Tap the button to the beat of the music</p>
        ) : taps.length === 1 ? (
          <p>Keep tapping to calculate BPM...</p>
        ) : (
          <p>Great! Keep tapping for better accuracy</p>
        )}
      </div>

      {/* Visual Tap Indicators */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all ${
              i < taps.length
                ? 'bg-cyan-500 scale-100'
                : 'bg-white/10 scale-75'
            }`}
          />
        ))}
      </div>

      {/* Reset Button */}
      {bpm > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      )}

      {/* Common Tempos Reference */}
      <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
        <div className="grid grid-cols-2 gap-2">
          <div>Slow: 60-76</div>
          <div>Medium: 108-120</div>
          <div>Fast: 168-200</div>
          <div>Very Fast: 200+</div>
        </div>
      </div>
    </div>
  );
}

// Add useEffect import
import { useEffect } from 'react';