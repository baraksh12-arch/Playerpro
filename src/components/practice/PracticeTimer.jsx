import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Clock, Check, Minus, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const PRACTICE_TYPES = [
  { key: 'scales', name: 'Scales', icon: '🎼' },
  { key: 'song', name: 'Song', icon: '🎵' },
  { key: 'technique', name: 'Technique', icon: '🎸' },
  { key: 'free', name: 'Free', icon: '🎹' },
];

const PRESET_TIMES = [5, 10, 15, 20, 30, 45, 60];

export default function PracticeTimer({ studentId }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('countdown');
  const [targetMinutes, setTargetMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [practiceType, setPracticeType] = useState('');
  const [focusDescription, setFocusDescription] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef(null);

  const savePracticeSessionMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PracticeSession.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPracticeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['studentPractice'] });
    },
  });

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (mode === 'countdown') {
            const newSeconds = prev - 1;
            if (newSeconds <= 0) {
              handleComplete();
              return 0;
            }
            return newSeconds;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode]);

  const handleStart = () => {
    if (!practiceType) return;
    if (mode === 'countdown') setSeconds(targetMinutes * 60);
    setStartTime(new Date().toISOString());
    setIsRunning(true);
    setCompleted(false);
  };

  const handlePause = () => setIsRunning(false);

  const handleComplete = () => {
    setIsRunning(false);
    setCompleted(true);
    if (startTime && practiceType) {
      const endTime = new Date().toISOString();
      const duration = mode === 'countdown' ? targetMinutes * 60 - seconds : seconds;
      savePracticeSessionMutation.mutate({
        student_id: studentId,
        type: practiceType,
        focus_description: focusDescription || undefined,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: duration,
      });
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
    setStartTime(null);
    setCompleted(false);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (mode === 'countdown' && targetMinutes > 0) {
      return ((targetMinutes * 60 - seconds) / (targetMinutes * 60)) * 100;
    }
    return 0;
  };

  const adjustTime = (delta) => {
    setTargetMinutes(prev => Math.min(120, Math.max(1, prev + delta)));
  };

  // Calculate circle progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (getProgress() / 100) * circumference;

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Header */}
          <div className="pt-8 pb-2 px-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white/90">Practice Timer</h2>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="px-8 pb-4">
            <div className="bg-white/5 rounded-2xl p-1 flex">
              <button
                onClick={() => !isRunning && setMode('countdown')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'countdown' 
                    ? 'bg-cyan-500 text-white shadow-lg' 
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Count Down
              </button>
              <button
                onClick={() => !isRunning && setMode('countup')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'countup' 
                    ? 'bg-cyan-500 text-white shadow-lg' 
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Count Up
              </button>
            </div>
          </div>

          {/* Timer Display with Circle Progress */}
          <div className="px-8 py-6 flex flex-col items-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Background Circle */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                {/* Progress Circle */}
                {mode === 'countdown' && (isRunning || seconds > 0) && (
                  <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    fill="none"
                    stroke="url(#timerGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    className="transition-all duration-1000"
                  />
                )}
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Time Display */}
              <div className="relative z-10 text-center">
                {completed ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="text-xl font-medium text-green-400">Session Saved!</div>
                  </div>
                ) : (
                  <>
                    <div className="text-[4.5rem] font-extralight text-white tracking-tight leading-none">
                      {mode === 'countdown' && !isRunning && seconds === 0 
                        ? formatTime(targetMinutes * 60)
                        : formatTime(seconds)
                      }
                    </div>
                    {isRunning && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 rounded-full">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-cyan-400 capitalize">{practiceType}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Time Adjustment (Countdown mode, not running) */}
          {mode === 'countdown' && !isRunning && !completed && (
            <div className="px-8 pb-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => adjustTime(-5)}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
                >
                  <Minus className="w-5 h-5 text-white/70" />
                </button>
                <div className="text-center">
                  <div className="text-3xl font-light text-white">{targetMinutes}</div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">minutes</div>
                </div>
                <button
                  onClick={() => adjustTime(5)}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              {/* Preset Times */}
              <div className="flex justify-center gap-2 flex-wrap">
                {PRESET_TIMES.map((time) => (
                  <button
                    key={time}
                    onClick={() => setTargetMinutes(time)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      targetMinutes === time
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {time}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Play/Pause Button */}
          <div className="px-8 pb-6 flex justify-center gap-4">
            {completed ? (
              <button
                onClick={handleReset}
                className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <RotateCcw className="w-8 h-8 text-white" />
              </button>
            ) : !isRunning ? (
              <button
                onClick={handleStart}
                disabled={!practiceType}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  practiceType
                    ? 'bg-gradient-to-br from-cyan-400 to-blue-600 hover:from-cyan-500 hover:to-blue-700 shadow-xl shadow-cyan-500/30'
                    : 'bg-white/10 cursor-not-allowed'
                }`}
              >
                <Play className={`w-10 h-10 ml-1 ${practiceType ? 'text-white' : 'text-white/30'}`} fill={practiceType ? 'white' : 'rgba(255,255,255,0.3)'} />
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
                >
                  <Pause className="w-8 h-8 text-white" fill="white" />
                </button>
                <button
                  onClick={handleComplete}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 shadow-xl shadow-green-500/30 flex items-center justify-center transition-all active:scale-95"
                >
                  <Check className="w-8 h-8 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Controls Section */}
          <div className="bg-black/30 px-6 py-6 space-y-5">
            
            {/* Practice Type Selection */}
            {!isRunning && !completed && (
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                  Practice Focus
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRACTICE_TYPES.map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setPracticeType(type.key)}
                      className={`py-3 rounded-2xl transition-all text-center ${
                        practiceType === type.key
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{type.icon}</div>
                      <div className="text-[10px] font-medium">{type.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Description */}
            {!isRunning && !completed && practiceType && (
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                  Details (optional)
                </label>
                <input
                  type="text"
                  value={focusDescription}
                  onChange={(e) => setFocusDescription(e.target.value)}
                  placeholder="e.g., C Major scale, Sweet Child O' Mine"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            )}

            {/* Tips */}
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="text-xs text-white/50 space-y-1">
                <p>• Select a practice focus to start the timer</p>
                <p>• Sessions are automatically saved when completed</p>
                <p>• Track your progress in the Progress page</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}