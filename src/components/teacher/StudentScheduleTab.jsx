import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calendar, CheckCircle, XCircle, Clock, Repeat, Download } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, addDays, startOfDay, isBefore, isAfter, isEqual } from 'date-fns';

export default function StudentScheduleTab({ studentId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showAllFuture, setShowAllFuture] = useState(false);
  const [lessonType, setLessonType] = useState('recurring'); // 'recurring' or 'one-time'
  const [lessonData, setLessonData] = useState({
    day_of_week: 0,
    start_time: '17:00',
    duration_minutes: 45,
    location: '',
    lesson_date: '',
    notes: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recurringSchedules = [] } = useQuery({
    queryKey: ['studentSchedule', studentId],
    queryFn: () => base44.entities.LessonSchedule.filter({ student_id: studentId }),
  });

  const { data: lessonHistory = [] } = useQuery({
    queryKey: ['lessonHistory', studentId],
    queryFn: () => base44.entities.LessonHistory.filter({ student_id: studentId }, '-lesson_date'),
  });

  // Generate and categorize lessons
  const { nextLesson, historyLessons, futureLessons } = useMemo(() => {
    const today = startOfDay(new Date());
    const history = [];
    const upcoming = [];

    // Add historical lessons
    lessonHistory.forEach(lesson => {
      const lessonDate = startOfDay(parseISO(lesson.lesson_date));
      history.push({
        ...lesson,
        date: lessonDate,
        isPast: isBefore(lessonDate, today),
        isToday: isEqual(lessonDate, today),
        type: 'historical'
      });
    });

    // Generate next 12 weeks of lessons from recurring schedules
    recurringSchedules.forEach(schedule => {
      for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
        const daysUntilLesson = (schedule.day_of_week - today.getDay() + 7) % 7;
        const lessonDate = startOfDay(addDays(today, daysUntilLesson + (weekOffset * 7)));
        
        // Skip if this lesson already exists in history
        const alreadyExists = lessonHistory.some(h => 
          isEqual(startOfDay(parseISO(h.lesson_date)), lessonDate)
        );
        
        if (!alreadyExists && (isAfter(lessonDate, today) || isEqual(lessonDate, today))) {
          upcoming.push({
            scheduleId: schedule.id,
            date: lessonDate,
            start_time: schedule.start_time,
            duration_minutes: schedule.duration_minutes,
            location: schedule.location,
            isPast: false,
            isToday: isEqual(lessonDate, today),
            type: 'upcoming'
          });
        }
      }
    });

    // Sort
    history.sort((a, b) => b.date - a.date); // Most recent first
    upcoming.sort((a, b) => a.date - b.date); // Soonest first

    return {
      nextLesson: upcoming[0] || null,
      historyLessons: history,
      futureLessons: upcoming.slice(1)
    };
  }, [recurringSchedules, lessonHistory]);

  const saveLessonMutation = useMutation({
    mutationFn: async ({ type, data, teacherId }) => {
      const lessonData = type === 'recurring' 
        ? { 
            student_id: studentId,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            duration_minutes: data.duration_minutes,
            location: data.location,
            assigned_teacher_id: teacherId
          }
        : { 
            student_id: studentId,
            lesson_date: data.lesson_date,
            start_time: data.start_time,
            duration_minutes: data.duration_minutes,
            location: data.location,
            notes: data.notes,
            assigned_teacher_id: teacherId
          };
      
      if (type === 'recurring') {
        await base44.entities.LessonSchedule.create(lessonData);
      } else {
        await base44.entities.LessonHistory.create(lessonData);
      }
      
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncLessonToCalendar', {
          lessonData,
          action: 'create'
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['lessonHistory'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
      setShowDialog(false);
      setLessonData({ day_of_week: 0, start_time: '17:00', duration_minutes: 45, location: '', lesson_date: '', notes: '' });
      setLessonType('recurring');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.LessonSchedule.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, attended }) => {
      await base44.entities.LessonHistory.update(id, { attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonHistory'] });
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.LessonHistory.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonHistory'] });
    },
  });

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const exportHistoryCSV = () => {
    const data = historyLessons.map(lesson => ({
      'Date': format(lesson.date, 'yyyy-MM-dd'),
      'Day': format(lesson.date, 'EEEE'),
      'Time': lesson.start_time,
      'Duration (min)': lesson.duration_minutes,
      'Location': lesson.location || '',
      'Status': lesson.attended === null ? 'Pending' : lesson.attended ? 'Attended' : 'Missed',
      'Notes': lesson.notes || ''
    }));
    
    const csv = data.map(row => Object.values(row).map(val => `"${val || ''}"`).join(',')).join('\n');
    const header = Object.keys(data[0]).join(',');
    const csvContent = header + '\n' + csv;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lesson-history-${studentId}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Lessons Schedule</h2>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Lesson
        </Button>
      </div>

      {/* Recurring Schedules */}
      {recurringSchedules.length > 0 && (
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="pt-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-cyan-600" />
              Recurring Weekly Lessons
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringSchedules.map((schedule) => (
                <div key={schedule.id} className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{daysOfWeek[schedule.day_of_week]}</h4>
                      <p className="text-cyan-600 font-semibold">{schedule.start_time}</p>
                      <p className="text-sm text-gray-600">{schedule.duration_minutes} min</p>
                      {schedule.location && (
                        <p className="text-xs text-gray-600 mt-1">📍 {schedule.location}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Lesson */}
      {nextLesson && (
        <Card className="border-none shadow-lg mb-6 bg-gradient-to-r from-cyan-50 to-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">📌 Next Lesson</h3>
            <div className="bg-white rounded-lg border-2 border-cyan-400 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-3">
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-bold text-gray-900">{format(nextLesson.date, 'MMM d, yyyy')}</p>
                  <p className="text-sm text-gray-600">{format(nextLesson.date, 'EEEE')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="font-semibold text-gray-900">{nextLesson.start_time}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">{nextLesson.duration_minutes} min</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="font-semibold text-gray-900">{nextLesson.location || 'Not specified'}</p>
                </div>
                <div className="col-span-2 text-right">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await base44.entities.LessonHistory.create({
                        student_id: studentId,
                        lesson_date: format(nextLesson.date, 'yyyy-MM-dd'),
                        start_time: nextLesson.start_time,
                        duration_minutes: nextLesson.duration_minutes,
                        location: nextLesson.location,
                        attended: true,
                        assigned_teacher_id: currentUser?.id
                      });
                      queryClient.invalidateQueries({ queryKey: ['lessonHistory'] });
                    }}
                    disabled={!currentUser}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Attended
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Future Lessons Toggle */}
      {futureLessons.length > 0 && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowAllFuture(!showAllFuture)}
            className="w-full"
          >
            {showAllFuture ? 'Hide' : 'Show'} Future Lessons ({futureLessons.length})
          </Button>
        </div>
      )}

      {/* Future Lessons Table */}
      {showAllFuture && futureLessons.length > 0 && (
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="pt-6">
            <h3 className="font-bold text-gray-900 mb-4">Future Lessons</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Day</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Time</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Duration</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {futureLessons.map((lesson, index) => (
                    <tr key={`${lesson.scheduleId}-${index}`} className="hover:bg-gray-50 border-b">
                      <td className="p-3 text-sm text-gray-900">{format(lesson.date, 'MMM d, yyyy')}</td>
                      <td className="p-3 text-sm text-gray-600">{format(lesson.date, 'EEEE')}</td>
                      <td className="p-3 text-sm text-gray-900">{lesson.start_time}</td>
                      <td className="p-3 text-sm text-gray-900">{lesson.duration_minutes} min</td>
                      <td className="p-3 text-sm text-gray-600">{lesson.location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson History Table */}
      <Card className="border-none shadow-lg">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Lesson History</h3>
            {historyLessons.length > 0 && (
              <Button
                onClick={exportHistoryCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
          
          {historyLessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No lesson history yet</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Day</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Time</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Duration</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Location</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Notes</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50 border-b">
                      <td className="p-3 text-sm text-gray-900">{format(lesson.date, 'MMM d, yyyy')}</td>
                      <td className="p-3 text-sm text-gray-600">{format(lesson.date, 'EEEE')}</td>
                      <td className="p-3 text-sm text-gray-900">{lesson.start_time}</td>
                      <td className="p-3 text-sm text-gray-900">{lesson.duration_minutes} min</td>
                      <td className="p-3 text-sm text-gray-600">{lesson.location || '-'}</td>
                      <td className="p-3 text-sm text-gray-600 italic max-w-xs truncate">{lesson.notes || '-'}</td>
                      <td className="p-3">
                        {lesson.attended === null ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => updateAttendanceMutation.mutate({ id: lesson.id, attended: true })}
                              className="bg-green-500 hover:bg-green-600 h-7 px-2"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAttendanceMutation.mutate({ id: lesson.id, attended: false })}
                              className="border-red-500 text-red-500 h-7 px-2"
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            lesson.attended 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {lesson.attended ? '✓ Attended' : '✗ Missed'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteHistoryMutation.mutate(lesson.id)}
                          className="text-red-500 h-7 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lesson Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Lesson Type</Label>
              <Select value={lessonType} onValueChange={setLessonType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring Weekly Lesson</SelectItem>
                  <SelectItem value="one-time">One-Time Lesson (Makeup)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lessonType === 'recurring' ? (
              <>
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={lessonData.day_of_week.toString()}
                    onValueChange={(value) => setLessonData({ ...lessonData, day_of_week: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Lesson Date</Label>
                  <Input
                    type="date"
                    value={lessonData.lesson_date}
                    onChange={(e) => setLessonData({ ...lessonData, lesson_date: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={lessonData.start_time}
                onChange={(e) => setLessonData({ ...lessonData, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={lessonData.duration_minutes}
                onChange={(e) => setLessonData({ ...lessonData, duration_minutes: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input
                value={lessonData.location}
                onChange={(e) => setLessonData({ ...lessonData, location: e.target.value })}
                placeholder="e.g., Studio A, Online"
              />
            </div>
            {lessonType === 'one-time' && (
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={lessonData.notes}
                  onChange={(e) => setLessonData({ ...lessonData, notes: e.target.value })}
                  placeholder="e.g., Makeup lesson for missed class"
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveLessonMutation.mutate({ type: lessonType, data: lessonData, teacherId: currentUser?.id })}
              disabled={(lessonType === 'one-time' && !lessonData.lesson_date) || !currentUser}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Add Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}