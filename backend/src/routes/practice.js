import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get practice sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-created_at', limit } = req.query;
    let query = 'SELECT * FROM practice_sessions WHERE 1=1';
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
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create practice session
router.post('/sessions', authenticate, async (req, res) => {
  try {
    const { duration_minutes, notes, student_id } = req.body;

    if (!duration_minutes) {
      return res.status(400).json({ error: 'duration_minutes is required' });
    }

    const finalStudentId = student_id || req.user.id;

    const result = await pool.query(
      'INSERT INTO practice_sessions (student_id, duration_minutes, notes) VALUES ($1, $2, $3) RETURNING *',
      [finalStudentId, duration_minutes, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get practice routines
router.get('/routines', authenticate, async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = 'SELECT * FROM practice_routines WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    } else if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get routines error:', error);
    res.status(500).json({ error: 'Failed to fetch routines' });
  }
});

// Create practice routine
router.post('/routines', authenticate, async (req, res) => {
  try {
    const { name, description, exercises, student_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const finalStudentId = student_id || req.user.id;

    const result = await pool.query(
      'INSERT INTO practice_routines (student_id, name, description, exercises) VALUES ($1, $2, $3, $4) RETURNING *',
      [finalStudentId, name, description || null, exercises ? JSON.stringify(exercises) : null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create routine error:', error);
    res.status(500).json({ error: 'Failed to create routine' });
  }
});

// Delete practice routine
router.delete('/routines/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT student_id FROM practice_routines WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    if (existing.rows[0].student_id !== req.user.id && req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM practice_routines WHERE id = $1', [id]);
    res.json({ message: 'Routine deleted' });
  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(500).json({ error: 'Failed to delete routine' });
  }
});

export default router;
