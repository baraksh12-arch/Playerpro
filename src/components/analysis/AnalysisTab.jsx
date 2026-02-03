import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Waves, BarChart3, Music, GitBranch,
  Camera, CameraOff, FlipHorizontal2, Settings,
  Mic, MicOff, Pause, Play, ChevronLeft, ChevronRight,
  Sun, X, Menu
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getAnalysisEngine, destroyAnalysisEngine } from './AnalysisEngine';

// Pro Tuner Header
import ProTunerHeader from './ProTunerHeader';

// View Components
import WaveformView from './views/WaveformView';
import SpectralView from './views/SpectralView';
import HarmonicView from './views/HarmonicView';
import NoteStaffView from './views/NoteStaffView';
import IntervalTrainerView from './views/IntervalTrainerView';

const VIEWS = [
  { id: 'waveform', name: 'Waveform', icon: Activity, shortName: 'Wave' },
  { id: 'spectral', name: 'Spectral', icon: Waves, shortName: 'FFT' },
  { id: 'harmonic', name: 'Harmonic', icon: BarChart3, shortName: 'Harm' },
  { id: 'notestaff', name: 'Note Staff', icon: Music, shortName: 'Staff' },
  { id: 'interval', name: 'Interval', icon: GitBranch, shortName: 'Int' },
];

