async function loadOrders() {
  const student_id = localStorage.getItem('student_id');
  const res = await fetch(`http://localhost:3000/orders/${student_id}`);
  const data = await res.json();

  const container = document.getElementById('orderList');
  const totalDiv = document.getElementById('totalAmount');
  container.innerHTML = '';

  let total = 0;

  // KHÔNG group – giữ nguyên từng order_item_id
  data.forEach(item => {
    if (item.quantity === 0) return;

    const div = document.createElement('div');
    div.className = 'order';

    const subtotal = item.price * item.quantity;
    total += subtotal;

    div.innerHTML = `
      <img src="http://localhost:3000${item.image_url}" alt="${item.name}" />
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="price">${item.price.toLocaleString()} VNĐ</div>
      </div>
      <div class="quantity-box">
        <button onclick="confirmUpdate(${item.order_item_id}, ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button onclick="updateQuantity(${item.order_item_id}, ${item.quantity + 1})">+</button>
      </div>
      <div class="price">
        <strong>${subtotal.toLocaleString()} VNĐ</strong>
      </div>
    `;
    container.appendChild(div);
  });

  totalDiv.textContent = `Tổng: ${total.toLocaleString()} VNĐ`;
}


function confirmUpdate(order_item_id, newQty) {
  if (newQty === 0) {
    if (confirm('Bạn có chắc muốn xóa món này khỏi đơn hàng?')) {
      updateQuantity(order_item_id, newQty);
    }
  } else {
    updateQuantity(order_item_id, newQty);
  }
}

async function updateQuantity(order_item_id, newQty) {
  if (newQty < 0 || newQty > 3) return alert('Mỗi món phải từ 0 đến 3 phần');

  try {
    const res = await fetch('http://localhost:3000/orders/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_item_id, quantity: newQty })
    });

    const data = await res.json();
    if (res.ok) {
      await loadOrders();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Không thể cập nhật đơn hàng.');
  }
}

loadOrders();
