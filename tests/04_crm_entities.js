/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: Object-oriented inheritance pattern
 * PURPOSE: CRM account and contact management with opportunity tracking
 * FAILURE MODES: Invalid contact throws error, invalid opportunity throws error, invalid stage throws error
 *
 * Authority: 04-java-objects.md
 */

// Plan 04: Enterprise CRM Account Management
class Account {
  constructor(id, name, industry, website) {
    this.id = id;
    this.name = name;
    this.industry = industry;
    this.website = website;
    this.annualRevenue = 0;
    this.employees = 0;
    this.isActive = true;
    this.createdAt = new Date();
    this.contacts = [];
    this.opportunities = [];
  }
  
  addContact(contact) {
    if (!contact.id || !contact.firstName) {
      throw new Error('Invalid contact');
    }
    this.contacts.push(contact);
  }
  
  addOpportunity(opportunity) {
    if (!opportunity.id || !opportunity.amount) {
      throw new Error('Invalid opportunity');
    }
    this.opportunities.push(opportunity);
  }
  
  getTotalPipelineValue() {
    return this.opportunities.reduce((sum, opp) => sum + opp.amount, 0);
  }
  
  getWeightedForecast() {
    return this.opportunities.reduce((sum, opp) => sum + (opp.amount * opp.probability), 0);
  }
}

class Contact {
  constructor(id, firstName, lastName, email, accountId) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.accountId = accountId;
    this.jobTitle = '';
    this.phone = '';
    this.interactions = [];
    this.createdAt = new Date();
  }
  
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  
  addInteraction(type, description) {
    if (!type || !description) {
      throw new Error('Interaction requires type and description');
    }
    this.interactions.push({
      type,
      description,
      date: new Date()
    });
  }
}

class Opportunity {
  constructor(id, name, accountId, amount) {
    this.id = id;
    this.name = name;
    this.accountId = accountId;
    this.amount = amount;
    this.stage = 'prospecting';
    this.probability = 0.25;
    this.expectedCloseDate = new Date();
    this.activities = [];
  }
  
  updateStage(newStage) {
    const stageMap = {
      'prospecting': 0.25,
      'qualification': 0.4,
      'proposal': 0.6,
      'negotiation': 0.8,
      'closed-won': 1.0,
      'closed-lost': 0.0
    };
    
    if (!stageMap.hasOwnProperty(newStage)) {
      throw new Error('Invalid stage');
    }
    
    this.stage = newStage;
    this.probability = stageMap[newStage];
  }
  
  getWeightedValue() {
    return this.amount * this.probability;
  }
}

const acme = new Account('ACC001', 'ACME Corporation', 'Manufacturing', 'acme.com');
acme.annualRevenue = 100000000;
acme.employees = 10000;

const techCorp = new Account('ACC002', 'TechCorp Industries', 'Technology', 'techcorp.com');
techCorp.annualRevenue = 50000000;
techCorp.employees = 5000;

const contact1 = new Contact('CON001', 'John', 'Smith', 'john@acme.com', 'ACC001');
contact1.jobTitle = 'VP of Operations';
contact1.phone = '5551234567';

const contact2 = new Contact('CON002', 'Sarah', 'Johnson', 'sarah@techcorp.com', 'ACC002');
contact2.jobTitle = 'Director of IT';

acme.addContact(contact1);
techCorp.addContact(contact2);

const opp1 = new Opportunity('OPP001', 'Manufacturing Automation', 'ACC001', 500000);
opp1.updateStage('proposal');

const opp2 = new Opportunity('OPP002', 'Cloud Migration', 'ACC002', 750000);
opp2.updateStage('negotiation');

acme.addOpportunity(opp1);
techCorp.addOpportunity(opp2);

contact1.addInteraction('call', 'Discussed project timeline');
contact2.addInteraction('email', 'Sent proposal');

module.exports = { Account, Contact, Opportunity, acme, techCorp };
