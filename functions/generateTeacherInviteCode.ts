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

// Generate random code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'STU-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    // Must be a teacher (platform admin OR app_role=teacher)
    const isTeacher = user.role === 'admin' || user.app_role === 'teacher';
    if (!isTeacher) {
      return Response.json({ error: 'Only teachers can generate invite codes' }, { status: 403 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Use defaults
    }
    
    const expiresInDays = body?.expiresInDays || 30;
    const maxUses = body?.maxUses || null;
    const revoke = body?.revoke || false;

    // If revoke, revoke all active codes for this teacher
    if (revoke) {
      const activeCodes = await base44.asServiceRole.entities.TeacherInviteCode.filter({ 
        teacher_id: user.id, 
        status: 'active' 
      });
      
      for (const code of activeCodes) {
        await base44.asServiceRole.entities.TeacherInviteCode.update(code.id, { status: 'revoked' });
      }
      
      return Response.json({ success: true, message: 'All active codes revoked' });
    }

    // Generate new code
    const rawCode = generateCode();
    const codeHash = await hashCode(rawCode);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create the invite code record
    await base44.asServiceRole.entities.TeacherInviteCode.create({
      code_hash: codeHash,
      teacher_id: user.id,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses,
      use_count: 0
    });

    return Response.json({ 
      success: true,
      code: rawCode,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses
    });

  } catch (error) {
    return Response.json({ error: 'Failed to generate code' }, { status: 500 });
  }
});