---
status: APPROVED
title: "HTML/CSS Full-Stack E-Learning Platform"
description: "Complete educational platform with responsive design, accessibility, and modern web standards"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/html/**"
---

# HTML/CSS Full-Stack Implementation Plan

## Overview
Build a complete e-learning platform using semantic HTML5 and modern CSS3 with responsive design, accessibility (WCAG 2.1), and advanced CSS layout techniques.

## Semantic HTML Structure

### 1. Course Page Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Learn web development with structured courses">
    <title>WebDev Academy - Professional Web Development Courses</title>
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/accessibility.css">
</head>
<body>
    <header role="banner">
        <nav role="navigation" aria-label="Primary">
            <ul>
                <li><a href="#home" accesskey="h">Home</a></li>
                <li><a href="#courses" accesskey="c">Courses</a></li>
                <li><a href="#about" accesskey="a">About</a></li>
                <li><a href="#contact" accesskey="n">Contact</a></li>
            </ul>
        </nav>
        <h1>WebDev Academy</h1>
        <p class="tagline">Learn by Building Real Projects</p>
    </header>

    <main role="main">
        <article>
            <header>
                <h2>Advanced CSS Grid Layout</h2>
                <p class="meta">
                    <time datetime="2024-01-12">January 12, 2024</time> |
                    <span>Difficulty: Intermediate</span>
                </p>
            </header>

            <section id="overview">
                <h3>Course Overview</h3>
                <p>Master CSS Grid for building modern responsive layouts...</p>
            </section>

            <section id="lessons">
                <h3>Course Lessons</h3>
                <ol>
                    <li>
                        <article>
                            <h4>Introduction to Grid</h4>
                            <p>Duration: 45 minutes</p>
                            <progress value="25" max="100" aria-label="Completion: 25%"></progress>
                        </article>
                    </li>
                    <li>
                        <article>
                            <h4>Grid Layout Basics</h4>
                            <p>Duration: 60 minutes</p>
                            <progress value="100" max="100" aria-label="Completion: 100%"></progress>
                        </article>
                    </li>
                </ol>
            </section>

            <aside role="complementary" aria-label="Course Information">
                <h3>Course Details</h3>
                <dl>
                    <dt>Duration:</dt>
                    <dd>12 weeks</dd>
                    <dt>Level:</dt>
                    <dd>Intermediate</dd>
                    <dt>Instructor:</dt>
                    <dd>Sarah Johnson</dd>
                </dl>
            </aside>

            <footer>
                <p>Last updated: <time datetime="2024-01-12">January 12, 2024</time></p>
            </footer>
        </article>
    </main>

    <footer role="contentinfo">
        <nav role="navigation" aria-label="Footer">
            <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
            </ul>
        </nav>
        <p>&copy; 2024 WebDev Academy. All rights reserved.</p>
    </footer>

    <script src="scripts/main.js"></script>
</body>
</html>
```

## Responsive CSS Layouts

### 1. Mobile-First Approach
```css
/* Base styles for mobile */
:root {
    --color-primary: #3498db;
    --color-text: #333;
    --spacing-unit: 1rem;
    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
    --breakpoint-xl: 1280px;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: var(--color-text);
    margin: 0;
    padding: 0;
}

/* Mobile-first responsive images */
img {
    max-width: 100%;
    height: auto;
    display: block;
}

/* Typography hierarchy */
h1 { font-size: 1.75rem; margin: var(--spacing-unit) 0; }
h2 { font-size: 1.5rem; margin: calc(var(--spacing-unit) * 1.2) 0; }
h3 { font-size: 1.25rem; margin: var(--spacing-unit) 0; }
h4 { font-size: 1.1rem; margin: calc(var(--spacing-unit) * 0.8) 0; }

/* Tablet and up */
@media (min-width: 768px) {
    h1 { font-size: 2.25rem; }
    h2 { font-size: 1.875rem; }
    body { font-size: 17px; }
}

/* Desktop and up */
@media (min-width: 1024px) {
    h1 { font-size: 2.5rem; }
    body { font-size: 18px; }
}
```

### 2. CSS Grid Layout
```css
.course-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-unit);
}

