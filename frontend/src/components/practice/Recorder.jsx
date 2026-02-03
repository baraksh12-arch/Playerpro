import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, Square, Play, Pause, Trash2, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function Recorder({ studentId }) {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Fetch recordings
  const { data: recordings = [] } = useQuery({
    queryKey: ['studentRecordings', studentId],
    queryFn: () => base44.entities.Recording.filter({ student_id: studentId }, '-created_date'),
    enabled: !!studentId,
  });

  const saveRecordingMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Recording.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentRecordings'] });
      setShowSaveDialog(false);
      setRecordingTitle('');
      setAudioURL(null);
      setAudioBlob(null);
      setWaveformData([]);
    },
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Recording.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentRecordings'] });
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Draw waveform - using ref to avoid stale closure
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      // Use ref instead of state to avoid stale closure
      if (!isRecordingRef.current) return;
      
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      
      // Store waveform data - calculate peak amplitude
      const peak = Math.max(...dataArray);
      const min = Math.min(...dataArray);
      const amplitude = (peak - min) / 255;
      setWaveformData(prev => [...prev.slice(-100), amplitude]);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background glow
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
      gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.05)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw center line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    
    draw();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      streamRef.current = stream;
      
      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      setRecordingTime(0);
      setWaveformData([]);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      // Start waveform animation after a small delay to ensure canvas is ready
      setTimeout(() => {
        drawWaveform();
      }, 50);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !recordingTitle.trim()) return;

    setUploading(true);
    try {
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await saveRecordingMutation.mutateAsync({
        student_id: studentId,
        title: recordingTitle,
        url: file_url,
        duration_seconds: recordingTime,
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDiscard = () => {
    setAudioURL(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setRecordingTitle('');
    setWaveformData([]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playRecording = (recording) => {
    if (playingId === recording.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = recording.url;
        audioRef.current.play();
        setPlayingId(recording.id);
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        onTimeUpdate={(e) => setCurrentPlayTime(e.target.currentTime)}
      />
      
      {/* Main Card - Apple Style */}
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-1 shadow-2xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/95 rounded-[2.3rem] backdrop-blur-xl overflow-hidden">
          
          {/* Recording Display */}
          <div className="pt-10 pb-6 px-8 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
            
            {/* Status Indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-400 uppercase tracking-wider">Recording</span>
              </div>
            )}
            
            {/* Time Display */}
            <div className="text-[5rem] font-extralight text-white tracking-tight leading-none mb-2">
              {formatTime(recordingTime)}
            </div>
            
            {/* Waveform Visualization */}
            <div className="h-24 relative mt-6 mb-4">
              {isRecording ? (
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={96}
                  className="w-full h-full"
                />
              ) : waveformData.length > 0 ? (
                <div className="flex items-center justify-center gap-[2px] h-full px-4">
                  {waveformData.slice(-60).map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-red-500 to-red-400 rounded-full transition-all"
                      style={{ height: `${Math.max(4, val * 80)}px` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-[2px] h-full px-4">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white/10 rounded-full"
                      style={{ height: '4px' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audio Playback */}
          {audioURL && !isRecording && (
            <div className="px-8 pb-4">
              <audio src={audioURL} controls className="w-full h-12 rounded-xl" />
            </div>
          )}

          {/* Controls */}
          <div className="px-8 pb-8 flex justify-center gap-6">
            {!isRecording && !audioURL && (
              <button
                onClick={startRecording}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-red-500/30"
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="w-24 h-24 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 active:scale-95"
              >
                <Square className="w-10 h-10 text-white" fill="white" />
              </button>
            )}

            {audioURL && !isRecording && (
              <>
                <button
                  onClick={handleDiscard}
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
                >
                  <RotateCcw className="w-7 h-7 text-white/70" />
                </button>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-green-500/30"
                >
                  <Check className="w-10 h-10 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Recording History */}
          {recordings.length > 0 && (
            <div className="bg-black/30 px-6 py-6">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
                Recording History
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <button
                      onClick={() => playRecording(recording)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        playingId === recording.id
                          ? 'bg-red-500 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {playingId === recording.id ? (
                        <Pause className="w-4 h-4" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {recording.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{formatTime(recording.duration_seconds || 0)}</span>
                        <span>•</span>
                        <span>{format(new Date(recording.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteRecordingMutation.mutate(recording.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {recordings.length === 0 && !isRecording && !audioURL && (
            <div className="bg-black/30 px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Mic className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-sm text-white/40">
                Tap the button to start recording
              </p>
              <p className="text-xs text-white/20 mt-1">
                Your recordings will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Save Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Recording Name</label>
              <Input
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="e.g., Scale Practice"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Duration</span>
              <span className="text-white font-medium">{formatTime(recordingTime)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSaveDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!recordingTitle.trim() || uploading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {uploading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}