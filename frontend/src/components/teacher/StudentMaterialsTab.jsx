import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function StudentMaterialsTab({ studentId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: studentMaterials = [] } = useQuery({
    queryKey: ['studentMaterials', studentId],
    queryFn: () => base44.entities.StudentMaterial.filter({ student_id: studentId }),
  });

  const { data: allMaterials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const addMaterialMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.StudentMaterial.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentMaterials'] });
      setShowAddDialog(false);
      setSelectedMaterialId('');
      setNotes('');
    },
  });

  const removeMaterialMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.StudentMaterial.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentMaterials'] });
    },
  });

  const enrichedMaterials = studentMaterials.map(sm => {
    const material = allMaterials.find(m => m.id === sm.material_id);
    return { ...sm, material };
  }).filter(sm => sm.material);

  const availableMaterials = allMaterials.filter(m => 
    !studentMaterials.some(sm => sm.material_id === m.id)
  );

  const handleAdd = () => {
    addMaterialMutation.mutate({
      student_id: studentId,
      material_id: selectedMaterialId,
      notes_from_teacher: notes,
      tags: [],
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Assigned Materials</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Assign Material
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enrichedMaterials.map((sm) => (
          <Card key={sm.id} className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{sm.material.title}</h3>
                  <p className="text-sm text-gray-600">{sm.material.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMaterialMutation.mutate(sm.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {sm.notes_from_teacher && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Your Note:</p>
                  <p className="text-sm text-blue-900">{sm.notes_from_teacher}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Material Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Material</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a material" />
                </SelectTrigger>
                <SelectContent>
                  {availableMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes for Student</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or instructions..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!selectedMaterialId}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}