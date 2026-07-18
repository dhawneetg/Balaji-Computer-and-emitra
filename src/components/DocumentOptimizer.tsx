'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Upload, FileDown, Settings, Loader2, FileText, Image as ImageIcon, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';

// Setup PDF.js worker (robust: local-first, CDN fallback)
if (typeof window !== 'undefined') {
  try {
    // pdfjs-dist ships a worker entry; using import-meta-url helps bundlers.
    // Fallback to CDN if the worker import path is not available in this environment.
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}



type FileType = 'image' | 'pdf' | null;

type SizeUnit = 'KB' | 'MB';

type ResizeUnit = 'px' | 'cm' | 'inch';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sanitizeNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DocumentOptimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<File | null>(null);

  // Compression target for images/PDF (approx)
  const [targetSizeValue, setTargetSizeValue] = useState<number>(100);
  const [targetSizeUnit, setTargetSizeUnit] = useState<SizeUnit>('KB');

  // Quality slider for images (and approximate PDF rendering)
  const [quality, setQuality] = useState<number>(80); // percent

  // Optional compression strategy for images: keep original format vs convert to JPEG
  const [convertToJpegForMaxCompression, setConvertToJpegForMaxCompression] = useState<boolean>(false);


  // Resize
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [widthValue, setWidthValue] = useState<number>(0);
  const [heightValue, setHeightValue] = useState<number>(0);
  const [resizeUnit, setResizeUnit] = useState<ResizeUnit>('px');

  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quality01 = useMemo(() => Math.min(1, Math.max(0.1, quality / 100)), [quality]);

  const targetBytes = useMemo(() => {
    const mb = targetSizeUnit === 'MB' ? targetSizeValue : targetSizeValue / 1024;
    return Math.max(1, mb * 1024 * 1024);
  }, [targetSizeUnit, targetSizeValue]);

  const accept = 'image/jpeg, image/png, image/webp, application/pdf';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const processInitialFile = (uploadedFile: File) => {
    setProcessedFile(null);
    setError(null);

    const isImage = uploadedFile.type.startsWith('image/');
    const isPdf = uploadedFile.type === 'application/pdf';

    if (isImage) {
      setFileType('image');
      setFile(uploadedFile);
      return;
    }
    if (isPdf) {
      setFileType('pdf');
      setFile(uploadedFile);
      return;
    }

    setFile(null);
    setFileType(null);
    setError('Unsupported file type. Please upload JPG/JPEG/PNG/WEBP or PDF.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processInitialFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) processInitialFile(e.target.files[0]);
  };

  const applyResizeToImage = async (inputFile: File) => {
    if (!resizeEnabled || (widthValue <= 0 && heightValue <= 0)) return inputFile;

    const img = await createImageBitmap(inputFile);


    const cmToIn = (cm: number) => cm / 2.54;
    const inchToPx = (inch: number, dpi: number) => Math.round(inch * dpi);

    // For browser resize we use a reasonable DPI baseline
    const baselineDpi = 150;

    let wPx: number | null = null;
    let hPx: number | null = null;

    if (resizeUnit === 'px') {
      wPx = widthValue > 0 ? Math.round(widthValue) : null;
      hPx = heightValue > 0 ? Math.round(heightValue) : null;
    } else {
      const wIn = resizeUnit === 'cm' ? cmToIn(widthValue) : widthValue;
      const hIn = resizeUnit === 'cm' ? cmToIn(heightValue) : heightValue;
      if (widthValue > 0) wPx = inchToPx(wIn, baselineDpi);
      if (heightValue > 0) hPx = inchToPx(hIn, baselineDpi);
    }

    if (wPx && !hPx) hPx = Math.round((wPx * img.height) / img.width);
    if (!wPx && hPx) wPx = Math.round((hPx * img.width) / img.height);
    if (!wPx && !hPx) {
      wPx = img.width;
      hPx = img.height;
    }

    const canvas = document.createElement('canvas');
    canvas.width = wPx!;
    canvas.height = hPx!;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const shouldConvertToJpeg =
      convertToJpegForMaxCompression &&
      // Keep existing behavior unless user opts-in to conversion
      inputFile.type !== 'image/jpeg' &&
      inputFile.type !== 'image/jpg';

    const outMime = shouldConvertToJpeg ? 'image/jpeg' : inputFile.type;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
        outMime,

        outMime === 'image/png' ? undefined : quality01
      );
    });

    return new File([blob], `resized_${inputFile.name}`, { type: blob.type });
  };

  const handleCompressImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProcessedFile(null);

    try {
      const prepared = await applyResizeToImage(file);

      // browser-image-compression expects target size in MB
      const targetMaxSizeMB = targetBytes / (1024 * 1024);
      const options = {
        maxSizeMB: targetMaxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: quality01,
      };

      const compressedBlob = await imageCompression(prepared, options);
      const compressedFile = new File([compressedBlob], `optimized_${file.name}`, {
        type: compressedBlob.type,
      });

      setProcessedFile(compressedFile);
    } catch (e) {
      console.error(e);
      setError('Failed to compress image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompressPDF = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProcessedFile(null);

    const target = targetBytes;
    const minQuality = 0.35; // below this we stop trying (quality loss becomes excessive)

    try {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);

      await new Promise<void>((resolve, reject) => {
        fileReader.onerror = () => reject(new Error('Failed to read PDF'));
        fileReader.onload = async () => {
          try {
            const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);

            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            const pdf = await loadingTask.promise;

            if (!pdf || typeof pdf.numPages !== 'number' || pdf.numPages < 1) {
              const numPages = (pdf as { numPages?: number })?.numPages;
              throw new Error(`Invalid PDF loaded (numPages=${numPages})`);
            }

            // Try multiple render qualities until we reach the target size.
            // Important: never return a larger file than the original.
            let bestFile: File | null = null;


            const initialQ = Math.max(minQuality, quality01);
            // Search downwards in quality.
            const qualitySteps = [initialQ, initialQ * 0.85, initialQ * 0.7, minQuality];

            for (const q of qualitySteps) {
              const doc = new jsPDF({
                unit: 'px',
                format: 'a4',
              });

              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.3 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) throw new Error('No canvas context');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                  canvasContext: context,
                  canvas,
                  viewport,
                }).promise;

                const imgData = canvas.toDataURL('image/jpeg', q);
                if (!imgData || imgData.length < 50) {
                  throw new Error(`Rendered image is empty for page ${i}`);
                }

                if (i > 1) doc.addPage();

                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();

                const aspect = viewport.height / viewport.width;
                let drawW = pageW;
                let drawH = pageW * aspect;
                if (drawH > pageH) {
                  drawH = pageH;
                  drawW = pageH / aspect;
                }

                doc.addImage(imgData, 'JPEG', 0, 0, drawW, drawH);
              }

              const pdfBlob = doc.output('blob');
              const candidate = new File([pdfBlob], `optimized_${file.name}`, { type: 'application/pdf' });

              // Track best candidate (closest below target, but never worse than original when possible)
              if (!bestFile || candidate.size < bestFile.size) {
                bestFile = candidate;
                // Keep track of the quality we used (optional/debug only)
                // (intentionally not stored in state to avoid unused-variable warnings)
              }



              // Stop if within target and not larger than original.
              if (candidate.size <= target && candidate.size <= file.size) {
                setProcessedFile(candidate);
                return resolve();
              }
            }

            // If we couldn't hit target, decide based on rules.
            if (bestFile) {
              // Never return a larger file than original.
              if (bestFile.size > file.size) {
                // fallback: keep original (but UI expects a downloadable processed file)
                // We'll still set processedFile to original only if strictly necessary.
                // Since requirement says never return larger than original, we use original.
                setProcessedFile(file);
                setError('Target size cannot be reached without excessive quality loss.');
              } else {
                setProcessedFile(bestFile);
                if (bestFile.size > target) {
                  setError('Target size cannot be reached without excessive quality loss.');
                }
              }
              resolve();
              return;
            }

            throw new Error('Failed to produce optimized PDF.');
          } catch (err) {
            console.error('PDF processing failed:', err);
            setError('Failed to process PDF pages.');
            reject(err);
          }
        };
      });
    } catch (e) {
      console.error('PDF load failed:', e);
      setError('Failed to load PDF.');
    } finally {
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

  const estimatedOverTarget = processedFile
    ? processedFile.size > targetBytes
    : false;

  return (
    <div className="py-12 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-(--color-navy) dark:text-white mb-4">Document Optimizer</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Compress • Resize • DPI Control (base upgrade in progress) — Supports JPG/JPEG/PNG/WEBP/PDF.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        {!file ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive
                ? 'border-(--color-orange) bg-orange-50 dark:bg-orange-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-(--color-orange)" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Drag & Drop your file here</h3>
              <p className="text-slate-500 mb-8">Supports JPG, JPEG, PNG, WEBP, and PDF</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-(--color-navy) hover:bg-(--color-navy-light) text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                className="hidden"
              />
            </div>

            {/* Show settings so user can type size immediately */}
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold flex items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-3 mb-5 text-slate-800 dark:text-white">
                  <Settings className="w-4 h-4 mr-2 text-(--color-orange)" /> Compression Target
                </h4>

                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Unit</label>
                  <div className="flex gap-2">
                    {(['KB', 'MB'] as SizeUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setTargetSizeUnit(u)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${targetSizeUnit === u
                          ? 'bg-(--color-orange) text-white border-transparent shadow-md shadow-orange-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[50, 100, 500].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setTargetSizeValue(size);
                        setTargetSizeUnit('KB');
                      }}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${targetSizeUnit === 'KB' && targetSizeValue === size
                        ? 'bg-(--color-orange) text-white border-transparent shadow-md shadow-orange-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      Under {size}KB
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Custom Target Size</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={targetSizeValue}
                      onChange={(e) => setTargetSizeValue(Math.max(1, sanitizeNumber(e.target.value)))}
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                    <select
                      value={targetSizeUnit}
                      onChange={(e) => setTargetSizeUnit(e.target.value as SizeUnit)}
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>

                <p className="text-[12px] text-slate-500">
                  Upload any supported file to start optimization.
                </p>
              </div>

              <button
                disabled
                className="w-full bg-(--color-navy) opacity-40 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center"
              >
                Choose a file to enable optimization
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <div className="space-y-6">
              <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl mr-4 shadow-sm">
                  {fileType === 'pdf' ? (
                    <FileText className="w-8 h-8 text-red-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-white truncate">{file.name}</h4>
                  <p className="text-sm text-slate-500">
                    Original Size: <span className="font-bold">{formatBytes(file.size)}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setProcessedFile(null);
                    setError(null);
                  }}
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

                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Unit</label>
                  <div className="flex gap-2">
                    {(['KB', 'MB'] as SizeUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setTargetSizeUnit(u)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${targetSizeUnit === u
                          ? 'bg-(--color-orange) text-white border-transparent shadow-md shadow-orange-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[50, 100, 500].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setTargetSizeValue(size);
                        setTargetSizeUnit('KB');
                      }}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${targetSizeUnit === 'KB' && targetSizeValue === size
                        ? 'bg-(--color-orange) text-white border-transparent shadow-md shadow-orange-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      Under {size}KB
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Custom Target Size</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={targetSizeValue}
                      onChange={(e) => setTargetSizeValue(Math.max(1, sanitizeNumber(e.target.value)))}
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                    <select
                      value={targetSizeUnit}
                      onChange={(e) => setTargetSizeUnit(e.target.value as SizeUnit)}
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>


                <div className="mb-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-2">
                    <span>Quality/Compression Ratio</span>
                    <span className="text-(--color-orange)">{Math.round(quality)}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="1"
                    value={quality}
                    onChange={(e) => setQuality(sanitizeNumber(e.target.value))}
                    className="w-full accent-(--color-orange)"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Lower quality results in smaller files but less clarity.</p>
                </div>

                <div className="mt-5">
                  <h4 className="font-bold flex items-center text-sm border-b border-slate-200 dark:border-slate-700 pb-3 mb-3 text-slate-800 dark:text-white">
                    <Settings className="w-4 h-4 mr-2 text-(--color-orange)" /> Compression Strategy
                  </h4>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={convertToJpegForMaxCompression}
                      onChange={(e) => setConvertToJpegForMaxCompression(e.target.checked)}
                    />
                    Convert to JPEG for maximum compression
                  </label>

                  <p className="text-[10px] text-slate-400 mt-2">
                    Default preserves format (PNG stays PNG, WEBP stays WEBP). If you enable this, PNG/WEBP may be converted to JPEG for stronger compression.
                  </p>
                </div>


                <div className="mt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                    <input type="checkbox" checked={resizeEnabled} onChange={(e) => setResizeEnabled(e.target.checked)} />
                    Enable Resize
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Width</label>
                      <input
                        className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                        type="number"
                        value={widthValue}
                        onChange={(e) => setWidthValue(sanitizeNumber(e.target.value))}
                        disabled={!resizeEnabled}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Height</label>
                      <input
                        className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                        type="number"
                        value={heightValue}
                        onChange={(e) => setHeightValue(sanitizeNumber(e.target.value))}
                        disabled={!resizeEnabled}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                    <select
                      value={resizeUnit}
                      onChange={(e) => setResizeUnit(e.target.value as ResizeUnit)}
                      disabled={!resizeEnabled}
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none"
                    >
                      <option value="px">px</option>
                      <option value="cm">cm</option>
                      <option value="inch">in</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={runCompression}
                disabled={isProcessing}
                className="w-full bg-(--color-navy) hover:bg-(--color-navy-light) text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" /> Optimizing Document...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" /> Compress {fileType === 'pdf' ? 'PDF' : 'Image'}
                  </>
                )}
              </button>

              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50 dark:bg-slate-900/50">
              <AnimatePresence mode="wait">
                {processedFile ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-inner">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Optimization Success!</h3>

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

                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <div>
                        Target Size: <span className="font-bold">{formatBytes(targetBytes)}</span>
                      </div>
                      <div>
                        Compression Percentage: <span className="font-bold">{file.size > 0 ? Math.round(((file.size - processedFile.size) / file.size) * 100) : 0}%</span>
                      </div>
                      <div>
                        Final Size: <span className="font-bold">{formatBytes(processedFile.size)}</span>
                      </div>
                    </div>

                    <button
                      onClick={downloadFile}
                      className="w-full bg-(--color-orange) hover:bg-orange-600 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center"
                    >
                      <FileDown className="w-6 h-6 mr-2" /> Download Ready File
                    </button>

                    {estimatedOverTarget && (
                      <p className="text-amber-500 text-sm mt-4 font-semibold">
                        Target size cannot be reached without excessive quality loss.
                      </p>
                    )}

                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-slate-400">
                    <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-500">Ready to optimize</p>
                    <p className="text-sm mt-2 max-w-xs mx-auto">Choose a file and adjust settings.</p>
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

