import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Search, Upload, Link2, Music, FileText, CheckCircle2, Loader2, Download, ExternalLink, X, Star, Library, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherChartFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [activeVersion, setActiveVersion] = useState(0);
  const [versions, setVersions] = useState([]);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [isUploadingSongbook, setIsUploadingSongbook] = useState(false);
  const [songbookProgress, setSongbookProgress] = useState('');

  // Build slug from title
  const buildSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Search for charts
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setResults(null);
    setSelectedChart(null);
    setPreviewUrl(null);
    
    try {
      const slug = buildSlug(searchQuery);
      const searchLower = searchQuery.toLowerCase().trim();
      
      // 1. Search song index first (for songbook pages)
      let indexMatches = [];
      try {
        const allIndex = await base44.entities.SongIndex.filter({});
        indexMatches = allIndex.filter(idx => 
          idx.song_title?.toLowerCase().includes(searchLower) ||
          idx.song_title_normalized?.includes(searchLower)
        );
      } catch (e) {
        // Index might not exist yet
      }
      
      // 2. Search local materials library
      const localCharts = await base44.entities.Material.filter({});
      const matchingLocal = localCharts.filter(m => 
        (m.title?.toLowerCase().includes(searchLower) ||
         m.description?.toLowerCase().includes(searchLower)) &&
        (m.type === 'pdf' || m.type === 'image') &&
        !m.tags?.includes('songbook') // Exclude full songbooks from direct results
      );

      // 2. Search OpenJazzBook - they have verified URLs
      // Real Book scans are at: /assets/realbooks/the-real-book-1/{page}.png
      // Lead sheets at: /assets/themes/{slug}/{slug}-lead-sheet.pdf
      
      // 3. Use AI to find more sources and song info
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find "${searchQuery}" jazz standard lead sheet/chart.

Return ONLY verified, working URLs from these sources:
1. OpenJazzBook.com (check https://openjazzbook.com/${slug})
2. IMSLP.org (for public domain)
3. MuseScore.com (free scores)

Return JSON:
{
  "title": "correct song title",
  "composer": "composer name",
  "style": "swing/bossa/ballad/blues",
  "key": "original key",
  "form": "AABA/Blues/etc",
  "isPublicDomain": true/false,
  "charts": [
    {
      "title": "chart name",
      "source": "source name",
      "url": "direct link to PDF or PNG",
      "pageUrl": "page to view versions",
      "type": "pdf" or "image",
      "key": "C/Bb/Eb",
      "quality": 1-100
    }
  ]
}

IMPORTANT: Only include URLs you are confident exist. OpenJazzBook uses:
- PDF: https://openjazzbook.com/assets/themes/${slug}/${slug}-lead-sheet.pdf
- Page: https://openjazzbook.com/${slug}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            composer: { type: "string" },
            style: { type: "string" },
            key: { type: "string" },
            form: { type: "string" },
            isPublicDomain: { type: "boolean" },
            charts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  url: { type: "string" },
                  pageUrl: { type: "string" },
                  type: { type: "string" },
                  key: { type: "string" },
                  quality: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Build final results
      const charts = [];

      // Add indexed songbook pages first (highest priority - user's own uploads)
      indexMatches.forEach(idx => {
        charts.push({
          id: `idx-${idx.id}`,
          title: idx.song_title,
          composer: idx.composer,
          source: idx.source_title || 'Your Songbook',
          url: idx.source_url,
          pageNumber: idx.page_number,
          type: 'pdf',
          key: idx.key,
          quality: 100,
          isIndexed: true,
          indexId: idx.id,
          extractedMaterialId: idx.extracted_material_id
        });
      });

      // Add local single charts
      matchingLocal.forEach(m => {
        charts.push({
          id: m.id,
          title: m.title,
          source: 'Your Library',
          url: m.file_url,
          type: m.type,
          quality: 100,
          isLocal: true
        });
      });

      // OpenJazzBook - we need to fetch the actual page to get all version URLs
      // because Real Book scans use page numbers, not predictable slug-based URLs
      const ojbPageUrl = `https://openjazzbook.com/${slug}`;
      const ojbPngUrl = `https://openjazzbook.com/assets/themes/${slug}/${slug}-lead-sheet_1_2.png`;

      // Default to just the theme version, will be enhanced when user selects this chart
      charts.push({
        id: `ojb-${slug}`,
        title: `${response.title || searchQuery} - Lead Sheet`,
        source: 'OpenJazzBook',
        url: ojbPngUrl,
        pageUrl: ojbPageUrl,
        type: 'image',
        key: 'C',
        quality: 95,
        slug: slug, // Store slug for fetching versions later
        versions: [] // Will be populated when chart is selected
      });

      // Add AI-found charts (filtered for valid URLs)
      if (response.charts?.length) {
        response.charts.forEach((c, i) => {
          if (c.url && !charts.some(x => x.url === c.url)) {
            charts.push({
              id: `ai-${i}`,
              ...c,
              quality: c.quality || 70
            });
          }
        });
      }

      setResults({
        title: response.title || searchQuery,
        composer: response.composer,
        style: response.style,
        key: response.key,
        form: response.form,
        isPublicDomain: response.isPublicDomain,
        slug,
        charts
      });

    } catch (error) {
      console.error('Search error:', error);
      setResults({ error: 'Search failed. Please try again.' });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Select chart and show preview
  const handleSelectChart = useCallback(async (chart) => {
    setSelectedChart(chart);
    setPreviewUrl(null);
    setPreviewError(false);
    setPreviewLoading(true);
    setActiveVersion(0);

    try {
      // For OpenJazzBook, fetch the page to get all version image URLs
      if (chart.source === 'OpenJazzBook' && chart.slug) {
        try {
          // Use backend function to scrape the actual PNG URLs from the page
          const response = await base44.functions.invoke('fetchOpenJazzBookVersions', {
            slug: chart.slug
          });

          if (response.data?.success && response.data?.versions?.length > 0) {
            setVersions(response.data.versions);
            setPreviewUrl(response.data.versions[0].url);
            setPreviewType('image');
          } else {
            // Fallback to default URL
            setVersions([{ label: 'C (v1)', url: chart.url }]);
            setPreviewUrl(chart.url);
            setPreviewType('image');
          }
        } catch (e) {
          console.log('Failed to fetch OJB versions, using default:', e);
          setVersions([{ label: 'C (v1)', url: chart.url }]);
          setPreviewUrl(chart.url);
          setPreviewType('image');
        }
      } else {
        // For other charts, use provided versions or single URL
        setVersions(chart.versions || []);
        
        // Determine file type from URL
        const url = chart.url || '';
        let type = chart.type;
        if (!type) {
          if (url.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
            type = 'image';
          } else {
            type = 'pdf';
          }
        }
        
        setPreviewUrl(url);
        setPreviewType(type);
      }
    } catch (e) {
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Switch between versions (transpositions)
  const handleVersionChange = useCallback((index) => {
    if (versions[index]) {
      setActiveVersion(index);
      const url = versions[index].url;
      setPreviewUrl(url);
      // Detect type from URL
      if (url.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
        setPreviewType('image');
      } else {
        setPreviewType('pdf');
      }
      setPreviewError(false);
    }
  }, [versions]);

  // Import chart to library
  const handleImport = useCallback(async (chart) => {
    if (chart.isLocal) return;
    
    setImportingId(chart.id);
    
    try {
      // For indexed songbook pages, extract just that page
      if (chart.isIndexed && chart.pageNumber) {
        const response = await base44.functions.invoke('extractSongbookPage', {
          songbookUrl: chart.url,
          pageNumber: chart.pageNumber,
          songTitle: chart.title,
          composer: chart.composer,
          key: chart.key
        });

        if (response.data?.success) {
          // Update the index entry with extracted material ID
          try {
            await base44.entities.SongIndex.update(chart.indexId, {
              extracted_material_id: response.data.materialId
            });
          } catch (e) {}
          
          setImportSuccess(chart.id);
          setTimeout(() => setImportSuccess(null), 3000);
        }
      }
      // For OpenJazzBook, import the currently selected version
      else if (chart.source === 'OpenJazzBook') {
        // Import the currently viewed version URL (PNG image)
        const currentVersionUrl = versions[activeVersion]?.url || previewUrl || chart.url;
        const currentVersionKey = versions[activeVersion]?.label || 'C';

        console.log('Importing OpenJazzBook chart:', currentVersionUrl);
        
        const response = await base44.functions.invoke('importChartFromUrl', {
          url: currentVersionUrl,
          title: `${results?.title || chart.title} (${currentVersionKey})`,
          composer: results?.composer,
          key: currentVersionKey,
          style: results?.style
        });

        console.log('Import response:', response);

        if (response.data?.success) {
          setImportSuccess(chart.id);
          setTimeout(() => setImportSuccess(null), 3000);
        } else {
          console.error('Import failed:', response.data?.error);
        }
      } else {
        // Import single chart via URL (PDF or image)
        console.log('Importing chart from URL:', chart.url, 'type:', chart.type);
        
        const response = await base44.functions.invoke('importChartFromUrl', {
          url: chart.url,
          title: chart.title,
          key: chart.key
        });

        console.log('Import response:', response);

        if (response.data?.success) {
          setImportSuccess(chart.id);
          setTimeout(() => setImportSuccess(null), 3000);
        } else {
          console.error('Import failed:', response.data?.error);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImportingId(null);
    }
  }, [results, versions, activeVersion, previewUrl]);

  // Upload single chart file
  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Analyze with AI
      let analysis = {};
      try {
        analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this music chart. Extract: title, composer, key, style. Return JSON.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              composer: { type: "string" },
              key: { type: "string" },
              style: { type: "string" }
            }
          }
        });
      } catch (e) {}
      
      await base44.entities.Material.create({
        title: analysis?.title || file.name.replace(/\.[^/.]+$/, ''),
        description: `${analysis?.composer ? `By ${analysis.composer}\n` : ''}${analysis?.key ? `Key: ${analysis.key}\n` : ''}Uploaded chart`,
        type: file.type === 'application/pdf' ? 'pdf' : 'image',
        file_url,
        tags: ['chart', 'lead sheet', analysis?.style, analysis?.key].filter(Boolean),
        is_template: true,
        is_private: false,
      });
      
      setImportSuccess('upload');
      setTimeout(() => setImportSuccess(null), 3000);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }, []);

  // Upload songbook - indexes all songs for search
  const handleUploadSongbook = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingSongbook(true);
    setSongbookProgress('Uploading...');
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setSongbookProgress('Scanning songs...');
      
      // Process songbook and index all songs
      const response = await base44.functions.invoke('processSongbook', {
        file_url,
        filename: file.name
      });

      if (response.data?.success && response.data?.songs?.length) {
        setSongbookProgress(`Creating index for ${response.data.songs.length} songs...`);
        
        // Create index entries for each song
        for (const song of response.data.songs) {
          await base44.entities.SongIndex.create({
            song_title: song.songTitle,
            song_title_normalized: song.songTitle.toLowerCase().replace(/[^a-z0-9]/g, ''),
            composer: song.composer || '',
            key: song.key || '',
            page_number: song.page,
            source_type: 'songbook',
            source_url: file_url,
            source_title: song.songbookTitle,
            source_material_id: response.data.songbookId
          });
        }
        
        setImportSuccess('songbook');
        setSongbookProgress(`Indexed ${response.data.songs.length} songs!`);
        setTimeout(() => {
          setImportSuccess(null);
          setSongbookProgress('');
        }, 3000);
      } else {
        setSongbookProgress('Could not index songs');
        setTimeout(() => setSongbookProgress(''), 3000);
      }
    } catch (err) {
      console.error('Songbook upload error:', err);
      setSongbookProgress('Upload failed');
      setTimeout(() => setSongbookProgress(''), 3000);
    } finally {
      setIsUploadingSongbook(false);
      e.target.value = '';
    }
  }, []);

  // Import from URL
  const handleImportFromUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    
    setIsImporting(true);
    
    try {
      const response = await base44.functions.invoke('importChartFromUrl', {
        url: urlInput.trim()
      });

      if (response.data?.success) {
        setUrlInput('');
        setShowUrlInput(false);
        setImportSuccess('url');
        setTimeout(() => setImportSuccess(null), 3000);
      }
    } catch (error) {
      console.error('URL import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [urlInput]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to={createPageUrl('TeacherMaterials')}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">Chart Finder</h1>
                <p className="text-xs text-white/40">Search any jazz standard</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Search & Results */}
            <div className="space-y-6">
              
              {/* Search Box */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search any song (e.g., Autumn Leaves)"
                    className="pl-12 h-14 bg-white/[0.02] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl text-lg"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="flex-1 h-12 bg-white text-black hover:bg-white/90 rounded-xl font-medium"
                  >
                    {isSearching ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</>
                    ) : (
                      <><Search className="w-4 h-4 mr-2" />Find Charts</>
                    )}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <div className={`h-10 flex items-center justify-center gap-2 rounded-xl border transition-all ${
                      isImporting 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-white/[0.02] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}>
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span className="text-xs">{isImporting ? 'Uploading...' : 'Chart'}</span>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleUploadSongbook}
                    />
                    <div className={`h-10 flex items-center justify-center gap-2 rounded-xl border transition-all ${
                      isUploadingSongbook 
                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
                        : 'bg-white/[0.02] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}>
                      {isUploadingSongbook ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                      <span className="text-xs">{isUploadingSongbook ? 'Indexing...' : 'Songbook'}</span>
                    </div>
                  </label>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className={`h-10 rounded-xl ${showUrlInput ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/[0.08]'} text-white/60 hover:text-white`}
                  >
                    <Link2 className="w-4 h-4 mr-1" />
                    <span className="text-xs">URL</span>
                  </Button>
                </div>

                {/* Songbook Progress */}
                {songbookProgress && (
                  <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm text-center">
                    {songbookProgress}
                  </div>
                )}

                {/* URL Input */}
                <AnimatePresence>
                  {showUrlInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste link to PDF or image..."
                        className="h-11 bg-white/[0.02] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                      />
                      <Button
                        onClick={handleImportFromUrl}
                        disabled={!urlInput.trim() || isImporting}
                        className="w-full h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-xl"
                      >
                        {isImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Download className="w-4 h-4 mr-2" />Import</>}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results List */}
              {isSearching && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-white/30 animate-spin mb-4" />
                  <p className="text-white/50">Searching libraries...</p>
                </div>
              )}

              {results?.error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
                  <p className="text-red-400">{results.error}</p>
                </div>
              )}

              {results?.charts && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
                >
                  {/* Song Info Header */}
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{results.title}</h3>
                        {results.composer && <p className="text-sm text-white/50 mt-0.5">by {results.composer}</p>}
                      </div>
                      {results.isPublicDomain && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          Public Domain
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {results.key && <span className="px-2 py-1 rounded bg-white/5 text-white/60 text-xs">Key: {results.key}</span>}
                      {results.style && <span className="px-2 py-1 rounded bg-white/5 text-white/60 text-xs capitalize">{results.style}</span>}
                      {results.form && <span className="px-2 py-1 rounded bg-white/5 text-white/60 text-xs">{results.form}</span>}
                    </div>
                  </div>

                  {/* Charts List */}
                  <div className="divide-y divide-white/[0.04]">
                    {results.charts.map((chart) => (
                      <div
                        key={chart.id}
                        onClick={() => handleSelectChart(chart)}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedChart?.id === chart.id 
                            ? 'bg-white/[0.06]' 
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              chart.isIndexed ? 'bg-amber-500/20' : chart.isLocal ? 'bg-purple-500/20' : chart.source === 'OpenJazzBook' ? 'bg-blue-500/20' : 'bg-white/5'
                            }`}>
                              {chart.isIndexed ? <BookOpen className="w-5 h-5 text-amber-400" /> : chart.isLocal ? <Library className="w-5 h-5 text-purple-400" /> : <FileText className="w-5 h-5 text-white/40" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{chart.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  chart.isIndexed ? 'bg-amber-500/20 text-amber-400' : chart.isLocal ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'
                                }`}>
                                  {chart.isIndexed ? `Page ${chart.pageNumber}` : chart.source}
                                </span>
                                {chart.isIndexed && <span className="text-[10px] text-white/30 truncate max-w-[100px]">{chart.source}</span>}
                                {chart.key && <span className="text-[10px] text-white/30">{chart.key}</span>}
                                {chart.quality && !chart.isIndexed && (
                                  <span className="flex items-center text-[10px] text-amber-400">
                                    <Star className="w-3 h-3 mr-0.5" />{chart.quality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {chart.pageUrl && (
                              <a
                                href={chart.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {!chart.isLocal && !chart.extractedMaterialId && (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleImport(chart); }}
                                disabled={importingId === chart.id}
                                className={`h-8 px-3 text-xs rounded-lg ${
                                  importSuccess === chart.id
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : chart.isIndexed 
                                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                      : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                              >
                                {importingId === chart.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : importSuccess === chart.id ? (
                                  <><CheckCircle2 className="w-3 h-3 mr-1" />Extracted</>
                                ) : chart.isIndexed ? (
                                  <><Download className="w-3 h-3 mr-1" />Extract Page</>
                                ) : (
                                  <><Download className="w-3 h-3 mr-1" />Import</>
                                )}
                              </Button>
                            )}
                            {chart.isLocal && (
                              <span className="text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-400">In Library</span>
                            )}
                            {chart.extractedMaterialId && (
                              <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Extracted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Preview */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden min-h-[600px]">
                {!selectedChart ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                      <Music className="w-10 h-10 text-white/10" />
                    </div>
                    <h3 className="text-lg font-medium text-white/30">Select a chart to preview</h3>
                    <p className="text-sm text-white/20 mt-2 max-w-xs">
                      Click on any result to see a preview here
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Preview Header */}
                    <div className="p-4 border-b border-white/[0.06]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-white">{selectedChart.title}</h3>
                          <p className="text-xs text-white/40">{selectedChart.source}</p>
                        </div>
                        <div className="flex gap-2">
                          {previewUrl && (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedChart(null); setPreviewUrl(null); setVersions([]); }}
                            className="text-white/40 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Version Tabs for transpositions */}
                      {versions.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto pb-1">
                          {versions.map((v, idx) => (
                            <button
                              key={`${v.key}-${idx}`}
                              onClick={() => handleVersionChange(idx)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                                activeVersion === idx
                                  ? 'bg-white text-black'
                                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Preview Content */}
                    <div className="flex-1 p-4 overflow-auto bg-neutral-900">
                      {previewLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
                        </div>
                      ) : previewError ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <p className="text-white/40 mb-4">Preview not available</p>
                          <a
                            href={selectedChart.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                          >
                            Open in new tab
                          </a>
                        </div>
                      ) : previewUrl ? (
                        previewType === 'pdf' ? (
                          <iframe
                            src={selectedChart.pageNumber ? `${previewUrl}#page=${selectedChart.pageNumber}&toolbar=0` : `${previewUrl}#toolbar=0`}
                            className="w-full h-[500px] rounded-lg bg-white"
                            onError={() => setPreviewError(true)}
                          />
                        ) : (
                          <img
                            src={previewUrl}
                            alt={selectedChart.title}
                            className="w-full rounded-lg bg-white"
                            onError={() => setPreviewError(true)}
                          />
                        )
                      ) : null}
                    </div>

                    {/* Preview Actions */}
                    {selectedChart && !selectedChart.isLocal && !selectedChart.extractedMaterialId && (
                      <div className="p-4 border-t border-white/[0.06]">
                        <Button
                          onClick={() => handleImport(selectedChart)}
                          disabled={importingId === selectedChart.id}
                          className={`w-full h-12 rounded-xl font-medium ${
                            importSuccess === selectedChart.id
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : selectedChart.isIndexed
                                ? 'bg-amber-500 text-black hover:bg-amber-400'
                                : 'bg-white text-black hover:bg-white/90'
                          }`}
                        >
                          {importingId === selectedChart.id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{selectedChart.isIndexed ? 'Extracting Page...' : 'Importing...'}</>
                          ) : importSuccess === selectedChart.id ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2" />{selectedChart.isIndexed ? 'Page Extracted!' : 'Added to Library!'}</>
                          ) : selectedChart.isIndexed ? (
                            <><Download className="w-4 h-4 mr-2" />Extract Page {selectedChart.pageNumber}</>
                          ) : (
                            <><Download className="w-4 h-4 mr-2" />Add to My Materials</>
                          )}
                        </Button>
                        {selectedChart.source === 'OpenJazzBook' && versions.length > 0 && (
                          <p className="text-[10px] text-white/30 text-center mt-2">
                            Imports current version ({versions[activeVersion]?.label || 'C'})
                          </p>
                        )}
                        {selectedChart.isIndexed && (
                          <p className="text-[10px] text-amber-400/60 text-center mt-2">
                            Extracts only page {selectedChart.pageNumber} from {selectedChart.source}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {(importSuccess === 'upload' || importSuccess === 'url' || importSuccess === 'songbook') && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-medium shadow-xl flex items-center gap-2 ${
              importSuccess === 'songbook' ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {importSuccess === 'upload' ? 'Chart uploaded!' : importSuccess === 'songbook' ? 'Songbook indexed!' : 'Chart imported!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}