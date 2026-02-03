
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Famous chord progressions by genre
const PROGRESSIONS = {
  'Pop/Rock': [
    { name: 'I-V-vi-IV', chords: ['I', 'V', 'vi', 'IV'], example: 'C-G-Am-F', songs: ['Let It Be', 'With or Without You', 'Don\'t Stop Believin\''] },
    { name: 'I-IV-V', chords: ['I', 'IV', 'V'], example: 'C-F-G', songs: ['Twist and Shout', 'La Bamba', 'Wild Thing'] },
    { name: 'vi-IV-I-V', chords: ['vi', 'IV', 'I', 'V'], example: 'Am-F-C-G', songs: ['Zombie', 'Grenade', 'Someone Like You'] },
    { name: 'I-vi-IV-V', chords: ['I', 'vi', 'IV', 'V'], example: 'C-Am-F-G', songs: ['Stand By Me', 'Every Breath You Take', 'Blue Moon'] },
    { name: 'I-V-vi-iii-IV-I-IV-V', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], example: 'C-G-Am-Em-F-C-F-G', songs: ['Let It Go', 'Payphone'] },
  ],
  
  'Blues': [
    { name: '12-Bar Blues', chords: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'], example: 'E-E-E-E-A-A-E-E-B-A-E-B', songs: ['Sweet Home Chicago', 'Stormy Monday'] },
    { name: 'Quick Change Blues', chords: ['I', 'IV', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'], example: 'E-A-E-E-A-A-E-E-B-A-E-B', songs: ['Johnny B. Goode'] },
    { name: 'Minor Blues', chords: ['im', 'im', 'im', 'im', 'ivm', 'ivm', 'im', 'im', 'V', 'ivm', 'im', 'im'], example: 'Am-Am-Am-Am-Dm-Dm-Am-Am-E-Dm-Am-Am', songs: ['The Thrill Is Gone'] },
  ],
  
  'Jazz': [
    { name: 'ii-V-I', chords: ['iim7', 'V7', 'Imaj7'], example: 'Dm7-G7-Cmaj7', songs: ['Autumn Leaves', 'Fly Me To The Moon'] },
    { name: 'I-vi-ii-V', chords: ['Imaj7', 'vim7', 'iim7', 'V7'], example: 'Cmaj7-Am7-Dm7-G7', songs: ['Blue Moon', 'Heart and Soul'] },
    { name: 'iii-vi-ii-V', chords: ['iiim7', 'VI7', 'iim7', 'V7'], example: 'Em7-A7-Dm7-G7', songs: ['All The Things You Are'] },
    { name: 'Giant Steps', chords: ['Imaj7', 'II7', 'IImaj7', 'ii7', 'V7', 'Imaj7'], example: 'Bmaj7-D7-Gmaj7-Bb7-Ebmaj7', songs: ['Giant Steps'] },
  ],
  
  'Folk/Acoustic': [
    { name: 'I-V-vi-IV', chords: ['I', 'V', 'vi', 'IV'], example: 'G-D-Em-C', songs: ['Ho Hey', 'Pompeii'] },
    { name: 'I-IV-I-V', chords: ['I', 'IV', 'I', 'V'], example: 'D-G-D-A', songs: ['Knockin\' on Heaven\'s Door', 'Free Fallin\''] },
    { name: 'vi-V-IV-V', chords: ['vi', 'V', 'IV', 'V'], example: 'Em-D-C-D', songs: ['Tears in Heaven'] },
  ],
  
  'Metal/Hard Rock': [
    { name: 'i-VI-III-VII', chords: ['i', 'VI', 'III', 'VII'], example: 'Am-F-C-G', songs: ['Zombie', 'Numb'] },
    { name: 'i-VII-VI-VII', chords: ['i', 'VII', 'VI', 'VII'], example: 'Em-D-C-D', songs: ['Stairway to Heaven'] },
    { name: 'i-III-VII-VI', chords: ['i', 'III', 'VII', 'VI'], example: 'Am-C-G-F', songs: ['Enter Sandman'] },
    { name: 'Power Chord I-IV-V', chords: ['I5', 'IV5', 'V5'], example: 'E5-A5-B5', songs: ['Smoke on the Water'] },
  ],
  
  'Latin/Bossa Nova': [
    { name: 'Imaj7-vim7-iim7-V7', chords: ['Imaj7', 'vim7', 'iim7', 'V7'], example: 'Cmaj7-Am7-Dm7-G7', songs: ['Girl from Ipanema'] },
    { name: 'Im-iv-Im-iv', chords: ['Im', 'iv', 'Im', 'iv'], example: 'Am-Dm-Am-Dm', songs: ['Oye Como Va'] },
  ],
  
  'Funk/Soul': [
    { name: 'i7-IV7', chords: ['i7', 'IV7'], example: 'Am7-D7', songs: ['Superstition', 'Get Lucky'] },
    { name: 'Im7-IV7-Im7', chords: ['Im7', 'IV7', 'Im7'], example: 'Em7-A7-Em7', songs: ['Chameleon'] },
  ],
  
  'Country': [
    { name: 'I-IV-I-V-I', chords: ['I', 'IV', 'I', 'V', 'I'], example: 'G-C-G-D-G', songs: ['Wagon Wheel', 'Friends in Low Places'] },
    { name: 'I-V-vi-iii-IV-I-ii-V', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'ii', 'V'], example: 'C-G-Am-Em-F-C-Dm-G', songs: ['Take Me Home, Country Roads'] },
  ],
};

const NOTES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
const SIMPLE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Major scale intervals for reference
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export default function ProgressionsSection() {
  const [selectedGenre, setSelectedGenre] = useState('Pop/Rock');
  const [key, setKey] = useState('C');
  const [mode, setMode] = useState('major');

  const transposeChord = (romanNumeral, rootIndex, isMajor) => {
    const scale = isMajor ? MAJOR_SCALE : NATURAL_MINOR_SCALE;
    
    // Parse Roman numeral
    let degree = 0;
    let quality = '';
    let extension = '';
    
    const numeral = romanNumeral.replace(/maj|m|7|5/g, (match) => {
      extension += match;
      return '';
    });
    
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const lowerNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
    
    const upperIndex = numerals.indexOf(numeral);
    const lowerIndex = lowerNumerals.indexOf(numeral);
    
    if (upperIndex !== -1) {
      degree = upperIndex;
      quality = 'major';
    } else if (lowerIndex !== -1) {
      degree = lowerIndex;
      quality = 'minor';
    }
    
    const noteIndex = (rootIndex + scale[degree]) % 12;
    const noteName = NOTES[noteIndex];
    
    // Build chord name
    let chordName = noteName;
    if (quality === 'minor' || extension.includes('m')) chordName += 'm';
    if (extension.includes('maj7')) chordName += 'maj7';
    else if (extension.includes('7')) chordName += '7';
    if (extension.includes('5') && !extension.includes('7')) chordName += '5';
    
    return chordName;
  };

  const getTransposedProgression = (progression) => {
    const rootIndex = SIMPLE_NOTES.indexOf(key);
    const isMajor = mode === 'major';
    
    return progression.chords.map(chord => transposeChord(chord, rootIndex, isMajor));
  };

  return (
    <div className="space-y-8">
      {/* Genre & Key Selector */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chord Progression Explorer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Genre</label>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PROGRESSIONS).map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Key</label>
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMPLE_NOTES.map(note => (
                  <SelectItem key={note} value={note}>{NOTES[SIMPLE_NOTES.indexOf(note)]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Mode</label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-12 rounded-2xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Progressions List */}
      <div className="space-y-6">
        {PROGRESSIONS[selectedGenre].map((progression, idx) => {
          const transposed = getTransposedProgression(progression);
          
          return (
            <div key={idx} className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl hover:shadow-2xl transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{progression.name}</h3>
                  <p className="text-sm text-gray-600">
                    Original example: {progression.example}
                  </p>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl text-sm font-semibold">
                  {selectedGenre}
                </span>
              </div>

              {/* Roman Numerals */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Roman Numeral Analysis:</p>
                <div className="flex flex-wrap gap-2">
                  {progression.chords.map((chord, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-gray-100 text-gray-900 rounded-2xl font-mono font-bold"
                    >
                      {chord}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transposed Chords */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">In Key of {key} {mode}:</p>
                <div className="flex flex-wrap gap-3">
                  {transposed.map((chord, i) => (
                    <span
                      key={i}
                      className="px-5 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 rounded-2xl font-bold text-lg"
                    >
                      {chord}
                    </span>
                  ))}
                </div>
              </div>

              {/* Example Songs */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Famous Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {progression.songs.map((song, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {song}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Theory Note */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-100 p-8 shadow-xl">
        <h3 className="text-xl font-bold text-blue-900 mb-4">💡 Understanding Roman Numerals</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• <strong>Uppercase (I, IV, V)</strong> = Major chords</li>
          <li>• <strong>Lowercase (ii, iii, vi)</strong> = Minor chords</li>
          <li>• <strong>7</strong> = Seventh chord (e.g., V7 = Dominant 7th)</li>
          <li>• <strong>maj7</strong> = Major 7th chord (e.g., Imaj7)</li>
          <li>• <strong>5</strong> = Power chord (root + 5th only)</li>
        </ul>
      </div>
    </div>
  );
}
