import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get references
router.get('/references', authenticate, requireAppRole('teacher'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM references WHERE assigned_teacher_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get references error:', error);
    res.status(500).json({ error: 'Failed to fetch references' });
  }
});

// Create reference
router.post('/references', authenticate, requireAppRole('teacher'), async (req, res) => {
  try {
    const { student_id, notes } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const result = await pool.query(
      'INSERT INTO references (assigned_teacher_id, student_id, notes) VALUES ($1, $2, $3) ON CONFLICT (assigned_teacher_id, student_id) DO UPDATE SET notes = $3 RETURNING *',
      [req.user.id, student_id, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create reference error:', error);
    res.status(500).json({ error: 'Failed to create reference' });
  }
});

// Update reference
router.put('/references/:id', authenticate, requireAppRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      'UPDATE references SET notes = $1 WHERE id = $2 AND assigned_teacher_id = $3 RETURNING *',
      [notes || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reference error:', error);
    res.status(500).json({ error: 'Failed to update reference' });
  }
});

// Get teacher invite codes
router.get('/invite-codes', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    let query = 'SELECT * FROM teacher_invite_codes WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Teachers can only see their own codes, admins can see all
    if (req.user.app_role === 'teacher' && req.user.role !== 'admin') {
      query += ` AND teacher_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get invite codes error:', error);
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

// Get teacher updates
router.get('/updates', authenticate, async (req, res) => {
  try {
    const { is_active, sort = '-created_at' } = req.query;
    let query = 'SELECT * FROM teacher_updates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    } else {
      query += ` AND is_active = true`;
    }

    if (sort.startsWith('-')) {
      query += ` ORDER BY ${sort.substring(1)} DESC`;
    } else {
      query += ` ORDER BY ${sort} ASC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get teacher updates error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher updates' });
  }
});

export default router;
