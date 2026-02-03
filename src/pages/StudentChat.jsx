import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

export default function StudentChat() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [messageText, setMessageText] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', currentUser?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ student_id: currentUser.id }, '-created_date'),
    enabled: !!currentUser,
    refetchInterval: 3000,
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      const unreadMessages = messages.filter(m => m.sender_role === 'teacher' && !m.is_read_by_student);
      for (const msg of unreadMessages) {
        await base44.entities.ChatMessage.update(msg.id, { is_read_by_student: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['studentChatMessages', currentUser?.id] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (text) => {
      await base44.entities.ChatMessage.create({
        student_id: currentUser.id,
        sender_id: currentUser.id,
        sender_role: 'student',
        text,
        is_read_by_teacher: false,
        is_read_by_student: true,
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
    const unreadMessages = messages.filter(m => m.sender_role === 'teacher' && !m.is_read_by_student);
    if (unreadMessages.length > 0 && !markAsRead.isLoading) {
      markAsRead.mutate();
    }
  }, [messages.map(m => m.id).join(',')]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessage.mutate(messageText);
    }
  };

  const sortedMessages = [...messages].reverse();

  if (!currentUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const unreadCount = messages.filter(
    msg => msg.sender_role === 'teacher' && !msg.is_read_by_student
  ).length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto h-[calc(100vh-8rem)]">
      <Card className="border-none shadow-lg h-full flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3">
            Chat with Teacher
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No messages yet. Start a conversation!
            </div>
          ) : (
            sortedMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_role === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.sender_role === 'student'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_role === 'student' ? 'text-cyan-100' : 'text-gray-500'
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
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {sendMessage.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}