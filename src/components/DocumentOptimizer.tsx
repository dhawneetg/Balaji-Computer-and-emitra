'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileDown, Settings, Loader2, FileText, Image as ImageIcon, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';

// Setup PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type FileType = 'image' | 'pdf' | null;

export default function DocumentOptimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(100);
  const [quality, setQuality] = useState(0.8);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processInitialFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processInitialFile(e.target.files[0]);
    }
  };

  const processInitialFile = (uploadedFile: File) => {
    setProcessedFile(null);
    setError(null);
    
    if (uploadedFile.type.startsWith('image/')) {
      setFileType('image');
      setFile(uploadedFile);
    } else if (uploadedFile.type === 'application/pdf') {
      setFileType('pdf');
      setFile(uploadedFile);
    } else {
      setError('Unsupported file type. Please upload a JPEG, PNG, or PDF.');
      setFile(null);
      setFileType(null);
    }
  };

  const handleCompressImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      // browser-image-compression accepts target size in MB
      const options = {
        maxSizeMB: targetSizeKB / 1024,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: quality
      };

      const compressedBlob = await imageCompression(file, options);
      const compressedFile = new File([compressedBlob], `compressed_${file.name}`, {
        type: compressedBlob.type,
      });

      setProcessedFile(compressedFile);
    } catch (err: any) {
      console.error(err);
      setError('Failed to compress image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompressPDF = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          
          const doc = new jsPDF({
            unit: 'px',
            format: 'a4',
          });

          // PDF.js rendering to canvas, then to jsPDF
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); // Good balance of quality/size
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('No canvas context');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              canvas: canvas,
              viewport: viewport
            }).promise;

            // Compress canvas to JPEG
            // Target quality calculation based on target size vs original size
            const imgData = canvas.toDataURL('image/jpeg', quality);

            if (i > 1) {
              doc.addPage();
            }

            // Calculate A4 proportions
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (viewport.height * pdfWidth) / viewport.width;

            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          }

          const pdfBlob = doc.output('blob');
          const finalFile = new File([pdfBlob], `compressed_${file.name}`, { type: 'application/pdf' });
          
          setProcessedFile(finalFile);
        } catch (err) {
          console.error(err);
          setError('Failed to process PDF pages.');
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setError('Failed to load PDF.');
      setIsProcessing(false);
    }
  };

  const runCompression = () => {
    if (fileType === 'image') handleCompressImage();
    else if (fileType === 'pdf') handleCompressPDF();
  };

  const downloadFile = () => {
    if (!processedFile) return;
    const url = URL.createObjectURL(processedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = processedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="py-12 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-(--color-navy) dark:text-white mb-4">
          Document Optimizer
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Instantly compress heavy images and scanned PDFs to strict e-Mitra portal sizes (50KB/100KB/500KB) entirely in your browser.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        
        {!file ? (
          <div 
            className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive ? 'border-(--color-orange) bg-orange-50 dark:bg-orange-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-(--color-orange)" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Drag & Drop your file here</h3>
            <p className="text-slate-500 mb-8">Supports JPG, PNG, and PDF up to 20MB</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-(--color-navy) hover:bg-(--color-navy-light) text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all"
            >
              Browse Files
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg, image/png, application/pdf" 
              onChange={handleChange} 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* File Info & Settings */}
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl mr-4 shadow-sm">
                  {fileType === 'pdf' ? <FileText className="w-8 h-8 text-red-500" /> : <ImageIcon className="w-8 h-8 text-blue-500" />}
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-white truncate">{file.name}</h4>
                  <p className="text-sm text-slate-500">Original Size: <span className="font-bold">{formatBytes(file.size)}</span></p>
                </div>
                <button 
                  onClick={() => { setFile(null); setProcessedFile(null); }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold flex items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-3 mb-5 text-slate-800 dark:text-white">
                  <Settings className="w-4 h-4 mr-2 text-(--color-orange)" /> Compression Target
                </h4>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[50, 100, 500].map(size => (
                    <button
                      key={size}
                      onClick={() => setTargetSizeKB(size)}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        targetSizeKB === size 
                          ? 'bg-(--color-orange) text-white border-transparent shadow-md shadow-orange-500/20' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Under {size}KB
                    </button>
                  ))}
                </div>

                <div className="mb-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                    <span>Quality/Compression Ratio</span>
                    <span className="text-(--color-orange)">{Math.round(quality * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.1"
                    value={quality} 
                    onChange={e => setQuality(parseFloat(e.target.value))} 
                    className="w-full accent-(--color-orange)" 
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Lower quality results in smaller files but less clarity. Essential for strict portal limits.
                  </p>
                </div>
              </div>

              <button 
                onClick={runCompression}
                disabled={isProcessing}
                className="w-full bg-(--color-navy) hover:bg-(--color-navy-light) text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Optimizing Document...</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Compress {fileType === 'pdf' ? 'PDF' : 'Image'}</>
                )}
              </button>

              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
            </div>

            {/* Result Area */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50 dark:bg-slate-900/50">
              <AnimatePresence mode="wait">
                {processedFile ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center w-full"
                  >
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-inner">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Compression Success!</h3>
                    
                    <div className="inline-block bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
                      <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Before</p>
                          <p className="text-lg font-bold text-slate-400 line-through">{formatBytes(file.size)}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="text-center">
                          <p className="text-xs text-(--color-orange) uppercase tracking-wider mb-1 font-bold">After</p>
                          <p className="text-2xl font-black text-green-500">{formatBytes(processedFile.size)}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={downloadFile}
                      className="w-full bg-(--color-orange) hover:bg-orange-600 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center"
                    >
                      <FileDown className="w-6 h-6 mr-2" /> Download Ready File
                    </button>
                    
                    {processedFile.size > targetSizeKB * 1024 && (
                      <p className="text-amber-500 text-sm mt-4 font-semibold">
                        Note: The file is still slightly larger than your target. Try lowering the quality slider and compressing again.
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-slate-400"
                  >
                    <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-500">Ready to optimize</p>
                    <p className="text-sm mt-2 max-w-xs mx-auto">Adjust settings and click compress to see the result here.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
