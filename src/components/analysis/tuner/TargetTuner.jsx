import React, { useRef, useEffect, memo } from 'react';

/**
 * Target (circular) tuner visualization
 * Shows concentric rings with a moving indicator for pitch accuracy
 */
const TargetTuner = memo(function TargetTuner({ 
  cents = 0, 
  confidence = 0, 
  isInTune = false,
  inTuneThreshold = 10,
  warningThreshold = 20,
  isSilent = true,
  size = 180 
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const smoothedCentsRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 - 10;
    
    const draw = () => {
      // Smooth cents for display
      const smoothing = isSilent ? 0.3 : 0.15;
      smoothedCentsRef.current = smoothedCentsRef.current * smoothing + cents * (1 - smoothing);
      const displayCents = smoothedCentsRef.current;
      
      ctx.clearRect(0, 0, w, h);
      
      // Draw concentric rings
      const ringCount = 5;
      for (let i = ringCount; i >= 1; i--) {
        const radius = (maxRadius / ringCount) * i;
        const alpha = 0.1 + (i / ringCount) * 0.15;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Draw center "bullseye" zone (green when in tune)
      const inTuneRadius = (inTuneThreshold / 50) * maxRadius;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(8, inTuneRadius), 0, Math.PI * 2);
      ctx.fillStyle = isInTune && !isSilent 
        ? 'rgba(34, 197, 94, 0.4)' 
        : 'rgba(34, 197, 94, 0.15)';
      ctx.fill();
      
      // Draw warning zone
      const warningRadius = (warningThreshold / 50) * maxRadius;
      ctx.beginPath();
      ctx.arc(centerX, centerY, warningRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw center crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw indicator
      if (!isSilent && confidence > 0.3) {
        // Map cents to position (±50 cents = full radius)
        const clampedCents = Math.max(-50, Math.min(50, displayCents));
        const indicatorX = centerX + (clampedCents / 50) * maxRadius;
        const indicatorY = centerY;
        
        // Determine color based on accuracy
        let indicatorColor;
        const absCents = Math.abs(clampedCents);
        if (absCents <= inTuneThreshold) {
          indicatorColor = 'rgb(34, 197, 94)'; // Green
        } else if (absCents <= warningThreshold) {
          indicatorColor = 'rgb(234, 179, 8)'; // Yellow/amber
        } else {
          indicatorColor = 'rgb(239, 68, 68)'; // Red
        }
        
        // Draw trail
        const trailLength = 3;
        for (let i = trailLength; i >= 1; i--) {
          const trailAlpha = 0.1 * (trailLength - i + 1);
          ctx.beginPath();
          ctx.arc(indicatorX - (displayCents > 0 ? 1 : -1) * i * 2, indicatorY, 8 - i, 0, Math.PI * 2);
          ctx.fillStyle = indicatorColor.replace('rgb', 'rgba').replace(')', `, ${trailAlpha})`);
          ctx.fill();
        }
        
        // Draw main indicator
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 10, 0, Math.PI * 2);
        ctx.fillStyle = indicatorColor;
        ctx.fill();
        
        // Inner glow
        const gradient = ctx.createRadialGradient(indicatorX, indicatorY, 0, indicatorX, indicatorY, 10);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 10, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Scale labels
      ctx.font = '10px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('-50¢', 15, centerY + 4);
      ctx.fillText('+50¢', w - 15, centerY + 4);
      ctx.fillText('0', centerX, h - 5);
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cents, confidence, isInTune, inTuneThreshold, warningThreshold, isSilent, size]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="block"
      style={{ width: size, height: size }}
    />
  );
});

export default TargetTuner;