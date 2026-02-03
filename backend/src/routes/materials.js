import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAppRole } from '../middleware/auth.js';

const router = express.Router();

// Get all materials
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Get material by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM materials WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Create material
router.post('/', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, file_url, file_type, category } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      'INSERT INTO materials (title, description, file_url, file_type, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description || null, file_url || null, file_type || null, category || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Update material
router.put('/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, file_url, file_type, category } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (file_url !== undefined) updates.file_url = file_url;
    if (file_type !== undefined) updates.file_type = file_type;
    if (category !== undefined) updates.category = category;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM materials WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE materials SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Delete material
router.delete('/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ message: 'Material deleted' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Get student materials
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check permissions
    if (studentId !== req.user.id && req.user.app_role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT m.*, sm.assigned_at 
       FROM student_materials sm 
       JOIN materials m ON sm.material_id = m.id 
       WHERE sm.student_id = $1 
       ORDER BY sm.assigned_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get student materials error:', error);
    res.status(500).json({ error: 'Failed to fetch student materials' });
  }
});

// Assign material to student
router.post('/student', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { student_id, material_id } = req.body;

    if (!student_id || !material_id) {
      return res.status(400).json({ error: 'student_id and material_id are required' });
    }

    const result = await pool.query(
      'INSERT INTO student_materials (student_id, material_id) VALUES ($1, $2) ON CONFLICT (student_id, material_id) DO NOTHING RETURNING *',
      [student_id, material_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Material already assigned' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Assign material error:', error);
    res.status(500).json({ error: 'Failed to assign material' });
  }
});

// Remove material from student
router.delete('/student/:studentId/:materialId', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId, materialId } = req.params;
    await pool.query(
      'DELETE FROM student_materials WHERE student_id = $1 AND material_id = $2',
      [studentId, materialId]
    );
    res.json({ message: 'Material removed' });
  } catch (error) {
    console.error('Remove material error:', error);
    res.status(500).json({ error: 'Failed to remove material' });
  }
});

export default router;
