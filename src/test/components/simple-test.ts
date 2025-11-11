import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Test environment check
describe('Test Environment', () => {
  beforeEach(() => {
    console.log('Setting up test environment...');
  });

  afterEach(() => {
    console.log('Cleaning up test environment...');
  });

  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });
});

// Simple HTML test (no React)
describe('DOM Tests', () => {
  it('should create DOM elements', () => {
    const div = document.createElement('div');
    div.textContent = 'Test content';
    document.body.appendChild(div);
    
    const element = document.querySelector('div');
    expect(element).toBeInTheDocument();
    expect(element?.textContent).toBe('Test content');
  });
});