## TODO - Document Optimizer PDF “Unable to Load PDF” fix

- [ ] Update `src/components/DocumentOptimizer.tsx`
  - [ ] Make PDF.js workerSrc loading more robust (prefer local worker when possible; keep CDN fallback)
  - [ ] Improve error messages/logging for pdfjs getDocument failures
  - [ ] Add guardrails to avoid generating invalid PDFs (validate numPages, rendered image dataURL, jsPDF addImage bounds)
- [ ] Run `npm run dev`
- [ ] Test: upload multiple PDFs and confirm optimized download opens without “Unable to Load PDF”

