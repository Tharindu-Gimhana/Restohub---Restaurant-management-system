-- GourmetOS Multi-Tenant Database Schema
-- Optimized for Single-Login / Multi-Tenant Workflow

DROP DATABASE IF EXISTS restaurant_db;
CREATE DATABASE restaurant_db;
USE restaurant_db;

-- =============================================
-- 1. TABLE DEFINITIONS
-- =============================================

-- 1. Restaurants Table (The Tenants)
-- Created when an Owner registers on the "Sign Up" page.
CREATE TABLE restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100), -- Owner's contact email (optional, for recovery)
    address VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
-- Standard roles for the system.
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE -- 'ADMIN', 'WAITER', 'KITCHEN', 'CASHIER'
);

-- 3. Users Table
-- Stores BOTH Owners (Admins) and Staff.
-- 'username' must be unique globally so we can identify the user at login without asking for restaurant name.
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL, -- Display Name (e.g. "Nimal Perera")
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. Menu Table
-- Items are specific to one restaurant.
CREATE TABLE menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Main', 'Starter', 'Dessert', 'Beverage'
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 5. Orders Table
-- Tracks orders for a specific restaurant.
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    table_number VARCHAR(10) NOT NULL,
    status ENUM('PENDING', 'COOKING', 'READY', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
    total DECIMAL(10, 2) NOT NULL,
    items TEXT,
    waiter_id INT, -- The staff member who placed the order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Order Items Table
-- Links menu items to orders.
-- Create Order Items Table
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_id`) REFERENCES `menu`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Inventory Table (Optional)
CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(20),
    min_threshold INT DEFAULT 5,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);


-- =============================================
-- 2. INITIAL SETUP & SAMPLE DATA
-- =============================================

-- Step A: Define the Standard Roles (DO NOT CHANGE)
INSERT INTO roles (role_name) VALUES 
('ADMIN'), 
('WAITER'), 
('KITCHEN'), 
('CASHIER');

-- Step B: Simulate "Owner Registration" (Phase 1)
-- 1. Create the Restaurant
INSERT INTO restaurants (name, email, address) VALUES 
('Colombo Crab House', 'owner@crabhouse.lk', '55 Marine Drive, Colombo');

-- 2. Create the Owner/Admin User (Linked to Restaurant ID 1)
-- Note: In your real app, the password should be hashed (e.g., using bcrypt)
INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES 
(1, 'crab_admin', 'admin123', 'Owner Kamal', 1); -- Role 1 = ADMIN

-- Step C: Simulate "Adding Staff" (Phase 2)
-- These are created by the Admin above. They are linked to Restaurant ID 1.
INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES 
(1, 'crab_waiter1', 'waiter123', 'Sunil Waiter', 2),    -- Role 2 = WAITER
(1, 'crab_chef1', 'chef123', 'Chef Nimal', 3),          -- Role 3 = KITCHEN
(1, 'crab_cashier1', 'cashier123', 'Mala Cashier', 4);  -- Role 4 = CASHIER

-- Step D: Simulate Menu Creation
INSERT INTO menu (restaurant_id, name, category, price, stock) VALUES 
(1, 'Lagoon Crab Curry', 'Main', 2500.00, 15),
(1, 'Garlic Roast Bread', 'Starter', 450.00, 50),
(1, 'Lime Juice', 'Beverage', 300.00, 100),
(1, 'Watalappan', 'Dessert', 500.00, 20);

-- Step E: Simulate a Second Restaurant (To prove data isolation)
INSERT INTO restaurants (name) VALUES ('Pizza Hut');
INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES 
(2, 'pizza_admin', 'admin123', 'Pizza Manager', 1);
INSERT INTO menu (restaurant_id, name, category, price, stock) VALUES 
(2, 'Chicken Pizza', 'Main', 1800.00, 50);

-- Note: When 'crab_waiter1' logs in, they will ONLY see 'Lagoon Crab Curry', not 'Chicken Pizza'.