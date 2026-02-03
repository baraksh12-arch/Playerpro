import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, GraduationCap, TrendingUp, Activity, Megaphone, Plus, Trash2, ExternalLink, Download, Link as LinkIcon, FileText, X, Upload } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InstrumentSelector from '../components/management/InstrumentSelector';
import MultiInstrumentSelector from '../components/management/MultiInstrumentSelector';
import TeacherSelector from '../components/management/TeacherSelector';
import CSVImporter from '../components/management/CSVImporter';
import ReferenceList from '../components/management/ReferenceList';
import ManagementSerialsPanel from '@/components/activation/ManagementSerialsPanel';
import TeacherSubscriptionManager from '@/components/management/TeacherSubscriptionManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ManagementDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showAddTeacherUpdate, setShowAddTeacherUpdate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmTeacher, setConfirmTeacher] = useState(null);
  const [confirmParent, setConfirmParent] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    description: '',
    event_type: 'general',
    event_date: '',
    location: '',
    image_url: '',
    link_url: '',
  });
  const [newTeacherUpdate, setNewTeacherUpdate] = useState({
    title: '',
    message: '',
    target_instruments: [],
    priority: 'normal',
    attachments: []
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if user is admin (management) - only platform admins can access this page
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUserManagement'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Only platform admins can access management dashboard
      const authorized = user?.role === 'admin';
      setIsAuthorized(authorized);
      setAuthChecked(true);
      return user;
    },
  });

  // Fetch all users (students - regular users without teacher app_role)
  const { data: students = [] } = useQuery({
    queryKey: ['allStudents'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ role: 'user' });
      // Filter out users with teacher app_role (they're teachers, not students)
      return users.filter(u => u.app_role !== 'teacher');
    },
    enabled: isAuthorized,
  });

  // Fetch all teachers (platform admins OR users with app_role=teacher)
  const { data: teachers = [] } = useQuery({
    queryKey: ['allTeachers'],
    queryFn: async () => {
      // Get platform admins
      const admins = await base44.entities.User.filter({ role: 'admin' });
      // Get users with teacher app_role
      const teacherRoleUsers = await base44.entities.User.filter({ app_role: 'teacher' });
      
      // Combine and deduplicate
      const teacherMap = new Map();
      [...admins, ...teacherRoleUsers].forEach(t => teacherMap.set(t.id, t));
      return Array.from(teacherMap.values());
    },
    enabled: isAuthorized,
  });

  // Fetch all users by agent_role
  const { data: parents = [] } = useQuery({
    queryKey: ['allParents'],
    queryFn: () => base44.entities.User.filter({ agent_role: 'parent' }),
    enabled: isAuthorized,
  });

  const { data: management = [] } = useQuery({
    queryKey: ['allManagement'],
    queryFn: () => base44.entities.User.filter({ agent_role: 'management' }),
    enabled: isAuthorized,
  });

  // Fetch all practice sessions for analytics
  const { data: allPracticeSessions = [] } = useQuery({
    queryKey: ['allPracticeSessions'],
    queryFn: () => base44.entities.PracticeSession.list(),
    enabled: isAuthorized,
  });

  // Fetch all tasks for analytics
  const { data: allTasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: isAuthorized,
  });

  // Fetch all announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
    enabled: isAuthorized,
  });

  // Fetch all teacher updates
  const { data: teacherUpdates = [] } = useQuery({
    queryKey: ['teacherUpdates'],
    queryFn: () => base44.entities.TeacherUpdate.filter({ is_active: true }, '-created_date'),
    enabled: isAuthorized,
  });

  // Update student's assigned teacher and/or instrument
  const updateStudentTeacherMutation = useMutation({
    mutationFn: ({ studentId, teacherId, instruments, level, parentId }) => {
      const updates = {};
      if (teacherId !== undefined) updates.assigned_teacher_id = teacherId;
      if (instruments !== undefined) updates.instruments = instruments;
      if (level !== undefined) updates.level = level;
      if (parentId !== undefined) updates.assigned_parent_id = parentId;
      return base44.entities.User.update(studentId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['allParents'] });
    },
  });

  // Promote student to teacher (app_role only, NOT platform admin)
  const promoteToTeacherMutation = useMutation({
    mutationFn: (studentId) => {
      // Only set app_role to teacher - user stays as 'user' in platform role
      // This gives them teacher features without admin access
      return base44.entities.User.update(studentId, { app_role: 'teacher', agent_role: 'teacher' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
      setConfirmTeacher(null);
    },
  });

  // Promote teacher to management
  const promoteToManagementMutation = useMutation({
    mutationFn: (teacherId) => {
      return base44.entities.User.update(teacherId, { agent_role: 'management' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['allManagement'] });
    },
  });

  // Promote student to parent
  const promoteToParentMutation = useMutation({
    mutationFn: (studentId) => {
      return base44.entities.User.update(studentId, { agent_role: 'parent' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allParents'] });
      setConfirmParent(null);
    },
  });

  // Create announcement
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Announcement.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowAddAnnouncement(false);
      setNewAnnouncement({
        title: '',
        description: '',
        event_type: 'general',
        event_date: '',
        location: '',
        image_url: '',
        link_url: '',
      });
    },
  });

  // Delete announcement
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Announcement.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  // Create teacher update
  const createTeacherUpdateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.TeacherUpdate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherUpdates'] });
      setShowAddTeacherUpdate(false);
      setNewTeacherUpdate({
        title: '',
        message: '',
        target_instruments: [],
        priority: 'normal',
        attachments: []
      });
    },
  });

  // Delete teacher update
  const deleteTeacherUpdateMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TeacherUpdate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherUpdates'] });
    },
  });

  // Helper function to generate 4-letter random password
  const generateAgentPass = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let pass = '';
    for (let i = 0; i < 4; i++) {
      pass += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return pass;
  };

  // Sync all users to AgentInfo
  const syncToAgentInfoMutation = useMutation({
    mutationFn: async () => {
      // Get existing AgentInfo records
      const existingAgentInfo = await base44.entities.AgentInfo.list();
      const existingMap = new Map(existingAgentInfo.map(ai => [ai.student_id, ai]));

      // Collect all users to sync
      const allUsers = [
        ...students.map(s => ({ ...s, agent_role: s.agent_role || 'student' })),
        ...teachers.map(t => ({ ...t, agent_role: t.agent_role || 'teacher' })),
        ...parents,
        ...management
      ];
      
      let newCount = 0;

      // Generate and update agentpass for all users
      await Promise.all(
        allUsers.map(async (user) => {
          let agentpass = user.agentpass;
          
          // Generate new password if user doesn't have one
          if (!agentpass) {
            agentpass = generateAgentPass();
            await base44.entities.User.update(user.id, { agentpass, agent_role: user.agent_role });
          } else if (!user.agent_role) {
            await base44.entities.User.update(user.id, { agent_role: user.agent_role });
          }
          
          // Create or update AgentInfo
          if (existingMap.has(user.id)) {
            const existingRecord = existingMap.get(user.id);
            await base44.entities.AgentInfo.update(existingRecord.id, {
              student_name: user.full_name || user.email,
              student_email: user.email,
              assigned_teacher_id: user.assigned_teacher_id,
              agentpass: agentpass,
              role: user.agent_role
            });
          } else {
            await base44.entities.AgentInfo.create({
              student_id: user.id,
              student_name: user.full_name || user.email,
              student_email: user.email,
              assigned_teacher_id: user.assigned_teacher_id,
              agentpass: agentpass,
              role: user.agent_role
            });
            newCount++;
          }
        })
      );

      return { total: allUsers.length, new: newCount };
    },
    onSuccess: ({ total, new: newCount }) => {
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['allParents'] });
      queryClient.invalidateQueries({ queryKey: ['allManagement'] });
      alert(`✓ Successfully synced ${total} user(s) to AgentInfo (${newCount} new)`);
    },
    onError: () => {
      alert('Failed to sync users to AgentInfo');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewAnnouncement({ ...newAnnouncement, image_url: file_url });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewTeacherUpdate({
        ...newTeacherUpdate,
        attachments: [...newTeacherUpdate.attachments, { type: 'file', url: file_url, name: file.name }]
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const addLinkAttachment = () => {
    const link = prompt('Enter link URL:');
    if (link) {
      const name = prompt('Enter link name:');
      setNewTeacherUpdate({
        ...newTeacherUpdate,
        attachments: [...newTeacherUpdate.attachments, { type: 'link', url: link, name: name || link }]
      });
    }
  };

  const removeAttachment = (index) => {
    setNewTeacherUpdate({
      ...newTeacherUpdate,
      attachments: newTeacherUpdate.attachments.filter((_, i) => i !== index)
    });
  };

  // Analytics calculations
  const totalPracticeMinutes = allPracticeSessions.reduce(
    (sum, session) => sum + (session.duration_seconds || 0) / 60, 
    0
  );
  const completedTasks = allTasks.filter(task => task.status === 'done').length;
  const totalTasks = allTasks.length;
  const taskCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.full_name || 'Not assigned';
  };

  const getParentName = (parentId) => {
    const parent = parents.find(p => p.id === parentId);
    return parent?.full_name || 'Not assigned';
  };

  const exportToCSV = (data, filename) => {
    const csv = data.map(row => Object.values(row).map(val => `"${val || ''}"`).join(',')).join('\n');
    const header = Object.keys(data[0]).join(',');
    const csvContent = header + '\n' + csv;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportStudentsCSV = () => {
    const data = students.map(student => ({
      'Name': student.full_name || 'N/A',
      'Email': student.email,
      'Level': student.level || 'N/A',
      'Instruments': Array.isArray(student.instruments) ? student.instruments.join(', ') : 'N/A',
      'Assigned Teacher': getTeacherName(student.assigned_teacher_id),
      'Phone': student.phone || 'N/A',
      'Main Style': student.main_style || 'N/A'
    }));
    exportToCSV(data, 'students.csv');
  };

  const exportTeachersCSV = () => {
    const data = teachers.map(teacher => {
      const assignedStudentsCount = students.filter(s => s.assigned_teacher_id === teacher.id).length;
      return {
        'Name': teacher.full_name || 'N/A',
        'Email': teacher.email,
        'Phone': teacher.phone || 'N/A',
        'Instruments': Array.isArray(teacher.instruments) ? teacher.instruments.join(', ') : 'N/A',
        'Assigned Students': assignedStudentsCount
      };
    });
    exportToCSV(data, 'teachers.csv');
  };

  const exportAnnouncementsCSV = () => {
    const data = announcements.map(announcement => ({
      'Title': announcement.title,
      'Description': announcement.description,
      'Event Type': announcement.event_type,
      'Event Date': announcement.event_date || 'N/A',
      'Location': announcement.location || 'N/A',
      'Link': announcement.link_url || 'N/A',
      'Active': announcement.is_active ? 'Yes' : 'No',
      'Created Date': announcement.created_date
    }));
    exportToCSV(data, 'announcements.csv');
  };

  // Loading state
  if (userLoading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Access denied - not a platform admin
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md w-full border-none shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              The Management Dashboard is only accessible to platform administrators.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              If you believe you should have access, please contact your system administrator.
            </p>
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Your current access level:</p>
              <p>Role: <span className="font-mono">{currentUser?.role || 'user'}</span></p>
              <p>App Role: <span className="font-mono">{currentUser?.app_role || 'none'}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Management Dashboard</h1>
        <p className="text-gray-600">Overview and management of all teachers and students</p>
        <p className="text-xs text-green-600 mt-1">✓ Logged in as: {currentUser?.email} (Admin)</p>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{students.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Teachers</p>
                <p className="text-3xl font-bold text-purple-600">{teachers.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Practice Time</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(totalPracticeMinutes)}m
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Task Completion</p>
                <p className="text-3xl font-bold text-orange-600">{taskCompletionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Teachers, Students, and Announcements */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="serials">Serials</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="teacherUpdates">Updates</TabsTrigger>
          <TabsTrigger value="userCSV">CSV Import</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Students</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => syncToAgentInfoMutation.mutate()}
                    disabled={syncToAgentInfoMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {syncToAgentInfoMutation.isLoading ? 'Syncing...' : 'Sync to AI Agent'}
                  </Button>
                  <Button
                    onClick={exportStudentsCSV}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Level</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Instruments (up to 2)</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Assigned Teacher</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Assign Teacher</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Assigned Parent</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Assign Parent</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Promote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr 
                        key={student.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-cyan-700">
                                {student.full_name?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{student.full_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">{student.email}</td>
                        <td className="py-4 px-4">
                          <Select
                            value={student.level?.toString() || ''}
                            onValueChange={(value) => 
                              updateStudentTeacherMutation.mutate({ 
                                studentId: student.id,
                                level: parseInt(value)
                              })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                                <SelectItem key={level} value={level.toString()}>
                                  Level {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-4 px-4">
                          <MultiInstrumentSelector
                            value={student.instruments || []}
                            onChange={(value) => 
                              updateStudentTeacherMutation.mutate({ 
                                studentId: student.id,
                                instruments: value
                              })
                            }
                          />
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {getTeacherName(student.assigned_teacher_id)}
                        </td>
                        <td className="py-4 px-4">
                          <TeacherSelector
                            value={student.assigned_teacher_id}
                            teachers={teachers}
                            onChange={(value) => 
                              updateStudentTeacherMutation.mutate({ 
                                studentId: student.id, 
                                teacherId: value 
                              })
                            }
                          />
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {getParentName(student.assigned_parent_id)}
                        </td>
                        <td className="py-4 px-4">
                          <TeacherSelector
                            value={student.assigned_parent_id}
                            teachers={parents}
                            onChange={(value) => 
                              updateStudentTeacherMutation.mutate({ 
                                studentId: student.id, 
                                parentId: value 
                              })
                            }
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setConfirmTeacher(student)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600"
                            >
                              Claim Teacher
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setConfirmParent(student)}
                              className="bg-gradient-to-r from-pink-500 to-purple-600"
                            >
                              Claim Parent
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parents Tab */}
        <TabsContent value="parents">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Parents</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Children</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.map((parent, index) => {
                      const childrenCount = students.filter(s => s.assigned_parent_id === parent.id).length;
                      
                      return (
                        <tr 
                          key={parent.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-pink-700">
                                  {parent.full_name?.[0]?.toUpperCase() || parent.email[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="font-semibold text-gray-900">{parent.full_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{parent.email}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{parent.phone || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                              {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No parents registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Management Team</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {management.map((mgmt, index) => (
                      <tr 
                        key={mgmt.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-indigo-700">
                                {mgmt.full_name?.[0]?.toUpperCase() || mgmt.email[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{mgmt.full_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">{mgmt.email}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{mgmt.phone || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                            {mgmt.role === 'admin' ? 'Admin' : 'Management'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {management.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No management members yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teacher Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <TeacherSubscriptionManager />
        </TabsContent>

        {/* Teacher Serials Tab */}
        <TabsContent value="serials">
          <ManagementSerialsPanel />
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Teachers</h2>
                <Button
                  onClick={exportTeachersCSV}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Access Level</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Instruments (up to 2)</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Students</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher, index) => {
                      const assignedStudentsCount = students.filter(
                        s => s.assigned_teacher_id === teacher.id
                      ).length;
                      const isPlatformAdmin = teacher.role === 'admin';
                      const isTeacherOnly = teacher.app_role === 'teacher' && teacher.role !== 'admin';
                      
                      return (
                        <tr 
                          key={teacher.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isPlatformAdmin 
                                  ? 'bg-gradient-to-br from-amber-100 to-orange-100' 
                                  : 'bg-gradient-to-br from-purple-100 to-pink-100'
                              }`}>
                                <span className={`text-sm font-bold ${
                                  isPlatformAdmin ? 'text-amber-700' : 'text-purple-700'
                                }`}>
                                  {teacher.full_name?.[0]?.toUpperCase() || teacher.email[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="font-semibold text-gray-900">{teacher.full_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{teacher.email}</td>
                          <td className="py-4 px-4">
                            {isPlatformAdmin ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                                👑 Admin
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                🎸 Teacher
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{teacher.phone || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <MultiInstrumentSelector
                              value={teacher.instruments || []}
                              onChange={(value) => 
                                updateStudentTeacherMutation.mutate({ 
                                  studentId: teacher.id,
                                  instruments: value
                                })
                              }
                            />
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                              {assignedStudentsCount}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              {isTeacherOnly && (
                                <Button
                                  size="sm"
                                  onClick={() => promoteToManagementMutation.mutate(teacher.id)}
                                  disabled={teacher.agent_role === 'management'}
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                                >
                                  {teacher.agent_role === 'management' ? '✓ Mgmt' : 'Make Mgmt'}
                                </Button>
                              )}
                              {isPlatformAdmin && (
                                <span className="text-xs text-gray-500 italic">Full access</span>
                              )}
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
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">All Announcements</h2>
                <div className="flex gap-3">
                  <Button
                    onClick={exportAnnouncementsCSV}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => setShowAddAnnouncement(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Announcement
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="border-2 border-gray-200 hover:shadow-xl transition-all">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {announcement.image_url && (
                          <img
                            src={announcement.image_url}
                            alt={announcement.title}
                            className="w-48 h-48 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-gray-900 text-lg">{announcement.title}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                              className="text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mb-2">
                            {announcement.event_type}
                          </span>
                          <p className="text-sm text-gray-600 mb-3">{announcement.description}</p>
                          {announcement.event_date && (
                            <p className="text-sm text-gray-700 mb-1">
                              📅 {new Date(announcement.event_date).toLocaleString()}
                            </p>
                          )}
                          {announcement.location && (
                            <p className="text-sm text-gray-700 mb-3">
                              📍 {announcement.location}
                            </p>
                          )}
                          {announcement.link_url && (
                            <a
                              href={announcement.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Event Link
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {announcements.length === 0 && (
                <div className="text-center py-12">
                  <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No announcements yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teacher Updates Tab */}
        <TabsContent value="teacherUpdates">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Teacher Updates</h2>
                <Button
                  onClick={() => setShowAddTeacherUpdate(true)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Update
                </Button>
              </div>

              <div className="space-y-4">
                {teacherUpdates.map((update) => (
                  <Card key={update.id} className="border-2 border-gray-200 hover:shadow-xl transition-all">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900 text-lg">{update.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              update.priority === 'urgent' ? 'bg-red-500 text-white' :
                              update.priority === 'important' ? 'bg-orange-500 text-white' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {update.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{update.message}</p>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {update.target_instruments?.length > 0 ? (
                              update.target_instruments.map((inst) => (
                                <span key={inst} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  🎸 {inst}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                📢 All Teachers
                              </span>
                            )}
                          </div>
                          {update.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {update.attachments.map((att, idx) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                >
                                  {att.type === 'link' ? <LinkIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                  {att.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTeacherUpdateMutation.mutate(update.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(update.created_date).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {teacherUpdates.length === 0 && (
                <div className="text-center py-12">
                  <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No teacher updates yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User CSV Tab */}
        <TabsContent value="userCSV">
          <Card className="border-none shadow-lg mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Import Users from CSV</h2>
                <Button
                  onClick={() => setShowCSVImporter(!showCSVImporter)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {showCSVImporter ? 'Hide Importer' : 'Import New CSV'}
                </Button>
              </div>

              {showCSVImporter && (
                <div className="mb-8">
                  <CSVImporter 
                    teachers={teachers} 
                    onImportComplete={() => setShowCSVImporter(false)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <ReferenceList teachers={teachers} />
        </TabsContent>
        </Tabs>

        {/* Import CSV Button - Bottom of Dashboard */}
        <div className="mt-8">
          <input
            id="csv-upload-main"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setActiveTab('userCSV');
                setShowCSVImporter(true);
                // Trigger the file input in CSVImporter after tab switch
                setTimeout(() => {
                  const importerInput = document.querySelector('input[accept=".csv,.xls,.xlsx"]:not(#csv-upload-main)');
                  if (importerInput) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(e.target.files[0]);
                    importerInput.files = dataTransfer.files;
                    importerInput.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }, 100);
              }
            }}
          />
          <Card 
            className="border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-all cursor-pointer" 
            onClick={() => document.getElementById('csv-upload-main').click()}
          >
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-emerald-800">Import CSV / Excel File</h3>
                  <p className="text-sm text-emerald-600 mt-1">Upload student lists to manage registrations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Announcement Dialog */}
      <Dialog open={showAddAnnouncement} onOpenChange={setShowAddAnnouncement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="e.g., Spring Concert 2025"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={newAnnouncement.description}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
                placeholder="Event details..."
                rows={3}
              />
            </div>
            <div>
              <Label>Event Type *</Label>
              <Select
                value={newAnnouncement.event_type}
                onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="concert">Concert</SelectItem>
                  <SelectItem value="show">Show</SelectItem>
                  <SelectItem value="masterclass">Master Class</SelectItem>
                  <SelectItem value="special_event">Special Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newAnnouncement.event_date}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={newAnnouncement.location}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, location: e.target.value })}
                  placeholder="Event venue"
                />
              </div>
            </div>
            <div>
              <Label>Event Link (tickets, registration, etc.)</Label>
              <Input
                value={newAnnouncement.link_url}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Upload Image</Label>
              <Input
                type="file"
                onChange={handleFileUpload}
                accept="image/*"
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-600 mt-2">Uploading...</p>}
              {newAnnouncement.image_url && (
                <p className="text-sm text-green-600 mt-2">✓ Image uploaded</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAnnouncement(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}
              disabled={!newAnnouncement.title || !newAnnouncement.description || createAnnouncementMutation.isLoading}
              className="bg-gradient-to-r from-orange-500 to-red-600"
            >
              {createAnnouncementMutation.isLoading ? 'Creating...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Teacher Update Dialog */}
      <Dialog open={showAddTeacherUpdate} onOpenChange={setShowAddTeacherUpdate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Teacher Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newTeacherUpdate.title}
                onChange={(e) => setNewTeacherUpdate({ ...newTeacherUpdate, title: e.target.value })}
                placeholder="e.g., New Teaching Materials Available"
              />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                value={newTeacherUpdate.message}
                onChange={(e) => setNewTeacherUpdate({ ...newTeacherUpdate, message: e.target.value })}
                placeholder="Update details..."
                rows={4}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={newTeacherUpdate.priority}
                onValueChange={(value) => setNewTeacherUpdate({ ...newTeacherUpdate, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Instruments (leave empty for all teachers)</Label>
              <MultiInstrumentSelector
                value={newTeacherUpdate.target_instruments}
                onChange={(value) => setNewTeacherUpdate({ ...newTeacherUpdate, target_instruments: value })}
                maxSelection={10}
              />
            </div>
            <div>
              <Label>Attachments (Files & Links)</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('attachment-upload').click()}
                    disabled={uploadingAttachment}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {uploadingAttachment ? 'Uploading...' : 'Upload File'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLinkAttachment}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>
                <input
                  id="attachment-upload"
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                {newTeacherUpdate.attachments.length > 0 && (
                  <div className="space-y-2">
                    {newTeacherUpdate.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {att.type === 'link' ? <LinkIcon className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-green-600" />}
                          <span className="text-sm text-gray-700">{att.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(idx)}
                          className="h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeacherUpdate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTeacherUpdateMutation.mutate(newTeacherUpdate)}
              disabled={!newTeacherUpdate.title || !newTeacherUpdate.message || createTeacherUpdateMutation.isLoading}
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              {createTeacherUpdateMutation.isLoading ? 'Creating...' : 'Create Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Promote to Teacher Dialog */}
      <Dialog open={!!confirmTeacher} onOpenChange={() => setConfirmTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Teacher</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to make <span className="font-bold">{confirmTeacher?.full_name || confirmTeacher?.email}</span> a teacher?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will give them access to teacher features (dashboard, materials, students).
            </p>
            <p className="text-sm text-amber-600 mt-2 font-medium">
              Note: They will NOT have access to the Management Dashboard. Only platform admins can access management.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTeacher(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => promoteToTeacherMutation.mutate(confirmTeacher.id)}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              Yes, Make Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Promote to Parent Dialog */}
      <Dialog open={!!confirmParent} onOpenChange={() => setConfirmParent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to make <span className="font-bold">{confirmParent?.full_name || confirmParent?.email}</span> a parent?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will give them parent access in the AI agent system.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmParent(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => promoteToParentMutation.mutate(confirmParent.id)}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              Yes, Make Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      );
      }