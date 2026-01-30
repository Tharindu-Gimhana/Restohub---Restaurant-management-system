
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
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
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

// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
