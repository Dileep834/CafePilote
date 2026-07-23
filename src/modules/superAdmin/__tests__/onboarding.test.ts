import { describe, expect, it } from 'vitest';
import {
  generateCompanyCode,
  generateOutletCode,
  progressPercent,
  slugPrefix,
  statusColor,
} from '../lib/companyCode';
import { validateBusinessInfo } from '../validation';
import { parseMenuTextToItems } from '../services/companyProvisioningService';
import { DEFAULT_BUSINESS } from '../types';

describe('companyCode', () => {
  it('builds CP-XXX-NNNN codes', () => {
    const code = generateCompanyCode('Cafe Mocha', () => 0.1234);
    expect(code).toMatch(/^CP-CAF-\d{4}$/);
  });

  it('slugPrefix pads short names', () => {
    expect(slugPrefix('AB')).toBe('ABX');
    expect(slugPrefix('!!!')).toBe('CMP');
  });

  it('generates outlet codes', () => {
    expect(generateOutletCode('Backbenchers', () => 0.5)).toMatch(/^BAC\d{4}$/);
  });

  it('maps progress to status colors', () => {
    expect(progressPercent({ a: true, b: false })).toBe(50);
    expect(statusColor(90)).toBe('green');
    expect(statusColor(50)).toBe('yellow');
    expect(statusColor(10)).toBe('red');
  });
});

describe('validateBusinessInfo', () => {
  it('accepts a valid payload', () => {
    const result = validateBusinessInfo({
      ...DEFAULT_BUSINESS,
      companyName: 'Spice Route',
      ownerName: 'Anita',
      mobile: '9876543210',
      email: 'anita@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short company names', () => {
    const result = validateBusinessInfo({
      ...DEFAULT_BUSINESS,
      companyName: 'A',
      ownerName: 'Anita',
      mobile: '9876543210',
    });
    expect(result.success).toBe(false);
  });
});

describe('parseMenuTextToItems', () => {
  it('extracts category and priced lines', () => {
    const items = parseMenuTextToItems(`COFFEE
Latte - 180
Cappuccino ₹150
TEA
Masala Chai — 80`);
    expect(items.length).toBe(3);
    expect(items[0]?.category).toBe('COFFEE');
    expect(items[0]?.name).toBe('Latte');
    expect(items[0]?.price).toBe(180);
    expect(items[2]?.category).toBe('TEA');
  });
});
