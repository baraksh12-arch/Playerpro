import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CHORD_LIBRARY = {
  'C': { Major: [null, 3, 2, 0, 1, 0], Minor: [null, 3, 5, 5, 4, 3], '7': [null, 3, 2, 3, 1, 0] },
  'D': { Major: [null, null, 0, 2, 3, 2], Minor: [null, null, 0, 2, 3, 1], '7': [null, null, 0, 2, 1, 2] },
  'E': { Major: [0, 2, 2, 1, 0, 0], Minor: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0] },
  'F': { Major: [1, 3, 3, 2, 1, 1], Minor: [1, 3, 3, 1, 1, 1], '7': [1, 3, 1, 2, 1, 1] },
  'G': { Major: [3, 2, 0, 0, 0, 3], Minor: [3, 5, 5, 3, 3, 3], '7': [3, 2, 0, 0, 0, 1] },
  'A': { Major: [null, 0, 2, 2, 2, 0], Minor: [null, 0, 2, 2, 1, 0], '7': [null, 0, 2, 0, 2, 0] },
  'B': { Major: [null, 2, 4, 4, 4, 2], Minor: [null, 2, 4, 4, 3, 2], '7': [null, 2, 1, 2, 0, 2] },
};

export default function ChordFinderWidget() {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedType, setSelectedType] = useState('Major');

  const chordDiagram = CHORD_LIBRARY[selectedRoot]?.[selectedType] || [];

  return (
    <div className="space-y-4">
      {/* Chord Selection */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-white/60 block mb-1">Root Note</label>
          <Select value={selectedRoot} onValueChange={setSelectedRoot}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CHORD_LIBRARY).map((note) => (
                <SelectItem key={note} value={note}>{note}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-white/60 block mb-1">Type</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Major">Major</SelectItem>
              <SelectItem value="Minor">Minor</SelectItem>
              <SelectItem value="7">7th</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chord Name Display */}
      <div className="text-center">
        <div className="text-3xl font-black text-white">
          {selectedRoot}{selectedType === 'Minor' ? 'm' : selectedType === '7' ? '7' : ''}
        </div>
      </div>

      {/* Chord Diagram */}
      <div className="bg-white/10 rounded-lg p-4">
        <svg viewBox="0 0 100 120" className="w-full">
          {/* Strings */}
          {[0, 1, 2, 3, 4, 5].map((string) => (
            <line
              key={`string-${string}`}
              x1={10 + string * 16}
              y1="10"
              x2={10 + string * 16}
              y2="110"
              stroke="white"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Frets */}
          {[0, 1, 2, 3, 4].map((fret) => (
            <line
              key={`fret-${fret}`}
              x1="10"
              y1={10 + fret * 20}
              x2="90"
              y2={10 + fret * 20}
              stroke="white"
              strokeWidth={fret === 0 ? "2" : "0.5"}
            />
          ))}

          {/* Finger Positions */}
          {chordDiagram.map((fret, string) => {
            if (fret === null) {
              return (
                <text
                  key={`x-${string}`}
                  x={10 + string * 16}
                  y="5"
                  textAnchor="middle"
                  className="fill-red-400 text-[8px] font-bold"
                >
                  ✕
                </text>
              );
            }
            if (fret === 0) {
              return (
                <circle
                  key={`o-${string}`}
                  cx={10 + string * 16}
                  cy="5"
                  r="3"
                  className="fill-none stroke-white"
                  strokeWidth="1"
                />
              );
            }
            return (
              <circle
                key={`fret-${string}-${fret}`}
                cx={10 + string * 16}
                cy={10 + (fret - 0.5) * 20}
                r="4"
                className="fill-cyan-400"
              />
            );
          })}
        </svg>
      </div>

      {/* String Names */}
      <div className="flex justify-between px-4 text-xs text-white/60">
        {['E', 'A', 'D', 'G', 'B', 'E'].map((note, i) => (
          <div key={i}>{note}</div>
        ))}
      </div>

      {/* Quick Chords */}
      <div className="grid grid-cols-3 gap-1">
        {['C', 'G', 'D', 'A', 'E', 'F'].map((chord) => (
          <button
            key={chord}
            onClick={() => {
              setSelectedRoot(chord);
              setSelectedType('Major');
            }}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-medium transition-all"
          >
            {chord}
          </button>
        ))}
      </div>
    </div>
  );
}