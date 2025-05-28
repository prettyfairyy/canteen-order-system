const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool, poolConnect, sql } = require('../db');

// Cấu hình lưu ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// Lấy danh sách món hôm nay
router.get('/today', async (req, res) => {
  const today = new Date();
  today.setHours(today.getHours() + 7);
  const todayStr = today.toISOString().split('T')[0];

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
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Lấy dish_id kế tiếp
router.get('/next-id', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT MAX(dish_id) AS max_id FROM dishes');
    const nextId = result.recordset[0].max_id + 1 || 1001;
    res.json({ next_id: nextId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Thêm món mới (upload ảnh)
router.post('/', upload.single('image'), async (req, res) => {
  const { dish_id, name, price, max_quantity, serve_date } = req.body;
  const image_url = '/uploads/images/' + req.file.filename;

  try {
    await poolConnect;
    await pool.request()
      .input('dish_id', sql.Int, dish_id)
      .input('name', sql.NVarChar, name)
      .input('price', sql.Float, price)
      .input('image_url', sql.NVarChar, image_url)
      .input('max_quantity', sql.Int, max_quantity)
      .input('serve_date', sql.Date, serve_date)
      .query(`
        INSERT INTO dishes (dish_id, name, price, image_url, max_quantity, serve_date)
        VALUES (@dish_id, @name, @price, @image_url, @max_quantity, @serve_date)
      `);

    res.status(201).json({ message: 'Thêm món thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Lấy danh sách món chưa được serve hôm nay
router.get('/available', async (req, res) => {
  const today = new Date();
  today.setHours(today.getHours() + 7);
  const todayStr = today.toISOString().split('T')[0];

  try {
    await poolConnect;
    const result = await pool.request()
      .input('today', sql.Date, todayStr)
      .query(`
        SELECT dish_id, name, price, image_url
        FROM dishes
        WHERE dish_id NOT IN (
          SELECT dish_id FROM dishes WHERE serve_date = @today
        )
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật ngày serve cho món có sẵn
router.post('/add-available', async (req, res) => {
  const { dish_id, serve_date, max_quantity } = req.body;
  try {
    await poolConnect;
    await pool.request()
      .input('dish_id', sql.Int, dish_id)
      .input('serve_date', sql.Date, serve_date)
      .input('max_quantity', sql.Int, max_quantity)
      .query(`UPDATE dishes SET serve_date = @serve_date, max_quantity = @max_quantity WHERE dish_id = @dish_id`);

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xoá món ăn
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dishes WHERE dish_id = @id');
    res.json({ message: 'Xoá thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;