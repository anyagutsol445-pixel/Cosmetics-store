CREATE DATABASE IF NOT EXISTS cosmetics_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cosmetics_shop;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(30),
    role          ENUM('user','manager','admin') DEFAULT 'user',
    saved_address TEXT,
    saved_phone   VARCHAR(30),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(300) NOT NULL,
    description      TEXT,
    price            DECIMAL(10,2) NOT NULL,
    discount_price   DECIMAL(10,2),
    discount_expiry  DATETIME,
    stock_quantity   INT DEFAULT 0,
    image_url        VARCHAR(500),
    category         VARCHAR(100),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_attrs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    attr_name  VARCHAR(100) NOT NULL,
    attr_value VARCHAR(200) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attr_options (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    attr_name  VARCHAR(100) NOT NULL,
    attr_value VARCHAR(200) NOT NULL,
    UNIQUE KEY uniq_opt (attr_name, attr_value)
);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id    INT,
    user_name  VARCHAR(200),
    rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Product Questions (Q&A) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_questions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id    INT,
    user_name  VARCHAR(200),
    question   TEXT NOT NULL,
    answer     TEXT,
    answered_by VARCHAR(200),
    answered_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(30)  NOT NULL,
    address         TEXT,
    total_price     DECIMAL(10,2) NOT NULL,
    delivery_method VARCHAR(50) DEFAULT 'Nova Poshta',
    payment_method  VARCHAR(50) DEFAULT 'cash_on_delivery',
    status          ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    order_id          INT NOT NULL,
    product_id        INT NOT NULL,
    quantity          INT NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ── Support ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    user_name  VARCHAR(200),
    user_email VARCHAR(200),
    subject    VARCHAR(400) NOT NULL,
    status     ENUM('open','answered','closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id   INT NOT NULL,
    sender_id   INT,
    sender_name VARCHAR(200),
    sender_role VARCHAR(50) DEFAULT 'user',
    body        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- ── Wishlist ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_wish (user_id, product_id)
);

-- ── Compare ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compare_list (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    product_id INT NOT NULL,
    added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_cmp (session_id, product_id)
);

-- ── Promo Codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(50) NOT NULL UNIQUE,
    discount_percent TINYINT NOT NULL,
    max_uses         INT,
    uses_count       INT DEFAULT 0,
    expires_at       DATETIME,
    is_active        TINYINT DEFAULT 1,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Тестові дані ─────────────────────────────────────────────
-- Демо промокод
INSERT IGNORE INTO promo_codes (code, discount_percent, max_uses) VALUES ('WELCOME10', 10, 100);

-- Демо товари (якщо порожньо)
INSERT INTO products (title, description, price, stock_quantity, category)
SELECT 'Парфум Rose Elixir', 'Ніжний квітковий аромат із нотками троянди та мускусу', 1290, 15, 'perfume'
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT INTO products (title, description, price, discount_price, discount_expiry, stock_quantity, category)
SELECT 'Крем для обличчя Hydra Boost', 'Інтенсивне зволоження на 24 години', 890, 690, DATE_ADD(NOW(), INTERVAL 30 DAY), 8, 'cream'
WHERE (SELECT COUNT(*) FROM products) < 2;

INSERT INTO products (title, description, price, stock_quantity, category)
SELECT 'Сироватка Vitamin C Glow', 'Вирівнює тон шкіри та надає сяяння', 1150, 0, 'skincare'
WHERE (SELECT COUNT(*) FROM products) < 3;

SELECT '✓ БД ініціалізовано успішно!' AS result;

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    type       VARCHAR(50) DEFAULT 'order',
    message    TEXT NOT NULL,
    order_id   INT,
    is_read    TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Add tracking_number and delivered status ───────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) DEFAULT NULL;

-- Fix status ENUM to include 'delivered'  
ALTER TABLE orders MODIFY COLUMN status ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending';
