import React, { useState, useRef } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export default function NoteTrainerWidget() {
  const [targetNote, setTargetNote] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);
  const audioContextRef = useRef(null);

  const generateQuestion = () => {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    setTargetNote(note);
    setFeedback(null);
    playNote(note);
  };

  const playNote = (noteName) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const noteIndex = NOTES.indexOf(noteName);
    const frequency = 440 * Math.pow(2, ((noteIndex * 2 - 9) / 12));

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  };

  const checkAnswer = (answer) => {
    const isCorrect = answer === targetNote;
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

      {/* Play/Start Button */}
      {!targetNote ? (
        <Button
          onClick={generateQuestion}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-lg"
        >
          <Play className="w-6 h-6 mr-2" />
          Start Training
        </Button>
      ) : (
        <>
          {/* Feedback */}
          {feedback && (
            <div className={`p-4 rounded-2xl text-center font-bold ${
              feedback === 'correct'
                ? 'bg-green-500/30 text-green-200 border border-green-500/50'
                : 'bg-red-500/30 text-red-200 border border-red-500/50'
            }`}>
              {feedback === 'correct' ? '✓ Correct!' : `✗ It was ${targetNote}`}
            </div>
          )}

          <Button
            onClick={() => playNote(targetNote)}
            className="w-full h-14 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-xl border border-white/30"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Replay Note
          </Button>

          {/* Answer Options */}
          <div className="grid grid-cols-4 gap-2">
            {NOTES.map((note) => (
              <button
                key={note}
                onClick={() => !feedback && checkAnswer(note)}
                disabled={!!feedback}
                className={`p-4 rounded-xl font-bold transition-all ${
                  feedback && note === targetNote
                    ? 'bg-green-500 text-white'
                    : feedback
                    ? 'opacity-50 bg-white/10 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                } border border-white/20`}
              >
                {note}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}