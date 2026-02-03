import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { format, addDays, startOfWeek } from 'date-fns';
import { useI18n } from '../../Layout';

export default function WeeklyCalendar() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [startHour, setStartHour] = useState(9);
  const [newLesson, setNewLesson] = useState({
    student_id: '',
    duration_minutes: 45,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.User.filter({ role: 'user' }),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });

  const { data: lessonHistory = [] } = useQuery({
    queryKey: ['lessonHistory'],
    queryFn: () => base44.entities.LessonHistory.list(),
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data) => {
      const schedule = await base44.entities.LessonSchedule.create(data);
      
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncLessonToCalendar', {
          lessonData: data,
          action: 'create'
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      
      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowBookDialog(false);
      setSelectedSlot(null);
      setNewLesson({ student_id: '', duration_minutes: 45 });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.LessonSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const visibleHours = Array.from({ length: 4 }, (_, i) => startHour + i);

  const handleSlotClick = (dayIndex, hour) => {
    setSelectedSlot({ dayIndex, hour });
    setShowBookDialog(true);
  };

  const handleBookLesson = () => {
    if (!selectedSlot || !newLesson.student_id || createScheduleMutation.isLoading || !currentUser) return;

    createScheduleMutation.mutate({
      student_id: newLesson.student_id,
      day_of_week: selectedSlot.dayIndex,
      start_time: `${selectedSlot.hour.toString().padStart(2, '0')}:00`,
      duration_minutes: newLesson.duration_minutes,
      assigned_teacher_id: currentUser.id,
    });
  };

  const getScheduleForSlot = (dayIndex, hour) => {
    const dayDate = addDays(currentWeek, dayIndex);
    const dateStr = format(dayDate, 'yyyy-MM-dd');
    
    // Get recurring lessons
    const recurringLessons = schedules.filter(schedule => {
      if (schedule.day_of_week !== dayIndex) return false;
      const [scheduleHour] = schedule.start_time.split(':').map(Number);
      return scheduleHour === hour;
    });
    
    // Get single lessons for this specific date and time
    const singleLessons = lessonHistory.filter(lesson => {
      if (lesson.lesson_date !== dateStr) return false;
      const [lessonHour] = lesson.start_time.split(':').map(Number);
      return lessonHour === hour;
    }).map(lesson => ({ ...lesson, type: 'single' }));
    
    return [...recurringLessons, ...singleLessons];
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || 'Unknown';
  };

  const goToPreviousWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7));
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const scrollTimeUp = () => {
    if (startHour > 6) setStartHour(startHour - 2);
  };

  const scrollTimeDown = () => {
    if (startHour < 18) setStartHour(startHour + 2);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">{t('calendar.weeklySchedule')}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-600 px-2">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'd')}
            </span>
            <Button variant="ghost" size="sm" onClick={goToNextWeek} className="h-7 w-7 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Calendar Grid */}
      <div className="relative">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="p-2 text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollTimeUp}
                  disabled={startHour <= 6}
                  className="h-4 w-4 p-0"
                >
                  <ChevronLeft className="w-2 h-2 rotate-90" />
                </Button>
                Time
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollTimeDown}
                  disabled={startHour >= 18}
                  className="h-4 w-4 p-0"
                >
                  <ChevronRight className="w-2 h-2 rotate-90" />
                </Button>
              </div>
              {days.map((day, idx) => (
                <div key={day} className="p-2 text-center border-l border-gray-200">
                  <div className="text-[10px] font-semibold text-gray-700">{day}</div>
                  <div className="text-[9px] text-gray-500">
                    {format(addDays(currentWeek, idx), 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="divide-y divide-gray-200">
              {visibleHours.map((hour) => (
                <div key={hour} className="grid grid-cols-8">
                  <div className="p-2 text-[10px] font-medium text-gray-500 bg-gray-50">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                  {days.map((day, dayIndex) => {
                    const schedulesInSlot = getScheduleForSlot(dayIndex, hour);
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="border-l border-gray-200 p-1 min-h-[50px] hover:bg-blue-50 cursor-pointer transition-colors relative"
                        onClick={() => handleSlotClick(dayIndex, hour)}
                      >
                        {schedulesInSlot.length === 0 ? (
                          <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3 text-gray-400" />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {schedulesInSlot.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded px-1.5 py-1 text-[10px] relative group"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="font-semibold truncate">
                                  {getStudentName(schedule.student_id)}
                                </div>
                                <div className="text-[9px] opacity-90">
                                  {schedule.duration_minutes}m
                                </div>
                                <button
                                  onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Book Lesson Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('calendar.bookLesson')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSlot && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-900">
                  {days[selectedSlot.dayIndex]} {t('calendar.with')} {selectedSlot.hour}:00
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t('page.teacherDashboard.name')}</label>
              <Select
                value={newLesson.student_id}
                onValueChange={(value) => setNewLesson({ ...newLesson, student_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('calendar.selectStudent')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">{t('calendar.duration')}</label>
              <Select
                value={newLesson.duration_minutes.toString()}
                onValueChange={(value) =>
                  setNewLesson({ ...newLesson, duration_minutes: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 {t('calendar.minutes')}</SelectItem>
                  <SelectItem value="45">45 {t('calendar.minutes')}</SelectItem>
                  <SelectItem value="60">60 {t('calendar.minutes')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBookLesson}
              disabled={!newLesson.student_id || createScheduleMutation.isLoading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {t('calendar.bookLesson')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}