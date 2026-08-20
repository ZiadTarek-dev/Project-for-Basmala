import { motion } from "motion/react";
import flowerImg from "../assets/flower2-decoration.webp";

export default function AnimatedFlowers() {
  const flowerPositions = [
    { side: "left", top: "-250px", width: 175, delay: 2, rotate: "-10deg" },
    { side: "left", top: "0px", width: 150, delay: 2.2, rotate: "-15deg" },
    { side: "right", top: "-250px", width: 175, delay: 2, rotate: "-10deg" },
    { side: "right", top: "0px", width: 150, delay: 2.2, rotate: "-15deg" },
  ];

  return (
    <>
      {flowerPositions.map((e, i) => (
        <motion.img
          key={i}
          src={flowerImg}
          alt=""
          aria-hidden="true"
          initial={{ y: 0 }}
          animate={{ y: 20 }}
          transition={{
            duration: e.delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            top: e.top,
            width: e.width,
            zIndex: -1,
            rotate: e.rotate,
            scaleX: e.side === "right" ? -1 : 1,
            ...(e.side === "left" ? { left: "-100px" } : { right: "-100px" }),
          }}
        />
      ))}
    </>
  );
}
