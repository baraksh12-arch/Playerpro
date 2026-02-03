
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TECHNIQUES = {
  'Warm-Up Exercises': [
    {
      name: 'Chromatic Exercise',
      difficulty: 'Beginner',
      description: 'Four-finger chromatic exercise for dexterity',
      tab: `e|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|
B|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|
G|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|
D|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|
A|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|
E|---1-2-3-4---1-2-3-4---1-2-3-4---1-2-3-4---|`,
      tips: ['Use alternate picking', 'Start slow (60 BPM) and gradually increase', 'Keep fingers close to fretboard']
    },
    {
      name: 'Spider Exercise',
      difficulty: 'Beginner',
      description: 'Finger independence exercise across strings',
      tab: `e|---1---2---3---4----|
B|-------1---2---3---4|
G|---1---2---3---4----|
D|-------1---2---3---4|
A|---1---2---3---4----|
E|-------1---2---3---4|`,
      tips: ['One finger per fret', 'Keep all fingers down', 'Maintain even tempo']
    }
  ],
  
  'Alternate Picking': [
    {
      name: 'String Skipping Exercise',
      difficulty: 'Intermediate',
      description: 'Develop accuracy with string skipping',
      tab: `e|---5-7-8-7-5--------|
B|-------------8-7-5--|
G|-------------------7|
D|--------------------|
A|--------------------|
E|--------------------|`,
      tips: ['Strict down-up picking', 'Focus on accuracy over speed', 'Mute unused strings']
    },
    {
      name: 'Triplet Exercise',
      difficulty: 'Intermediate',
      description: 'Alternate picking in triplets',
      tab: `e|---5-6-7-5-6-7-5-6-7-5-6-7---|
B|---5-6-7-5-6-7-5-6-7-5-6-7---|
G|-----------------------------|
D|-----------------------------|
A|-----------------------------|
E|-----------------------------|`,
      tips: ['Down-up-down, up-down-up pattern', 'Keep wrist relaxed', 'Use metronome']
    }
  ],
  
  'Legato': [
    {
      name: 'Hammer-On Pull-Off Exercise',
      difficulty: 'Beginner',
      description: 'Basic hammer-on and pull-off technique',
      tab: `e|---5h7p5---7h9p7---9h10p9---|
B|---5h7p5---7h9p7---9h10p9---|
G|----------------------------|
D|----------------------------|
A|----------------------------|
E|----------------------------|`,
      tips: ['Pull off with a slight downward motion', 'Hammer on with force', 'Make notes ring clearly']
    },
    {
      name: 'Three-Note-Per-String Legato',
      difficulty: 'Advanced',
      description: 'Legato across scale patterns',
      tab: `e|---5h7h8-8p7p5---7h9h10-10p9p7---|
B|---5h7h8-8p7p5---7h9h10-10p9p7---|
G|---5h7h9-9p7p5---7h9h10-10p9p7---|
D|---------------------------------|
A|---------------------------------|
E|---------------------------------|`,
      tips: ['One pick stroke per string', 'Economy of motion', 'Build speed gradually']
    }
  ],
  
  'Sweep Picking': [
    {
      name: 'Three-String Sweep',
      difficulty: 'Advanced',
      description: 'Basic arpeggio sweep on three strings',
      tab: `e|---12----|
B|---13----|
G|---12----|
D|---------|
A|---------|
E|---------|`,
      tips: ['One fluid picking motion', 'Mute strings after playing', 'Roll through the pick']
    },
    {
      name: 'Five-String Major Arpeggio',
      difficulty: 'Advanced',
      description: 'Full sweep arpeggio pattern',
      tab: `e|---12----------------|
B|------13-------------|
G|---------14----------|
D|------------14-------|
A|---------------12----|
E|---------------------|`,
      tips: ['Continuous pick motion', 'Roll through strings', 'Practice slowly first']
    }
  ],
  
  'Tapping': [
    {
      name: 'Basic Two-Hand Tapping',
      difficulty: 'Intermediate',
      description: 'Simple tapping exercise',
      tab: `e|---12t17p12---15t19p15---|
B|---12t17p12---15t19p15---|
G|-------------------------|
D|-------------------------|
A|-------------------------|
E|-------------------------|`,
      tips: ['Tap with finger pad, not tip', 'Pull off with authority', 'Mute lower strings']
    },
    {
      name: 'Three-Finger Tapping',
      difficulty: 'Advanced',
      description: 'Multiple finger tapping pattern',
      tab: `e|---5t12t15p12p5---7t14t17p14p7---|
B|---5t12t15p12p5---7t14t17p14p7---|
G|---------------------------------|
D|---------------------------------|
A|---------------------------------|
E|---------------------------------|`,
      tips: ['Use index and middle for tapping', 'Keep rhythm even', 'Precise finger placement']
    }
  ],
  
  'Speed Building': [
    {
      name: 'Scalar Speed Builder',
      difficulty: 'Intermediate',
      description: 'Four-note groupings for speed',
      tab: `e|---5-6-7-8-6-7-8-9-7-8-9-10-8-9-10-12---|
B|----------------------------------------|
G|----------------------------------------|
D|----------------------------------------|
A|----------------------------------------|
E|----------------------------------------|`,
      tips: ['Start at 60 BPM, increase by 5 BPM increments', 'Use metronome always', 'Tension = slow']
    },
    {
      name: 'Sextuplet Run',
      difficulty: 'Advanced',
      description: 'Six-note groupings for speed and fluidity',
      tab: `e|---8-10-12-10-8-7-8-10-12-10-8-7---|
B|-----------------------------------|
G|-----------------------------------|
D|-----------------------------------|
A|-----------------------------------|
E|-----------------------------------|`,
      tips: ['Strict alternate picking', 'Groups of 6 notes', 'Master slowly before speed']
    }
  ],
  
  'Bending': [
    {
      name: 'Half-Step Bends',
      difficulty: 'Beginner',
      description: 'Basic bending technique',
      tab: `e|---7b8---7b8---7b8---|
B|---7b8---7b8---7b8---|
G|---------------------|
D|---------------------|
A|---------------------|
E|---------------------|`,
      tips: ['Bend with three fingers for support', 'Bend in pitch, not rhythm', 'Listen to target pitch']
    },
    {
      name: 'Whole-Step Bends & Vibrato',
      difficulty: 'Intermediate',
      description: 'Full bends with vibrato',
      tab: `e|---7b9~~~---10b12~~~---|
B|---7b9~~~---10b12~~~---|
G|-----------------------|
D|-----------------------|
A|-----------------------|
E|-----------------------|`,
      tips: ['Rotate wrist, not just fingers', 'Add vibrato at peak of bend', 'Match target pitch exactly']
    }
  ],
  
  'Hybrid Picking': [
    {
      name: 'Pick & Fingers Exercise',
      difficulty: 'Intermediate',
      description: 'Combining pick and fingers',
      tab: `e|---5---7---8---7---|  (middle finger)
B|-------6-------6---|  (index finger)
G|---5-------5-------|  (pick)
D|-------------------|
A|-------------------|
E|-------------------|`,
      tips: ['Pick for bass notes', 'Fingers for higher strings', 'Independent finger control']
    }
  ]
};

