import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Move, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';
import MetronomeWidget from './widgets/MetronomeWidget';
import TunerWidget from './widgets/TunerWidget';
import TimerWidget from './widgets/TimerWidget';

const WIDGET_COMPONENTS = {
  'metronome': MetronomeWidget,
  'tuner': TunerWidget,
  'timer': TimerWidget,
  'chord-finder': () => <div className="text-center text-gray-500">Chord Finder Widget</div>,
  'scale-quick': () => <div className="text-center text-gray-500">Scales Widget</div>,
  'note-trainer': () => <div className="text-center text-gray-500">Note Trainer Widget</div>,
  'bpm-tap': () => <div className="text-center text-gray-500">BPM Tap Widget</div>,
};

function DraggableWidget({ widget, onUpdate, onRemove, getWidgetColor }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: widget.x, y: widget.y });
  const [size, setSize] = useState({ width: widget.width, height: widget.height });
  const widgetRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x);
        const newY = Math.max(0, e.clientY - dragStart.y);
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newWidth = Math.max(300, size.width + deltaX);
        const newHeight = Math.max(250, size.height + deltaY);
        setSize({ width: newWidth, height: newHeight });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate(widget.id, { x: position.x, y: position.y });
      }
      if (isResizing) {
        setIsResizing(false);
        onUpdate(widget.id, { width: size.width, height: size.height });
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, position, size, widget.id, onUpdate]);

  const WidgetComponent = WIDGET_COMPONENTS[widget.type] || (() => <div>Unknown Widget</div>);

  return (
    <div
      ref={widgetRef}
      className={`absolute ${isDragging || isResizing ? 'z-50' : 'z-10'}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <Card className={`w-full h-full bg-white/10 backdrop-blur-xl border-2 shadow-2xl overflow-hidden transition-all ${
        isDragging || isResizing ? 'border-white/60 scale-105' : 'border-white/20 hover:border-white/40'
      }`}>
        {/* Widget Header */}
        <div
          onMouseDown={handleMouseDown}
          className={`bg-gradient-to-r ${getWidgetColor(widget.type)} px-4 py-3 flex items-center justify-between cursor-move select-none`}
        >
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-white/70" />
            <span className="text-white font-bold text-sm">
              {widget.type.charAt(0).toUpperCase() + widget.type.slice(1).replace(/-/g, ' ')}
            </span>
          </div>
          <button
            onClick={() => onRemove(widget.id)}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Widget Content */}
        <div className="p-6 overflow-auto" style={{ height: 'calc(100% - 52px - 24px)' }}>
          <WidgetComponent />
        </div>

        {/* Resize Handle */}
        <div
          className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute bottom-1 right-1">
            <GripHorizontal className="w-4 h-4 text-white/50 group-hover:text-white transition-colors transform rotate-45" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function WidgetCanvas({ routine, onComplete }) {
  const [widgets, setWidgets] = useState([]);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (routine?.widget_layout) {
      // Initialize widgets from routine
      const initialWidgets = routine.widget_layout.map((w, idx) => ({
        ...w,
        x: w.x || (idx * 50),
        y: w.y || (idx * 50),
        width: w.width || 400,
        height: w.height || 300,
      }));
      setWidgets(initialWidgets);
    }
  }, [routine]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: Math.max(window.innerHeight - 200, 600),
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const handleRemoveWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleUpdateWidget = (id, updates) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, ...updates } : w
    ));
  };

  const getWidgetColor = (type) => {
    const colors = {
      'metronome': 'from-blue-500 to-cyan-500',
      'tuner': 'from-purple-500 to-pink-500',
      'timer': 'from-green-500 to-emerald-500',
      'chord-finder': 'from-orange-500 to-red-500',
      'scale-quick': 'from-indigo-500 to-purple-500',
      'note-trainer': 'from-pink-500 to-rose-500',
      'bpm-tap': 'from-teal-500 to-cyan-500',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl top-1/2 left-1/2 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              {routine?.name || 'Practice Room'}
            </h1>
            <p className="text-lg text-purple-200">
              Drag, resize & arrange your widgets
            </p>
          </div>
          {onComplete && (
            <Button
              onClick={onComplete}
              className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
            >
              Exit
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden"
          style={{ height: canvasSize.height }}
        >
          {widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Maximize2 className="w-20 h-20 text-white/30 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No Widgets</h3>
                <p className="text-purple-200">Add widgets when building your routine</p>
              </div>
            </div>
          ) : (
            widgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                onUpdate={handleUpdateWidget}
                onRemove={handleRemoveWidget}
                getWidgetColor={getWidgetColor}
              />
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Move className="w-5 h-5" />
            Widget Controls
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-200">
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">●</span>
              <span><strong className="text-white">Drag:</strong> Click and hold the header to move</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">●</span>
              <span><strong className="text-white">Resize:</strong> Drag the bottom-right corner</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">●</span>
              <span><strong className="text-white">Remove:</strong> Click the X button on each widget</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}