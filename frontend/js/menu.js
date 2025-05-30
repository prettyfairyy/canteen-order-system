let dishes = [];
let selected = {}; // lưu số lượng món đang chọn

function getTodayString() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

async function loadDishes() {
  try {
    const res = await fetch('http://localhost:3000/dishes/today');
    dishes = await res.json();

    const dishList = document.getElementById('dishList');
    dishList.innerHTML = '';

    // Best seller = món còn ít nhất hôm nay
    let maxDish = dishes[0];
    dishes.forEach(d => {
      if (d.max_quantity < maxDish.max_quantity) maxDish = d;
    });

    document.getElementById('bestSellerImage').src = `http://localhost:3000${maxDish.image_url}`;
    document.getElementById('bestSellerLabel').innerText = `Best seller: ${maxDish.name}`;

    dishes.forEach(d => {
      const div = document.createElement('div');
      div.className = 'dish';
      div.innerHTML = `
        <div class="image-wrapper" style="position: relative;">
          <img src="http://localhost:3000${d.image_url}" alt="${d.name}" />
          <div class="quantity-bar">Còn lại: ${d.max_quantity}</div>
          <button class="add-btn" onclick="openModal('${d.dish_instance_id}')">+</button>
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

function openModal(dishInstanceId) {
  const dish = dishes.find(d => d.dish_instance_id == dishInstanceId);
  if (!dish) return;

  document.getElementById('orderModal').style.display = 'block';
  document.getElementById('modalImage').src = `http://localhost:3000${dish.image_url}`;
  document.getElementById('modalName').innerText = dish.name;
  document.getElementById('modalPrice').innerText = `${dish.price.toLocaleString()} VNĐ`;
  document.getElementById('modalAvailable').innerText = `Còn lại: ${dish.max_quantity}`;
  document.getElementById('modalQuantity').value = selected[dishInstanceId] || 0;

  document.getElementById('modalConfirm').onclick = () => confirmOrder(dishInstanceId, dish.max_quantity);
}

async function confirmOrder(dishInstanceId, max_quantity) {
  const qty = parseInt(document.getElementById('modalQuantity').value);
  const student_id = localStorage.getItem('student_id');
  if (!student_id) return alert('Bạn chưa đăng nhập');
  if (qty < 1 || qty > 3) return alert('Chỉ được đặt từ 1 đến 3 phần.');

  try {
    const res = await fetch('http://localhost:3000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        items: [{ dish_instance_id: parseInt(dishInstanceId), quantity: qty }]
      })
    });

    const data = await res.json();
    if (res.ok && data.message === 'Đặt món thành công') {
      showToast('Đặt món thành công!');
      document.getElementById('orderModal').style.display = 'none';
      selected[dishInstanceId] = (selected[dishInstanceId] || 0) + qty;
      loadDishes(); // reload lại số lượng tồn kho
    } else {
      showToast(data.message || 'Lỗi không xác định.');
    }

  } catch (err) {
    showToast('Lỗi gửi đơn hàng: ' + err.message);
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
