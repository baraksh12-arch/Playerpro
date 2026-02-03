import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Music, FileText, Video, BookOpen, FileIcon, ExternalLink, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/Layout';
import PDFViewer from '../components/materials/PDFViewer';
import ImageViewer from '../components/materials/ImageViewer';

export default function StudentMaterials() {
  const { t } = useI18n();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [filterTag, setFilterTag] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: studentMaterials = [] } = useQuery({
    queryKey: ['studentMaterials', currentUser?.id],
    queryFn: () => base44.entities.StudentMaterial.filter({ student_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'image':
        return <FileText className="w-5 h-5" />;
      case 'note':
        return <BookOpen className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
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

  // Materials assigned by teacher
  const assignedMaterials = studentMaterials.map(sm => {
    const material = materials.find(m => m.id === sm.material_id);
    return { ...sm, material, isAssigned: true };
  }).filter(sm => sm.material);

  // Materials matching student's level (not already assigned)
  const assignedMaterialIds = new Set(assignedMaterials.map(sm => sm.material_id));
  const levelMaterials = materials
    .filter(m => m.level === currentUser?.level && !assignedMaterialIds.has(m.id))
    .map(material => ({
      id: `level-${material.id}`,
      material_id: material.id,
      student_id: currentUser?.id,
      material,
      isAssigned: false
    }));

  // Combine both sets
  const enrichedMaterials = [...assignedMaterials, ...levelMaterials];

  const filteredMaterials = filterTag === 'all'
    ? enrichedMaterials
    : enrichedMaterials.filter(sm => 
        sm.tags?.includes(filterTag) || sm.material?.tags?.includes(filterTag)
      );

  const handleDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!currentUser) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('page.materials.title')}</h1>

      {/* Filter Tabs */}
      <Tabs value={filterTag} onValueChange={setFilterTag} className="mb-8">
        <TabsList>
          <TabsTrigger value="all">{t('page.materials.all')}</TabsTrigger>
          <TabsTrigger value="song">{t('page.materials.songs')}</TabsTrigger>
          <TabsTrigger value="scales">{t('page.materials.scales')}</TabsTrigger>
          <TabsTrigger value="backing">{t('page.materials.backing')}</TabsTrigger>
          <TabsTrigger value="theory">{t('page.materials.theory')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">{t('page.materials.noMaterials')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((sm) => (
            <Card
              key={sm.id}
              className="border-none shadow-lg hover:shadow-xl transition-all"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getTypeColor(sm.material.type)} rounded-xl flex items-center justify-center`}>
                    {getTypeIcon(sm.material.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">{sm.material.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{sm.material.description}</p>
                  </div>
                </div>

                {sm.notes_from_teacher && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">{t('page.materials.teacherNote')}:</p>
                    <p className="text-sm text-blue-900">{sm.notes_from_teacher}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {(sm.tags || sm.material.tags)?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedMaterial(sm)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('page.materials.view')}
                  </Button>
                  
                  {(sm.material.type === 'pdf' || sm.material.type === 'audio' || sm.material.type === 'image' || sm.material.type === 'video') && sm.material.file_url && (
                    <Button
                      onClick={() => handleDownload(sm.material.file_url, `${sm.material.title}.${sm.material.type === 'pdf' ? 'pdf' : sm.material.type === 'audio' ? 'mp3' : sm.material.type === 'video' ? 'mp4' : 'jpg'}`)}
                      variant="outline"
                      size="icon"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Material Viewer Dialog */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedMaterial && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedMaterial.material.title}</span>
                  {(selectedMaterial.material.type === 'pdf' || selectedMaterial.material.type === 'audio' || selectedMaterial.material.type === 'image' || selectedMaterial.material.type === 'video') && selectedMaterial.material.file_url && (
                    <Button
                      onClick={() => handleDownload(selectedMaterial.material.file_url, `${selectedMaterial.material.title}.${selectedMaterial.material.type === 'pdf' ? 'pdf' : selectedMaterial.material.type === 'audio' ? 'mp3' : selectedMaterial.material.type === 'video' ? 'mp4' : 'jpg'}`)}
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('page.materials.download')}
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {selectedMaterial.material.description && (
                  <p className="text-gray-600">{selectedMaterial.material.description}</p>
                )}

                {selectedMaterial.notes_from_teacher && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="font-semibold text-blue-900 mb-2">{t('page.materials.teacherNote')}:</p>
                    <p className="text-blue-800">{selectedMaterial.notes_from_teacher}</p>
                  </div>
                )}

                {/* PDF Preview */}
                {selectedMaterial.material.type === 'pdf' && selectedMaterial.material.file_url && (
                  <PDFViewer 
                    url={selectedMaterial.material.file_url}
                    title={selectedMaterial.material.title}
                  />
                )}

                {/* Image */}
                {selectedMaterial.material.type === 'image' && selectedMaterial.material.file_url && (
                  <ImageViewer 
                    url={selectedMaterial.material.file_url}
                    title={selectedMaterial.material.title}
                  />
                )}

                {/* Audio Player */}
                {selectedMaterial.material.type === 'audio' && selectedMaterial.material.file_url && (
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-4">
                      <div className="flex items-center gap-3">
                        <Music className="w-6 h-6 text-white" />
                        <div className="text-white">
                          <p className="font-semibold">{selectedMaterial.material.title}</p>
                          <p className="text-sm opacity-90">Audio Player</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <audio 
                        src={selectedMaterial.material.file_url} 
                        controls 
                        controlsList="nodownload"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Video Player */}
                {selectedMaterial.material.type === 'video' && selectedMaterial.material.file_url && (
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
                      <div className="flex items-center gap-3">
                        <Video className="w-6 h-6 text-white" />
                        <div className="text-white">
                          <p className="font-semibold">{selectedMaterial.material.title}</p>
                          <p className="text-sm opacity-90">Video Player</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-black">
                      <video 
                        src={selectedMaterial.material.file_url} 
                        controls 
                        controlsList="nodownload"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Note */}
                {selectedMaterial.material.type === 'note' && (
                  <div className="bg-yellow-50 rounded-lg p-4 whitespace-pre-wrap">
                    {selectedMaterial.material.description}
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