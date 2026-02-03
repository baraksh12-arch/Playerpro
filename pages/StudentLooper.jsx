import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Circle, Square, Play, Pause, Trash2, Volume2, Layers, RotateCcw, Headphones, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

/**
 * ELITE LOOPER - Boss RC-1 Style
 * 
 * States: EMPTY -> RECORDING -> PLAYING <-> OVERDUBBING
 * 
 * Single button operation:
 * - EMPTY: Tap to start recording (with count-in)
 * - RECORDING: Tap to stop recording and start playback loop
 * - PLAYING: Tap to start overdubbing
 * - OVERDUBBING: Tap to stop overdub and return to playing
 * - Long press (hold): Stop playback
 * - Double tap: Undo last layer
 */

const LOOPER_STATE = {
  EMPTY: 'empty',
  RECORDING: 'recording', 
  PLAYING: 'playing',
  OVERDUBBING: 'overdubbing',
  COUNTDOWN: 'countdown'
};

export default function StudentLooper() {
  // Core state
  const [looperState, setLooperState] = useState(LOOPER_STATE.EMPTY);
  const [layers, setLayers] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopDuration, setLoopDuration] = useState(0);
  const [countdown, setCountdown] = useState(0);
  
  // Settings
  const [bpm, setBpm] = useState(120);
  const [countInBeats, setCountInBeats] = useState(4);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [metronomeAudible, setMetronomeAudible] = useState(true);
  const [metronomeWhilePlaying, setMetronomeWhilePlaying] = useState(false);
  
  // Visual state
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  
  // System state
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // ============ REFS ============
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const inputSourceRef = useRef(null);
  
  // Playback engine
  const engineRef = useRef({
    isRunning: false,
    loopStartTime: 0,
    sources: [],
    nextLoopTimeout: null,
    animationFrame: null,
    metronomeInterval: null
  });
  
  // Recording engine
  const recorderRef = useRef({
    isRecording: false,
    startTime: 0,
    countdownInterval: null,
    animationFrame: null
  });
  
  // Input monitor
  const inputMonitorRef = useRef(null);
  
  // For undo functionality
  const undoStackRef = useRef([]);
  
  // Long press detection
  const pressTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  // ============ AUDIO INIT ============
  const initAudio = useCallback(async () => {
    if (isInitialized && audioContextRef.current && streamRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return true;
    }
    
    try {
      setError(null);
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ 
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Analyser for input level
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      inputSourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      inputSourceRef.current.connect(analyserRef.current);
      
      // Input level monitor
      const monitorInput = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const peak = Math.max(...data);
        setInputLevel(Math.min(100, (peak / 255) * 100));
        inputMonitorRef.current = requestAnimationFrame(monitorInput);
      };
      monitorInput();
      
      setIsInitialized(true);
      return true;
    } catch (err) {
      console.error('Audio init error:', err);
      setError('Microphone access required');
      return false;
    }
  }, [isInitialized]);

  // ============ METRONOME CLICK ============
  const playClick = useCallback((isDownbeat = false, beatNum = null) => {
    if (!audioContextRef.current || !metronomeEnabled) return;
    
    // Visual flash
    setIsFlashing(true);
    if (beatNum !== null) {
      setCurrentBeat(beatNum);
    } else {
      setCurrentBeat(prev => (prev % 4) + 1);
    }
    setTimeout(() => setIsFlashing(false), 60);
    
    // Audio only if audible is on
    if (!metronomeAudible) return;
    
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = isDownbeat ? 1500 : 1000;
      osc.type = 'sine';
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {}
  }, [metronomeEnabled, metronomeAudible]);

  // ============ PLAYBACK ENGINE ============
  const startPlaybackEngine = useCallback((layersToPlay, duration) => {
    if (!audioContextRef.current || duration <= 0) return;
    
    const engine = engineRef.current;
    const ctx = audioContextRef.current;
    
    // Stop any existing
    stopPlaybackEngine();
    
    engine.isRunning = true;
    engine.loopStartTime = ctx.currentTime;
    
    // Use precise audio scheduling instead of setTimeout
    const scheduleLoop = (startTime) => {
      if (!engine.isRunning) return;
      
      const currentLayers = layersToPlay.filter(l => !l.muted);
      
      currentLayers.forEach(layer => {
        try {
          const source = ctx.createBufferSource();
          const gainNode = ctx.createGain();
          
          source.buffer = layer.buffer;
          gainNode.gain.value = layer.volume;
          
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          // Schedule precisely
          source.start(startTime);
          engine.sources.push(source);
        } catch(e) {}
      });
      
      // Schedule next loop ahead of time for seamless transition
      const nextLoopTime = startTime + duration;
      const scheduleAhead = Math.max(100, duration * 1000 - 50);
      
      engine.nextLoopTimeout = setTimeout(() => {
        if (!engine.isRunning) return;
        // Clean up old sources
        engine.sources = engine.sources.filter(s => {
          try {
            if (ctx.currentTime > s.startTime + duration + 0.1) {
              s.disconnect();
              return false;
            }
          } catch(e) { return false; }
          return true;
        });
        engine.loopStartTime = nextLoopTime;
        scheduleLoop(nextLoopTime);
      }, scheduleAhead);
    };
    
    scheduleLoop(ctx.currentTime);
    
    // Metronome while playing
    if (metronomeWhilePlaying && metronomeEnabled) {
      const beatDuration = 60000 / bpm;
      let beatCount = 0;
      playClick(true, 1); // First beat
      engine.metronomeInterval = setInterval(() => {
        beatCount++;
        const beatInBar = (beatCount % 4) + 1;
        playClick(beatInBar === 1, beatInBar);
      }, beatDuration);
    }
    
    // Progress animation
    const updateProgress = () => {
      if (!engine.isRunning || !audioContextRef.current) return;
      const elapsed = audioContextRef.current.currentTime - engine.loopStartTime;
      setCurrentTime(elapsed % duration);
      engine.animationFrame = requestAnimationFrame(updateProgress);
    };
    updateProgress();
    
  }, [bpm, metronomeEnabled, metronomeWhilePlaying, playClick]);

  const stopPlaybackEngine = useCallback(() => {
    const engine = engineRef.current;
    
    if (engine.nextLoopTimeout) clearTimeout(engine.nextLoopTimeout);
    if (engine.animationFrame) cancelAnimationFrame(engine.animationFrame);
    if (engine.metronomeInterval) clearInterval(engine.metronomeInterval);
    
    // Fade out sources quickly for natural stop
    engine.sources.forEach(s => {
      try { 
        s.stop(audioContextRef.current?.currentTime + 0.02); 
        s.disconnect(); 
      } catch(e) {}
    });
    
    engine.sources = [];
    engine.isRunning = false;
    engine.nextLoopTimeout = null;
    engine.animationFrame = null;
    engine.metronomeInterval = null;
  }, []);

  // ============ RECORDING ============
  const startRecording = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current) return;
    
    const recorder = recorderRef.current;
    chunksRef.current = [];
    
    try {
      const mr = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mr.onstop = async () => {
        if (chunksRef.current.length === 0) return;
        
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          chunksRef.current = [];
          
          if (!audioContextRef.current) return;
          
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          
          // Quantize to nearest beat for smooth looping
          const beatDuration = 60 / bpm;
          const rawDuration = audioBuffer.duration;
          const beatsInLoop = Math.round(rawDuration / beatDuration);
          const quantizedDuration = Math.max(beatDuration, beatsInLoop * beatDuration);
          
          // Create a new buffer with quantized duration (pad or trim)
          const ctx = audioContextRef.current;
          const quantizedBuffer = ctx.createBuffer(
            audioBuffer.numberOfChannels,
            Math.round(quantizedDuration * ctx.sampleRate),
            ctx.sampleRate
          );
          
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const destData = quantizedBuffer.getChannelData(channel);
            const copyLength = Math.min(sourceData.length, destData.length);
            destData.set(sourceData.subarray(0, copyLength));
          }
          
          const newLayer = {
            id: Date.now(),
            buffer: quantizedBuffer,
            volume: 1,
            muted: false,
            color: `hsl(${(layers.length * 50 + 200) % 360}, 65%, 55%)`
          };
          
          // Save to undo stack
          undoStackRef.current.push([...layers]);
          if (undoStackRef.current.length > 10) undoStackRef.current.shift();
          
          // First layer sets the loop duration
          if (layers.length === 0) {
            setLoopDuration(quantizedDuration);
            setLayers([newLayer]);
            // Start playback
            setTimeout(() => {
              startPlaybackEngine([newLayer], quantizedDuration);
              setLooperState(LOOPER_STATE.PLAYING);
            }, 50);
          } else {
            setLayers(prev => {
              const updated = [...prev, newLayer];
              // Restart playback with new layers
              setTimeout(() => {
                startPlaybackEngine(updated, loopDuration);
              }, 50);
              return updated;
            });
            setLooperState(LOOPER_STATE.PLAYING);
          }
        } catch (err) {
          console.error('Error processing recording:', err);
          setLooperState(layers.length > 0 ? LOOPER_STATE.PLAYING : LOOPER_STATE.EMPTY);
        }
      };
      
      mediaRecorderRef.current = mr;
      mr.start(100);
      recorder.isRecording = true;
      recorder.startTime = performance.now();
      
      // Progress animation for recording
      const updateRecordProgress = () => {
        if (!recorder.isRecording) return;
        const elapsed = (performance.now() - recorder.startTime) / 1000;
        setCurrentTime(loopDuration > 0 ? elapsed % loopDuration : elapsed);
        recorder.animationFrame = requestAnimationFrame(updateRecordProgress);
      };
      updateRecordProgress();
      
      // Metronome during recording
      if (metronomeEnabled) {
        const beatDuration = 60000 / bpm;
        let beatCount = 0;
        playClick(true, 1); // First beat immediately
        recorderRef.current.metronomeInterval = setInterval(() => {
          beatCount++;
          const beatInBar = (beatCount % 4) + 1;
          playClick(beatInBar === 1, beatInBar);
        }, beatDuration);
      }
      
    } catch (err) {
      console.error('Recording start error:', err);
    }
  }, [layers, loopDuration, bpm, metronomeEnabled, playClick, startPlaybackEngine]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    
    if (recorder.animationFrame) cancelAnimationFrame(recorder.animationFrame);
    if (recorder.metronomeInterval) clearInterval(recorder.metronomeInterval);
    if (recorder.countdownInterval) clearInterval(recorder.countdownInterval);
    
    recorder.animationFrame = null;
    recorder.metronomeInterval = null;
    recorder.countdownInterval = null;
    recorder.isRecording = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch(e) {}
    }
  }, []);

  // ============ COUNT-IN ============
  const startCountIn = useCallback(async () => {
    const initialized = await initAudio();
    if (!initialized) return;
    
    // If no count-in, start recording immediately
    if (countInBeats === 0) {
      setLooperState(LOOPER_STATE.RECORDING);
      startRecording();
      return;
    }
    
    setLooperState(LOOPER_STATE.COUNTDOWN);
    
    const beatDuration = 60000 / bpm;
    let beatIndex = 0;
    const totalBeats = countInBeats;
    
    // First beat immediately
    setCountdown(totalBeats - beatIndex);
    playClick(true, 1);
    beatIndex++;
    
    recorderRef.current.countdownInterval = setInterval(() => {
      if (beatIndex >= totalBeats) {
        clearInterval(recorderRef.current.countdownInterval);
        recorderRef.current.countdownInterval = null;
        setCountdown(0);
        setCurrentBeat(0);
        setLooperState(LOOPER_STATE.RECORDING);
        startRecording();
      } else {
        const beatInBar = (beatIndex % 4) + 1;
        setCountdown(totalBeats - beatIndex);
        playClick(beatInBar === 1, beatInBar);
        beatIndex++;
      }
    }, beatDuration);
    
  }, [bpm, countInBeats, initAudio, playClick, startRecording]);

  // ============ MAIN BUTTON HANDLER ============
  const handleMainButton = useCallback(() => {
    // Double-tap detection for undo
    const now = Date.now();
    if (now - lastTapRef.current < 300 && layers.length > 0) {
      // Double tap - undo
      if (undoStackRef.current.length > 0) {
        const previousLayers = undoStackRef.current.pop();
        setLayers(previousLayers);
        if (previousLayers.length > 0) {
          startPlaybackEngine(previousLayers, loopDuration);
        } else {
          stopPlaybackEngine();
          setLooperState(LOOPER_STATE.EMPTY);
          setLoopDuration(0);
        }
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    
    switch (looperState) {
      case LOOPER_STATE.EMPTY:
        // Start count-in then record
        startCountIn();
        break;
        
      case LOOPER_STATE.COUNTDOWN:
        // Cancel countdown
        if (recorderRef.current.countdownInterval) {
          clearInterval(recorderRef.current.countdownInterval);
        }
        setCountdown(0);
        setLooperState(LOOPER_STATE.EMPTY);
        break;
        
      case LOOPER_STATE.RECORDING:
        // Stop recording, start playback
        stopRecording();
        break;
        
      case LOOPER_STATE.PLAYING:
        // Start overdubbing at next beat boundary for seamless sync
        setLooperState(LOOPER_STATE.OVERDUBBING);
        const beatDuration = 60 / bpm;
        const currentPos = currentTime % loopDuration;
        const currentBeatPos = currentPos % beatDuration;
        const timeToNextBeat = beatDuration - currentBeatPos;
        
        // If very close to beat (< 50ms), start immediately, otherwise wait for next beat
        if (timeToNextBeat < 0.05 || currentBeatPos < 0.05) {
          startRecording();
        } else {
          setTimeout(() => {
            if (looperState === LOOPER_STATE.OVERDUBBING) {
              startRecording();
            }
          }, timeToNextBeat * 1000);
        }
        break;
        
      case LOOPER_STATE.OVERDUBBING:
        // Stop overdub at next beat boundary, keep playing
        const beatDur = 60 / bpm;
        const currPos = currentTime % loopDuration;
        const currBeatPos = currPos % beatDur;
        const toNextBeat = beatDur - currBeatPos;
        
        if (toNextBeat < 0.05 || currBeatPos < 0.05) {
          stopRecording();
        } else {
          setTimeout(() => {
            stopRecording();
          }, toNextBeat * 1000);
        }
        break;
        
      default:
        break;
    }
  }, [looperState, layers, loopDuration, startCountIn, stopRecording, startRecording, startPlaybackEngine, stopPlaybackEngine]);

  // ============ STOP BUTTON (Long press or separate) ============
  const handleStop = useCallback(() => {
    stopPlaybackEngine();
    stopRecording();
    setLooperState(layers.length > 0 ? LOOPER_STATE.PLAYING : LOOPER_STATE.EMPTY);
    setCurrentTime(0);
    setCurrentBeat(0);
    
    // Actually stop = go to empty/paused
    if (looperState === LOOPER_STATE.PLAYING || looperState === LOOPER_STATE.OVERDUBBING) {
      setLooperState(LOOPER_STATE.EMPTY);
    }
  }, [layers, looperState, stopPlaybackEngine, stopRecording]);

  // ============ HARD RESET ============
  const hardReset = useCallback(() => {
    stopPlaybackEngine();
    stopRecording();
    
    if (inputMonitorRef.current) cancelAnimationFrame(inputMonitorRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; });
      streamRef.current = null;
    }
    
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch(e) {}
      analyserRef.current = null;
    }
    
    if (inputSourceRef.current) {
      try { inputSourceRef.current.disconnect(); } catch(e) {}
      inputSourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    
    chunksRef.current = [];
    undoStackRef.current = [];
    
    setLooperState(LOOPER_STATE.EMPTY);
    setLayers([]);
    setCurrentTime(0);
    setLoopDuration(0);
    setCountdown(0);
    setCurrentBeat(0);
    setInputLevel(0);
    setIsInitialized(false);
    setError(null);
  }, [stopPlaybackEngine, stopRecording]);

  // ============ LAYER CONTROLS ============
  const toggleMute = (id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, muted: !l.muted } : l));
  };

  const updateVolume = (id, volume) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, volume } : l));
  };

  const deleteLayer = (id) => {
    undoStackRef.current.push([...layers]);
    setLayers(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (updated.length === 0) {
        stopPlaybackEngine();
        setLooperState(LOOPER_STATE.EMPTY);
        setLoopDuration(0);
      }
      return updated;
    });
  };

  // ============ CLEANUP ============
  useEffect(() => {
    return () => hardReset();
  }, [hardReset]);

  // ============ DERIVED STATE ============
  const progress = loopDuration > 0 ? (currentTime / loopDuration) * 100 : 0;
  
  const getStateColor = () => {
    switch (looperState) {
      case LOOPER_STATE.RECORDING: return 'text-red-500';
      case LOOPER_STATE.OVERDUBBING: return 'text-orange-500';
      case LOOPER_STATE.PLAYING: return 'text-green-500';
      case LOOPER_STATE.COUNTDOWN: return 'text-yellow-500';
      default: return 'text-white/50';
    }
  };
  
  const getStateLabel = () => {
    switch (looperState) {
      case LOOPER_STATE.RECORDING: return 'RECORDING';
      case LOOPER_STATE.OVERDUBBING: return 'OVERDUBBING';
      case LOOPER_STATE.PLAYING: return 'PLAYING';
      case LOOPER_STATE.COUNTDOWN: return 'COUNT IN';
      default: return 'READY';
    }
  };
  
  const getRingColor = () => {
    switch (looperState) {
      case LOOPER_STATE.RECORDING: return '#ef4444';
      case LOOPER_STATE.OVERDUBBING: return '#f97316';
      case LOOPER_STATE.PLAYING: return '#22c55e';
      case LOOPER_STATE.COUNTDOWN: return '#eab308';
      default: return '#6b7280';
    }
  };

  return (
    <div className="fixed inset-0 md:relative md:min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-50 md:z-auto overflow-auto">
      {/* Mobile Exit Button */}
      <Link
        to={createPageUrl('StudentPractice')}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
      >
        <X className="w-5 h-5" />
      </Link>
      
      <div className="max-w-lg mx-auto p-4 md:p-8 pt-16 md:pt-8">
        {/* Header - Desktop only */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <Link to={createPageUrl('StudentPractice')}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={hardReset}
            className="text-white/50 hover:text-white hover:bg-red-500/20 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Mobile Reset Button */}
        <div className="md:hidden flex justify-end mb-4">
          <Button
            variant="ghost"
            onClick={hardReset}
            className="text-white/50 hover:text-white hover:bg-red-500/20 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Main Card - Apple Style */}
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
          <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
            
            {/* Status */}
            <div className="pt-8 pb-4 px-8 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${
                looperState === LOOPER_STATE.RECORDING ? 'bg-red-500/20' :
                looperState === LOOPER_STATE.OVERDUBBING ? 'bg-orange-500/20' :
                looperState === LOOPER_STATE.PLAYING ? 'bg-green-500/20' :
                looperState === LOOPER_STATE.COUNTDOWN ? 'bg-yellow-500/20' :
                'bg-white/5'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  looperState === LOOPER_STATE.RECORDING ? 'bg-red-500 animate-pulse' :
                  looperState === LOOPER_STATE.OVERDUBBING ? 'bg-orange-500 animate-pulse' :
                  looperState === LOOPER_STATE.PLAYING ? 'bg-green-500' :
                  looperState === LOOPER_STATE.COUNTDOWN ? 'bg-yellow-500 animate-pulse' :
                  'bg-white/30'
                }`} />
                <span className={`text-sm font-medium uppercase tracking-wider ${getStateColor()}`}>
                  {getStateLabel()}
                </span>
              </div>
            </div>

            {/* Ring Display */}
            <div className="flex justify-center pb-6">
              <div className="relative w-52 h-52">
                {/* Flash overlay */}
                <div className={`absolute inset-4 rounded-full transition-opacity duration-50 ${
                  isFlashing ? 'opacity-100' : 'opacity-0'
                } ${currentBeat === 1 ? 'bg-rose-500/30' : 'bg-white/10'}`} />
                
                {/* Ring */}
                <svg className="w-full h-full -rotate-90 relative z-10">
                  <circle
                    cx="104" cy="104" r="90"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="104" cy="104" r="90"
                    fill="none"
                    stroke={getRingColor()}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 5.65} 565`}
                    style={{ 
                      transition: 'stroke-dasharray 0.1s linear',
                      filter: `drop-shadow(0 0 8px ${getRingColor()})`
                    }}
                  />
                </svg>
                
                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  {countdown > 0 ? (
                    <span className={`text-7xl font-extralight ${isFlashing ? 'text-rose-400 scale-110' : 'text-white'} transition-transform`}>
                      {countdown}
                    </span>
                  ) : (
                    <>
                      {/* Beat dots */}
                      <div className="flex gap-2 mb-2">
                        {[1, 2, 3, 4].map(beat => (
                          <div 
                            key={beat}
                            className={`w-3 h-3 rounded-full transition-all duration-50 ${
                              currentBeat === beat 
                                ? beat === 1 ? 'bg-rose-400 scale-125 shadow-lg shadow-rose-400/50' : 'bg-white scale-110'
                                : 'bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      
                      <span className="text-5xl font-extralight text-white tracking-tight">
                        {currentTime.toFixed(1)}
                      </span>
                      <span className="text-sm text-white/40 mt-1">
                        {loopDuration > 0 ? `/ ${loopDuration.toFixed(1)}s` : 'seconds'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Input Level */}
            <div className="px-10 pb-6">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-50 ${
                    inputLevel > 80 ? 'bg-red-500' : inputLevel > 50 ? 'bg-yellow-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'
                  }`}
                  style={{ width: `${inputLevel}%` }}
                />
              </div>
            </div>

            {/* Main Controls */}
            <div className="px-8 pb-8 flex items-center justify-center gap-6">
              {/* Undo */}
              <button
                onClick={() => {
                  if (undoStackRef.current.length > 0) {
                    const prev = undoStackRef.current.pop();
                    setLayers(prev);
                    if (prev.length === 0) {
                      stopPlaybackEngine();
                      setLooperState(LOOPER_STATE.EMPTY);
                      setLoopDuration(0);
                    }
                  }
                }}
                disabled={undoStackRef.current.length === 0}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
              >
                <Undo2 className="w-6 h-6 text-white/70" />
              </button>
              
              {/* Main Button */}
              <button
                onClick={handleMainButton}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  looperState === LOOPER_STATE.RECORDING 
                    ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-xl shadow-red-500/40' 
                    : looperState === LOOPER_STATE.OVERDUBBING
                      ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl shadow-orange-500/40'
                      : looperState === LOOPER_STATE.PLAYING
                        ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/40'
                        : looperState === LOOPER_STATE.COUNTDOWN
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-500/40'
                          : 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-xl shadow-rose-500/30'
                }`}
              >
                {looperState === LOOPER_STATE.RECORDING || looperState === LOOPER_STATE.OVERDUBBING ? (
                  <Square className="w-10 h-10 text-white" fill="white" />
                ) : looperState === LOOPER_STATE.PLAYING ? (
                  <Layers className="w-10 h-10 text-white" />
                ) : (
                  <Circle className="w-12 h-12 text-white" fill="white" />
                )}
              </button>
              
              {/* Stop */}
              <button
                onClick={handleStop}
                disabled={looperState === LOOPER_STATE.EMPTY}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
              >
                <Square className="w-6 h-6 text-white/70" fill="currentColor" />
              </button>
            </div>
            
            {/* Hint */}
            <div className="pb-6 text-center">
              <span className="text-xs text-white/30">
                {looperState === LOOPER_STATE.EMPTY && 'Tap to record'}
                {looperState === LOOPER_STATE.COUNTDOWN && 'Recording starts after count'}
                {looperState === LOOPER_STATE.RECORDING && 'Tap to set loop & play'}
                {looperState === LOOPER_STATE.PLAYING && 'Tap to overdub'}
                {looperState === LOOPER_STATE.OVERDUBBING && 'Tap to stop overdub'}
              </span>
            </div>

            {/* Settings Section */}
            <div className="bg-black/30 px-6 py-6 space-y-4">
              {/* BPM & Count-In */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">BPM</label>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
                    <button 
                      onClick={() => setBpm(b => Math.max(40, b - 5))} 
                      disabled={layers.length > 0}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center disabled:opacity-30"
                    >-</button>
                    <span className="flex-1 text-center text-xl font-bold text-white">{bpm}</span>
                    <button 
                      onClick={() => setBpm(b => Math.min(200, b + 5))} 
                      disabled={layers.length > 0}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center disabled:opacity-30"
                    >+</button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Count-In</label>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
                    <button 
                      onClick={() => setCountInBeats(c => Math.max(0, c - 1))} 
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
                    >-</button>
                    <span className="flex-1 text-center text-xl font-bold text-white">{countInBeats}</span>
                    <button 
                      onClick={() => setCountInBeats(c => Math.min(8, c + 1))} 
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              </div>
              
              {/* Metronome Options */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    metronomeEnabled ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${metronomeEnabled ? 'bg-white' : 'bg-white/30'}`} />
                  Click
                </button>
                
                <button
                  onClick={() => setMetronomeAudible(!metronomeAudible)}
                  disabled={!metronomeEnabled}
                  className={`p-2 rounded-xl transition-all disabled:opacity-30 ${
                    metronomeAudible ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'
                  }`}
                >
                  <Headphones className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setMetronomeWhilePlaying(!metronomeWhilePlaying)}
                  disabled={!metronomeEnabled}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all disabled:opacity-30 ${
                    metronomeWhilePlaying ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  While Playing
                </button>
              </div>

              {/* Layers */}
              {layers.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-3">
                    <Layers className="w-4 h-4" />
                    <span>Layers ({layers.length})</span>
                  </div>
                  
                  <div className="space-y-2">
                    {layers.map((layer, index) => (
                      <div 
                        key={layer.id}
                        className="bg-white/5 rounded-xl p-3 flex items-center gap-3"
                      >
                        <div 
                          className="w-1.5 h-8 rounded-full"
                          style={{ backgroundColor: layer.color }}
                        />
                        
                        <div className="flex-1">
                          <div className="text-white text-xs font-medium mb-1.5">Layer {index + 1}</div>
                          <Slider
                            value={[layer.volume]}
                            onValueChange={([v]) => updateVolume(layer.id, v)}
                            min={0} max={1} step={0.01}
                            className="w-full [&_[role=slider]]:w-3 [&_[role=slider]]:h-3"
                          />
                        </div>
                        
                        <button
                          onClick={() => toggleMute(layer.id)}
                          className={`p-1.5 rounded-lg transition-colors ${layer.muted ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white/60'}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteLayer(layer.id)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}