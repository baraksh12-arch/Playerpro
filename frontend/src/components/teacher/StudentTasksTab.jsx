import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';

export default function StudentTasksTab({ studentId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    estimated_minutes: '',
    due_date: '',
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['studentTasks', studentId],
    queryFn: () => base44.entities.Task.filter({ student_id: studentId }),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Task.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setShowAddDialog(false);
      setNewTask({ title: '', description: '', estimated_minutes: '', due_date: '' });
    },
  });

  const handleSubmit = () => {
    createTaskMutation.mutate({
      student_id: studentId,
      title: newTask.title,
      description: newTask.description,
      estimated_minutes: newTask.estimated_minutes ? parseInt(newTask.estimated_minutes) : undefined,
      due_date: newTask.due_date || undefined,
      status: 'not_started',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const groupedTasks = {
    active: tasks.filter(t => t.status !== 'done'),
    completed: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Student Tasks</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Task
        </Button>
      </div>

      <div className="space-y-8">
        {/* Active Tasks */}
        {groupedTasks.active.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Tasks</h3>
            <div className="space-y-4">
              {groupedTasks.active.map((task) => (
                <Card key={task.id} className="border-none shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {task.due_date && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {task.estimated_minutes && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              ~{task.estimated_minutes} min
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {task.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {groupedTasks.completed.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed Tasks</h3>
            <div className="space-y-4">
              {groupedTasks.completed.map((task) => (
                <Card key={task.id} className="border-none shadow-lg bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2 line-through">{task.title}</h4>
                        {task.student_comment && (
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-semibold text-green-700 mb-1">Student's comment:</p>
                            <p className="text-sm text-gray-900">{task.student_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="e.g., Practice C Major scale"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add details about the task..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Time (minutes)</Label>
                <Input
                  type="number"
                  value={newTask.estimated_minutes}
                  onChange={(e) => setNewTask({ ...newTask, estimated_minutes: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newTask.title}
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