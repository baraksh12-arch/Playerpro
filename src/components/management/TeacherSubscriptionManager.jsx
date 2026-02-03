import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Loader2, 
  Search,
  Shield,
  ShieldOff,
  ShieldAlert,
  Snowflake,
  Play,
  Trash2,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Music,
  Calendar,
  Ban,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ACCOUNT_STATUSES = {
  active: {
    label: 'Active',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    icon: Shield,
    description: 'Full access to all teacher features'
  },
  frozen: {
    label: 'Frozen',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: Snowflake,
    description: 'Temporarily suspended - can be reactivated'
  },
  freeze: {
    label: 'Frozen',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: Snowflake,
    description: 'Temporarily suspended - can be reactivated'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: Ban,
    description: 'Account terminated - students reassigned'
  }
};

export default function TeacherSubscriptionManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [actionType, setActionType] = useState(null); // 'freeze' | 'cancel' | 'reactivate'
  const [actionReason, setActionReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch teachers (admins and app_role=teacher)
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['allUsersForSubscription'],
    queryFn: () => base44.entities.User.list()
  });

  // Filter to get only teachers
  const teachers = allUsers.filter(u => u.role === 'admin' || u.app_role === 'teacher');
  const students = allUsers.filter(u => u.role !== 'admin' && u.app_role !== 'teacher');

  // Filter by search
  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.full_name?.toLowerCase().includes(query) ||
      t.email?.toLowerCase().includes(query) ||
      t.phone?.includes(query)
    );
  });

  // Update teacher status mutation - using backend function for proper permissions
  const updateStatusMutation = useMutation({
    mutationFn: async ({ teacherId, newStatus, reason, previousStatus }) => {
      // Use backend function to update with service role permissions
      const response = await base44.functions.invoke('updateTeacherStatus', {
        teacherId,
        newStatus,
        reason,
        previousStatus
      });
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Log for audit
      if (newStatus === 'frozen' || newStatus === 'cancelled') {
        const affectedStudents = students.filter(s => s.assigned_teacher_id === teacherId);
        console.log(`Status change for teacher ${teacherId}: ${newStatus}. Affected students: ${affectedStudents.length}`);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersForSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setShowConfirmDialog(false);
      setSelectedTeacher(null);
      setActionType(null);
      setActionReason('');
    },
    onError: (error) => {
      console.error('Failed to update teacher status:', error);
      alert(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  });

  const handleAction = (teacher, action) => {
    setSelectedTeacher(teacher);
    setActionType(action);
    setActionReason('');
    setShowConfirmDialog(true);
  };

  const confirmAction = () => {
    if (!selectedTeacher || !actionType) return;
    
    // Map action types to proper status values
    let newStatus;
    if (actionType === 'reactivate') {
      newStatus = 'active';
    } else if (actionType === 'freeze') {
      newStatus = 'frozen';
    } else {
      newStatus = actionType; // 'cancel' -> 'cancelled' handled below
    }
    
    if (actionType === 'cancel') {
      newStatus = 'cancelled';
    }
    
    const previousStatus = selectedTeacher.account_status || 'active';
    
    updateStatusMutation.mutate({
      teacherId: selectedTeacher.id,
      newStatus,
      reason: actionReason,
      previousStatus
    });
  };

  const getTeacherStatus = (teacher) => {
    const status = teacher.account_status || 'active';
    // Normalize 'freeze' to 'frozen' for consistency
    if (status === 'freeze') return 'frozen';
    return status;
  };

  const getStudentCount = (teacherId) => {
    return students.filter(s => s.assigned_teacher_id === teacherId).length;
  };

  const getActionConfig = () => {
    switch (actionType) {
      case 'freeze':
        return {
          title: 'Freeze Teacher Account',
          description: `This will temporarily suspend ${selectedTeacher?.full_name || selectedTeacher?.email}'s access. They won't be able to use teacher features until reactivated.`,
          icon: Snowflake,
          iconColor: 'text-blue-500',
          buttonText: 'Freeze Account',
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
          reasonLabel: 'Reason for freezing (visible to teacher)'
        };
      case 'cancel':
        return {
          title: 'Cancel Teacher Subscription',
          description: `This will permanently revoke ${selectedTeacher?.full_name || selectedTeacher?.email}'s teacher access. Their students will need to be reassigned. This action can be reversed but requires manual reactivation.`,
          icon: Ban,
          iconColor: 'text-red-500',
          buttonText: 'Cancel Subscription',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          reasonLabel: 'Reason for cancellation (for records)'
        };
      case 'reactivate':
        return {
          title: 'Reactivate Teacher Account',
          description: `This will restore ${selectedTeacher?.full_name || selectedTeacher?.email}'s full teacher access immediately.`,
          icon: RefreshCw,
          iconColor: 'text-emerald-500',
          buttonText: 'Reactivate Account',
          buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
          reasonLabel: 'Note (optional)'
        };
      default:
        return {};
    }
  };

  const actionConfig = getActionConfig();

  // Stats
  const activeCount = teachers.filter(t => getTeacherStatus(t) === 'active').length;
  const frozenCount = teachers.filter(t => getTeacherStatus(t) === 'frozen').length;
  const cancelledCount = teachers.filter(t => getTeacherStatus(t) === 'cancelled').length;

  return (
    <>
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <Users className="w-5 h-5 text-white" />
                </div>
                Teacher Subscriptions
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1 ml-13">Manage teacher accounts and access levels</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{activeCount}</p>
                  <p className="text-xs font-medium text-emerald-600/70 mt-1">Active</p>
                </div>
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-200/30 rounded-full" />
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-600">{frozenCount}</p>
                  <p className="text-xs font-medium text-blue-600/70 mt-1">Frozen</p>
                </div>
                <Snowflake className="w-8 h-8 text-blue-400" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-200/30 rounded-full" />
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 p-4 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-red-600">{cancelledCount}</p>
                  <p className="text-xs font-medium text-red-600/70 mt-1">Cancelled</p>
                </div>
                <Ban className="w-8 h-8 text-red-400" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-red-200/30 rounded-full" />
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Teachers List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No teachers found</p>
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const status = getTeacherStatus(teacher);
                const statusConfig = ACCOUNT_STATUSES[status] || ACCOUNT_STATUSES.active;
                const StatusIcon = statusConfig.icon;
                const studentCount = getStudentCount(teacher.id);
                const isPlatformAdmin = teacher.role === 'admin';

                return (
                  <div
                    key={teacher.id}
                    className={`group relative rounded-2xl border transition-all duration-200 hover:shadow-lg ${
                      status === 'active' ? 'border-gray-200 bg-white hover:border-emerald-200' :
                      status === 'frozen' ? 'border-blue-200 bg-blue-50/30' :
                      'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                        status === 'active' ? 'bg-gradient-to-br from-violet-100 to-purple-100' :
                        status === 'frozen' ? 'bg-gradient-to-br from-blue-100 to-cyan-100' :
                        'bg-gradient-to-br from-red-100 to-rose-100'
                      }`}>
                        <span className={`text-xl font-bold ${
                          status === 'active' ? 'text-violet-600' :
                          status === 'frozen' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>
                          {teacher.full_name?.[0]?.toUpperCase() || teacher.email[0].toUpperCase()}
                        </span>
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${statusConfig.color} flex items-center justify-center ring-2 ring-white`}>
                          <StatusIcon className="w-3 h-3 text-white" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {teacher.full_name || 'Unnamed Teacher'}
                          </h3>
                          {isPlatformAdmin && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                              Admin
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {teacher.email}
                          </span>
                          {teacher.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {teacher.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            <Users className="w-3 h-3" />
                            {studentCount} {studentCount === 1 ? 'student' : 'students'}
                          </span>
                          {teacher.instruments?.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              <Music className="w-3 h-3" />
                              {teacher.instruments.slice(0, 2).join(', ')}
                            </span>
                          )}
                          {teacher.status_updated_at && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              Updated {new Date(teacher.status_updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowDetailsDialog(true);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          View Details
                        </Button>
                        
                        {/* Show actions for app_role teachers (not platform admins) */}
                        {teacher.app_role === 'teacher' && teacher.role !== 'admin' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {status === 'active' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(teacher, 'freeze')}
                                    className="text-blue-600 focus:text-blue-600 cursor-pointer"
                                  >
                                    <Snowflake className="w-4 h-4 mr-2" />
                                    Freeze Account
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(teacher, 'cancel')}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancel Subscription
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(status === 'frozen' || status === 'freeze') && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(teacher, 'reactivate')}
                                    className="text-emerald-600 focus:text-emerald-600 cursor-pointer"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Reactivate Account
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(teacher, 'cancel')}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancel Subscription
                                  </DropdownMenuItem>
                                </>
                              )}
                              {status === 'cancelled' && (
                                <DropdownMenuItem 
                                  onClick={() => handleAction(teacher, 'reactivate')}
                                  className="text-emerald-600 focus:text-emerald-600 cursor-pointer"
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Reactivate Account
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        {/* Show badge for platform admins - they can't be managed */}
                        {teacher.role === 'admin' && (
                          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">
                            Platform Admin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason banner if frozen/cancelled */}
                    {(status === 'frozen' || status === 'cancelled') && teacher.status_reason && (
                      <div className={`px-4 py-2 border-t text-xs ${
                        status === 'frozen' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-700'
                      }`}>
                        <span className="font-medium">Reason:</span> {teacher.status_reason}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {actionConfig.icon && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  actionType === 'freeze' ? 'bg-blue-100' :
                  actionType === 'cancel' ? 'bg-red-100' :
                  'bg-emerald-100'
                }`}>
                  <actionConfig.icon className={`w-5 h-5 ${actionConfig.iconColor}`} />
                </div>
              )}
              <DialogTitle>{actionConfig.title}</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {actionType === 'cancel' && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  {actionConfig.description}
                </p>
              </div>
            )}
            
            {actionType !== 'cancel' && (
              <p className="text-sm text-gray-600">{actionConfig.description}</p>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {actionConfig.reasonLabel}
              </label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionType === 'freeze' ? 'e.g., Payment issue, temporary leave...' :
                  actionType === 'cancel' ? 'e.g., Contract ended, policy violation...' :
                  'Optional note...'
                }
                className="resize-none"
                rows={3}
              />
            </div>

            {selectedTeacher && getStudentCount(selectedTeacher.id) > 0 && actionType !== 'reactivate' && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700">
                  <span className="font-semibold">{getStudentCount(selectedTeacher.id)} students</span> are assigned to this teacher. 
                  {actionType === 'cancel' ? ' They will need to be reassigned.' : ' They will temporarily lose access to their teacher.'}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
              className={actionConfig.buttonClass}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {actionConfig.buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Teacher Details</DialogTitle>
          </DialogHeader>
          
          {selectedTeacher && (
            <div className="py-4 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-violet-600">
                    {selectedTeacher.full_name?.[0]?.toUpperCase() || selectedTeacher.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedTeacher.full_name || 'Unnamed Teacher'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedTeacher.email}</p>
                </div>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Account Status</span>
                  {(() => {
                    const status = getTeacherStatus(selectedTeacher);
                    const config = ACCOUNT_STATUSES[status] || ACCOUNT_STATUSES.active;
                    return (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
                {selectedTeacher.status_reason && (
                  <p className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Reason:</span> {selectedTeacher.status_reason}
                  </p>
                )}
                {selectedTeacher.status_updated_at && (
                  <p className="mt-1 text-xs text-gray-400">
                    Last updated: {new Date(selectedTeacher.status_updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">{getStudentCount(selectedTeacher.id)}</p>
                  <p className="text-xs text-blue-600/70">Assigned Students</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50">
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedTeacher.instruments?.length || 0}
                  </p>
                  <p className="text-xs text-purple-600/70">Instruments</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedTeacher.email}</span>
                  </div>
                  {selectedTeacher.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedTeacher.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Account Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Platform Role</span>
                    <span className="font-medium">{selectedTeacher.role === 'admin' ? 'Administrator' : 'User'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">App Role</span>
                    <span className="font-medium capitalize">{selectedTeacher.app_role || 'Student'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Joined</span>
                    <span className="font-medium">{new Date(selectedTeacher.created_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}