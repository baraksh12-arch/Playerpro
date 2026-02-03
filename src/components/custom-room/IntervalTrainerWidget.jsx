import React, { useState, useRef } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INTERVALS = {
  'M2': { name: 'Major 2nd', semitones: 2 },
  'M3': { name: 'Major 3rd', semitones: 4 },
  'P4': { name: 'Perfect 4th', semitones: 5 },
  'P5': { name: 'Perfect 5th', semitones: 7 },
  'P8': { name: 'Octave', semitones: 12 },
};

export default function IntervalTrainerWidget() {
  const [targetInterval, setTargetInterval] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);
  const audioContextRef = useRef(null);

  const generateQuestion = () => {
    const intervals = Object.keys(INTERVALS);
    const interval = intervals[Math.floor(Math.random() * intervals.length)];
    setTargetInterval(interval);
    setFeedback(null);
    playInterval(interval);
  };

  const playInterval = (intervalKey) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const baseFreq = 440;
    const semitones = INTERVALS[intervalKey].semitones;
    const secondFreq = baseFreq * Math.pow(2, semitones / 12);

    // Play first note
    setTimeout(() => {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = baseFreq;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.6);
    }, 0);

    // Play second note
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = secondFreq;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.6);
    }, 700);
  };

  const checkAnswer = (answer) => {
    const isCorrect = answer === targetInterval;
    setScore({
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    });
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
      generateQuestion();
    }, 1500);
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-4 bg-white/10 rounded-2xl border border-white/20">
          <div className="text-3xl font-black text-white">{accuracy}%</div>
          <div className="text-xs text-purple-200">Accuracy</div>
        </div>
        <div className="text-center p-4 bg-white/10 rounded-2xl border border-white/20">
          <div className="text-3xl font-black text-white">{score.correct}/{score.total}</div>
          <div className="text-xs text-purple-200">Score</div>
        </div>
      </div>

      {!targetInterval ? (
        <Button
          onClick={generateQuestion}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg"
        >
          <Play className="w-6 h-6 mr-2" />
          Start Training
        </Button>
      ) : (
        <>
          {feedback && (
            <div className={`p-4 rounded-2xl text-center font-bold ${
              feedback === 'correct'
                ? 'bg-green-500/30 text-green-200 border border-green-500/50'
                : 'bg-red-500/30 text-red-200 border border-red-500/50'
            }`}>
              {feedback === 'correct' ? '✓ Correct!' : `✗ It was ${INTERVALS[targetInterval].name}`}
            </div>
          )}

          <Button
            onClick={() => playInterval(targetInterval)}
            className="w-full h-14 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-xl border border-white/30"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Replay Interval
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(INTERVALS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => !feedback && checkAnswer(key)}
                disabled={!!feedback}
                className={`p-4 rounded-xl font-bold transition-all text-sm ${
                  feedback && key === targetInterval
                    ? 'bg-green-500 text-white'
                    : feedback
                    ? 'opacity-50 bg-white/10 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                } border border-white/20`}
              >
                {value.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}