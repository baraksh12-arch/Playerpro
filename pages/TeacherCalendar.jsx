import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  User,
  Trash2,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/Layout';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TeacherCalendar() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newLesson, setNewLesson] = useState({
    student_id: '',
    duration: 45,
    location: ''
  });

  // Get week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.User.filter({ role: 'user' }),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['lessonSchedules'],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });

  const { data: lessonHistory = [] } = useQuery({
    queryKey: ['lessonHistory'],
    queryFn: () => base44.entities.LessonHistory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LessonSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonSchedules'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LessonSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonSchedules'] });
    },
  });

  const resetForm = () => {
    setNewLesson({ student_id: '', duration: 45, location: '' });
    setSelectedSlot(null);
  };

  const handleSlotClick = (dayIndex, hour) => {
    setSelectedSlot({ dayIndex, hour });
    setShowDialog(true);
  };

  const handleCreateLesson = () => {
    if (!newLesson.student_id || !selectedSlot) return;
    
    createMutation.mutate({
      student_id: newLesson.student_id,
      assigned_teacher_id: user?.id,
      day_of_week: selectedSlot.dayIndex,
      start_time: `${selectedSlot.hour.toString().padStart(2, '0')}:00`,
      duration_minutes: newLesson.duration,
      location: newLesson.location,
    });
  };

  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const goToPrevWeek = () => setCurrentWeek(addDays(currentWeek, -7));
  const goToNextWeek = () => setCurrentWeek(addDays(currentWeek, 7));

  const getMonthYear = () => {
    return format(currentWeek, 'MMMM yyyy');
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getLessonsForSlot = (dayIndex, hour) => {
    const dayDate = weekDates[dayIndex];
    const dateStr = format(dayDate, 'yyyy-MM-dd');
    
    // Get recurring lessons for this day and hour
    const recurringLessons = schedules.filter(s => {
      if (s.day_of_week !== dayIndex) return false;
      const [startHour] = s.start_time.split(':').map(Number);
      return startHour === hour;
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
    return student?.full_name || student?.email || 'Unknown';
  };

  const getLessonHeight = (duration) => {
    return (duration / 60) * 64; // 64px per hour
  };

  const getLessonColor = (index) => {
    const colors = [
      'bg-gradient-to-br from-blue-400/90 to-blue-500/90',
      'bg-gradient-to-br from-violet-400/90 to-violet-500/90',
      'bg-gradient-to-br from-emerald-400/90 to-emerald-500/90',
      'bg-gradient-to-br from-amber-400/90 to-amber-500/90',
      'bg-gradient-to-br from-rose-400/90 to-rose-500/90',
      'bg-gradient-to-br from-cyan-400/90 to-cyan-500/90',
      'bg-gradient-to-br from-teal-400/90 to-teal-500/90',
      'bg-gradient-to-br from-pink-400/90 to-pink-500/90',
    ];
    return colors[Math.abs(index) % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="hidden md:flex border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 font-medium"
              >
                Today
              </Button>
              <div className="flex items-center bg-slate-100/60 rounded-full p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevWeek}
                  className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextWeek}
                  className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Center: Month/Year */}
            <h1 className="text-xl md:text-2xl font-semibold text-slate-700">
              {getMonthYear()}
            </h1>

            {/* Right: Week Range & Add Button */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-gray-500">
                {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
              </span>
              <Button
                onClick={() => {
                  setSelectedSlot({ dayIndex: new Date().getDay(), hour: 10 });
                  setShowDialog(true);
                }}
                className="bg-slate-700 hover:bg-slate-800 text-white rounded-full px-4 md:px-6 shadow-md"
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Add Lesson</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex">
          {/* Time Column */}
          <div className="w-14 md:w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200">
            {/* Empty header cell */}
            <div className="h-18 md:h-20 border-b border-gray-200" />
            
            {/* Time slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-gray-200 flex items-start justify-end pr-2 md:pr-3 pt-0"
              >
                <span className="text-[10px] text-slate-400 -mt-2 font-medium">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[700px] grid grid-cols-7">
              {/* Day Headers */}
              {weekDates.map((date, idx) => (
                <div
                  key={idx}
                  className={`h-18 md:h-20 border-b border-r border-gray-200 flex flex-col items-center justify-center transition-colors ${
                    isToday(date) ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${
                    isToday(date) ? 'text-blue-500' : 'text-slate-400'
                  }`}>
                    {DAYS_SHORT[idx]}
                  </span>
                  <span className={`text-xl md:text-2xl font-semibold mt-1 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                    isToday(date) 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-700'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
              ))}

              {/* Hour Cells */}
              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  {weekDates.map((date, dayIdx) => {
                    const lessons = getLessonsForSlot(dayIdx, hour);
                    
                    return (
                      <div
                        key={`${dayIdx}-${hour}`}
                        className={`h-16 border-b border-r border-gray-200 relative group cursor-pointer transition-all duration-150 ${
                          isToday(date) ? 'bg-white' : 'bg-white hover:bg-slate-50/50'
                        }`}
                        onClick={() => lessons.length === 0 && handleSlotClick(dayIdx, hour)}
                      >
                        {/* Add button on hover */}
                        {lessons.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                          </div>
                        )}

                        {/* Lessons */}
                        {lessons.map((lesson, lessonIdx) => {
                          const studentIndex = students.findIndex(s => s.id === lesson.student_id);
                          const isSingleLesson = lesson.type === 'single';
                          return (
                            <div
                              key={lesson.id}
                              className={`absolute left-0.5 right-0.5 rounded-lg ${getLessonColor(studentIndex)} text-white p-2 shadow-sm overflow-hidden group/lesson cursor-default z-10 hover:shadow-md transition-shadow ${isSingleLesson ? 'border border-dashed border-white/40' : ''}`}
                              style={{
                                height: `${getLessonHeight(lesson.duration_minutes) - 4}px`,
                                top: '2px'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-start justify-between h-full">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-xs truncate">
                                    {getStudentName(lesson.student_id)}
                                  </p>
                                  <p className="text-[10px] text-white/80 mt-0.5">
                                    {lesson.start_time} · {lesson.duration_minutes}m
                                  </p>
                                  {lesson.location && lesson.duration_minutes >= 45 && (
                                    <p className="text-[10px] text-white/70 mt-0.5 flex items-center gap-0.5 truncate">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {lesson.location}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this lesson?')) {
                                      deleteMutation.mutate(lesson.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover/lesson:opacity-100 transition-all p-1 hover:bg-white/20 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Lesson Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Schedule New Lesson
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            {/* Time Display */}
            {selectedSlot && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {DAYS[selectedSlot.dayIndex]}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedSlot.hour > 12 ? `${selectedSlot.hour - 12}:00 PM` : `${selectedSlot.hour}:00 AM`}
                  </p>
                </div>
              </div>
            )}

            {/* Student Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Student
              </label>
              <Select
                value={newLesson.student_id}
                onValueChange={(value) => setNewLesson({ ...newLesson, student_id: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name || student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <Select
                value={newLesson.duration.toString()}
                onValueChange={(value) => setNewLesson({ ...newLesson, duration: parseInt(value) })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location (optional)
              </label>
              <Input
                value={newLesson.location}
                onChange={(e) => setNewLesson({ ...newLesson, location: e.target.value })}
                placeholder="e.g., Studio A, Online"
                className="h-12"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLesson}
                disabled={!newLesson.student_id || createMutation.isPending}
                className="flex-1 h-12 bg-slate-700 hover:bg-slate-800"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Lesson'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}