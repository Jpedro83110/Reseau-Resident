import { motion } from 'framer-motion';

export default function CarteVisuelle({ ville = 'Sanary-sur-Mer', numero = 'SAN · 008431', expiration = '09/2026' }) {
  return (
    <div className="perspective-1000 w-full max-w-[320px] aspect-[16/10] mx-auto">
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        whileHover={{ rotateY: 8, rotateX: 4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0d2440] border border-white/10 p-5 sm:p-6 flex flex-col justify-between text-white backface-hidden">
          <div className="flex justify-between items-start">
            <div className="font-serif text-lg sm:text-xl font-bold tracking-wider">Réseaux-Résident</div>
            <div className="text-[10px] sm:text-xs font-medium uppercase tracking-widest opacity-80 text-right max-w-[120px]">{ville}</div>
          </div>
          <div className="w-10 h-8 sm:w-12 sm:h-9 rounded bg-gradient-to-br from-[#e8b86d] to-[#c8963e] shadow-inner" />
          <div>
            <div className="font-mono text-base sm:text-lg tracking-[0.15em] sm:tracking-[0.2em] mb-2 text-white/90">{numero}</div>
            <div className="flex justify-between items-end">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60">
                Valable jusqu'au<br />
                <span className="text-xs sm:text-sm text-white font-medium">{expiration}</span>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}
