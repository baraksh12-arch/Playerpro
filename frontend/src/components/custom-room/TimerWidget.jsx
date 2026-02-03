import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TimerWidget() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  return (
    <div className="space-y-4">
      {/* Time Display */}
      <div className="text-center">
        <div className="text-7xl font-black text-white">
          {formatTime(seconds)}
        </div>
        <div className="text-sm text-purple-200 mt-2">Practice Time</div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsRunning(!isRunning)}
          className="flex-1 h-14 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-xl border border-white/30"
        >
          {isRunning ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button
          onClick={handleReset}
          className="h-14 w-14 rounded-2xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-xl border border-white/30"
        >
          <RotateCcw className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}