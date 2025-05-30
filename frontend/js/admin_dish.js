window.onload = async function () {
  try {
    const res = await fetch('http://localhost:3000/dishes/today');
    const dishes = await res.json();
    renderTodayDishes(dishes);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách món hôm nay:', err);
  }
};

function renderTodayDishes(dishes) {
  const tbody = document.getElementById('dish-today-body');
  tbody.innerHTML = '';
  document.getElementById('total-dish-count').textContent = dishes.length;

  dishes.forEach((dish, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><img src="http://localhost:3000${dish.image_url}" alt="${dish.name}" /></td>
      <td>${dish.name}</td>
      <td>${Number(dish.price).toLocaleString()} VND</td>
      <td>${dish.max_quantity}</td>
      <td>0</td>
      <td>
        <div class="action-container">
          <button class="btn-icon" onclick="editDish(${dish.dish_id})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon" onclick="deleteDish(${dish.dish_id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openAddNewPopup() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('serve_date').value = today;

  fetch('http://localhost:3000/dishes/next-id')
    .then(res => res.json())
    .then(data => {
      document.getElementById('dish_id').value = data.next_id;
      document.getElementById('addDishPopup').style.display = 'flex';
    });
}

function closeAddPopup() {
  document.getElementById('addDishPopup').style.display = 'none';
}

function editDish(id) {
  alert(`Sửa món ID ${id}`);
}

function deleteDish(id) {
  if (confirm('Bạn có chắc muốn xoá món này?')) {
    alert(`Xoá món ID ${id}`);
  }
}

function filterDishes() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#dish-today-body tr');
  rows.forEach(row => {
    const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
    row.style.display = name.includes(keyword) ? '' : 'none';
  });
}

document.getElementById('dishImage').addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById('imagePreview');
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.textContent = '';
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    };
    reader.readAsDataURL(file);
  }
});

function openAddOptions() {
  document.getElementById('actionPopup').style.display = 'flex';
}

function closeActionPopup() {
  document.getElementById('actionPopup').style.display = 'none';
}

function handleAddNew() {
  closeActionPopup();
  openAddNewPopup();
}

function handleAddExisting() {
  closeActionPopup();
  openExistingPopup(); 
}

function openExistingPopup() {
  fetch('http://localhost:3000/dishes/available')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('available-dishes-body');
      tbody.innerHTML = '';

      data.forEach(dish => {
  const row = document.createElement('tr');
  row.innerHTML = `
  <td style="text-align: center;">
    <input type="checkbox" value="${dish.dish_id}" name="selectedDishes" />
  </td>
  <td style="text-align: left;">${dish.name}</td>
  <td style="text-align: right;">${Number(dish.price).toLocaleString()} VND</td>
  <td style="text-align: center;">
    <input type="number" name="limit_${dish.dish_id}" value="${dish.max_quantity || 1}" min="1"
      style="width: 60px; padding: 4px; border-radius: 4px; border: 1px solid #ccc;" />
  </td>
  <td style="text-align: center;">
    <img src="http://localhost:3000${dish.image_url}"
      style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />
  </td>
`;

  tbody.appendChild(row);
});

      document.getElementById('selectDishPopup').style.display = 'flex';
    });
}

function closeSelectPopup() {
  document.getElementById('selectDishPopup').style.display = 'none';
}

async function confirmAddSelected() {
  const now = new Date();
const todayStr = now.getFullYear() + '-' +
                 String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0');


  const selected = document.querySelectorAll('#available-dishes-body input[type="checkbox"]:checked');

  const insertPromises = [];

  selected.forEach(checkbox => {
    const dishId = checkbox.value;
    const quantityInput = document.querySelector(`input[name="limit_${dishId}"]`);
    const max_quantity = parseInt(quantityInput?.value || 1);

    const insertPromise = fetch(`http://localhost:3000/admin-dishes/add-existing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dish_id: dishId,
        serve_date: todayStr,
        max_quantity: max_quantity
      })
    });

    insertPromises.push(insertPromise);
  });

  await Promise.all(insertPromises); // đợi tất cả insert xong

  closeSelectPopup();
  window.location.reload(); // bây giờ reload mới chính xác
}

document.getElementById('existingForm').addEventListener('submit', function (e) {
  e.preventDefault();
  confirmAddSelected();
});

