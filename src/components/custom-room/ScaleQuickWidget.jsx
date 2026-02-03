import React, { useState, useRef } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = ['Major', 'Natural Minor', 'Pentatonic', 'Blues'];

const SCALE_FORMULAS = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  'Pentatonic': [0, 2, 4, 7, 9],
  'Blues': [0, 3, 5, 6, 7, 10],
};

export default function ScaleQuickWidget() {
  const [selectedNote, setSelectedNote] = useState('C');
  const [selectedScale, setSelectedScale] = useState('Major');
  const audioContextRef = useRef(null);

  const playScale = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const rootIndex = NOTES.indexOf(selectedNote);
    const formula = SCALE_FORMULAS[selectedScale];

    formula.forEach((interval, idx) => {
      setTimeout(() => {
        const noteIndex = (rootIndex + interval) % 12;
        const frequency = 440 * Math.pow(2, ((noteIndex - 9) / 12));

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
      }, idx * 350);
    });
  };

  return (
    <div className="space-y-4">
      {/* Scale Display */}
      <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20">
        <div className="text-4xl font-black text-white mb-2">
          {selectedNote} {selectedScale}
        </div>
        <Button
          onClick={playScale}
          className="mt-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
        >
          <Play className="w-4 h-4 mr-2" />
          Play Scale
        </Button>
      </div>

      {/* Root Note */}
      <div>
        <div className="text-sm text-purple-200 mb-2 font-semibold">Root:</div>
        <div className="grid grid-cols-6 gap-2">
          {NOTES.map((note) => (
            <button
              key={note}
              onClick={() => setSelectedNote(note)}
              className={`p-3 rounded-xl font-bold transition-all text-sm ${
                selectedNote === note
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white scale-110'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } border border-white/20`}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Scale Type */}
      <div>
        <div className="text-sm text-purple-200 mb-2 font-semibold">Scale:</div>
        <div className="grid grid-cols-2 gap-2">
          {SCALES.map((scale) => (
            <button
              key={scale}
              onClick={() => setSelectedScale(scale)}
              className={`p-3 rounded-xl font-bold transition-all text-sm ${
                selectedScale === scale
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } border border-white/20`}
            >
              {scale}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}