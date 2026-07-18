'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, SlidersHorizontal, RefreshCw, Printer, Download, Check, Camera, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PhotoStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  // Photoshop-like Adjustments State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  // Levels Adjustment (Ctrl+L)
  const [levelsShadow, setLevelsShadow] = useState(0);
  const [levelsGamma, setLevelsGamma] = useState(1.0);
  const [levelsHighlight, setLevelsHighlight] = useState(255);
  
  // Color Balance Adjustment (Ctrl+B)
  const [colorBalanceR, setColorBalanceR] = useState(0);
  const [colorBalanceG, setColorBalanceG] = useState(0);
  const [colorBalanceB, setColorBalanceB] = useState(0);
  
  // Curves Adjustment (Ctrl+M)
  const [curvesMidX, setCurvesMidX] = useState(128);
  const [curvesMidY, setCurvesMidY] = useState(128);
  
  // Free Transform (Ctrl+T) Mode
  const [isTransformMode, setIsTransformMode] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'scale';
    initialMouseX: number;
    initialMouseY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
  } | null>(null);

  const [adjustmentTab, setAdjustmentTab] = useState<'basic' | 'levels' | 'color' | 'curves'>('basic');
  
  const [includeNameDate, setIncludeNameDate] = useState(false);
  const [candidateName, setCandidateName] = useState('Rahul Kumar');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0, scale: 1 });
  const [removingBg, setRemovingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  // Keyboard Shortcuts Listener for Photoshop-like shortcuts (Ctrl+T, Ctrl+B, Ctrl+L, Ctrl+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 't') {
          e.preventDefault();
          setIsTransformMode(prev => !prev);
        } else if (key === 'b') {
          e.preventDefault();
          setAdjustmentTab('color');
        } else if (key === 'l') {
          e.preventDefault();
          setAdjustmentTab('levels');
        } else if (key === 'm') {
          e.preventDefault();
          setAdjustmentTab('curves');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Overlay Canvas for rendering transform handles
  useEffect(() => {
    if (!isTransformMode || !overlayCanvasRef.current || !imgObj) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = 413;
    const height = 531;
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Image bounding box
    const x = cropOffset.x;
    const y = cropOffset.y;
    const w = imgObj.width * cropOffset.scale;
    const h = imgObj.height * cropOffset.scale;
    
    // Draw dashed bounding box
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]); // reset
    
    // Draw 8 handles (little blue squares)
    const handleSize = 8;
    const half = handleSize / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    
    const drawHandle = (hx: number, hy: number) => {
      ctx.fillRect(hx - half, hy - half, handleSize, handleSize);
      ctx.strokeRect(hx - half, hy - half, handleSize, handleSize);
    };
    
    // Corners
    drawHandle(x, y); // TL
    drawHandle(x + w, y); // TR
    drawHandle(x, y + h); // BL
    drawHandle(x + w, y + h); // BR
    
    // Sides
    drawHandle(x + w / 2, y); // TM
    drawHandle(x, y + h / 2); // ML
    drawHandle(x + w, y + h / 2); // MR
    drawHandle(x + w / 2, y + h); // BM
    
  }, [cropOffset, isTransformMode, imgObj]);

  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgObj) return;
    const { x: mouseX, y: mouseY } = getCanvasMousePos(e);
    
    const x = cropOffset.x;
    const y = cropOffset.y;
    const w = imgObj.width * cropOffset.scale;
    const h = imgObj.height * cropOffset.scale;
    
    const handleSize = 12; // click target area
    const handles = [
      { id: 'TL', x: x, y: y },
      { id: 'TR', x: x + w, y: y },
      { id: 'BL', x: x, y: y + h },
      { id: 'BR', x: x + w, y: y + h },
      { id: 'TM', x: x + w / 2, y: y },
      { id: 'ML', x: x, y: y + h / 2 },
      { id: 'MR', x: x + w, y: y + h / 2 },
      { id: 'BM', x: x + w / 2, y: y + h }
    ];
    
    let clickedHandle = false;
    for (const handle of handles) {
      if (Math.abs(mouseX - handle.x) < handleSize && Math.abs(mouseY - handle.y) < handleSize) {
        setDragState({
          isDragging: true,
          dragType: 'scale',
          initialMouseX: mouseX,
          initialMouseY: mouseY,
          initialX: x,
          initialY: y,
          initialScale: cropOffset.scale
        });
        clickedHandle = true;
        break;
      }
    }
    
    if (!clickedHandle) {
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        setDragState({
          isDragging: true,
          dragType: 'move',
          initialMouseX: mouseX,
          initialMouseY: mouseY,
          initialX: x,
          initialY: y,
          initialScale: cropOffset.scale
        });
      }
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragState) return; // handled by global window listener
    if (!imgObj || !overlayCanvasRef.current) return;
    
    const { x: mouseX, y: mouseY } = getCanvasMousePos(e);
    const canvas = overlayCanvasRef.current;
    
    const x = cropOffset.x;
    const y = cropOffset.y;
    const w = imgObj.width * cropOffset.scale;
    const h = imgObj.height * cropOffset.scale;
    
    const handleSize = 10;
    const handles = [
      { id: 'TL', x: x, y: y, cursor: 'nwse-resize' },
      { id: 'TR', x: x + w, y: y, cursor: 'nesw-resize' },
      { id: 'BL', x: x, y: y + h, cursor: 'nesw-resize' },
      { id: 'BR', x: x + w, y: y + h, cursor: 'nwse-resize' },
      { id: 'TM', x: x + w / 2, y: y, cursor: 'ns-resize' },
      { id: 'ML', x: x, y: y + h / 2, cursor: 'ew-resize' },
      { id: 'MR', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
      { id: 'BM', x: x + w / 2, y: y + h, cursor: 'ns-resize' }
    ];
    
    let hoverHandle = false;
    for (const handle of handles) {
      if (Math.abs(mouseX - handle.x) < handleSize && Math.abs(mouseY - handle.y) < handleSize) {
        canvas.style.cursor = handle.cursor;
        hoverHandle = true;
        break;
      }
    }
    
    if (!hoverHandle) {
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  // Global mouse event listeners for smooth drag-and-scale even when mouse goes outside canvas/window boundaries
  useEffect(() => {
    if (!dragState || !dragState.isDragging || !overlayCanvasRef.current || !imgObj) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      // Map client window coordinates to internal canvas space (413x531)
      const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      
      const dx = mouseX - dragState.initialMouseX;
      const dy = mouseY - dragState.initialMouseY;
      
      if (dragState.dragType === 'move') {
        setCropOffset(prev => ({
          ...prev,
          x: dragState.initialX + dx,
          y: dragState.initialY + dy
        }));
      } else if (dragState.dragType === 'scale') {
        const centerX = dragState.initialX + (imgObj.width * dragState.initialScale) / 2;
        const centerY = dragState.initialY + (imgObj.height * dragState.initialScale) / 2;
        const initDist = Math.hypot(dragState.initialMouseX - centerX, dragState.initialMouseY - centerY);
        const currDist = Math.hypot(mouseX - centerX, mouseY - centerY);
        
        if (initDist > 0) {
          const newScale = Math.max(0.05, dragState.initialScale * (currDist / initDist));
          const newWidth = imgObj.width * newScale;
          const newHeight = imgObj.height * newScale;
          setCropOffset(prev => ({
            ...prev,
            x: centerX - newWidth / 2,
            y: centerY - newHeight / 2,
            scale: newScale
          }));
        }
      }
    };

    const handleWindowMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, imgObj]);

  const handleCurvesDrag = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const xNorm = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height)); // invert Y
    
    setCurvesMidX(Math.round(xNorm * 255));
    setCurvesMidY(Math.round(yNorm * 255));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      
      // Reset image adjustments for the new upload
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setBgColor('#FFFFFF');
      setIncludeNameDate(false);
      setBgError(null);

      // Reset Photoshop-like states
      setLevelsShadow(0);
      setLevelsGamma(1.0);
      setLevelsHighlight(255);
      setColorBalanceR(0);
      setColorBalanceG(0);
      setColorBalanceB(0);
      setCurvesMidX(128);
      setCurvesMidY(128);
      setIsTransformMode(false);

      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImgObj(img);
        setBgError(null);
        // Base scale to fill the width
        const scaleX = 413 / img.width;
        const scaleY = 531 / img.height;
        const scale = Math.max(scaleX, scaleY);
        setCropOffset({ 
          x: (413 - img.width * scale) / 2, 
          y: 531 - img.height * scale, 
          scale 
        });
      };
    }
  };

  const handleRemoveBackground = async () => {
    if (!imageSrc || !imgObj) return;
    
    setRemovingBg(true);
    setBgError(null);
    
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove background');
      }
      
      const resultBlob = await res.blob();
      const resultUrl = URL.createObjectURL(resultBlob);
      
      const newImg = new Image();
      newImg.src = resultUrl;
      newImg.onload = () => {
        setImgObj(newImg);
        setImageSrc(resultUrl);
        setRemovingBg(false);
        // Auto-center after background removal
        setTimeout(() => handleRegenerate(newImg), 100);
      };
    } catch (err: any) {
      console.error(err);
      setBgError(err.message);
      setRemovingBg(false);
    }
  };

  const handleRegenerate = (customImg?: HTMLImageElement) => {
    const img = customImg || imgObj;
    if (!img || !canvasRef.current) return;
    
    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tCtx) return;
    
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tCtx.drawImage(img, 0, 0);
    
    const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    let minX = tempCanvas.width, minY = tempCanvas.height, maxX = 0, maxY = 0;
    let foundSubject = false;
    
    const rowLeft = new Array(tempCanvas.height).fill(-1);
    const rowRight = new Array(tempCanvas.height).fill(-1);
    const rowWidths = new Array(tempCanvas.height).fill(0);
    const rowCenters = new Array(tempCanvas.height).fill(0);
    
    for (let y = 0; y < tempCanvas.height; y++) {
      let firstX = -1, lastX = -1;
      for (let x = 0; x < tempCanvas.width; x++) {
        const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
        if (alpha > 40) { // filter out semi-transparent edge noise
          if (firstX === -1) firstX = x;
          lastX = x;
          foundSubject = true;
        }
      }
      if (firstX !== -1) {
        rowLeft[y] = firstX;
        rowRight[y] = lastX;
        rowWidths[y] = lastX - firstX;
        rowCenters[y] = firstX + (lastX - firstX) / 2;
        
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (firstX < minX) minX = firstX;
        if (lastX > maxX) maxX = lastX;
      }
    }
    
    const targetCanvasWidth = 413;
    const targetCanvasHeight = 531;
    const stripHeight = includeNameDate ? Math.floor(targetCanvasHeight * 0.15) : 0;
    const availableHeight = targetCanvasHeight - stripHeight;

    if (foundSubject) {
      const totalHeight = maxY - minY;
      
      // Smooth the widths and centers to remove noise and spikes
      const smoothWidths = new Array(tempCanvas.height).fill(0);
      const smoothCenters = new Array(tempCanvas.height).fill(0);
      const windowSize = Math.max(5, Math.floor(totalHeight * 0.02));
      
      for (let y = minY; y <= maxY; y++) {
        let widthSum = 0;
        let centerSum = 0;
        let count = 0;
        for (let i = -windowSize; i <= windowSize; i++) {
          const targetY = y + i;
          if (targetY >= minY && targetY <= maxY && rowWidths[targetY] > 0) {
            widthSum += rowWidths[targetY];
            centerSum += rowCenters[targetY];
            count++;
          }
        }
        smoothWidths[y] = count > 0 ? widthSum / count : rowWidths[y];
        smoothCenters[y] = count > 0 ? centerSum / count : rowCenters[y];
      }
      
      // Locate the head peak (maximum width in the top 45% of the subject)
      const searchLimit = minY + Math.floor(totalHeight * 0.45);
      let maxHeadWidth = 0;
      let yHeadMax = minY;
      for (let y = minY; y <= searchLimit; y++) {
        if (smoothWidths[y] > maxHeadWidth) {
          maxHeadWidth = smoothWidths[y];
          yHeadMax = y;
        }
      }
      
      // Locate the neck by finding the local minimum below the head peak
      let yNeck = -1;
      let minNeckWidth = maxHeadWidth;
      const neckSearchLimit = minY + Math.floor(totalHeight * 0.65);
      for (let y = yHeadMax; y <= neckSearchLimit; y++) {
        if (smoothWidths[y] < minNeckWidth) {
          minNeckWidth = smoothWidths[y];
          yNeck = y;
        } else if (yNeck !== -1 && smoothWidths[y] > minNeckWidth * 1.05) {
          // Width started increasing (shoulders starting)
          break;
        }
      }
      
      // Determine the head height
      let headHeight = 0;
      if (yNeck !== -1 && yNeck > yHeadMax) {
        headHeight = yNeck - minY;
      } else {
        headHeight = maxHeadWidth * 1.25; // fallback ratio
      }
      
      headHeight = Math.max(totalHeight * 0.15, Math.min(headHeight, totalHeight * 0.7));
      
      // Calculate scale based on standard head size in passport photo (45% of canvas height)
      const targetHeadHeight = availableHeight * 0.45;
      let newScale = targetHeadHeight / headHeight;
      
      // Safety limits
      const maxSubjectWidth = maxX - minX;
      if (maxSubjectWidth * newScale > targetCanvasWidth * 1.6) {
        newScale = (targetCanvasWidth * 1.6) / maxSubjectWidth;
      }
      const minScaleX = targetCanvasWidth / maxSubjectWidth;
      const minScaleY = availableHeight / totalHeight;
      newScale = Math.max(newScale, Math.min(minScaleX, minScaleY));
      
      // Center horizontally on the average center of the head region
      let headCenterSum = 0;
      let headCenterCount = 0;
      const headEnd = Math.min(maxY, Math.floor(minY + headHeight));
      for (let y = minY; y <= headEnd; y++) {
        if (smoothCenters[y] > 0) {
          headCenterSum += smoothCenters[y];
          headCenterCount++;
        }
      }
      const headCenterX = headCenterCount > 0 ? headCenterSum / headCenterCount : (minX + maxSubjectWidth / 2);
      const offsetX = (targetCanvasWidth / 2) - (headCenterX * newScale);
      
      // Align top of head at 12% of the canvas height from the top
      const targetHeadTop = availableHeight * 0.12;
      let offsetY = targetHeadTop - (minY * newScale);
      
      // Ensure we fill the available height and don't show blank bottom area
      if (maxY * newScale + offsetY < availableHeight) {
        offsetY = availableHeight - (maxY * newScale);
      }
      
      setCropOffset({ x: offsetX, y: offsetY, scale: newScale });
    } else {
      const scaleX = targetCanvasWidth / img.width;
      const scaleY = availableHeight / img.height;
      const scale = Math.max(scaleX, scaleY);
      setCropOffset({ x: (targetCanvasWidth - img.width * scale) / 2, y: availableHeight - img.height * scale, scale });
    }
  };

  useEffect(() => {
    if (imgObj) {
      handleRegenerate();
    }
  }, [includeNameDate]);

  function updatePrintCanvas() {
    if (!printCanvasRef.current || !canvasRef.current) return;
    const pCtx = printCanvasRef.current.getContext('2d');
    if (!pCtx) return;

    const pWidth = 1800;
    const pHeight = 1200;
    printCanvasRef.current.width = pWidth;
    printCanvasRef.current.height = pHeight;

    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(0, 0, pWidth, pHeight);

    const cols = 4;
    const rows = 2;
    
    // Move rows closer to top/bottom edges (reduce vertical margins)
    // Keep photo size at original 413x531
    // Reduce left/right margins to 0 to maximize horizontal column gap
    const edgeMarginX = 0;
    const edgeMarginY = 40;
    
    const sWidth = 413;
    const sHeight = 531;
    
    // Spacing between column elements
    const gapX = (pWidth - (cols * sWidth) - (2 * edgeMarginX)) / (cols - 1);
    // Spacing between row elements (recalculated with reduced vertical margins)
    const gapY = (pHeight - (rows * sHeight) - (2 * edgeMarginY)) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = edgeMarginX + c * (sWidth + gapX);
        const y = edgeMarginY + r * (sHeight + gapY);
        
        // Draw the photo
        pCtx.drawImage(canvasRef.current, x, y, sWidth, sHeight);
        
        // Draw a thick black border around each photo so it is dark and easy to cut
        pCtx.strokeStyle = '#000000';
        pCtx.lineWidth = 3;
        pCtx.strokeRect(x, y, sWidth, sHeight);
      }
    }
  }

  const [cacheTrigger, setCacheTrigger] = useState(0);

  // Generate Filtered Cache Canvas (Offscreen, only on filter adjustments change)
  useEffect(() => {
    if (!imgObj) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate downscaled dimensions (max 1000px for high performance, keeping 2x resolution of 413x531)
    const maxDimension = 1000;
    const scale = Math.min(1, maxDimension / Math.max(imgObj.width, imgObj.height));
    const width = Math.round(imgObj.width * scale);
    const height = Math.round(imgObj.height * scale);

    canvas.width = width;
    canvas.height = height;

    // Draw raw image with basic CSS adjustments
    ctx.clearRect(0, 0, width, height);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(imgObj, 0, 0, width, height);
    ctx.filter = 'none';

    // Apply custom pixel filters (Levels, Curves, Color Balance)
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Precompute 256-entry lookup tables for each channel (Red, Green, Blue)
      const lutR = new Uint8Array(256);
      const lutG = new Uint8Array(256);
      const lutB = new Uint8Array(256);

      const levelsRange = levelsHighlight - levelsShadow;
      const invGamma = 1.0 / levelsGamma;

      const curvesLUT = new Uint8Array(256);
      if (curvesMidX !== 128 || curvesMidY !== 128) {
        const steps = 512;
        const mapped = new Array(256).fill(-1);
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x_val = Math.round((2 * (1 - t) * t * curvesMidX + t * t * 255));
          const y_val = Math.round((2 * (1 - t) * t * curvesMidY + t * t * 255));
          if (x_val >= 0 && x_val <= 255) {
            mapped[x_val] = Math.max(0, Math.min(255, y_val));
          }
        }
        let lastVal = 0;
        for (let i = 0; i < 256; i++) {
          if (mapped[i] !== -1) {
            curvesLUT[i] = mapped[i];
            lastVal = mapped[i];
          } else {
            curvesLUT[i] = lastVal;
          }
        }
      }

      for (let i = 0; i < 256; i++) {
        let r = i;
        let g = i;
        let b = i;

        // Apply Levels
        if (levelsShadow > 0 || levelsHighlight < 255 || levelsGamma !== 1.0) {
          r = Math.max(0, Math.min(255, Math.pow(Math.max(0, r - levelsShadow) / levelsRange, invGamma) * 255));
          g = Math.max(0, Math.min(255, Math.pow(Math.max(0, g - levelsShadow) / levelsRange, invGamma) * 255));
          b = Math.max(0, Math.min(255, Math.pow(Math.max(0, b - levelsShadow) / levelsRange, invGamma) * 255));
        }

        // Apply Curves
        if (curvesMidX !== 128 || curvesMidY !== 128) {
          r = curvesLUT[r];
          g = curvesLUT[g];
          b = curvesLUT[b];
        }

        // Apply Color Balance
        if (colorBalanceR !== 0 || colorBalanceG !== 0 || colorBalanceB !== 0) {
          r = Math.max(0, Math.min(255, r + colorBalanceR));
          g = Math.max(0, Math.min(255, g + colorBalanceG));
          b = Math.max(0, Math.min(255, b + colorBalanceB));
        }

        lutR[i] = r;
        lutG[i] = g;
        lutB[i] = b;
      }

      for (let i = 0; i < data.length; i += 4) {
        // Optimization: skip calculations for transparent pixels (highly common in cutouts)
        if (data[i+3] === 0) continue;

        data[i] = lutR[data[i]];
        data[i+1] = lutG[data[i+1]];
        data[i+2] = lutB[data[i+2]];
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error("Failed to apply pixel filters in offscreen canvas:", err);
    }

    setCacheTrigger(prev => prev + 1);
  }, [imgObj, brightness, contrast, saturation, levelsShadow, levelsHighlight, levelsGamma, colorBalanceR, colorBalanceG, colorBalanceB, curvesMidX, curvesMidY]);

  // Render composite to screen (GPU accelerated 60fps)
  useEffect(() => {
    if (!canvasRef.current || !imgObj || !offscreenCanvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = 413; 
    const height = 531; 

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    ctx.clearRect(0, 0, width, height);
    
    // FILL BACKGROUND COLOR
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Determine the space available for the face
    let availableHeight = height;
    const stripHeight = Math.floor(height * 0.15); // 15% of height

    if (includeNameDate) {
      availableHeight = height - stripHeight;
    }

    // Drawing the image with crop offset and scale from offscreen canvas
    const offscreenCanvas = offscreenCanvasRef.current;
    const downscaleRatio = offscreenCanvas.width / imgObj.width;
    const targetScale = cropOffset.scale / downscaleRatio;

    const scaledWidth = offscreenCanvas.width * targetScale;
    const scaledHeight = offscreenCanvas.height * targetScale;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, availableHeight);
    ctx.clip();
    
    // Feather edge
    ctx.filter = "blur(0.5px)";
    ctx.drawImage(offscreenCanvas, cropOffset.x, cropOffset.y, scaledWidth, scaledHeight);
    
    ctx.restore(); // Remove clipping
    ctx.filter = 'none';

    // Draw Name and Date Strip if enabled
    if (includeNameDate) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, availableHeight, width, stripHeight);
      
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      ctx.font = 'bold 24px Arial';
      ctx.fillText(candidateName.toUpperCase(), width / 2, availableHeight + 35);
      
      ctx.font = 'bold 20px Arial';
      const formattedDate = new Date(photoDate).toLocaleDateString('en-GB');
      ctx.fillText(`DOP: ${formattedDate}`, width / 2, availableHeight + 65);
    }
    
    // Exact 1px black border for easy cutting on the 4x6 sheet
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1; 
    ctx.strokeRect(0, 0, width, height);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheTrigger, bgColor, includeNameDate, candidateName, photoDate, cropOffset, imgObj]);

  const handlePrint = () => {
    updatePrintCanvas();
    window.print();
  };

  const handleDownload = () => {
    updatePrintCanvas();
    if (!printCanvasRef.current) return;
    printCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Balaji_4x6_Photos_${new Date().getTime()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 1.0);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            visibility: hidden !important;
          }
          #print-canvas-wrapper, #print-canvas-wrapper * {
            visibility: visible !important;
          }
          #print-canvas-wrapper {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 6in !important;
            height: 4in !important;
            page-break-inside: avoid !important;
          }
          canvas#print-canvas {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
          }
          @page {
            size: 6in 4in landscape;
            margin: 0;
          }
        }
      `}} />

      <div className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-(--color-navy) dark:text-white mb-4">
            Pro Passport Photo Tool
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Upload any portrait and our AI logic will auto-frame it to strict 3.5x4.5cm dimensions. 
            Download the high-res JPEG or Print directly to a 4x6 glossy sheet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-(--color-orange)" />
                Upload Portrait Photo
              </label>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleUpload}
                disabled={removingBg}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-(--color-navy) file:text-white hover:file:bg-(--color-navy-light) file:transition-colors file:cursor-pointer bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              />
            </div>

            {imgObj && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-8"
              >
                <button 
                  onClick={handleRemoveBackground}
                  disabled={removingBg}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
                >
                  {removingBg ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 
                      AI is removing background...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" /> One-Click AI Background Removal
                    </>
                  )}
                </button>

                {bgError && (
                  <p className="text-red-500 text-xs font-semibold text-center mt-2">{bgError}</p>
                )}

                <div className="space-y-5 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                  
                  {/* Adjustments Header with Crop Button */}
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold flex items-center text-sm text-slate-800 dark:text-white">
                      <SlidersHorizontal className="w-4 h-4 mr-2 text-(--color-orange)" /> Adjustments
                    </h4>
                    
                    <button
                      type="button"
                      onClick={() => setIsTransformMode(prev => !prev)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center transition-all ${isTransformMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'}`}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1" />
                      {isTransformMode ? 'Exit Crop (Ctrl+T)' : 'Manual Crop (Ctrl+T)'}
                    </button>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700 pb-1 text-[10px] font-bold tracking-tight">
                    {[
                      { id: 'basic', label: 'Basic' },
                      { id: 'levels', label: 'Levels (Ctrl+L)' },
                      { id: 'color', label: 'Balance (Ctrl+B)' },
                      { id: 'curves', label: 'Curves (Ctrl+M)' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAdjustmentTab(tab.id as any)}
                        className={`flex-1 pb-1.5 border-b-2 text-center transition-all ${adjustmentTab === tab.id ? 'border-(--color-orange) text-(--color-orange)' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  {adjustmentTab === 'basic' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Brightness</span> <span className="text-(--color-orange)">{brightness}%</span>
                        </label>
                        <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-(--color-orange)" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Contrast</span> <span className="text-(--color-orange)">{contrast}%</span>
                        </label>
                        <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-(--color-orange)" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Saturation</span> <span className="text-(--color-orange)">{saturation}%</span>
                        </label>
                        <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="w-full accent-(--color-orange)" />
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 block">
                          Background Color
                        </label>
                        <div className="flex items-center gap-2 mb-1">
                          {[
                            { name: 'White', color: '#FFFFFF' },
                            { name: 'Sky Blue', color: '#87CEEB' },
                            { name: 'Light Grey', color: '#D3D3D3' }
                          ].map((preset) => (
                            <button
                              key={preset.color}
                              type="button"
                              onClick={() => setBgColor(preset.color)}
                              className={`w-8 h-8 rounded-full border transition-all ${bgColor === preset.color ? 'border-(--color-orange) scale-110' : 'border-slate-200 dark:border-slate-700 hover:scale-105'}`}
                              style={{ backgroundColor: preset.color }}
                              title={preset.name}
                            />
                          ))}
                          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                          <div className="relative group">
                            <input 
                              type="color" 
                              value={bgColor} 
                              onChange={(e) => setBgColor(e.target.value)}
                              className="w-8 h-8 rounded-full cursor-pointer border border-slate-200 dark:border-slate-700 p-0 overflow-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {adjustmentTab === 'levels' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Input Shadows</span> <span className="text-blue-500 font-bold">{levelsShadow}</span>
                        </label>
                        <input type="range" min="0" max="120" value={levelsShadow} onChange={e => setLevelsShadow(Number(e.target.value))} className="w-full accent-blue-500" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Midtones (Gamma)</span> <span className="text-blue-500 font-bold">{levelsGamma.toFixed(2)}</span>
                        </label>
                        <input type="range" min="0.5" max="2.5" step="0.05" value={levelsGamma} onChange={e => setLevelsGamma(Number(e.target.value))} className="w-full accent-blue-500" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Input Highlights</span> <span className="text-blue-500 font-bold">{levelsHighlight}</span>
                        </label>
                        <input type="range" min="130" max="255" value={levelsHighlight} onChange={e => setLevelsHighlight(Number(e.target.value))} className="w-full accent-blue-500" />
                      </div>

                      <button
                        type="button"
                        onClick={() => { setLevelsShadow(0); setLevelsGamma(1.0); setLevelsHighlight(255); }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold flex justify-end w-full"
                      >
                        Reset Levels
                      </button>
                    </motion.div>
                  )}

                  {adjustmentTab === 'color' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Cyan - Red</span> <span className={`${colorBalanceR > 0 ? 'text-red-500' : colorBalanceR < 0 ? 'text-cyan-500' : 'text-slate-400'} font-bold`}>{colorBalanceR > 0 ? `+${colorBalanceR}` : colorBalanceR}</span>
                        </label>
                        <input type="range" min="-50" max="50" value={colorBalanceR} onChange={e => setColorBalanceR(Number(e.target.value))} className="w-full accent-red-500" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Magenta - Green</span> <span className={`${colorBalanceG > 0 ? 'text-green-500' : colorBalanceG < 0 ? 'text-fuchsia-500' : 'text-slate-400'} font-bold`}>{colorBalanceG > 0 ? `+${colorBalanceG}` : colorBalanceG}</span>
                        </label>
                        <input type="range" min="-50" max="50" value={colorBalanceG} onChange={e => setColorBalanceG(Number(e.target.value))} className="w-full accent-green-500" />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                          <span>Yellow - Blue</span> <span className={`${colorBalanceB > 0 ? 'text-blue-500' : colorBalanceB < 0 ? 'text-yellow-500' : 'text-slate-400'} font-bold`}>{colorBalanceB > 0 ? `+${colorBalanceB}` : colorBalanceB}</span>
                        </label>
                        <input type="range" min="-50" max="50" value={colorBalanceB} onChange={e => setColorBalanceB(Number(e.target.value))} className="w-full accent-blue-500" />
                      </div>

                      <button
                        type="button"
                        onClick={() => { setColorBalanceR(0); setColorBalanceG(0); setColorBalanceB(0); }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold flex justify-end w-full"
                      >
                        Reset Balance
                      </button>
                    </motion.div>
                  )}

                  {adjustmentTab === 'curves' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                      <div className="text-[10px] text-slate-400 text-center">Drag the midpoint dot to bend the tone curve</div>
                      <svg
                        width="160"
                        height="160"
                        className="bg-slate-900 border border-slate-700 rounded-lg cursor-crosshair overflow-visible"
                        onMouseMove={(e) => {
                          if (e.buttons === 1) handleCurvesDrag(e);
                        }}
                        onMouseDown={handleCurvesDrag}
                        onTouchMove={handleCurvesDrag}
                      >
                        {/* Grid lines */}
                        <line x1="40" y1="0" x2="40" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                        <line x1="80" y1="0" x2="80" y2="160" stroke="#475569" strokeWidth="1" />
                        <line x1="120" y1="0" x2="120" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                        <line x1="0" y1="40" x2="160" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                        <line x1="0" y1="80" x2="160" y2="80" stroke="#475569" strokeWidth="1" />
                        <line x1="0" y1="120" x2="160" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                        
                        {/* Diagonal identity reference line */}
                        <line x1="0" y1="160" x2="160" y2="0" stroke="#475569" strokeWidth="1.5" strokeDasharray="4" />
                        
                        {/* Active Bezier Curve */}
                        <path
                          d={`M 0 160 Q ${(curvesMidX / 255) * 160} ${(1 - curvesMidY / 255) * 160} 160 0`}
                          fill="none"
                          stroke="#FF6B00"
                          strokeWidth="3"
                        />
                        
                        {/* Draggable Midpoint handle */}
                        <circle
                          cx={(curvesMidX / 255) * 160}
                          cy={(1 - curvesMidY / 255) * 160}
                          r="6"
                          fill="#ffffff"
                          stroke="#FF6B00"
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                      </svg>
                      <button
                        type="button"
                        onClick={() => { setCurvesMidX(128); setCurvesMidY(128); }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                      >
                        Reset Curve
                      </button>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeNameDate} 
                      onChange={e => setIncludeNameDate(e.target.checked)}
                      className="w-5 h-5 rounded text-(--color-orange) focus:ring-(--color-orange) border-slate-300"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-(--color-orange) transition-colors">Include Name & Date Strip</span>
                  </label>
                  
                  {includeNameDate && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
                    >
                      <input 
                        type="text" 
                        value={candidateName} 
                        onChange={e => setCandidateName(e.target.value)}
                        placeholder="Candidate Name"
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                      />
                      <input 
                        type="date" 
                        value={photoDate} 
                        onChange={e => setPhotoDate(e.target.value)}
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-(--color-orange) outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                <button 
                  onClick={() => handleRegenerate()}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center hover:-translate-y-1 hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Auto-Center Subject
                </button>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
            {imgObj ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-(--color-orange) text-sm font-bold mb-6">
                  <Check className="w-4 h-4 mr-2" />
                  Fixed Frame: 3.5cm x 4.5cm
                </div>
                
                <div className="relative shadow-2xl bg-white rounded mb-8 max-w-full overflow-hidden transition-all hover:scale-[1.02]">
                  <canvas 
                    ref={canvasRef} 
                    className="w-[240px] h-auto object-contain"
                  />
                  
                  {isTransformMode && (
                    <canvas
                      ref={overlayCanvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleOverlayMouseMove}
                      className="absolute inset-0 w-full h-full cursor-move z-20"
                      style={{ touchAction: 'none' }}
                    />
                  )}
                  
                  {removingBg && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center z-30">
                      <RefreshCw className="w-10 h-10 mb-4 animate-spin text-(--color-orange)" />
                      <p className="font-bold text-sm">AI is removing background...</p>
                      <p className="text-xs opacity-80 mt-1">please wait</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={removingBg}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center text-base disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5 mr-2" /> Upload New
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownload}
                    disabled={removingBg}
                    className="flex-1 bg-(--color-navy) hover:bg-(--color-navy-light) text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center text-base disabled:opacity-50"
                  >
                    <Download className="w-5 h-5 mr-2" /> Download JPEG
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrint}
                    disabled={removingBg}
                    className="flex-1 bg-(--color-orange) hover:bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center text-base disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5 mr-2" /> Direct Print (4x6)
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-full mb-6 shadow-sm">
                  <Camera className="w-16 h-16 text-(--color-orange) opacity-80" />
                </div>
                <p className="text-xl font-medium text-slate-500">Upload a portrait to start</p>
                <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">
                  We'll accurately frame the photo to 3.5x4.5cm and arrange 8 copies for a perfect 4x6 print.
                </p>
              </div>
            )}
          </div>
          
        </div>

        {/* Hidden Print Canvas Container that ONLY shows during window.print() */}
        <div id="print-canvas-wrapper" className="hidden">
          <canvas id="print-canvas" ref={printCanvasRef} />
        </div>

      </div>
    </>
  );
}
