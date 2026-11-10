// ============================================================
// AeroMonitor AI — Entrada/saída de valores monetários (pt-BR)
// ============================================================

/**
 * Converte texto digitado em número. Aceita "800", "800,00", "1.250,50",
 * "R$ 1.250,50" e "1250.50". Retorna null para vazio ou inválido.
 */
export function parseMoney(input: string): number | null {
  if (input == null) return null;
  let s = input.replace(/R\$|\s/g, '');
  if (s === '') return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(',')) {
    // vírgula é o separador decimal; pontos são milhares
    if ((s.match(/,/g) ?? []).length > 1) return null;
    const [int, dec] = s.split(',');
    if (!/^\d{1,3}(\.\d{3})*$|^\d*$/.test(int)) return null;
    if (dec.length > 2) return null;
    s = int.replace(/\./g, '') + '.' + dec;
  } else if (s.includes('.')) {
    const parts = s.split('.');
    const isThousands = parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && parts[0].length <= 3;
    if (isThousands) {
      s = parts.join('');
    } else if (parts.length === 2 && parts[1].length <= 2) {
      // ponto decimal estilo "1250.50"
    } else {
      return null;
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Formata número como texto editável pt-BR (sem símbolo): 1250.5 → "1.250,50". */
export function formatMoneyInput(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
