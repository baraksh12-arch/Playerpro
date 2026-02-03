import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { useI18n } from '@/Layout';

export default function StudentTasks() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks', currentUser?.id],
    queryFn: () => base44.entities.Task.filter({ student_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, comment }) => {
      await base44.entities.Task.update(taskId, {
        status,
        student_comment: comment || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['studentTasks'] });
      setSelectedTask(null);
      setComment('');
    },
  });

  const handleStatusChange = (task, newStatus) => {
    if (newStatus === 'done') {
      setSelectedTask(task);
    } else {
      updateTaskMutation.mutate({ taskId: task.id, status: newStatus });
    }
  };

  const handleComplete = () => {
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      status: 'done',
      comment: comment.trim(),
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const groupedTasks = {
    notStarted: tasks.filter(t => t.status === 'not_started'),
    inProgress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  if (!currentUser) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('page.tasks.title')}</h1>

      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">{t('page.tasks.noTasks')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Not Started */}
          {groupedTasks.notStarted.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('page.tasks.notStarted')} ({groupedTasks.notStarted.length})
              </h2>
              <div className="space-y-4">
                {groupedTasks.notStarted.map((task) => (
                  <Card key={task.id} className={`border shadow-lg ${getStatusColor(task.status)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                          {task.description && (
                            <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {task.due_date && (
                              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border">
                                {t('page.tasks.due')}: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                              </span>
                            )}
                            {task.estimated_minutes && (
                              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border">
                                ~{task.estimated_minutes} {t('page.dashboard.minutes')}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => handleStatusChange(task, 'in_progress')}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                          >
                            {t('page.tasks.startTask')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* In Progress */}
          {groupedTasks.inProgress.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('page.tasks.inProgress')} ({groupedTasks.inProgress.length})
              </h2>
              <div className="space-y-4">
                {groupedTasks.inProgress.map((task) => (
                  <Card key={task.id} className={`border shadow-lg ${getStatusColor(task.status)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                          {task.description && (
                            <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {task.due_date && (
                              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border">
                                {t('page.tasks.due')}: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                              </span>
                            )}
                            {task.estimated_minutes && (
                              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border">
                                ~{task.estimated_minutes} {t('page.dashboard.minutes')}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => handleStatusChange(task, 'done')}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                          >
                            {t('page.tasks.markDone')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {groupedTasks.done.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t('page.tasks.completed', { count: groupedTasks.done.length })}
              </h2>
              <div className="space-y-4">
                {groupedTasks.done.map((task) => (
                  <Card key={task.id} className={`border shadow-lg ${getStatusColor(task.status)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2 line-through">{task.title}</h3>
                          {task.student_comment && (
                            <div className="bg-white rounded-lg p-3 mt-2 border">
                              <p className="text-xs font-semibold text-gray-700 mb-1">{t('page.tasks.comment')}:</p>
                              <p className="text-sm text-gray-600">{task.student_comment}</p>
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
      )}

      {/* Complete Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('page.tasks.markDone')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('page.tasks.commentPrompt')}
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('page.tasks.commentPlaceholder')}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateTaskMutation.isLoading}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {updateTaskMutation.isLoading ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}