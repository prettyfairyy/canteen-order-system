const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');

router.get('/today', async (req, res) => {
  const today = new Date();
  today.setHours(today.getHours() + 7); // bù thêm 7 tiếng nếu Node đang ở UTC
  const todayStr = today.toISOString().split('T')[0];

  console.log('Today string for SQL WHERE:', todayStr);
  try {
    await poolConnect;
    const result = await pool.request()
      .input('today', sql.Date, todayStr)
      .query(`
        SELECT dish_id, name, price, image_url, max_quantity
        FROM dishes
        WHERE serve_date = @today
      `);

    res.status(200).json(result.recordset);

  } catch (err) {
    console.error('Lỗi khi lấy món hôm nay:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
