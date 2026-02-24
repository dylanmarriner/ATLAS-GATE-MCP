---
status: APPROVED
title: "PHP Full-Stack REST API Framework"
description: "Enterprise REST API with middleware pipelines, dependency injection, and event-driven architecture"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/php/**"
---

# PHP Full-Stack Implementation Plan

## Overview
Build a production-grade REST API using PHP with middleware composition, service container, trait-based functionality, and advanced OOP patterns.

## Middleware Pipeline Architecture

### 1. Middleware Interface & Pipeline
```php
<?php

namespace App\Http\Middleware;

interface MiddlewareInterface {
    public function process(Request $request, callable $next): Response;
}

class MiddlewarePipeline {
    private array $middlewares = [];
    
    public function add(MiddlewareInterface $middleware): self {
        $this->middlewares[] = $middleware;
        return $this;
    }
    
    public function execute(Request $request): Response {
        $pipeline = fn(Request $req) => new Response(404);
        
        foreach (array_reverse($this->middlewares) as $middleware) {
            $previousPipeline = $pipeline;
            $pipeline = fn(Request $req) => $middleware->process($req, $previousPipeline);
        }
        
        return $pipeline($request);
    }
}

class AuthenticationMiddleware implements MiddlewareInterface {
    public function process(Request $request, callable $next): Response {
        if (!$this->isAuthenticated($request)) {
            return new Response(401, 'Unauthorized');
        }
        
        return $next($request);
    }
    
    private function isAuthenticated(Request $request): bool {
        $token = $request->getHeader('Authorization');
        return $this->validateToken($token);
    }
}

class ValidationMiddleware implements MiddlewareInterface {
    public function process(Request $request, callable $next): Response {
        $errors = $this->validate($request);
        
        if (!empty($errors)) {
            return new Response(422, ['errors' => $errors]);
        }
        
        return $next($request);
    }
}

class LoggingMiddleware implements MiddlewareInterface {
    public function process(Request $request, callable $next): Response {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $duration = microtime(true) - $startTime;
        Log::info("Request: {$request->getMethod()} {$request->getPath()}", [
            'duration' => $duration,
            'status' => $response->getStatusCode()
        ]);
        
        return $response;
    }
}
```

### 2. Service Container & Dependency Injection
```php
<?php

namespace App\Container;

class ServiceContainer {
    private array $services = [];
    private array $singletons = [];
    
    public function register(string $name, callable $factory, bool $singleton = false): void {
        $this->services[$name] = [
            'factory' => $factory,
            'singleton' => $singleton
        ];
    }
    
    public function get(string $name): mixed {
        if (isset($this->singletons[$name])) {
            return $this->singletons[$name];
        }
        
        if (!isset($this->services[$name])) {
            throw new Exception("Service not found: $name");
        }
        
        $service = ($this->services[$name]['factory'])($this);
        
        if ($this->services[$name]['singleton']) {
            $this->singletons[$name] = $service;
        }
        
        return $service;
    }
    
    public function resolve(string $className): object {
        $reflection = new ReflectionClass($className);
        $constructor = $reflection->getConstructor();
        
        if ($constructor === null) {
            return new $className();
        }
        
        $parameters = [];
        foreach ($constructor->getParameters() as $param) {
            $type = $param->getType();
            if ($type && !$type->isBuiltin()) {
                $parameters[] = $this->resolve($type->getName());
            }
        }
        
        return $reflection->newInstanceArgs($parameters);
    }
}

// Usage
$container = new ServiceContainer();

$container->register('db', function($c) {
    return new Database('localhost', 'root', 'password');
}, singleton: true);

$container->register('user.repository', function($c) {
    return new UserRepository($c->get('db'));
}, singleton: true);

$container->register('user.service', function($c) {
    return new UserService($c->get('user.repository'));
}, singleton: true);
```

## Trait-Based Functionality

### 1. Shared Behaviors
```php
<?php

namespace App\Traits;

trait HasTimestamps {
    public DateTime $created_at;
    public DateTime $updated_at;
    
    public function initializeTimestamps(): void {
        $this->created_at = new DateTime();
        $this->updated_at = new DateTime();
    }
    
    public function updateTimestamp(): void {
        $this->updated_at = new DateTime();
    }
}

trait HasUuid {
    public string $id;
    
    public function initializeUuid(): void {
        $this->id = Uuid::v4()->toString();
    }
}

trait IsSlugable {
    public string $slug;
    
    public function generateSlug(string $from): void {
        $this->slug = strtolower(
            preg_replace('/[^a-z0-9]+/', '-', $from)
        );
    }
}

trait HasSoftDelete {
    private ?DateTime $deleted_at = null;
    
    public function softDelete(): void {
        $this->deleted_at = new DateTime();
    }
    
    public function restore(): void {
        $this->deleted_at = null;
    }
    
    public function isDeleted(): bool {
        return $this->deleted_at !== null;
    }
}

class Article {
    use HasTimestamps, HasUuid, IsSlugable, HasSoftDelete;
    
    private string $title;
    private string $content;
    
    public function __construct(string $title, string $content) {
        $this->title = $title;
        $this->content = $content;
        $this->initializeTimestamps();
        $this->initializeUuid();
        $this->generateSlug($title);
    }
}
```

## Event-Driven Architecture

### 1. Event System
```php
<?php

namespace App\Events;

interface EventInterface {}

class ArticleCreatedEvent implements EventInterface {
    public function __construct(
        public Article $article,
        public User $author
    ) {}
}

class ArticlePublishedEvent implements EventInterface {
    public function __construct(
        public Article $article,
        public DateTime $publishedAt
    ) {}
}

class EventDispatcher {
    private array $listeners = [];
    
    public function subscribe(string $eventClass, callable $listener): void {
        $this->listeners[$eventClass][] = $listener;
    }
    
    public function dispatch(EventInterface $event): void {
        $eventClass = get_class($event);
        
        if (isset($this->listeners[$eventClass])) {
            foreach ($this->listeners[$eventClass] as $listener) {
                $listener($event);
            }
        }
    }
}

// Usage
$dispatcher = new EventDispatcher();

$dispatcher->subscribe(ArticleCreatedEvent::class, function(ArticleCreatedEvent $event) {
    Email::send($event->author->email, "Article created: {$event->article->title}");
});

$dispatcher->subscribe(ArticlePublishedEvent::class, function(ArticlePublishedEvent $event) {
    Cache::invalidate("articles:{$event->article->id}");
    Queue::dispatch(new NotifySubscribersJob($event->article));
});
```

## Repository & Service Patterns

### 1. Repository Pattern
```php
<?php

namespace App\Repositories;

interface RepositoryInterface {
    public function findById(string $id): ?object;
    public function findAll(array $criteria = []): array;
    public function create(array $data): object;
    public function update(string $id, array $data): object;
    public function delete(string $id): bool;
}

class UserRepository implements RepositoryInterface {
    public function __construct(private Database $db) {}
    
    public function findById(string $id): ?User {
        $result = $this->db->query(
            'SELECT * FROM users WHERE id = ?',
            [$id]
        );
        
        return $result ? new User($result) : null;
    }
    
    public function findAll(array $criteria = []): array {
        $query = 'SELECT * FROM users';
        $params = [];
        
        if (!empty($criteria['email'])) {
            $query .= ' WHERE email = ?';
            $params[] = $criteria['email'];
        }
        
        if (isset($criteria['limit'])) {
            $query .= ' LIMIT ?';
            $params[] = $criteria['limit'];
        }
        
        $results = $this->db->query($query, $params);
        return array_map(fn($row) => new User($row), $results);
    }
    
    public function create(array $data): User {
        $id = Uuid::v4()->toString();
        
        $this->db->execute(
            'INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, NOW())',
            [$id, $data['email'], password_hash($data['password'], PASSWORD_BCRYPT)]
        );
        
        return $this->findById($id);
    }
}
```

### 2. Service Layer
```php
<?php

namespace App\Services;

class UserService {
    public function __construct(
        private UserRepository $repository,
        private EventDispatcher $dispatcher,
        private PasswordHasher $hasher
    ) {}
    
    public function register(string $email, string $password): User {
        if ($this->repository->findAll(['email' => $email])) {
            throw new UserAlreadyExistsException();
        }
        
        $user = $this->repository->create([
            'email' => $email,
            'password' => $this->hasher->hash($password)
        ]);
        
        $this->dispatcher->dispatch(new UserRegisteredEvent($user));
        
        return $user;
    }
    
    public function authenticate(string $email, string $password): ?User {
        $users = $this->repository->findAll(['email' => $email]);
        $user = $users[0] ?? null;
        
        if (!$user || !$this->hasher->verify($password, $user->password)) {
            return null;
        }
        
        return $user;
    }
}
```

## REST Controllers

### 1. API Controller
```php
<?php

namespace App\Http\Controllers;

class UserController {
    public function __construct(
        private UserService $userService,
        private UserRepository $repository
    ) {}
    
    public function index(Request $request): JsonResponse {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        
        $users = $this->repository->findAll([
            'limit' => $limit,
            'offset' => ($page - 1) * $limit
        ]);
        
        return new JsonResponse($users);
    }
    
    public function show(string $id): JsonResponse {
        $user = $this->repository->findById($id);
        
        if (!$user) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        
        return new JsonResponse($user);
    }
    
    public function store(Request $request): JsonResponse {
        try {
            $user = $this->userService->register(
                $request->input('email'),
                $request->input('password')
            );
            
            return new JsonResponse($user, 201);
        } catch (UserAlreadyExistsException $e) {
            return new JsonResponse(['error' => 'Email exists'], 409);
        }
    }
    
    public function update(string $id, Request $request): JsonResponse {
        $user = $this->repository->findById($id);
        
        if (!$user) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        
        $updated = $this->repository->update($id, $request->all());
        return new JsonResponse($updated);
    }
}
```

## Routing

### 1. Route Definition
```php
<?php

$router = new Router();

$router->group(['middleware' => ['auth']], function(Router $api) {
    $api->get('/users', 'UserController@index');
    $api->get('/users/{id}', 'UserController@show');
    $api->post('/users', 'UserController@store');
    $api->put('/users/{id}', 'UserController@update');
    $api->delete('/users/{id}', 'UserController@destroy');
});

$router->post('/auth/register', 'AuthController@register');
$router->post('/auth/login', 'AuthController@login');
```

## Deliverables

1. Middleware pipeline architecture
2. Service container with DI
3. Repository and service patterns
4. Event-driven system
5. RESTful API controllers
6. Trait-based mixins
7. Database abstraction layer
8. Authentication system
9. Comprehensive test suite
10. Docker containerization
11. API documentation
12. Performance optimization guides
