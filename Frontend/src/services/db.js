import { UserRole, OrderStatus } from '../types';

const INITIAL_MENU = [
  { id: 1, name: 'Margherita Pizza', category: 'Main', price: 12.99, stock: 50 },
  { id: 2, name: 'Truffle Pasta', category: 'Main', price: 18.50, stock: 30 },
  { id: 3, name: 'Caesar Salad', category: 'Starter', price: 9.99, stock: 40 },
  { id: 4, name: 'Chocolate Lava Cake', category: 'Dessert', price: 7.50, stock: 20 },
  { id: 5, name: 'Iced Latte', category: 'Beverage', price: 4.50, stock: 100 },
];

const INITIAL_USERS = [
  { id: 1, username: 'admin', role: UserRole.ADMIN, name: 'Alex Manager' },
  { id: 2, username: 'waiter1', role: UserRole.WAITER, name: 'Sam Waiter' },
  { id: 3, username: 'chef1', role: UserRole.KITCHEN, name: 'Chef Gordon' },
  { id: 4, username: 'cashier1', role: UserRole.CASHIER, name: 'Janice Cashier' },
];

class Database {
  getStorage(key, defaultValue) {
    const data = localStorage.getItem(`rms_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  setStorage(key, value) {
    localStorage.setItem(`rms_${key}`, JSON.stringify(value));
  }

  getUsers() { 
    return INITIAL_USERS; 
  }

  getMenu() {
    return this.getStorage('menu', INITIAL_MENU);
  }

  updateMenu(items) {
    this.setStorage('menu', items);
  }

  getOrders() {
    return this.getStorage('orders', []);
  }

  saveOrder(order) {
    const orders = this.getOrders();
    orders.push(order);
    this.setStorage('orders', orders);
  }

  updateOrderStatus(orderId, status) {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      
      // Inventory deduction logic if paid
      if (status === OrderStatus.PAID) {
        const menu = this.getMenu();
        orders[index].items.forEach(item => {
          const menuItem = menu.find(m => m.id === item.menuId);
          if (menuItem) menuItem.stock -= item.quantity;
        });
        this.updateMenu(menu);
      }
      
      this.setStorage('orders', orders);
    }
  }

  getSalesData() {
    const orders = this.getOrders().filter(o => o.status === OrderStatus.PAID);
    return {
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: orders.length,
      recentOrders: orders.slice(-5).reverse()
    };
  }
}

export const db = new Database();