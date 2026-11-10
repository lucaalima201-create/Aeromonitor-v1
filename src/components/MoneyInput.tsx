// ============================================================
// AeroMonitor AI — Campo de valor monetário (pt-BR)
// Mantém o texto digitado; converta com parseMoney() ao salvar.
// ============================================================
import { parseMoney, formatMoneyInput } from '../utils/money';

const SYMBOLS: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

interface Props {
  value: string;
  onChange: (v: string) => void;
  currency?: string;
  placeholder?: string;
  error?: boolean;
  id?: string;
}

export default function MoneyInput({ value, onChange, currency = 'BRL', placeholder = '0,00', error, id }: Props) {
  const symbol = SYMBOLS[currency] ?? currency;
  return (
    <div className="relative w-full">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
        {symbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        // Só caracteres de valor monetário; o restante é descartado na digitação.
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => {
          const n = parseMoney(value);
          if (n !== null) onChange(formatMoneyInput(n));
        }}
        className={`w-full min-w-0 rounded-lg border pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
        }`}
      />
    </div>
  );
}