export default function AnalysisTab({ onClose }) {
  const [activeView, setActiveView] = useState('waveform');
  const [isFrozen, setIsFrozen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  
  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [cameraDim, setCameraDim] = useState(30);
  const [cameraBlur, setCameraBlur] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showViewPicker, setShowViewPicker] = useState(false);
  const [spectrumMode, setSpectrumMode] = useState('line');
  
  // Analysis data
  const [analysisData, setAnalysisData] = useState(null);
  const [frozenData, setFrozenData] = useState(null);
  
  // Refs
  const engineRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  
  // Initialize analysis engine
  useEffect(() => {
    engineRef.current = getAnalysisEngine();
    
    const unsubscribe = engineRef.current.subscribe((data) => {
      if (data.type === 'frame' && !isFrozen) {
        setAnalysisData(data);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isFrozen]);
  

  
  // Start/stop listening
  const toggleListening = useCallback(async () => {
    if (isListening) {
      engineRef.current?.stop();
      setIsListening(false);
      setAnalysisData(null);
    } else {
      try {
        setMicError(null);
        await engineRef.current?.start();
        setIsListening(true);
      } catch (error) {
        setMicError('Microphone access denied. Please enable microphone permissions.');
        console.error('Mic error:', error);
      }
    }
  }, [isListening]);
  
  // Auto-start listening
  useEffect(() => {
    const timer = setTimeout(() => {
      toggleListening();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      destroyAnalysisEngine();
    };
  }, []);
  
  // Camera functions
  const startCamera = async () => {
    try {
      setCameraEnabled(true);
      setCameraReady(false);
      
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      cameraStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => setCameraReady(true));
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraEnabled(false);
      setCameraReady(false);
    }
  };
  
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setCameraReady(false);
  };
  
  const flipCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (cameraEnabled) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };
  
  // Toggle freeze
  const toggleFreeze = useCallback(() => {
    if (!isFrozen && analysisData) {
      setFrozenData({ ...analysisData });
    }
    setIsFrozen(prev => !prev);
  }, [isFrozen, analysisData]);
  
  // View navigation
  const navigateView = useCallback((direction) => {
    const currentIndex = VIEWS.findIndex(v => v.id === activeView);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % VIEWS.length;
    } else {
      newIndex = (currentIndex - 1 + VIEWS.length) % VIEWS.length;
    }
    
    setActiveView(VIEWS[newIndex].id);
    setIsFrozen(false);
    setFrozenData(null);
  }, [activeView]);
  
  // Touch/swipe handling
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };
  
  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    
    // Horizontal swipe
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        navigateView('prev');
      } else {
        navigateView('next');
      }
    }
  };
  
  // Double tap to freeze
  const lastTapRef = useRef(0);
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleFreeze();
    }
    lastTapRef.current = now;
  };
  
  const currentViewData = isFrozen ? frozenData : analysisData;
  const activeViewConfig = VIEWS.find(v => v.id === activeView);
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden"
    >
      {/* Camera Background */}
      {cameraEnabled && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
              filter: cameraBlur ? 'blur(8px)' : 'none'
            }}
          />
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-200"
            style={{ opacity: cameraDim / 100 }}
          />
        </>
      )}
      
      {/* Animated gradient background (fallback) */}
      {!cameraEnabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        </div>
      )}
      
      {/* Compact Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-semibold text-sm">Analysis</h1>
            <span className="text-white/40 text-xs">{activeViewConfig?.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Picker */}
          <button
            onClick={() => setShowViewPicker(true)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          {/* Camera Toggle */}
          <button
            onClick={cameraEnabled ? stopCamera : startCamera}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              cameraEnabled ? 'bg-blue-500/30 text-blue-400' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>
          
          {/* Flip Camera */}
          {cameraEnabled && (
            <button
              onClick={flipCamera}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          )}
          
          {/* Mic Toggle */}
          <button
            onClick={toggleListening}
            className={`h-9 px-4 rounded-full font-medium text-xs flex items-center gap-1.5 transition-all ${
              isListening
                ? 'bg-red-500/30 text-red-400 hover:bg-red-500/40'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isListening ? 'Stop' : 'Start'}
          </button>
          
          {/* Settings */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all">
                <Settings className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-gray-900 border-white/10 text-white w-80">
              <SheetHeader>
                <SheetTitle className="text-white">Analysis Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Spectrum Mode */}
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider font-medium">Spectrum Display</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {['line', 'filled'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSpectrumMode(mode)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          spectrumMode === mode
                            ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Camera Settings */}
                {cameraEnabled && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider font-medium flex items-center gap-2">
                        <Sun className="w-3 h-3" />
                        Background Dim
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        <Slider
                          value={[cameraDim]}
                          onValueChange={(v) => setCameraDim(v[0])}
                          min={0}
                          max={70}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-white/50 w-8">{cameraDim}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-medium flex items-center gap-2">
                        Blur Background
                      </label>
                      <Switch checked={cameraBlur} onCheckedChange={setCameraBlur} />
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      
      {/* Pro Tuner Header */}
      <ProTunerHeader 
        engine={engineRef.current}
        data={currentViewData}
        className="relative z-10"
      />
      
      {/* Freeze Indicator */}
      {isFrozen && (
        <div className="relative z-10 flex items-center justify-center py-1 bg-amber-500/20">
          <div className="px-3 py-0.5 rounded-full text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Pause className="w-3 h-3" />
            Frozen
          </div>
        </div>
      )}
      
      {/* Main View Area */}
      <div 
        className="flex-1 relative z-10 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        {/* Error State */}
        {micError && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center">
              <MicOff className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
              <p className="text-white/70">{micError}</p>
              <button
                onClick={toggleListening}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* Views */}
        {!micError && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {activeView === 'waveform' && (
                <WaveformView 
                  data={currentViewData} 
                  isFrozen={isFrozen}
                  engine={engineRef.current}
                />
              )}
              {activeView === 'spectral' && (
                <SpectralView 
                  data={currentViewData} 
                  isFrozen={isFrozen}
                  mode={spectrumMode}
                />
              )}
              {activeView === 'harmonic' && (
                <HarmonicView 
                  data={currentViewData} 
                  isFrozen={isFrozen}
                />
              )}
              {activeView === 'notestaff' && (
                <NoteStaffView 
                  data={currentViewData} 
                  isFrozen={isFrozen}
                  engine={engineRef.current}
                />
              )}
              {activeView === 'interval' && (
                <IntervalTrainerView 
                  data={currentViewData} 
                  isFrozen={isFrozen}
                  engine={engineRef.current}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* Navigation arrows */}
        <button
          onClick={() => navigateView('prev')}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-20 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-black/60 transition-all z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigateView('next')}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-20 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-black/60 transition-all z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Freeze button */}
        <button
          onClick={toggleFreeze}
          className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all z-20 ${
            isFrozen 
              ? 'bg-amber-500/30 text-amber-400 border-2 border-amber-500/50' 
              : 'bg-black/40 backdrop-blur-sm text-white/50 hover:text-white hover:bg-black/60'
          }`}
        >
          {isFrozen ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
      </div>
      
      {/* View Indicator Dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 py-3 bg-black/40 backdrop-blur-xl">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setActiveView(view.id);
              setIsFrozen(false);
              setFrozenData(null);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeView === view.id
                ? 'bg-white/20 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {view.shortName}
          </button>
        ))}
      </div>
      
      {/* View Picker Sheet */}
      <Sheet open={showViewPicker} onOpenChange={setShowViewPicker}>
        <SheetContent side="left" className="bg-gray-900 border-white/10 text-white w-64">
          <SheetHeader>
            <SheetTitle className="text-white">Analysis Views</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  setActiveView(view.id);
                  setIsFrozen(false);
                  setFrozenData(null);
                  setShowViewPicker(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeView === view.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <view.icon className="w-5 h-5" />
                <span className="font-medium">{view.name}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}