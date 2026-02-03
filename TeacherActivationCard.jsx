import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TeacherActivationCard({ onSuccess }) {
  const queryClient = useQueryClient();
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const redeemMutation = useMutation({
    mutationFn: async (code) => {
      try {
        const response = await base44.functions.invoke('redeemTeacherSerial', { code });
        // Check if the response indicates an error
        if (response.data?.error) {
          throw new Error(response.data.error);
        }
        return response.data;
      } catch (err) {
        // Handle axios error response
        if (err?.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuccess(true);
        setError('');
        // Force clear cache and hard reload
        queryClient.clear();
        setTimeout(() => {
          // Force hard reload to get fresh user data including app_role
          window.location.href = window.location.href;
        }, 2000);
      }
    },
    onError: (err) => {
      const errorMsg = err?.message || 'Invalid or expired code';
      setError(errorMsg);
    }
  });

  const formatSerial = (value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    if (clean.length > 0) {
      formatted = 'TCH-';
      const rest = clean.replace(/^TCH/, '');
      for (let i = 0; i < rest.length && i < 12; i++) {
        if (i > 0 && i % 4 === 0) formatted += '-';
        formatted += rest[i];
      }
    }
    return formatted || value.toUpperCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serial.length < 16) {
      setError('Please enter a complete serial code');
      return;
    }
    setError('');
    redeemMutation.mutate(serial);
  };

  if (success) {
    return (
      <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-emerald-800 mb-2">Welcome, Teacher!</h3>
            <p className="text-emerald-600">Your serial has been verified. Redirecting...</p>
            <p className="text-xs text-emerald-500 mt-2">For full admin access, contact management.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-purple-600" />
          Become a Teacher
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the Teacher Activation Serial provided by management to unlock teacher features.
          </p>
          
          <div className="space-y-2">
            <Input
              value={serial}
              onChange={(e) => {
                setSerial(formatSerial(e.target.value));
                setError('');
              }}
              placeholder="TCH-XXXX-XXXX-XXXX"
              maxLength={18}
              className="h-14 text-center text-lg font-mono tracking-wider uppercase bg-white border-2 focus:border-purple-500"
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
            disabled={redeemMutation.isPending || serial.length < 16}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
          >
            {redeemMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Activate Teacher Account'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Don't have a serial? Contact management to request one.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}