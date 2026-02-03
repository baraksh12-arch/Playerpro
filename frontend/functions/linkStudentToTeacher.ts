import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fixed pepper
const PEPPER = 'VPR_Music_Center_2024_Secure_Pepper';

// Simple hash function
async function hashCode(code) {
  const data = new TextEncoder().encode(code.toUpperCase() + PEPPER);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Teachers cannot link to other teachers
    if (user.role === 'admin') {
      return Response.json({ error: 'Teachers cannot use student invite codes' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const code = body?.code;
    
    if (!code) {
      return Response.json({ error: 'Code is required' }, { status: 400 });
    }

    // Validate format: STU-XXXXXX
    const codeUpper = code.toUpperCase().trim();
    const formatRegex = /^STU-[A-Z0-9]{6}$/;
    if (!formatRegex.test(codeUpper)) {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Hash the code
    const codeHash = await hashCode(codeUpper);

    // Find the invite code
    const allInvites = await base44.asServiceRole.entities.TeacherInviteCode.list();
    const invite = allInvites.find(i => i.code_hash === codeHash);
    
    if (!invite) {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Check status
    if (invite.status !== 'active') {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await base44.asServiceRole.entities.TeacherInviteCode.update(invite.id, { status: 'expired' });
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Check max uses
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Get teacher info
    const teachers = await base44.asServiceRole.entities.User.filter({ id: invite.teacher_id });
    const teacher = teachers[0];

    if (!teacher) {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Link student to teacher
    await base44.asServiceRole.entities.User.update(user.id, {
      assigned_teacher_id: invite.teacher_id,
      agent_role: 'student'
    });

    // Increment use count
    await base44.asServiceRole.entities.TeacherInviteCode.update(invite.id, {
      use_count: (invite.use_count || 0) + 1
    });

    return Response.json({ 
      success: true,
      message: 'Successfully linked to teacher',
      teacher_name: teacher.full_name || 'Your Teacher'
    });

  } catch (error) {
    return Response.json({ error: 'Failed to link to teacher' }, { status: 500 });
  }
});