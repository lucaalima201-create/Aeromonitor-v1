import { describe, it, expect } from 'vitest';
import { parseMoney, formatMoneyInput } from './money';

describe('parseMoney', () => {
  it('aceita formatos pt-BR', () => {
    expect(parseMoney('800')).toBe(800);
    expect(parseMoney('800,00')).toBe(800);
    expect(parseMoney('R$ 800,00')).toBe(800);
    expect(parseMoney('1.250,50')).toBe(1250.5);
    expect(parseMoney('R$ 1.250,50')).toBe(1250.5);
    expect(parseMoney('12.345,6')).toBe(12345.6);
  });
  it('aceita ponto decimal e milhar sem decimais', () => {
    expect(parseMoney('1250.50')).toBe(1250.5);
    expect(parseMoney('1.250')).toBe(1250);
  });
  it('vazio é null (campo opcional)', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('   ')).toBeNull();
  });
  it('rejeita entradas inválidas', () => {
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('1,2,3')).toBeNull();
    expect(parseMoney('10,999')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
  });
});

describe('formatMoneyInput', () => {
  it('formata para edição', () => {
    expect(formatMoneyInput(1250.5)).toBe('1.250,50');
    expect(formatMoneyInput(800)).toBe('800,00');
    expect(formatMoneyInput(undefined)).toBe('');
  });
  it('faz round-trip', () => {
    expect(parseMoney(formatMoneyInput(1250.5))).toBe(1250.5);
  });
});
