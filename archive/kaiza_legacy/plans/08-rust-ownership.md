---
status: APPROVED
title: "Rust Full-Stack Game Server with ECS"
description: "Multiplayer game server with Entity-Component-System architecture and zero-copy networking"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/rust/**"
---

# Rust Full-Stack Implementation Plan

## Overview
Build a high-performance multiplayer game server in Rust using Entity-Component-System (ECS) pattern, demonstrating ownership semantics, lifetimes, and zero-copy networking.

## Architecture

### Game Engine (Rust)
- Entity-Component-System (ECS) architecture
- Real-time networking with tokio
- Physics simulation
- State serialization with serde
- Plugin system with trait objects

### Networking Layer
- Zero-copy protocol buffers
- WebSocket connections
- UDP for real-time updates
- Connection pooling
- Backpressure handling

### Game World
- Spatial partitioning for queries
- Event bus for decoupled systems
- Component lifecycle management
- Time stepping and fixed deltas

## Ownership & Borrowing Model

### 1. Entity Management
```rust
struct Entity {
    id: EntityId,
    components: HashMap<ComponentTypeId, Box<dyn Any>>,
}

pub struct World {
    entities: Vec<Entity>,
    component_storage: Vec<ComponentStorage>,
}

impl World {
    pub fn new_entity(&mut self) -> EntityBuilder {
        let id = EntityId::new();
        EntityBuilder::new(id, self)
    }
    
    pub fn get_component<T: Component>(&self, entity: EntityId) -> Option<&T> {
        // Borrows self immutably
        self.entities.iter()
            .find(|e| e.id == entity)
            .and_then(|e| e.get_component::<T>())
    }
    
    pub fn get_component_mut<T: Component>(&mut self, entity: EntityId) -> Option<&mut T> {
        // Borrows self mutably - exclusive access
        self.entities.iter_mut()
            .find(|e| e.id == entity)
            .and_then(|e| e.get_component_mut::<T>())
    }
}
```

### 2. Lifetimes in Systems
```rust
trait System {
    fn update<'a>(&mut self, world: &'a World, delta: f32);
}

struct PhysicsSystem {
    entities: Vec<EntityId>,
}

impl System for PhysicsSystem {
    fn update<'a>(&mut self, world: &'a World, delta: f32) {
        for entity_id in &self.entities {
            if let Some(transform) = world.get_component::<Transform>(*entity_id) {
                if let Some(velocity) = world.get_component::<Velocity>(*entity_id) {
                    // References are valid for the lifetime 'a
                }
            }
        }
    }
}
```

### 3. RAII Pattern for Resources
```rust
pub struct GameServer {
    listener: TcpListener,
    players: Vec<Player>,
}

impl GameServer {
    pub async fn new(addr: &str) -> Result<Self, Error> {
        let listener = TcpListener::bind(addr).await?;
        Ok(GameServer {
            listener,
            players: Vec::new(),
        })
    }
}

impl Drop for GameServer {
    fn drop(&mut self) {
        // Cleanup happens automatically
        // Listener is closed, all connections cleaned up
    }
}
```

## ECS Architecture

### 1. Components
```rust
#[derive(Clone, Copy, Debug)]
struct Position {
    x: f32,
    y: f32,
    z: f32,
}

#[derive(Clone, Copy, Debug)]
struct Velocity {
    dx: f32,
    dy: f32,
    dz: f32,
}

struct Player {
    id: PlayerId,
    name: String,
    health: u32,
}

trait Component: Send + Sync {}
impl Component for Position {}
impl Component for Velocity {}
impl Component for Player {}
```

### 2. Systems
```rust
struct MovementSystem;

impl System for MovementSystem {
    type In = ();
    type Out = ();
    
    fn run(&mut self, mut world: &mut World, _input: Self::In) -> Self::Out {
        let delta = 0.016; // 60 FPS
        
        // Query all entities with Position and Velocity
        for (entity, pos, vel) in world.query::<(Entity, &mut Position, &Velocity)>() {
            pos.x += vel.dx * delta;
            pos.y += vel.dy * delta;
            pos.z += vel.dz * delta;
        }
    }
}

struct CombatSystem;

impl System for CombatSystem {
    fn run(&mut self, world: &mut World, _: ()) {
        let mut damage_events = Vec::new();
        
        // Process collisions and damage
        for (attacker, defender) in world.query::<(Entity, Entity)>() {
            if let (Some(attack), Some(defense)) = (
                world.get_component::<Attack>(attacker),
                world.get_component::<Defense>(defender)
            ) {
                let damage = attack.damage - defense.armor;
                damage_events.push((defender, damage));
            }
        }
        
        // Apply damage
        for (entity, damage) in damage_events {
            if let Some(health) = world.get_component_mut::<Health>(entity) {
                health.hp = health.hp.saturating_sub(damage as u32);
            }
        }
    }
}
```

### 3. World Updates
```rust
pub struct GameLoop {
    world: World,
    systems: Vec<Box<dyn System>>,
}

impl GameLoop {
    pub async fn run(&mut self) -> Result<(), Error> {
        loop {
            for system in &mut self.systems {
                system.update(&mut self.world, 0.016)?;
            }
        }
    }
}
```

## Networking with Zero-Copy

### 1. Protocol Definition
```rust
#[repr(C)]
pub struct PlayerUpdate {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl PlayerUpdate {
    pub fn to_bytes(&self) -> &[u8] {
        unsafe {
            std::slice::from_raw_parts(
                self as *const _ as *const u8,
                std::mem::size_of::<PlayerUpdate>(),
            )
        }
    }
}
```

### 2. Network Handler with Ownership
```rust
pub struct Connection {
    stream: TcpStream,
    buffer: Vec<u8>,
}

impl Connection {
    pub async fn handle_client(
        mut stream: TcpStream,
        world: Arc<Mutex<World>>
    ) -> Result<(), Error> {
        let mut buffer = vec![0u8; 4096];
        
        loop {
            let n = stream.read(&mut buffer).await?;
            if n == 0 { break; }
            
            let message = parse_message(&buffer[..n])?;
            let mut world = world.lock().await;
            
            match message {
                Message::Move(pos) => {
                    world.get_component_mut::<Position>(pos.entity_id)?
                        .copy_from_slice(&pos.data);
                }
                _ => {}
            }
        }
        Ok(())
    }
}
```

## Pattern Matching & Error Handling

### 1. Result-Based Error Handling
```rust
pub enum GameError {
    EntityNotFound(EntityId),
    ComponentMissing(String),
    NetworkError(io::Error),
    InvalidInput(String),
}

impl std::error::Error for GameError {}

pub type GameResult<T> = Result<T, GameError>;

fn get_player_position(world: &World, entity_id: EntityId) -> GameResult<Position> {
    world.get_component::<Position>(entity_id)
        .ok_or_else(|| GameError::ComponentMissing("Position".to_string()))
}
```

### 2. Match Expressions for Events
```rust
pub enum GameEvent {
    PlayerJoined { id: PlayerId, name: String },
    PlayerMoved { id: PlayerId, pos: Position },
    PlayerAttacked { attacker: PlayerId, defender: PlayerId, damage: u32 },
    PlayerDied { id: PlayerId },
}

fn process_event(event: GameEvent, world: &mut World) -> GameResult<()> {
    match event {
        GameEvent::PlayerJoined { id, name } => {
            // Create new entity for player
            Ok(())
        }
        GameEvent::PlayerMoved { id, pos } => {
            // Update position
            Ok(())
        }
        GameEvent::PlayerAttacked { attacker, defender, damage } => {
            // Apply damage
            Ok(())
        }
        GameEvent::PlayerDied { id } => {
            // Remove entity
            Ok(())
        }
    }
}
```

## Trait Objects & Polymorphism

### 1. Plugin System
```rust
pub trait GamePlugin: Send + Sync {
    fn on_startup(&mut self, world: &mut World);
    fn on_update(&mut self, world: &mut World, delta: f32);
    fn on_shutdown(&mut self, world: &mut World);
}

pub struct PluginRegistry {
    plugins: Vec<Box<dyn GamePlugin>>,
}

impl PluginRegistry {
    pub fn register<P: GamePlugin + 'static>(&mut self, plugin: P) {
        self.plugins.push(Box::new(plugin));
    }
    
    pub fn update(&mut self, world: &mut World, delta: f32) {
        for plugin in &mut self.plugins {
            plugin.on_update(world, delta);
        }
    }
}
```

## Concurrency with tokio

### 1. Async Connection Handler
```rust
pub struct GameServer {
    listener: TcpListener,
    world: Arc<Mutex<World>>,
}

impl GameServer {
    pub async fn run(self) -> Result<(), Error> {
        loop {
            let (socket, addr) = self.listener.accept().await?;
            let world = Arc::clone(&self.world);
            
            tokio::spawn(async move {
                if let Err(e) = handle_connection(socket, world).await {
                    eprintln!("Connection error: {}", e);
                }
            });
        }
    }
}

async fn handle_connection(
    mut socket: TcpStream,
    world: Arc<Mutex<World>>
) -> Result<(), Error> {
    let mut buffer = vec![0u8; 1024];
    
    loop {
        let n = socket.read(&mut buffer).await?;
        if n == 0 { return Ok(()); }
        
        let message = parse_message(&buffer[..n])?;
        let mut world = world.lock().await;
        process_message(message, &mut world).await?;
    }
}
```

## Testing Strategy

### 1. Unit Tests with Owned Data
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_entity_creation() {
        let mut world = World::new();
        let entity = world.spawn();
        assert!(world.get_component::<Position>(entity).is_none());
    }
    
    #[test]
    fn test_component_insertion() {
        let mut world = World::new();
        let entity = world.spawn();
        
        world.insert_component(entity, Position { x: 0.0, y: 0.0, z: 0.0 });
        assert!(world.get_component::<Position>(entity).is_some());
    }
}
```

## Deliverables

1. ECS game engine with full type safety
2. Network server with async/await
3. Physics simulation system
4. Player management system
5. Combat system with events
6. Plugin architecture
7. Serialization with serde
8. Comprehensive test suite
9. Performance benchmarks
10. Docker containerization
11. Client example with WebSocket
12. Architecture documentation
