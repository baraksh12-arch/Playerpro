/**
 * AnalysisEngine - Shared real-time audio analysis service
 * Provides pitch detection, FFT spectrum, note segmentation, and rolling buffer
 */

const A4_FREQ = 440;
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PARTIAL_NAMES = ['Root', '8ve', 'P5+8ve', '2×8ve', 'M3+2×8ve', 'P5+2×8ve', 'm7+2×8ve', '3×8ve'];

// Convert frequency to note info
export function frequencyToNote(freq) {
  if (!freq || freq < 20) return { note: '--', octave: 0, cents: 0, midiNumber: 0 };
  const noteNum = 12 * Math.log2(freq / A4_FREQ);
  const midiNumber = Math.round(noteNum) + 69;
  const noteIndex = ((midiNumber % 12) + 12) % 12;
  const note = NOTES[noteIndex];
  const octave = Math.floor(midiNumber / 12) - 1;
  const cents = Math.round((noteNum - Math.round(noteNum)) * 100);
  return { note, octave, cents, midiNumber };
}

// Note to frequency
export function noteToFrequency(note, octave) {
  const noteIndex = NOTES.indexOf(note.replace('♯', '#').replace('♭', 'b'));
  if (noteIndex === -1) return 0;
  const midiNumber = (octave + 1) * 12 + noteIndex;
  return A4_FREQ * Math.pow(2, (midiNumber - 69) / 12);
}

// YIN pitch detection algorithm
function yinPitchDetection(buffer, sampleRate) {
  const bufferSize = buffer.length;
  const yinBuffer = new Float32Array(bufferSize / 2);
  const threshold = 0.15;
  
  // Step 1: Compute difference function
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBuffer.length; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }
  
  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }
  
  // Step 3: Absolute threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < yinBuffer.length; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }
  
  if (tauEstimate === -1) return { freq: -1, confidence: 0 };
  
  // Step 4: Parabolic interpolation
  let betterTau;
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
  const x2 = tauEstimate + 1 < yinBuffer.length ? tauEstimate + 1 : tauEstimate;
  
  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }
  
  const confidence = 1 - yinBuffer[tauEstimate];
  return { freq: sampleRate / betterTau, confidence: Math.max(0, Math.min(1, confidence)) };
}

// Autocorrelation pitch detection (backup)
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return { freq: -1, rms, confidence: 0 };

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.15;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  const buf = buffer.slice(r1, r2);
  if (buf.length < 10) return { freq: -1, rms, confidence: 0 };
  
  const c = new Array(buf.length).fill(0);
  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < buf.length - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (d < c.length - 1 && c[d] > c[d + 1]) d++;
  
  let maxval = -1, maxpos = -1;
  for (let i = d; i < buf.length; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  if (maxpos < 1 || maxpos >= buf.length - 1) return { freq: -1, rms, confidence: 0 };

  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const confidence = maxval / c[0];
  return { freq: sampleRate / T0, rms, confidence: Math.max(0, Math.min(1, confidence)) };
}

// Apply Hann window
function applyHannWindow(buffer) {
  const windowed = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (buffer.length - 1)));
    windowed[i] = buffer[i] * multiplier;
  }
  return windowed;
}

// Calculate RMS
function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

// Calculate harmonics from spectrum
function calculateHarmonics(freqData, sampleRate, fftSize, fundamental, numPartials = 16) {
  if (fundamental <= 0) return [];
  
  const binWidth = sampleRate / fftSize;
  const harmonics = [];
  
  for (let i = 1; i <= numPartials; i++) {
    const harmonicFreq = fundamental * i;
    const binIndex = Math.round(harmonicFreq / binWidth);
    
    if (binIndex >= 0 && binIndex < freqData.length) {
      // Get energy around the harmonic with some tolerance
      let energy = 0;
      const searchWidth = Math.max(2, Math.round(i * 0.5));
      for (let j = Math.max(0, binIndex - searchWidth); j <= Math.min(freqData.length - 1, binIndex + searchWidth); j++) {
        energy = Math.max(energy, freqData[j]);
      }
      
      // Calculate cents offset from equal temperament
      const etFreq = fundamental * i;
      const actualFreq = binIndex * binWidth;
      const centsOffset = 1200 * Math.log2(actualFreq / etFreq);
      
      harmonics.push({
        partial: i,
        frequency: harmonicFreq,
        energy: energy / 255, // Normalize 0-1
        centsOffset: isFinite(centsOffset) ? Math.round(centsOffset) : 0,
        name: PARTIAL_NAMES[i - 1] || `P${i}`
      });
    }
  }
  
  return harmonics;
}

