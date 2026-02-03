import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check } from 'lucide-react';

export default function TeacherSelector({ value, teachers, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTeachers = teachers.filter(teacher =>
    (teacher.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    teacher.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (teacherId) => {
    onChange(teacherId);
    setOpen(false);
    setSearch('');
  };

  const selectedTeacher = teachers.find(t => t.id === value);
  const displayText = selectedTeacher ? (selectedTeacher.full_name || selectedTeacher.email) : 'Unassigned';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-48 justify-between text-left font-normal"
        >
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            onClick={() => handleSelect(null)}
            className="w-full px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded flex items-center justify-between"
          >
            Unassign
            {!value && <Check className="w-4 h-4 text-blue-600" />}
          </button>
          {filteredTeachers.length === 0 && search && (
            <div className="py-6 text-center text-sm text-gray-500">
              No teacher found
            </div>
          )}
          {filteredTeachers.map((teacher) => (
            <button
              key={teacher.id}
              onClick={() => handleSelect(teacher.id)}
              className="w-full px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{teacher.full_name || 'N/A'}</div>
                <div className="text-xs text-gray-500">{teacher.email}</div>
              </div>
              {value === teacher.id && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}