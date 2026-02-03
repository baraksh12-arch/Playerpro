import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fixed pepper - no env var needed
const PEPPER = 'VPR_Music_Center_2024_Secure_Pepper';

// Simple hash function for browser/Deno compatibility
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
      return Response.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Already a teacher (admin role or app_role=teacher) - this is success
    if (user.role === 'admin' || user.app_role === 'teacher') {
      return Response.json({ 
        success: true, 
        message: 'You are already a teacher!',
        already_teacher: true
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const code = body?.code;
    
    if (!code) {
      return Response.json({ error: 'Code is required' }, { status: 400 });
    }

    // Validate format: TCH-XXXX-XXXX-XXXX
    const codeUpper = code.toUpperCase().trim();
    const formatRegex = /^TCH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!formatRegex.test(codeUpper)) {
      return Response.json({ error: 'Invalid code format. Expected: TCH-XXXX-XXXX-XXXX' }, { status: 400 });
    }

    // Hash the code
    const codeHash = await hashCode(codeUpper);

    // Find the serial
    let allSerials;
    try {
      allSerials = await base44.asServiceRole.entities.TeacherActivationSerial.list();
    } catch (e) {
      return Response.json({ error: 'Failed to verify code. Please try again.' }, { status: 500 });
    }
    
    // Find matching serial by hash
    const serial = allSerials.find(s => s.code_hash === codeHash);
    
    if (!serial) {
      return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Check if already used by this user - consider it success
    if (serial.status === 'used' && serial.used_by === user.id) {
      // Update app_role to teacher
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          app_role: 'teacher',
          agent_role: 'teacher'
        });
      } catch (e) {
        // Continue anyway
      }
      
      return Response.json({ 
        success: true, 
        message: 'Your teacher account is already activated! You have full access to teacher features.'
      });
    }

    // Check if used by someone else or revoked
    if (serial.status !== 'unused') {
      return Response.json({ error: 'This code has already been used or is no longer valid' }, { status: 400 });
    }

    // Set app_role to teacher (we can't change the built-in role field)
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        app_role: 'teacher',
        agent_role: 'teacher'
      });
    } catch (e) {
      return Response.json({ error: 'Failed to activate account. Please contact support.' }, { status: 500 });
    }

    // Mark serial as used
    try {
      await base44.asServiceRole.entities.TeacherActivationSerial.update(serial.id, {
        status: 'used',
        used_by: user.id,
        used_at: new Date().toISOString()
      });
    } catch (e) {
      // Serial update failed but user was promoted - that's ok
    }

    return Response.json({ 
      success: true, 
      message: 'Congratulations! 🎉 Your teacher account is now activated. You can access all teacher features including student management, materials, and invite codes.'
    });

  } catch (error) {
    return Response.json({ error: 'Failed to process code. Please try again.' }, { status: 500 });
  }
});