import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Sparkles, Save, RotateCcw, ArrowLeft, Check } from 'lucide-react';
import { useI18n } from '../Layout';

export default function TeacherScanner() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [filter, setFilter] = useState('none'); // none, magic, bw, sharpen
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [materialData, setMaterialData] = useState({
    title: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      setError(t('scanner.cameraError'));
      console.error('Camera error:', err);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // A4 aspect ratio: 210/297 = 0.707
    const A4_RATIO = 0.707;
    const videoRatio = video.videoWidth / video.videoHeight;
    
    let sourceWidth, sourceHeight, sourceX, sourceY;
    
    // Crop to A4 format
    if (videoRatio > A4_RATIO) {
      sourceHeight = video.videoHeight;
      sourceWidth = sourceHeight * A4_RATIO;
      sourceX = (video.videoWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      sourceWidth = video.videoWidth;
      sourceHeight = sourceWidth / A4_RATIO;
      sourceX = 0;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    // Set canvas to high resolution A4
    canvas.width = 2480; // A4 at 300 DPI width
    canvas.height = 3508; // A4 at 300 DPI height

    // High quality rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.filter = 'contrast(1.2) brightness(1.05)';
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL('image/jpeg', 0.98);
    setCapturedImage(imageUrl);
    setEnhancedImage(null);
    setFilter('none');
    setBrightness(1.0);
    setContrast(1.0);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const recapture = () => {
    setCapturedImage(null);
    setEnhancedImage(null);
    setFilter('none');
    setBrightness(1.0);
    setContrast(1.0);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    startCamera();
  };

  const applyFilter = (filterType) => {
    if (!capturedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate crop dimensions
      const cropX = img.width * cropLeft / 100;
      const cropY = img.height * cropTop / 100;
      const cropWidth = img.width * (1 - (cropLeft + cropRight) / 100);
      const cropHeight = img.height * (1 - (cropTop + cropBottom) / 100);

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      context.filter = `brightness(${brightness}) contrast(${contrast})`;
      context.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (filterType === 'bw') {
        // Black and White with high contrast
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const threshold = avg < 140 ? 0 : 255;
          data[i] = threshold;
          data[i + 1] = threshold;
          data[i + 2] = threshold;
        }
      } else if (filterType === 'magic') {
        // Magic color - enhance colors and clarity
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.15);     // Red
          data[i + 1] = Math.min(255, data[i + 1] * 1.12); // Green
          data[i + 2] = Math.min(255, data[i + 2] * 1.08); // Blue
          
          // Increase saturation
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const delta = max - min;
          
          if (delta > 0) {
            const factor = 1.3;
            data[i] = min + (data[i] - min) * factor;
            data[i + 1] = min + (data[i + 1] - min) * factor;
            data[i + 2] = min + (data[i + 2] - min) * factor;
          }
        }
      } else if (filterType === 'sharpen') {
        // Sharpen for text clarity
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (avg < 130) {
            data[i] = data[i] * 0.85;
            data[i + 1] = data[i + 1] * 0.85;
            data[i + 2] = data[i + 2] * 0.85;
          } else {
            data[i] = Math.min(255, data[i] * 1.2);
            data[i + 1] = Math.min(255, data[i + 1] * 1.2);
            data[i + 2] = Math.min(255, data[i + 2] * 1.2);
          }
        }
      }
      
      context.putImageData(imageData, 0, 0);
      setEnhancedImage(canvas.toDataURL('image/jpeg', 0.98));
    };

    img.src = capturedImage;
  };

  useEffect(() => {
    if (capturedImage) {
      applyFilter(filter);
    }
  }, [filter, brightness, contrast, cropTop, cropBottom, cropLeft, cropRight]);

  const enhanceWithAI = async () => {
    if (!capturedImage) return;

    setIsEnhancing(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });

      // Upload the image first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Use AI to enhance the document
      const enhancementResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this scanned document image and provide enhancement recommendations:
- Detect if it's a document, sheet music, or notes
- Suggest if brightness/contrast adjustments are needed
- Identify if there's text or musical notation
- Recommend optimal crop boundaries if borders are detected

