import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Loader2, Copy, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ManagementSerialsPanel() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(5);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatedSerials, setGeneratedSerials] = useState([]);
  const [copied, setCopied] = useState(false);

  // Fetch all serials
  const { data: serials = [], isLoading } = useQuery({
    queryKey: ['teacherSerials'],
    queryFn: () => base44.entities.TeacherActivationSerial.list('-created_date')
  });

  // Fetch users for "used by" info
  const { data: users = [] } = useQuery({
    queryKey: ['allUsersForSerials'],
    queryFn: () => base44.entities.User.list()
  });

  const generateMutation = useMutation({
    mutationFn: async (serialCount) => {
      const response = await base44.functions.invoke('generateTeacherSerials', { count: serialCount });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedSerials(data.serials);
        queryClient.invalidateQueries({ queryKey: ['teacherSerials'] });
      }
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (serialId) => {
      await base44.entities.TeacherActivationSerial.update(serialId, { status: 'revoked' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherSerials'] });
    }
  });

  const handleGenerate = () => {
    setGeneratedSerials([]);
    generateMutation.mutate(count);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(generatedSerials.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    const csv = 'Serial Code\n' + generatedSerials.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher_serials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getUserEmail = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.email || user?.full_name || 'Unknown';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'unused':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"><Clock className="w-3 h-3" /> Available</span>;
      case 'used':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> Used</span>;
      case 'revoked':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"><XCircle className="w-3 h-3" /> Revoked</span>;
      default:
        return null;
    }
  };

  const unusedCount = serials.filter(s => s.status === 'unused').length;
  const usedCount = serials.filter(s => s.status === 'used').length;

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-600" />
              Teacher Activation Serials
            </div>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              Generate Serials
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{serials.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{unusedCount}</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{usedCount}</p>
              <p className="text-xs text-blue-600">Used</p>
            </div>
          </div>

          {/* Serials Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Created</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Used By</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Used At</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serials.slice(0, 20).map((serial) => (
                  <tr key={serial.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{getStatusBadge(serial.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(serial.created_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {serial.used_by ? getUserEmail(serial.used_by) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {serial.used_at ? new Date(serial.used_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {serial.status === 'unused' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(serial.id)}
                          disabled={revokeMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {serials.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No serials generated yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Teacher Serials</DialogTitle>
          </DialogHeader>
          
          {generatedSerials.length === 0 ? (
            <div className="py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Generate activation serials for new teachers. Each serial can be used once.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700">Number of Serials</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✓ Generated {generatedSerials.length} serials
                </p>
                <div className="bg-white rounded-lg p-3 max-h-48 overflow-y-auto">
                  {generatedSerials.map((serial, i) => (
                    <div key={i} className="font-mono text-sm text-gray-700 py-1">
                      {serial}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyAll}
                  className="flex-1 gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Save these serials now! They cannot be viewed again for security.
              </p>
            </div>
          )}

          <DialogFooter>
            {generatedSerials.length === 0 ? (
              <>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Generate
                </Button>
              </>
            ) : (
              <Button onClick={() => { setShowGenerateDialog(false); setGeneratedSerials([]); }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}