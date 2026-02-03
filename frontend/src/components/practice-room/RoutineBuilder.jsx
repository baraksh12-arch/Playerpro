
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Save, GripVertical, Grid3x3, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/Layout';

const EXERCISE_TYPES = [
  { id: 'metronome', name: 'Metronome', icon: '🥁' },
  { id: 'tuner', name: 'Tuner', icon: '🎵' },
  { id: 'ear-training', name: 'Ear Training', icon: '👂' },
  { id: 'rhythm', name: 'Rhythm Trainer', icon: '⏱️' },
  { id: 'scales', name: 'Scales Practice', icon: '🎼' },
  { id: 'chords', name: 'Chords Practice', icon: '🎸' },
  { id: 'techniques', name: 'Techniques', icon: '⚡' },
  { id: 'timer', name: 'Free Practice', icon: '⏲️' },
];

const WIDGET_TYPES = [
  { id: 'metronome', name: 'Metronome', icon: '🥁', color: 'from-blue-500 to-cyan-500' },
  { id: 'tuner', name: 'Tuner', icon: '🎵', color: 'from-purple-500 to-pink-500' },
  { id: 'timer', name: 'Timer', icon: '⏲️', color: 'from-green-500 to-emerald-500' },
  { id: 'chord-finder', name: 'Chord Finder', icon: '🎸', color: 'from-orange-500 to-red-500' },
  { id: 'scale-quick', name: 'Scales', icon: '🎼', color: 'from-indigo-500 to-purple-500' },
  { id: 'note-trainer', name: 'Note Trainer', icon: '🎯', color: 'from-pink-500 to-rose-500' },
  { id: 'bpm-tap', name: 'BPM Tap', icon: '👆', color: 'from-teal-500 to-cyan-500' },
  { id: 'recorder', name: 'Recorder', icon: '🎤', color: 'from-red-500 to-rose-500' },
];

export default function RoutineBuilder({ studentId }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  const saveRoutineMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PracticeRoutine.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practiceRoutines'] });
      setName('');
      setDescription('');
      setExercises([]);
      setWidgets([]);
      alert(t('common.save') + ' ✓');
    },
  });

  const handleAddExercise = () => {
    setExercises([
      ...exercises,
      {
        id: Date.now().toString(),
        type: 'metronome',
        duration_minutes: 5,
        settings: {},
      },
    ]);
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const handleUpdateExercise = (id, field, value) => {
    setExercises(
      exercises.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      )
    );
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(exercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setExercises(items);
  };

  const handleAddWidget = (widgetType) => {
    const newWidget = {
      id: `${widgetType.id}-${Date.now()}`,
      type: widgetType.id,
      name: widgetType.name,
      icon: widgetType.icon,
      color: widgetType.color,
    };
    setWidgets([...widgets, newWidget]);
    setShowWidgetSelector(false);
  };

  const handleRemoveWidget = (id) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a routine name');
      return;
    }

    if (exercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    saveRoutineMutation.mutate({
      student_id: studentId,
      name,
      description,
      exercises: exercises.map(({ id, ...rest }) => rest),
      widget_layout: widgets.map(w => ({
        id: w.id,
        type: w.type,
        x: 0,
        y: 0,
        width: 400,
        height: 300,
      })),
    });
  };

  const totalMinutes = exercises.reduce((sum, e) => sum + e.duration_minutes, 0);

  return (
    <div className="space-y-8">
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('page.room.buildRoutine')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Routine Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Warm-up, Blues Session"
              className="h-12 rounded-2xl"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your practice routine..."
              className="rounded-2xl"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{t('page.room.exercises')}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Drag to reorder • {t('page.room.total')}: {totalMinutes} {t('page.room.minutes')}
            </p>
          </div>
          <Button
            onClick={handleAddExercise}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Exercise
          </Button>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 mb-4">No exercises added yet</p>
            <Button
              onClick={handleAddExercise}
              variant="outline"
              className="rounded-2xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Exercise
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {exercises.map((exercise, index) => (
                    <Draggable
                      key={exercise.id}
                      draggableId={exercise.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 transition-all ${
                            snapshot.isDragging
                              ? 'border-purple-500 shadow-2xl'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-5 h-5 text-gray-400" />
                            </div>

                            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl text-2xl">
                              {EXERCISE_TYPES.find((t) => t.id === exercise.type)?.icon}
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Select
                                value={exercise.type}
                                onValueChange={(value) =>
                                  handleUpdateExercise(exercise.id, 'type', value)
                                }
                              >
                                <SelectTrigger className="h-12 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXERCISE_TYPES.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.icon} {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={exercise.duration_minutes}
                                  onChange={(e) =>
                                    handleUpdateExercise(
                                      exercise.id,
                                      'duration_minutes',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="h-12 rounded-xl"
                                />
                                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                  {t('page.room.minutes')}
                                </span>
                              </div>
                            </div>

                            <Button
                              onClick={() => handleRemoveExercise(exercise.id)}
                              variant="outline"
                              size="icon"
                              className="rounded-xl"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Card>

      {/* Widgets Section */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Grid3x3 className="w-6 h-6 text-purple-500" />
              {t('page.room.widgets')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Add widgets that will be available during this routine
            </p>
          </div>
          <Button
            onClick={() => setShowWidgetSelector(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('page.room.addWidget')}
          </Button>
        </div>

        {widgets.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
            <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No widgets added yet</p>
            <p className="text-sm text-gray-400 mb-6">
              Widgets will be available in Practice Room with drag, resize & reposition
            </p>
            <Button
              onClick={() => setShowWidgetSelector(true)}
              variant="outline"
              className="rounded-2xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Widgets
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="relative group p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-cyan-300 transition-all"
              >
                <button
                  onClick={() => handleRemoveWidget(widget.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <div className="text-4xl mb-2">{widget.icon}</div>
                  <div className="text-sm font-semibold text-gray-900">{widget.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showWidgetSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Select Widgets</h3>
              <button
                onClick={() => setShowWidgetSelector(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {WIDGET_TYPES.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => handleAddWidget(widget)}
                  className="group p-6 rounded-2xl bg-gray-50 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-blue-50 border-2 border-gray-200 hover:border-cyan-300 transition-all hover:scale-105"
                >
                  <div className="text-4xl mb-2">{widget.icon}</div>
                  <div className="text-sm font-semibold text-gray-900">{widget.name}</div>
                  <div className={`mt-2 text-xs text-gray-500 group-hover:text-cyan-600 transition-colors`}>
                    Click to add
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{exercises.length} exercises</span>
          <span>•</span>
          <span>{widgets.length} widgets</span>
          <span>•</span>
          <span>{totalMinutes} {t('page.room.minutes')}</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || exercises.length === 0 || saveRoutineMutation.isLoading}
          className="h-14 px-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-lg font-bold"
        >
          <Save className="w-5 h-5 mr-2" />
          {t('common.save')} Routine
        </Button>
      </div>
    </div>
  );
}
