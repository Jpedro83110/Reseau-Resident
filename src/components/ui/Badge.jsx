const VARIANTS = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  premium: 'bg-or/10 text-or',
};

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
};

export default function Badge({ variant = 'default', size = 'md', children, className = '' }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </span>
  );
}
