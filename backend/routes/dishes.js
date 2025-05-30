const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');

// Lấy danh sách món ăn hôm nay
router.get('/today', async (req, res) => {
  const now = new Date();
const todayStr = now.getFullYear() + '-' +
                 String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0');

  try {
    await poolConnect;

    const result = await pool.request()
      .input('today', sql.Date, new Date(todayStr))
      .query(`
        SELECT dish_instance_id, dish_id, name, price, image_url, max_quantity
        FROM dishes
        WHERE CONVERT(date, serve_date) = @today
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Lỗi /today:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});


// Lấy danh sách món chưa phục vụ hôm nay
router.get('/available', async (req, res) => {
  const now = new Date();
const todayStr = now.getFullYear() + '-' +
                 String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0');


  try {
    await poolConnect;
    const result = await pool.request()
      .input('today', sql.Date, new Date(todayStr))
      .query(`
        SELECT DISTINCT dish_id, name, price, image_url
        FROM dishes
        WHERE dish_id NOT IN (
          SELECT dish_id FROM dishes WHERE CONVERT(date, serve_date) = @today
        )
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Lỗi /available:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Lấy dish_id kế tiếp
router.get('/next-id', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT MAX(dish_id) AS max_id FROM dishes');
    const nextId = result.recordset[0].max_id ? result.recordset[0].max_id + 1 : 1001;

    res.json({ next_id: nextId });
  } catch (err) {
    console.error('Lỗi /next-id:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
