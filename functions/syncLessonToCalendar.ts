import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonData, action } = await req.json();

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (!accessToken) {
      return Response.json({ 
        error: 'Google Calendar not connected. Please authorize Google Calendar first.',
        needsAuth: true 
      }, { status: 400 });
    }

    // Get student details
    const students = await base44.asServiceRole.entities.User.filter({ id: lessonData.student_id });
    const student = students[0];

    if (!student) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    // Create event object
    const event = {
      summary: `Lesson with ${student.full_name}`,
      description: `Guitar lesson with ${student.full_name}`,
      start: {},
      end: {},
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    // Handle recurring lesson (LessonSchedule)
    if (lessonData.day_of_week !== undefined) {
      const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const dayCode = daysOfWeek[lessonData.day_of_week];
      
      // Find next occurrence of this day
      const now = new Date();
      const daysUntilLesson = (lessonData.day_of_week - now.getDay() + 7) % 7;
      const nextLesson = new Date(now);
      nextLesson.setDate(now.getDate() + (daysUntilLesson || 7));
      
      const [hours, minutes] = lessonData.start_time.split(':');
      nextLesson.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(nextLesson);
      endTime.setMinutes(endTime.getMinutes() + lessonData.duration_minutes);

      event.start = {
        dateTime: nextLesson.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`];
    } 
    // Handle single lesson (LessonHistory)
    else if (lessonData.lesson_date) {
      const [hours, minutes] = lessonData.start_time.split(':');
      const lessonDateTime = new Date(lessonData.lesson_date);
      lessonDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(lessonDateTime);
      endTime.setMinutes(endTime.getMinutes() + lessonData.duration_minutes);

      event.start = {
        dateTime: lessonDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    // Create event in Google Calendar
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      return Response.json({ 
        error: 'Failed to create calendar event', 
        details: error 
      }, { status: 500 });
    }

    const calendarEvent = await calendarResponse.json();

    return Response.json({ 
      success: true, 
      eventId: calendarEvent.id,
      eventLink: calendarEvent.htmlLink
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});