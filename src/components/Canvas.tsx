import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

interface CanvasProps {
  onStroke?: () => void;
  color?: string;
  lineWidth?: number;
  isEraser?: boolean;
  showLines?: boolean;
  lineDensity?: number;
}

export interface CanvasHandle {
  clear: () => void;
  getImageData: () => string | null;
  isEmpty: () => boolean;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ 
  onStroke, 
  color = '#1e293b', 
  lineWidth = 3, 
  isEraser = false,
  showLines = true,
  lineDensity = 2.5
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    // Only resize if dimensions actually changed
    if (canvas.width === rect.width * dpr && canvas.height === rect.height * dpr) return;

    // Save current content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    // Set internal resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw back saved content, scaling if necessary
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });

    resizeObserver.observe(container);
    setupCanvas();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasContent(false);
      }
    },
    getImageData: () => {
      return canvasRef.current?.toDataURL('image/png') || null;
    },
    isEmpty: () => !hasContent
  }));

  const startDrawing = (e: React.PointerEvent) => {
    setIsDrawing(true);
    setHasContent(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    onStroke?.();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden border border-slate-200 cursor-crosshair touch-none"
    >
      {/* Paper lines effect */}
      {showLines && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: `100% ${lineDensity}rem`,
            backgroundPosition: '0 2rem'
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
        className="relative z-10 w-full h-full"
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
