import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-bleu text-white hover:bg-bleu-clair focus:ring-bleu/30',
  secondary: 'border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-300/30',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300/30',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300/30',
};

const SIZES = {
  sm: 'h-9 min-h-[44px] px-3 text-xs gap-1.5',
  md: 'h-11 min-h-[44px] px-4 text-sm gap-2',
  lg: 'h-12 min-h-[44px] px-6 text-base gap-2',
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  fullWidth = false, children, className = '', ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-all duration-150 active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
      {...rest}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
      {loading ? 'Chargement...' : children}
    </button>
  );
}
