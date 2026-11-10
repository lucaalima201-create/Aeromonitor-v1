// ============================================================
// AeroMonitor AI — Componentes Reutilizáveis
// ============================================================
import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Badge de Status ─────────────────────────────────────────
interface BadgeProps {
  className?: string;
  children: ReactNode;
}
export function Badge({ className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

// ─── Botão ───────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}
export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${padding ? 'p-4 md:p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── Campo de Formulário ────────────────────────────────────
interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}
export function Field({ label, error, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export function Input({ error, className = '', ...rest }: InputProps) {
  return (
    <input
      {...rest}
      className={`
        w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-50 disabled:text-gray-500
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        ${className}
      `}
    />
  );
}

// ─── Select ──────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
}
export function Select({ error, options, className = '', ...rest }: SelectProps) {
  return (
    <select
      {...rest}
      className={`
        w-full rounded-lg border px-3 py-2 text-sm text-gray-900
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-50 disabled:text-gray-500
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        ${className}
      `}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export function Textarea({ error, className = '', ...rest }: TextareaProps) {
  return (
    <textarea
      {...rest}
      className={`
        w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-50 resize-y min-h-[80px]
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        ${className}
      `}
    />
  );
}

// ─── Loading Spinner ─────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return <Loader2 className={`${sizes[size]} animate-spin text-blue-600`} />;
}

// ─── Empty State ─────────────────────────────────────────────
interface EmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  sub?: string;
}
export function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`${color} p-3 rounded-xl`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </Card>
  );
}

// ─── Modal ───────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
export function ConfirmDialog({ open, onConfirm, onCancel, title, message, confirmLabel = 'Confirmar', danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ─── Page Header ────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Alerta/Notice Banner ─────────────────────────────────────
interface AlertBannerProps {
  type: 'info' | 'warning' | 'success' | 'error';
  children: ReactNode;
}
export function AlertBanner({ type, children }: AlertBannerProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`border rounded-lg p-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}
