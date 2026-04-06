export default function StatsWidget({ endValue, suffix = '', label }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
      <div className="font-serif text-5xl font-bold text-bleu mb-2">{endValue}{suffix}</div>
      <div className="text-gray-600 font-medium uppercase tracking-wider text-sm">{label}</div>
    </div>
  );
}
