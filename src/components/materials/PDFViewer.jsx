import React, { useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PDFViewer({ url, title }) {
  const [viewerType, setViewerType] = useState('google'); // 'google' or 'direct'

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewerType(viewerType === 'google' ? 'direct' : 'google')}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Switch Viewer
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(googleViewerUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
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

      {/* PDF Viewer */}
      <div className="relative bg-gray-800" style={{ height: '70vh' }}>
        {viewerType === 'google' ? (
          <iframe
            src={googleViewerUrl}
            className="w-full h-full"
            style={{ border: 'none' }}
            title={title}
          />
        ) : (
          <iframe
            src={`${url}#view=FitH`}
            className="w-full h-full"
            style={{ border: 'none' }}
            title={title}
          />
        )}
      </div>
    </div>
  );
}