'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, SlidersHorizontal, RefreshCw, Printer, Download, Check, Camera, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PhotoStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  const [includeNameDate, setIncludeNameDate] = useState(false);
  const [candidateName, setCandidateName] = useState('Rahul Kumar');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0, scale: 1 });
  const [removingBg, setRemovingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
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
    
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
        if (alpha > 30) { 
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          foundSubject = true;
        }
      }
    }
    
    const width = 413;
    const height = 531;
    const stripHeight = includeNameDate ? Math.floor(height * 0.15) : 0;
    const availableHeight = height - stripHeight;

    if (foundSubject) {
      const subjectWidth = maxX - minX;
      const subjectHeight = maxY - minY;
      
      const targetHeight = availableHeight * 0.85;
      const newScale = targetHeight / subjectHeight;
      
      const subjectCenterX = minX + subjectWidth / 2;
      const offsetX = (width / 2) - (subjectCenterX * newScale);
      
      const offsetY = availableHeight - (maxY * newScale);
      
      setCropOffset({ x: offsetX, y: offsetY, scale: newScale });
    } else {
      const scaleX = width / img.width;
      const scaleY = availableHeight / img.height;
      const scale = Math.max(scaleX, scaleY);
      setCropOffset({ x: (width - img.width * scale) / 2, y: availableHeight - img.height * scale, scale });
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

    const sWidth = 413;
    const sHeight = 531;
    
    const cols = 4;
    const rows = 2;
    
    const xSpacing = (pWidth - (cols * sWidth)) / (cols + 1);
    const ySpacing = (pHeight - (rows * sHeight)) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = xSpacing + c * (sWidth + xSpacing);
        const y = ySpacing + r * (sHeight + ySpacing);
        pCtx.drawImage(canvasRef.current, x, y, sWidth, sHeight);
      }
    }
  }

  useEffect(() => {
    if (!canvasRef.current || !imgObj) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Outer dimensions NEVER change.
    const width = 413; 
    const height = 531; 

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    ctx.clearRect(0, 0, width, height);
    
    // FILL BACKGROUND COLOR
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Determine the space available for the face
    let availableHeight = height;
    const stripHeight = Math.floor(height * 0.15); // 15% of height

    if (includeNameDate) {
      availableHeight = height - stripHeight;
    }

    // Drawing the image with crop offset and scale
    const scaledWidth = imgObj.width * cropOffset.scale;
    const scaledHeight = imgObj.height * cropOffset.scale;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, availableHeight);
    ctx.clip();
    
    // SUBTLE FEATHERING: Soften the cutout edges slightly for a professional look
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(0.5px)`;
    ctx.drawImage(imgObj, cropOffset.x, cropOffset.y, scaledWidth, scaledHeight);
    
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
  }, [imgObj, brightness, contrast, saturation, bgColor, includeNameDate, candidateName, photoDate, cropOffset]);

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
          body * {
            visibility: hidden;
            display: none !important;
          }
          #print-canvas-wrapper, #print-canvas-wrapper * {
            visibility: visible !important;
            display: block !important;
          }
          #print-canvas-wrapper {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 6in !important;
            height: 4in !important;
            page-break-inside: avoid !important;
          }
          canvas#print-canvas {
            width: 100% !important;
            height: 100% !important;
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
                  <h4 className="font-bold flex items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-3 text-slate-800 dark:text-white">
                    <SlidersHorizontal className="w-4 h-4 mr-2 text-(--color-orange)" /> Adjustments
                  </h4>
                  
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

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 block">
                      Background Color
                    </label>
                    <div className="flex items-center gap-3 mb-4">
                      {[
                        { name: 'White', color: '#FFFFFF' },
                        { name: 'Sky Blue', color: '#87CEEB' },
                        { name: 'Light Grey', color: '#D3D3D3' }
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          onClick={() => setBgColor(preset.color)}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${bgColor === preset.color ? 'border-(--color-orange) scale-110' : 'border-slate-200 dark:border-slate-700 hover:scale-105'}`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                      <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                      <div className="relative group">
                        <input 
                          type="color" 
                          value={bgColor} 
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-10 h-10 rounded-full cursor-pointer border-2 border-slate-200 dark:border-slate-700 p-0 overflow-hidden"
                        />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Custom Hex
                        </span>
                      </div>
                    </div>
                  </div>
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
                  
                  {removingBg && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
                      <RefreshCw className="w-10 h-10 mb-4 animate-spin text-(--color-orange)" />
                      <p className="font-bold text-sm">AI is removing background...</p>
                      <p className="text-xs opacity-80 mt-1">please wait</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
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
