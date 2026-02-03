import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Target, CheckCircle2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const GOAL_TYPES = [
  { id: 'daily_practice_time', name: 'Daily Practice Time', unit: 'minutes' },
  { id: 'weekly_practice_time', name: 'Weekly Practice Time', unit: 'minutes' },
  { id: 'practice_streak', name: 'Practice Streak', unit: 'days' },
  { id: 'tuner_accuracy', name: 'Tuner Accuracy', unit: 'percentage' },
  { id: 'ear_training_score', name: 'Ear Training Score', unit: 'percentage' },
  { id: 'custom', name: 'Custom Goal', unit: 'count' },
];

export default function GoalsTab({ studentId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    goal_type: 'daily_practice_time',
    target_value: 30,
    unit: 'minutes',
    deadline: '',
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['studentGoals', studentId],
    queryFn: () => base44.entities.PracticeGoal.filter({ student_id: studentId }),
    enabled: !!studentId,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PracticeGoal.create({ ...data, student_id: studentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentGoals'] });
      setShowDialog(false);
      setGoalData({
        title: '',
        description: '',
        goal_type: 'daily_practice_time',
        target_value: 30,
        unit: 'minutes',
        deadline: '',
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PracticeGoal.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentGoals'] });
    },
  });

  const completeGoalMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PracticeGoal.update(id, {
        is_completed: true,
        completed_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentGoals'] });
    },
  });

  const handleGoalTypeChange = (type) => {
    const goalType = GOAL_TYPES.find(t => t.id === type);
    setGoalData({
      ...goalData,
      goal_type: type,
      unit: goalType?.unit || 'count',
    });
  };

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">My Goals</h3>
            <p className="text-gray-600">Set targets and track your progress</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Goal
          </Button>
        </div>
      </Card>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Active Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeGoals.map((goal) => {
              const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
              return (
                <Card key={goal.id} className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{goal.title}</h4>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {progress >= 100 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => completeGoalMutation.mutate(goal.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {goal.current_value.toFixed(0)} / {goal.target_value} {goal.unit}
                      </span>
                      <span className="text-lg font-bold text-cyan-600">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          progress >= 100
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="text-sm text-gray-500">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeGoals.length === 0 && (
        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-12 text-center shadow-xl">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Goals</h3>
          <p className="text-gray-600 mb-6">Set your first goal to start tracking progress</p>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Goal
          </Button>
        </Card>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Completed Goals</h3>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="bg-green-50 border-2 border-green-200 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-bold text-gray-900">{goal.title}</h4>
                      <p className="text-sm text-gray-600">
                        Completed {new Date(goal.completed_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteGoalMutation.mutate(goal.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Goal Type</Label>
              <Select value={goalData.goal_type} onValueChange={handleGoalTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal Title *</Label>
              <Input
                value={goalData.title}
                onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                placeholder="e.g., Practice 30 minutes daily"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={goalData.description}
                onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
                placeholder="Add details about your goal..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Value *</Label>
                <Input
                  type="number"
                  value={goalData.target_value}
                  onChange={(e) => setGoalData({ ...goalData, target_value: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Deadline (optional)</Label>
                <Input
                  type="date"
                  value={goalData.deadline}
                  onChange={(e) => setGoalData({ ...goalData, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createGoalMutation.mutate(goalData)}
              disabled={!goalData.title || !goalData.target_value}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}