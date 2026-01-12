/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: CommonJS module export
 * PURPOSE: E-commerce product and cart management
 * FAILURE MODES: Insufficient stock throws error, unavailable products throw error, empty cart throws error
 *
 * Authority: 02-typescript-types.md
 */

// E-commerce Shopping Cart Service
class Product {
  constructor(id, name, price, stock, category, description) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.stock = stock;
    this.category = category;
    this.description = description;
  }
  
  isAvailable() {
    return this.stock > 0;
  }
  
  updateStock(quantity) {
    if (quantity > this.stock) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
    return true;
  }
}

class ShoppingCart {
  constructor() {
    this.items = new Map();
  }
  
  addItem(product, quantity) {
    if (!product.isAvailable()) {
      throw new Error('Product not available');
    }
    
    const existingItem = this.items.get(product.id);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.set(product.id, { product, quantity });
    }
  }
  
  removeItem(productId) {
    if (!this.items.has(productId)) {
      throw new Error('Item not in cart');
    }
    this.items.delete(productId);
  }
  
  calculateTotal() {
    let total = 0;
    this.items.forEach(item => {
      total += item.product.price * item.quantity;
    });
    return total;
  }
  
  getItems() {
    return Array.from(this.items.values());
  }
}

class OrderProcessor {
  processOrder(cart) {
    const items = cart.getItems();
    if (items.length === 0) {
      throw new Error('Cart is empty');
    }
    
    const orderId = Math.random().toString(36).substr(2, 9);
    const total = cart.calculateTotal();
    
    items.forEach(item => {
      item.product.updateStock(item.quantity);
    });
    
    return { orderId, total, itemCount: items.length };
  }
}

module.exports = { Product, ShoppingCart, OrderProcessor };
