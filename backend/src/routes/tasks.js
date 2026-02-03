import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, sort = '-created_at', limit } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    } else if (req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      // Students can only see their own tasks
      query += ` AND student_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    // Handle sorting
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
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];
    
    // Check permissions
    if (task.student_id !== req.user.id && req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { student_id, title, description, due_date } = req.body;

    if (!student_id || !title) {
      return res.status(400).json({ error: 'student_id and title are required' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (student_id, title, description, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [student_id, title, description || null, due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, status, completed_at } = req.body;

    // Check if task exists and user has permission
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = existing.rows[0];
    if (task.student_id !== req.user.id && req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (due_date !== undefined) updates.due_date = due_date;
    if (status !== undefined) updates.status = status;
    if (completed_at !== undefined) updates.completed_at = completed_at;

    if (Object.keys(updates).length === 0) {
      return res.json(task);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE tasks SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Filter tasks
router.post('/filter', authenticate, async (req, res) => {
  try {
    const filters = req.body || {};
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Students can only see their own tasks
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
    console.error('Filter tasks error:', error);
    res.status(500).json({ error: 'Failed to filter tasks' });
  }
});

export default router;
