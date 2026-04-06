// src/components/Confetti.jsx
// Particules colorées qui tombent — se déclenche quand active=true
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#c8963e', '#2a5298', '#2d7a4f', '#e8b86d', '#1a3a5c', '#ea580c'];

function Particle({ color, delay }) {
  const x = Math.random() * 100;
  const rotate = Math.random() * 720 - 360;
  const size = 4 + Math.random() * 6;

  return (
    <motion.div
      className="absolute rounded-sm"
      style={{ left: `${x}%`, top: -10, width: size, height: size, backgroundColor: color }}
      initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: [0, 300 + Math.random() * 200],
        x: [0, (Math.random() - 0.5) * 100],
        rotate: [0, rotate],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 2 + Math.random(), delay, ease: 'easeOut' }}
    />
  );
}

export default function Confetti({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const p = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.5,
    }));
    setParticles(p);
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <Particle key={p.id} color={p.color} delay={p.delay} />
        ))}
      </AnimatePresence>
    </div>
  );
}
