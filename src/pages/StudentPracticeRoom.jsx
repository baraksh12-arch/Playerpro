import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Play, Save, Plus, Layout as LayoutIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RoutineBuilder from '../components/practice-room/RoutineBuilder';
import WidgetCanvas from '../components/practice-room/WidgetCanvas';
import RoutinePlayer from '../components/practice-room/RoutinePlayer';
import { useI18n } from '@/Layout';

export default function StudentPracticeRoom() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('routines');
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['practiceRoutines', user?.id],
    queryFn: () => base44.entities.PracticeRoutine.filter({ student_id: user?.id }),
    enabled: !!user?.id,
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (routineId) => {
      await base44.entities.PracticeRoutine.delete(routineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practiceRoutines'] });
    },
  });

  const handlePlayRoutine = (routine) => {
    setSelectedRoutine(routine);
    setIsPlaying(true);
  };

  const handleDeleteRoutine = async (routineId, routineName) => {
    if (window.confirm(`${t('common.delete')} "${routineName}"?`)) {
      await deleteRoutineMutation.mutate(routineId);
    }
  };

  if (isPlaying && selectedRoutine) {
    return (
      <RoutinePlayer
        routine={selectedRoutine}
        onComplete={() => {
          setIsPlaying(false);
          setSelectedRoutine(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">{t('page.room.title')}</h1>
          <p className="text-xl text-gray-500">{t('page.room.subtitle')}</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-14">
            <TabsTrigger value="routines" className="text-lg">
              <Play className="w-5 h-5 mr-2" />
              {t('page.room.myRoutines')}
            </TabsTrigger>
            <TabsTrigger value="builder" className="text-lg">
              <Plus className="w-5 h-5 mr-2" />
              {t('page.room.buildRoutine')}
            </TabsTrigger>
            <TabsTrigger value="widgets" className="text-lg">
              <LayoutIcon className="w-5 h-5 mr-2" />
              {t('page.room.customLayout')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routines">
            {/* Saved Routines */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-12">{t('common.loading')}</div>
              ) : routines.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-12 text-center shadow-xl">
                  <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('page.room.noRoutines')}</h3>
                  <p className="text-gray-600 mb-6">{t('page.room.noRoutinesDesc')}</p>
                  <Button
                    onClick={() => setActiveTab('builder')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('page.room.createRoutine')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{routine.name}</h3>
                          {routine.description && (
                            <p className="text-gray-600 mb-4">{routine.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-700 mb-3">{t('page.room.exercises')}:</p>
                        <div className="space-y-2">
                          {routine.exercises.map((exercise, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                            >
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {exercise.type.replace('-', ' ')}
                              </span>
                              <span className="text-sm text-purple-600 font-semibold">
                                {exercise.duration_minutes} {t('page.room.minutes')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          {t('page.room.total')}: {routine.exercises.reduce((sum, e) => sum + e.duration_minutes, 0)} {t('page.room.minutes')}
                        </div>
                        <Button
                          onClick={() => handlePlayRoutine(routine)}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t('page.room.start')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="builder">
            <RoutineBuilder studentId={user?.id} />
          </TabsContent>

          <TabsContent value="widgets">
            <WidgetCanvas studentId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}