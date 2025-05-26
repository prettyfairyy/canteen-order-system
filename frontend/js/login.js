document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const student_id = document.getElementById('student_id').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password })
    });

    const data = await res.json();

    if (res.ok) {
      // Lưu student_id vào localStorage
      localStorage.setItem('student_id', data.student_id);
      window.location.href = 'menu.html'; // chuyển sang trang menu
    } else {
      document.getElementById('message').textContent = data.message || 'Đăng nhập thất bại';
    }

  } catch (err) {
    document.getElementById('message').textContent = 'Lỗi kết nối đến server.';
  }
});
