import { describe, it, expect } from 'vitest';
import { AIRPORTS } from './airports';
import {
  searchAirports, getOptionByCode, codesMatch, isMetroCode, formatLocation, ALL_OPTIONS,
} from './airportSearch';

describe('base de aeroportos', () => {
  it('todos os códigos são IATA de 3 letras maiúsculas e únicos', () => {
    const codes = AIRPORTS.map((a) => a.iata);
    expect(codes.every((c) => /^[A-Z]{3}$/.test(c))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('contém os principais aeroportos brasileiros', () => {
    for (const c of ['AJU', 'GRU', 'CGH', 'VCP', 'GIG', 'SDU', 'BSB', 'SSA', 'REC', 'FOR', 'CNF', 'POA', 'CWB', 'FLN', 'MCZ', 'NAT']) {
      expect(AIRPORTS.some((a) => a.iata === c), c).toBe(true);
    }
  });
  it('áreas metropolitanas só existem se todos os membros estão na base', () => {
    for (const o of ALL_OPTIONS.filter((x) => x.kind === 'metro')) {
      expect(isMetroCode(o.code)).toBe(true);
    }
    expect(getOptionByCode('SAO')?.kind).toBe('metro');
    expect(getOptionByCode('RIO')?.kind).toBe('metro');
  });
});

describe('searchAirports', () => {
  it('Aracaju → Aracaju (AJU) primeiro', () => {
    const r = searchAirports('Aracaju');
    expect(r[0].code).toBe('AJU');
    expect(r[0].label).toBe('Aracaju (AJU)');
  });
  it('busca por código IATA, sem diferenciar maiúsculas', () => {
    expect(searchAirports('aju')[0].code).toBe('AJU');
    expect(searchAirports('GRU')[0].code).toBe('GRU');
  });
  it('ignora acentos', () => {
    expect(searchAirports('sao paulo').map((o) => o.code)).toEqual(expect.arrayContaining(['SAO', 'GRU', 'CGH']));
    expect(searchAirports('brasilia')[0].code).toBe('BSB');
  });
  it('busca por nome do aeroporto', () => {
    expect(searchAirports('Santos Dumont').map((o) => o.code)).toContain('SDU');
    expect(searchAirports('Guarulhos').map((o) => o.code)).toContain('GRU');
  });
  it('cidade com vários aeroportos oferece cada um e a opção "todos"', () => {
    const rio = searchAirports('Rio de Janeiro').map((o) => o.code);
    expect(rio).toEqual(expect.arrayContaining(['RIO', 'GIG', 'SDU']));
  });
  it('consulta curta ou sem resultado retorna vazio (sem inventar código)', () => {
    expect(searchAirports('a')).toEqual([]);
    expect(searchAirports('xyzzy')).toEqual([]);
  });
});

describe('codesMatch / formatLocation', () => {
  it('compara códigos e áreas metropolitanas', () => {
    expect(codesMatch('GRU', 'gru')).toBe(true);
    expect(codesMatch('SAO', 'CGH')).toBe(true);
    expect(codesMatch('GRU', 'CGH')).toBe(false);
    expect(codesMatch('AJU', 'SAO')).toBe(false);
  });
  it('formata local', () => {
    expect(formatLocation('Aracaju', 'AJU')).toBe('Aracaju (AJU)');
    expect(formatLocation('São Paulo', 'SAO')).toBe('São Paulo – todos os aeroportos (SAO)');
    expect(formatLocation('Texto livre')).toBe('Texto livre');
  });
});
