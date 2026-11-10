// ============================================================
// AeroMonitor AI — Seletor de aeroportos (cidade, aeroporto ou código IATA)
// ============================================================
import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { searchAirports, formatLocation, type AirportOption } from '../data/airportSearch';

export interface LocationValue {
  city: string;
  code?: string;
}

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  placeholder?: string;
  error?: boolean;
  autoFocus?: boolean;
}

export default function AirportSelect({ value, onChange, placeholder, error, autoFocus }: Props) {
  const listId = useId();
  const [text, setText] = useState(value.city ? formatLocation(value.city, value.code) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const lastEmitted = useRef<string>(`${value.city}|${value.code ?? ''}`);

  // Sincroniza quando o valor muda por fora (ex.: abrir edição, limpar formulário).
  useEffect(() => {
    const key = `${value.city}|${value.code ?? ''}`;
    if (key !== lastEmitted.current) {
      lastEmitted.current = key;
      setText(value.city ? formatLocation(value.city, value.code) : '');
    }
  }, [value.city, value.code]);

  const results = open ? searchAirports(text) : [];
  const legacy = !!value.city && !value.code;

  const emit = (v: LocationValue) => {
    lastEmitted.current = `${v.city}|${v.code ?? ''}`;
    onChange(v);
  };

  const choose = (o: AirportOption) => {
    setText(o.label);
    setOpen(false);
    emit({ city: o.city, code: o.code });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          value={text}
          placeholder={placeholder ?? 'Cidade, aeroporto ou código IATA'}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
            // Digitar invalida a seleção anterior: o código só vem da lista.
            emit({ city: e.target.value, code: undefined });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        />
      </div>

      {open && text.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              Nenhum aeroporto encontrado. Tente o nome da cidade ou o código IATA.
            </li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.code}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 cursor-pointer text-sm ${i === active ? 'bg-blue-50' : ''}`}
              >
                <div className="font-medium text-gray-900">
                  {o.label}
                  {o.kind === 'metro' && (
                    <span className="ml-2 text-xs font-normal text-blue-700 bg-blue-100 rounded px-1.5 py-0.5">todos</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">{o.name} · {o.state}</div>
              </li>
            ))
          )}
        </ul>
      )}

      {legacy && !open && (
        <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Sem código IATA. Selecione um aeroporto na lista.
        </p>
      )}
      {!legacy && value.code && (
        <p className="mt-1 text-xs text-green-700">Código IATA confirmado: {value.code}</p>
      )}
    </div>
  );
}
