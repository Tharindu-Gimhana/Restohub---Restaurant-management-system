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



const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// 1. Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Make sure this matches your frontend port
        methods: ["GET", "POST"]
    }
});

// 2. CRITICAL FIX: Attach it to the app!
app.set('socketio', io);  // <--- THIS IS THE MISSING LINE

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
                restaurantId: user.restaurant_id
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
app.get('/api/menu', authenticateToken , (req, res) => {
    // 1. Get the ID directly from the decoded token
    // (Ensure your login code included 'restaurantId' in the token payload!)
    const restaurantId = req.user.restaurantId; 

    // 2. Safety Check (optional but good)
    if (!restaurantId) {
        return res.status(403).json({ error: "Invalid token: No restaurant ID found." });
    }

    // 3. Run the SQL 
    const sql = 'SELECT * FROM menu WHERE restaurant_id = ?';

    db.query(sql, [restaurantId], (err, results) => {
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


// POST /api/menu - Add a new menu item
app.post('/api/menu', authenticateToken, (req, res) => {
    // 1. Get Restaurant ID from the logged-in user's token
    const restaurantId = req.user.restaurantId;

    if (!restaurantId) {
        return res.status(403).json({ message: "No restaurant ID found for this user" });
    }

    // 2. Destructure fields from the form
    const { name, category, price, stock, is_available } = req.body;

    // 3. SQL Query
    const sql = `
        INSERT INTO menu 
        (restaurant_id, name, category, price, stock, is_available) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    // 4. Execute
    db.query(sql, [restaurantId, name, category, price, stock, is_available], (err, result) => {
        if (err) {
            console.error("Error adding menu item:", err);
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        res.status(201).json({ 
            message: "Menu item added successfully", 
            itemId: result.insertId 
        });
    });
});

// GET ORDERS (Corrected for Relational Tables)
app.get('/api/orders', authenticateToken, (req, res) => {
    const restaurantId = req.user.restaurantId;
    console.log("User in Request:", req.user);

    const query = `
        SELECT o.id, o.table_number, o.status, o.total, o.created_at, 
               m.name as menu_name, oi.quantity, oi.menu_id
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        LEFT JOIN menu m ON oi.menu_id = m.id
        WHERE o.restaurant_id = ?
        ORDER BY o.created_at DESC
    `;

    db.query(query, [restaurantId], (err, results) => {
        if (err) {
            console.error("Error fetching orders:", err);
            return res.status(500).json(err);
        }

        // --- THE FIX: GROUPING LOGIC ---
        const ordersMap = {};

        results.forEach(row => {
            // 1. If this order isn't in our map yet, create the main entry
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    id: row.id,
                    table_number: row.table_number,
                    status: row.status,
                    total: row.total,
                    created_at: row.created_at,
                    items: [] // Initialize empty array for items
                };
            }

            // 2. If this row has an item (it's not null from the Left Join), add it
            if (row.menu_name) {
                ordersMap[row.id].items.push({
                    name: row.menu_name,
                    quantity: row.quantity,
                    menuId: row.menu_id
                });
            }
        });

        // 3. Convert the map object back to an array
        const nestedOrders = Object.values(ordersMap);

        // 4. Send the nice, nested structure to React
        res.json(nestedOrders);
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



// POST /api/orders (Hybrid: Saves JSON + Relational Rows)
app.post('/api/orders', authenticateToken, (req, res) => {
    
    // 1. Keep your existing ID extraction logic
    const waiterId = req.user.id; 
    const restaurantId = req.user.restaurantId; 

    if (!restaurantId) {
        return res.status(403).json({ message: "Critical Error: User not linked to a restaurant." });
    }

    const { tableNumber, items, total } = req.body;

    // 2. Start a Transaction (Ensures both saves happen, or neither)
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "Transaction Error", error: err });

        // 3. Insert into ORDERS table 
        // We KEEP the 'items' column with JSON string so your Waiter App doesn't break!
        const itemsString = JSON.stringify(items);
        const status = 'pending';

        const sqlOrder = `
            INSERT INTO orders 
            (restaurant_id, waiter_id, table_number, items, total, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        db.query(sqlOrder, [restaurantId, waiterId, tableNumber, itemsString, total, status], (err, result) => {
            if (err) {
                // If this fails, undo everything
                return db.rollback(() => {
                    console.error("Error inserting order:", err);
                    res.status(500).json({ message: "Database error", error: err.message });
                });
            }

            const newOrderId = result.insertId;

            // 4. NEW STEP: Insert into ORDER_ITEMS table (For Kitchen)
            if (!items || items.length === 0) {
                 return db.rollback(() => {
                    res.status(400).json({ message: "Order must have items" });
                });
            }

            // Map the items to array of arrays: [[orderId, menuId, quantity], ...]
            // We use 'item.menuId' because that's what your React frontend sends
            const orderItemsValues = items.map(item => [
                newOrderId,
                item.menuId, 
                item.quantity
            ]);

            const sqlItems = `INSERT INTO order_items (order_id, menu_id, quantity) VALUES ?`;

            db.query(sqlItems, [orderItemsValues], (err, resultItems) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error inserting order items:", err);
                        res.status(500).json({ message: "Failed to save order items detail", error: err.message });
                    });
                }

                // 5. Commit (Save everything permanently)
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ message: "Commit failed" });
                        });
                    }

                    // Success Response (Matches your original format)
                    res.status(201).json({ 
                        message: "Order placed successfully", 
                        orderId: newOrderId,
                        waiterId: waiterId 
                    });
                });
            });
        });
    });
});


