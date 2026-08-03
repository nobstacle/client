import React, { useState, useRef, useEffect } from 'react';
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';

// Keep worker version in lockstep with the installed pdfjs-dist package.
const setupPDFWorker = () => {
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
  }
};

const PDFViewer = ({ documentUrl, onLoadingChange, onError }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMethod, setLoadingMethod] = useState('pdf.js');

  useEffect(() => {
    if (documentUrl) {
      loadPDF();
    }
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [documentUrl]);

  useEffect(() => {
    if (pdfDoc && currentPage <= totalPages && canvasRef.current) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

  const isValidPDFUrl = (url) => {
    try {
      new URL(url);
      return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
    } catch {
      return false;
    }
  };

  const loadPDF = async () => {
    try {
      setError(null);
      onLoadingChange?.(true);

      console.log('🔍 Attempting to load PDF:', documentUrl);

      if (!isValidPDFUrl(documentUrl)) {
        throw new Error('Invalid PDF URL format');
      }

      setupPDFWorker();

      // Method 1: Direct URL loading
      await tryDirectLoad();

    } catch (error) {
      console.error('❌ PDF loading failed:', error);
      await tryAlternativeMethods();
    }
  };

  const tryDirectLoad = async () => {
    try {
      console.log('📄 Trying direct PDF.js load...');

      const loadingTask = getDocument({
        url: documentUrl,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/cmaps/`,
        cMapPacked: true,
        disableAutoFetch: false,
        disableStream: false,
        disableRange: false,
      });

      loadingTask.onProgress = (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📊 Loading progress: ${percent}%`);
        }
      };

      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setLoadingMethod('pdf.js-direct');
      onLoadingChange?.(false);
    } catch (error) {
      console.log('❌ Direct load failed:', error.message);
      throw error;
    }
  };

  const tryAlternativeMethods = async () => {
    // Method 2: Fetch as ArrayBuffer
    try {
      console.log('📄 Trying ArrayBuffer method...');

      const response = await fetch(documentUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'default',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('pdf')) {
        console.warn('⚠️ Content-Type is not PDF:', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('📊 PDF size:', Math.round(arrayBuffer.byteLength / 1024), 'KB');

      const loadingTask = getDocument({
        data: arrayBuffer,
      });

      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setLoadingMethod('pdf.js-arraybuffer');
      onLoadingChange?.(false);
      return;
    } catch (error) {
      console.log('❌ ArrayBuffer method failed:', error.message);
    }

    // Method 3: Simplified options
    try {
      console.log('📄 Trying simplified options...');

      const loadingTask = getDocument({
        url: documentUrl,
        disableStream: true,
        disableRange: true,
        disableAutoFetch: true,
      });

      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setLoadingMethod('pdf.js-simplified');
      onLoadingChange?.(false);
      return;
    } catch (error) {
      console.log('❌ Simplified method failed:', error.message);
    }

    // All PDF.js methods failed - use iframe fallback
    console.log('🔄 All PDF.js methods failed, using iframe fallback');
    setError('PDF.js failed to load');
    setLoadingMethod('iframe-fallback');
    onLoadingChange?.(false);
  };

  const renderPage = async (pageNum) => {
    if (!pdfDoc || isRendering || !canvasRef.current) return;

    setIsRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Clear previous content
      context.clearRect(0, 0, canvas.width, canvas.height);

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: false, // Disable WebGL for compatibility
      };

      await page.render(renderContext).promise;
      console.log(`✅ Rendered page ${pageNum}`);
    } catch (error) {
      console.error('❌ Error rendering page:', error);
      setError(`Failed to render page ${pageNum}`);
    } finally {
      setIsRendering(false);
    }
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
      setCurrentPage(pageNum);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Show iframe fallback
  if (loadingMethod === 'iframe-fallback') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 border rounded-lg overflow-hidden">
          <iframe
            src={documentUrl}
            className="w-full h-full"
            title="PDF Document (Browser Fallback)"
            style={{ border: 'none' }}
            onLoad={() => console.log('✅ Iframe fallback loaded')}
            onError={() => {
              console.error('❌ Iframe fallback also failed');
              onError?.();
            }}
          />
        </div>
      </div>
    );
  }

  // Show PDF.js viewer
  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Status Bar */}
      <div className="bg-white border-b px-4 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>Loading method: {loadingMethod}</span>
          {error && <span className="text-red-600">⚠️ {error}</span>}
        </div>
      </div>

      {/* Toolbar */}
      {pdfDoc && (
        <div className="flex items-center justify-between p-3 bg-white border-b shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    goToPage(page);
                  }
                }}
                className="w-16 px-2 py-1 border rounded text-center text-sm"
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={zoomOut}
              className="px-2 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors text-sm"
            >
              −
            </button>
            <span className="text-sm font-medium min-w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="px-2 py-1.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors text-sm"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* PDF Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100"
      >
        {pdfDoc ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border shadow-lg bg-white max-w-full h-auto"
              style={{ display: isRendering ? 'none' : 'block' }}
            />
            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Rendering page...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
