import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, BookOpen, MessageCircle, Music, Target, TrendingUp, Award, Megaphone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, addDays, parseISO } from 'date-fns';
import { useI18n } from '@/Layout';

export default function StudentDashboard() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: schedules = [] } = useQuery({
    queryKey: ['mySchedule', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.LessonSchedule.filter({ student_id: user.id });
    },
    enabled: !!user,
  });

  const { data: lessonHistory = [] } = useQuery({
    queryKey: ['myLessonHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.LessonHistory.filter({ student_id: user.id });
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['activeTasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Task.filter({
        student_id: user.id,
        status: 'not_started'
      });
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: inProgressTasks = [] } = useQuery({
    queryKey: ['inProgressTasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Task.filter({
        student_id: user.id,
        status: 'in_progress'
      });
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['myPracticeSessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.PracticeSession.filter({ student_id: user.id }, '-created_date', 50);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get both global and student-specific recommendations
      const allRecs = await base44.entities.Recommendation.list('-created_date');
      return allRecs.filter(rec => !rec.student_id || rec.student_id === user.id).slice(0, 3);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['studentChatMessages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.ChatMessage.filter({ student_id: user.id });
    },
    enabled: !!user,
    initialData: [],
    refetchInterval: 3000,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ is_active: true }, '-created_date', 5),
  });

  const unreadMessagesCount = chatMessages.filter(
    msg => msg.sender_role === 'teacher' && !msg.is_read_by_student
  ).length;

  const getNextLesson = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Find upcoming single lessons
    const upcomingSingleLessons = lessonHistory
      .filter(l => l.lesson_date >= todayStr)
      .sort((a, b) => a.lesson_date.localeCompare(b.lesson_date));
    
    // Find next recurring lesson
    let closestSchedule = null;
    let minDaysUntil = 8;
    const todayDay = today.getDay();
    
    for (const schedule of schedules) {
      let daysUntil = (schedule.day_of_week - todayDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      
      if (daysUntil < minDaysUntil) {
        minDaysUntil = daysUntil;
        closestSchedule = schedule;
      }
    }
    
    let nextRecurringLesson = null;
    if (closestSchedule) {
      const nextDate = addDays(today, minDaysUntil);
      nextRecurringLesson = {
        date: nextDate,
        time: closestSchedule.start_time,
        duration: closestSchedule.duration_minutes,
        location: closestSchedule.location,
        dateObj: nextDate
      };
    }
    
    // Compare and return the nearest lesson
    if (upcomingSingleLessons.length > 0) {
      const nextSingle = upcomingSingleLessons[0];
      const singleDate = parseISO(nextSingle.lesson_date);
      
      if (!nextRecurringLesson || singleDate < nextRecurringLesson.dateObj) {
        return {
          date: singleDate,
          time: nextSingle.start_time,
          duration: nextSingle.duration_minutes,
          location: nextSingle.location
        };
      }
    }
    
    return nextRecurringLesson;
  };

  const getThisWeekPracticeTime = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return practiceSessions
      .filter(s => new Date(s.created_date) > oneWeekAgo)
      .reduce((sum, s) => sum + Math.floor((s.duration_seconds || 0) / 60), 0);
  };

  const getPracticeStreak = () => {
    if (!practiceSessions || practiceSessions.length === 0) return 0;
    
    const dates = [...new Set(practiceSessions.map(s => 
      format(parseISO(s.start_time), 'yyyy-MM-dd')
    ))].sort().reverse();
    
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
    
    // Check if practiced today or yesterday
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    // Count consecutive days
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

  const nextLesson = getNextLesson();
  const thisWeekPractice = getThisWeekPracticeTime();
  const practiceStreak = getPracticeStreak();
  const allActiveTasks = [...tasks, ...inProgressTasks];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse">
          <Music className="w-12 h-12 text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('page.dashboard.greeting', { name: user.full_name?.split(' ')[0] || 'Student' })}
          </h1>
          <p className="text-gray-600 text-lg">{t('page.dashboard.subtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Next Lesson */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5" />
                {t('page.dashboard.nextLesson')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextLesson ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    {format(nextLesson.date, 'MMM d')}
                  </div>
                  <div className="text-blue-100">
                    {nextLesson.time}
                  </div>
                  <div className="text-sm text-blue-100">{nextLesson.duration} {t('page.dashboard.minutes')}</div>
                  {nextLesson.location && (
                    <div className="text-sm text-blue-100">📍 {nextLesson.location}</div>
                  )}
                </div>
              ) : (
                <div className="text-blue-100">{t('page.dashboard.noLesson')}</div>
              )}
            </CardContent>
          </Card>

          {/* Practice Streak */}
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="w-5 h-5" />
                {t('page.dashboard.practiceStreak')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-5xl font-bold">{practiceStreak}</div>
                <div className="text-orange-100">{t('page.dashboard.days')}</div>
                <div className="text-sm text-orange-100">
                  {practiceStreak > 0 ? "Keep it up! 🔥" : t('page.dashboard.startPracticing')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                {t('page.dashboard.thisWeek')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-5xl font-bold">{thisWeekPractice}</div>
                <div className="text-purple-100">{t('page.dashboard.minutes')}</div>
                <div className="text-sm text-purple-100">Total practice time</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl('StudentPractice')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group bg-white/80 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('page.dashboard.practice')}</h3>
                  <p className="text-sm text-gray-600">{t('page.dashboard.practiceDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StudentMaterials')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group bg-white/80 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('page.dashboard.materials')}</h3>
                  <p className="text-sm text-gray-600">{t('page.dashboard.materialsDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StudentChat')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group bg-white/80 backdrop-blur relative">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                  <MessageCircle className="w-7 h-7 text-white" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center justify-center gap-2">
                    {t('page.dashboard.chat')}
                    {unreadMessagesCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{t('page.dashboard.chatDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StudentProgress')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group bg-white/80 backdrop-blur">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('page.dashboard.progress')}</h3>
                  <p className="text-sm text-gray-600">{t('page.dashboard.progressDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Active Tasks */}
        {allActiveTasks.length > 0 && (
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allActiveTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      {task.status === 'in_progress' && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          In Progress
                        </span>
                      )}
                    </div>
                    {task.due_date && (
                      <Badge variant="outline" className="ml-4">
                        Due {format(parseISO(task.due_date), 'MMM d')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {allActiveTasks.length > 3 && (
                <Link to={createPageUrl('StudentTasks')}>
                  <Button variant="outline" className="w-full mt-4">
                    View All Tasks ({allActiveTasks.length})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Recommendations for You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    {rec.artist_name && (
                      <p className="text-sm text-gray-600">{rec.artist_name}</p>
                    )}
                    {rec.note && (
                      <p className="text-sm text-gray-600 italic">{rec.note}</p>
                    )}
                    {rec.youtube_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(rec.youtube_url, '_blank')}
                      >
                        Watch on YouTube
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* News Section */}
        {announcements.length > 0 && (
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-600" />
                NEWS
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
                          More Info
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}