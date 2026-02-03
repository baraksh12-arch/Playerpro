import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get recordings
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-created_at', limit } = req.query;
    let query = 'SELECT * FROM recordings WHERE 1=1';
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
    console.error('Get recordings error:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Create recording
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, file_url, duration_seconds, student_id } = req.body;

    if (!title || !file_url) {
      return res.status(400).json({ error: 'title and file_url are required' });
    }

    const finalStudentId = student_id || req.user.id;

    const result = await pool.query(
      'INSERT INTO recordings (student_id, title, file_url, duration_seconds) VALUES ($1, $2, $3, $4) RETURNING *',
      [finalStudentId, title, file_url, duration_seconds || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create recording error:', error);
    res.status(500).json({ error: 'Failed to create recording' });
  }
});

// Delete recording
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await pool.query('SELECT student_id FROM recordings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    if (existing.rows[0].student_id !== req.user.id && req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM recordings WHERE id = $1', [id]);
    res.json({ message: 'Recording deleted' });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

// Filter recordings
router.post('/filter', authenticate, async (req, res) => {
  try {
    const filters = req.body || {};
    let query = 'SELECT * FROM recordings WHERE 1=1';
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
    console.error('Filter recordings error:', error);
    res.status(500).json({ error: 'Failed to filter recordings' });
  }
});

export default router;
