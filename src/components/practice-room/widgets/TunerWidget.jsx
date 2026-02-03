import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function TunerWidget() {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState('--');
  const [cents, setCents] = useState(0);
  const [octave, setOctave] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const rafIdRef = useRef(null);

  const frequencyToNote = (freq) => {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const roundedNoteNum = Math.round(noteNum) + 69;
    const noteName = NOTES[roundedNoteNum % 12];
    const octave = Math.floor(roundedNoteNum / 12) - 1;
    const cents = Math.floor((noteNum - Math.round(noteNum)) * 100);
    return { noteName, octave, cents };
  };

  const autoCorrelate = (buffer, sampleRate) => {
    let SIZE = buffer.length;
    let sumOfSquares = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      sumOfSquares += val * val;
    }
    const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
    if (rootMeanSquare < 0.01) return -1;

    let r1 = 0;
    let r2 = SIZE - 1;
    const threshold = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i;
        break;
      }
    }

    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < threshold) {
        r2 = SIZE - i;
        break;
      }
    }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buffer[j] * buffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;

    let maxValue = -1;
    let maxIndex = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxValue) {
        maxValue = c[i];
        maxIndex = i;
      }
    }

    let T0 = maxIndex;

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];

    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  const updatePitch = () => {
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const detectedFreq = autoCorrelate(buffer, audioContextRef.current.sampleRate);
    
    if (detectedFreq > 0 && detectedFreq < 4000) {
      setFrequency(detectedFreq);
      const { noteName, octave, cents } = frequencyToNote(detectedFreq);
      setNote(noteName);
      setOctave(octave);
      setCents(cents);
    }

    rafIdRef.current = requestAnimationFrame(updatePitch);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      
      setIsListening(true);
      updatePitch();
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Please allow microphone access to use the tuner');
    }
  };

  const stopListening = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    if (microphoneRef.current && microphoneRef.current.mediaStream) {
      microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setNote('--');
    setFrequency(0);
    setCents(0);
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const getTuningColor = () => {
    if (!isListening || frequency === 0) return 'text-gray-400';
    if (Math.abs(cents) <= 5) return 'text-green-400';
    if (Math.abs(cents) <= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTuningStatus = () => {
    if (!isListening) return 'Start tuner';
    if (frequency === 0) return 'Play a note...';
    if (Math.abs(cents) <= 5) return 'In Tune! ✓';
    if (cents > 0) return `${cents}¢ Sharp ↑`;
    return `${Math.abs(cents)}¢ Flat ↓`;
  };

  return (
    <div className="space-y-6">
      {/* Note Display */}
      <div className="text-center">
        <div className={`text-7xl font-black ${getTuningColor()} transition-colors`}>
          {note}
        </div>
        {note !== '--' && (
          <div className="text-2xl text-white/60 mt-2">Octave {octave}</div>
        )}
        {frequency > 0 && (
          <div className="text-sm text-white/40 mt-1">{frequency.toFixed(1)} Hz</div>
        )}
      </div>

      {/* Tuning Meter */}
      <div className="relative">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              Math.abs(cents) <= 5
                ? 'bg-green-500'
                : Math.abs(cents) <= 15
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{
              width: `${50 + (cents / 50) * 50}%`,
              marginLeft: cents < 0 ? 0 : 'auto',
              marginRight: cents > 0 ? 0 : 'auto',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>-50¢</span>
          <span>0¢</span>
          <span>+50¢</span>
        </div>
      </div>

      {/* Status */}
      <div className={`text-center text-lg font-bold ${getTuningColor()}`}>
        {getTuningStatus()}
      </div>

      {/* Control Button */}
      <div className="flex justify-center">
        <Button
          onClick={isListening ? stopListening : startListening}
          size="lg"
          className={`w-24 h-24 rounded-full ${
            isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } shadow-2xl`}
        >
          {isListening ? (
            <MicOff className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </Button>
      </div>

      {/* Standard Tuning Reference */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-white/60 text-xs mb-2 text-center">Standard Guitar Tuning</div>
        <div className="grid grid-cols-6 gap-2">
          {['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map((tuning, i) => (
            <div
              key={i}
              className="text-center p-2 bg-white/10 rounded text-white font-bold text-sm"
            >
              {tuning}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}