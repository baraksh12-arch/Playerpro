import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { Users, Calendar, TrendingUp, MessageSquare, Megaphone, ExternalLink, FileText, Link as LinkIcon, Download, Eye, MessageCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { useI18n } from '../Layout';

export default function TeacherDashboard() {
  const { t } = useI18n();
  const [viewingUpdate, setViewingUpdate] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', currentUser?.id],
    queryFn: () => base44.entities.User.filter({ role: 'user', assigned_teacher_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });

  const { data: lessonHistory = [] } = useQuery({
    queryKey: ['lessonHistory'],
    queryFn: () => base44.entities.LessonHistory.list(),
  });

  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['allPracticeSessions'],
    queryFn: () => base44.entities.PracticeSession.list('-created_date', 50),
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['recentMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 10),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allChatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ is_active: true }, '-created_date', 5),
  });

  const { data: teacherUpdates = [] } = useQuery({
    queryKey: ['teacherUpdates', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const allUpdates = await base44.entities.TeacherUpdate.filter({ is_active: true }, '-created_date');
      // Filter updates relevant to this teacher's instruments
      return allUpdates.filter(update => {
        if (!update.target_instruments || update.target_instruments.length === 0) return true;
        if (!currentUser.instruments || currentUser.instruments.length === 0) return false;
        return update.target_instruments.some(inst => currentUser.instruments.includes(inst));
      });
    },
    enabled: !!currentUser,
  });

  // Get unread count for each student
  const getUnreadCount = (studentId) => {
    return allMessages.filter(
      msg => msg.student_id === studentId && 
             msg.sender_role === 'student' && 
             !msg.is_read_by_teacher
    ).length;
  };

  // Total unread messages
  const totalUnread = allMessages.filter(
    msg => msg.sender_role === 'student' && !msg.is_read_by_teacher
  ).length;

  const getTodaysLessons = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayDay = today.getDay();
    
    // Get recurring lessons for today
    const todaySchedules = schedules.filter(s => s.day_of_week === todayDay).map(schedule => {
      const student = students.find(s => s.id === schedule.student_id);
      return { ...schedule, student, type: 'recurring' };
    });
    
    // Get single lessons for today
    const todaySingleLessons = lessonHistory.filter(l => l.lesson_date === todayStr).map(lesson => {
      const student = students.find(s => s.id === lesson.student_id);
      return { ...lesson, student, type: 'single' };
    });
    
    return [...todaySchedules, ...todaySingleLessons].filter(s => s.student);
  };

  const getStudentStats = (studentId) => {
    const studentSessions = practiceSessions.filter(s => s.student_id === studentId);
    const lastSession = studentSessions[0];
    const streak = calculateStreak(studentSessions);
    return { lastSession, streak };
  };

  const calculateStreak = (sessions) => {
    if (!sessions.length) return 0;
    
    const dates = [...new Set(sessions.map(s => 
      format(parseISO(s.start_time), 'yyyy-MM-dd')
    ))].sort().reverse();
    
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
    
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = format(addDays(new Date(), -i), 'yyyy-MM-dd');
      if (dates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getNextLesson = (studentId) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Find upcoming single lessons
    const upcomingSingleLessons = lessonHistory
      .filter(l => l.student_id === studentId && l.lesson_date >= todayStr)
      .sort((a, b) => a.lesson_date.localeCompare(b.lesson_date));
    
    // Find next recurring lesson
    const schedule = schedules.find(s => s.student_id === studentId);
    let nextRecurringLesson = null;
    
    if (schedule) {
      const todayDay = today.getDay();
      const daysUntil = (schedule.day_of_week - todayDay + 7) % 7;
      const daysToAdd = daysUntil === 0 ? 7 : daysUntil;
      const nextDate = addDays(today, daysToAdd);
      nextRecurringLesson = {
        date: format(nextDate, 'MMM d'),
        time: schedule.start_time,
        dateObj: nextDate
      };
    }
    
    // Compare and return the nearest lesson
    if (upcomingSingleLessons.length > 0) {
      const nextSingle = upcomingSingleLessons[0];
      const singleDate = parseISO(nextSingle.lesson_date);
      
      if (!nextRecurringLesson || singleDate < nextRecurringLesson.dateObj) {
        return {
          date: format(singleDate, 'MMM d'),
          time: nextSingle.start_time
        };
      }
    }
    
    return nextRecurringLesson ? { date: nextRecurringLesson.date, time: nextRecurringLesson.time } : null;
  };

  const todaysLessons = getTodaysLessons();
  const activeStudents = students.filter(s => s.is_active !== false);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('page.teacherDashboard.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('page.teacherDashboard.totalStudents')}</p>
                <p className="text-3xl font-bold text-gray-900">{activeStudents.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('page.teacherDashboard.todaysLessons')}</p>
                <p className="text-3xl font-bold text-gray-900">{todaysLessons.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('page.teacherDashboard.unreadMessages')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-gray-900">{totalUnread}</p>
                  {totalUnread > 0 && (
                    <span className="animate-pulse w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center relative">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Lessons */}
      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            {t('page.teacherDashboard.todaysLessons')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysLessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('page.teacherDashboard.noLessonsToday')}</p>
          ) : (
            <div className="space-y-3">
              {todaysLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`${createPageUrl('TeacherStudentProfile')}?id=${lesson.student.id}`}
                  className="block p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{lesson.student.full_name}</p>
                      <p className="text-sm text-gray-600">{lesson.student.level} • {lesson.student.main_style}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-600">{lesson.start_time}</p>
                      <p className="text-sm text-gray-500">{lesson.duration_minutes} min</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Students Overview */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600" />
                {t('page.teacherDashboard.studentsOverview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.name')}</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.level')}</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.nextLesson')}</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.lastPractice')}</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.streak')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((student) => {
                      const stats = getStudentStats(student.id);
                      const nextLesson = getNextLesson(student.id);
                      const unreadCount = getUnreadCount(student.id);
                      return (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <Link
                              to={`${createPageUrl('TeacherStudentProfile')}?id=${student.id}`}
                              className="font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-2"
                            >
                              {student.full_name}
                              {unreadCount > 0 && (
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {student.level || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-600">
                            {nextLesson ? `${nextLesson.date} at ${nextLesson.time}` : t('page.teacherDashboard.notScheduled')}
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-600">
                            {stats.lastSession ? format(parseISO(stats.lastSession.start_time), 'MMM d') : t('page.teacherDashboard.noData')}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1">
                              <TrendingUp className={`w-4 h-4 ${stats.streak > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                              <span className="font-semibold text-gray-900">{stats.streak}</span>
                              <span className="text-xs text-gray-500">{t('page.dashboard.days')}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Panel */}
        <div>
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                {t('page.teacherDashboard.studentMessages')}
                {totalUnread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {activeStudents
                  .map(student => ({
                    student,
                    unreadCount: getUnreadCount(student.id),
                    lastMessage: allMessages
                      .filter(m => m.student_id === student.id)
                      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
                  }))
                  .sort((a, b) => b.unreadCount - a.unreadCount)
                  .map(({ student, unreadCount, lastMessage }) => (
                    <Link
                      key={student.id}
                      to={`${createPageUrl('TeacherStudentProfile')}?id=${student.id}&tab=chat`}
                      className={`block p-4 rounded-xl transition-all border-2 ${
                        unreadCount > 0 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {student.full_name?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{student.full_name}</p>
                            {lastMessage && (
                              <p className="text-xs text-gray-500">
                                {format(parseISO(lastMessage.created_date), 'MMM d, HH:mm')}
                              </p>
                            )}
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                              {unreadCount}
                            </span>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          </div>
                        )}
                      </div>
                      {lastMessage && (
                        <p className={`text-sm ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'} line-clamp-2`}>
                          {lastMessage.sender_role === 'teacher' ? t('page.teacherDashboard.you') : ''}
                          {lastMessage.text}
                        </p>
                      )}
                      {!lastMessage && (
                        <p className="text-sm text-gray-400 italic">{t('page.teacherDashboard.noMessagesYet')}</p>
                      )}
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* News Section */}
      {announcements.length > 0 && (
        <Card className="border-none shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-600" />
              {t('page.teacherDashboard.news')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={(el) => {
                if (!el) return;
                let scrollInterval;
                let isHovering = false;
                let isDragging = false;
                let startX, scrollLeft;

                const startScroll = () => {
                  if (scrollInterval) clearInterval(scrollInterval);

                  setTimeout(() => {
                    const singleSetWidth = el.scrollWidth / 2;
                    el.scrollLeft = singleSetWidth;

                    scrollInterval = setInterval(() => {
                      if (!isHovering && !isDragging) {
                        el.scrollLeft -= 0.3;

                        if (el.scrollLeft <= 1) {
                          el.scrollLeft = singleSetWidth;
                        }
                      }
                    }, 50);
                  }, 100);
                };

                el.addEventListener('mouseenter', () => { isHovering = true; });
                el.addEventListener('mouseleave', () => { isHovering = false; });

                el.addEventListener('touchstart', () => { isHovering = true; });
                el.addEventListener('touchend', () => { 
                  setTimeout(() => { isHovering = false; }, 100);
                });

                el.addEventListener('mousedown', (e) => {
                  isDragging = true;
                  startX = e.pageX - el.offsetLeft;
                  scrollLeft = el.scrollLeft;
                  el.style.cursor = 'grabbing';
                });

                el.addEventListener('mousemove', (e) => {
                  if (!isDragging) return;
                  e.preventDefault();
                  const x = e.pageX - el.offsetLeft;
                  const walk = (x - startX) * 2;
                  el.scrollLeft = scrollLeft - walk;
                });

                el.addEventListener('mouseup', () => {
                  isDragging = false;
                  el.style.cursor = 'grab';
                });

                el.addEventListener('mouseleave', () => {
                  isDragging = false;
                  el.style.cursor = 'grab';
                });

                el.style.cursor = 'grab';
                startScroll();
              }}
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'auto' }}
            >
              {[...announcements, ...announcements].map((announcement, index) => (
                <div key={`${announcement.id}-${index}`} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200 hover:shadow-lg transition-all min-w-[800px] max-w-[800px] flex gap-4 flex-shrink-0">
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">{announcement.title}</h3>
                    <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium mb-2">
                      {announcement.event_type}
                    </span>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{announcement.description}</p>
                    {announcement.event_date && (
                      <p className="text-xs text-gray-700 mb-1">
                        📅 {format(parseISO(announcement.event_date), 'MMM d, yyyy HH:mm')}
                      </p>
                    )}
                    {announcement.location && (
                      <p className="text-xs text-gray-700 mb-2">
                        📍 {announcement.location}
                      </p>
                    )}
                    {announcement.link_url && (
                      <a
                        href={announcement.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                        <ExternalLink className="w-3 h-3" />
                        {t('page.teacherDashboard.moreInfo')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Updates Section */}
      {teacherUpdates.length > 0 && (
        <Card className="border-none shadow-lg mt-8 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-600" />
              {t('page.teacherDashboard.updatesForTeachers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teacherUpdates.map((update) => {
                const fileAttachments = update.attachments?.filter(a => a.type === 'file') || [];
                const linkAttachments = update.attachments?.filter(a => a.type === 'link') || [];
                
                return (
                  <div 
                    key={update.id}
                    className={`p-4 rounded-lg border-2 ${
                      update.priority === 'urgent' ? 'bg-red-50 border-red-300' :
                      update.priority === 'important' ? 'bg-orange-50 border-orange-300' :
                      'bg-white border-purple-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{update.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        update.priority === 'urgent' ? 'bg-red-500 text-white' :
                        update.priority === 'important' ? 'bg-orange-500 text-white' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {update.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{update.message}</p>
                    
                    {update.attachments?.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {fileAttachments.length > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingUpdate(update)}
                              className="gap-2"
                              >
                              <Eye className="w-4 h-4" />
                              {t('page.teacherDashboard.viewFiles')} ({fileAttachments.length})
                              </Button>
                              <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                fileAttachments.forEach(att => {
                                  const link = document.createElement('a');
                                  link.href = att.url;
                                  link.download = att.name;
                                  link.click();
                                });
                              }}
                              className="gap-2"
                              >
                              <Download className="w-4 h-4" />
                              {t('page.teacherDashboard.download')}
                              </Button>
                              </>
                              )}
                              {linkAttachments.length > 0 && (
                              <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(linkAttachments[0].url, '_blank')}
                              className="gap-2"
                              >
                              <ExternalLink className="w-4 h-4" />
                              {t('page.teacherDashboard.openLink')}{linkAttachments.length > 1 ? 's' : ''} ({linkAttachments.length})
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{new Date(update.created_date).toLocaleDateString()}</span>
                      {update.target_instruments?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>For: {update.target_instruments.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Viewer Dialog */}
      <Dialog open={!!viewingUpdate} onOpenChange={() => setViewingUpdate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingUpdate?.title} - Attachments</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] space-y-4">
            {viewingUpdate?.attachments?.filter(a => a.type === 'file').map((att, idx) => {
              const isImage = att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const isPDF = att.name.match(/\.pdf$/i);
              
              return (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-900">{att.name}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = att.url;
                        link.download = att.name;
                        link.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  {isImage ? (
                    <img src={att.url} alt={att.name} className="w-full rounded-lg" />
                  ) : isPDF ? (
                    <iframe
                      src={att.url}
                      className="w-full h-[600px] rounded-lg border"
                      title={att.name}
                    />
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Preview not available</p>
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(att.url, '_blank')}
                      >
                        Open in New Tab
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Agent Button & Scanner - Admin Only */}
      {currentUser?.role === 'admin' && (
        <div className="mt-8 flex flex-wrap justify-center items-center gap-2 md:gap-4">
          {/* AgentPass Display */}
          <div className="relative group">
            <div className="px-3 py-2 md:px-4 md:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-lg transition-all opacity-80 hover:opacity-100 cursor-pointer">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="font-semibold text-xs md:text-sm hidden sm:inline">Agent Code:</span>
                <div className="relative">
                  <span className="font-mono text-sm md:text-lg tracking-wider group-hover:opacity-100 opacity-0 transition-opacity">
                    {currentUser?.agentpass || '****'}
                  </span>
                  <span className="font-mono text-sm md:text-lg tracking-wider group-hover:opacity-0 opacity-100 transition-opacity absolute left-0 top-0">
                    ••••
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`My agent password is: ${currentUser?.agentpass || ''}`);
                    const btn = e.currentTarget;
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '✓';
                    setTimeout(() => {
                      btn.innerHTML = originalHTML;
                    }, 1500);
                  }}
                  className="p-1 hover:bg-indigo-700 rounded transition-colors"
                  title="Copy code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <a
            href={base44.agents.getWhatsAppConnectURL('app_guide')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg transition-all opacity-80 hover:opacity-100"
          >
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold text-xs md:text-base hidden sm:inline">{t('page.teacherDashboard.whatsappButton')}</span>
            <span className="font-semibold text-xs sm:hidden">WhatsApp</span>
          </a>
          <Link
            to={createPageUrl('TeacherScanner')}
            className="inline-flex items-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg transition-all opacity-80 hover:opacity-100"
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold text-xs md:text-base hidden sm:inline">{t('page.teacherDashboard.scanDocument')}</span>
            <span className="font-semibold text-xs sm:hidden">Scan</span>
          </Link>
          <Link
            to={createPageUrl('TeacherPdfToWord')}
            className="inline-flex items-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-lg transition-all opacity-80 hover:opacity-100"
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold text-xs md:text-base hidden sm:inline">PDF to Word</span>
            <span className="font-semibold text-xs sm:hidden">PDF</span>
          </Link>
        </div>
      )}
    </div>
  );
}