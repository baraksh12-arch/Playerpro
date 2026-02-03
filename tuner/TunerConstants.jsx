/**
 * Tuner Constants and Utilities
 */

// Note names (sharps)
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Flat equivalents for display
export const NOTE_FLATS = {
  'C#': 'D♭',
  'D#': 'E♭',
  'F#': 'G♭',
  'G#': 'A♭',
  'A#': 'B♭'
};

// Transposition presets for instruments
export const TRANSPOSITIONS = [
  { id: 'concert', name: 'Concert (C)', semitones: 0 },
  { id: 'bb', name: 'B♭ Instruments', semitones: -2 },
  { id: 'eb', name: 'E♭ Instruments', semitones: -9 },
  { id: 'f', name: 'F Instruments', semitones: -7 },
  { id: 'g', name: 'G Instruments', semitones: -5 },
  { id: 'custom', name: 'Custom', semitones: 0 }
];

// Sensitivity presets
export const SENSITIVITY_PRESETS = {
  wide: {
    name: 'Wide',
    inTuneThreshold: 15,
    warningThreshold: 30,
    successHoldMs: 100,
    description: 'Forgiving tuning range'
  },
  medium: {
    name: 'Medium',
    inTuneThreshold: 10,
    warningThreshold: 20,
    successHoldMs: 150,
    description: 'Standard tuning precision'
  },
  fine: {
    name: 'Fine',
    inTuneThreshold: 5,
    warningThreshold: 12,
    successHoldMs: 200,
    description: 'High precision tuning'
  },
  ultrafine: {
    name: 'Ultra Fine',
    inTuneThreshold: 3,
    warningThreshold: 7,
    successHoldMs: 250,
    description: 'Professional precision'
  }
};

// Reference pitch range
export const CALIBRATION_RANGE = { min: 430, max: 450, default: 440 };

// Convert frequency to note info with custom A4 reference
export function frequencyToNoteWithRef(freq, a4Freq = 440) {
  if (!freq || freq < 20) return { note: '--', octave: 0, cents: 0, midiNumber: 0, frequency: 0 };
  const noteNum = 12 * Math.log2(freq / a4Freq);
  const midiNumber = Math.round(noteNum) + 69;
  const noteIndex = ((midiNumber % 12) + 12) % 12;
  const note = NOTES[noteIndex];
  const octave = Math.floor(midiNumber / 12) - 1;
  const cents = Math.round((noteNum - Math.round(noteNum)) * 100);
  return { note, octave, cents, midiNumber, frequency: freq };
}

// Apply transposition to note
export function transposeNote(note, octave, semitones) {
  const noteIndex = NOTES.indexOf(note.replace('♯', '#').replace('♭', 'b'));
  if (noteIndex === -1) return { note, octave };
  
  let newMidi = (octave + 1) * 12 + noteIndex + semitones;
  const newNoteIndex = ((newMidi % 12) + 12) % 12;
  const newOctave = Math.floor(newMidi / 12) - 1;
  
  return { note: NOTES[newNoteIndex], octave: newOctave };
}

// Note to frequency with custom A4
export function noteToFrequencyWithRef(note, octave, a4Freq = 440) {
  const noteIndex = NOTES.indexOf(note.replace('♯', '#').replace('♭', 'b'));
  if (noteIndex === -1) return 0;
  const midiNumber = (octave + 1) * 12 + noteIndex;
  return a4Freq * Math.pow(2, (midiNumber - 69) / 12);
}

// Calculate cents difference between two frequencies
export function centsDifference(freq1, freq2) {
  if (!freq1 || !freq2 || freq1 <= 0 || freq2 <= 0) return 0;
  return Math.round(1200 * Math.log2(freq1 / freq2));
}

// Get cents from frequency to target note
export function centsToTargetNote(freq, targetNote, targetOctave, a4Freq = 440) {
  const targetFreq = noteToFrequencyWithRef(targetNote, targetOctave, a4Freq);
  return centsDifference(freq, targetFreq);
}