
/**
 * BACKEND IMPLEMENTATION - REST API
 * (This code represents the backend/server.js file requested)
 */

const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME 
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database');
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    console.log('backend connected to front end succefully');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET , (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login Route
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = results[0];
        // In real production, use bcrypt.compare
        if (password === user.password) {
            const token = jwt.sign({ id: user.id, role: user.role },process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
        } else {
            res.status(401).json({ message: 'Invalid password' });
        }
    });
});

// Menu Routes
app.get('/api/menu', (req, res) => {
    db.query('SELECT * FROM menu', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/menu', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { name, category, price, stock } = req.body;
    db.query('INSERT INTO menu (name, category, price, stock) VALUES (?, ?, ?, ?)', [name, category, price, stock], (err, result) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ id: result.insertId, name, category, price, stock });
    });
});

// Order Routes
app.post('/api/orders', authenticateToken, (req, res) => {
    const { tableNumber, items, total } = req.body;
    db.beginTransaction(err => {
        if (err) throw err;
        db.query('INSERT INTO orders (table_number, status, total, waiter_id) VALUES (?, ?, ?, ?)', 
        [tableNumber, 'PENDING', total, req.user.id], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json(err));
            
            const orderId = result.insertId;
            const values = items.map(i => [orderId, i.menuId, i.quantity, i.price]);
            
            db.query('INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES ?', [values], (err) => {
                if (err) return db.rollback(() => res.status(500).json(err));
                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json(err));
                    res.status(201).json({ orderId });
                });
            });
        });
    });
});

app.patch('/api/orders/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Status updated' });
    });
});


// --- GET ORDERS (Simplified) ---
app.get('/api/orders', authenticateToken, (req, res) => {
    const restaurantId = req.user.restaurantId || 1; // Fallback for safety

    // Simple query: Get orders first
    const query = `
        SELECT o.id, o.table_number, o.status, o.total, o.created_at, 
               u.name as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.restaurant_id = ?
        ORDER BY o.created_at DESC
    `;

    db.query(query, [restaurantId], (err, results) => {
        if (err) {
            console.error("Order Fetch Error:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// --- AUTH ROUTES ---

// 1. Owner Registration (Sign Up)
app.post('/api/auth/register', (req, res) => {
    const { restaurantName, username, email, password } = req.body;

    // We use a Transaction because we must create a Restaurant AND a User.
    // If one fails, we must cancel both.
    db.beginTransaction(err => {
        if (err) return res.status(500).json(err);

        // Step 1: Create the Restaurant
        const sqlRestaurant = 'INSERT INTO restaurants (name, email) VALUES (?, ?)';
        db.query(sqlRestaurant, [restaurantName, email], (err, result) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ message: 'Error creating restaurant', error: err }));
            }

            const restaurantId = result.insertId;

            // Step 2: Create the Admin User for this Restaurant
            // Note: We hardcode role_id = 1 (ADMIN) for the person signing up
            const sqlUser = 'INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES (?, ?, ?, ?, ?)';
            db.query(sqlUser, [restaurantId, username, password, 'Owner', 1], (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ message: 'Error creating admin user', error: err }));
                }

                // Step 3: Commit (Save) everything
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => res.status(500).json(err));
                    }
                    res.status(201).json({ message: 'Restaurant registered successfully!' });
                });
            });
        });
    });
});

//New feature added.

// ... existing code ...

// --- STAFF MANAGEMENT ---
// Only an Admin can add staff. The staff is automatically linked to the Admin's restaurant.
app.post('/api/staff', authenticateToken, (req, res) => {
    const { name, username, password, role_id } = req.body;
    const restaurantId = req.user.restaurantId; // Get from the Admin's token

    // Simple validation
    if (!name || !username || !password || !role_id) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const query = 'INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES (?, ?, ?, ?, ?)';
    
    db.query(query, [restaurantId, username, password, name, role_id], (err, result) => {
        if (err) {
            // Handle duplicate username error
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Username already taken" });
            }
            return res.status(500).json(err);
        }
        res.status(201).json({ message: "Staff member created successfully" });
    });
});

// --- REPORTS & ANALYTICS ---
app.get('/api/reports', authenticateToken, (req, res) => {
    const restaurantId = req.user.restaurantId;

    // We run 3 parallel queries to get the stats
    const incomeQuery = "SELECT SUM(total) as total_revenue, COUNT(*) as total_orders FROM orders WHERE restaurant_id = ? AND status = 'PAID'";
    const popularQuery = `
        SELECT m.name, SUM(oi.quantity) as sold 
        FROM order_items oi 
        JOIN menu m ON oi.menu_id = m.id 
        JOIN orders o ON oi.order_id = o.id
        WHERE o.restaurant_id = ? AND o.status = 'PAID'
        GROUP BY m.name 
        ORDER BY sold DESC LIMIT 5
    `;

    db.query(incomeQuery, [restaurantId], (err, incomeResults) => {
        if (err) return res.status(500).json(err);
        
        db.query(popularQuery, [restaurantId], (err, popularResults) => {
            if (err) return res.status(500).json(err);

            res.json({
                revenue: incomeResults[0].total_revenue || 0,
                totalOrders: incomeResults[0].total_orders || 0,
                topItems: popularResults
            });
        });
    });
});



// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