// AnalysisEngine class
class AnalysisEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.isRunning = false;
    this.subscribers = new Set();
    this.animationId = null;
    
    // Buffers
    this.timeBuffer = null;
    this.freqBuffer = null;
    this.waveformBuffer = null;
    
    // Rolling buffer for 60 seconds of history
    this.historyBuffer = [];
    this.maxHistoryDuration = 60000; // 60 seconds
    this.noteEvents = [];
    this.maxNoteEvents = 100;
    
    // Audio recording buffer for loop playback
    this.audioRecordBuffer = [];
    this.maxAudioBufferDuration = 60; // seconds
    this.scriptProcessor = null;
    
    // State
    this.currentPitch = { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0 };
    this.smoothedPitch = { freq: 0, note: '--', octave: 0, cents: 0 };
    this.rms = 0;
    this.isSilent = true;
    
    // Note segmentation state
    this.currentNoteStart = null;
    this.lastNoteInfo = null;
    this.silenceThreshold = 0.015;
    this.noteStabilityCount = 0;
    this.requiredStabilityFrames = 8;
    
    // Configuration
    this.config = {
      fftSize: 4096,
      smoothingTimeConstant: 0.3,
      pitchSmoothing: 0.15,
      noiseGate: 'auto',
      sensitivityRange: 'medium', // wide, medium, fine, ultrafine
    };
    
    // Performance tracking
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fps = 0;
  }
  
  async start() {
    if (this.isRunning) return;
    
    try {
      // Get microphone with optimal settings
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        }
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000
      });
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      
      // Create buffers
      this.timeBuffer = new Float32Array(this.analyser.fftSize);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformBuffer = new Float32Array(2048);
      
      // Connect microphone
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);
      
      // Setup audio recording for loop playback
      this.setupAudioRecording(source);
      
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.analyze();
      
    } catch (error) {
      console.error('AnalysisEngine start error:', error);
      throw error;
    }
  }
  
  setupAudioRecording(source) {
    // Use ScriptProcessor for recording (AudioWorklet would be better but more complex)
    const bufferSize = 4096;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRunning) return;
      
      const inputBuffer = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(inputBuffer.length);
      copy.set(inputBuffer);
      
      this.audioRecordBuffer.push({
        data: copy,
        time: Date.now()
      });
      
      // Trim to max duration
      const cutoffTime = Date.now() - this.maxAudioBufferDuration * 1000;
      while (this.audioRecordBuffer.length > 0 && this.audioRecordBuffer[0].time < cutoffTime) {
        this.audioRecordBuffer.shift();
      }
    };
    
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.historyBuffer = [];
    this.noteEvents = [];
    this.audioRecordBuffer = [];
  }
  
  setConfig(config) {
    this.config = { ...this.config, ...config };
    
    if (this.analyser && config.fftSize) {
      this.analyser.fftSize = config.fftSize;
      this.timeBuffer = new Float32Array(this.analyser.fftSize);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }
  
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  emit(data) {
    this.subscribers.forEach(callback => callback(data));
  }
  
  analyze() {
    if (!this.isRunning || !this.analyser) return;
    
    // Get time and frequency data
    this.analyser.getFloatTimeDomainData(this.timeBuffer);
    this.analyser.getByteFrequencyData(this.freqBuffer);
    
    // Get waveform for display
    const waveformAnalyser = this.analyser;
    const tempWaveform = new Float32Array(2048);
    waveformAnalyser.getFloatTimeDomainData(tempWaveform);
    this.waveformBuffer.set(tempWaveform);
    
    // Calculate RMS
    this.rms = calculateRMS(this.timeBuffer);
    
    // Determine silence threshold
    const silenceThreshold = this.config.noiseGate === 'auto' 
      ? Math.max(0.01, this.silenceThreshold * 0.95 + this.rms * 0.05 * 0.3)
      : this.config.noiseGate;
    
    this.isSilent = this.rms < silenceThreshold;
    
    // Pitch detection
    const windowedBuffer = applyHannWindow(this.timeBuffer);
    const yinResult = yinPitchDetection(windowedBuffer, this.audioContext.sampleRate);
    
    let pitchResult;
    if (yinResult.freq > 0 && yinResult.confidence > 0.7) {
      pitchResult = yinResult;
    } else {
      const acResult = autoCorrelate(this.timeBuffer, this.audioContext.sampleRate);
      pitchResult = acResult.freq > 0 ? { freq: acResult.freq, confidence: acResult.confidence } : { freq: 0, confidence: 0 };
    }
    
    // Update current pitch
    if (pitchResult.freq > 60 && pitchResult.freq < 4000 && !this.isSilent) {
      const noteInfo = frequencyToNote(pitchResult.freq);
      this.currentPitch = {
        freq: pitchResult.freq,
        note: noteInfo.note,
        octave: noteInfo.octave,
        cents: noteInfo.cents,
        confidence: pitchResult.confidence,
        midiNumber: noteInfo.midiNumber
      };
      
      // Smooth pitch for display
      const smoothing = this.config.pitchSmoothing;
      this.smoothedPitch = {
        freq: this.smoothedPitch.freq * smoothing + pitchResult.freq * (1 - smoothing),
        note: noteInfo.note,
        octave: noteInfo.octave,
        cents: Math.round(this.smoothedPitch.cents * smoothing + noteInfo.cents * (1 - smoothing))
      };
      
      // Note segmentation
      this.processNoteSegmentation();
    } else {
      this.currentPitch = { freq: 0, note: '--', octave: 0, cents: 0, confidence: 0, midiNumber: 0 };
      
      // End current note if silent
      if (this.currentNoteStart && this.isSilent) {
        this.endCurrentNote();
      }
    }
    
    // Calculate harmonics
    const harmonics = this.currentPitch.freq > 0 
      ? calculateHarmonics(this.freqBuffer, this.audioContext.sampleRate, this.analyser.fftSize, this.currentPitch.freq)
      : [];
    
    // Add to history buffer
    const now = Date.now();
    const historyEntry = {
      time: now,
      freq: this.currentPitch.freq,
      note: this.currentPitch.note,
      octave: this.currentPitch.octave,
      cents: this.currentPitch.cents,
      confidence: this.currentPitch.confidence,
      rms: this.rms,
      isSilent: this.isSilent
    };
    
    this.historyBuffer.push(historyEntry);
    
    // Trim history to max duration
    const cutoffTime = now - this.maxHistoryDuration;
    while (this.historyBuffer.length > 0 && this.historyBuffer[0].time < cutoffTime) {
      this.historyBuffer.shift();
    }
    
    // Calculate FPS
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    // Emit frame data
    this.emit({
      type: 'frame',
      pitch: this.currentPitch,
      smoothedPitch: this.smoothedPitch,
      rms: this.rms,
      isSilent: this.isSilent,
      waveform: this.waveformBuffer,
      spectrum: this.freqBuffer,
      harmonics,
      history: this.historyBuffer,
      noteEvents: this.noteEvents,
      sampleRate: this.audioContext.sampleRate,
      fftSize: this.analyser.fftSize,
      fps: this.fps
    });
    
    this.animationId = requestAnimationFrame(() => this.analyze());
  }
  
  processNoteSegmentation() {
    const currentNote = `${this.currentPitch.note}${this.currentPitch.octave}`;
    const lastNote = this.lastNoteInfo ? `${this.lastNoteInfo.note}${this.lastNoteInfo.octave}` : null;
    
    if (currentNote === lastNote && this.currentPitch.confidence > 0.7) {
      this.noteStabilityCount++;
      
      if (this.noteStabilityCount >= this.requiredStabilityFrames && !this.currentNoteStart) {
        // Start new note
        this.currentNoteStart = {
          time: Date.now(),
          note: this.currentPitch.note,
          octave: this.currentPitch.octave,
          freq: this.currentPitch.freq,
          cents: this.currentPitch.cents
        };
      }
    } else {
      // Note changed
      if (this.currentNoteStart) {
        this.endCurrentNote();
      }
      this.noteStabilityCount = 0;
    }
    
    this.lastNoteInfo = { ...this.currentPitch };
  }
  
  endCurrentNote() {
    if (!this.currentNoteStart) return;
    
    const noteEvent = {
      id: Date.now(),
      startTime: this.currentNoteStart.time,
      endTime: Date.now(),
      duration: Date.now() - this.currentNoteStart.time,
      note: this.currentNoteStart.note,
      octave: this.currentNoteStart.octave,
      freq: this.currentNoteStart.freq,
      cents: this.currentNoteStart.cents
    };
    
    // Calculate interval from previous note
    if (this.noteEvents.length > 0) {
      const prevNote = this.noteEvents[this.noteEvents.length - 1];
      const prevMidi = frequencyToNote(prevNote.freq).midiNumber;
      const currMidi = frequencyToNote(noteEvent.freq).midiNumber;
      noteEvent.intervalSemitones = currMidi - prevMidi;
      noteEvent.intervalDirection = noteEvent.intervalSemitones > 0 ? 'up' : noteEvent.intervalSemitones < 0 ? 'down' : 'same';
    }
    
    this.noteEvents.push(noteEvent);
    
    // Trim to max events
    while (this.noteEvents.length > this.maxNoteEvents) {
      this.noteEvents.shift();
    }
    
    // Emit note event
    this.emit({
      type: 'noteEvent',
      event: noteEvent
    });
    
    this.currentNoteStart = null;
  }
  
  // Get audio buffer for loop playback (startTime, endTime in ms)
  getLoopAudioBuffer(startTime, endTime) {
    const relevantBuffers = this.audioRecordBuffer.filter(
      b => b.time >= startTime && b.time <= endTime
    );
    
    if (relevantBuffers.length === 0) return null;
    
    // Concatenate buffers
    const totalLength = relevantBuffers.reduce((sum, b) => sum + b.data.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    for (const buffer of relevantBuffers) {
      result.set(buffer.data, offset);
      offset += buffer.data.length;
    }
    
    return {
      data: result,
      sampleRate: this.audioContext?.sampleRate || 48000,
      duration: (endTime - startTime) / 1000
    };
  }
  
  // Play loop
  playLoop(startTime, endTime) {
    const loopBuffer = this.getLoopAudioBuffer(startTime, endTime);
    if (!loopBuffer || !this.audioContext) return null;
    
    const audioBuffer = this.audioContext.createBuffer(1, loopBuffer.data.length, loopBuffer.sampleRate);
    audioBuffer.getChannelData(0).set(loopBuffer.data);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
    
    return source;
  }
  
  // Export loop as WAV file
  async exportLoop(startTime, endTime) {
    const loopBuffer = this.getLoopAudioBuffer(startTime, endTime);
    if (!loopBuffer) return null;
    
    // Create WAV file
    const wavBuffer = createWavFile(loopBuffer.data, loopBuffer.sampleRate);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    
    return blob;
  }
  
  // Clear note events
  clearNoteEvents() {
    this.noteEvents = [];
    this.emit({ type: 'noteEventsCleared' });
  }
  
  // Get intonation thresholds based on sensitivity
  getIntonationThresholds() {
    const ranges = {
      wide: { green: 15, orange: 30 },
      medium: { green: 10, orange: 20 },
      fine: { green: 5, orange: 12 },
      ultrafine: { green: 3, orange: 7 }
    };
    return ranges[this.config.sensitivityRange] || ranges.medium;
  }
  
  // Get intonation color based on cents
  getIntonationColor(cents) {
    const thresholds = this.getIntonationThresholds();
    const absCents = Math.abs(cents);
    
    if (absCents <= thresholds.green) return 'green';
    if (absCents <= thresholds.orange) return 'orange';
    return 'red';
  }
}

// WAV file creation helper
function createWavFile(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  // Write samples
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, sample * 0x7FFF, true);
  }
  
  return buffer;
}

// Singleton instance
let engineInstance = null;

export function getAnalysisEngine() {
  if (!engineInstance) {
    engineInstance = new AnalysisEngine();
  }
  return engineInstance;
}

export function destroyAnalysisEngine() {
  if (engineInstance) {
    engineInstance.stop();
    engineInstance = null;
  }
}

export { AnalysisEngine };