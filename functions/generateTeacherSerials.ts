import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fixed pepper - no env var needed
const PEPPER = 'VPR_Music_Center_2024_Secure_Pepper';

// Simple hash function
async function hashCode(code) {
  const data = new TextEncoder().encode(code.toUpperCase() + PEPPER);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random serial: TCH-XXXX-XXXX-XXXX
function generateSerial() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let serial = 'TCH-';
  for (let g = 0; g < 3; g++) {
    if (g > 0) serial += '-';
    for (let i = 0; i < 4; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return serial;
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

    // Must be admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can generate teacher serials' }, { status: 403 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Use defaults
    }
    
    const count = body?.count || 1;
    
    if (count < 1 || count > 50) {
      return Response.json({ error: 'Count must be between 1 and 50' }, { status: 400 });
    }

    const generatedSerials = [];

    for (let i = 0; i < count; i++) {
      const rawSerial = generateSerial();
      const serialHash = await hashCode(rawSerial);

      await base44.asServiceRole.entities.TeacherActivationSerial.create({
        code_hash: serialHash,
        status: 'unused'
      });

      generatedSerials.push(rawSerial);
    }

    return Response.json({ 
      success: true,
      serials: generatedSerials,
      count: generatedSerials.length
    });

  } catch (error) {
    return Response.json({ error: 'Failed to generate serials' }, { status: 500 });
  }
});