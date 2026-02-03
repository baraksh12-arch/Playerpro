import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Music as MusicIcon, Video, File, Trash2, Eye, List, Grid, ArrowUpDown, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import InstrumentSelector from '../components/management/InstrumentSelector';
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
import PDFViewer from '../components/materials/PDFViewer';
import ImageViewer from '../components/materials/ImageViewer';
import { useI18n } from '../Layout';

export default function TeacherMaterials() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMaterial, setViewMaterial] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('name');
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    type: 'note',
    file_url: '',
    embed_url: '',
    tags: '',
    instrument: '',
    is_private: false,
  });
  const [editingMaterial, setEditingMaterial] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allMaterials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  // Filter materials based on instrument and privacy
  const materials = allMaterials.filter(material => {
    // If private, only show if user created it
    if (material.is_private && material.created_by !== currentUser?.email) {
      return false;
    }
    
    // If material has no instrument or "All Instruments", show to everyone
    if (!material.instrument || material.instrument === 'All Instruments') {
      return true;
    }
    
    // Show if teacher's instrument matches material's instrument
    return material.instrument === currentUser?.instrument;
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data) => {
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await base44.entities.Material.create({
        ...data,
        tags: tagsArray,
        is_template: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowAddDialog(false);
      setNewMaterial({ title: '', description: '', type: 'note', file_url: '', embed_url: '', tags: '', instrument: '', is_private: false });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Material.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const tagsArray = typeof data.tags === 'string' 
        ? data.tags.split(',').map(t => t.trim()).filter(Boolean) 
        : data.tags;
      await base44.entities.Material.update(id, {
        ...data,
        tags: tagsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditingMaterial(null);
    },
  });

  const openEditDialog = (material) => {
    setEditingMaterial({
      id: material.id,
      title: material.title,
      description: material.description || '',
      type: material.type,
      file_url: material.file_url || '',
      embed_url: material.embed_url || '',
      tags: Array.isArray(material.tags) ? material.tags.join(', ') : '',
      instrument: material.instrument || '',
      level: material.level,
      is_private: material.is_private || false,
    });
  };

  const canEditMaterial = (material) => {
    return material.created_by === currentUser?.email;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewMaterial({ ...newMaterial, file_url });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-6 h-6" />;
      case 'audio':
        return <MusicIcon className="w-6 h-6" />;
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'image':
        return <FileText className="w-6 h-6" />; // Using FileText for image as a generic file icon, can be changed to Image if an icon exists
      case 'note':
        return <File className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pdf':
        return 'from-red-100 to-pink-100 text-red-600';
      case 'audio':
        return 'from-purple-100 to-violet-100 text-purple-600';
      case 'video':
        return 'from-blue-100 to-cyan-100 text-blue-600';
      case 'image':
        return 'from-yellow-100 to-orange-100 text-yellow-600';
      case 'note':
        return 'from-green-100 to-emerald-100 text-green-600';
      default:
        return 'from-gray-100 to-slate-100 text-gray-600';
    }
  };

  const sortedMaterials = [...materials].sort((a, b) => {
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'tags') {
      const tagsA = a.tags?.[0] || '';
      const tagsB = b.tags?.[0] || '';
      return tagsA.localeCompare(tagsB);
    }
    return 0;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('page.teacherMaterials.title')}</h1>
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 sm:w-40">
              <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('page.teacherMaterials.nameAZ')}</SelectItem>
              <SelectItem value="tags">{t('page.teacherMaterials.sortBy')} Tags</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
          {/* Desktop Add Button in header */}
          <Link to={createPageUrl('TeacherChartFinder')}>
            <Button
              variant="outline"
              className="hidden sm:flex border-cyan-500/50 text-cyan-600 hover:bg-cyan-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Chart Finder
            </Button>
          </Link>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="hidden sm:flex bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('page.teacherMaterials.uploadMaterial')}
          </Button>
        </div>
      </div>

      {/* Mobile Buttons - above content */}
      <div className="sm:hidden mb-4 space-y-2">
        <Link to={createPageUrl('TeacherChartFinder')} className="block">
          <Button
            variant="outline"
            className="w-full border-cyan-500/50 text-cyan-600 hover:bg-cyan-50 py-5"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Chart Finder
          </Button>
        </Link>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 py-5"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('page.teacherMaterials.uploadMaterial')}
        </Button>
      </div>

      {viewMode === 'list' ? (
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherMaterials.type')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherMaterials.materialTitle')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherMaterials.description')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherMaterials.targetInstrument')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.level')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherMaterials.tags')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherStudents.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedMaterials.map((material, index) => (
                  <tr 
                    key={material.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className={`w-10 h-10 bg-gradient-to-br ${getTypeColor(material.type)} rounded-lg flex items-center justify-center`}>
                        {getTypeIcon(material.type)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900">{material.title}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-600 line-clamp-2">{material.description || '-'}</p>
                    </td>
                    <td className="py-4 px-4">
                      {material.instrument ? (
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
                          {material.instrument}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                      {material.is_private && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Private
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {material.level ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Level {material.level}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {material.tags && material.tags.length > 0 ? (
                          material.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        {(material.type === 'pdf' || material.type === 'image' || material.type === 'audio' || material.type === 'video') && material.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMaterial(material)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {canEditMaterial(material) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(material)}
                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMaterialMutation.mutate(material.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedMaterials.map((material) => (
            <Card key={material.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getTypeColor(material.type)} rounded-xl flex items-center justify-center`}>
                    {getTypeIcon(material.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">{material.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{material.description}</p>
                    {material.level && (
                      <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Level {material.level}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {(material.type === 'pdf' || material.type === 'image' || material.type === 'audio' || material.type === 'video') && material.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMaterial(material)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {canEditMaterial(material) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(material)}
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMaterialMutation.mutate(material.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {material.tags && material.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {material.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('page.teacherMaterials.dialogUploadTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('page.teacherMaterials.materialTitle')} *</Label>
              <Input
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                placeholder={t('page.teacherMaterials.materialTitlePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('page.teacherMaterials.description')}</Label>
              <Textarea
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                placeholder={t('page.teacherMaterials.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('page.teacherMaterials.type')} *</Label>
              <Select
                value={newMaterial.type}
                onValueChange={(value) => setNewMaterial({ ...newMaterial, type: value, file_url: '', embed_url: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image (JPG, PNG, etc)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newMaterial.type === 'pdf' || newMaterial.type === 'audio' || newMaterial.type === 'image' || newMaterial.type === 'video') && (
              <div>
                <Label>{t('page.teacherMaterials.uploadFile')} *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    accept={
                      newMaterial.type === 'pdf' 
                        ? '.pdf' 
                        : newMaterial.type === 'audio'
                        ? 'audio/*'
                        : newMaterial.type === 'video'
                        ? 'video/*'
                        : 'image/*'
                    }
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-gray-600">{t('page.teacherMaterials.uploading')}</p>}
                </div>
                {newMaterial.file_url && (
                  <p className="text-sm text-green-600 mt-2">✓ File uploaded</p>
                )}
              </div>
            )}

            <div>
              <Label>{t('page.teacherMaterials.targetLevel')}</Label>
              <Select
                value={newMaterial.level?.toString() || ''}
                onValueChange={(value) => setNewMaterial({ ...newMaterial, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('page.teacherMaterials.allLevels')} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('page.teacherMaterials.tags')}</Label>
              <Input
                value={newMaterial.tags}
                onChange={(e) => setNewMaterial({ ...newMaterial, tags: e.target.value })}
                placeholder={t('page.teacherMaterials.tagsPlaceholder')}
              />
            </div>

            <div>
              <Label>{t('page.teacherMaterials.targetInstrument')}</Label>
              <div className="flex gap-2">
                <InstrumentSelector
                  value={newMaterial.instrument}
                  onChange={(value) => setNewMaterial({ ...newMaterial, instrument: value })}
                />
                <Button
                  variant="outline"
                  onClick={() => setNewMaterial({ ...newMaterial, instrument: 'All Instruments' })}
                  className={newMaterial.instrument === 'All Instruments' ? 'bg-blue-50' : ''}
                >
                  {t('page.teacherMaterials.allInstruments')}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_private"
                checked={newMaterial.is_private}
                onCheckedChange={(checked) => setNewMaterial({ ...newMaterial, is_private: checked })}
              />
              <Label htmlFor="is_private" className="cursor-pointer">
                {t('page.teacherMaterials.private')} ({t('page.teacherMaterials.privateDesc')})
              </Label>
            </div>
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createMaterialMutation.mutate(newMaterial)}
              disabled={!newMaterial.title || createMaterialMutation.isLoading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {createMaterialMutation.isLoading ? t('page.teacherMaterials.uploading') : t('page.teacherMaterials.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('page.teacherMaterials.materialTitle')} *</Label>
                <Input
                  value={editingMaterial.title}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, title: e.target.value })}
                  placeholder={t('page.teacherMaterials.materialTitlePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('page.teacherMaterials.description')}</Label>
                <Textarea
                  value={editingMaterial.description}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                  placeholder={t('page.teacherMaterials.descriptionPlaceholder')}
                  rows={3}
                />
              </div>
              <div>
                <Label>{t('page.teacherMaterials.targetLevel')}</Label>
                <Select
                  value={editingMaterial.level?.toString() || ''}
                  onValueChange={(value) => setEditingMaterial({ ...editingMaterial, level: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('page.teacherMaterials.allLevels')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Levels</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('page.teacherMaterials.tags')}</Label>
                <Input
                  value={editingMaterial.tags}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, tags: e.target.value })}
                  placeholder={t('page.teacherMaterials.tagsPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('page.teacherMaterials.targetInstrument')}</Label>
                <div className="flex gap-2">
                  <InstrumentSelector
                    value={editingMaterial.instrument}
                    onChange={(value) => setEditingMaterial({ ...editingMaterial, instrument: value })}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setEditingMaterial({ ...editingMaterial, instrument: 'All Instruments' })}
                    className={editingMaterial.instrument === 'All Instruments' ? 'bg-blue-50' : ''}
                  >
                    {t('page.teacherMaterials.allInstruments')}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_is_private"
                  checked={editingMaterial.is_private}
                  onCheckedChange={(checked) => setEditingMaterial({ ...editingMaterial, is_private: checked })}
                />
                <Label htmlFor="edit_is_private" className="cursor-pointer">
                  {t('page.teacherMaterials.private')} ({t('page.teacherMaterials.privateDesc')})
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => updateMaterialMutation.mutate({ id: editingMaterial.id, data: editingMaterial })}
              disabled={!editingMaterial?.title || updateMaterialMutation.isLoading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Material Dialog */}
      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {viewMaterial && (
            <>
              <DialogHeader>
                <DialogTitle>{viewMaterial.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {viewMaterial.description && (
                  <p className="text-gray-600">{viewMaterial.description}</p>
                )}

                {/* PDF Viewer */}
                {viewMaterial.type === 'pdf' && viewMaterial.file_url && (
                  <PDFViewer 
                    url={viewMaterial.file_url}
                    title={viewMaterial.title}
                  />
                )}

                {/* Image Viewer */}
                {viewMaterial.type === 'image' && viewMaterial.file_url && (
                  <ImageViewer 
                    url={viewMaterial.file_url}
                    title={viewMaterial.title}
                  />
                )}

                {/* Audio Player */}
                {viewMaterial.type === 'audio' && viewMaterial.file_url && (
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-4">
                      <div className="flex items-center gap-3">
                        <MusicIcon className="w-6 h-6 text-white" />
                        <div className="text-white">
                          <p className="font-semibold">{viewMaterial.title}</p>
                          <p className="text-sm opacity-90">Audio Player</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <audio 
                        src={viewMaterial.file_url} 
                        controls 
                        controlsList="nodownload"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Video Player */}
                {viewMaterial.type === 'video' && viewMaterial.file_url && (
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
                      <div className="flex items-center gap-3">
                        <Video className="w-6 h-6 text-white" />
                        <div className="text-white">
                          <p className="font-semibold">{viewMaterial.title}</p>
                          <p className="text-sm opacity-90">Video Player</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-black">
                      <video 
                        src={viewMaterial.file_url} 
                        controls 
                        controlsList="nodownload"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Note */}
                {viewMaterial.type === 'note' && (
                  <div className="bg-yellow-50 rounded-lg p-4 whitespace-pre-wrap">
                    {viewMaterial.description}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}