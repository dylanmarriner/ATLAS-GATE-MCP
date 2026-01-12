/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: ES6 module pattern
 * PURPOSE: Type-safe shopping cart implementation for e-commerce
 * FAILURE MODES: Out of stock products throw error, insufficient inventory throws error, missing items throw error
 *
 * Authority: 02-typescript-types.md
 */

// Plan 02: E-commerce Shopping Cart Implementation
class Product {
  constructor(productId, name, price, stock, category) {
    this.productId = productId;
    this.name = name;
    this.price = parseFloat(price);
    this.stock = stock;
    this.category = category;
  }
  
  isInStock() {
    return this.stock > 0;
  }
  
  decreaseStock(quantity) {
    if (quantity > this.stock) {
      throw new Error('Insufficient stock available');
    }
    this.stock -= quantity;
  }
}

class CartItem {
  constructor(product, quantity) {
    this.product = product;
    this.quantity = quantity;
    this.addedAt = new Date();
  }
  
  getLineTotal() {
    return this.product.price * this.quantity;
  }
}

class ShoppingCart {
  constructor(cartId) {
    this.cartId = cartId;
    this.items = [];
    this.createdAt = new Date();
    this.lastModified = new Date();
  }
  
  addItem(product, quantity) {
    if (!product.isInStock()) {
      throw new Error('Product is out of stock');
    }
    
    const existingItem = this.items.find(item => item.product.productId === product.productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push(new CartItem(product, quantity));
    }
    
    this.lastModified = new Date();
  }
  
  removeItem(productId) {
    const index = this.items.findIndex(item => item.product.productId === productId);
    if (index === -1) {
      throw new Error('Item not found in cart');
    }
    this.items.splice(index, 1);
    this.lastModified = new Date();
  }
  
  getCartTotal() {
    return this.items.reduce((total, item) => total + item.getLineTotal(), 0);
  }
  
  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }
}

const product1 = new Product('P001', 'Laptop', 1299.99, 5, 'Electronics');
const product2 = new Product('P002', 'USB Cable', 19.99, 50, 'Accessories');
const product3 = new Product('P003', 'Monitor', 399.99, 3, 'Electronics');

const cart = new ShoppingCart('CART-12345');
cart.addItem(product1, 1);
cart.addItem(product2, 2);
cart.addItem(product3, 1);

module.exports = { Product, CartItem, ShoppingCart, cart };
