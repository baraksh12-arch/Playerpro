import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, Award, Clock, Zap } from 'lucide-react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

export default function OverviewTab({ studentId }) {
  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['studentPracticeSessions', studentId],
    queryFn: () => base44.entities.PracticeSession.filter({ student_id: studentId }, '-created_date', 200),
    enabled: !!studentId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['studentGoals', studentId],
    queryFn: () => base44.entities.PracticeGoal.filter({ student_id: studentId }),
    enabled: !!studentId,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['studentAchievements', studentId],
    queryFn: () => base44.entities.Achievement.filter({ student_id: studentId }),
    enabled: !!studentId,
  });

  // Calculate statistics
  const calculateStreak = () => {
    if (!practiceSessions.length) return 0;
    
    const dates = [...new Set(practiceSessions.map(s => 
      format(parseISO(s.start_time), 'yyyy-MM-dd')
    ))].sort().reverse();
    
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (dates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTotalPracticeTime = () => {
    const totalSeconds = practiceSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    return Math.floor(totalSeconds / 60);
  };

  const getWeeklyPracticeTime = () => {
    const weekAgo = subDays(new Date(), 7);
    const recentSessions = practiceSessions.filter(s => {
      const sessionDate = parseISO(s.start_time);
      return differenceInDays(new Date(), sessionDate) <= 7;
    });
    const totalSeconds = recentSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    return Math.floor(totalSeconds / 60);
  };

  const getAverageSessionDuration = () => {
    if (!practiceSessions.length) return 0;
    const totalSeconds = practiceSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    return Math.floor(totalSeconds / practiceSessions.length / 60);
  };

  const getLongestStreak = () => {
    if (!practiceSessions.length) return 0;
    
    const dates = [...new Set(practiceSessions.map(s => 
      format(parseISO(s.start_time), 'yyyy-MM-dd')
    ))].sort();
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const daysDiff = differenceInDays(currDate, prevDate);
      
      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  };

  const getTotalPoints = () => {
    return achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  };

  const getActiveGoalsProgress = () => {
    const activeGoals = goals.filter(g => !g.is_completed);
    if (!activeGoals.length) return 0;
    
    const totalProgress = activeGoals.reduce((sum, g) => {
      const progress = Math.min((g.current_value / g.target_value) * 100, 100);
      return sum + progress;
    }, 0);
    
    return Math.round(totalProgress / activeGoals.length);
  };

  const streak = calculateStreak();
  const totalMinutes = getTotalPracticeTime();
  const weeklyMinutes = getWeeklyPracticeTime();
  const avgDuration = getAverageSessionDuration();
  const longestStreak = getLongestStreak();
  const totalPoints = getTotalPoints();
  const goalsProgress = getActiveGoalsProgress();

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{streak}</div>
              <div className="text-sm opacity-90">days</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Current Streak</div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{totalMinutes}</div>
              <div className="text-sm opacity-90">minutes</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Total Practice Time</div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{totalPoints}</div>
              <div className="text-sm opacity-90">points</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Achievement Points</div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{achievements.length}</div>
              <div className="text-sm opacity-90">earned</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Total Badges</div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{weeklyMinutes}</div>
              <div className="text-sm text-gray-500">minutes</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">This Week</div>
        </Card>

        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{avgDuration}</div>
              <div className="text-sm text-gray-500">minutes</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Avg. Session</div>
        </Card>

        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{longestStreak}</div>
              <div className="text-sm text-gray-500">days</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Longest Streak</div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Practice Sessions</h3>
        {practiceSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No practice sessions yet</p>
        ) : (
          <div className="space-y-3">
            {practiceSessions.slice(0, 10).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">
                      {session.type === 'scales' && '🎼'}
                      {session.type === 'song' && '🎵'}
                      {session.type === 'technique' && '⚡'}
                      {session.type === 'free' && '🎸'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{session.type}</p>
                    <p className="text-sm text-gray-600">
                      {format(parseISO(session.start_time), 'MMM d, yyyy • HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-cyan-600">{Math.floor(session.duration_seconds / 60)} min</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Goals Progress Overview */}
      {goals.filter(g => !g.is_completed).length > 0 && (
        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-500" />
            Active Goals Progress
          </h3>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
              <span className="text-lg font-bold text-cyan-600">{goalsProgress}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                style={{ width: `${goalsProgress}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.filter(g => !g.is_completed).slice(0, 4).map((goal) => {
              const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
              return (
                <div key={goal.id} className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-semibold text-gray-900 mb-2">{goal.title}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {goal.current_value.toFixed(0)} / {goal.target_value} {goal.unit}
                    </span>
                    <span className="text-sm font-bold text-cyan-600">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}