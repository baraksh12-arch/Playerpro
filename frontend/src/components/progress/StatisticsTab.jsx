import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { format, parseISO, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function StatisticsTab({ studentId }) {
  const [timeRange, setTimeRange] = useState('week'); // week, month, all

  const { data: practiceSessions = [] } = useQuery({
    queryKey: ['studentPracticeSessions', studentId],
    queryFn: () => base44.entities.PracticeSession.filter({ student_id: studentId }, '-created_date', 200),
    enabled: !!studentId,
  });

  // Filter sessions by time range
  const getFilteredSessions = () => {
    const now = new Date();
    if (timeRange === 'week') {
      const weekAgo = subDays(now, 7);
      return practiceSessions.filter(s => parseISO(s.start_time) >= weekAgo);
    } else if (timeRange === 'month') {
      const monthAgo = subDays(now, 30);
      return practiceSessions.filter(s => parseISO(s.start_time) >= monthAgo);
    }
    return practiceSessions;
  };

  const filteredSessions = getFilteredSessions();

  // Daily practice time chart data
  const getDailyData = () => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 60;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySessions = filteredSessions.filter(s => 
        format(parseISO(s.start_time), 'yyyy-MM-dd') === dateStr
      );
      const minutes = daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
      
      data.push({
        date: format(date, 'MMM d'),
        minutes: Math.round(minutes),
      });
    }
    
    return data;
  };

  // Practice type distribution
  const getTypeDistribution = () => {
    const types = {};
    filteredSessions.forEach(s => {
      types[s.type] = (types[s.type] || 0) + 1;
    });
    
    return Object.entries(types).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  // Weekly comparison
  const getWeeklyComparison = () => {
    const thisWeekStart = startOfWeek(new Date());
    const lastWeekStart = subDays(thisWeekStart, 7);
    
    const thisWeek = practiceSessions.filter(s => {
      const date = parseISO(s.start_time);
      return date >= thisWeekStart;
    }).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
    
    const lastWeek = practiceSessions.filter(s => {
      const date = parseISO(s.start_time);
      return date >= lastWeekStart && date < thisWeekStart;
    }).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
    
    return [
      { week: 'Last Week', minutes: Math.round(lastWeek) },
      { week: 'This Week', minutes: Math.round(thisWeek) },
    ];
  };

  const dailyData = getDailyData();
  const typeData = getTypeDistribution();
  const weeklyData = getWeeklyComparison();

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Practice Analytics</h3>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Daily Practice Time Chart */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Daily Practice Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
              formatter={(value) => [`${value} min`, 'Practice Time']}
            />
            <Bar dataKey="minutes" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Practice Type Distribution */}
        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Practice Type Distribution</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </Card>

        {/* Weekly Comparison */}
        <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Weekly Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
                formatter={(value) => [`${value} min`, 'Total Time']}
              />
              <Bar dataKey="minutes" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl">
            <div className="text-3xl font-black text-cyan-600 mb-1">{filteredSessions.length}</div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
            <div className="text-3xl font-black text-purple-600 mb-1">
              {Math.round(filteredSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60)}
            </div>
            <div className="text-sm text-gray-600">Total Minutes</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
            <div className="text-3xl font-black text-orange-600 mb-1">
              {filteredSessions.length > 0 
                ? Math.round(filteredSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / filteredSessions.length / 60)
                : 0
              }
            </div>
            <div className="text-sm text-gray-600">Avg. Duration</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
            <div className="text-3xl font-black text-green-600 mb-1">
              {filteredSessions.length > 0
                ? new Set(filteredSessions.map(s => format(parseISO(s.start_time), 'yyyy-MM-dd'))).size
                : 0
              }
            </div>
            <div className="text-sm text-gray-600">Practice Days</div>
          </div>
        </div>
      </Card>
    </div>
  );
}