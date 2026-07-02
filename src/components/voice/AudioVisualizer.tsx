import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils.js';

export type VoiceVisualizerState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

interface AudioVisualizerProps {
  state: VoiceVisualizerState;
  level?: number;
  className?: string;
}

export function AudioVisualizer({ state, level = 0, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.25;

      ctx.clearRect(0, 0, width, height);

      // Background gradient based on state
      let primaryColor = '56, 189, 248'; // lumi-accent
      let secondaryColor = '14, 165, 233';
      let glowIntensity = 0.3;

      if (state === 'recording') {
        primaryColor = '248, 113, 113'; // red
        secondaryColor = '239, 68, 68';
        glowIntensity = 0.5 + level * 0.5;
      } else if (state === 'speaking') {
        primaryColor = '255, 255, 255';
        secondaryColor = '200, 230, 255';
        glowIntensity = 0.4 + level * 0.4;
      } else if (state === 'processing') {
        primaryColor = '167, 139, 250'; // purple
        secondaryColor = '139, 92, 246';
        glowIntensity = 0.5;
      } else if (state === 'error') {
        primaryColor = '248, 113, 113';
        secondaryColor = '239, 68, 68';
        glowIntensity = 0.4;
      }

      // Outer glow ring
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        baseRadius * 1.8
      );
      gradient.addColorStop(0, `rgba(${primaryColor}, 0)`);
      gradient.addColorStop(0.5, `rgba(${primaryColor}, ${glowIntensity * 0.3})`);
      gradient.addColorStop(1, `rgba(${primaryColor}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Concentric rings
      const ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const ringPhase = time * 0.001 + (i * Math.PI) / ringCount;
        const pulse = state === 'idle' ? 1 : 1 + Math.sin(ringPhase) * 0.05;
        const radius = baseRadius * (1 + i * 0.35) * pulse;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryColor}, ${0.2 - i * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Radial bars
      const barCount = 48;
      const activeLevel = state === 'idle' ? 0.1 : level;

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const barPhase = time * 0.002 + i * 0.2;
        const barHeight = baseRadius * (0.15 + activeLevel * 0.4 * (0.5 + 0.5 * Math.sin(barPhase)));

        const x1 = centerX + Math.cos(angle) * baseRadius;
        const y1 = centerY + Math.sin(angle) * baseRadius;
        const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${primaryColor}, ${0.4 + activeLevel * 0.4})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Center orb
      const orbPulse = state === 'processing' ? 1 + Math.sin(time * 0.005) * 0.1 : 1;
      const orbRadius = baseRadius * 0.25 * orbPulse;

      const orbGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        orbRadius
      );
      orbGradient.addColorStop(0, `rgba(${primaryColor}, 0.9)`);
      orbGradient.addColorStop(1, `rgba(${secondaryColor}, 0.4)`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();

      time += 16;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, level]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('h-64 w-64 rounded-full', className)}
      aria-label={`Audio visualizer, current state: ${state}`}
    />
  );
}
