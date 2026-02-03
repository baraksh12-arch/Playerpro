import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Upload, FileText, Download, Loader2, CheckCircle, X, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function TeacherPdfToWord() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [converted, setConverted] = useState(false);
  const [wordContent, setWordContent] = useState(null);
  const [xmlContent, setXmlContent] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [materialData, setMaterialData] = useState({ title: '', description: '' });
  const [downloadingXml, setDownloadingXml] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
      setConverted(false);
      setWordContent(null);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const convertPdfToWord = async () => {
    if (!pdfFile) return;

    setProcessing(true);
    setError('');
    setProgress('Uploading PDF...');

    try {
      // Step 1: Upload the PDF file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      
      setProgress('Extracting content with AI...');

      // Step 2: Use AI to extract and structure the content
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract ALL text content from this PDF and format it as clean HTML for Microsoft Word.

Rules:
- Preserve all headings, paragraphs, lists, and tables
- Use proper HTML tags: <h1>, <h2>, <p>, <ul>, <ol>, <table>
- Keep original text formatting and structure
- Make tables with borders
- Return ONLY the HTML body content, no explanations`,
        file_urls: [file_url]
      });

      setProgress('Creating Word document...');

      // Step 3: Create Word-compatible HTML
      const wordHTML = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset='utf-8'>
<title>Converted Document</title>
<style>
body { font-family: Calibri, Arial; font-size: 11pt; line-height: 1.5; margin: 1in; }
h1 { font-size: 16pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
h2 { font-size: 14pt; font-weight: bold; margin-top: 10pt; margin-bottom: 6pt; }
h3 { font-size: 12pt; font-weight: bold; margin-top: 8pt; margin-bottom: 4pt; }
p { margin-bottom: 10pt; }
table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
td, th { border: 1px solid #000; padding: 5pt; }
</style>
</head>
<body>
${result}
</body>
</html>`;

      setWordContent(wordHTML);
      setProcessing(false);
      setConverted(true);
      setProgress('');

    } catch (error) {
      console.error('Conversion error:', error);
      setError('Failed to convert PDF. Please try again.');
      setProcessing(false);
      setProgress('');
    }
  };

  const downloadWord = () => {
    if (!wordContent) return;

    const blob = new Blob([wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pdfFile.name.replace('.pdf', '')}_converted.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadXML = async () => {
    if (!pdfFile) return;

    setDownloadingXml(true);
    setError('');

    try {
      // Upload PDF if not already uploaded
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Use AI to extract musical data and convert to MusicXML
      const xmlData = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional music transcription AI. Analyze this PDF and extract ONLY the EXACT musical content written in it.

ABSOLUTE RULES:
1. Extract ONLY notes, pitches, rhythms, and chords that are ACTUALLY WRITTEN in the PDF
2. DO NOT invent, assume, or add ANY musical data that isn't explicitly shown
3. If you see sheet music notation, read each note precisely (pitch + duration)
4. If you see chord symbols (like C, Am, G7), convert them to actual notes in those chords
5. If you see tablature, convert tab numbers to actual pitches on the guitar fretboard
6. Preserve exact time signatures, key signatures, tempo markings from the PDF
7. If NO musical content exists in PDF, return an error message instead

For each note you extract, verify:
- Is this note actually written in the PDF? YES/NO
- What is its exact pitch (C4, D#5, etc.)?
- What is its exact duration (quarter, half, whole, eighth)?
- What measure does it belong to?

Generate valid MusicXML 3.1 with this structure:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>EXACT TITLE FROM PDF</work-title></work>
  <identification>
    <creator type="composer">COMPOSER FROM PDF OR Unknown</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>INSTRUMENT NAME FROM PDF</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>ACTUAL KEY</fifths></key>
        <time><beats>ACTUAL BEATS</beats><beat-type>ACTUAL BEAT-TYPE</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <!-- EXACT NOTES FROM PDF HERE -->
    </measure>
  </part>
</score-partwise>

Return ONLY the MusicXML with REAL data from the PDF:`,
        file_urls: [file_url]
      });

      // Clean the response
      let cleanXml = xmlData.trim();
      
      // Remove markdown
      cleanXml = cleanXml.replace(/```xml\n?/g, '').replace(/```\n?/g, '');
      
      // Extract XML content
      const xmlStart = cleanXml.indexOf('<?xml');
      if (xmlStart > 0) {
        cleanXml = cleanXml.substring(xmlStart);
      }
      
      const lastClosing = cleanXml.lastIndexOf('</score-partwise>');
      if (lastClosing > 0) {
        cleanXml = cleanXml.substring(0, lastClosing + '</score-partwise>'.length);
      }
      
      // Ensure proper XML declaration
      if (!cleanXml.startsWith('<?xml')) {
        cleanXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n${cleanXml}`;
      }

      // Validate MusicXML structure
      if (!cleanXml.includes('<score-partwise') || !cleanXml.includes('</score-partwise>')) {
        throw new Error('Invalid MusicXML structure');
      }

      setXmlContent(cleanXml);

      // Download as MusicXML
      const blob = new Blob([cleanXml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace('.pdf', '')}.musicxml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadingXml(false);
    } catch (error) {
      console.error('MusicXML conversion error:', error);
      setError('Failed to convert to MusicXML. Please try again.');
      setDownloadingXml(false);
    }
  };

  const saveMaterialMutation = useMutation({
    mutationFn: async () => {
      // Convert Word content to blob and upload
      const blob = new Blob([wordContent], { type: 'application/msword' });
      const file = new File([blob], `${materialData.title || 'converted'}.doc`, { type: 'application/msword' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create material
      await base44.entities.Material.create({
        title: materialData.title,
        description: materialData.description || 'Converted from PDF',
        type: 'pdf',
        file_url: file_url,
        is_template: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowMaterialDialog(false);
      setMaterialData({ title: '', description: '' });
      alert('Document added to materials successfully!');
    },
    onError: () => {
      alert('Failed to save to materials');
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-normal text-gray-900">PDF to Word</h1>
          <div className="w-20" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Area */}
        {!converted && (
          <div className="bg-white border border-gray-300 rounded p-8 mb-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            
            {!pdfFile ? (
              <label htmlFor="pdf-upload" className="block cursor-pointer">
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1">Click to upload PDF</p>
                  <p className="text-sm text-gray-500">or drag and drop</p>
                </div>
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pdfFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {pdfFile && !processing && (
              <Button
                onClick={convertPdfToWord}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Convert to Word
              </Button>
            )}

            {processing && (
              <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Processing...</p>
                    <p className="text-xs text-gray-600">{progress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success & Download */}
        {converted && wordContent && (
          <div className="bg-white border border-gray-300 rounded p-8">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">Conversion complete</h2>
              <p className="text-sm text-gray-600 mb-6">Your Word document is ready</p>

              <div className="flex gap-2 justify-center mb-3 flex-wrap">
                <Button
                  onClick={downloadWord}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Word
                </Button>

                <Button
                  onClick={downloadXML}
                  disabled={downloadingXml}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {downloadingXml ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      MusicXML
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    setMaterialData({ 
                      title: pdfFile.name.replace('.pdf', ''), 
                      description: '' 
                    });
                    setShowMaterialDialog(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Materials
                </Button>
              </div>

              <Button
                onClick={() => {
                  setPdfFile(null);
                  setConverted(false);
                  setWordContent(null);
                }}
                variant="outline"
                className="w-full"
              >
                Convert Another File
              </Button>
            </div>
          </div>
        )}

        {/* Add to Materials Dialog */}
        <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Materials</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={materialData.title}
                  onChange={(e) => setMaterialData({ ...materialData, title: e.target.value })}
                  placeholder="Document title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={materialData.description}
                  onChange={(e) => setMaterialData({ ...materialData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMaterialDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMaterialMutation.mutate()}
                disabled={!materialData.title || saveMaterialMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveMaterialMutation.isLoading ? 'Saving...' : 'Save to Materials'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}