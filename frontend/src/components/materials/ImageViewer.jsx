import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Download, ExternalLink, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImageViewer({ url, title }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Full Size
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Image Viewer */}
      <div className="relative bg-gray-800 overflow-auto flex items-center justify-center" style={{ height: '70vh' }}>
        <img
          src={url}
          alt={title}
          style={{
            width: `${zoom}%`,
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease',
          }}
          className="max-w-none"
        />
      </div>
    </div>
  );
}