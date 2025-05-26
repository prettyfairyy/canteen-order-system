let dishes = [];
let selected = {}; // lưu số lượng món đang đặt

async function loadDishes() {
  try {
    const res = await fetch('http://localhost:3000/dishes/today');
    dishes = await res.json();

    const dishList = document.getElementById('dishList');
    dishList.innerHTML = '';

    let maxDish = dishes[0];
    dishes.forEach(d => {
      if (d.max_quantity < maxDish.max_quantity) maxDish = d;
    });

    document.getElementById('bestSellerImage').src = `http://localhost:3000${maxDish.image_url}`;
    document.getElementById('bestSellerLabel').innerText = `Best seller: ${maxDish.name}`;

    dishes.forEach(d => {
      const selectedQty = selected[d.dish_id] || 0;
      const available = d.max_quantity - selectedQty;

      const div = document.createElement('div');
      div.className = 'dish';
      div.innerHTML = `
        <div class="image-wrapper" style="position: relative;">
          <img src="http://localhost:3000${d.image_url}" alt="${d.name}" />
          <div class="quantity-bar">Còn lại: ${available}</div>
          <button class="add-btn" onclick="openModal('${d.dish_id}')">+</button>
        </div>
        <div class="info">
          <div class="dish-name">${d.name}</div>
          <div class="dish-price">${d.price.toLocaleString()} VNĐ</div>
        </div>
      `;
      dishList.appendChild(div);
    });
  } catch (err) {
    document.getElementById('message').textContent = 'Không thể tải danh sách món ăn.';
  }
}


function openModal(dishId) {
  const dish = dishes.find(d => d.dish_id == dishId);
  if (!dish) return;

  const modal = document.getElementById('orderModal');
  modal.style.display = 'block';

  document.getElementById('modalImage').src = `http://localhost:3000${dish.image_url}`;
  document.getElementById('modalName').innerText = dish.name;
  document.getElementById('modalPrice').innerText = `${dish.price.toLocaleString()} VNĐ`;
  document.getElementById('modalAvailable').innerText = `Còn lại: ${dish.max_quantity}`;

  document.getElementById('modalQuantity').value = selected[dishId] || 0;
  document.getElementById('modalConfirm').onclick = () => confirmOrder(dishId, dish.max_quantity);
}

async function confirmOrder(dishId, max_quantity) {
  const qty = parseInt(document.getElementById('modalQuantity').value);
  const student_id = localStorage.getItem('student_id');
  if (!student_id) return alert('Bạn chưa đăng nhập');

  // Kiểm tra tổng đã đặt trong DB hôm nay
  try {
    const resToday = await fetch(`http://localhost:3000/orders/${student_id}`);
    const dataToday = await resToday.json();
    const totalToday = dataToday.reduce((sum, item) => sum + item.quantity, 0);

    // Nếu vượt quá 3 phần thì không cho đặt nữa
    if (totalToday + qty > 3) {
      showToast('Bạn chỉ được đặt tối đa 3 phần ăn mỗi ngày!');
      return;
    }

    const res = await fetch('http://localhost:3000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        items: [{ dish_id: parseInt(dishId), quantity: qty }]
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Đặt món thành công!');
      document.getElementById('orderModal').style.display = 'none';
      loadDishes(); // Cập nhật lại “còn lại”
    } else {
      showToast(data.message || 'Có lỗi xảy ra khi đặt món.');
    }
  } catch (err) {
    showToast('Lỗi khi gửi đơn hàng.');
  }
}


function adjustQuantity(delta) {
  const input = document.getElementById('modalQuantity');
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = value;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

loadDishes();
