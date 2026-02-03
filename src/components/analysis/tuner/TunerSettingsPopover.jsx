import React from 'react';
import { 
  Settings2, Music, Sliders, Target, Volume2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import { 
  SENSITIVITY_PRESETS, 
  TRANSPOSITIONS, 
  CALIBRATION_RANGE,
  NOTES 
} from './TunerConstants';

export default function TunerSettingsPopover({
  // Calibration
  a4Frequency,
  setA4Frequency,
  // Transposition
  transposition,
  setTransposition,
  customTransposeSemitones,
  setCustomTransposeSemitones,
  // Sensitivity
  sensitivityPreset,
  setSensitivityPreset,
  // Display mode
  tunerMode,
  setTunerMode,
  // Reference tone
  referenceToneEnabled,
  setReferenceToneEnabled,
  // Success feedback
  hapticEnabled,
  setHapticEnabled,
  soundEnabled,
  setSoundEnabled,
  // Note display
  preferFlats,
  setPreferFlats
}) {
  const currentPreset = SENSITIVITY_PRESETS[sensitivityPreset];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <Settings2 className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end" 
        className="w-80 bg-gray-900/95 backdrop-blur-xl border-white/10 text-white p-4"
      >
        <div className="space-y-5">
          {/* Tuner Mode */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-medium flex items-center gap-2">
              <Target className="w-3 h-3" />
              Tuner Display
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['target', 'bar'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTunerMode(mode)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    tunerMode === mode
                      ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {mode === 'target' ? 'Target' : 'Bar'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Calibration */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-medium flex items-center gap-2">
              <Music className="w-3 h-3" />
              A4 Reference (440Hz standard)
            </label>
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setA4Frequency(Math.max(CALIBRATION_RANGE.min, a4Frequency - 1))}
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white/70 font-medium"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-mono text-white">{a4Frequency}</span>
                <span className="text-xs text-white/40 ml-1">Hz</span>
              </div>
              <button
                onClick={() => setA4Frequency(Math.min(CALIBRATION_RANGE.max, a4Frequency + 1))}
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white/70 font-medium"
              >
                +
              </button>
            </div>
            <Slider
              value={[a4Frequency]}
              onValueChange={(v) => setA4Frequency(v[0])}
              min={CALIBRATION_RANGE.min}
              max={CALIBRATION_RANGE.max}
              step={1}
              className="mt-2"
            />
          </div>
          
          {/* Transposition */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-medium flex items-center gap-2">
              <Sliders className="w-3 h-3" />
              Transposition
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {TRANSPOSITIONS.slice(0, -1).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTransposition(t.id)}
                  className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                    transposition === t.id
                      ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t.id === 'concert' ? 'C' : t.id.toUpperCase()}
                </button>
              ))}
            </div>
            {transposition === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-white/50">Semitones:</span>
                <button
                  onClick={() => setCustomTransposeSemitones(customTransposeSemitones - 1)}
                  className="w-6 h-6 rounded bg-white/10 text-xs"
                >
                  -
                </button>
                <span className="text-sm font-mono w-8 text-center">
                  {customTransposeSemitones > 0 ? '+' : ''}{customTransposeSemitones}
                </span>
                <button
                  onClick={() => setCustomTransposeSemitones(customTransposeSemitones + 1)}
                  className="w-6 h-6 rounded bg-white/10 text-xs"
                >
                  +
                </button>
              </div>
            )}
          </div>
          
          {/* Sensitivity */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Sensitivity
            </label>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {Object.entries(SENSITIVITY_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setSensitivityPreset(key)}
                  className={`py-1.5 px-1 rounded text-[10px] font-medium transition-all ${
                    sensitivityPreset === key
                      ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {preset.name.slice(0, 4)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              In-tune: ±{currentPreset?.inTuneThreshold}¢ • Warning: ±{currentPreset?.warningThreshold}¢
            </p>
          </div>
          
          {/* Feedback Options */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/60 flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                Reference Tone
              </label>
              <Switch 
                checked={referenceToneEnabled} 
                onCheckedChange={setReferenceToneEnabled}
                className="scale-75"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/60">
                Success Sound
              </label>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={setSoundEnabled}
                className="scale-75"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/60">
                Prefer Flats (♭)
              </label>
              <Switch 
                checked={preferFlats} 
                onCheckedChange={setPreferFlats}
                className="scale-75"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}