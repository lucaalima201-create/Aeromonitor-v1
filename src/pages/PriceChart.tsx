// Gráfico de evolução de preços — usa apenas pontos realmente registrados.
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { MonitoringEntry } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

export default function PriceChart({ entry }: { entry: MonitoringEntry }) {
  if (entry.priceHistory.length < 2) {
    return <p className="text-xs text-gray-400">O gráfico aparece a partir de 2 preços registrados.</p>;
  }
  const data = entry.priceHistory.map((p, i) => ({
    n: i + 1,
    price: p.price,
    label: `${p.source} · ${formatDateTime(p.recordedAt)}`,
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="n" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} width={50} />
          <Tooltip
            formatter={(v) => formatCurrency(Number(v), entry.currency)}
            labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ''}
          />
          {entry.targetPrice > 0 && (
            <ReferenceLine y={entry.targetPrice} stroke="#16a34a" strokeDasharray="4 4" label={{ value: 'alvo', fontSize: 10, fill: '#16a34a' }} />
          )}
          <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
