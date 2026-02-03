import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Trophy, Award, Star, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Predefined badges that can be earned
const AVAILABLE_BADGES = [
  { id: 'first_session', title: 'First Steps', description: 'Complete your first practice session', icon: '🎵', category: 'milestone', points: 10 },
  { id: 'streak_3', title: '3-Day Streak', description: 'Practice for 3 consecutive days', icon: '🔥', category: 'consistency', points: 25 },
  { id: 'streak_7', title: 'Week Warrior', description: 'Practice for 7 consecutive days', icon: '⚡', category: 'consistency', points: 50 },
  { id: 'streak_30', title: 'Monthly Master', description: 'Practice for 30 consecutive days', icon: '👑', category: 'consistency', points: 200 },
  { id: 'time_10h', title: '10 Hour Club', description: 'Complete 10 hours of practice', icon: '⏰', category: 'practice_time', points: 100 },
  { id: 'time_50h', title: 'Dedicated Musician', description: 'Complete 50 hours of practice', icon: '🎸', category: 'practice_time', points: 300 },
  { id: 'time_100h', title: 'Practice Legend', description: 'Complete 100 hours of practice', icon: '🏆', category: 'practice_time', points: 500 },
  { id: 'tuner_perfect', title: 'Perfect Pitch', description: 'Achieve perfect tuning 10 times', icon: '🎯', category: 'accuracy', points: 75 },
  { id: 'ear_master', title: 'Ear Training Master', description: 'Score 90%+ in ear training 5 times', icon: '👂', category: 'accuracy', points: 100 },
  { id: 'early_bird', title: 'Early Bird', description: 'Practice before 8 AM', icon: '🌅', category: 'special', points: 30 },
  { id: 'night_owl', title: 'Night Owl', description: 'Practice after 10 PM', icon: '🌙', category: 'special', points: 30 },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Practice every weekend for a month', icon: '🎉', category: 'special', points: 75 },
];

export default function AchievementsTab({ studentId }) {
  const { data: achievements = [] } = useQuery({
    queryKey: ['studentAchievements', studentId],
    queryFn: () => base44.entities.Achievement.filter({ student_id: studentId }),
    enabled: !!studentId,
  });

  const earnedBadgeIds = achievements.map(a => a.badge_id);
  const earnedBadges = AVAILABLE_BADGES.filter(b => earnedBadgeIds.includes(b.id));
  const lockedBadges = AVAILABLE_BADGES.filter(b => !earnedBadgeIds.includes(b.id));

  const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);

  const categoryStats = {
    practice_time: achievements.filter(a => a.category === 'practice_time').length,
    consistency: achievements.filter(a => a.category === 'consistency').length,
    accuracy: achievements.filter(a => a.category === 'accuracy').length,
    milestone: achievements.filter(a => a.category === 'milestone').length,
    special: achievements.filter(a => a.category === 'special').length,
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{achievements.length}</div>
              <div className="text-sm opacity-90">Total</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Badges Earned</div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{totalPoints}</div>
              <div className="text-sm opacity-90">Total</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Achievement Points</div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{Math.round((earnedBadges.length / AVAILABLE_BADGES.length) * 100)}%</div>
              <div className="text-sm opacity-90">Complete</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Overall Progress</div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-6 border-none shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-10 h-10 opacity-80" />
            <div className="text-right">
              <div className="text-4xl font-black">{lockedBadges.length}</div>
              <div className="text-sm opacity-90">Remaining</div>
            </div>
          </div>
          <div className="text-sm opacity-90">Badges to Unlock</div>
        </Card>
      </div>

      {/* Category Progress */}
      <Card className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Progress by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(categoryStats).map(([category, count]) => (
            <div key={category} className="text-center p-4 bg-gray-50 rounded-2xl">
              <div className="text-3xl font-black text-cyan-600 mb-1">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{category.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">🏆 Earned Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {earnedBadges.map((badge) => {
              const achievement = achievements.find(a => a.badge_id === badge.id);
              return (
                <Card key={badge.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 p-6 shadow-xl hover:shadow-2xl transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg mb-1">{badge.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold">
                          +{badge.points} pts
                        </span>
                        {achievement && (
                          <span className="text-xs text-gray-500">
                            {format(parseISO(achievement.earned_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">🔒 Locked Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lockedBadges.map((badge) => (
              <Card key={badge.id} className="bg-white border-2 border-gray-200 p-6 shadow-xl opacity-60 hover:opacity-80 transition-opacity">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center text-3xl grayscale">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{badge.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold">
                      +{badge.points} pts
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}