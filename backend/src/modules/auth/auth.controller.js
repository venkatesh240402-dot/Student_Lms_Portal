const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');
const env = require('../../config/env');

async function login(req, res) {
  const { uniqueId, password } = req.body;

  if (!uniqueId || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both uniqueId and password.',
    });
  }

  try {
    // 1. Check if user is an Admin (match uniqueId with username)
    const [admins] = await pool.query(
      'SELECT id, username, password_hash, name FROM admins WHERE username = ?',
      [uniqueId]
    );

    if (admins.length > 0) {
      const admin = admins[0];
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }

      const token = jwt.sign(
        { id: admin.id, uniqueId: admin.username, role: 'admin' },
        env.jwtSecret,
        { expiresIn: '1d' }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: admin.id,
            uniqueId: admin.username,
            name: admin.name,
            role: 'admin',
          },
        },
      });
    }

    // 2. Check if user is a Faculty (match uniqueId with unique_id)
    const [teachers] = await pool.query(
      'SELECT id, unique_id, password_hash, name FROM teachers WHERE unique_id = ?',
      [uniqueId]
    );

    if (teachers.length > 0) {
      const teacher = teachers[0];
      // For faculty, password is DOB or a hashed custom password.
      // The schema has password_hash. Let's compare using bcrypt.
      const isPasswordValid = await bcrypt.compare(password, teacher.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }

      const token = jwt.sign(
        { id: teacher.id, uniqueId: teacher.unique_id, role: 'faculty' },
        env.jwtSecret,
        { expiresIn: '1d' }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: teacher.id,
            uniqueId: teacher.unique_id,
            name: teacher.name,
            role: 'faculty',
          },
        },
      });
    }

    // 3. Check if user is a Student (match uniqueId with unique_id)
    const [students] = await pool.query(
      'SELECT id, unique_id, password_hash, name FROM students WHERE unique_id = ?',
      [uniqueId]
    );

    if (students.length > 0) {
      const student = students[0];
      const isPasswordValid = await bcrypt.compare(password, student.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }

      const token = jwt.sign(
        { id: student.id, uniqueId: student.unique_id, role: 'student' },
        env.jwtSecret,
        { expiresIn: '1d' }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: student.id,
            uniqueId: student.unique_id,
            name: student.name,
            role: 'student',
          },
        },
      });
    }

    // If no match found in any table
    return res.status(401).json({
      success: false,
      message: 'User not found or invalid credentials.',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred.',
      errors: [error.message],
    });
  }
}

module.exports = {
  login,
};
