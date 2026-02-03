import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

const INSTRUMENTS = [
  'Electric Guitar', 'Acoustic Guitar', 'Classical Guitar',
  'Bass Guitar', 'Piano', 'Keyboard', 'Drums',
  'Violin', 'Cello', 'Viola', 'Double Bass',
  'Flute', 'Clarinet', 'Saxophone', 'Trumpet',
  'Trombone', 'French Horn', 'Tuba',
  'Voice/Singing', 'Ukulele', 'Banjo', 'Mandolin',
  'Harmonica', 'Accordion', 'Bagpipes',
  'Harp', 'Organ', 'Synthesizer',
  'Electric Bass', 'Upright Bass',
  'Percussion', 'Xylophone', 'Marimba',
  'Oboe', 'Bassoon', 'Piccolo',
  'Euphonium', 'Baritone', 'Cornet',
  'Steel Guitar', 'Lap Steel', 'Pedal Steel',
  'Sitar', 'Tabla', 'Djembe',
  'Bongos', 'Congas', 'Timpani',
  'Glockenspiel', 'Vibraphone', 'Chimes'
];

export default function MultiInstrumentSelector({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedInstruments = Array.isArray(value) ? value : [];
  const filteredInstruments = INSTRUMENTS.filter(inst =>
    inst.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (instrument) => {
    if (selectedInstruments.includes(instrument)) {
      // Remove if already selected
      onChange(selectedInstruments.filter(i => i !== instrument));
    } else if (selectedInstruments.length < 2) {
      // Add if less than 2 selected
      onChange([...selectedInstruments, instrument]);
    }
    setSearch('');
  };

  const handleRemove = (instrument) => {
    onChange(selectedInstruments.filter(i => i !== instrument));
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {selectedInstruments.map((instrument) => (
        <div
          key={instrument}
          className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
        >
          <span>{instrument}</span>
          <button
            onClick={() => handleRemove(instrument)}
            className="hover:bg-blue-200 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      {selectedInstruments.length < 2 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              {selectedInstruments.length === 0 ? 'Select' : '+ Add'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <Input
              placeholder="Search instruments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredInstruments.map((instrument) => (
                <button
                  key={instrument}
                  onClick={() => handleSelect(instrument)}
                  disabled={selectedInstruments.includes(instrument)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedInstruments.includes(instrument)
                      ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {instrument}
                  {selectedInstruments.includes(instrument) && ' ✓'}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}