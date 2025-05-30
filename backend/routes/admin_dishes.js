// Tập trung xử lý API riêng cho admin: thêm món mới, cập nhật món có sẵn
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');
const multer = require('multer');
const path = require('path');

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

// Thêm món mới
router.post('/new', upload.single('image'), async (req, res) => {
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

// Thêm món đã có vào ngày hôm nay
router.post('/add-existing', async (req, res) => {
  const { dish_id, serve_date, max_quantity } = req.body;
  console.log('🔎 Thêm món có sẵn:', { dish_id, serve_date, max_quantity });

  try {
    await poolConnect;

    // Lấy thông tin món gốc (dựa trên dish_id bất kỳ, không cần đúng hôm nay)
    const result = await pool.request()
      .input('dish_id', sql.Int, dish_id)
      .query('SELECT TOP 1 name, price, image_url FROM dishes WHERE dish_id = @dish_id');

    const template = result.recordset[0];
    if (!template) return res.status(404).json({ message: 'Không tìm thấy món gốc' });

    // Chèn dòng mới với serve_date hôm nay
    await pool.request()
      .input('dish_id', sql.Int, dish_id)
      .input('name', sql.NVarChar, template.name)
      .input('price', sql.Float, template.price)
      .input('image_url', sql.NVarChar, template.image_url)
      .input('max_quantity', sql.Int, max_quantity)
      .input('serve_date', sql.Date, serve_date)
      .query(`
        INSERT INTO dishes (dish_id, name, price, image_url, max_quantity, serve_date)
        VALUES (@dish_id, @name, @price, @image_url, @max_quantity, @serve_date)
      `);

    res.status(201).json({ message: 'Đã thêm món vào hôm nay!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;