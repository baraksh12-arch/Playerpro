import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E (in semitones from C)

const SCALES = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
};

export default function FretboardWidget() {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedScale, setSelectedScale] = useState('Major');
  const [showAllNotes, setShowAllNotes] = useState(false);

  const rootIndex = NOTES.indexOf(selectedRoot);
  const scaleIntervals = SCALES[selectedScale];

  const isInScale = (noteIndex) => {
    const relativeNote = (noteIndex - rootIndex + 12) % 12;
    return scaleIntervals.includes(relativeNote);
  };

  const isRootNote = (noteIndex) => {
    return noteIndex % 12 === rootIndex;
  };

  return (
    <div className="space-y-4">
      {/* Scale Selection */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedRoot}
          onChange={(e) => setSelectedRoot(e.target.value)}
          className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-sm"
        >
          {NOTES.map((note) => (
            <option key={note} value={note} className="bg-gray-900">{note}</option>
          ))}
        </select>
        <select
          value={selectedScale}
          onChange={(e) => setSelectedScale(e.target.value)}
          className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-sm"
        >
          {Object.keys(SCALES).map((scale) => (
            <option key={scale} value={scale} className="bg-gray-900">{scale}</option>
          ))}
        </select>
      </div>

      {/* Scale Name */}
      <div className="text-center">
        <div className="text-2xl font-black text-white">
          {selectedRoot} {selectedScale}
        </div>
      </div>

      {/* Fretboard */}
      <div className="bg-white/10 rounded-lg p-2 overflow-x-auto">
        <div className="min-w-[400px]">
          {STRING_TUNING.map((stringTuning, stringIdx) => (
            <div key={stringIdx} className="flex items-center mb-1">
              {/* String name */}
              <div className="w-6 text-white/60 text-xs">
                {NOTES[(stringTuning + rootIndex) % 12]}
              </div>
              
              {/* Frets */}
              <div className="flex-1 flex">
                {Array.from({ length: 12 }).map((_, fretIdx) => {
                  const noteIndex = (stringTuning + fretIdx) % 12;
                  const inScale = isInScale(noteIndex);
                  const isRoot = isRootNote(noteIndex);
                  
                  return (
                    <div
                      key={fretIdx}
                      className="flex-1 h-8 border-r border-white/20 flex items-center justify-center relative"
                      style={{
                        borderTop: stringIdx === 0 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        borderBottom: stringIdx === STRING_TUNING.length - 1 ? '2px solid rgba(255,255,255,0.3)' : 'none',
                      }}
                    >
                      {(inScale || showAllNotes) && (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isRoot
                              ? 'bg-cyan-500 text-white'
                              : inScale
                              ? 'bg-white/20 text-white'
                              : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {NOTES[noteIndex]}
                        </div>
                      )}
                      
                      {/* Fret markers */}
                      {stringIdx === 2 && [3, 5, 7, 9].includes(fretIdx) && (
                        <div className="absolute top-full mt-1 w-1 h-1 bg-white/30 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAllNotes(!showAllNotes)}
          className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition-all"
        >
          {showAllNotes ? 'Hide Non-Scale Notes' : 'Show All Notes'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-white/60">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-cyan-500" />
          <span>Root</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-white/20" />
          <span>Scale</span>
        </div>
      </div>
    </div>
  );
}