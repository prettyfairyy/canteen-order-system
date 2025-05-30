const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth');
const dishesRoutes = require('./routes/dishes');
const ordersRoutes = require('./routes/orders');

app.use('/auth', authRoutes);
app.use('/dishes', dishesRoutes);
app.use('/orders', ordersRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const adminDishesRouter = require('./routes/admin_dishes');
app.use('/admin-dishes', adminDishesRouter);
