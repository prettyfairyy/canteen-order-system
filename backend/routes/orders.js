const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../db');


// Tạo đơn hàng mới
router.post('/', async (req, res) => {
    // Lấy giờ hiện tại (giờ hệ thống)
//const now = new Date();
//const hour = now.getHours();

//if (!(hour >= 19 || hour < 10)) {
//  return res.status(403).json({ message: 'Chỉ được đặt món từ 19h đến 10h sáng hôm sau.' });
//}


  const { student_id, items } = req.body;

  if (!student_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Thiếu thông tin hoặc danh sách món ăn rỗng' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    await poolConnect;
        // Kiểm tra món còn đủ số lượng không
        for (const item of items) {
        const check = await pool.request()
            .input('dish_id', sql.Int, item.dish_id)
            .query(`
            SELECT max_quantity FROM dishes WHERE dish_id = @dish_id
            `);

        const available = check.recordset[0]?.max_quantity ?? 0;

        if (item.quantity > available) {
            return res.status(400).json({
            message: `Món ${item.dish_id} không còn đủ số lượng. Chỉ còn ${available} phần.`
            });
        }
        }

        const countResult = await pool.request()
            .input('student_id', sql.VarChar, student_id)
            .input('today', sql.Date, today)
            .query(`
        SELECT SUM(oi.quantity) AS total_quantity
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.student_id = @student_id AND o.order_date = @today
    `);

    const totalToday = countResult.recordset[0].total_quantity || 0;
    const newQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalToday + newQuantity > 3) {
    return res.status(400).json({
        message: 'Bạn chỉ được đặt tối đa 3 phần ăn mỗi ngày!'
    });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    const request = transaction.request();

    // Tạo đơn hàng mới
    const orderResult = await request
      .input('student_id', sql.VarChar, student_id)
      .input('order_date', sql.Date, today)
      .query(`
        INSERT INTO orders (student_id, order_date)
        OUTPUT INSERTED.order_id
        VALUES (@student_id, @order_date)
      `);

    const order_id = orderResult.recordset[0].order_id;

    // Chèn các món ăn vào order_items
    for (const item of items) {
        await transaction.request()
            .input('order_id', sql.Int, order_id)
            .input('dish_id', sql.Int, item.dish_id)
            .input('quantity', sql.Int, item.quantity)
            .query(`
                INSERT INTO order_items (order_id, dish_id, quantity)
                VALUES (@order_id, @dish_id, @quantity)
            `);
            await transaction.request()
            .input('dish_id', sql.Int, item.dish_id)
            .input('quantity', sql.Int, item.quantity)
            .query(`
                UPDATE dishes
                SET max_quantity = max_quantity - @quantity
                WHERE dish_id = @dish_id AND max_quantity >= @quantity
            `);
        }


    await transaction.commit();
        // Sau khi commit, lấy thông tin chi tiết món vừa đặt
    const orderDetails = await pool.request()
    .input('order_id', sql.Int, order_id)
    .query(`
        SELECT d.dish_id, d.name, d.price, oi.quantity, d.image_url
        FROM order_items oi
        JOIN dishes d ON oi.dish_id = d.dish_id
        WHERE oi.order_id = @order_id
    `);

    res.status(201).json({
    message: 'Đặt món thành công',
    order_id,
    items: orderDetails.recordset
    });

  } catch (err) {
    console.error('Lỗi khi đặt món:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// Xem các món đã đặt hôm nay
router.get('/:student_id', async (req, res) => {
  const { student_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    await poolConnect;
    const result = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('today', sql.Date, today)
      .query(`
        SELECT oi.order_item_id, d.name, d.price, oi.quantity,
               d.image_url, o.order_date
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN dishes d ON oi.dish_id = d.dish_id
        WHERE o.student_id = @student_id AND o.order_date = @today
      `);

    res.status(200).json(result.recordset);

  } catch (err) {
    console.error('Lỗi khi xem đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

router.put('/update', async (req, res) => {
  const { order_item_id, quantity } = req.body;

  if (quantity < 0 || quantity > 3) {
    return res.status(400).json({ message: 'Số lượng không hợp lệ' });
  }

  try {
    await poolConnect;

    const oldRes = await pool.request()
      .input('order_item_id', sql.Int, order_item_id)
      .query(`SELECT quantity, dish_id FROM order_items WHERE order_item_id = @order_item_id`);

    if (!oldRes.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy món' });
    }

    const { quantity: oldQty, dish_id } = oldRes.recordset[0];
    const diff = quantity - oldQty;

    const tx = pool.transaction();
    await tx.begin();
    const reqTx = tx.request();

    if (quantity === 0) {
      await reqTx
        .input('order_item_id', sql.Int, order_item_id)
        .query(`DELETE FROM order_items WHERE order_item_id = @order_item_id`);
    } else {
      await reqTx
        .input('order_item_id', sql.Int, order_item_id)
        .input('quantity', sql.Int, quantity)
        .query(`UPDATE order_items SET quantity = @quantity WHERE order_item_id = @order_item_id`);
    }

    await reqTx
      .input('dish_id', sql.Int, dish_id)
      .input('diff', sql.Int, diff)
      .query(`UPDATE dishes SET max_quantity = max_quantity - @diff WHERE dish_id = @dish_id`);

    await tx.commit();
    res.status(200).json({ message: 'Cập nhật thành công' });

  } catch (err) {
    console.error('Lỗi cập nhật số lượng:', err);
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;



