import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get lesson schedules
router.get('/schedules', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-lesson_date' } = req.query;
    let query = 'SELECT * FROM lesson_schedules WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    } else if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    if (sort.startsWith('-')) {
      query += ` ORDER BY ${sort.substring(1)} DESC`;
    } else {
      query += ` ORDER BY ${sort} ASC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get lesson history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-lesson_date', limit } = req.query;
    let query = 'SELECT * FROM lesson_history WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    } else if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    if (sort.startsWith('-')) {
      query += ` ORDER BY ${sort.substring(1)} DESC`;
    } else {
      query += ` ORDER BY ${sort} ASC`;
    }

    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Create lesson schedule
router.post('/schedules', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { student_id, lesson_date, duration_minutes, notes, teacher_id } = req.body;

    if (!student_id || !lesson_date) {
      return res.status(400).json({ error: 'student_id and lesson_date are required' });
    }

    const result = await pool.query(
      'INSERT INTO lesson_schedules (student_id, teacher_id, lesson_date, duration_minutes, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [student_id, teacher_id || req.user.id, lesson_date, duration_minutes || 60, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Create lesson history
router.post('/history', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { student_id, lesson_date, duration_minutes, attended, notes, teacher_id } = req.body;

    if (!student_id || !lesson_date) {
      return res.status(400).json({ error: 'student_id and lesson_date are required' });
    }

    const result = await pool.query(
      'INSERT INTO lesson_history (student_id, teacher_id, lesson_date, duration_minutes, attended, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, teacher_id || req.user.id, lesson_date, duration_minutes || null, attended || false, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create history error:', error);
    res.status(500).json({ error: 'Failed to create history' });
  }
});

// Update lesson schedule
router.put('/schedules/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lesson_date, duration_minutes, notes } = req.body;

    const updates = {};
    if (lesson_date !== undefined) updates.lesson_date = lesson_date;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM lesson_schedules WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE lesson_schedules SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Update lesson history
router.put('/history/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { lesson_date, duration_minutes, attended, notes } = req.body;

    const updates = {};
    if (lesson_date !== undefined) updates.lesson_date = lesson_date;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (attended !== undefined) updates.attended = attended;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM lesson_history WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE lesson_history SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update history error:', error);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// Delete lesson schedule
router.delete('/schedules/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lesson_schedules WHERE id = $1', [id]);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Delete lesson history
router.delete('/history/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lesson_history WHERE id = $1', [id]);
    res.json({ message: 'History deleted' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

export default router;