@media (min-width: 768px) {
    .course-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: calc(var(--spacing-unit) * 1.5);
    }
}

@media (min-width: 1024px) {
    .course-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: calc(var(--spacing-unit) * 2);
    }
}

.course-card {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.course-card__header {
    padding: var(--spacing-unit);
    background: linear-gradient(135deg, var(--color-primary), #2980b9);
    color: white;
}

.course-card__content {
    padding: var(--spacing-unit);
}

.course-card__footer {
    padding: var(--spacing-unit);
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
```

### 3. Flexbox for Components
```css
/* Navigation bar */
nav ul {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
}

@media (min-width: 768px) {
    nav ul {
        flex-direction: row;
        gap: calc(var(--spacing-unit) * 2);
    }
}

/* Hero section with flexbox */
.hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: calc(var(--spacing-unit) * 2);
    background: linear-gradient(135deg, var(--color-primary), #9b59b6);
    color: white;
    text-align: center;
}

@media (min-width: 768px) {
    .hero {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        text-align: left;
        min-height: 500px;
    }
}

.hero__content {
    flex: 1;
    padding-right: var(--spacing-unit);
}

.hero__image {
    flex: 1;
}
```

## Advanced CSS Features

### 1. Gradients and Animations
```css
/* Gradient backgrounds */
.gradient-text {
    background: linear-gradient(90deg, #3498db, #2ecc71, #e74c3c);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
    0% { background-position: 0% center; }
    100% { background-position: 300% center; }
}

/* Smooth transitions */
.button {
    background-color: var(--color-primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.button:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
    transform: translateY(0);
}

/* Loading animation */
@keyframes spinner {
    to { transform: rotate(360deg); }
}

.loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--color-primary);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spinner 1s linear infinite;
}
```

### 2. CSS Variables and Theming
```css
/* Light theme */
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #333333;
    --text-secondary: #666666;
    --border-color: #ddd;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --text-primary: #ffffff;
        --text-secondary: #b0b0b0;
        --border-color: #404040;
        --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
}

body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

.card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
    border-radius: 8px;
    padding: var(--spacing-unit);
}
```

## Accessibility (WCAG 2.1)

### 1. Accessible Forms
```html
<form>
    <fieldset>
        <legend>Course Registration</legend>
        
        <div class="form-group">
            <label for="email">Email Address <span aria-label="required">*</span></label>
            <input
                id="email"
                type="email"
                name="email"
                required
                aria-required="true"
                aria-describedby="email-help"
            >
            <small id="email-help">We'll never share your email.</small>
        </div>
        
        <div class="form-group">
            <label for="level">Course Level</label>
            <select id="level" name="level" aria-label="Select course difficulty level">
                <option value="">Choose level...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
            </select>
        </div>
        
        <fieldset>
            <legend>Learning Goals</legend>
            <div class="checkbox-group">
                <input type="checkbox" id="goal1" name="goals" value="career">
                <label for="goal1">Career advancement</label>
                
                <input type="checkbox" id="goal2" name="goals" value="hobby">
                <label for="goal2">Personal hobby</label>
            </div>
        </fieldset>
        
        <button type="submit" class="button button--primary">
            Register Now
        </button>
    </fieldset>
</form>
```

### 2. Accessible CSS
```css
/* Focus visible for keyboard navigation */
button:focus-visible,
a:focus-visible,
input:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: more) {
    body {
        font-weight: 600;
    }
    
    .button {
        border: 2px solid var(--color-primary);
    }
}

/* Reduced motion respect */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* Skip to main content link */
.skip-link {
    position: absolute;
    left: -9999px;
    z-index: 999;
}

.skip-link:focus {
    left: 0;
    top: 0;
    background: var(--color-primary);
    color: white;
    padding: var(--spacing-unit);
}
```

## Deliverables

1. Semantic HTML5 structure
2. Mobile-first responsive design
3. CSS Grid and Flexbox layouts
4. Modern CSS features (variables, gradients, animations)
5. Dark mode support
6. WCAG 2.1 AA accessibility compliance
7. Keyboard navigation support
8. Accessible forms
9. Performance-optimized stylesheets
10. Print-friendly styles
11. Progressive enhancement
12. Complete design system documentation
