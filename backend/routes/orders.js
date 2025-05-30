const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');

function getTodayString() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

// API: Đặt món ăn
router.post('/', async (req, res) => {
  const { student_id, items } = req.body;
  const today = getTodayString();

  if (!student_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Thiếu thông tin hoặc danh sách món ăn rỗng' });
  }

  try {
    await poolConnect;

    // Kiểm tra tồn kho và serve_date hôm nay
    for (const item of items) {
      const check = await pool.request()
        .input('dish_instance_id', sql.Int, item.dish_instance_id)
        .input('today', sql.Date, today)
        .query(`
          SELECT max_quantity 
          FROM dishes 
          WHERE dish_instance_id = @dish_instance_id AND serve_date = @today
        `);

      const available = check.recordset[0]?.max_quantity ?? 0;
      if (item.quantity > available) {
        return res.status(400).json({
          message: `Món ${item.dish_instance_id} không còn đủ số lượng. Còn lại ${available}.`
        });
      }
    }

    // Kiểm tra tổng số phần đã đặt hôm nay
    const count = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('today', sql.Date, today)
      .query(`
        SELECT SUM(oi.quantity) AS total_quantity
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.student_id = @student_id AND o.order_date = @today
      `);

    const totalToday = count.recordset[0].total_quantity || 0;
    const newQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalToday + newQuantity > 3) {
      return res.status(400).json({ message: 'Bạn chỉ được đặt tối đa 3 phần ăn mỗi ngày!' });
    }

    // Tìm order hiện có
    let order_id;
    const existing = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('today', sql.Date, today)
      .query(`SELECT order_id FROM orders WHERE student_id = @student_id AND order_date = @today`);

    const transaction = pool.transaction();
    await transaction.begin();
    const request = transaction.request();

    if (existing.recordset.length > 0) {
      order_id = existing.recordset[0].order_id;
    } else {
      const orderResult = await request
        .input('student_id', sql.VarChar, student_id)
        .input('order_date', sql.Date, today)
        .query(`
          INSERT INTO orders (student_id, order_date)
          OUTPUT INSERTED.order_id
          VALUES (@student_id, @order_date)
        `);
      order_id = orderResult.recordset[0].order_id;
    }

    // Cập nhật/cộng dồn hoặc thêm mới món ăn
    for (const item of items) {
      const exist = await transaction.request()
        .input('order_id', sql.Int, order_id)
        .input('dish_instance_id', sql.Int, item.dish_instance_id)
        .query(`
          SELECT quantity 
          FROM order_items 
          WHERE order_id = @order_id AND dish_instance_id = @dish_instance_id
        `);

      if (exist.recordset.length > 0) {
        await transaction.request()
          .input('order_id', sql.Int, order_id)
          .input('dish_instance_id', sql.Int, item.dish_instance_id)
          .input('quantity', sql.Int, item.quantity)
          .query('UPDATE order_items SET quantity = quantity + @quantity WHERE order_id = @order_id AND dish_instance_id = @dish_instance_id');
      } else {
        await transaction.request()
          .input('order_id', sql.Int, order_id)
          .input('dish_instance_id', sql.Int, item.dish_instance_id)
          .input('quantity', sql.Int, item.quantity)
          .query('INSERT INTO order_items (order_id, dish_instance_id, quantity) VALUES (@order_id, @dish_instance_id, @quantity)');
      }

      await transaction.request()
        .input('dish_instance_id', sql.Int, item.dish_instance_id)
        .input('quantity', sql.Int, item.quantity)
        .query('UPDATE dishes SET max_quantity = max_quantity - @quantity WHERE dish_instance_id = @dish_instance_id');
    }

    await transaction.commit();

    res.status(201).json({ message: 'Đặt món thành công' });
  } catch (err) {
    console.error('Lỗi khi đặt món:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// API: Lấy đơn hàng hôm nay
router.get('/:student_id', async (req, res) => {
  const student_id = req.params.student_id;
  const today = getTodayString();

  try {
    await poolConnect;
    const result = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('today', sql.Date, today)
      .query(`
        SELECT 
          oi.order_item_id,
          oi.dish_instance_id,
          d.dish_id,
          d.name,
          d.price,
          d.image_url,
          oi.quantity
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN dishes d ON oi.dish_instance_id = d.dish_instance_id
        WHERE o.student_id = @student_id AND o.order_date = @today
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Lỗi khi lấy đơn:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Cập nhật hoặc xóa món ăn trong đơn
router.put('/update', async (req, res) => {
  const { order_item_id, quantity } = req.body;

  if (!order_item_id || quantity == null) {
    return res.status(400).json({ message: 'Thiếu thông tin order_item_id hoặc quantity' });
  }

  try {
    await poolConnect;

    // Lấy dish_instance_id để xử lý tồn kho
    const old = await pool.request()
      .input('order_item_id', sql.Int, order_item_id)
      .query(`SELECT dish_instance_id, quantity, order_id FROM order_items WHERE order_item_id = @order_item_id`);
    
    const item = old.recordset[0];
    if (!item) return res.status(404).json({ message: 'Không tìm thấy món để cập nhật' });

    const restoreQty = item.quantity;
    const dish_instance_id = item.dish_instance_id;
    const order_id = item.order_id;

    const transaction = pool.transaction();
    await transaction.begin();
    const request = transaction.request();

    if (quantity === 0) {
      // Trả lại tồn kho và xóa món
      await request
        .input('dish_instance_id', sql.Int, dish_instance_id)
        .input('qty', sql.Int, restoreQty)
        .query('UPDATE dishes SET max_quantity = max_quantity + @qty WHERE dish_instance_id = @dish_instance_id');

      await request
        .input('order_item_id', sql.Int, order_item_id)
        .query('DELETE FROM order_items WHERE order_item_id = @order_item_id');

      // Nếu order không còn món → xóa luôn đơn
      await request
        .input('order_id', sql.Int, order_id)
        .query(`
          DELETE FROM orders
          WHERE order_id = @order_id
          AND NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = @order_id)
        `);
    } else {
      // Cập nhật số lượng
      await request
        .input('order_item_id', sql.Int, order_item_id)
        .input('quantity', sql.Int, quantity)
        .query('UPDATE order_items SET quantity = @quantity WHERE order_item_id = @order_item_id');
    }

    await transaction.commit();
    res.status(200).json({ message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
