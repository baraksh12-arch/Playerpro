import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all teacher activation serials (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM teacher_activation_serials ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get serials error:', error);
    res.status(500).json({ error: 'Failed to fetch serials' });
  }
});

export default router;
