const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');

router.post('/login', async (req, res) => {
  const { student_id, password } = req.body;

  if (!student_id || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng nhập' });
  }

  try {
    await poolConnect;
    const request = pool.request();         
    const result = await request
      .input('student_id', sql.VarChar, student_id)
      .query('SELECT * FROM students WHERE student_id = @student_id');

    const student = result.recordset[0];

    if (!student || student.password_hash !== password) {
      return res.status(401).json({ message: 'Sai MSSV hoặc mật khẩu' });
    }

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      student_id: student.student_id,
      full_name: student.full_name
    });

  } catch (err) {
    console.error('Lỗi khi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
