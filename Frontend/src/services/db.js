/**
 * API SERVICE LAYER
 * Handles all communication with the Backend (Port 5000)
 */

const BASE_URL = 'http://localhost:5000/api';


// 1. Create a variable to store the currency "in memory"
let cachedCurrency = null;




// Helper to retrieve the JWT token from Local Storage
const getToken = () => localStorage.getItem('rms_token');

// Helper to get headers with the Token attached
const getHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const db = {
    // --- AUTHENTICATION ---

    // 1. Login (Staff & Admin)
    login: async (username, password) => {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return await response.json(); // Returns { token, user }
    },

    // 2. Owner Registration (New)
    registerOwner: async (data) => {
        // Expected data: { restaurantName, username, email, password }
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return await response.json();
    },

    // 3. Logout
    logout: () => {
        localStorage.removeItem('rms_token');
        localStorage.removeItem('rms_user');
    },

    // --- MENU MANAGEMENT ---

    getMenu: async () => {
        // Fetches menu for the logged-in user's restaurant
        // (Backend handles the filtering based on the Token)
        const response = await fetch(`${BASE_URL}/menu`, {
            headers: getHeaders() // Include token to identify restaurant
        });
        if (!response.ok) throw new Error('Failed to fetch menu');
        return await response.json();
    },

    addMenuItem: async (item) => {
        const response = await fetch(`${BASE_URL}/menu`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to add item');
        return await response.json();
    },

    // --- ORDER MANAGEMENT ---

    getOrders: async () => {
        const response = await fetch(`${BASE_URL}/orders`, {
            headers: getHeaders()
        });
        if (!response.ok) return []; 
        return await response.json();
    },

    saveOrder: async (orderData) => {
        // Expects: { tableNumber: '5', items: [...], total: 50.00 }
        const response = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(orderData),
        });
        if (!response.ok) throw new Error('Failed to place order');
        return await response.json();
    },

    updateOrderStatus: async (orderId, status) => {
        const response = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        return await response.json();
    },

    // --- REPORTING (Calculated on Client for now) ---
    getSalesData: async () => {
        try {
            const response = await fetch(`${BASE_URL}/orders`, { headers: getHeaders() });
            if (!response.ok) return { totalRevenue: 0, totalOrders: 0, recentOrders: [] };
            
            const orders = await response.json();
            const paidOrders = orders.filter(o => o.status === 'PAID');
            
            return {
                totalRevenue: paidOrders.reduce((sum, o) => sum + Number(o.total), 0),
                totalOrders: paidOrders.length,
                recentOrders: paidOrders.slice(-5).reverse()
            };
        } catch (e) {
            console.error(e);
            return { totalRevenue: 0, totalOrders: 0, recentOrders: [] };
        }
    },


    // --- STAFF ---
    addStaff: async (staffData) => {
        const response = await fetch(`${BASE_URL}/staff`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(staffData),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to add staff');
        }
        return await response.json();
    },

    // 2. The Smart Get Currency Function
    getCurrency: async () => {
        // CHECK: Do we already know the currency?
        if (cachedCurrency) {
            console.log("Using cached currency (No Server Call needed!)");
            return cachedCurrency; 
        }

        // IF NOT: We have to ask the server (only happens the very first time)
        try {
            // Assume you have a helper or use fetch directly
            const response = await fetch(`${BASE_URL}/settings/currency`, {
                headers: getHeaders()
            });
            const data = await response.json();
            
            // SAVE IT: Remember the result for next time
            cachedCurrency = data.currency; 
            
            return data.currency;
        } catch (e) {
            console.error("Failed to fetch currency", e);
            return '$'; // Fallback if server is down
        }
    },

    // Inside services/db.js

updateCurrency: async (symbol) => {
    // 1. Call the backend to save it permanently
    const response = await fetch(`${BASE_URL}/settings/currency`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure headers are included
        },
        body: JSON.stringify({ symbol: symbol }) // Send as JSON object
    
    });

    if (!response.ok) {
        throw new Error("Failed to update currency");

    }
    console.log("currency stored in the db");


    // 2. Update the local cache immediately (so the UI updates without reload)
    cachedCurrency = symbol; 
    
    return await response.json();
},


// 1. CANCEL ORDER
  cancelOrder: async (orderId) => {
    try {
      const response = await fetch('http://localhost:5000/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to cancel');
      return data;
    } catch (error) {
      console.error("DB Service Error:", error);
      throw error; // Re-throw so component can show alert
    }
  },

  // 2. UPDATE ORDER (Add Items)
  updateOrder: async (updateData) => {
    // updateData = { orderId: 123, items: [{menuId: 1, quantity: 2}] }
    try {
      const response = await fetch('http://localhost:5000/api/orders/add-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order');
      return data;
    } catch (error) {
      console.error("DB Service Error:", error);
      throw error;
    }
  },

    // --- REPORTS ---
    getReports: async () => {
        const response = await fetch(`${BASE_URL}/reports`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch reports');
        return await response.json();
    }
};








    
