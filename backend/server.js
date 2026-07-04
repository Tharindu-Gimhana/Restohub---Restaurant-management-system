require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// --- MIDDLEWARE ---
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
    origin: corsOrigin.split(',').map(origin => origin.trim()),
    credentials: true
}));
app.use(express.json());

// --- CONFIGURATION ---
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key'; // Safety fallback
const PORT = process.env.PORT || 5000;

// --- DATABASE CONNECTION ---
// Use a pool so dropped/idle connections are replaced automatically.
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Add your DB password if you have one
    database: process.env.DB_NAME || 'restaurant_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL Database');
    connection.release();
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

const itemStatusPriority = {
    READY: 0,
    SERVED: 1,
    PENDING: 2
};



const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// 1. Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: corsOrigin.split(',').map(origin => origin.trim()),
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

    db.getConnection((connectionErr, connection) => {
        if (connectionErr) return res.status(500).json(connectionErr);

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json(err);
            }

            // Create Restaurant
            connection.query('INSERT INTO restaurants (name, email) VALUES (?, ?)',
            [restaurantName, email], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json(err);
                    });
                }

                const restaurantId = result.insertId;

                // Create Admin User (Role ID 1 = ADMIN)
                connection.query('INSERT INTO users (restaurant_id, username, password, name, role_id) VALUES (?, ?, ?, ?, ?)',
                [restaurantId, username, password, 'Owner', 1], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json(err);
                        });
                    }

                    connection.commit(err => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json(err);
                            });
                        }

                        connection.release();
                        res.status(201).json({ message: 'Restaurant Registered!' });
                    });
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

    // 1. UPDATED SQL: Grab item-level status so the UI can show progress without reordering cards
    const query = `
         SELECT o.id, o.table_number, o.status, o.total, o.created_at AS order_created, 
               COALESCE(NULLIF(u.name, ''), NULLIF(u.username, ''), CONCAT('ID #', o.waiter_id), 'N/A') AS waiter_name,
             m.name as menu_name, m.price AS item_price,
             oi.id AS item_id, oi.quantity, oi.menu_id, oi.status AS item_status,
               oi.created_at AS item_created, oi.updated_at AS item_updated
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        LEFT JOIN menu m ON oi.menu_id = m.id
         LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.restaurant_id = ?
        ORDER BY o.created_at ASC, oi.created_at ASC
    `;

    db.query(query, [restaurantId], (err, results) => {
        if (err) {
            console.error("Database error fetching orders:", err);
            return res.status(500).json({ error: "Database error" });
        }

        // 2. GROUPING LOGIC: Combine the flat SQL rows into structured JSON
        const ordersMap = {};

        results.forEach(row => {
            // If we haven't seen this order yet, create its envelope
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    id: row.id,
                    table_number: row.table_number,
                    status: row.status,
                    total: row.total,
                    waiter_name: row.waiter_name || 'N/A',
                    created_at: row.order_created, // The Main Order Time
                    items: []
                };
            }

            // If this row has an item, push it into the items array
            if (row.menu_id) {
                ordersMap[row.id].items.push({
                    id: row.item_id,
                    menuId: row.menu_id,
                    name: row.menu_name,
                    quantity: row.quantity,
                    price: row.item_price,
                    subtotal: Number(row.item_price || 0) * Number(row.quantity || 0),
                    status: row.item_status || 'PENDING',
                    created_at: row.item_created, // THE MISSING PIECE: The Item Time!
                    updated_at: row.item_updated || row.item_created
                });
            }
        });

        const structuredOrders = Object.values(ordersMap).map(order => ({
            ...order,
            items: order.items.sort((a, b) => {
                const statusDiff = (itemStatusPriority[a.status] ?? 99) - (itemStatusPriority[b.status] ?? 99);
                if (statusDiff !== 0) return statusDiff;

                const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                return timeB - timeA;
            })
        }));

        // Convert the map object back into an array to send to the frontend
        res.json(structuredOrders);
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

    // 2. Start a transaction on a dedicated pooled connection.
    db.getConnection((connectionErr, connection) => {
        if (connectionErr) {
            return res.status(500).json({ message: "Transaction Error", error: connectionErr });
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({ message: "Transaction Error", error: err });
            }

            // 3. Insert into ORDERS table 
            // We KEEP the 'items' column with JSON string so your Waiter App doesn't break!
            const itemsString = JSON.stringify(items);
            const status = 'PENDING';

            const sqlOrder = `
                INSERT INTO orders 
                (restaurant_id, waiter_id, table_number, items, total, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;

            connection.query(sqlOrder, [restaurantId, waiterId, tableNumber, itemsString, total, status], (err, result) => {
                if (err) {
                    // If this fails, undo everything
                    return connection.rollback(() => {
                        connection.release();
                        console.error("Error inserting order:", err);
                        res.status(500).json({ message: "Database error", error: err.message });
                    });
                }

                const newOrderId = result.insertId;

                // 4. NEW STEP: Insert into ORDER_ITEMS table (For Kitchen)
                if (!items || items.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
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

                connection.query(sqlItems, [orderItemsValues], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error("Error inserting order items:", err);
                            res.status(500).json({ message: "Failed to save order items detail", error: err.message });
                        });
                    }

                    // 5. Commit (Save everything permanently)
                    connection.commit(err => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ message: "Commit failed" });
                            });
                        }

                        connection.release();

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

    const orderStatusQuery = 'SELECT status FROM orders WHERE id = ?';

    db.query(orderStatusQuery, [orderId], (statusErr, statusResults) => {
        if (statusErr) {
            console.error(statusErr);
            return res.status(500).json({ message: "Database error checking order status" });
        }

        if (statusResults.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentOrderStatus = String(statusResults[0].status || '').toUpperCase();
        if (['BILLING', 'PAID', 'CANCELLED'].includes(currentOrderStatus)) {
            return res.status(403).json({ message: 'Cannot add items after checkout has started' });
        }

        // Prepare data for Bulk Insert
        const values = items.map(item => [orderId, item.menuId, item.quantity, 'PENDING']);
        const insertQuery = 'INSERT INTO order_items (order_id, menu_id, quantity, status) VALUES ?';

        // QUERY 1: Insert the new foods into order_items
        db.query(insertQuery, [values], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error inserting items" });
        }

        // QUERY 2: Update the total price in the orders table
        // We use "total = total + ?" to safely add the new amount to whatever the current bill is
        const updateQuery = 'UPDATE orders SET total = total + ?, status = ? WHERE id = ?';
        const nextStatus = currentOrderStatus === 'READY' ? 'COOKING' : currentOrderStatus;
        
        db.query(updateQuery, [addedTotal, nextStatus, orderId], (err) => {
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
});


// 3B. UPDATE ORDER ITEM STATUS (Kitchen / Waiter Action)
app.patch('/api/orders/:id/items/status', (req, res) => {
    const orderId = req.params.id;
    const { itemIds, status } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0 || !status) {
        return res.status(400).json({ message: 'Item IDs and status are required' });
    }

    const normalizedStatus = String(status).toUpperCase();
    if (!['READY', 'SERVED'].includes(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid item status' });
    }

    const ids = [...new Set(itemIds.map(itemId => parseInt(itemId, 10)).filter(Number.isInteger))];
    if (ids.length === 0) {
        return res.status(400).json({ message: 'Valid item IDs are required' });
    }

    const placeholders = ids.map(() => '?').join(', ');
    const updateQuery = `UPDATE order_items SET status = ? WHERE order_id = ? AND id IN (${placeholders})`;

    db.query(updateQuery, [normalizedStatus, orderId, ...ids], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to update order items' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching order items found' });
        }

        if (normalizedStatus !== 'READY') {
            if (typeof io !== 'undefined') {
                io.emit('order_items_updated', { orderId: parseInt(orderId, 10) });
            } else {
                req.app.get('socketio').emit('order_items_updated', { orderId: parseInt(orderId, 10) });
            }

            return res.json({ success: true, message: 'Order items updated successfully' });
        }

        const pendingQuery = 'SELECT COUNT(*) AS pendingCount FROM order_items WHERE order_id = ? AND status = "PENDING"';
        db.query(pendingQuery, [orderId], (pendingErr, pendingResults) => {
            if (pendingErr) {
                console.error(pendingErr);
                return res.status(500).json({ message: 'Failed to verify item readiness' });
            }

            const pendingCount = pendingResults?.[0]?.pendingCount || 0;
            const nextOrderStatus = pendingCount === 0 ? 'READY' : 'COOKING';

            db.query('UPDATE orders SET status = ? WHERE id = ?', [nextOrderStatus, orderId], (orderErr) => {
                if (orderErr) {
                    console.error(orderErr);
                    return res.status(500).json({ message: 'Failed to sync order status' });
                }

                if (typeof io !== 'undefined') {
                    io.emit('order_items_updated', { orderId: parseInt(orderId, 10), status: nextOrderStatus });
                } else {
                    req.app.get('socketio').emit('order_items_updated', { orderId: parseInt(orderId, 10), status: nextOrderStatus });
                }

                return res.json({
                    success: true,
                    message: 'Order items updated successfully',
                    orderStatus: nextOrderStatus
                });
            });
        });
    });
});



// 4. UPDATE ORDER STATUS (Kitchen / Cashier Action)
app.patch('/api/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const normalizedStatus = String(req.body.status || '').toUpperCase();

    if (!normalizedStatus) {
        return res.status(400).json({ message: 'Status is required' });
    }

    const updateStatus = (finalStatus) => {
        db.query('UPDATE orders SET status = ? WHERE id = ?', [finalStatus, orderId], (err, result) => {
            if (err) {
                console.error('Error updating status:', err);
                return res.status(500).json({ message: 'Database Error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }

            if (typeof io !== 'undefined') {
                io.emit('order_status_updated', { orderId: parseInt(orderId, 10), status: finalStatus });
            } else {
                req.app.get('socketio').emit('order_status_updated', { orderId: parseInt(orderId, 10), status: finalStatus });
            }

            return res.json({ success: true, message: `Order status updated to ${finalStatus}` });
        });
    };

    if (normalizedStatus === 'PAID') {
        db.query('SELECT status FROM orders WHERE id = ?', [orderId], (billingErr, billingResults) => {
            if (billingErr) {
                console.error('Error checking order state:', billingErr);
                return res.status(500).json({ message: 'Database Error' });
            }

            if (billingResults.length === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const currentStatus = String(billingResults[0].status || 'PENDING').trim().toUpperCase() || 'PENDING';
            if (!['PENDING', 'BILLING', 'UNPAID'].includes(currentStatus)) {
                return res.status(403).json({ message: `Order must be UNPAID before payment. Current status: ${currentStatus}` });
            }

            db.query('SELECT COUNT(*) AS remainingCount FROM order_items WHERE order_id = ? AND status != "SERVED"', [orderId], (remainingErr, remainingResults) => {
                if (remainingErr) {
                    console.error('Error checking served items:', remainingErr);
                    return res.status(500).json({ message: 'Database Error' });
                }

                const remainingCount = remainingResults?.[0]?.remainingCount || 0;
                if (remainingCount > 0) {
                    return res.status(400).json({ message: 'All items must be served before checkout' });
                }

                updateStatus('PAID');
            });
        });

        return;
    }

    updateStatus(normalizedStatus);
});


// --- START SERVER ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
});