import React, { memo } from 'react';

export default memo(function PremiumReferenceInfo({
  keySignature = 'C',
  a4Frequency = 440,
  transpose = 'C',
  currentFrequency = 0
}) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Key:</span>
        <span className="text-sm text-white/80 font-medium">{keySignature}</span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">A =</span>
        <span className="text-sm text-white/80 font-mono">{a4Frequency.toFixed(1)} Hz</span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Transpose:</span>
        <span className="text-sm text-white/80 font-medium">{transpose}</span>
      </div>
      
      <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-white/10">
        <span className="text-xs text-cyan-400 font-mono">
          {currentFrequency > 0 ? `${currentFrequency.toFixed(1)} Hz` : '—'}
        </span>
      </div>
    </div>
  );
});