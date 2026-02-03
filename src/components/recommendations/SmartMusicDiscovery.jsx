import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Loader2,
  Play,
  Plus,
  Check,
  X,
  Music2,
  User,
  ExternalLink,
  Wand2,
  ChevronDown,
  Clock,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Helper to extract YouTube video ID
const extractVideoId = (url) => {
  if (!url) return null;
  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('v=')) {
    return url.split('v=')[1]?.split('&')[0];
  }
  return null;
};

// Video Result Card Component
const VideoResultCard = ({ video, isSelected, onToggle, onPreview }) => {
  const videoId = extractVideoId(video.youtube_url);
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "group relative bg-white rounded-2xl overflow-hidden transition-all duration-300",
        "border-2 shadow-sm hover:shadow-xl",
        isSelected 
          ? "border-blue-500 ring-4 ring-blue-100" 
          : "border-gray-100 hover:border-gray-200"
      )}
    >
      {/* Selection Badge */}
      <div 
        className={cn(
          "absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
          isSelected 
            ? "bg-blue-500 text-white scale-100" 
            : "bg-black/40 text-white scale-90 opacity-0 group-hover:opacity-100"
        )}
      >
        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </div>

      {/* Thumbnail */}
      <div 
        className="relative aspect-video bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onToggle(video)}
      >
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Music2 className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(video);
            }}
            className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg"
          >
            <Play className="w-6 h-6 text-gray-800 ml-1" />
          </button>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded-md font-medium">
            {video.duration}
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => onToggle(video)}
      >
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug mb-1">
          {video.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">
          {video.artist_name}
        </p>
        
        {/* Match indicator */}
        {video.match_score && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${video.match_score}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  video.match_score >= 90 ? "bg-emerald-500" :
                  video.match_score >= 70 ? "bg-blue-500" :
                  "bg-amber-500"
                )}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {video.match_score}% match
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Video Preview Modal
const VideoPreviewModal = ({ video, onClose }) => {
  const videoId = extractVideoId(video?.youtube_url);
  
  if (!video) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="aspect-video">
          {videoId && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        
        <div className="p-4 bg-gray-900">
          <h3 className="font-semibold text-white truncate">{video.title}</h3>
          <p className="text-sm text-gray-400">{video.artist_name}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function SmartMusicDiscovery({ students, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const textareaRef = useRef(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // AI-powered search using InvokeLLM
  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedVideos([]);

    try {
      // Use AI to interpret the query and search for best YouTube videos
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a music recommendation expert helping a guitar/music teacher find the best YouTube videos for their students.

Teacher's Request: "${searchQuery}"

Based on this request, find the 3 BEST YouTube videos that match. Consider:
- If they mention a specific song/artist, find the best quality version (official video, good audio)
- If they describe a style/genre/technique, find exemplary videos that teach or demonstrate it
- Prioritize videos with good educational value for music students
- Consider video quality, view count, and relevance

For each video, provide:
1. The exact YouTube URL (must be real, working YouTube URLs)
2. Song/Video title
3. Artist/Channel name  
4. A brief note about why this is a good recommendation
5. Estimated video duration (e.g., "3:45")
6. Match score (0-100) indicating how well it matches the teacher's request

IMPORTANT: Only return real YouTube URLs that actually exist. Use your knowledge of popular music videos.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            videos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  youtube_url: { type: "string" },
                  title: { type: "string" },
                  artist_name: { type: "string" },
                  note: { type: "string" },
                  duration: { type: "string" },
                  match_score: { type: "number" }
                }
              }
            },
            search_interpretation: { type: "string" }
          }
        }
      });

      if (result?.videos && Array.isArray(result.videos)) {
        setSearchResults(result.videos.slice(0, 3));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle video selection
  const toggleVideoSelection = (video) => {
    setSelectedVideos(prev => {
      const isSelected = prev.some(v => v.youtube_url === video.youtube_url);
      if (isSelected) {
        return prev.filter(v => v.youtube_url !== video.youtube_url);
      } else {
        return [...prev, video];
      }
    });
  };

  // Add selected videos as recommendations
  const handleAddRecommendations = async () => {
    if (selectedVideos.length === 0) return;
    
    setIsAdding(true);
    setAddedCount(0);

    try {
      for (const video of selectedVideos) {
        await base44.entities.Recommendation.create({
          title: video.title,
          artist_name: video.artist_name,
          youtube_url: video.youtube_url,
          note: video.note || '',
          student_id: targetStudentId || undefined,
          assigned_teacher_id: currentUser?.id,
        });
        setAddedCount(prev => prev + 1);
      }
      
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      
      // Success animation delay then close
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      console.error('Failed to add recommendations:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const isAddingComplete = addedCount === selectedVideos.length && addedCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
                <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Smart Discovery</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">AI-powered music recommendations</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Search Section */}
          <div className="mb-8">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Describe what you're looking for...

Examples:
• A good fingerpicking song for beginners
• Blues solo by BB King
• Spanish guitar flamenco piece
• Something to practice pentatonic scales"
                className="min-h-[140px] sm:min-h-[160px] text-base sm:text-lg p-4 sm:p-6 pr-14 rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 resize-none bg-white shadow-sm transition-all"
              />
              
              {/* Search button inside textarea */}
              <div className="absolute bottom-4 right-4">
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className={cn(
                    "rounded-xl px-4 sm:px-6 h-10 sm:h-11 font-semibold shadow-lg transition-all",
                    "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600",
                    "hover:from-violet-600 hover:via-purple-600 hover:to-indigo-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Find</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mt-4">
              {['Fingerstyle acoustic', 'Jazz standards', 'Rock riffs for beginners', 'Classical etudes'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full hover:border-purple-300 hover:text-purple-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white animate-bounce" />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Discovering perfect matches...</p>
                <p className="text-sm text-gray-400 mt-1">AI is searching for the best videos</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          <AnimatePresence>
            {searchResults.length > 0 && !isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Results
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      Select videos to add
                    </span>
                  </h2>
                  {selectedVideos.length > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {selectedVideos.length} selected
                    </motion.span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {searchResults.map((video, index) => (
                    <VideoResultCard
                      key={video.youtube_url || index}
                      video={video}
                      isSelected={selectedVideos.some(v => v.youtube_url === video.youtube_url)}
                      onToggle={toggleVideoSelection}
                      onPreview={setPreviewVideo}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!isSearching && searchResults.length === 0 && searchQuery.trim() === '' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Discover Music</h3>
              <p className="text-gray-500 max-w-sm">
                Describe what you're looking for and AI will find the perfect YouTube videos for your students
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <AnimatePresence>
        {selectedVideos.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                {/* Student Selector */}
                <div className="flex-1 min-w-0">
                  <Select
                    value={targetStudentId}
                    onValueChange={setTargetStudentId}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <SelectValue placeholder="Assign to all students" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Students (Global)</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name || student.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Button */}
                <Button
                  onClick={handleAddRecommendations}
                  disabled={isAdding || isAddingComplete}
                  className={cn(
                    "h-12 px-6 sm:px-8 rounded-xl font-semibold text-base transition-all",
                    isAddingComplete
                      ? "bg-emerald-500 hover:bg-emerald-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  )}
                >
                  {isAddingComplete ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Added!
                    </>
                  ) : isAdding ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding {addedCount}/{selectedVideos.length}
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Add {selectedVideos.length} Recommendation{selectedVideos.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideo && (
          <VideoPreviewModal 
            video={previewVideo} 
            onClose={() => setPreviewVideo(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}