require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key'; // Safety fallback
const PORT = process.env.PORT || 5000;

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Add your DB password if you have one
    database: process.env.DB_NAME || 'restaurant_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL Database');
});

// --- AUTH MIDDLEWARE (Protect Routes) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ==========================================
//                 ROUTES
// ==========================================

// 1. LOGIN (Fixes the 500 Error)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    // We select role_name so the frontend knows who logged in
    const query = `
        SELECT u.*, r.role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.username = ? AND u.password = ?
    `;

    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = results[0];
        
        // Create Token
        const token = jwt.sign(
            { id: user.id, role: user.role_name, restaurantId: user.restaurant_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role_name, // e.g., 'ADMIN'
                restaurant_id: user.restaurant_id
            }
        });
    });
});

// 2. OWNER REGISTRATION
app.post('/api/auth/register', (req, res) => {
    const { restaurantName, username, email, password } = req.body;

    db.beginTransaction(err => {
        if (err) return res.status(500).json(err);

        // Create Restaurant
        db.query('INSERT INTO restaurants (name, email) VALUES (?, ?)', 
        [restaurantName, email], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json(err));

            const restaurantId = result.insertId;

            // Create Admin User (Role ID 1 = ADMIN)
            db.query('INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES (?, ?, ?, ?, ?)',
            [restaurantId, username, password, 'Owner', 1], (err, result) => {
                if (err) return db.rollback(() => res.status(500).json(err));

                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json(err));
                    res.status(201).json({ message: 'Restaurant Registered!' });
                });
            });
        });
    });
});

// 3. GET MENU (Public or Private)
app.get('/api/menu', (req, res) => {
    // If you want to filter by restaurant, you might need to pass a query param or use the token
    // For now, let's assume we fetch all items (or you can add ?restaurant_id=1)
    const sql = 'SELECT * FROM menu';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 4. ADD STAFF (Fixes the Staff Management Page)
app.post('/api/staff', authenticateToken, (req, res) => {
    const { name, username, password, role_id } = req.body;
    const restaurantId = req.user.restaurantId;

    if (!name || !username || !password || !role_id) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const query = 'INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [restaurantId, username, password, name, role_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error creating staff" });
        }
        res.status(201).json({ message: "Staff created" });
    });
});

// 5. GET ORDERS (Compatible with ALL MySQL versions)
app.get('/api/orders', authenticateToken, (req, res) => {
    const restaurantId = req.user.restaurantId;
    
    // Step 1: Get the "Flat" data. 
    // This returns multiple rows for the same order if it has multiple items.
    const query = `
        SELECT o.id, o.table_number, o.status, o.total, o.created_at, 
               m.name as menu_name, oi.quantity
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        LEFT JOIN menu m ON oi.menu_id = m.id
        WHERE o.restaurant_id = ?
        ORDER BY o.created_at DESC
    `;

    db.query(query, [restaurantId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(err);
        }

        // Step 2: Group the data manually in JavaScript
        // We use a Map to merge duplicates into a single order with an 'items' list
        const ordersMap = new Map();

        results.forEach(row => {
            if (!ordersMap.has(row.id)) {
                // If this is the first time we see this Order ID, create the order object
                ordersMap.set(row.id, {
                    id: row.id,
                    table_number: row.table_number,
                    status: row.status,
                    total: row.total,
                    created_at: row.created_at,
                    items: [] // Initialize empty list
                });
            }

            // If this row has a menu item, add it to the list
            if (row.menu_name) {
                ordersMap.get(row.id).items.push({
                    name: row.menu_name,
                    quantity: row.quantity
                });
            }
        });

        // Step 3: Convert the Map back to a clean Array
        const finalOrders = Array.from(ordersMap.values());

        res.json(finalOrders);
    });
});




// 6. REPORTS (Fixes the 404 Error)
app.get('/api/reports', authenticateToken, (req, res) => {
    const restaurantId = req.user.restaurantId;

    // Query 1: Total Revenue & Count
    const incomeQuery = "SELECT SUM(total) as total_revenue, COUNT(*) as total_orders FROM orders WHERE restaurant_id = ? AND status = 'PAID'";
    
    // Query 2: Top Selling Items
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
        if (err) {
            console.error(err);
            return res.status(500).json(err);
        }
        
        db.query(popularQuery, [restaurantId], (err, popularResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            res.json({
                revenue: incomeResults[0].total_revenue || 0,
                totalOrders: incomeResults[0].total_orders || 0,
                topItems: popularResults || []
            });
        });
    });
});



// Note: We added 'authenticateToken' as the second argument here
app.post('/api/orders', authenticateToken, (req, res) => {
    
    // 1. Extract waiterId automatically from the token (secure!)
    const waiterId = req.user.id; 
    // Note: If your token payload calls it 'userId', use req.user.userId instead.

    const { tableNumber, items, total, restaurantId } = req.body;
    const finalRestaurantId = restaurantId || 1; 

    // 2. The SQL remains the same
    const sql = `
        INSERT INTO orders 
        (restaurant_id, waiter_id, table_number, items, total, status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const itemsString = JSON.stringify(items);
    const status = 'pending';

    // 3. Execute
    db.query(sql, [finalRestaurantId, waiterId, tableNumber, itemsString, total, status], (err, result) => {
        if (err) {
            console.error("Error inserting order:", err);
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        res.status(201).json({ 
            message: "Order placed successfully", 
            orderId: result.insertId,
            waiterId: waiterId // Optional: Send back to confirm
        });
    });
});
// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});