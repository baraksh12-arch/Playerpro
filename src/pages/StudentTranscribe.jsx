import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Play, Pause, RotateCcw, Scissors, ZoomIn, ZoomOut, SkipBack, SkipForward, Repeat, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function StudentTranscribe() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // Generate waveform from audio
  const generateWaveform = useCallback(async (arrayBuffer) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const samples = 500;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }
      
      // Normalize
      const max = Math.max(...waveform);
      const normalized = waveform.map(v => v / max);
      setWaveformData(normalized);
    } catch (err) {
      console.error('Error generating waveform:', err);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    // Generate waveform
    const arrayBuffer = await file.arrayBuffer();
    generateWaveform(arrayBuffer.slice(0));
    
    setIsLoaded(false);
    setLoopStart(0);
    setLoopEnd(0);
    setIsLooping(false);
  };

  // Audio loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setLoopEnd(audioRef.current.duration);
      setIsLoaded(true);
    }
  };

  // Time update with loop logic
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    if (isLooping && time >= loopEnd) {
      audioRef.current.currentTime = loopStart;
    }
  };

  // Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (isLooping && currentTime < loopStart) {
        audioRef.current.currentTime = loopStart;
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek
  const handleSeek = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  // Speed control
  const handleSpeedChange = (value) => {
    const speed = value[0];
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Set loop points
  const setLoopPoint = (type) => {
    if (type === 'start') {
      setLoopStart(currentTime);
      if (currentTime >= loopEnd) {
        setLoopEnd(duration);
      }
    } else {
      setLoopEnd(currentTime);
      if (currentTime <= loopStart) {
        setLoopStart(0);
      }
    }
    setIsLooping(true);
  };

  // Reset loop
  const resetLoop = () => {
    setLoopStart(0);
    setLoopEnd(duration);
    setIsLooping(false);
  };

  // Skip forward/back
  const skip = (seconds) => {
    if (!audioRef.current) return;
    let newTime;
    if (seconds < 0 && isLooping) {
      // When rewinding and looping is active, go to loop start (left locator)
      newTime = loopStart;
    } else {
      newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = (width / waveformData.length) * zoom;
    const scrollOffset = (currentTime / duration) * width * (zoom - 1);
    
    waveformData.forEach((value, i) => {
      const x = i * barWidth - scrollOffset;
      const barHeight = value * height * 0.8;
      
      // Color based on position
      const position = i / waveformData.length * duration;
      let color = 'rgba(255, 255, 255, 0.3)';
      
      if (isLooping && position >= loopStart && position <= loopEnd) {
        color = position <= currentTime ? 'rgba(52, 211, 153, 0.8)' : 'rgba(52, 211, 153, 0.4)';
      } else if (position <= currentTime) {
        color = 'rgba(96, 165, 250, 0.8)';
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(x, (height - barHeight) / 2, Math.max(1, barWidth - 1), barHeight);
    });
    
    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 2, height);
    
    // Draw loop markers
    if (isLooping) {
      const startX = (loopStart / duration) * width;
      const endX = (loopEnd / duration) * width;
      
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.fillRect(startX - 2, 0, 4, height);
      ctx.fillRect(endX - 2, 0, 4, height);
      
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }
  }, [waveformData, currentTime, duration, loopStart, loopEnd, isLooping, zoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioUrl]);

  const speedPresets = [0.25, 0.5, 0.75, 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('StudentPractice')}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Transcribe</h1>
            <p className="text-white/50">Loop & slow down any part</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
          {!audioUrl ? (
            /* Upload Area */
            <label className="flex flex-col items-center justify-center p-16 cursor-pointer hover:bg-white/5 transition-colors">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Audio</h3>
              <p className="text-white/50 text-center">Drop a song, solo, or any audio file to practice</p>
            </label>
          ) : (
            <div className="p-6 space-y-6">
              {/* File name */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white truncate">{audioFile?.name}</h3>
                <label className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300">
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  Change
                </label>
              </div>

              {/* Waveform */}
              <div 
                ref={containerRef}
                className="relative h-32 bg-black/30 rounded-2xl overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (!containerRef.current || !isLoaded) return;
                  const rect = containerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  const newTime = percent * duration;
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={128}
                  className="w-full h-full"
                />
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-mono">{formatTime(currentTime)}</span>
                <span className="text-white/70 font-mono">{formatTime(duration)}</span>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(-5)}
                  className="text-white/70 hover:text-white hover:bg-white/10 w-12 h-12"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <button
                  onClick={togglePlay}
                  disabled={!isLoaded}
                  className="w-16 h-16 rounded-full bg-gradient-to-b from-white to-gray-200 flex items-center justify-center shadow-lg shadow-white/20 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-gray-900" />
                  ) : (
                    <Play className="w-7 h-7 text-gray-900 ml-1" />
                  )}
                </button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => skip(5)}
                  className="text-white/70 hover:text-white hover:bg-white/10 w-12 h-12"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Loop Controls */}
              <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className={`w-5 h-5 ${isLooping ? 'text-amber-400' : 'text-white/50'}`} />
                    <span className="text-white font-medium">Loop Section</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLoop}
                    className="text-white/50 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLoopPoint('start')}
                    className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors"
                  >
                    <div className="text-xs opacity-70 mb-1">Loop Start</div>
                    <div className="font-mono font-bold">{formatTime(loopStart)}</div>
                  </button>
                  <button
                    onClick={() => setLoopPoint('end')}
                    className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors"
                  >
                    <div className="text-xs opacity-70 mb-1">Loop End</div>
                    <div className="font-mono font-bold">{formatTime(loopEnd)}</div>
                  </button>
                </div>
                
                {isLooping && (
                  <div className="text-center text-sm text-amber-400/70">
                    Looping {formatTime(loopEnd - loopStart)} section
                  </div>
                )}
              </div>

              {/* Speed Control */}
              <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-cyan-400" />
                  <span className="text-white font-medium">Speed</span>
                  <span className="ml-auto text-2xl font-bold text-cyan-400">{Math.round(playbackRate * 100)}%</span>
                </div>
                
                <Slider
                  value={[playbackRate]}
                  onValueChange={handleSpeedChange}
                  min={0.25}
                  max={1.5}
                  step={0.05}
                  className="py-2"
                />
                
                <div className="flex justify-between gap-2">
                  {speedPresets.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange([speed])}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        playbackRate === speed 
                          ? 'bg-cyan-500 text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {speed * 100}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
}