/**
 * Small fireworks on a canvas the size of the title bar (#62). Rockets rise from the bottom
 * edge and burst into sparks that fall back and fade. The loop runs at most at 30 fps and
 * pauses while the page is hidden.
 */

const COLOURS = ['#ffd54a', '#ffffff', '#ff5a5f', '#5ab0ff', '#6ee07a', '#ff9f43'];
const FRAME_MS = 1000 / 30;
const MAX_BURSTS = 3;
const GRAVITY = 28; // px/s²

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  speed: number; // px/s upwards
  colour: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds left
  maxLife: number;
  colour: string;
}

interface Burst {
  sparks: Spark[];
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)] as T;

/** Starts the fireworks; returns a function that stops them and releases the listeners. */
export function startFireworks(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ctx = context;

  let width = 0;
  let height = 0;
  let rockets: Rocket[] = [];
  let bursts: Burst[] = [];
  let nextLaunch = 0; // ms timestamp
  let last = 0;
  let frame = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function launch() {
    rockets.push({
      // Keep clear of the logo on the right; from 992 px the side menu shows it instead.
      x: random(width * 0.05, width < 992 ? width - 110 : width * 0.95),
      y: height,
      targetY: random(height * 0.2, height * 0.5),
      speed: random(70, 100),
      colour: pick(COLOURS),
    });
  }

  function explode(rocket: Rocket) {
    const count = Math.round(random(30, 40));
    const power = random(26, 42);
    const sparks: Spark[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random(-0.1, 0.1);
      const speed = power * random(0.6, 1);
      const life = random(1.4, 2);
      sparks.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        colour: Math.random() < 0.8 ? rocket.colour : pick(COLOURS),
      });
    }
    bursts.push({ sparks });
  }

  function step(dt: number, now: number) {
    if (now >= nextLaunch && rockets.length + bursts.length < MAX_BURSTS) {
      launch();
      nextLaunch = now + random(700, 2000);
    }

    rockets = rockets.filter((rocket) => {
      rocket.y -= rocket.speed * dt;
      if (rocket.y > rocket.targetY) return true;
      explode(rocket);
      return false;
    });

    for (const burst of bursts) {
      for (const spark of burst.sparks) {
        spark.vx *= 1 - 1.2 * dt; // air drag
        spark.vy = spark.vy * (1 - 1.2 * dt) + GRAVITY * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
      }
      burst.sparks = burst.sparks.filter((spark) => spark.life > 0);
    }
    bursts = bursts.filter((burst) => burst.sparks.length > 0);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';

    for (const rocket of rockets) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = rocket.colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rocket.x, rocket.y);
      ctx.lineTo(rocket.x, rocket.y + 6);
      ctx.stroke();
    }
    // Each spark is a short streak back along its motion, which reads as a trail.
    ctx.lineWidth = 2;
    for (const burst of bursts) {
      for (const spark of burst.sparks) {
        ctx.globalAlpha = Math.min(1, (spark.life / spark.maxLife) * 1.4);
        ctx.strokeStyle = spark.colour;
        ctx.beginPath();
        ctx.moveTo(spark.x - spark.vx * 0.08, spark.y - spark.vy * 0.08);
        ctx.lineTo(spark.x, spark.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    // Long gaps (a background tab, a slow device) restart the motion instead of jumping.
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    step(dt, now);
    draw();
  }

  function start() {
    if (frame) return;
    last = performance.now();
    nextLaunch = last;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  if (!document.hidden) start();

  return () => {
    stop();
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
