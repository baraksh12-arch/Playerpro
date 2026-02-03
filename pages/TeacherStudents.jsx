import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { Search, Music, List, Grid, Edit2, Check, X, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '../Layout';

export default function TeacherStudents() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const [editingStudent, setEditingStudent] = useState(null);
  const [editValues, setEditValues] = useState({});

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', currentUser?.id],
    queryFn: () => base44.entities.User.filter({ role: 'user', assigned_teacher_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.LessonSchedule.list(),
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
      setEditValues({});
    },
  });

  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  const getStudentSchedule = (studentId) => {
    const schedule = schedules.find(s => s.student_id === studentId);
    if (!schedule) return 'Not scheduled';
    return `${getDayName(schedule.day_of_week)} ${schedule.start_time}`;
  };

  const getMissedLessons = (student) => {
    // Calculate from student data if available
    return student.missed_lessons || 0;
  };

  const handleEdit = (student) => {
    setEditingStudent(student.id);
    setEditValues({
      level: student.level || '',
      main_style: student.main_style || '',
      phone: student.phone || '',
      missed_lessons: student.missed_lessons || 0,
    });
  };

  const handleSave = (studentId) => {
    updateStudentMutation.mutate({ id: studentId, data: editValues });
  };

  const handleCancel = () => {
    setEditingStudent(null);
    setEditValues({});
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || student.level === parseInt(filterLevel);
    return matchesSearch && matchesLevel;
  });

  const exportToGoogleSheets = () => {
    const headers = ['Name', 'Email', 'Phone', 'Level', 'Style', 'Regular Lesson', 'Missed Lessons', 'Status'];
    const rows = filteredStudents.map(student => [
      student.full_name || '',
      student.email || '',
      student.phone || '',
      student.level || '',
      student.main_style || '',
      getStudentSchedule(student.id),
      getMissedLessons(student),
      student.is_active !== false ? 'Active' : 'Inactive'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t('page.teacherStudents.title')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToGoogleSheets}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('page.teacherStudents.exportCSV')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="border-none shadow-lg mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder={t('page.teacherStudents.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 rounded-2xl border-2"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-2xl border-2">
                <Music className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('page.teacherStudents.filterByLevel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('page.teacherStudents.allLevels')}</SelectItem>
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
        </CardContent>
      </Card>

      {/* Students Display */}
      {filteredStudents.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No students found</p>
              <p className="text-sm text-gray-400">Invite students from Dashboard → Settings</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.name')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherStudents.phone')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.level')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherStudents.style')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherDashboard.nextLesson')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherStudents.missedLessons')}</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">{t('page.teacherStudents.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <Link
                        to={`${createPageUrl('TeacherStudentProfile')}?id=${student.id}`}
                        className="font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-2"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-cyan-700">
                            {student.full_name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        {student.full_name}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.email}</td>
                    <td className="py-4 px-4 text-sm">
                      {editingStudent === student.id ? (
                        <Input
                          value={editValues.phone}
                          onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Phone"
                        />
                      ) : (
                        <span className="text-gray-600">{student.phone || '-'}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {editingStudent === student.id ? (
                        <Select
                          value={editValues.level?.toString()}
                          onValueChange={(value) => setEditValues({ ...editValues, level: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
                      ) : (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {student.level ? `Level ${student.level}` : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {editingStudent === student.id ? (
                        <Input
                          value={editValues.main_style}
                          onChange={(e) => setEditValues({ ...editValues, main_style: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Style"
                        />
                      ) : (
                        <span className="text-gray-900">{student.main_style || '-'}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {getStudentSchedule(student.id)}
                    </td>
                    <td className="py-4 px-4">
                      {editingStudent === student.id ? (
                        <Input
                          type="number"
                          value={editValues.missed_lessons}
                          onChange={(e) => setEditValues({ ...editValues, missed_lessons: parseInt(e.target.value) || 0 })}
                          className="h-8 text-sm w-20"
                          min="0"
                        />
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          getMissedLessons(student) > 0 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {getMissedLessons(student)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {editingStudent === student.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(student.id)}
                            className="h-8 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(student)}
                          className="h-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <Link to={`${createPageUrl('TeacherStudentProfile')}?id=${student.id}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-cyan-700">
                        {student.full_name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{student.full_name}</h3>
                      <p className="text-sm text-gray-500 truncate">{student.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Level:</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {student.level ? `Level ${student.level}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Style:</span>
                      <span className="font-medium text-gray-900">{student.main_style || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Regular Lesson:</span>
                      <span className="font-medium text-gray-900 text-xs">{getStudentSchedule(student.id)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Missed:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getMissedLessons(student) > 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {getMissedLessons(student)}
                      </span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}