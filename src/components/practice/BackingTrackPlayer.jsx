import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Repeat, X, Gauge, ZoomIn, ZoomOut, Move, ChevronDown, ChevronUp, SkipBack, SkipForward } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Slider } from '@/components/ui/slider';

// Transport Button Component
const TransportButton = ({ onClick, disabled, children, primary = false, active = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${
      primary 
        ? 'w-16 h-16 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
        : active
          ? 'w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
          : 'w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);

export default function BackingTrackPlayer({
  youtubeUrl,
  title = 'Backing Track',
  onClose,
  playlist = [],
  currentIndex = 0,
  onTrackChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [draggingMarker, setDraggingMarker] = useState(null);
  const [waveformData, setWaveformData] = useState([]);

  const [videoZoom, setVideoZoom] = useState(1);
  const [videoPanEnabled, setVideoPanEnabled] = useState(false);
  const [videoPan, setVideoPan] = useState({ x: 0, y: 0 });
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const videoDragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Track navigation
  const hasPrevious = playlist.length > 0 && currentIndex > 0;
  const hasNext = playlist.length > 0 && currentIndex < playlist.length - 1;

  const goToPreviousTrack = () => {
    if (hasPrevious && onTrackChange) {
      onTrackChange(currentIndex - 1);
    }
  };

  const goToNextTrack = () => {
    if (hasNext && onTrackChange) {
      onTrackChange(currentIndex + 1);
    }
  };


  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  // Extract video ID from URL
  const getVideoId = useCallback((url) => {
    if (!url) return null;
    
    // Handle short links
    const shortMatch = url.match(/youtu\.be\/([^"&?\/\s]{11})/);
    if (shortMatch) return shortMatch[1];
    
    // Handle full links
    const longMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/);
    if (longMatch) return longMatch[1];
    
    // Handle direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    
    return null;
  }, []);

  const videoId = getVideoId(youtubeUrl);

  // Load video player API
  useEffect(() => {
    if (!videoId) {
      setError('Invalid video URL');
      return;
    }

    const loadPlayerAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      if (!document.getElementById('video-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'video-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    };

    loadPlayerAPI();

    return () => {
      stopTimeTracking();
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [videoId]);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !videoId) return;

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (e) {}
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        playsinline: 1,
        iv_load_policy: 3,
        cc_load_policy: 0,
        origin: window.location.origin,
        autohide: 1,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange,
        onError: handleError,
      },
    });
  }, [videoId]);

  const handlePlayerReady = (event) => {
    const dur = event.target.getDuration();
    setDuration(dur);
    setLoopEnd(dur);
    setPlayerReady(true);
    setError(null);
    
    // Generate fake waveform data for visualization
    const samples = 100;
    const waveform = [];
    for (let i = 0; i < samples; i++) {
      // Create a realistic-looking waveform pattern
      const base = 0.3 + Math.random() * 0.4;
      const variation = Math.sin(i * 0.3) * 0.15 + Math.sin(i * 0.7) * 0.1;
      waveform.push(Math.min(1, Math.max(0.1, base + variation)));
    }
    setWaveformData(waveform);
  };

  const handleStateChange = (event) => {
    const state = event.data;
    
    if (state === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startTimeTracking();
    } else if (state === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      stopTimeTracking();
    } else if (state === window.YT.PlayerState.ENDED) {
      playerRef.current.seekTo(isLooping ? loopStart : 0);
      if (isLooping) {
        playerRef.current.playVideo();
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
        stopTimeTracking();
      }
    }
  };

  const handleError = (event) => {
    const errorCodes = {
      2: 'Invalid video ID',
      5: 'Player error',
      100: 'Video not found',
      101: 'Video cannot be embedded',
      150: 'Video cannot be embedded',
    };
    setError(errorCodes[event.data] || 'Playback error');
  };

  const startTimeTracking = useCallback(() => {
    stopTimeTracking();
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 50);
  }, []);
  
  // Separate effect to handle looping logic with current state values
  useEffect(() => {
    if (isPlaying && isLooping && currentTime >= loopEnd - 0.1) {
      playerRef.current?.seekTo(loopStart, true);
    }
  }, [currentTime, isPlaying, isLooping, loopStart, loopEnd]);

  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Transport Controls
  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const seek = (seconds) => {
    if (!playerRef.current || !playerReady) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const handleSpeedChange = (value) => {
    const speed = value[0];
    setPlaybackRate(speed);
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(speed);
    }
  };



  const handleWaveformClick = (e) => {
    if (!playerRef.current || !playerReady || draggingMarker) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleMarkerDrag = (e, type) => {
    e.stopPropagation();
    setDraggingMarker(type);
  };

  const handleWaveformMove = (e) => {
    if (!draggingMarker || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    const newTime = percent * duration;
    
    if (draggingMarker === 'start') {
      setLoopStart(Math.min(newTime, loopEnd - 1));
    } else {
      setLoopEnd(Math.max(newTime, loopStart + 1));
    }
  };

  const handleWaveformUp = () => {
    setDraggingMarker(null);
  };

  useEffect(() => {
    if (draggingMarker) {
      const handleMouseUp = () => setDraggingMarker(null);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [draggingMarker]);

  // Video pan drag handling
  useEffect(() => {
    if (!isDraggingVideo) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - videoDragStartRef.current.x;
      const dy = e.clientY - videoDragStartRef.current.y;
      setVideoPan({
        x: videoDragStartRef.current.panX + dx,
        y: videoDragStartRef.current.panY + dy
      });
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const dx = touch.clientX - videoDragStartRef.current.x;
      const dy = touch.clientY - videoDragStartRef.current.y;
      setVideoPan({
        x: videoDragStartRef.current.panX + dx,
        y: videoDragStartRef.current.panY + dy
      });
    };

    const handleEnd = () => setIsDraggingVideo(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingVideo]);

  // Format time display
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50 select-none touch-manipulation" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm border-b border-white/10 safe-area-top" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex-1" />
        <h1 className="text-lg font-semibold text-white text-center truncate max-w-[60%]">
          {title}
        </h1>
        <div className="flex-1 flex justify-end">
          {onClose ? (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <Link
              to={createPageUrl('StudentPractice')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div 
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden select-none"
      >
        {/* Video Player Container */}
        <div 
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ pointerEvents: 'none' }}
        >
          <div 
            style={{ 
              position: 'absolute',
              top: '-60px',
              left: 0,
              width: '100%',
              height: 'calc(100% + 120px)',
              pointerEvents: 'none',
              transform: `scale(${videoZoom}) translate(${videoPan.x / videoZoom}px, ${videoPan.y / videoZoom}px)`,
              transformOrigin: 'center center',
            }}
          >
            <div 
              ref={containerRef} 
              style={{ 
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Blocking Overlay - completely blocks all interactions, allows drag when pan enabled */}
        <div 
          className="absolute inset-0 z-20"
          style={{ 
            background: 'transparent',
            cursor: videoPanEnabled ? (isDraggingVideo ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseDown={(e) => {
            if (!videoPanEnabled) return;
            setIsDraggingVideo(true);
            videoDragStartRef.current = { x: e.clientX, y: e.clientY, panX: videoPan.x, panY: videoPan.y };
          }}
          onTouchStart={(e) => {
            if (!videoPanEnabled) return;
            const touch = e.touches[0];
            setIsDraggingVideo(true);
            videoDragStartRef.current = { x: touch.clientX, y: touch.clientY, panX: videoPan.x, panY: videoPan.y };
          }}
        />

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white/80 text-lg mb-2">Unable to load video</p>
              <p className="text-white/50 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!playerReady && !error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Logo Overlay - shown when paused/not playing */}
        {playerReady && !isPlaying && (
          <div 
            className="absolute inset-0 z-30 flex items-center justify-center pt-20 bg-black/60 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="relative">
              {/* Pulsing glow rings */}
              <div className="absolute inset-0 w-44 h-44 rounded-full bg-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 w-44 h-44 rounded-full bg-purple-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              
              {/* Rotating border */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-spin" style={{ animationDuration: '4s' }} />
              
              {/* Logo */}
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691c576097028ab2df3b3f2d/60e42b72d_IMG_1251.PNG" 
                alt="VPR Logo" 
                className="relative w-44 h-44 rounded-full object-cover shadow-2xl shadow-cyan-500/50 hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transport Panel */}
      <div className={`bg-gray-900/95 backdrop-blur-xl border-t border-white/10 flex flex-col transition-all duration-300 ${isPanelMinimized ? '' : 'max-h-[55vh]'}`} style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {/* Main Controls Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Minimized Bar - Always visible */}
          <div className={`flex items-center gap-1.5 px-3 ${isPanelMinimized ? 'py-2' : 'hidden'}`}>
            {/* Show/Hide Button */}
            <button
              onClick={() => setIsPanelMinimized(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
              title="Show panel"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Previous Track */}
            <button
              onClick={goToPreviousTrack}
              disabled={!hasPrevious}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous track"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Seek Back */}
            <button
              onClick={() => seek(-4)}
              disabled={!playerReady}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              className="w-12 h-10 rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center justify-center text-white transition-all disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Seek Forward */}
            <button
              onClick={() => seek(4)}
              disabled={!playerReady}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-40"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Next Track */}
            <button
              onClick={goToNextTrack}
              disabled={!hasNext}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next track"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Time */}
            <span className="text-xs text-white/50 font-mono ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Loop Indicator */}
            {isLooping && (
              <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg">LOOP</span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Track Info */}
            {playlist.length > 1 && (
              <span className="text-[10px] text-white/40 font-mono">
                {currentIndex + 1} / {playlist.length}
              </span>
            )}
          </div>

          {/* Full Panel Content */}
          <div className={`${isPanelMinimized ? 'hidden' : 'block'} pb-2`}>
            {/* Waveform with Loop Markers */}
          <div 
            className="h-12 mx-3 mt-3 rounded-xl bg-black/50 relative cursor-pointer overflow-hidden select-none touch-manipulation"
            onClick={handleWaveformClick}
            onMouseMove={handleWaveformMove}
            onMouseUp={handleWaveformUp}
            onTouchMove={(e) => {
              if (!draggingMarker) return;
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
              const percent = x / rect.width;
              const newTime = percent * duration;
              if (draggingMarker === 'start') {
                setLoopStart(Math.min(newTime, loopEnd - 1));
              } else {
                setLoopEnd(Math.max(newTime, loopStart + 1));
              }
            }}
          >
            {/* Waveform Bars */}
            <div className="absolute inset-0 flex items-center justify-around px-1">
              {waveformData.map((value, i) => {
                const barPosition = i / waveformData.length;
                const barTime = barPosition * duration;
                const isInLoop = isLooping && barTime >= loopStart && barTime <= loopEnd;
                const isPast = barTime <= currentTime;
                
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${value * 80}%`,
                      backgroundColor: isInLoop 
                        ? (isPast ? '#22d3ee' : 'rgba(34, 211, 238, 0.4)')
                        : (isPast ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'),
                    }}
                  />
                );
              })}
            </div>

            {/* Loop Region Overlay */}
            <div
              className={`absolute top-0 bottom-0 transition-colors ${isLooping ? 'bg-amber-500/15' : 'bg-white/5'}`}
              style={{
                left: `${(loopStart / duration) * 100}%`,
                width: `${((loopEnd - loopStart) / duration) * 100}%`,
              }}
            />

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/50"
              style={{ left: `${progress}%` }}
            />

            {/* Loop Markers */}
            <div
              className={`absolute top-0 bottom-0 w-2 cursor-ew-resize z-20 ${draggingMarker === 'start' ? 'bg-amber-300' : 'bg-amber-500'}`}
              style={{ left: `calc(${(loopStart / duration) * 100}% - 4px)` }}
              onMouseDown={(e) => handleMarkerDrag(e, 'start')}
              onTouchStart={(e) => handleMarkerDrag(e, 'start')}
            >
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg ${draggingMarker === 'start' ? 'bg-amber-300 scale-125' : 'bg-amber-500'} transition-transform`} />
            </div>
            <div
              className={`absolute top-0 bottom-0 w-2 cursor-ew-resize z-20 ${draggingMarker === 'end' ? 'bg-amber-300' : 'bg-amber-500'}`}
              style={{ left: `calc(${(loopEnd / duration) * 100}% - 4px)` }}
              onMouseDown={(e) => handleMarkerDrag(e, 'end')}
              onTouchStart={(e) => handleMarkerDrag(e, 'end')}
            >
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg ${draggingMarker === 'end' ? 'bg-amber-300 scale-125' : 'bg-amber-500'} transition-transform`} />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-[10px] text-white/50 font-mono px-3 mt-1">
            <span>{formatTime(currentTime)}</span>
            {isLooping && (
              <span className="text-amber-400">
                {formatTime(loopStart)} → {formatTime(loopEnd)}
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>

          {/* Speed + Volume Row */}
          <div className="mx-3 mt-2 flex items-center gap-2">
            <Gauge className="w-3 h-3 text-white/50 flex-shrink-0" />
            <div className="flex-1 relative h-6 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
              <Slider
                value={[playbackRate]}
                onValueChange={handleSpeedChange}
                min={0.25}
                max={1.5}
                step={0.05}
                className="absolute inset-0 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-800 [&_[role=slider]]:shadow-lg [&_[role=slider]]:w-6 [&_[role=slider]]:h-6 [&_.relative]:bg-transparent [&_[data-orientation=horizontal]>.absolute]:bg-transparent"
              />
            </div>
            <span className={`text-xs font-mono w-10 text-right font-bold flex-shrink-0 ${
              playbackRate < 0.6 ? 'text-red-400' : playbackRate < 0.9 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {playbackRate.toFixed(2)}x
            </span>
          </div>

          {/* Transport Controls - Compact */}
          <div className="flex items-center justify-center gap-2 px-3 py-2">
            {/* Hide Panel Button */}
            <button
              onClick={() => setIsPanelMinimized(true)}
              className="w-9 h-9 rounded-xl bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all border border-white/10"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={goToPreviousTrack}
              disabled={!hasPrevious}
              className="w-9 h-9 rounded-xl bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all border border-white/10 disabled:opacity-30"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(-4)}
              disabled={!playerReady}
              className="w-9 h-9 rounded-xl bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all border border-white/10 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!playerReady}
              className="w-14 h-14 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              onClick={() => seek(4)}
              disabled={!playerReady}
              className="w-9 h-9 rounded-xl bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all border border-white/10 disabled:opacity-40"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button 
              onClick={toggleLoop} 
              disabled={!playerReady}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border disabled:opacity-40 ${
                isLooping ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/70 active:bg-white/20'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Next Track */}
            <button
              onClick={goToNextTrack}
              disabled={!hasNext}
              className="w-9 h-9 rounded-xl bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all border border-white/10 disabled:opacity-30"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Video Zoom Row */}
          <div className="flex items-center justify-center gap-2 px-3 pb-2">
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setVideoZoom(z => Math.max(0.5, z - 0.25))}
                className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-white/50 font-mono w-9 text-center">{(videoZoom * 100).toFixed(0)}%</span>
              <button
                onClick={() => setVideoZoom(z => Math.min(2, z + 0.25))}
                className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/20 flex items-center justify-center text-white/70 transition-all"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVideoPanEnabled(p => !p)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  videoPanEnabled 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                    : 'bg-white/5 active:bg-white/20 text-white/70'
                }`}
              >
                <Move className="w-4 h-4" />
              </button>
            </div>

            {/* Track Counter */}
            {playlist.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[10px] text-white/50 font-mono">
                  {currentIndex + 1} / {playlist.length}
                </span>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}