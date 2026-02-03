import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireRole, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin/management only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { role, app_role, agent_role } = req.query;
    let query = 'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }
    if (app_role) {
      query += ` AND app_role = $${paramIndex++}`;
      params.push(app_role);
    }
    if (agent_role) {
      query += ` AND agent_role = $${paramIndex++}`;
      params.push(agent_role);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user (admin/management only)
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    if (req.body.full_name !== undefined) updates.full_name = req.body.full_name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.app_role !== undefined) updates.app_role = req.body.app_role;
    if (req.body.agent_role !== undefined) updates.agent_role = req.body.agent_role;
    if (req.body.assigned_teacher_id !== undefined) updates.assigned_teacher_id = req.body.assigned_teacher_id;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query(
        'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE id = $1',
        [id]
      );
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Filter users
router.post('/filter', authenticate, async (req, res) => {
  try {
    const filters = req.body || {};
    let query = 'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        query += ` AND ${key} = $${paramIndex++}`;
        params.push(filters[key]);
      }
    });

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Filter users error:', error);
    res.status(500).json({ error: 'Failed to filter users' });
  }
});

export default router;
