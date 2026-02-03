
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, SkipForward, Check, Grid3x3, ChevronLeft, ChevronRight, Move, Minimize2, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Metronome from '../practice/Metronome';
import Tuner from '../practice/Tuner';
import EarTraining from '../practice/EarTraining';
import RhythmTrainer from '../practice/RhythmTrainer';
import ScalesSection from '../theory/ScalesSection';
import ChordsSection from '../theory/ChordsSection';
import TechniquesSection from '../theory/TechniquesSection';
import PracticeTimer from '../practice/PracticeTimer';
import MetronomeWidget from './widgets/MetronomeWidget';
import TunerWidget from './widgets/TunerWidget';
import TimerWidget from './widgets/TimerWidget';
import ChordFinderWidget from './widgets/ChordFinderWidget';
import FretboardWidget from './widgets/FretboardWidget';
import BPMTapWidget from './widgets/BPMTapWidget';
import RecorderWidget from './widgets/RecorderWidget';

const COMPONENTS = {
  'metronome': Metronome,
  'tuner': Tuner,
  'ear-training': EarTraining,
  'rhythm': RhythmTrainer,
  'scales': ScalesSection,
  'chords': ChordsSection,
  'techniques': TechniquesSection,
  'timer': PracticeTimer,
};

const WIDGET_COMPONENTS = {
  'metronome': MetronomeWidget,
  'tuner': TunerWidget,
  'timer': TimerWidget,
  'chord-finder': ChordFinderWidget,
  'scale-quick': FretboardWidget, // Assuming FretboardWidget can serve as a quick scale viewer
  'note-trainer': FretboardWidget, // Assuming FretboardWidget can serve for note training
  'bpm-tap': BPMTapWidget,
  'recorder': RecorderWidget,
};

function MiniWidget({ widget, onRemove }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const WidgetComponent = WIDGET_COMPONENTS[widget.type] || (() => <div>Unknown Widget</div>);

  const getWidgetColor = (type) => {
    const colors = {
      'metronome': 'from-blue-500 to-cyan-500',
      'tuner': 'from-purple-500 to-pink-500',
      'timer': 'from-green-500 to-emerald-500',
      'chord-finder': 'from-orange-500 to-red-500',
      'scale-quick': 'from-indigo-500 to-purple-500',
      'note-trainer': 'from-pink-500 to-rose-500',
      'bpm-tap': 'from-teal-500 to-cyan-500',
      'recorder': 'from-red-500 to-rose-500', // Added color for recorder
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <Card className="bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-2xl overflow-hidden">
      {/* Widget Header */}
      <div className={`bg-gradient-to-r ${getWidgetColor(widget.type)} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-white/70" />
          <span className="text-white font-bold text-sm">
            {widget.type.charAt(0).toUpperCase() + widget.type.slice(1).replace(/-/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 text-white" /> : <Minimize2 className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      {!isMinimized && (
        <div className="p-4">
          <WidgetComponent />
        </div>
      )}
    </Card>
  );
}

export default function RoutinePlayer({ routine, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [completedExercises, setCompletedExercises] = useState([]);
  const [activeWidgets, setActiveWidgets] = useState([]);
  const [showWidgetPanel, setShowWidgetPanel] = useState(true);

  const currentExercise = routine.exercises[currentIndex];
  const CurrentComponent = COMPONENTS[currentExercise?.type];
  const hasWidgets = routine.widget_layout && routine.widget_layout.length > 0;

  // Initialize widgets from routine
  useEffect(() => {
    if (routine?.widget_layout) {
      setActiveWidgets(routine.widget_layout);
    }
  }, [routine]);

  useEffect(() => {
    if (currentExercise && !isPaused) {
      setTimeRemaining(currentExercise.duration_minutes * 60);
    }
  }, [currentIndex, currentExercise]);

  useEffect(() => {
    if (timeRemaining === null || isPaused || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isPaused]);

  const handleNext = () => {
    setCompletedExercises([...completedExercises, currentIndex]);
    
    if (currentIndex < routine.exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleRemoveWidget = (widgetId) => {
    setActiveWidgets(activeWidgets.filter(w => w.id !== widgetId));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((currentIndex + 1) / routine.exercises.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1 truncate">{routine.name}</h1>
              <div className="flex items-center gap-2 md:gap-4 text-white/80 flex-wrap">
                <span className="text-xs md:text-sm">
                  Exercise {currentIndex + 1} of {routine.exercises.length}
                </span>
                <span className="text-xs md:text-sm">•</span>
                <span className="text-xs md:text-sm capitalize">{currentExercise?.type.replace('-', ' ')}</span>
                {hasWidgets && (
                  <>
                    <span className="text-xs md:text-sm">•</span>
                    <span className="text-xs md:text-sm">{activeWidgets.length} widgets active</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Timer */}
              {timeRemaining !== null && (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-6 py-2 md:py-3 border border-white/20">
                  <div className="text-xl md:text-3xl font-black text-white">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-white/60 text-center mt-1 hidden md:block">remaining</div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-1 md:gap-2">
                {hasWidgets && (
                  <Button
                    onClick={() => setShowWidgetPanel(!showWidgetPanel)}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-cyan-500/20 border-cyan-400/30 text-white hover:bg-cyan-500/30"
                  >
                    <Grid3x3 className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                )}

                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {isPaused ? <Play className="w-4 h-4 md:w-5 md:h-5" /> : <Pause className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>

                <Button
                  onClick={handleSkip}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                <Button
                  onClick={onComplete}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 md:mt-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 overflow-x-auto pb-2">
              {routine.exercises.map((exercise, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1 text-xs whitespace-nowrap ${
                    idx < currentIndex
                      ? 'text-green-400'
                      : idx === currentIndex
                      ? 'text-white font-bold'
                      : 'text-white/40'
                  }`}
                >
                  {idx < currentIndex && <Check className="w-3 h-3" />}
                  <span className="capitalize hidden sm:inline">{exercise.type.replace('-', ' ')}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Widgets */}
      <div className="max-w-full mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className={`grid ${showWidgetPanel && hasWidgets && activeWidgets.length > 0 ? 'lg:grid-cols-[1fr,400px]' : 'grid-cols-1'} gap-4 md:gap-6`}>
          {/* Exercise Content */}
          <div className={isPaused ? 'opacity-50 pointer-events-none' : ''}>
            {CurrentComponent && <CurrentComponent />}
          </div>

          {/* Widgets Panel */}
          {showWidgetPanel && hasWidgets && activeWidgets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5" />
                  Practice Widgets
                </h3>
                <button
                  onClick={() => setShowWidgetPanel(false)}
                  className="lg:hidden text-white/70 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {activeWidgets.map((widget) => (
                  <MiniWidget
                    key={widget.id}
                    widget={widget}
                    onRemove={() => handleRemoveWidget(widget.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isPaused && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center max-w-md mx-4">
              <Pause className="w-12 h-12 md:w-16 md:h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Paused</h2>
              <p className="text-gray-600 mb-6 md:mb-8">Take a break, then continue when ready</p>
              <Button
                onClick={() => setIsPaused(false)}
                className="h-12 md:h-14 px-6 md:px-8 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-base md:text-lg font-bold"
              >
                <Play className="w-5 h-5 mr-2" />
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
