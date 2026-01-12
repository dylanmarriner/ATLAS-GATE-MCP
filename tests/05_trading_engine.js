/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: JavaScript memory management simulation
 * PURPOSE: High-performance trading engine with order matching and portfolio management
 * FAILURE MODES: Negative prices throw error, zero quantities throw error, no orders throws calculation error
 *
 * Authority: 05-cpp-memory.md
 */

// Plan 05: High-Performance Trading Engine (C++ patterns in JavaScript)
class OrderBook {
  constructor(symbol) {
    this.symbol = symbol;
    this.bidOrders = [];
    this.askOrders = [];
    this.tradeHistory = [];
    this.lastUpdate = new Date();
  }
  
  addBidOrder(price, quantity, orderid) {
    if (price <= 0 || quantity <= 0) {
      throw new Error('Price and quantity must be positive');
    }
    
    this.bidOrders.push({
      orderid,
      price,
      quantity,
      timestamp: new Date()
    });
    
    this.bidOrders.sort((a, b) => b.price - a.price);
    this.lastUpdate = new Date();
  }
  
  addAskOrder(price, quantity, orderid) {
    if (price <= 0 || quantity <= 0) {
      throw new Error('Price and quantity must be positive');
    }
    
    this.askOrders.push({
      orderid,
      price,
      quantity,
      timestamp: new Date()
    });
    
    this.askOrders.sort((a, b) => a.price - b.price);
    this.lastUpdate = new Date();
  }
  
  matchOrders() {
    const trades = [];
    
    while (this.bidOrders.length > 0 && this.askOrders.length > 0) {
      const bestBid = this.bidOrders[0];
      const bestAsk = this.askOrders[0];
      
      if (bestBid.price < bestAsk.price) {
        break;
      }
      
      const tradeQty = Math.min(bestBid.quantity, bestAsk.quantity);
      const tradePrice = bestAsk.price;
      
      trades.push({
        bidOrderId: bestBid.orderid,
        askOrderId: bestAsk.orderid,
        price: tradePrice,
        quantity: tradeQty,
        timestamp: new Date(),
        value: tradePrice * tradeQty
      });
      
      bestBid.quantity -= tradeQty;
      bestAsk.quantity -= tradeQty;
      
      if (bestBid.quantity === 0) {
        this.bidOrders.shift();
      }
      
      if (bestAsk.quantity === 0) {
        this.askOrders.shift();
      }
      
      this.tradeHistory.push(trades[trades.length - 1]);
    }
    
    return trades;
  }
  
  getSpread() {
    if (this.bidOrders.length === 0 || this.askOrders.length === 0) {
      throw new Error('No orders to calculate spread');
    }
    
    return this.askOrders[0].price - this.bidOrders[0].price;
  }
  
  getMidPrice() {
    if (this.bidOrders.length === 0 || this.askOrders.length === 0) {
      throw new Error('No orders for price calculation');
    }
    
    return (this.bidOrders[0].price + this.askOrders[0].price) / 2;
  }
}

class Portfolio {
  constructor(portfolioId) {
    this.portfolioId = portfolioId;
    this.positions = new Map();
    this.cash = 1000000;
    this.trades = [];
  }
  
  addPosition(symbol, quantity, entryPrice) {
    if (quantity <= 0 || entryPrice <= 0) {
      throw new Error('Invalid position parameters');
    }
    
    if (this.positions.has(symbol)) {
      const existing = this.positions.get(symbol);
      existing.quantity += quantity;
      existing.totalCost += quantity * entryPrice;
    } else {
      this.positions.set(symbol, {
        symbol,
        quantity,
        totalCost: quantity * entryPrice,
        avgPrice: entryPrice
      });
    }
    
    this.cash -= quantity * entryPrice;
  }
  
  getExposure() {
    let exposure = 0;
    for (const position of this.positions.values()) {
      exposure += position.quantity * position.avgPrice;
    }
    return exposure;
  }
  
  getPosition(symbol) {
    return this.positions.get(symbol);
  }
}

const orderBook = new OrderBook('AAPL');
orderBook.addBidOrder(150.25, 1000, 'BID001');
orderBook.addBidOrder(150.20, 2000, 'BID002');
orderBook.addAskOrder(150.30, 1500, 'ASK001');
orderBook.addAskOrder(150.35, 2000, 'ASK002');

const trades = orderBook.matchOrders();

const portfolio = new Portfolio('PORT001');
portfolio.addPosition('AAPL', 100, 150.25);
portfolio.addPosition('MSFT', 200, 380.50);

module.exports = { OrderBook, Portfolio, orderBook, portfolio };
