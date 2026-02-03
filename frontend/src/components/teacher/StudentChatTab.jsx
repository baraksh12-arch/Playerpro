import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

export default function StudentChatTab({ studentId }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [messageText, setMessageText] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', studentId],
    queryFn: () => base44.entities.ChatMessage.filter({ student_id: studentId }, '-created_date'),
    refetchInterval: 3000,
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      const unreadMessages = messages.filter(m => m.sender_role === 'student' && !m.is_read_by_teacher);
      for (const msg of unreadMessages) {
        await base44.entities.ChatMessage.update(msg.id, { is_read_by_teacher: true });
      }
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (text) => {
      await base44.entities.ChatMessage.create({
        student_id: studentId,
        sender_id: currentUser.id,
        sender_role: 'teacher',
        text,
        is_read_by_teacher: true,
        is_read_by_student: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessageText('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unreadMessages = messages.filter(m => m.sender_role === 'student' && !m.is_read_by_teacher);
    if (unreadMessages.length > 0) {
      markAsRead.mutate();
    }
  }, [messages.map(m => m.id).join(',')]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (messageText.trim() && currentUser) {
      sendMessage.mutate(messageText);
    }
  };

  const sortedMessages = [...messages].reverse();

  return (
    <Card className="border-none shadow-lg h-[600px] flex flex-col">
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        {sortedMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No messages yet. Start the conversation!
          </div>
        ) : (
          sortedMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_role === 'teacher' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.sender_role === 'teacher'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_role === 'teacher' ? 'text-cyan-100' : 'text-gray-500'
                }`}>
                  {format(parseISO(message.created_date), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!messageText.trim() || sendMessage.isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </Card>
  );
}