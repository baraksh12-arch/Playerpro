import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PracticeTimer from '../components/practice/PracticeTimer';

export default function StudentTimer() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="fixed inset-0 md:relative md:min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-50 md:z-auto overflow-auto">
      {/* Mobile Exit Button */}
      <Link
        to={createPageUrl('StudentPractice')}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
      >
        <X className="w-5 h-5" />
      </Link>
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
        {/* Desktop Back Button */}
        <Link
          to={createPageUrl('StudentPractice')}
          className="hidden md:inline-flex items-center gap-2 mb-6 px-3 py-2 text-white/70 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        
        <PracticeTimer studentId={user?.id} />
      </div>
    </div>
  );
}