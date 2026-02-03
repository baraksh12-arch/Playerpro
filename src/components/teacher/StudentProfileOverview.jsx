import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, Music, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, addDays } from 'date-fns';

export default function StudentProfileOverview({ studentId, student }) {
  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['studentPractice', studentId],
    queryFn: () => base44.entities.PracticeSession.filter({ student_id: studentId }, '-created_date', 50),
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['studentRecordings', studentId],
    queryFn: () => base44.entities.Recording.filter({ student_id: studentId }, '-created_date', 10),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['studentTasks', studentId],
    queryFn: () => base44.entities.Task.filter({ student_id: studentId }),
  });

  const calculateStreak = () => {
    if (!practiceSessions.length) return 0;
    
    const dates = [...new Set(practiceSessions.map(s => 
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

  const getTotalPracticeTime = () => {
    return practiceSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  };

  const streak = calculateStreak();
  const totalMinutes = Math.floor(getTotalPracticeTime() / 60);
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Practice Streak</p>
                <p className="text-3xl font-bold text-gray-900">{streak}</p>
                <p className="text-xs text-gray-500">days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Practice</p>
                <p className="text-3xl font-bold text-gray-900">{totalMinutes}</p>
                <p className="text-xs text-gray-500">minutes</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Recordings</p>
                <p className="text-3xl font-bold text-gray-900">{recordings.length}</p>
              </div>
              <Music className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tasks Done</p>
                <p className="text-3xl font-bold text-gray-900">{completedTasks}/{tasks.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Practice Sessions */}
      <Card className="border-none shadow-lg">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Practice Sessions</h3>
          {practiceSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No practice sessions yet</p>
          ) : (
            <div className="space-y-3">
              {practiceSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{session.type}</p>
                    <p className="text-sm text-gray-600">
                      {format(parseISO(session.start_time), 'MMM d, yyyy • HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-cyan-600">{Math.floor(session.duration_seconds / 60)} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Recordings */}
      <Card className="border-none shadow-lg">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Recordings</h3>
          {recordings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recordings yet</p>
          ) : (
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{recording.title}</p>
                    <p className="text-sm text-gray-600">
                      {Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <audio src={recording.url} controls className="w-full" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}