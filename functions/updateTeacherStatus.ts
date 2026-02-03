import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can update teacher status
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { teacherId, newStatus, reason, previousStatus } = await req.json();

    if (!teacherId || !newStatus) {
      return Response.json({ error: 'Missing required fields: teacherId and newStatus' }, { status: 400 });
    }

    // Build update data
    const updateData = {
      account_status: newStatus,
      status_reason: reason || '',
      status_updated_at: new Date().toISOString()
    };

    // If cancelling, also revoke teacher access
    if (newStatus === 'cancelled') {
      updateData.app_role = 'student';
      updateData.agent_role = 'student';
    }

    // If reactivating from cancelled, restore teacher access
    if (newStatus === 'active' && (previousStatus === 'cancelled' || previousStatus === 'cancel')) {
      updateData.app_role = 'teacher';
      updateData.agent_role = 'teacher';
    }

    // Use service role to bypass RLS restrictions
    await base44.asServiceRole.entities.User.update(teacherId, updateData);

    return Response.json({ 
      success: true, 
      message: `Teacher status updated to ${newStatus}`,
      teacherId,
      newStatus
    });

  } catch (error) {
    console.error('Error updating teacher status:', error);
    return Response.json({ error: error.message || 'Failed to update teacher status' }, { status: 500 });
  }
});