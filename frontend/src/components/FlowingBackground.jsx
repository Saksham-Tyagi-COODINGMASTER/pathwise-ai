
import { useEffect, useRef } from "react";

function FlowingBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let width = 0;
    let height = 0;
    let frameId;
    let lastFrame = 0;
    let elapsed = 0;
    let samples = [];

    const FPS = 30;
    const FRAME_INTERVAL = 1000 / FPS;
    const SAMPLE_COUNT = 48;
    const STRAND_COUNT = 28;
    const PARTICLE_COUNT = 42;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const random = (min, max) =>
      Math.random() * (max - min) + min;

    // Create independently moving energy strands.
    const strands = Array.from(
      { length: STRAND_COUNT },
      (_, i) => ({
        startX: random(0.62, 1.02),
        endX: random(0.70, 0.87),
        spread: random(-0.15, 0.15),
        phase: random(0, Math.PI * 2),
        speed: random(0.12, 0.32),
        amplitude: random(18, 65),
        frequency: random(0.7, 1.8),
        thickness: random(0.65, 1.35),
        opacity: random(0.15, 0.38),
        color:
          i % 4 === 0
            ? "100,220,235"
            : i % 7 === 0
              ? "220,255,130"
              : "197,255,74",
      })
    );

    // Particles belong to actual strands.
    const particles = Array.from(
      { length: PARTICLE_COUNT },
      () => ({
        strand: Math.floor(random(0, STRAND_COUNT)),
        progress: random(0, 1),
        speed: random(0.045, 0.12),
        size: random(0.8, 2.0),
        opacity: random(0.45, 0.95),
      })
    );

    // Cubic Bezier calculation.
    const bezier = (p0, p1, p2, p3, t) => {
      const u = 1 - t;

      return (
        u * u * u * p0 +
        3 * u * u * t * p1 +
        3 * u * t * t * p2 +
        t * t * t * p3
      );
    };

    // Generate a changing curved path for each strand.
    const getCurve = (strand) => {
      const time = elapsed;

      const startX = strand.startX * width;
      const endX = strand.endX * width;

      const focalX = width * 0.79;
      const endY = height * 1.08;

      const sway1 =
        Math.sin(time * strand.speed + strand.phase);

      const sway2 =
        Math.sin(
          time * strand.speed * 0.63 +
          strand.phase * 1.7
        );

      const p0 = {
        x: startX,
        y: -height * 0.08,
      };

      const p1 = {
        x:
          startX +
          (focalX - startX) * 0.30 +
          sway1 * strand.amplitude,
        y: height * 0.27,
      };

      const p2 = {
        x:
          endX +
          (focalX - endX) * 0.35 +
          sway2 * strand.amplitude * 1.5 +
          strand.spread * width,
        y: height * 0.73,
      };

      const p3 = {
        x:
          endX +
          sway1 * strand.amplitude * 0.35,
        y: endY,
      };

      const points = [];

      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const t = i / SAMPLE_COUNT;

        const organicOffset =
          Math.sin(t * Math.PI * 3 + strand.phase + time * 0.25) *
          strand.amplitude *
          0.13;

        points.push({
          x: bezier(p0.x, p1.x, p2.x, p3.x, t) +
            organicOffset,
          y: bezier(p0.y, p1.y, p2.y, p3.y, t),
        });
      }

      return points;
    };

    // Rebuild paths before drawing each frame.
    const updateCurves = () => {
      samples = strands.map(getCurve);
    };

    // Draw a soft focal light near convergence.
    const drawFocalGlow = () => {
      const x = width * 0.79;
      const y = height * 0.84;

      const glow = ctx.createRadialGradient(
        x, y, 0,
        x, y, Math.min(width, height) * 0.30
      );

      glow.addColorStop(0, "rgba(197,255,74,0.065)");
      glow.addColorStop(0.35, "rgba(100,220,235,0.025)");
      glow.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    };

    // Draw all curved strands.
    const drawStrands = () => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      samples.forEach((points, index) => {
        const strand = strands[index];

        ctx.beginPath();

        points.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });

        ctx.strokeStyle =
          `rgba(${strand.color},${strand.opacity})`;

        ctx.lineWidth = strand.thickness;
        ctx.stroke();

        // A few strands receive an additional soft glow.
        if (index % 5 === 0) {
          ctx.beginPath();

          points.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });

          ctx.strokeStyle =
            `rgba(${strand.color},0.045)`;

          ctx.lineWidth = 5;
          ctx.stroke();
        }
      });
    };

    // Draw particles along the sampled curves.
    const drawParticles = (delta) => {
      particles.forEach((particle) => {
        particle.progress += particle.speed * delta;

        if (particle.progress > 1) {
          particle.progress -= 1;
        }

        const points = samples[particle.strand];

        const position = particle.progress * SAMPLE_COUNT;

        const index = Math.min(
          Math.floor(position),
          SAMPLE_COUNT - 1
        );

        const blend = position - index;

        const a = points[index];
        const b = points[index + 1];

        const x = a.x + (b.x - a.x) * blend;
        const y = a.y + (b.y - a.y) * blend;

        const strand = strands[particle.strand];

        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);

        ctx.fillStyle =
          `rgba(${strand.color},${particle.opacity})`;

        ctx.fill();

        // Small glow only around selected particles.
        if (particle.size > 1.5) {
          ctx.beginPath();
          ctx.arc(x, y, particle.size * 2.8, 0, Math.PI * 2);

          ctx.fillStyle =
            `rgba(${strand.color},0.10)`;

          ctx.fill();
        }
      });
    };

    const resize = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        1.25
      );

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      updateCurves();

      if (reducedMotion) {
        render(0);
      }
    };

    const render = (delta) => {
      ctx.clearRect(0, 0, width, height);

      updateCurves();

      ctx.globalCompositeOperation = "screen";

      drawFocalGlow();
      drawStrands();
      drawParticles(delta);

      ctx.globalCompositeOperation = "source-over";
    };

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate);

      if (document.hidden) return;

      if (timestamp - lastFrame < FRAME_INTERVAL) return;

      const delta = lastFrame
        ? Math.min((timestamp - lastFrame) / 1000, 0.05)
        : 0;

      lastFrame = timestamp;
      elapsed += delta;

      render(delta);
    };

    resize();

    if (!reducedMotion) {
      frameId = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}

export default FlowingBackground;
