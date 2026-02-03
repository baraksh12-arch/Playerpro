import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get teacher updates
router.get('/teacher-updates', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { is_active, sort = '-created_at' } = req.query;
    let query = 'SELECT * FROM teacher_updates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
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

// Create teacher update
router.post('/teacher-updates', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, content, is_active } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const result = await pool.query(
      'INSERT INTO teacher_updates (title, content, is_active, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, is_active !== false, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create teacher update error:', error);
    res.status(500).json({ error: 'Failed to create teacher update' });
  }
});

// Update teacher update
router.put('/teacher-updates/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_active } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM teacher_updates WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE teacher_updates SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update teacher update error:', error);
    res.status(500).json({ error: 'Failed to update teacher update' });
  }
});

// Delete teacher update
router.delete('/teacher-updates/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM teacher_updates WHERE id = $1', [id]);
    res.json({ message: 'Teacher update deleted' });
  } catch (error) {
    console.error('Delete teacher update error:', error);
    res.status(500).json({ error: 'Failed to delete teacher update' });
  }
});

// Get agent info
router.get('/agent-info', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agent_info ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get agent info error:', error);
    res.status(500).json({ error: 'Failed to fetch agent info' });
  }
});

// Update agent info
router.post('/agent-info', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, agentpass } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const existing = await pool.query('SELECT id FROM agent_info WHERE user_id = $1', [user_id]);

    if (existing.rows.length > 0) {
      const result = await pool.query(
        'UPDATE agent_info SET agentpass = $1 WHERE user_id = $2 RETURNING *',
        [agentpass || null, user_id]
      );
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        'INSERT INTO agent_info (user_id, agentpass) VALUES ($1, $2) RETURNING *',
        [user_id, agentpass || null]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Update agent info error:', error);
    res.status(500).json({ error: 'Failed to update agent info' });
  }
});

// Get song index
router.get('/song-index', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM song_index ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get song index error:', error);
    res.status(500).json({ error: 'Failed to fetch song index' });
  }
});

// Create song index
router.post('/song-index', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, artist, file_url, index_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      'INSERT INTO song_index (title, artist, file_url, index_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, artist || null, file_url || null, index_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create song index error:', error);
    res.status(500).json({ error: 'Failed to create song index' });
  }
});

// Update song index
router.put('/song-index/:id', authenticate, requireAppRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, file_url, index_id } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (artist !== undefined) updates.artist = artist;
    if (file_url !== undefined) updates.file_url = file_url;
    if (index_id !== undefined) updates.index_id = index_id;

    if (Object.keys(updates).length === 0) {
      const result = await pool.query('SELECT * FROM song_index WHERE id = $1', [id]);
      return res.json(result.rows[0]);
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE song_index SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update song index error:', error);
    res.status(500).json({ error: 'Failed to update song index' });
  }
});

export default router;
