import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NOTES, NOTE_FLATS } from './TunerConstants';

export default function NoteSelector({ 
  selectedNote, 
  selectedOctave, 
  onSelect, 
  preferFlats = false,
  children 
}) {
  const octaves = [2, 3, 4, 5, 6];
  
  const getDisplayNote = (note) => {
    if (preferFlats && NOTE_FLATS[note]) {
      return NOTE_FLATS[note];
    }
    return note.replace('#', '♯');
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="center"
        className="w-auto bg-gray-900/95 backdrop-blur-xl border-white/10 p-3"
      >
        <div className="space-y-3">
          {/* Notes */}
          <div className="grid grid-cols-6 gap-1">
            {NOTES.map((note) => (
              <button
                key={note}
                onClick={() => onSelect(note, selectedOctave)}
                className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                  selectedNote === note
                    ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                    : note.includes('#')
                      ? 'bg-gray-800 text-white/60 hover:bg-gray-700'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {getDisplayNote(note)}
              </button>
            ))}
          </div>
          
          {/* Octaves */}
          <div className="flex items-center justify-center gap-1 pt-2 border-t border-white/10">
            <span className="text-[10px] text-white/40 mr-2">Octave:</span>
            {octaves.map((oct) => (
              <button
                key={oct}
                onClick={() => onSelect(selectedNote, oct)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  selectedOctave === oct
                    ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {oct}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}