import { useEffect, useRef } from "react";
import "./MagicBackground.css";

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  alphaDirection: number;
  rotation: number;
  rotationSpeed: number;
  type: "star" | "spark" | "dust";
};

export default function MagicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;

    const particles: Particle[] = [];

    let mouseX = width / 2;
    let mouseY = height / 2;

    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const particleCount = () => {
      if (reducedMotionQuery.matches) return 25;

      const area = width * height;

      if (area < 500000) return 40;
      if (area < 1000000) return 65;

      return 95;
    };

    const createParticle = (): Particle => {
      const random = Math.random();

      let type: Particle["type"];

      if (random < 0.15) {
        type = "star";
      } else if (random < 0.42) {
        type = "spark";
      } else {
        type = "dust";
      }

      return {
        x: Math.random() * width,
        y: Math.random() * height,

        size:
          type === "star"
            ? Math.random() * 2 + 1
            : type === "spark"
              ? Math.random() * 1.3 + 0.5
              : Math.random() * 1 + 0.3,

        speedX: (Math.random() - 0.5) * 0.12,

        speedY: -(Math.random() * 0.25 + 0.03),

        alpha: Math.random() * 0.6 + 0.15,

        alphaDirection: Math.random() > 0.5 ? 1 : -1,

        rotation: Math.random() * Math.PI * 2,

        rotationSpeed: (Math.random() - 0.5) * 0.01,

        type,
      };
    };

    const createParticles = () => {
      particles.length = 0;

      for (let i = 0; i < particleCount(); i++) {
        particles.push(createParticle());
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createParticles();
    };

    const drawGlow = (
      x: number,
      y: number,
      radius: number,
      color: string,
      opacity: number
    ) => {
      const gradient = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      );

      gradient.addColorStop(
        0,
        `${color}${Math.round(opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
      );

      gradient.addColorStop(
        0.4,
        `${color}${Math.round(opacity * 0.35 * 255)
          .toString(16)
          .padStart(2, "0")}`
      );

      gradient.addColorStop(1, `${color}00`);

      ctx.fillStyle = gradient;

      ctx.beginPath();

      ctx.arc(x, y, radius, 0, Math.PI * 2);

      ctx.fill();
    };

    const drawStar = (particle: Particle) => {
      ctx.save();

      ctx.translate(particle.x, particle.y);

      ctx.rotate(particle.rotation);

      ctx.globalAlpha = particle.alpha;

      ctx.shadowBlur = particle.size * 8;

      ctx.shadowColor = "rgba(255, 220, 150, 0.9)";

      ctx.fillStyle = "rgba(255, 235, 190, 0.95)";

      const size = particle.size;

      ctx.beginPath();

      ctx.moveTo(0, -size * 2.8);

      ctx.lineTo(size * 0.65, -size * 0.65);

      ctx.lineTo(size * 2.8, 0);

      ctx.lineTo(size * 0.65, size * 0.65);

      ctx.lineTo(0, size * 2.8);

      ctx.lineTo(-size * 0.65, size * 0.65);

      ctx.lineTo(-size * 2.8, 0);

      ctx.lineTo(-size * 0.65, -size * 0.65);

      ctx.closePath();

      ctx.fill();

      ctx.restore();
    };

    const drawSpark = (particle: Particle) => {
      ctx.save();

      ctx.globalAlpha = particle.alpha;

      ctx.shadowBlur = 8;

      ctx.shadowColor = "rgba(190, 130, 255, 0.9)";

      ctx.fillStyle = "rgba(220, 195, 255, 0.9)";

      ctx.beginPath();

      ctx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.restore();
    };

    const drawDust = (particle: Particle) => {
      ctx.save();

      ctx.globalAlpha = particle.alpha * 0.55;

      ctx.fillStyle = "rgba(255, 215, 170, 0.8)";

      ctx.beginPath();

      ctx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      targetMouseX +=
        (mouseX - targetMouseX) * 0.035;

      targetMouseY +=
        (mouseY - targetMouseY) * 0.035;

      const normalizedX =
        width > 0
          ? targetMouseX / width - 0.5
          : 0;

      const normalizedY =
        height > 0
          ? targetMouseY / height - 0.5
          : 0;

      container.style.setProperty(
        "--mouse-x",
        `${normalizedX * 18}px`
      );

      container.style.setProperty(
        "--mouse-y",
        `${normalizedY * 18}px`
      );

      if (!reducedMotionQuery.matches) {
        drawGlow(
          width * 0.18,
          height * 0.28,
          Math.min(width, height) * 0.45,
          "#7438b8",
          0.18
        );

        drawGlow(
          width * 0.82,
          height * 0.28,
          Math.min(width, height) * 0.4,
          "#a56de8",
          0.12
        );

        drawGlow(
          width * 0.5,
          height * 0.82,
          Math.min(width, height) * 0.45,
          "#d58b48",
          0.08
        );
      }

      particles.forEach((particle) => {
        if (!reducedMotionQuery.matches) {
          particle.x += particle.speedX;

          particle.y += particle.speedY;

          particle.rotation +=
            particle.rotationSpeed;

          particle.alpha +=
            particle.alphaDirection * 0.002;

          if (particle.alpha >= 0.85) {
            particle.alphaDirection = -1;
          }

          if (particle.alpha <= 0.08) {
            particle.alphaDirection = 1;
          }
        }

        if (particle.y < -20) {
          particle.y = height + 20;
          particle.x = Math.random() * width;
        }

        if (particle.x < -20) {
          particle.x = width + 20;
        }

        if (particle.x > width + 20) {
          particle.x = -20;
        }

        if (particle.type === "star") {
          drawStar(particle);
        }

        if (particle.type === "spark") {
          drawSpark(particle);
        }

        if (particle.type === "dust") {
          drawDust(particle);
        }
      });

      ctx.globalAlpha = 1;

      animationFrame =
        requestAnimationFrame(animate);
    };

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handlePointerLeave = () => {
      mouseX = width / 2;
      mouseY = height / 2;
    };

    const handleTouchMove = (
      event: TouchEvent
    ) => {
      const touch = event.touches[0];

      if (!touch) return;

      mouseX = touch.clientX;
      mouseY = touch.clientY;
    };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerleave",
      handlePointerLeave
    );

    window.addEventListener(
      "touchmove",
      handleTouchMove,
      {
        passive: true,
      }
    );

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        "resize",
        resize
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );

      window.removeEventListener(
        "touchmove",
        handleTouchMove
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="magic-background"
      aria-hidden="true"
    >
      <div className="magic-background-image" />

      <div className="magic-aura magic-aura-left" />

      <div className="magic-aura magic-aura-right" />

      <div className="magic-moon-glow" />

      <div className="magic-heart">
        <span>♥</span>
      </div>

      <canvas
        ref={canvasRef}
        className="magic-particles"
      />

      <div className="magic-stars" />

      <div className="magic-vignette" />
    </div>
  );
}