export default function TechniquesSection() {
  const [selectedCategory, setSelectedCategory] = useState('Warm-Up Exercises');

  return (
    <div className="space-y-8">
      {/* Category Selector */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Guitar Techniques & Exercises</h2>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 h-auto">
            {Object.keys(TECHNIQUES).map(category => (
              <TabsTrigger 
                key={category} 
                value={category} 
                className="text-xs py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Exercises List */}
      <div className="space-y-6">
        {TECHNIQUES[selectedCategory].map((technique, idx) => (
          <div key={idx} className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{technique.name}</h3>
                <p className="text-sm text-gray-600">{technique.description}</p>
              </div>
              <span
                className={`px-4 py-2 rounded-2xl text-sm font-semibold ${
                  technique.difficulty === 'Beginner'
                    ? 'bg-green-100 text-green-700'
                    : technique.difficulty === 'Intermediate'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {technique.difficulty}
              </span>
            </div>

            {/* Tab */}
            <div className="bg-gray-50 p-6 rounded-2xl overflow-x-auto mb-6">
              <pre className="font-mono text-sm text-gray-900 whitespace-pre">
                {technique.tab}
              </pre>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
              <h4 className="font-bold text-blue-900 mb-3">💡 Practice Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                {technique.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* General Practice Tips */}
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl border-2 border-cyan-100 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 General Practice Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 text-lg">Before Practice:</h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Warm up your fingers for 5-10 minutes</li>
              <li>• Tune your guitar</li>
              <li>• Set specific goals for the session</li>
              <li>• Have a metronome ready</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 text-lg">During Practice:</h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Start slow, speed comes with accuracy</li>
              <li>• Use a metronome for timing</li>
              <li>• Take breaks every 20-30 minutes</li>
              <li>• Record yourself to track progress</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
