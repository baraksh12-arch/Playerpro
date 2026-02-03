import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Copy, CheckCircle2, RefreshCw, Trash2, AlertTriangle, Snowflake, Ban } from 'lucide-react';

export default function InviteStudentsPanel({ teacherId, accountStatus = 'active' }) {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch active invite codes for this teacher
  const { data: activeCodes = [], isLoading } = useQuery({
    queryKey: ['teacherInviteCodes', teacherId],
    queryFn: async () => {
      const codes = await base44.entities.TeacherInviteCode.filter({ 
        teacher_id: teacherId, 
        status: 'active' 
      });
      return codes;
    },
    enabled: !!teacherId
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateTeacherInviteCode', { 
        expiresInDays: 30,
        maxUses: null 
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setNewCode(data.code);
        queryClient.invalidateQueries({ queryKey: ['teacherInviteCodes'] });
      }
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateTeacherInviteCode', { revoke: true });
      return response.data;
    },
    onSuccess: () => {
      setNewCode(null);
      queryClient.invalidateQueries({ queryKey: ['teacherInviteCodes'] });
    }
  });

  const handleCopy = () => {
    if (newCode) {
      navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasActiveCode = activeCodes.length > 0;

  // Check if account is active
  const isAccountActive = accountStatus === 'active';
  const isFrozen = accountStatus === 'frozen';
  const isCancelled = accountStatus === 'cancelled';

  return (
    <Card className={`border-none shadow-lg ${
      isAccountActive 
        ? 'bg-gradient-to-br from-cyan-50 to-blue-50' 
        : isFrozen 
          ? 'bg-gradient-to-br from-blue-50 to-slate-50'
          : 'bg-gradient-to-br from-red-50 to-gray-50'
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className={`w-5 h-5 ${isAccountActive ? 'text-cyan-600' : isFrozen ? 'text-blue-500' : 'text-red-500'}`} />
          Invite Students
          {!isAccountActive && (
            <span className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${
              isFrozen ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}>
              {isFrozen ? '❄️ Frozen' : '⛔ Cancelled'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Status Warning */}
        {!isAccountActive && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            isFrozen 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {isFrozen ? (
              <Snowflake className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Ban className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-semibold ${isFrozen ? 'text-blue-700' : 'text-red-700'}`}>
                {isFrozen ? 'Account Temporarily Frozen' : 'Subscription Cancelled'}
              </p>
              <p className={`text-xs mt-1 ${isFrozen ? 'text-blue-600' : 'text-red-600'}`}>
                {isFrozen 
                  ? 'You cannot generate new invite codes while your account is frozen. Please contact management.'
                  : 'Your teacher subscription has been cancelled. Please contact management to reactivate.'}
              </p>
            </div>
          </div>
        )}

        {isAccountActive && (
          <p className="text-sm text-gray-600">
            Generate a Student Access Code to share with your students. They can use this code in their Settings to link to you.
          </p>
        )}

        {/* Show newly generated code */}
        {newCode && (
          <div className="bg-white rounded-xl p-4 border-2 border-cyan-200">
            <p className="text-xs text-gray-500 mb-2 text-center">Your New Student Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-bold text-cyan-700 tracking-wider">
                {newCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Share this code with your students. Valid for 30 days.
            </p>
          </div>
        )}

        {/* Active code info */}
        {hasActiveCode && !newCode && (
          <div className="bg-white/70 rounded-xl p-4 border border-cyan-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Active Code</p>
                <p className="text-xs text-gray-500">
                  {activeCodes[0].use_count || 0} students linked • 
                  Expires {new Date(activeCodes[0].expires_at).toLocaleDateString()}
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                Active
              </span>
            </div>
          </div>
        )}

        {/* Actions - Only show if account is active */}
        {isAccountActive && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {hasActiveCode ? 'Generate New Code' : 'Generate Code'}
              </Button>
              
              {hasActiveCode && (
                <Button
                  variant="outline"
                  onClick={() => revokeMutation.mutate()}
                  disabled={revokeMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {revokeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Note: Generating a new code doesn't invalidate previous codes unless you revoke them.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}