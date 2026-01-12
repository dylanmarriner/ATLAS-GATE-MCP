/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: CommonJS module export
 * PURPOSE: String manipulation and template literals for user formatting
 * FAILURE MODES: Invalid email throws error, short passwords throw error, missing name parameters throw error
 *
 * Authority: 01-javascript-strings.md
 */

// Plan 01: JavaScript Full-Stack User Authentication - String Operations
// Basic string manipulation and template literals

const stringUtils = {
  formatEmail(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }
    return email.toLowerCase().trim();
  },
  
  generateToken(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },
  
  formatPassword(password) {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    return password;
  },
  
  createUserGreeting(firstName, lastName) {
    const greeting = `Welcome ${firstName} ${lastName}! Your account has been created.`;
    return greeting;
  }
};

const users = [
  { email: 'alice@company.com', firstName: 'Alice', lastName: 'Johnson' },
  { email: 'bob@company.com', firstName: 'Bob', lastName: 'Smith' }
];

const formattedUsers = users.map(user => ({
  email: stringUtils.formatEmail(user.email),
  greeting: stringUtils.createUserGreeting(user.firstName, user.lastName),
  token: stringUtils.generateToken(32)
}));

module.exports = { stringUtils, users, formattedUsers };
