import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle, XCircle, UserCheck, Users, RefreshCw } from 'lucide-react';

export default function ReferenceList({ teachers = [] }) {
  const queryClient = useQueryClient();

  // Fetch all references
  const { data: references = [], isLoading, refetch } = useQuery({
    queryKey: ['references'],
    queryFn: () => base44.entities.Reference.list('-import_date'),
  });

  // Fetch all registered users to check status
  const { data: registeredUsers = [] } = useQuery({
    queryKey: ['allStudents'],
    queryFn: () => base44.entities.User.filter({ role: 'user' }),
  });

  // Update registration status based on actual users and sync user data
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
          
          // Sync assigned teacher
          if (ref.assigned_teacher_id && user.assigned_teacher_id !== ref.assigned_teacher_id) {
            userUpdateData.assigned_teacher_id = ref.assigned_teacher_id;
            needsUpdate = true;
          }
          
          // Sync level
          if (ref.level && user.level !== ref.level) {
            userUpdateData.level = ref.level;
            needsUpdate = true;
          }
          
          // Sync style
          if (ref.style && user.main_style !== ref.style) {
            userUpdateData.main_style = ref.style;
            needsUpdate = true;
          }
          
          // Sync phone
          if (ref.phone && !user.phone) {
            userUpdateData.phone = ref.phone;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            userUpdates.push({ userId: user.id, data: userUpdateData });
          }
        }
      }
      
      // Apply reference updates
      for (const update of refUpdates) {
        await base44.entities.Reference.update(update.id, {
          is_registered: update.is_registered,
          registered_user_id: update.registered_user_id
        });
      }
      
      // Apply user updates
      for (const update of userUpdates) {
        await base44.entities.User.update(update.userId, update.data);
      }
      
      return { refCount: refUpdates.length, userCount: userUpdates.length };
    },
    onSuccess: ({ refCount, userCount }) => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      if (refCount > 0 || userCount > 0) {
        alert(`Synced ${refCount} reference(s) and updated ${userCount} student(s) with teacher/level/style/phone`);
      } else {
        alert('All data is already in sync!');
      }
    }
  });

  // Delete reference
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Reference.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
    }
  });

  // Delete all references in a batch
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId) => {
      const batchRefs = references.filter(r => r.import_batch === batchId);
      for (const ref of batchRefs) {
        await base44.entities.Reference.delete(ref.id);
      }
      return batchRefs.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      alert(`Deleted ${count} references`);
    }
  });

  // Group references by import batch
  const groupedReferences = useMemo(() => {
    const groups = {};
    references.forEach(ref => {
      const batchId = ref.import_batch || 'unknown';
      if (!groups[batchId]) {
        groups[batchId] = {
          batchId,
          importDate: ref.import_date,
          references: []
        };
      }
      groups[batchId].references.push(ref);
    });
    return Object.values(groups).sort((a, b) => 
      new Date(b.importDate) - new Date(a.importDate)
    );
  }, [references]);

  // Check registration status
  const userEmails = useMemo(() => 
    new Set(registeredUsers.map(u => u.email?.toLowerCase())),
    [registeredUsers]
  );

  const isUserRegistered = (email) => userEmails.has(email?.toLowerCase());

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.full_name || 'Not assigned';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500">Loading references...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Imported Users</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {references.length} total
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            {references.filter(r => isUserRegistered(r.email)).length} active
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            {references.filter(r => !isUserRegistered(r.email)).length} pending
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncStatusMutation.mutate()}
          disabled={syncStatusMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatusMutation.isPending ? 'animate-spin' : ''}`} />
          Sync Status
        </Button>
      </div>

      {/* Grouped by Import Batch */}
      {groupedReferences.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No imported users yet</p>
              <p className="text-sm text-gray-400 mt-2">Upload a CSV file to import users</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        groupedReferences.map(group => (
          <Card key={group.batchId} className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Import: {new Date(group.importDate).toLocaleDateString()} {new Date(group.importDate).toLocaleTimeString()}
                  </h4>
                  <p className="text-sm text-gray-500">{group.references.length} users</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete all ${group.references.length} references from this import?`)) {
                      deleteBatchMutation.mutate(group.batchId);
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Batch
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Assigned Teacher</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.references.map((ref, idx) => {
                      const registered = isUserRegistered(ref.email);
                      return (
                        <tr 
                          key={ref.id}
                          className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-3 px-4">
                            {registered ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                <XCircle className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                registered ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <span className={`text-sm font-bold ${
                                  registered ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                  {ref.full_name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <span className={`font-medium ${registered ? 'text-gray-900' : 'text-gray-500'}`}>
                                {ref.full_name || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{ref.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{ref.phone || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {ref.assigned_teacher_name || getTeacherName(ref.assigned_teacher_id)}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(ref.id)}
                              className="text-red-500 hover:text-red-700 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}