import React, { createContext, useState, useContext } from 'react';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  // 1. Is the waiter actively taking an order?
  const [isOrderMode, setIsOrderMode] = useState(false);
  
  // 2. What categories should show in the sidebar?
  const [categories, setCategories] = useState([]);
  
  // 3. Which category is currently selected?
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <OrderContext.Provider value={{ 
      isOrderMode, setIsOrderMode, 
      categories, setCategories, 
      selectedCategory, setSelectedCategory 
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrderContext = () => useContext(OrderContext);