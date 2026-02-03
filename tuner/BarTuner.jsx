import React, { useRef, useEffect, memo } from 'react';

/**
 * Bar (horizontal) tuner visualization
 * Shows a linear bar with center "0" and moving indicator
 */
const BarTuner = memo(function BarTuner({ 
  cents = 0, 
  confidence = 0, 
  isInTune = false,
  inTuneThreshold = 10,
  warningThreshold = 20,
  isSilent = true,
  width = 280,
  height = 50
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const smoothedCentsRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    const centerX = width / 2;
    const barY = height / 2;
    const barHeight = 16;
    const barPadding = 30;
    const barWidth = width - barPadding * 2;
    
    const draw = () => {
      // Smooth cents for display
      const smoothing = isSilent ? 0.3 : 0.12;
      smoothedCentsRef.current = smoothedCentsRef.current * smoothing + cents * (1 - smoothing);
      const displayCents = smoothedCentsRef.current;
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw bar background
      ctx.beginPath();
      ctx.roundRect(barPadding, barY - barHeight / 2, barWidth, barHeight, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
      
      // Draw zone markers
      const inTuneWidth = (inTuneThreshold / 50) * (barWidth / 2);
      const warningWidth = (warningThreshold / 50) * (barWidth / 2);
      
      // Green zone (center)
      ctx.beginPath();
      ctx.roundRect(centerX - inTuneWidth, barY - barHeight / 2, inTuneWidth * 2, barHeight, 4);
      ctx.fillStyle = isInTune && !isSilent 
        ? 'rgba(34, 197, 94, 0.4)' 
        : 'rgba(34, 197, 94, 0.15)';
      ctx.fill();
      
      // Warning zone edges
      ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.fillRect(centerX - warningWidth, barY - barHeight / 2, warningWidth - inTuneWidth, barHeight);
      ctx.fillRect(centerX + inTuneWidth, barY - barHeight / 2, warningWidth - inTuneWidth, barHeight);
      
      // Tick marks
      const ticks = [-50, -30, -20, -10, 0, 10, 20, 30, 50];
      ticks.forEach(tick => {
        const x = centerX + (tick / 50) * (barWidth / 2);
        const tickHeight = tick === 0 ? barHeight + 8 : (Math.abs(tick) === 50 ? 10 : 6);
        ctx.beginPath();
        ctx.moveTo(x, barY - tickHeight / 2);
        ctx.lineTo(x, barY + tickHeight / 2);
        ctx.strokeStyle = tick === 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = tick === 0 ? 2 : 1;
        ctx.stroke();
      });
      
      // Draw indicator
      if (!isSilent && confidence > 0.3) {
        const clampedCents = Math.max(-50, Math.min(50, displayCents));
        const indicatorX = centerX + (clampedCents / 50) * (barWidth / 2);
        
        // Determine color
        let indicatorColor;
        const absCents = Math.abs(clampedCents);
        if (absCents <= inTuneThreshold) {
          indicatorColor = 'rgb(34, 197, 94)';
        } else if (absCents <= warningThreshold) {
          indicatorColor = 'rgb(234, 179, 8)';
        } else {
          indicatorColor = 'rgb(239, 68, 68)';
        }
        
        // Draw needle
        ctx.beginPath();
        ctx.moveTo(indicatorX, barY - barHeight / 2 - 6);
        ctx.lineTo(indicatorX - 6, barY - barHeight / 2 - 14);
        ctx.lineTo(indicatorX + 6, barY - barHeight / 2 - 14);
        ctx.closePath();
        ctx.fillStyle = indicatorColor;
        ctx.fill();
        
        // Vertical line through bar
        ctx.beginPath();
        ctx.moveTo(indicatorX, barY - barHeight / 2);
        ctx.lineTo(indicatorX, barY + barHeight / 2);
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Glow effect
        ctx.shadowColor = indicatorColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(indicatorX, barY - barHeight / 2);
        ctx.lineTo(indicatorX, barY + barHeight / 2);
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // Labels
      ctx.font = '9px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('♭', barPadding + 10, height - 4);
      ctx.fillText('♯', width - barPadding - 10, height - 4);
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cents, confidence, isInTune, inTuneThreshold, warningThreshold, isSilent, width, height]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="block"
      style={{ width, height }}
    />
  );
});

export default BarTuner;