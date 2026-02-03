import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Music, BookOpen, GitBranch, Zap } from 'lucide-react';
import ScalesSection from '../components/theory/ScalesSection.jsx';
import ChordsSection from '../components/theory/ChordsSection.jsx';
import ProgressionsSection from '../components/theory/ProgressionsSection.jsx';
import TechniquesSection from '../components/theory/TechniquesSection.jsx';

export default function StudentTheory() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Guitar Theory & Reference</h1>
        <p className="text-gray-600">Complete reference guide for scales, chords, progressions, and techniques</p>
      </div>

      <Tabs defaultValue="scales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="scales" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">Scales</span>
          </TabsTrigger>
          <TabsTrigger value="chords" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Chords</span>
          </TabsTrigger>
          <TabsTrigger value="progressions" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Progressions</span>
          </TabsTrigger>
          <TabsTrigger value="techniques" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Techniques</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scales">
          <ScalesSection />
        </TabsContent>

        <TabsContent value="chords">
          <ChordsSection />
        </TabsContent>

        <TabsContent value="progressions">
          <ProgressionsSection />
        </TabsContent>

        <TabsContent value="techniques">
          <TechniquesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}