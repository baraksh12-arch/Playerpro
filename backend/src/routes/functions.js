import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireRole, requireAppRole } from '../middleware/auth.js';
import { hashCode, generateSerial } from '../utils/hash.js';

const router = express.Router();

// Redeem teacher serial
router.post('/redeemTeacherSerial', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Check if already a teacher
    if (req.user.role === 'admin' || req.user.app_role === 'teacher') {
      return res.json({
        success: true,
        message: 'You are already a teacher!',
        already_teacher: true
      });
    }

    // Validate format: TCH-XXXX-XXXX-XXXX
    const codeUpper = code.toUpperCase().trim();
    const formatRegex = /^TCH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!formatRegex.test(codeUpper)) {
      return res.status(400).json({ error: 'Invalid code format. Expected: TCH-XXXX-XXXX-XXXX' });
    }

    // Hash the code
    const codeHash = await hashCode(codeUpper);

    // Find the serial
    const serialResult = await pool.query(
      'SELECT * FROM teacher_activation_serials WHERE code_hash = $1',
      [codeHash]
    );

    if (serialResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const serial = serialResult.rows[0];

    // Check if already used by this user
    if (serial.status === 'used' && serial.used_by === req.user.id) {
      // Update app_role to teacher
      await pool.query(
        'UPDATE users SET app_role = $1, agent_role = $2 WHERE id = $3',
        ['teacher', 'teacher', req.user.id]
      );

      return res.json({
        success: true,
        message: 'Your teacher account is already activated! You have full access to teacher features.'
      });
    }

    // Check if used by someone else or revoked
    if (serial.status !== 'unused') {
      return res.status(400).json({ error: 'This code has already been used or is no longer valid' });
    }

    // Set app_role to teacher
    await pool.query(
      'UPDATE users SET app_role = $1, agent_role = $2 WHERE id = $3',
      ['teacher', 'teacher', req.user.id]
    );

    // Mark serial as used
    await pool.query(
      'UPDATE teacher_activation_serials SET status = $1, used_by = $2, used_at = $3 WHERE id = $4',
      ['used', req.user.id, new Date(), serial.id]
    );

    return res.json({
      success: true,
      message: 'Congratulations! 🎉 Your teacher account is now activated. You can access all teacher features including student management, materials, and invite codes.'
    });
  } catch (error) {
    console.error('Redeem serial error:', error);
    res.status(500).json({ error: 'Failed to process code. Please try again.' });
  }
});

// Generate teacher serials
router.post('/generateTeacherSerials', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { count = 1 } = req.body;

    if (count < 1 || count > 50) {
      return res.status(400).json({ error: 'Count must be between 1 and 50' });
    }

    const generatedSerials = [];

    for (let i = 0; i < count; i++) {
      const rawSerial = generateSerial('TCH', 3, 4);
      const serialHash = await hashCode(rawSerial);

      await pool.query(
        'INSERT INTO teacher_activation_serials (code_hash, status) VALUES ($1, $2)',
        [serialHash, 'unused']
      );

      generatedSerials.push(rawSerial);
    }

    return res.json({
      success: true,
      serials: generatedSerials,
      count: generatedSerials.length
    });
  } catch (error) {
    console.error('Generate serials error:', error);
    res.status(500).json({ error: 'Failed to generate serials' });
  }
});

// Generate teacher invite code
router.post('/generateTeacherInviteCode', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { expiresInDays = 30, maxUses = null, revoke = false } = req.body;

    // If revoke, revoke all active codes for this teacher
    if (revoke) {
      await pool.query(
        'UPDATE teacher_invite_codes SET status = $1 WHERE teacher_id = $2 AND status = $3',
        ['revoked', req.user.id, 'active']
      );

      return res.json({ success: true, message: 'All active codes revoked' });
    }

    // Generate new code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'STU-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const codeHash = await hashCode(code);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create the invite code record
    await pool.query(
      'INSERT INTO teacher_invite_codes (teacher_id, code_hash, status, expires_at, max_uses, use_count) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, codeHash, 'active', expiresAt, maxUses, 0]
    );

    return res.json({
      success: true,
      code: code,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses
    });
  } catch (error) {
    console.error('Generate invite code error:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// Link student to teacher
router.post('/linkStudentToTeacher', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Teachers cannot link to other teachers
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Teachers cannot use student invite codes' });
    }

    // Validate format: STU-XXXXXX
    const codeUpper = code.toUpperCase().trim();
    const formatRegex = /^STU-[A-Z0-9]{6}$/;
    if (!formatRegex.test(codeUpper)) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Hash the code
    const codeHash = await hashCode(codeUpper);

    // Find the invite code
    const inviteResult = await pool.query(
      'SELECT * FROM teacher_invite_codes WHERE code_hash = $1',
      [codeHash]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const invite = inviteResult.rows[0];

    // Check status
    if (invite.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await pool.query(
        'UPDATE teacher_invite_codes SET status = $1 WHERE id = $2',
        ['expired', invite.id]
      );
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Check max uses
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Get teacher info
    const teacherResult = await pool.query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [invite.teacher_id]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const teacher = teacherResult.rows[0];

    // Link student to teacher
    await pool.query(
      'UPDATE users SET assigned_teacher_id = $1, agent_role = $2 WHERE id = $3',
      [invite.teacher_id, 'student', req.user.id]
    );

    // Increment use count
    await pool.query(
      'UPDATE teacher_invite_codes SET use_count = use_count + 1 WHERE id = $1',
      [invite.id]
    );

    return res.json({
      success: true,
      message: 'Successfully linked to teacher',
      teacher_name: teacher.full_name || 'Your Teacher'
    });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ error: 'Failed to link to teacher' });
  }
});

