/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: Ownership-based resource management
 * PURPOSE: Game engine with entity-component architecture
 * FAILURE MODES: Missing components throw error, invalid entities throw error, negative health clamped to zero
 *
 * Authority: 08-rust-ownership.md
 */

// Plan 08: Rust Ownership - Game Server Simulation
class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
    this.isActive = true;
  }
  
  addComponent(componentType, component) {
    if (!component) {
      throw new Error('Component required');
    }
    this.components.set(componentType, component);
  }
  
  getComponent(componentType) {
    if (!this.components.has(componentType)) {
      throw new Error('Component not found');
    }
    return this.components.get(componentType);
  }
  
  removeComponent(componentType) {
    if (!this.components.has(componentType)) {
      throw new Error('Component not found');
    }
    this.components.delete(componentType);
  }
}

class Position {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  update(dx, dy, dz) {
    this.x += dx;
    this.y += dy;
    this.z += dz;
  }
}

class Velocity {
  constructor(vx, vy, vz) {
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
  }
}

class Health {
  constructor(maxHealth) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }
  
  takeDamage(amount) {
    this.currentHealth -= amount;
    if (this.currentHealth < 0) {
      this.currentHealth = 0;
    }
  }
  
  heal(amount) {
    this.currentHealth += amount;
    if (this.currentHealth > this.maxHealth) {
      this.currentHealth = this.maxHealth;
    }
  }
  
  isAlive() {
    return this.currentHealth > 0;
  }
}

class GameWorld {
  constructor() {
    this.entities = new Map();
    this.nextEntityId = 1;
  }
  
  spawnEntity() {
    const id = this.nextEntityId++;
    const entity = new Entity(id);
    this.entities.set(id, entity);
    return entity;
  }
  
  destroyEntity(entityId) {
    if (!this.entities.has(entityId)) {
      throw new Error('Entity not found');
    }
    this.entities.delete(entityId);
  }
  
  update(deltaTime) {
    const updateResults = [];
    
    for (const entity of this.entities.values()) {
      if (!entity.isActive) {
        continue;
      }
      
      try {
        const pos = entity.getComponent('Position');
        const vel = entity.getComponent('Velocity');
        
        pos.update(vel.vx * deltaTime, vel.vy * deltaTime, vel.vz * deltaTime);
        updateResults.push({ entityId: entity.id, success: true });
      } catch (error) {
        updateResults.push({ entityId: entity.id, success: false, error: error.message });
      }
    }
    
    return updateResults;
  }
}

const world = new GameWorld();

const player = world.spawnEntity();
player.addComponent('Position', new Position(0, 0, 0));
player.addComponent('Velocity', new Velocity(1, 0, 0));
player.addComponent('Health', new Health(100));

const enemy = world.spawnEntity();
enemy.addComponent('Position', new Position(10, 0, 0));
enemy.addComponent('Velocity', new Velocity(-0.5, 0, 0));
enemy.addComponent('Health', new Health(50));

world.update(0.016);

const playerHealth = player.getComponent('Health');
playerHealth.takeDamage(10);

module.exports = { Entity, Position, Velocity, Health, GameWorld, world };
