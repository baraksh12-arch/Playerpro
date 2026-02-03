import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.query.token || 
                  req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.query.token || 
                  req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, email, full_name, role, app_role, agent_role, assigned_teacher_id, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role) && !roles.includes(req.user.app_role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAppRole = (...appRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!appRoles.includes(req.user.app_role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