// 2. CANCEL ORDER (Waiter Action)
app.post('/api/orders/cancel', (req, res) => {
    const { orderId } = req.body;

    // Step 1: Check the status first
    const checkQuery = 'SELECT status FROM orders WHERE id = ?';
    
    db.query(checkQuery, [orderId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error during status check" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentStatus = results[0].status;

        // Security Check: Only allow if PENDING
        if (currentStatus !== 'PENDING') {
            return res.status(403).json({ message: "Cannot cancel! Kitchen has already started." });
        }

        // Step 2: Delete the order
        const deleteQuery = 'DELETE FROM orders WHERE id = ?';
        db.query(deleteQuery, [orderId], (err, deleteResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Failed to delete order" });
            }

            // Step 3: Notify Kitchen via Socket
            // (Assumes 'io' is defined in this file, or we get it from app)
            if (typeof io !== 'undefined') {
                io.emit('order_cancelled', { orderId });
            } else {
                // Fallback if io variable isn't global
                req.app.get('socketio').emit('order_cancelled', { orderId });
            }

            res.json({ success: true, message: "Order cancelled successfully" });
        });
    });
});



// 3. ADD ITEMS TO ORDER (Update Existing Order & Total)
app.post('/api/orders/add-items', (req, res) => {
    // We now extract 'addedTotal' from the request body as well
    const { orderId, items, addedTotal } = req.body; 

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "No items provided" });
    }

    // Prepare data for Bulk Insert
    const values = items.map(item => [orderId, item.menuId, item.quantity]);
    const insertQuery = 'INSERT INTO order_items (order_id, menu_id, quantity) VALUES ?';

    // QUERY 1: Insert the new foods into order_items
    db.query(insertQuery, [values], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error inserting items" });
        }

        // QUERY 2: Update the total price in the orders table
        // We use "total = total + ?" to safely add the new amount to whatever the current bill is
        const updateQuery = 'UPDATE orders SET total = total + ? WHERE id = ?';
        
        db.query(updateQuery, [addedTotal, orderId], (err, updateResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Database error updating total" });
            }

            // Both queries succeeded! Notify Kitchen to re-fetch this order
            if (typeof io !== 'undefined') {
                io.emit('order_updated', { orderId });
            } else {
                req.app.get('socketio').emit('order_updated', { orderId });
            }

            res.json({ success: true, message: "Items added and total updated successfully" });
        });
    });
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});