Respond with: { "type": "document/music/notes", "needsBrightness": true/false, "needsContrast": true/false, "quality": "good/fair/poor" }`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            needsBrightness: { type: "boolean" },
            needsContrast: { type: "boolean" },
            quality: { type: "string" }
          }
        }
      });

      // Apply AI recommendations to enhance the image
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Apply AI-recommended enhancements
        let filterString = 'contrast(1.3) brightness(1.15)';
        
        if (enhancementResult.needsBrightness) {
          filterString += ' brightness(1.2)';
        }
        if (enhancementResult.needsContrast) {
          filterString += ' contrast(1.4)';
        }
        
        context.filter = filterString + ' saturate(0.9)';
        context.drawImage(img, 0, 0);
        
        // Additional sharpening
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Increase contrast for text clarity
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (avg < 140) {
            data[i] = data[i] * 0.8;
            data[i + 1] = data[i + 1] * 0.8;
            data[i + 2] = data[i + 2] * 0.8;
          } else {
            data[i] = Math.min(255, data[i] * 1.15);
            data[i + 1] = Math.min(255, data[i + 1] * 1.15);
            data[i + 2] = Math.min(255, data[i + 2] * 1.15);
          }
        }
        
        context.putImageData(imageData, 0, 0);
        
        const enhanced = canvas.toDataURL('image/jpeg', 0.98);
        setEnhancedImage(enhanced);
        setIsEnhancing(false);
      };
      
      img.src = capturedImage;
    } catch (error) {
      console.error('Enhancement error:', error);
      setIsEnhancing(false);
    }
  };

  const saveToMaterials = async () => {
    if (!materialData.title) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const imageToSave = enhancedImage || capturedImage;
      
      // Convert base64 to blob
      const response = await fetch(imageToSave);
      const blob = await response.blob();
      const file = new File([blob], `${materialData.title}.jpg`, { type: 'image/jpeg' });

      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create material
      await base44.entities.Material.create({
        title: materialData.title,
        description: materialData.description || 'Scanned document',
        type: 'image',
        file_url: file_url,
        is_template: true,
      });

      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setSuccess(true);
      
      setTimeout(() => {
        navigate(createPageUrl('TeacherMaterials'));
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const displayImage = enhancedImage || capturedImage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-2xl font-bold text-white">{t('scanner.title')}</h1>
          <div className="w-24" />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-white rounded-xl p-4 mb-6 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {t('scanner.success')}
          </div>
        )}

        {/* Camera/Preview Area */}
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto"
                style={{ maxHeight: '70vh' }}
              />
              
              {/* A4 Scanning guide overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-4 border-cyan-400 rounded-xl shadow-2xl" 
                     style={{ 
                       width: '70%', 
                       aspectRatio: '0.707',
                       maxHeight: '80%'
                     }}>
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-cyan-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    A4 FORMAT
                  </div>
                </div>
                <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-cyan-400" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-cyan-400" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-cyan-400" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-cyan-400" />
              </div>

              {/* Capture Button */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={captureImage}
                  size="lg"
                  className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 shadow-2xl"
                >
                  <Camera className="w-8 h-8 text-gray-900" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-full flex items-center justify-center bg-black" style={{ maxHeight: '70vh' }}>
                <img
                  src={displayImage}
                  alt="Captured"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              
              {isEnhancing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-lg font-semibold">{t('scanner.enhancing')}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        {capturedImage && (
          <div className="space-y-4">
            <Button
              onClick={recapture}
              variant="outline"
              className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 mb-4"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              {t('scanner.recapture')}
            </Button>

            {/* Filters */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-3">Filters & Quality</h3>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Button
                  onClick={() => setFilter('none')}
                  variant={filter === 'none' ? 'default' : 'outline'}
                  className={filter === 'none' ? 'bg-cyan-500' : 'bg-white/10 text-white border-white/20'}
                  size="sm"
                >
                  Original
                </Button>
                <Button
                  onClick={() => setFilter('magic')}
                  variant={filter === 'magic' ? 'default' : 'outline'}
                  className={filter === 'magic' ? 'bg-purple-500' : 'bg-white/10 text-white border-white/20'}
                  size="sm"
                >
                  Magic
                </Button>
                <Button
                  onClick={() => setFilter('bw')}
                  variant={filter === 'bw' ? 'default' : 'outline'}
                  className={filter === 'bw' ? 'bg-gray-700' : 'bg-white/10 text-white border-white/20'}
                  size="sm"
                >
                  B&W
                </Button>
                <Button
                  onClick={() => setFilter('sharpen')}
                  variant={filter === 'sharpen' ? 'default' : 'outline'}
                  className={filter === 'sharpen' ? 'bg-blue-500' : 'bg-white/10 text-white border-white/20'}
                  size="sm"
                >
                  Sharp
                </Button>
              </div>

              {/* Quality Controls */}
              <div className="space-y-3">
                <div>
                  <label className="text-white text-sm mb-1 block">Brightness: {brightness.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm mb-1 block">Contrast: {contrast.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="border-t border-white/20 pt-3 mt-4">
                  <h4 className="text-white text-sm font-semibold mb-2">Crop Edges</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-xs mb-1 block">Top: {cropTop}%</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={cropTop}
                        onChange={(e) => setCropTop(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-white text-xs mb-1 block">Bottom: {cropBottom}%</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={cropBottom}
                        onChange={(e) => setCropBottom(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs mb-1 block">Left: {cropLeft}%</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={cropLeft}
                        onChange={(e) => setCropLeft(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-white text-xs mb-1 block">Right: {cropRight}%</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={cropRight}
                        onChange={(e) => setCropRight(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={enhanceWithAI}
                disabled={isEnhancing}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isEnhancing ? t('scanner.enhancing') : t('scanner.enhance')}
              </Button>
            </div>

            {/* Save Form */}
            <div className="bg-white rounded-xl p-6 space-y-4">
              <div>
                <Label className="text-gray-900">{t('scanner.materialTitle')} *</Label>
                <Input
                  value={materialData.title}
                  onChange={(e) => setMaterialData({ ...materialData, title: e.target.value })}
                  placeholder={t('scanner.materialTitlePlaceholder')}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-gray-900">{t('scanner.description')}</Label>
                <Textarea
                  value={materialData.description}
                  onChange={(e) => setMaterialData({ ...materialData, description: e.target.value })}
                  placeholder={t('scanner.descriptionPlaceholder')}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <Button
                onClick={saveToMaterials}
                disabled={isSaving || !materialData.title}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                size="lg"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? t('scanner.saving') : t('scanner.save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}