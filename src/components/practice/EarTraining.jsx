import React, { useState, useRef, useEffect } from 'react';
import { Play, Volume2, Award, TrendingUp, RefreshCw, Headphones } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Music theory data
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INTERVALS = {
  'Minor 2nd': 1,
  'Major 2nd': 2,
  'Minor 3rd': 3,
  'Major 3rd': 4,
  'Perfect 4th': 5,
  'Tritone': 6,
  'Perfect 5th': 7,
  'Minor 6th': 8,
  'Major 6th': 9,
  'Minor 7th': 10,
  'Major 7th': 11,
  'Octave': 12,
};

const CHORD_TYPES = {
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Major 7': [0, 4, 7, 11],
  'Dominant 7': [0, 4, 7, 10],
  'Minor 7': [0, 3, 7, 10],
  'Sus 2': [0, 2, 7],
  'Sus 4': [0, 5, 7],
};

const SCALES = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Minor Penta': [0, 3, 5, 7, 10],
  'Major Penta': [0, 2, 4, 7, 9],
  'Blues': [0, 3, 5, 6, 7, 10],
};

const EXERCISE_TYPES = [
  { key: 'intervals', name: 'Intervals', icon: '🎵' },
  { key: 'chords', name: 'Chords', icon: '🎸' },
  { key: 'scales', name: 'Scales', icon: '🎼' },
];

const DIFFICULTIES = [
  { key: 'beginner', name: 'Easy', color: 'from-green-400 to-emerald-500' },
  { key: 'intermediate', name: 'Medium', color: 'from-orange-400 to-amber-500' },
  { key: 'advanced', name: 'Hard', color: 'from-red-400 to-pink-500' },
];

