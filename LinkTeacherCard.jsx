import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LinkTeacherCard({ currentTeacher, onSuccess }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teacherName, setTeacherName] = useState('');

  const linkMutation = useMutation({
    mutationFn: async (inviteCode) => {
      const response = await base44.functions.invoke('linkStudentToTeacher', { code: inviteCode });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuccess(true);
        setError('');
        setTeacherName(data.teacher_name);
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['assignedTeacher'] });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    },
    onError: (err) => {
      setError(err?.response?.data?.error || 'Invalid or expired code');
    }
  });

  const formatCode = (value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length > 0) {
      const withoutPrefix = clean.replace(/^STU/, '');
      return 'STU-' + withoutPrefix.slice(0, 6);
    }
    return value.toUpperCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length < 10) {
      setError('Please enter a complete code');
      return;
    }
    setError('');
    linkMutation.mutate(code);
  };

  if (success) {
    return (
      <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-emerald-800 mb-2">Connected!</h3>
            <p className="text-emerald-600">You are now linked to {teacherName}. Redirecting...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentTeacher) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Connected to Teacher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xl font-bold">
              {currentTeacher.full_name?.[0]?.toUpperCase() || '👨‍🏫'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {currentTeacher.full_name || 'Your Teacher'}
              </p>
              <p className="text-sm text-gray-500">
                {currentTeacher.email || 'Teacher assigned'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          Link to Your Teacher
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the Student Access Code provided by your teacher to connect your account.
          </p>
          
          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => {
                setCode(formatCode(e.target.value));
                setError('');
              }}
              placeholder="STU-XXXXXX"
              maxLength={10}
              className="h-14 text-center text-xl font-mono tracking-wider uppercase bg-white border-2 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={linkMutation.isPending || code.length < 10}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            {linkMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Connect to Teacher'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Don't have a code? Ask your teacher for their Student Access Code.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}