// Update teacher status
router.post('/updateTeacherStatus', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { teacherId, newStatus, reason, previousStatus } = req.body;

    if (!teacherId || !newStatus) {
      return res.status(400).json({ error: 'Missing required fields: teacherId and newStatus' });
    }

    // Build update data
    const updates = {};
    
    // If cancelling, also revoke teacher access
    if (newStatus === 'cancelled') {
      updates.app_role = 'student';
      updates.agent_role = 'student';
    }

    // If reactivating from cancelled, restore teacher access
    if (newStatus === 'active' && (previousStatus === 'cancelled' || previousStatus === 'cancel')) {
      updates.app_role = 'teacher';
      updates.agent_role = 'teacher';
    }

    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updates);
      values.push(teacherId);

      await pool.query(
        `UPDATE users SET ${setClause} WHERE id = $${values.length}`,
        values
      );
    }

    return res.json({
      success: true,
      message: `Teacher status updated to ${newStatus}`,
      teacherId,
      newStatus
    });
  } catch (error) {
    console.error('Update teacher status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update teacher status' });
  }
});

// Sync lesson to calendar (placeholder - implement calendar integration if needed)
router.post('/syncLessonToCalendar', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    // This is a placeholder - implement actual calendar sync if needed
    // For now, just return success
    return res.json({
      success: true,
      message: 'Lesson sync functionality - implement calendar integration here'
    });
  } catch (error) {
    console.error('Sync lesson error:', error);
    res.status(500).json({ error: 'Failed to sync lesson' });
  }
});

// Import chart from URL (placeholder - implement chart import logic)
router.post('/importChartFromUrl', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { url } = req.body;
    // Placeholder - implement actual chart import logic
    return res.json({
      success: true,
      message: 'Chart import functionality - implement import logic here',
      url
    });
  } catch (error) {
    console.error('Import chart error:', error);
    res.status(500).json({ error: 'Failed to import chart' });
  }
});

// Import OpenJazz book chart (placeholder)
router.post('/importOpenJazzBookChart', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    // Placeholder - implement actual import logic
    return res.json({
      success: true,
      message: 'OpenJazz book chart import functionality - implement import logic here'
    });
  } catch (error) {
    console.error('Import OpenJazz chart error:', error);
    res.status(500).json({ error: 'Failed to import chart' });
  }
});

// Extract songbook page (placeholder)
router.post('/extractSongbookPage', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    // Placeholder - implement actual extraction logic
    return res.json({
      success: true,
      message: 'Songbook page extraction functionality - implement extraction logic here'
    });
  } catch (error) {
    console.error('Extract page error:', error);
    res.status(500).json({ error: 'Failed to extract page' });
  }
});

// Fetch OpenJazz book versions (placeholder)
router.post('/fetchOpenJazzBookVersions', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    // Placeholder - implement actual fetch logic
    return res.json({
      success: true,
      versions: [],
      message: 'OpenJazz book versions fetch functionality - implement fetch logic here'
    });
  } catch (error) {
    console.error('Fetch versions error:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Process songbook (placeholder)
router.post('/processSongbook', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    // Placeholder - implement actual processing logic
    return res.json({
      success: true,
      message: 'Songbook processing functionality - implement processing logic here'
    });
  } catch (error) {
    console.error('Process songbook error:', error);
    res.status(500).json({ error: 'Failed to process songbook' });
  }
});

export default router;
