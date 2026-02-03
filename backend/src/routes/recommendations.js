import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get recommendations
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-created_at' } = req.query;
    let query = 'SELECT * FROM recommendations WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    } else if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      // Students see all recommendations
    }

    if (sort.startsWith('-')) {
      query += ` ORDER BY ${sort.substring(1)} DESC`;
    } else {
      query += ` ORDER BY ${sort} ASC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Create recommendation
router.post('/', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { student_id, title, description, url, type } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      'INSERT INTO recommendations (student_id, title, description, url, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [student_id || null, title, description || null, url || null, type || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// Update recommendation
router.put('/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, type } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (url !== undefined) updates.url = url;
    if (type !== undefined) updates.type = type;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM recommendations WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE recommendations SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

// Delete recommendation
router.delete('/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM recommendations WHERE id = $1', [id]);
    res.json({ message: 'Recommendation deleted' });
  } catch (error) {
    console.error('Delete recommendation error:', error);
    res.status(500).json({ error: 'Failed to delete recommendation' });
  }
});

export default router;
