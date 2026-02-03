import React, { useState } from 'react';
import { useI18n } from '@/Layout';
import { Music2, Clock, Mic, Ear, Target, TrendingUp, Repeat, Layers, Radio, Grid, BookOpen, Waves, Sparkles, Volume1, Guitar, Eye, ListMusic, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Metronome from '../components/practice/Metronome';
import Tuner from '../components/practice/Tuner';
import PracticeTimer from '../components/practice/PracticeTimer';
import Recorder from '../components/practice/Recorder';
import EarTraining from '../components/practice/EarTraining';
import RhythmTrainer from '../components/practice/RhythmTrainer';
import PitchLab from '../components/practice/PitchLab';
import PremiumAnalysisView from '../components/analysis/PremiumAnalysisView';
import PlasmaChords from '../components/practice/PlasmaChords';
import DroneLab from '../components/practice/DroneLab';
import GuitarFretboard from '../components/practice/GuitarFretboard';
import SightReading from '../components/practice/SightReading';
import SmartProgressions from '../components/practice/SmartProgressions';

export default function TeacherTools() {
  const { t } = useI18n();
  const [activeTool, setActiveTool] = useState(null);

  const tools = [
    {
      id: 'metronome',
      name: t('page.practice.metronome'),
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      component: Metronome,
    },
    {
      id: 'tuner',
      name: t('page.practice.tuner'),
      icon: Music2,
      gradient: 'from-purple-500 to-pink-500',
      component: Tuner,
    },
    {
      id: 'timer',
      name: t('page.practice.timer'),
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      component: PracticeTimer,
    },
    {
      id: 'recorder',
      name: t('page.practice.recorder'),
      icon: Mic,
      gradient: 'from-red-500 to-orange-500',
      component: Recorder,
    },
    {
      id: 'ear-training',
      name: t('page.practice.ear'),
      icon: Ear,
      gradient: 'from-yellow-500 to-amber-500',
      component: EarTraining,
    },
    {
      id: 'rhythm',
      name: t('page.practice.rhythm'),
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-blue-500',
      component: RhythmTrainer,
    },
    {
      id: 'pitch-lab',
      name: 'Pitch Lab',
      icon: Waves,
      gradient: 'from-cyan-500 to-blue-500',
      component: PitchLab,
    },
    {
      id: 'analysis',
      name: 'Analysis',
      icon: Activity,
      gradient: 'from-violet-500 to-purple-500',
      component: PremiumAnalysisView,
      fullscreen: true,
    },
    {
      id: 'plasma-chords',
      name: 'Plasma Chords',
      icon: Sparkles,
      gradient: 'from-purple-500 to-pink-500',
      component: PlasmaChords,
    },
    {
      id: 'drone-lab',
      name: 'Drone Lab',
      icon: Volume1,
      gradient: 'from-amber-500 to-orange-500',
      component: DroneLab,
    },
    {
      id: 'guitar-fretboard',
      name: 'Fretboard',
      icon: Guitar,
      gradient: 'from-emerald-500 to-teal-500',
      component: GuitarFretboard,
    },
    {
      id: 'sight-reading',
      name: 'Sight Reading',
      icon: Eye,
      gradient: 'from-sky-500 to-indigo-500',
      component: SightReading,
    },
    {
      id: 'smart-progressions',
      name: 'Progressions',
      icon: ListMusic,
      gradient: 'from-fuchsia-500 to-purple-500',
      component: SmartProgressions,
    },
  ];

  const linkedTools = [
    {
      id: 'transcribe',
      name: 'Transcribe',
      icon: Repeat,
      gradient: 'from-violet-500 to-purple-500',
      page: 'StudentTranscribe',
    },
    {
      id: 'looper',
      name: 'Looper',
      icon: Layers,
      gradient: 'from-rose-500 to-pink-500',
      page: 'StudentLooper',
    },
    {
      id: 'backing-track',
      name: 'Backing Tracks',
      icon: Radio,
      gradient: 'from-orange-500 to-red-500',
      page: 'StudentBackingTrack',
    },
    {
      id: 'theory',
      name: t('page.practice.theory'),
      icon: BookOpen,
      gradient: 'from-amber-500 to-orange-500',
      page: 'StudentTheory',
    },
    {
      id: 'practice-room',
      name: t('page.practice.routines'),
      icon: Grid,
      gradient: 'from-purple-500 to-indigo-500',
      page: 'StudentPracticeRoom',
    },
    {
      id: 'custom-room',
      name: t('page.practice.custom'),
      icon: Target,
      gradient: 'from-teal-500 to-cyan-500',
      page: 'StudentCustomRoom',
    },
  ];

  const activeToo = activeTool ? tools.find(t => t.id === activeTool) : null;
  const ActiveComponent = activeToo?.component;
  const isFullscreen = activeToo?.fullscreen;

  if (ActiveComponent) {
    // Fullscreen tools (like Analysis) render without wrapper
    if (isFullscreen) {
      return <ActiveComponent onClose={() => setActiveTool(null)} />;
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <button
            onClick={() => setActiveTool(null)}
            className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur transition-all"
          >
            ← {t('common.back')}
          </button>
          <ActiveComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('page.practice.title')}
          </h1>
          <p className="text-gray-400 text-lg">{t('page.practice.subtitle')}</p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-all hover:scale-105 backdrop-blur group"
                onClick={() => setActiveTool(tool.id)}
              >
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{tool.name}</h3>
                </CardContent>
              </Card>
            );
          })}

          {/* Linked Tools (pages) */}
          {linkedTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} to={createPageUrl(tool.page)}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-all hover:scale-105 backdrop-blur group h-full">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{tool.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}