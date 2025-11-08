import { useEffect, useRef } from "react";

interface ParticleEffectProps {
  rarity: string;
  active: boolean;
}

export const ParticleEffect = ({ rarity, active }: ParticleEffectProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const getParticleColor = () => {
      switch (rarity.toLowerCase()) {
        case "chroma":
          const chromaColors = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
          return chromaColors[Math.floor(Math.random() * chromaColors.length)];
        case "godly":
          const godlyColors = ["#ef4444", "#f97316", "#fbbf24"];
          return godlyColors[Math.floor(Math.random() * godlyColors.length)];
        case "ancient":
          const ancientColors = ["#eab308", "#fbbf24", "#fde047"];
          return ancientColors[Math.floor(Math.random() * ancientColors.length)];
        default:
          return "#ffffff";
      }
    };

    // Create particles
    for (let i = 0; i < 50; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        color: getParticleColor(),
        alpha: Math.random() * 0.5 + 0.5,
        life: Math.random() * 100 + 100,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.alpha = particle.life / 100;

        if (particle.life <= 0 || particle.alpha <= 0) {
          particlesRef.current.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        
        if (rarity.toLowerCase() === "ancient") {
          // Draw stars for ancient
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = particle.x + Math.cos(angle) * particle.size;
            const y = particle.y + Math.sin(angle) * particle.size;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw circles for other rarities
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      particlesRef.current = [];
    };
  }, [active, rarity]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: "100%", height: "100%" }}
    />
  );
};
