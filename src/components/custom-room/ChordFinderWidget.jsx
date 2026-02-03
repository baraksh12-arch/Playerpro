import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORD_TYPES = ['Major', 'Minor', 'Dominant 7', 'Major 7', 'Minor 7'];

export default function ChordFinderWidget() {
  const [selectedNote, setSelectedNote] = useState('C');
  const [selectedType, setSelectedType] = useState('Major');

  return (
    <div className="space-y-4">
      {/* Chord Display */}
      <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20">
        <div className="text-5xl font-black text-white mb-2">
          {selectedNote} {selectedType}
        </div>
        <div className="text-sm text-purple-200">Current Chord</div>
      </div>

      {/* Root Note Selection */}
      <div>
        <div className="text-sm text-purple-200 mb-2 font-semibold">Root Note:</div>
        <div className="grid grid-cols-6 gap-2">
          {NOTES.map((note) => (
            <button
              key={note}
              onClick={() => setSelectedNote(note)}
              className={`p-3 rounded-xl font-bold transition-all ${
                selectedNote === note
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white scale-110'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } border border-white/20`}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Chord Type Selection */}
      <div>
        <div className="text-sm text-purple-200 mb-2 font-semibold">Chord Type:</div>
        <div className="grid grid-cols-2 gap-2">
          {CHORD_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`p-3 rounded-xl font-bold transition-all text-sm ${
                selectedType === type
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } border border-white/20`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}