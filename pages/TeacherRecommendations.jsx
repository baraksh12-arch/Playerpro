import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Globe, User, LayoutGrid, List, Pencil, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '../Layout';
import SmartMusicDiscovery from '@/components/recommendations/SmartMusicDiscovery';

export default function TeacherRecommendations() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSmartDiscovery, setShowSmartDiscovery] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [editingRec, setEditingRec] = useState(null);
  const [newRec, setNewRec] = useState({
    title: '',
    artist_name: '',
    youtube_url: '',
    note: '',
    student_id: '',
  });
  const [isDetecting, setIsDetecting] = useState(false);

  const detectVideoInfo = async (url) => {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return;
    
    setIsDetecting(true);
    try {
      // Extract video ID
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      }
      
      if (!videoId) {
        setIsDetecting(false);
        return;
      }

      // Fetch oEmbed data (no API key needed)
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      
      if (data.title) {
        // Parse "Artist - Song" or "Song - Artist" format
        const title = data.title;
        let songTitle = title;
        let artist = data.author_name || '';
        
        // Common separators: " - ", " – ", " | ", " // "
        const separators = [' - ', ' – ', ' | ', ' // '];
        for (const sep of separators) {
          if (title.includes(sep)) {
            const parts = title.split(sep);
            if (parts.length >= 2) {
              artist = parts[0].trim();
              songTitle = parts.slice(1).join(sep).trim();
              break;
            }
          }
        }
        
        // Remove common suffixes like (Official Video), [HD], etc.
        songTitle = songTitle
          .replace(/\s*[\(\[].*?(official|video|audio|lyrics|hd|hq|4k|music video|mv|visualizer).*?[\)\]]/gi, '')
          .trim();
        
        setNewRec(prev => ({
          ...prev,
          title: songTitle || prev.title,
          artist_name: artist || prev.artist_name
        }));
      }
    } catch (error) {
      console.error('Failed to detect video info:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => base44.entities.Recommendation.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.User.filter({ role: 'user' }),
  });

  const createRecMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Recommendation.create({
        ...data,
        student_id: data.student_id === null ? undefined : data.student_id,
        assigned_teacher_id: currentUser?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setShowAddDialog(false);
      setNewRec({ title: '', artist_name: '', youtube_url: '', note: '', student_id: '' });
    },
  });

  const deleteRecMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Recommendation.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  const updateRecMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Recommendation.update(id, {
        ...data,
        student_id: data.student_id === '' || data.student_id === null ? undefined : data.student_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      setEditingRec(null);
    },
  });

  const globalRecs = recommendations.filter(r => !r.student_id);
  const studentRecs = recommendations.filter(r => r.student_id);

  const openEditDialog = (rec) => {
    setEditingRec({
      id: rec.id,
      title: rec.title,
      artist_name: rec.artist_name,
      youtube_url: rec.youtube_url,
      note: rec.note || '',
      student_id: rec.student_id || '',
    });
  };

  const RecommendationCard = ({ rec, student }) => (
    <Card className="border-none shadow-lg">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {student && (
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {student.full_name || 'Unknown'}
                </span>
              </div>
            )}
            <h3 className="font-bold text-gray-900 mb-1">{rec.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{rec.artist_name}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDialog(rec)}
              className="text-gray-500 hover:text-blue-600"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteRecMutation.mutate(rec.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {rec.note && (
          <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">{rec.note}</p>
        )}
        <a
          href={rec.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-600 hover:text-cyan-700 underline"
        >
          {t('page.teacherRecommendations.watch')} →
        </a>
      </CardContent>
    </Card>
  );

  const RecommendationListItem = ({ rec, student }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {student && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium shrink-0">
            {student.full_name || 'Unknown'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{rec.title}</h3>
          <p className="text-sm text-gray-500 truncate">{rec.artist_name}</p>
        </div>
        {rec.note && (
          <p className="text-sm text-gray-500 truncate max-w-xs hidden lg:block">{rec.note}</p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <a
          href={rec.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
        >
          {t('page.teacherRecommendations.watch')}
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEditDialog(rec)}
          className="text-gray-500 hover:text-blue-600"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteRecMutation.mutate(rec.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('page.teacherRecommendations.title')}</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Smart Discovery Button */}
          <Button
            onClick={() => setShowSmartDiscovery(true)}
            className="hidden sm:flex bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-200"
          >
            <Wand2 className="w-5 h-5 mr-2" />
            Smart Discovery
          </Button>
          {/* Desktop Add Button in header */}
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="hidden sm:flex border-2"
          >
            <Plus className="w-5 h-5 mr-2" />
            Manual Add
          </Button>
        </div>
      </div>

      {/* Mobile Buttons - above content */}
      <div className="sm:hidden space-y-2 mb-4">
        <Button
          onClick={() => setShowSmartDiscovery(true)}
          className="w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 py-5 shadow-lg shadow-purple-200"
        >
          <Wand2 className="w-5 h-5 mr-2" />
          Smart Discovery
        </Button>
        <Button
          onClick={() => setShowAddDialog(true)}
          variant="outline"
          className="w-full py-5 border-2"
        >
          <Plus className="w-5 h-5 mr-2" />
          Manual Add
        </Button>
      </div>

      {/* Global Recommendations */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6 text-cyan-600" />
          {t('page.teacherRecommendations.global')}
        </h2>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {globalRecs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {globalRecs.map((rec) => (
              <RecommendationListItem key={rec.id} rec={rec} />
            ))}
          </div>
        )}
        {globalRecs.length === 0 && (
          <p className="text-gray-500 text-center py-8">{t('page.teacherRecommendations.noRecommendations')}</p>
        )}
      </div>

      {/* Student-Specific Recommendations */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          {t('page.teacherRecommendations.studentSpecific')}
        </h2>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentRecs.map((rec) => {
              const student = students.find(s => s.id === rec.student_id);
              return <RecommendationCard key={rec.id} rec={rec} student={student} />;
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {studentRecs.map((rec) => {
              const student = students.find(s => s.id === rec.student_id);
              return <RecommendationListItem key={rec.id} rec={rec} student={student} />;
            })}
          </div>
        )}
        {studentRecs.length === 0 && (
          <p className="text-gray-500 text-center py-8">{t('page.teacherRecommendations.noRecommendations')}</p>
        )}
      </div>

      {/* Add Recommendation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('page.teacherRecommendations.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title-input">{t('page.teacherRecommendations.songTitle')} *</Label>
              <Input
                id="title-input"
                value={newRec.title}
                onChange={(e) => setNewRec({ ...newRec, title: e.target.value })}
                placeholder={t('page.teacherRecommendations.songTitlePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="artist-input">{t('page.teacherRecommendations.artist')} *</Label>
              <Input
                id="artist-input"
                value={newRec.artist_name}
                onChange={(e) => setNewRec({ ...newRec, artist_name: e.target.value })}
                placeholder={t('page.teacherRecommendations.artistPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="youtube-url-input">{t('page.teacherRecommendations.youtubeUrl')} *</Label>
              <div className="flex gap-2">
                <Input
                  id="youtube-url-input"
                  value={newRec.youtube_url}
                  onChange={(e) => setNewRec({ ...newRec, youtube_url: e.target.value })}
                  onBlur={(e) => detectVideoInfo(e.target.value)}
                  placeholder={t('page.teacherRecommendations.youtubeUrlPlaceholder')}
                  className="flex-1"
                />
                {isDetecting && <Loader2 className="w-5 h-5 animate-spin text-cyan-500 self-center" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">Title & artist will auto-detect when you paste a URL</p>
            </div>
            <div>
              <Label>{t('page.teacherRecommendations.student')}</Label>
              <Select
                value={newRec.student_id}
                onValueChange={(value) => setNewRec({ ...newRec, student_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('page.teacherRecommendations.studentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note-textarea">{t('page.teacherRecommendations.note')}</Label>
              <Textarea
                id="note-textarea"
                value={newRec.note}
                onChange={(e) => setNewRec({ ...newRec, note: e.target.value })}
                placeholder={t('page.teacherRecommendations.notePlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createRecMutation.mutate(newRec)}
              disabled={!newRec.title || !newRec.artist_name || !newRec.youtube_url}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Music Discovery */}
      {showSmartDiscovery && (
        <SmartMusicDiscovery
          students={students}
          currentUser={currentUser}
          onClose={() => setShowSmartDiscovery(false)}
        />
      )}

      {/* Edit Recommendation Dialog */}
      <Dialog open={!!editingRec} onOpenChange={(open) => !open && setEditingRec(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recommendation</DialogTitle>
          </DialogHeader>
          {editingRec && (
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('page.teacherRecommendations.songTitle')} *</Label>
                <Input
                  value={editingRec.title}
                  onChange={(e) => setEditingRec({ ...editingRec, title: e.target.value })}
                  placeholder={t('page.teacherRecommendations.songTitlePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('page.teacherRecommendations.artist')} *</Label>
                <Input
                  value={editingRec.artist_name}
                  onChange={(e) => setEditingRec({ ...editingRec, artist_name: e.target.value })}
                  placeholder={t('page.teacherRecommendations.artistPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('page.teacherRecommendations.youtubeUrl')} *</Label>
                <Input
                  value={editingRec.youtube_url}
                  onChange={(e) => setEditingRec({ ...editingRec, youtube_url: e.target.value })}
                  placeholder={t('page.teacherRecommendations.youtubeUrlPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('page.teacherRecommendations.student')}</Label>
                <Select
                  value={editingRec.student_id || ''}
                  onValueChange={(value) => setEditingRec({ ...editingRec, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('page.teacherRecommendations.studentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('page.teacherRecommendations.note')}</Label>
                <Textarea
                  value={editingRec.note}
                  onChange={(e) => setEditingRec({ ...editingRec, note: e.target.value })}
                  placeholder={t('page.teacherRecommendations.notePlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRec(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateRecMutation.mutate({ id: editingRec.id, data: editingRec })}
              disabled={!editingRec?.title || !editingRec?.artist_name || !editingRec?.youtube_url}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}