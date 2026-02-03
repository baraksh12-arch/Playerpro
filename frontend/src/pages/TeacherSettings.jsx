import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Check, AlertCircle, ShieldCheck, RefreshCw, Crown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '../Layout';
import InviteStudentsPanel from '@/components/activation/InviteStudentsPanel';

export default function TeacherSettings() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Invite student form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLevel, setInviteLevel] = useState('1');
  const [inviteStyle, setInviteStyle] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      return user;
    },
  });

  // Fetch references for this teacher
  const { data: references = [] } = useQuery({
    queryKey: ['teacherReferences', currentUser?.id],
    queryFn: () => base44.entities.Reference.filter({ assigned_teacher_id: currentUser?.id }),
    enabled: !!currentUser?.id,
  });

  // Fetch registered students
  const { data: registeredUsers = [] } = useQuery({
    queryKey: ['allStudents'],
    queryFn: () => base44.entities.User.filter({ role: 'user' }),
  });

  // Sync status mutation
  const syncStatusMutation = useMutation({
    mutationFn: async () => {
      const userEmails = new Set(registeredUsers.map(u => u.email?.toLowerCase()));
      const userMap = new Map(registeredUsers.map(u => [u.email?.toLowerCase(), u]));
      
      const refUpdates = [];
      const userUpdates = [];
      
      for (const ref of references) {
        const email = ref.email?.toLowerCase();
        const isRegistered = userEmails.has(email);
        const user = userMap.get(email);
        
        // Update reference status
        if (ref.is_registered !== isRegistered || (isRegistered && ref.registered_user_id !== user?.id)) {
          refUpdates.push({
            id: ref.id,
            is_registered: isRegistered,
            registered_user_id: user?.id || null
          });
        }
        
        // If user is registered, sync teacher, level, style, phone from reference to user
        if (isRegistered && user) {
          const userUpdateData = {};
          let needsUpdate = false;
          
          if (ref.assigned_teacher_id && user.assigned_teacher_id !== ref.assigned_teacher_id) {
            userUpdateData.assigned_teacher_id = ref.assigned_teacher_id;
            needsUpdate = true;
          }
          if (ref.level && user.level !== ref.level) {
            userUpdateData.level = ref.level;
            needsUpdate = true;
          }
          if (ref.style && user.main_style !== ref.style) {
            userUpdateData.main_style = ref.style;
            needsUpdate = true;
          }
          if (ref.phone && !user.phone) {
            userUpdateData.phone = ref.phone;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            userUpdates.push({ userId: user.id, data: userUpdateData });
          }
        }
      }
      
      for (const update of refUpdates) {
        await base44.entities.Reference.update(update.id, {
          is_registered: update.is_registered,
          registered_user_id: update.registered_user_id
        });
      }
      
      for (const update of userUpdates) {
        await base44.entities.User.update(update.userId, update.data);
      }
      
      return { refCount: refUpdates.length, userCount: userUpdates.length };
    },
    onSuccess: ({ refCount, userCount }) => {
      queryClient.invalidateQueries({ queryKey: ['teacherReferences'] });
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (refCount > 0 || userCount > 0) {
        alert(`Synced ${refCount} reference(s) and updated ${userCount} student(s)`);
      } else {
        alert('All data is already in sync!');
      }
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      alert(t('page.teacherSettings.profileUpdated'));
    },
  });

  const inviteStudentMutation = useMutation({
    mutationFn: async (studentData) => {
      // Create Reference entity instead of sending email
      await base44.entities.Reference.create({
        full_name: studentData.name,
        email: studentData.email.trim().toLowerCase(),
        phone: studentData.phone || '',
        assigned_teacher_id: currentUser.id,
        assigned_teacher_name: currentUser.full_name || '',
        import_batch: `teacher_invite_${Date.now()}`,
        import_date: new Date().toISOString(),
        is_registered: false,
        registered_user_id: null,
        level: parseInt(studentData.level) || 1,
        style: studentData.style || ''
      });
    },
    onSuccess: () => {
      setInviteStatus({ type: 'success', message: 'Student added to waiting list successfully!' });
      queryClient.invalidateQueries({ queryKey: ['references'] });
      // Clear form
      setInviteEmail('');
      setInviteName('');
      setInviteLevel('1');
      setInviteStyle('');
      setInvitePhone('');
      
      // Clear status after 5 seconds
      setTimeout(() => setInviteStatus(null), 5000);
    },
    onError: (error) => {
      console.error('Add reference error:', error);
      setInviteStatus({ type: 'error', message: `Failed to add student: ${error.message || 'Please try again'}` });
      setTimeout(() => setInviteStatus(null), 5000);
    },
  });

  const handleInviteStudent = () => {
    if (!inviteEmail || !inviteName) {
      setInviteStatus({ type: 'error', message: t('page.teacherSettings.fillEmailName') });
      setTimeout(() => setInviteStatus(null), 3000);
      return;
    }

    inviteStudentMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      level: inviteLevel,
      style: inviteStyle,
      phone: invitePhone,
    });
  };

  // Check if user is platform admin (can access management)
  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('page.teacherSettings.title')}</h1>

      {/* Invite Students Panel - New Code System */}
      <InviteStudentsPanel teacherId={currentUser?.id} accountStatus={currentUser?.account_status || 'active'} />

      {/* Invite Student Section - Legacy */}
      <Card className="border-none shadow-lg mb-6 bg-gradient-to-br from-cyan-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-600" />
            {t('page.teacherSettings.inviteStudent')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('page.teacherSettings.studentEmail')} *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="student@email.com"
                className="bg-white"
              />
            </div>
            <div>
              <Label>{t('page.teacherSettings.studentName')} *</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
                className="bg-white"
              />
            </div>
            <div>
              <Label>{t('page.teacherSettings.skillLevel')} (1-8)</Label>
              <Select value={inviteLevel} onValueChange={setInviteLevel}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                  <SelectItem value="6">Level 6</SelectItem>
                  <SelectItem value="7">Level 7</SelectItem>
                  <SelectItem value="8">Level 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('page.teacherSettings.musicStyle')}</Label>
              <Input
                value={inviteStyle}
                onChange={(e) => setInviteStyle(e.target.value)}
                placeholder={t('page.teacherSettings.musicStylePlaceholder')}
                className="bg-white"
              />
            </div>
            <div>
              <Label>{t('page.teacherSettings.phoneOptional')}</Label>
              <Input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder={t('page.teacherSettings.phonePlaceholder')}
                className="bg-white"
              />
            </div>
          </div>

          {inviteStatus && (
            <div className={`flex items-center gap-2 p-4 rounded-2xl ${
              inviteStatus.type === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {inviteStatus.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{inviteStatus.message}</span>
            </div>
          )}

          <Button
            onClick={handleInviteStudent}
            disabled={inviteStudentMutation.isPending}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {inviteStudentMutation.isPending ? 'Adding...' : 'Add to Waiting List'}
          </Button>

          <p className="text-sm text-gray-600 text-center">
            Student will be added to your waiting list. They can register with the same email to link their account.
          </p>

          {/* Sync Status Button */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">My Waiting List:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {references.length} total
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {references.filter(r => r.is_registered).length} active
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => syncStatusMutation.mutate()}
              disabled={syncStatusMutation.isPending}
              className="w-full gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatusMutation.isPending ? 'animate-spin' : ''}`} />
              {syncStatusMutation.isPending ? 'Syncing...' : 'Sync Status (Update Students from Waiting List)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <CardTitle>{t('page.teacherSettings.profileInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('page.teacherSettings.name')}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('page.teacherSettings.email')}</Label>
            <Input
              value={currentUser?.email}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>{t('page.teacherSettings.phone')}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('page.teacherSettings.phonePlaceholder')}
            />
          </div>
          <Button
            onClick={() => updateProfileMutation.mutate({ full_name: fullName, phone })}
            disabled={updateProfileMutation.isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {updateProfileMutation.isLoading ? t('common.loading') : t('page.teacherSettings.saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <CardTitle>{t('page.teacherSettings.aboutTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {t('page.teacherSettings.aboutDesc')}
          </p>
          <p className="text-sm text-gray-500">
            {t('page.teacherSettings.aboutVersion')}
          </p>
        </CardContent>
      </Card>

      {/* Management Access - Only show for platform admins */}
      {isAdmin && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-orange-600" />
              {t('page.teacherSettings.managementAccess')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-100 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                You have admin access to the Management Dashboard
              </span>
            </div>
            <Button 
              onClick={() => navigate(createPageUrl('ManagementDashboard'))}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              Open Management Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}