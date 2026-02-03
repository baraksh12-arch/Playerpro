import React, { useState } from 'react';
import { useI18n } from '@/Layout';
import { Music2, Clock, Mic, Ear, Target, TrendingUp, Grid, BookOpen, Repeat, Layers, Radio, Waves, Sparkles, Volume1, Guitar, Eye, ListMusic, Activity } from 'lucide-react';
import PremiumAnalysisView from '@/components/analysis/PremiumAnalysisView';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StudentPractice() {
  const { t } = useI18n();
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Show Analysis Tab if active
  if (showAnalysis) {
    return <PremiumAnalysisView onClose={() => setShowAnalysis(false)} />;
  }

  const tools = [
    {
      id: 'metronome',
      name: t('page.practice.metronome'),
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      page: 'StudentMetronome',
    },
    {
      id: 'tuner',
      name: t('page.practice.tuner'),
      icon: Music2,
      gradient: 'from-purple-500 to-pink-500',
      page: 'StudentTuner',
    },
    {
      id: 'timer',
      name: t('page.practice.timer'),
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      page: 'StudentTimer',
    },
    {
      id: 'recorder',
      name: t('page.practice.recorder'),
      icon: Mic,
      gradient: 'from-red-500 to-orange-500',
      page: 'StudentRecorder',
    },
    {
      id: 'ear-training',
      name: t('page.practice.ear'),
      icon: Ear,
      gradient: 'from-yellow-500 to-amber-500',
      page: 'StudentEarTraining',
    },
    {
      id: 'rhythm',
      name: t('page.practice.rhythm'),
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-blue-500',
      page: 'StudentRhythm',
    },
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
      id: 'pitch-lab',
      name: 'Pitch Lab',
      icon: Waves,
      gradient: 'from-cyan-500 to-blue-500',
      page: 'StudentPitchLab',
    },
    {
      id: 'analysis',
      name: 'Analysis',
      icon: Activity,
      gradient: 'from-violet-500 to-purple-500',
      isFullscreen: true,
    },
    {
      id: 'plasma-chords',
      name: 'Plasma Chords',
      icon: Sparkles,
      gradient: 'from-purple-500 to-pink-500',
      page: 'StudentPlasmaChords',
    },
    {
      id: 'drone-lab',
      name: 'Drone Lab',
      icon: Volume1,
      gradient: 'from-amber-500 to-orange-500',
      page: 'StudentDroneLab',
    },
    {
      id: 'guitar-fretboard',
      name: 'Fretboard',
      icon: Guitar,
      gradient: 'from-emerald-500 to-teal-500',
      page: 'StudentGuitarFretboard',
    },
    {
      id: 'sight-reading',
      name: 'Sight Reading',
      icon: Eye,
      gradient: 'from-sky-500 to-indigo-500',
      page: 'StudentSightReading',
    },
    {
      id: 'smart-progressions',
      name: 'Progressions',
      icon: ListMusic,
      gradient: 'from-fuchsia-500 to-purple-500',
      page: 'StudentSmartProgressions',
    },
  ];

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
            
            // Handle fullscreen tools (like Analysis)
            if (tool.isFullscreen) {
              return (
                <Card 
                  key={tool.id} 
                  className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-all hover:scale-105 backdrop-blur group"
                  onClick={() => setShowAnalysis(true)}
                >
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{tool.name}</h3>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <Link key={tool.id} to={createPageUrl(tool.page)}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-all hover:scale-105 backdrop-blur group">
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

        {/* Additional Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <Link to={createPageUrl('StudentPracticeRoom')}>
            <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-105 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <Grid className="w-10 h-10 text-purple-400" />
                <h3 className="text-xl font-bold text-white">{t('page.practice.routines')}</h3>
                <p className="text-gray-300 text-sm">{t('page.room.subtitle')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StudentCustomRoom')}>
            <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 hover:border-green-500/50 cursor-pointer transition-all hover:scale-105 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <Target className="w-10 h-10 text-green-400" />
                <h3 className="text-xl font-bold text-white">{t('page.practice.custom')}</h3>
                <p className="text-gray-300 text-sm">{t('page.room.customLayout')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StudentTheory')}>
            <Card className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-orange-500/30 hover:border-orange-500/50 cursor-pointer transition-all hover:scale-105 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <BookOpen className="w-10 h-10 text-orange-400" />
                <h3 className="text-xl font-bold text-white">{t('page.practice.theory')}</h3>
                <p className="text-gray-300 text-sm">Learn scales, chords & more</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}