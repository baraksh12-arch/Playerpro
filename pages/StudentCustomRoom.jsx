import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, GripVertical, Save, Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MetronomeWidget from '../components/custom-room/MetronomeWidget';
import TunerWidget from '../components/custom-room/TunerWidget';
import TimerWidget from '../components/custom-room/TimerWidget';
import ChordFinderWidget from '../components/custom-room/ChordFinderWidget';
import ScaleQuickWidget from '../components/custom-room/ScaleQuickWidget';
import NoteTrainerWidget from '../components/custom-room/NoteTrainerWidget';
import IntervalTrainerWidget from '../components/custom-room/IntervalTrainerWidget';
import BPMTapWidget from '../components/custom-room/BPMTapWidget';

const AVAILABLE_WIDGETS = [
  { id: 'metronome', name: 'Metronome', icon: '🥁', color: 'from-blue-500 to-cyan-500', component: MetronomeWidget },
  { id: 'tuner', name: 'Tuner', icon: '🎵', color: 'from-purple-500 to-pink-500', component: TunerWidget },
  { id: 'timer', name: 'Timer', icon: '⏲️', color: 'from-green-500 to-emerald-500', component: TimerWidget },
  { id: 'chord-finder', name: 'Chord Finder', icon: '🎸', color: 'from-orange-500 to-red-500', component: ChordFinderWidget },
  { id: 'scale-quick', name: 'Scales', icon: '🎼', color: 'from-indigo-500 to-purple-500', component: ScaleQuickWidget },
  { id: 'note-trainer', name: 'Note Trainer', icon: '🎯', color: 'from-pink-500 to-rose-500', component: NoteTrainerWidget },
  { id: 'interval-trainer', name: 'Interval Trainer', icon: '🎹', color: 'from-yellow-500 to-orange-500', component: IntervalTrainerWidget },
  { id: 'bpm-tap', name: 'BPM Tap', icon: '👆', color: 'from-teal-500 to-cyan-500', component: BPMTapWidget },
];

export default function StudentCustomRoom() {
  const [widgets, setWidgets] = useState([]);
  const [showToolbox, setShowToolbox] = useState(true);

  const handleAddWidget = (widgetType) => {
    const newWidget = {
      id: `${widgetType.id}-${Date.now()}`,
      type: widgetType.id,
      name: widgetType.name,
      color: widgetType.color,
      component: widgetType.component,
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleRemoveWidget = (id) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl top-1/2 left-1/2 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black text-white mb-2">Custom Practice Room</h1>
            <p className="text-lg text-purple-200">Drag and arrange your perfect practice space ✨</p>
          </div>
          <Button
            onClick={() => setShowToolbox(!showToolbox)}
            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
          >
            {showToolbox ? 'Hide' : 'Show'} Toolbox
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Toolbox */}
          {showToolbox && (
            <Card className="xl:col-span-1 bg-white/10 backdrop-blur-xl border-white/20 border-2 shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Plus className="w-6 h-6" />
                    Toolbox
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {AVAILABLE_WIDGETS.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => handleAddWidget(widget)}
                      className="w-full group relative overflow-hidden rounded-2xl p-4 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${widget.color} opacity-0 group-hover:opacity-20 transition-opacity`} />
                      <div className="relative flex items-center gap-3">
                        <div className="text-3xl">{widget.icon}</div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">{widget.name}</div>
                          <div className="text-xs text-purple-200">Tap to add</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {widgets.length > 0 && (
                  <button
                    onClick={() => setWidgets([])}
                    className="w-full mt-6 p-3 rounded-2xl bg-red-500/20 border-2 border-red-500/30 text-red-200 hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Clear All
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Canvas */}
          <div className={`${showToolbox ? 'xl:col-span-3' : 'xl:col-span-4'}`}>
            {widgets.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/20 border-2 border-dashed p-16 text-center shadow-2xl">
                <div className="text-6xl mb-6 animate-bounce">🎸</div>
                <h2 className="text-3xl font-bold text-white mb-4">Your Canvas Awaits</h2>
                <p className="text-lg text-purple-200 mb-8">
                  Choose widgets from the toolbox to build your perfect practice space
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {AVAILABLE_WIDGETS.slice(0, 4).map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => handleAddWidget(widget)}
                      className={`px-6 py-3 rounded-2xl bg-gradient-to-br ${widget.color} text-white font-semibold hover:scale-105 transition-all shadow-lg`}
                    >
                      {widget.icon} {widget.name}
                    </button>
                  ))}
                </div>
              </Card>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="widgets">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                      {widgets.map((widget, index) => {
                        const WidgetComponent = widget.component;
                        return (
                          <Draggable key={widget.id} draggableId={widget.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`transition-all duration-200 ${
                                  snapshot.isDragging ? 'scale-105 rotate-2 z-50' : ''
                                }`}
                              >
                                <Card
                                  className={`bg-white/10 backdrop-blur-xl border-2 shadow-2xl overflow-hidden ${
                                    snapshot.isDragging
                                      ? 'border-white/50 shadow-[0_0_50px_rgba(168,85,247,0.5)]'
                                      : 'border-white/20'
                                  }`}
                                >
                                  {/* Widget Header */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className={`bg-gradient-to-r ${widget.color} p-4 flex items-center justify-between cursor-grab active:cursor-grabbing`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <GripVertical className="w-5 h-5 text-white/70" />
                                      <span className="text-white font-bold text-lg">{widget.name}</span>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveWidget(widget.id)}
                                      className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                  
                                  {/* Widget Content */}
                                  <div className="p-6">
                                    <WidgetComponent />
                                  </div>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}