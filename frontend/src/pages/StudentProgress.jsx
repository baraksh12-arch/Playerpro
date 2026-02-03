import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewTab from '../components/progress/OverviewTab';
import StatisticsTab from '../components/progress/StatisticsTab';
import GoalsTab from '../components/progress/GoalsTab';
import AchievementsTab from '../components/progress/AchievementsTab';
import { useI18n } from '@/Layout';

export default function StudentProgress() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">{t('page.progress.title')}</h1>
          <p className="text-xl text-gray-500">{t('page.progress.subtitle')}</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14">
            <TabsTrigger value="overview" className="text-lg">
              📊 {t('page.progress.overview')}
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-lg">
              📈 {t('page.progress.statistics')}
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-lg">
              🎯 {t('page.progress.goals')}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-lg">
              🏆 {t('page.progress.achievements')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab studentId={user?.id} />
          </TabsContent>

          <TabsContent value="statistics">
            <StatisticsTab studentId={user?.id} />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsTab studentId={user?.id} />
          </TabsContent>

          <TabsContent value="achievements">
            <AchievementsTab studentId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}