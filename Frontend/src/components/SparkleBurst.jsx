import { motion } from "motion/react";

const PARTICLE_COUNT = 16;
const COLORS = ["#f2e8da", "#b6905f", "#c48178"];
const STAR_PATH =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function SparkleBurst() {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle =
      (i / PARTICLE_COUNT) * Math.PI * 2 + randomBetween(-0.25, 0.25);
    const distance = randomBetween(55, 150);
    return {
      key: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: randomBetween(0, 0.1),
      size: randomBetween(6, 14),
      spin: randomBetween(-120, 120),
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <div className="sparkle-burst" aria-hidden="true">
      <motion.span
        className="sparkle-flash"
        initial={{ opacity: 0.6, scale: 0 }}
        animate={{ opacity: 0, scale: 2.4 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.key}
          className="sparkle-particle"
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            background: p.color,
            clipPath: STAR_PATH,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.spin }}
          transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
