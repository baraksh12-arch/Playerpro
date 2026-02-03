import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Music } from 'lucide-react';

// Accurate music theory data
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Scale formulas (in semitones from root)
const SCALE_FORMULAS = {
  'Major (Ionian)': [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor (Aeolian)': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Minor Pentatonic': [0, 3, 5, 7, 10],
  'Major Pentatonic': [0, 2, 4, 7, 9],
  'Blues': [0, 3, 5, 6, 7, 10],
  'Whole Tone': [0, 2, 4, 6, 8, 10],
  'Diminished': [0, 2, 3, 5, 6, 8, 9, 11],
};

// Guitar tuning (standard: EADGBE)
const GUITAR_TUNING = [
  { string: 6, note: 'E', octave: 2, midiNote: 40 },
  { string: 5, note: 'A', octave: 2, midiNote: 45 },
  { string: 4, note: 'D', octave: 3, midiNote: 50 },
  { string: 3, note: 'G', octave: 3, midiNote: 55 },
  { string: 2, note: 'B', octave: 3, midiNote: 59 },
  { string: 1, note: 'E', octave: 4, midiNote: 64 },
];

export default function ScalesSection() {
  const [rootNote, setRootNote] = useState('C');
  const [scaleType, setScaleType] = useState('Major (Ionian)');
  const [octave, setOctave] = useState(4);

  // Calculate scale notes
  const getScaleNotes = () => {
    const rootIndex = NOTES.indexOf(rootNote);
    const formula = SCALE_FORMULAS[scaleType];
    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
  };

  const scaleNotes = getScaleNotes();

  // Get note positions on guitar neck (first 12 frets)
  const getGuitarPositions = () => {
    const positions = [];
    GUITAR_TUNING.forEach((stringInfo) => {
      for (let fret = 0; fret <= 12; fret++) {
        const noteIndex = (NOTES.indexOf(stringInfo.note) + fret) % 12;
        const noteName = NOTES[noteIndex];
        if (scaleNotes.includes(noteName)) {
          positions.push({
            string: stringInfo.string,
            fret: fret,
            note: noteName,
            isRoot: noteName === rootNote
          });
        }
      }
    });
    return positions;
  };

  const guitarPositions = getGuitarPositions();

  // Play realistic soft upright piano note
  const playPianoNote = (ctx, frequency, startTime, duration = 0.5) => {
    const velocity = 0.55;
    const sustainDuration = duration * 1.5;
    
    // Master compressor for warmth
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    
    // Body resonance filter
    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = 250;
    bodyResonance.Q.value = 2;
    bodyResonance.gain.value = 3;
    bodyResonance.connect(compressor);
    
    // Soft mellow lowpass
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2800 + (frequency / 440) * 800;
    warmth.Q.value = 0.7;
    warmth.connect(bodyResonance);
    
    // High shelf cut for soft felt-like tone
    const softness = ctx.createBiquadFilter();
    softness.type = 'highshelf';
    softness.frequency.value = 2500;
    softness.gain.value = -6;
    softness.connect(warmth);
    
    // Upright piano harmonics
    const harmonics = [
      { ratio: 1, gain: 1.0, detune: 0, decay: 1.0 },
      { ratio: 2, gain: 0.38, detune: 0.8, decay: 0.85 },
      { ratio: 3, gain: 0.18, detune: 2.2, decay: 0.7 },
      { ratio: 4, gain: 0.09, detune: 4.0, decay: 0.55 },
      { ratio: 5, gain: 0.04, detune: 6.5, decay: 0.4 },
      { ratio: 6, gain: 0.02, detune: 9.5, decay: 0.3 },
    ];
    
    const detuneSpread = 1.5;
    
    harmonics.forEach((h, idx) => {
      [-1, 1].forEach(side => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        const panner = ctx.createStereoPanner();
        panner.pan.value = side * 0.15 * (idx / harmonics.length);
        
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(softness);
        
        osc.frequency.value = frequency * h.ratio;
        osc.detune.value = h.detune + (side * detuneSpread * h.ratio * 0.3);
        osc.type = 'sine';
        
        const harmonicDecay = sustainDuration * h.decay;
        const level = h.gain * velocity * 0.12;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(level, startTime + 0.012);
        gain.gain.setTargetAtTime(level * 0.7, startTime + 0.02, 0.08);
        gain.gain.setTargetAtTime(level * 0.4, startTime + 0.15, 0.2);
        gain.gain.setTargetAtTime(0.0001, startTime + harmonicDecay * 0.4, harmonicDecay * 0.3);
        
        osc.start(startTime);
        osc.stop(startTime + sustainDuration + 0.5);
      });
    });
    
    // Soft felt hammer thump
    const thumpLength = 0.018;
    const thumpBuffer = ctx.createBuffer(1, ctx.sampleRate * thumpLength, ctx.sampleRate);
    const thumpData = thumpBuffer.getChannelData(0);
    for (let i = 0; i < thumpData.length; i++) {
      const t = i / thumpData.length;
      const env = Math.exp(-t * 8) * (1 - t);
      thumpData[i] = (Math.random() * 2 - 1) * env * 0.25;
    }
    
    const thumpSource = ctx.createBufferSource();
    thumpSource.buffer = thumpBuffer;
    
    const thumpFilter = ctx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.value = Math.min(frequency * 2.5, 3000);
    thumpFilter.Q.value = 1;
    
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(velocity * 0.08, startTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + thumpLength);
    
    thumpSource.connect(thumpFilter);
    thumpFilter.connect(thumpGain);
    thumpGain.connect(softness);
    thumpSource.start(startTime);
    
    // Soundboard resonance
    const soundboard = ctx.createOscillator();
    const sbGain = ctx.createGain();
    const sbFilter = ctx.createBiquadFilter();
    
    soundboard.frequency.value = frequency * 0.5;
    soundboard.type = 'sine';
    
    sbFilter.type = 'lowpass';
    sbFilter.frequency.value = 400;
    sbFilter.Q.value = 3;
    
    soundboard.connect(sbFilter);
    sbFilter.connect(sbGain);
    sbGain.connect(bodyResonance);
    
    sbGain.gain.setValueAtTime(0, startTime);
    sbGain.gain.linearRampToValueAtTime(velocity * 0.015, startTime + 0.1);
    sbGain.gain.setTargetAtTime(0.0001, startTime + sustainDuration * 0.3, sustainDuration * 0.25);
    
    soundboard.start(startTime);
    soundboard.stop(startTime + sustainDuration + 0.5);
  };

  // Play scale audio
  const playScale = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const rootIndex = NOTES.indexOf(rootNote);
    const formula = SCALE_FORMULAS[scaleType];
    
    // Play all scale notes plus root octave up at the end
    const notesToPlay = [...formula, 12]; // 12 = octave up
    
    notesToPlay.forEach((interval, index) => {
      const noteIndex = (rootIndex + interval) % 12;
      const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
      const frequency = 440 * Math.pow(2, ((noteIndex - 9) / 12) + (noteOctave - 4));
      const startTime = audioContext.currentTime + index * 0.3;
      
      // Last note (octave root) gets longer duration
      const duration = index === notesToPlay.length - 1 ? 0.8 : 0.4;
      playPianoNote(audioContext, frequency, startTime, duration);
    });
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Root Note</label>
            <Select value={rootNote} onValueChange={setRootNote}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTES.map(note => (
                  <SelectItem key={note} value={note}>{note}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Scale Type</label>
            <Select value={scaleType} onValueChange={setScaleType}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(SCALE_FORMULAS).map(scale => (
                  <SelectItem key={scale} value={scale}>{scale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Octave</label>
            <Select value={octave.toString()} onValueChange={(v) => setOctave(parseInt(v))}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map(oct => (
                  <SelectItem key={oct} value={oct.toString()}>{oct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={playScale}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg shadow-lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Play Scale
        </Button>
      </div>

      {/* Scale Notes Display */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Music className="w-6 h-6 text-purple-500" />
          Scale Notes
        </h3>
        <div className="flex flex-wrap gap-3">
          {scaleNotes.map((note, index) => (
            <div
              key={index}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${
                note === rootNote
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                  : 'bg-gradient-to-br from-blue-50 to-purple-50 text-purple-900'
              }`}
            >
              {note}
            </div>
          ))}
        </div>
      </div>

      {/* Piano Roll */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Piano Roll</h3>
        <div className="overflow-x-auto">
          <div className="inline-flex rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-300">
            {NOTES.map((note, index) => {
              const isBlackKey = note.includes('#');
              const isInScale = scaleNotes.includes(note);
              const isRoot = note === rootNote;
              
              return (
                <div
                  key={index}
                  className={`relative ${isBlackKey ? '-mx-3 z-10' : 'z-0'}`}
                  style={{ marginLeft: isBlackKey && index > 0 ? '-12px' : '0' }}
                >
                  <div
                    className={`flex flex-col items-center justify-end transition-all ${
                      isBlackKey
                        ? 'w-12 h-32 bg-gradient-to-b from-gray-800 to-gray-900'
                        : 'w-16 h-48 bg-white border-r border-gray-300'
                    } ${
                      isInScale && !isBlackKey ? 'bg-gradient-to-b from-blue-50 to-purple-50' : ''
                    }`}
                  >
                    {isInScale && (
                      <div className={`mb-2 ${isBlackKey ? 'text-white' : 'text-gray-900'}`}>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isRoot
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                              : isBlackKey
                              ? 'bg-white text-gray-900'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                          }`}
                        >
                          {isRoot ? '●' : '○'}
                        </div>
                      </div>
                    )}
                    <span
                      className={`text-xs font-semibold mb-2 ${
                        isBlackKey ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guitar Neck Visualization */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Guitar Fretboard</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Fret markers */}
            <div className="flex mb-2 pl-16">
              {[...Array(13)].map((_, fret) => (
                <div
                  key={fret}
                  className="flex-shrink-0 w-20 text-center text-sm font-semibold text-gray-600"
                >
                  {fret}
                </div>
              ))}
            </div>

            {/* Strings */}
            {GUITAR_TUNING.map((stringInfo) => (
              <div key={stringInfo.string} className="flex items-center mb-1">
                {/* String label */}
                <div className="w-16 text-right pr-4 font-bold text-gray-700">
                  {stringInfo.string}:{stringInfo.note}
                </div>

                {/* Frets */}
                <div className="flex flex-1 items-center">
                  {[...Array(13)].map((_, fret) => {
                    const position = guitarPositions.find(
                      p => p.string === stringInfo.string && p.fret === fret
                    );

                    return (
                      <div
                        key={fret}
                        className="relative flex-shrink-0 w-20 h-12 flex items-center justify-center"
                        style={{
                          borderLeft: fret === 0 ? '4px solid #1f2937' : '2px solid #d1d5db',
                          borderRight: fret === 12 ? '2px solid #d1d5db' : 'none',
                        }}
                      >
                        {/* String line */}
                        <div
                          className="absolute w-full bg-gray-400"
                          style={{ height: `${7 - stringInfo.string}px` }}
                        />

                        {/* Fret markers on 3, 5, 7, 9, 12 */}
                        {[3, 5, 7, 9].includes(fret) && stringInfo.string === 3 && (
                          <div className="absolute w-3 h-3 bg-gray-300 rounded-full" style={{ top: '-20px' }} />
                        )}
                        {fret === 12 && [2, 4].includes(stringInfo.string) && (
                          <div className="absolute w-3 h-3 bg-gray-300 rounded-full" style={{ top: stringInfo.string === 2 ? '-20px' : '32px' }} />
                        )}

                        {/* Note dot */}
                        {position && (
                          <div
                            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                              position.isRoot
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                                : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            }`}
                          >
                            {position.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB Notation */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">TAB - Pattern Examples</h3>
        
        {/* One Octave Pattern */}
        <div className="mb-8">
          <h4 className="font-semibold text-gray-700 mb-4">One Octave (E String Root)</h4>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm overflow-x-auto">
            {GUITAR_TUNING.map((s, idx) => {
              const positions = guitarPositions
                .filter(p => p.string === s.string && p.fret <= 5)
                .sort((a, b) => a.fret - b.fret)
                .slice(0, 3);
              
              return (
                <div key={idx} className="flex items-center mb-1">
                  <span className="text-gray-600 w-8">{s.note}|</span>
                  {positions.length > 0 ? (
                    <span className="text-gray-900">
                      {positions.map(p => `--${p.fret}--`).join('')}
                    </span>
                  ) : (
                    <span className="text-gray-400">--------</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scale Pattern Info */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
          <h4 className="font-bold text-purple-900 mb-3">Practice Tip:</h4>
          <ul className="text-sm text-purple-800 space-y-2">
            <li>• <strong>Start slow</strong> and focus on clean note articulation</li>
            <li>• <strong>Use a metronome</strong> to develop timing and consistency</li>
            <li>• <strong>Practice ascending and descending</strong> the scale</li>
            <li>• <strong>Root notes</strong> (purple/pink dots) are your anchor points</li>
            <li>• <strong>Try different positions</strong> on the neck to master the scale</li>
          </ul>
        </div>
      </div>

      {/* Music Theory Info */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Scale Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3">Scale Formula</h4>
            <div className="flex flex-wrap gap-2">
              {SCALE_FORMULAS[scaleType].map((interval, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white rounded-full text-sm font-semibold text-blue-900 border-2 border-blue-300"
                >
                  {interval}
                </span>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-3">
              Intervals in semitones from the root note
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3">Number of Notes</h4>
            <p className="text-4xl font-bold text-purple-900 mb-2">{scaleNotes.length}</p>
            <p className="text-sm text-purple-700">
              {scaleNotes.length === 5 ? 'Pentatonic scale (5 notes)' : 
               scaleNotes.length === 6 ? 'Hexatonic scale (6 notes)' :
               scaleNotes.length === 7 ? 'Heptatonic scale (7 notes)' :
               scaleNotes.length === 8 ? 'Octatonic scale (8 notes)' :
               `${scaleNotes.length}-note scale`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}