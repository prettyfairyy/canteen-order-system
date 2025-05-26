-- Bảng sinh viên
CREATE TABLE students (
    student_id VARCHAR(10) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL
);

-- B?ng món an
CREATE TABLE dishes (
    dish_id INT PRIMARY KEY IDENTITY(1001,1),
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(10, 2) NOT NULL,
    image_url NVARCHAR(255),
    serve_date DATE NOT NULL,
    max_quantity INT NOT NULL DEFAULT 0
);

-- B?ng don hàng
CREATE TABLE orders (
    order_id INT PRIMARY KEY IDENTITY(5001,1),
    student_id VARCHAR(10) NOT NULL,
    order_date DATE NOT NULL,
    CONSTRAINT fk_orders_student FOREIGN KEY (student_id)
        REFERENCES students(student_id)
);

-- B?ng chi ti?t don hàng
CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY IDENTITY(8001,1),
    order_id INT NOT NULL,
    dish_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    CONSTRAINT fk_items_order FOREIGN KEY (order_id)
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_items_dish FOREIGN KEY (dish_id)
        REFERENCES dishes(dish_id)
);

INSERT INTO students (student_id, full_name, password_hash)
VALUES
('21520001', 'Nguy?n An', '123456'),
('22520112', 'Tr?n Th? Bình', '123456'),
('23520213', 'Lê Minh Chi', '123456'),
('24520345', 'Ph?m Dung', '123456'),
('21520456', 'Võ M? Hà', '123456'),
('22520567', 'Ð? H?u Giang', '123456'),
('23520678', 'Hu?nh Tu?n Huy', '123456'),
('24520789', 'Bùi Khánh', '123456'),
('21520890', 'Phan Ng?c Linh', '123456'),
('22520999', 'Lý M? Trân', '123456');

INSERT INTO dishes (name, price, image_url, serve_date, max_quantity) VALUES
('Bánh mì th?t', 20000, '/uploads/images/banhmi.jpg', '2025-05-23', 20),
('Bún th?t nu?ng', 28000, '/uploads/images/bunthitnuong.jpg', '2025-05-23', 15),
('Hamburger mini', 22000, '/uploads/images/hambugur.jpg', '2025-05-23', 10),
('Bánh cu?n', 25000, '/uploads/images/banhcuon.jpg', '2025-05-23', 18),
('Bò né', 30000, '/uploads/images/bone.jpg', '2025-05-23', 12),
('Bánh mì bò kho', 27000, '/uploads/images/banhmibokho.jpg', '2025-05-23', 15),
('Com gà', 26000, '/uploads/images/comga.jpg', '2025-05-23', 20),
('Bún bò kho', 28000, '/uploads/images/bunbokho.jpg', '2025-05-23', 14),
('Mì Qu?ng', 25000, '/uploads/images/miquang.jpg', '2025-05-23', 16);

SET IDENTITY_INSERT orders ON;

INSERT INTO orders (order_id, student_id, order_date)
VALUES
(5001, '21520001', '2025-05-23'),
(5002, '22520112', '2025-05-23'),
(5003, '23520213', '2025-05-23');

SET IDENTITY_INSERT orders OFF;

SET IDENTITY_INSERT order_items ON;

INSERT INTO order_items (order_item_id, order_id, dish_id, quantity)
VALUES
(8001, 5001, 1001, 1),
(8002, 5001, 1005, 1),
(8003, 5002, 1002, 2),
(8004, 5003, 1004, 1),
(8005, 5003, 1009, 1);

SET IDENTITY_INSERT order_items OFF;

