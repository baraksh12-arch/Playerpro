import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check } from 'lucide-react';

const INSTRUMENTS = [
  // Guitar Family
  'Acoustic Guitar',
  'Electric Guitar',
  'Bass Guitar',
  'Classical Guitar',
  'Ukulele',
  
  // Orchestral Strings
  'Violin',
  'Viola',
  'Cello',
  'Double Bass',
  'Harp',
  
  // Orchestral Woodwinds
  'Flute',
  'Piccolo',
  'Oboe',
  'Clarinet',
  'Bass Clarinet',
  'Bassoon',
  'Contrabassoon',
  
  // Orchestral Brass
  'French Horn',
  'Trumpet',
  'Trombone',
  'Tuba',
  'Euphonium',
  
  // Orchestral Percussion
  'Timpani',
  'Snare Drum',
  'Marimba',
  'Xylophone',
  'Vibraphone',
  'Glockenspiel',
  
  // Jazz Instruments
  'Saxophone - Alto',
  'Saxophone - Tenor',
  'Saxophone - Baritone',
  'Saxophone - Soprano',
  'Jazz Guitar',
  'Piano',
  'Electric Piano',
  'Organ',
  'Drums',
  'Upright Bass',
  'Electric Bass',
  'Vibraphone',
  'Harmonica',
  
  // Piano Family
  'Grand Piano',
  'Upright Piano',
  'Digital Piano',
  'Synthesizer',
  
  // Voice
  'Voice - Soprano',
  'Voice - Alto',
  'Voice - Tenor',
  'Voice - Bass',
];

export default function InstrumentSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredInstruments = INSTRUMENTS.filter(instrument =>
    instrument.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (instrument) => {
    onChange(instrument);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-40 justify-between text-left font-normal"
        >
          {value || 'Select...'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search instrument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filteredInstruments.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              No instrument found
            </div>
          )}
          {filteredInstruments.map((instrument) => (
            <button
              key={instrument}
              onClick={() => handleSelect(instrument)}
              className="w-full px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded flex items-center justify-between"
            >
              {instrument}
              {value === instrument && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}