import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get chat messages
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-created_at' } = req.query;
    let query = 'SELECT * FROM chat_messages WHERE 1=1';
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
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create chat message
router.post('/', authenticate, async (req, res) => {
  try {
    const { student_id, message, teacher_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const finalStudentId = student_id || req.user.id;
    const finalTeacherId = teacher_id || (req.user.app_role === 'teacher' ? req.user.id : null);

    const result = await pool.query(
      'INSERT INTO chat_messages (student_id, teacher_id, message) VALUES ($1, $2, $3) RETURNING *',
      [finalStudentId, finalTeacherId, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mark message as read by student
router.put('/:id/read-student', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT student_id FROM chat_messages WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (existing.rows[0].student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE chat_messages SET is_read_by_student = true WHERE id = $1 RETURNING *',
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark message as read by teacher
router.put('/:id/read-teacher', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE chat_messages SET is_read_by_teacher = true WHERE id = $1 RETURNING *',
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Filter messages
router.post('/filter', authenticate, async (req, res) => {
  try {
    const filters = req.body || {};
    let query = 'SELECT * FROM chat_messages WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      filters.student_id = req.user.id;
    }

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        query += ` AND ${key} = $${paramIndex++}`;
        params.push(filters[key]);
      }
    });

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Filter messages error:', error);
    res.status(500).json({ error: 'Failed to filter messages' });
  }
});

export default router;
