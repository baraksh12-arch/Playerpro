import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TimerWidget() {
  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [initialMinutes, setInitialMinutes] = useState(15);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && (minutes > 0 || seconds > 0)) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished
            setIsRunning(false);
            playAlarm();
          } else {
            setMinutes(m => m - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(s => s - 1);
        }
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
  }, [isRunning, minutes, seconds]);

  const playAlarm = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }, i * 300);
    }
  };

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setMinutes(initialMinutes);
    setSeconds(0);
  };

  const adjustTime = (delta) => {
    if (!isRunning) {
      const newMinutes = Math.max(1, Math.min(120, initialMinutes + delta));
      setInitialMinutes(newMinutes);
      setMinutes(newMinutes);
      setSeconds(0);
    }
  };

  const totalSeconds = minutes * 60 + seconds;
  const totalInitialSeconds = initialMinutes * 60;
  const progress = (totalSeconds / totalInitialSeconds) * 100;

  const getColor = () => {
    if (progress > 50) return 'from-green-500 to-emerald-500';
    if (progress > 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="space-y-6">
      {/* Timer Display */}
      <div className="relative">
        <svg className="w-full h-48" viewBox="0 0 200 200">
          {/* Background Circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
          />
          {/* Progress Circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
            transform="rotate(-90 100 100)"
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`text-green-400`} stopColor="currentColor" />
              <stop offset="100%" className={`text-emerald-400`} stopColor="currentColor" />
            </linearGradient>
          </defs>
          {/* Time Text */}
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dy=".3em"
            className="text-5xl font-black fill-white"
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </text>
        </svg>
      </div>

      {/* Time Adjustment (when not running) */}
      {!isRunning && (
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={() => adjustTime(-5)}
            size="icon"
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-white/60 text-sm min-w-[80px] text-center">
            Set: {initialMinutes} min
          </div>
          <Button
            onClick={() => adjustTime(5)}
            size="icon"
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleToggle}
          size="lg"
          className={`w-20 h-20 rounded-full ${
            isRunning
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-green-500 hover:bg-green-600'
          } shadow-2xl`}
        >
          {isRunning ? (
            <Pause className="w-10 h-10" />
          ) : (
            <Play className="w-10 h-10 ml-1" />
          )}
        </Button>

        <Button
          onClick={handleReset}
          size="lg"
          variant="outline"
          className="w-20 h-20 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <RotateCcw className="w-10 h-10" />
        </Button>
      </div>

      {/* Preset Durations */}
      <div className="grid grid-cols-4 gap-2">
        {[5, 10, 15, 30].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              if (!isRunning) {
                setInitialMinutes(preset);
                setMinutes(preset);
                setSeconds(0);
              }
            }}
            disabled={isRunning}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isRunning
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {preset}m
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="text-center text-sm text-white/60">
        {isRunning ? '⏱️ Timer running...' : minutes === 0 && seconds === 0 ? '🎉 Time\'s up!' : '⏸️ Ready to start'}
      </div>
    </div>
  );
}