export default function EarTraining() {
  const [exerciseType, setExerciseType] = useState('intervals');
  const [difficulty, setDifficulty] = useState('beginner');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioContextRef = useRef(null);
  const reverbRef = useRef({ convolver: null, contextId: null });

  const getFrequency = (noteIndex, octave = 4) => {
    return 440 * Math.pow(2, ((noteIndex - 9) / 12) + (octave - 4));
  };

  const createReverb = (ctx) => {
    if (reverbRef.current.convolver && reverbRef.current.contextId === ctx) {
      return reverbRef.current.convolver;
    }
    
    const convolver = ctx.createConvolver();
    const reverbTime = 1.2;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * reverbTime;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-3 * i / length);
        const earlyReflections = i < sampleRate * 0.1 ? 0.3 : 0;
        channelData[i] = (Math.random() * 2 - 1) * decay * (0.5 + earlyReflections);
      }
    }
    
    convolver.buffer = impulse;
    reverbRef.current = { convolver, contextId: ctx };
    return convolver;
  };

  const playNote = (frequency, duration = 0.5, delay = 0) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const startTime = ctx.currentTime + delay;
    const sustainDuration = duration * 1.5;
    const velocity = 0.55 * volume;
    
    const reverb = createReverb(ctx);
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.75;
    wetGain.gain.value = 0.3;
    
    dryGain.connect(ctx.destination);
    wetGain.connect(reverb);
    reverb.connect(ctx.destination);
    
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(dryGain);
    compressor.connect(wetGain);
    
    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = 250;
    bodyResonance.Q.value = 2;
    bodyResonance.gain.value = 3;
    bodyResonance.connect(compressor);
    
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2800 + (frequency / 440) * 800;
    warmth.Q.value = 0.7;
    warmth.connect(bodyResonance);
    
    const softness = ctx.createBiquadFilter();
    softness.type = 'highshelf';
    softness.frequency.value = 2500;
    softness.gain.value = -6;
    softness.connect(warmth);
    
    const harmonics = [
      { ratio: 1, gain: 1.0, detune: 0, decay: 1.0 },
      { ratio: 2, gain: 0.38, detune: 0.8, decay: 0.85 },
      { ratio: 3, gain: 0.18, detune: 2.2, decay: 0.7 },
      { ratio: 4, gain: 0.09, detune: 4.0, decay: 0.55 },
      { ratio: 5, gain: 0.04, detune: 6.5, decay: 0.4 },
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
  };

  const generateIntervalQuestion = () => {
    const difficultyIntervals = {
      beginner: ['Perfect 4th', 'Perfect 5th', 'Octave', 'Major 3rd'],
      intermediate: Object.keys(INTERVALS).slice(0, 8),
      advanced: Object.keys(INTERVALS),
    };
    const availableIntervals = difficultyIntervals[difficulty];
    const interval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
    const rootNote = Math.floor(Math.random() * 12);
    return { type: 'interval', correct: interval, rootNote, options: availableIntervals, semitones: INTERVALS[interval] };
  };

  const generateChordQuestion = () => {
    const difficultyChords = {
      beginner: ['Major', 'Minor'],
      intermediate: ['Major', 'Minor', 'Dominant 7', 'Major 7'],
      advanced: Object.keys(CHORD_TYPES),
    };
    const availableChords = difficultyChords[difficulty];
    const chordType = availableChords[Math.floor(Math.random() * availableChords.length)];
    const rootNote = Math.floor(Math.random() * 12);
    return { type: 'chord', correct: chordType, rootNote, options: availableChords, intervals: CHORD_TYPES[chordType] };
  };

  const generateScaleQuestion = () => {
    const difficultyScales = {
      beginner: ['Major', 'Natural Minor'],
      intermediate: ['Major', 'Natural Minor', 'Minor Penta', 'Major Penta'],
      advanced: Object.keys(SCALES),
    };
    const availableScales = difficultyScales[difficulty];
    const scaleType = availableScales[Math.floor(Math.random() * availableScales.length)];
    const rootNote = Math.floor(Math.random() * 12);
    return { type: 'scale', correct: scaleType, rootNote, options: availableScales, intervals: SCALES[scaleType] };
  };

  const generateQuestion = () => {
    setFeedback(null);
    let question;
    switch (exerciseType) {
      case 'intervals': question = generateIntervalQuestion(); break;
      case 'chords': question = generateChordQuestion(); break;
      case 'scales': question = generateScaleQuestion(); break;
      default: question = generateIntervalQuestion();
    }
    setCurrentQuestion(question);
  };

  const playQuestion = () => {
    if (!currentQuestion) return;
    const octave = 4;

    if (currentQuestion.type === 'interval') {
      const freq1 = getFrequency(currentQuestion.rootNote, octave);
      const freq2 = getFrequency((currentQuestion.rootNote + currentQuestion.semitones) % 12, 
        octave + Math.floor((currentQuestion.rootNote + currentQuestion.semitones) / 12));
      playNote(freq1, 0.6, 0);
      playNote(freq2, 0.6, 0.7);
    } else if (currentQuestion.type === 'chord') {
      currentQuestion.intervals.forEach((interval, idx) => {
        const noteIndex = (currentQuestion.rootNote + interval) % 12;
        const noteOctave = octave + Math.floor((currentQuestion.rootNote + interval) / 12);
        playNote(getFrequency(noteIndex, noteOctave), 1.5, idx * 0.05);
      });
    } else if (currentQuestion.type === 'scale') {
      currentQuestion.intervals.forEach((interval, idx) => {
        const noteIndex = (currentQuestion.rootNote + interval) % 12;
        const noteOctave = octave + Math.floor((currentQuestion.rootNote + interval) / 12);
        playNote(getFrequency(noteIndex, noteOctave), 0.25, idx * 0.3);
      });
      playNote(getFrequency(currentQuestion.rootNote, octave + 1), 0.4, currentQuestion.intervals.length * 0.3);
    }
  };

  const checkAnswer = (answer) => {
    const isCorrect = answer === currentQuestion.correct;
    setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    if (isCorrect) {
      setStreak(prev => prev + 1);
      setFeedback({ correct: true, message: 'Perfect! 🎉' });
    } else {
      setStreak(0);
      setFeedback({ correct: false, message: `It was ${currentQuestion.correct}` });
    }
    setTimeout(() => generateQuestion(), 1800);
  };

  useEffect(() => {
    generateQuestion();
    return () => { if (audioContextRef.current) audioContextRef.current.close(); };
  }, [exerciseType, difficulty]);

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Header with Stats */}
          <div className="pt-8 pb-4 px-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Headphones className="w-6 h-6 text-purple-400" />
              <h2 className="text-lg font-semibold text-white/90">Ear Training</h2>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-2xl font-bold text-white">{accuracy}%</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Accuracy</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-2xl font-bold text-orange-400">{streak}🔥</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Streak</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-2xl font-bold text-cyan-400">{score.correct}/{score.total}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Score</div>
              </div>
            </div>
          </div>

          {/* Play Button Area */}
          <div className="px-8 py-6 flex flex-col items-center">
            <button
              onClick={playQuestion}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 shadow-xl shadow-purple-500/30 flex items-center justify-center transition-all duration-200 active:scale-95 mb-4"
            >
              <Play className="w-12 h-12 text-white ml-1" fill="white" />
            </button>
            
            <button
              onClick={playQuestion}
              className="text-sm text-white/50 hover:text-white/70 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="px-6 pb-4">
              <div className={`py-3 px-4 rounded-2xl text-center font-semibold ${
                feedback.correct
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {feedback.message}
              </div>
            </div>
          )}

          {/* Answer Options */}
          {currentQuestion && (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => checkAnswer(option)}
                    disabled={!!feedback}
                    className={`py-4 px-3 rounded-2xl font-medium text-sm transition-all active:scale-95 ${
                      feedback && option === currentQuestion.correct
                        ? 'bg-green-500 text-white'
                        : feedback && option !== currentQuestion.correct
                        ? 'bg-white/5 text-white/30'
                        : 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls Section */}
          <div className="bg-black/30 px-6 py-6 space-y-5">
            
            {/* Exercise Type */}
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Exercise Type
              </label>
              <div className="flex gap-2">
                {EXERCISE_TYPES.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => {
                      setExerciseType(type.key);
                      setScore({ correct: 0, total: 0 });
                      setStreak(0);
                    }}
                    className={`flex-1 py-3 rounded-2xl transition-all text-center ${
                      exerciseType === type.key
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xl mb-0.5">{type.icon}</div>
                    <div className="text-xs font-medium">{type.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.key}
                    onClick={() => {
                      setDifficulty(diff.key);
                      setScore({ correct: 0, total: 0 });
                      setStreak(0);
                    }}
                    className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
                      difficulty === diff.key
                        ? `bg-gradient-to-br ${diff.color} text-white shadow-lg`
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-4">
              <Volume2 className="w-4 h-4 text-white/40" />
              <Slider
                value={[volume * 100]}
                onValueChange={(v) => setVolume(v[0] / 100)}
                max={100}
                step={1}
                className="flex-1 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:bg-white"
              />
              <span className="text-xs text-white/40 w-8">{Math.round(volume * 100)}%</span>
            </div>

            {/* Tips */}
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Quick Tips</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1">
                <li>• Listen carefully, play multiple times</li>
                <li>• Try singing the notes back</li>
                <li>• Practice daily for best results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}