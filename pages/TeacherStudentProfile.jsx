import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentProfileOverview from '../components/teacher/StudentProfileOverview';
import StudentMaterialsTab from '../components/teacher/StudentMaterialsTab';
import StudentTasksTab from '../components/teacher/StudentTasksTab';
import StudentChatTab from '../components/teacher/StudentChatTab';
import StudentScheduleTab from '../components/teacher/StudentScheduleTab';

export default function TeacherStudentProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');
  const tabParam = urlParams.get('tab');

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: studentId });
      return users[0];
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!student) {
    return <div className="p-8 text-center">Student not found</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={createPageUrl('TeacherStudents')}
          className="inline-flex items-center text-cyan-600 hover:text-cyan-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-cyan-700">
              {student.full_name?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.full_name}</h1>
            <p className="text-gray-600">{student.email}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {student.level}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {student.main_style}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tabParam || "overview"} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StudentProfileOverview studentId={studentId} student={student} />
        </TabsContent>

        <TabsContent value="materials">
          <StudentMaterialsTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="tasks">
          <StudentTasksTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="schedule">
          <StudentScheduleTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="chat">
          <StudentChatTab studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}