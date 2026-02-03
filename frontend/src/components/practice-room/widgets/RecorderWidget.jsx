import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function RecorderWidget() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to record');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(recordingTime);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const deleteRecording = () => {
    setAudioURL(null);
    setDuration(0);
    setRecordingTime(0);
  };

  const downloadRecording = () => {
    if (audioURL) {
      const a = document.createElement('a');
      a.href = audioURL;
      a.download = `recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Status */}
      <div className="text-center">
        {isRecording ? (
          <>
            <div className="text-6xl font-black text-white mb-2">
              {formatTime(recordingTime)}
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-white/60 text-sm">
                {isPaused ? 'Paused' : 'Recording...'}
              </span>
            </div>
          </>
        ) : audioURL ? (
          <>
            <div className="text-6xl font-black text-white mb-2">
              {formatTime(duration)}
            </div>
            <div className="text-white/60 text-sm">Recording saved</div>
          </>
        ) : (
          <>
            <div className="text-6xl font-black text-white/40 mb-2">--:--</div>
            <div className="text-white/60 text-sm">Ready to record</div>
          </>
        )}
      </div>

      {/* Waveform Visualization */}
      <div className="h-24 bg-white/10 rounded-lg flex items-center justify-center">
        {isRecording && !isPaused ? (
          <div className="flex items-center gap-1 h-full px-4">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full transition-all duration-150"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animation: 'pulse 0.5s ease-in-out infinite',
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        ) : audioURL ? (
          <audio src={audioURL} controls className="w-full px-4" />
        ) : (
          <div className="text-white/40 text-sm">Audio waveform will appear here</div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-4">
        {!isRecording && !audioURL && (
          <Button
            onClick={startRecording}
            size="lg"
            className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-2xl"
          >
            <Mic className="w-12 h-12" />
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              onClick={pauseRecording}
              size="lg"
              variant="outline"
              className="w-20 h-20 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isPaused ? <Play className="w-10 h-10" /> : <Pause className="w-10 h-10" />}
            </Button>
            <Button
              onClick={stopRecording}
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl"
            >
              <Square className="w-10 h-10" />
            </Button>
          </>
        )}

        {audioURL && (
          <>
            <Button
              onClick={deleteRecording}
              size="lg"
              variant="outline"
              className="w-20 h-20 rounded-full bg-white/10 border-white/20 text-white hover:bg-red-500/30"
            >
              <Trash2 className="w-10 h-10" />
            </Button>
            <Button
              onClick={downloadRecording}
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-2xl"
            >
              <Download className="w-10 h-10" />
            </Button>
            <Button
              onClick={startRecording}
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-2xl"
            >
              <Mic className="w-10 h-10" />
            </Button>
          </>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center text-sm text-white/60">
        {isRecording ? (
          isPaused ? '⏸️ Recording paused' : '🔴 Recording in progress...'
        ) : audioURL ? (
          '✓ Recording ready to download or delete'
        ) : (
          '🎤 Click the microphone to start'
        )}
      </div>

      {/* Tips */}
      {!isRecording && !audioURL && (
        <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
          <div className="font-semibold mb-2">Tips:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Find a quiet place for best quality</li>
            <li>Keep phone close but not too close</li>
            <li>Pause anytime if you need a break</li>
          </ul>
        </div>
      )}
    </div>
  );
}