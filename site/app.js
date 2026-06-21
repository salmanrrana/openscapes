(() => {
  const doc = document;
  const root = doc.body;
  const canvas = doc.getElementById("scape");
  const stateText = doc.getElementById("stateText");
  const statePill = doc.getElementById("statePill");
  const soundHint = doc.getElementById("soundHint");
  const startButton = doc.getElementById("startButton");
  const controlsButton = doc.getElementById("controlsButton");
  const infoButton = doc.getElementById("infoButton");
  const signalsButton = doc.getElementById("signalsButton");
  const lightButton = doc.getElementById("lightButton");
  const muteButton = doc.getElementById("muteButton");
  const pauseButton = doc.getElementById("pauseButton");
  const seedButton = doc.getElementById("seedButton");
  const seedReadout = doc.getElementById("seedReadout");
  const loadSignal = doc.getElementById("loadSignal");
  const machineSignal = doc.getElementById("machineSignal");
  const viewportSignal = doc.getElementById("viewportSignal");
  const connectionSignal = doc.getElementById("connectionSignal");
  const jitterSignal = doc.getElementById("jitterSignal");
  const pointerSignal = doc.getElementById("pointerSignal");
  const lightSignal = doc.getElementById("lightSignal");
  const lightVideo = doc.getElementById("lightVideo");
  const lightSampler = doc.getElementById("lightSampler");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const signals = collectSignals();
  const seed = hashString(JSON.stringify(signals));
  const random = mulberry32(seed);
  const state = {
    seed,
    random,
    signals,
    reducedMotion: reducedMotionQuery.matches,
    running: false,
    blocked: false,
    muted: false,
    paused: false,
    energy: 0,
    jitter: 0,
    drift: 0,
    light: {
      active: false,
      available: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      denied: false,
      brightness: 0,
      hue: 0,
      saturation: 0,
      movement: 0,
      color: [0, 0, 0]
    },
    pointer: {
      active: false,
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      nx: 0.5,
      ny: 0.5,
      speed: 0,
      lastX: window.innerWidth * 0.5,
      lastY: window.innerHeight * 0.5,
      lastT: performance.now()
    }
  };

  seedReadout.textContent = `seed ${seed.toString(16).padStart(8, "0").slice(-6)}`;

  let visualStage;
  let audioEngine;
  let lightInstrument;

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      requestStart({ gesture: false, source: "autoplay" });
    }, 420);
  });

  startButton.addEventListener("click", () => {
    requestStart({ gesture: true, source: "button" });
  });

  controlsButton.addEventListener("click", () => {
    setControlsOpen(!root.classList.contains("controls-open"));
  });

  lightButton.addEventListener("click", async () => {
    await requestStart({ gesture: true, source: "light button" });
    if (state.light.active) {
      lightInstrument.stop();
    } else {
      await lightInstrument.start();
    }
    renderSignals();
  });

  seedButton.addEventListener("click", async () => {
    await requestStart({ gesture: true, source: "seed button" });
    dropSeed(window.innerWidth * 0.5, window.innerHeight * 0.5, 0.9);
  });

  muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    audioEngine.setMuted(state.muted);
    muteButton.setAttribute("aria-pressed", String(state.muted));
    muteButton.textContent = state.muted ? "Unmute" : "Mute";
    setStatus(state.muted ? "muted" : state.paused ? "paused" : state.running ? "sound running" : "waiting for sound");
  });

  pauseButton.addEventListener("click", async () => {
    if (!state.running) {
      await requestStart({ gesture: true, source: "pause button" });
      return;
    }
    state.paused = !state.paused;
    pauseButton.setAttribute("aria-pressed", String(state.paused));
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
    audioEngine.setPaused(state.paused);
    setStatus(state.paused ? "paused" : "sound running");
  });

  infoButton.addEventListener("click", () => {
    const hidden = root.classList.toggle("notes-hidden");
    infoButton.setAttribute("aria-expanded", String(!hidden));
    infoButton.textContent = "Notes";
  });

  signalsButton.addEventListener("click", () => {
    const hidden = root.classList.toggle("signals-hidden");
    signalsButton.setAttribute("aria-expanded", String(!hidden));
    signalsButton.textContent = "Signals";
  });

  doc.addEventListener("pointermove", (event) => {
    updatePointer(event.clientX, event.clientY);
    if (event.buttons === 1 && !isControlEvent(event)) {
      visualStage.addTrail(event.clientX, event.clientY, 0.32);
    }
  }, { passive: true });

  doc.addEventListener("pointerdown", async (event) => {
    const insideControls = event.target && event.target.closest("#controlRow, #controlsButton");
    if (root.classList.contains("controls-open") && !insideControls) {
      setControlsOpen(false);
    }
    updatePointer(event.clientX, event.clientY);
    if (isControlEvent(event)) return;
    await requestStart({ gesture: true, source: "field" });
    dropSeed(event.clientX, event.clientY, 1);
  });

  doc.addEventListener("keydown", async (event) => {
    if (event.key === "Escape") {
      setControlsOpen(false);
      return;
    }
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    if (["a", "button", "input", "select", "textarea"].includes(tag)) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      await requestStart({ gesture: true, source: "keyboard" });
      dropSeed(window.innerWidth * 0.5, window.innerHeight * 0.5, 0.85);
    }
  });

  window.addEventListener("resize", () => {
    signals.viewport = `${window.innerWidth}×${window.innerHeight} @ ${formatNumber(window.devicePixelRatio || 1, 2)}x`;
    renderSignals();
  });

  reducedMotionQuery.addEventListener("change", (event) => {
    state.reducedMotion = event.matches;
    visualStage.rebuild();
  });

  doc.addEventListener("visibilitychange", () => {
    audioEngine.setPageHidden(doc.hidden);
  });

  async function requestStart({ gesture, source }) {
    if (!audioEngine.supported) {
      setStatus("audio not supported");
      soundHint.textContent = "This browser does not expose the Web Audio API.";
      return false;
    }

    const started = await audioEngine.start({ gesture });
    state.running = started;
    state.blocked = !started;

    if (started) {
      root.classList.remove("is-sound-blocked");
      root.classList.add("is-sound-running");
      statePill.dataset.source = source;
      startButton.textContent = "Soundscape running";
      soundHint.textContent = "Click the field, drag slowly, or press Space to add a seed.";
      setStatus(state.muted ? "muted" : state.paused ? "paused" : "sound running");
      return true;
    }

    root.classList.remove("is-sound-running");
    root.classList.add("is-sound-blocked");
    startButton.textContent = "Enter OpenScape";
    soundHint.textContent = "Autoplay was blocked. Press Enter OpenScape or click the field to start sound.";
    setStatus("autoplay blocked");
    return false;
  }

  function setControlsOpen(open) {
    root.classList.toggle("controls-open", open);
    controlsButton.setAttribute("aria-expanded", String(open));
    controlsButton.textContent = open ? "Close" : "Tune";
  }

  function setStatus(text) {
    stateText.textContent = text;
    root.classList.toggle("is-sound-paused", text === "paused" || text === "muted");
  }

  function isControlEvent(event) {
    return Boolean(event.target && event.target.closest("button, a, .topbar, .control-row, .intro-panel, .signal-console"));
  }

  function updatePointer(x, y) {
    const now = performance.now();
    const elapsed = Math.max(16, now - state.pointer.lastT);
    const dx = x - state.pointer.lastX;
    const dy = y - state.pointer.lastY;
    const speed = Math.min(1, Math.hypot(dx, dy) / elapsed / 1.8);

    state.pointer.active = true;
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.nx = clamp(x / Math.max(1, window.innerWidth), 0, 1);
    state.pointer.ny = clamp(y / Math.max(1, window.innerHeight), 0, 1);
    state.pointer.speed = speed;
    state.pointer.lastX = x;
    state.pointer.lastY = y;
    state.pointer.lastT = now;
    state.energy = Math.min(1, state.energy + 0.03 + speed * 0.12);
  }

  function dropSeed(x, y, intensity) {
    updatePointer(x, y);
    state.energy = Math.min(1, state.energy + 0.34 * intensity);
    visualStage.addBloom(x, y, intensity);
    audioEngine.playAt(x, y, intensity);
    renderSignals();
  }

  function renderSignals() {
    const drift = Math.abs(Math.round(Date.now() - performance.now() - performance.timeOrigin));
    state.drift = Number.isFinite(drift) ? drift : 0;
    loadSignal.textContent = `${signals.load} ms, drift ${state.drift} ms`;
    machineSignal.textContent = signals.memory === "unknown"
      ? `${signals.cores} cores, memory private`
      : `${signals.cores} cores, ${signals.memory} GB memory`;
    viewportSignal.textContent = signals.viewport;
    connectionSignal.textContent = signals.connection;
    jitterSignal.textContent = `${formatNumber(state.jitter, 2)} ms average`;
    pointerSignal.textContent = state.pointer.active
      ? `${Math.round(state.pointer.nx * 100)}% x, ${Math.round(state.pointer.ny * 100)}% y, speed ${formatNumber(state.pointer.speed, 2)}`
      : "dormant";
    if (!state.light.available) {
      lightSignal.textContent = "camera unavailable";
    } else if (state.light.denied) {
      lightSignal.textContent = "permission blocked";
    } else if (!state.light.active) {
      lightSignal.textContent = "camera off";
    } else {
      lightSignal.textContent = `${Math.round(state.light.brightness * 100)}% bright, hue ${Math.round(state.light.hue)}°, sat ${Math.round(state.light.saturation * 100)}%`;
    }
  }

  function startJitterSampler() {
    const samples = [];
    let last = performance.now();

    function tick() {
      const now = performance.now();
      const delta = now - last;
      last = now;
      samples.push(Math.abs(delta - 120));
      if (samples.length > 36) samples.shift();
      state.jitter = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      state.energy *= 0.992;
      renderSignals();
      window.setTimeout(tick, 120);
    }

    window.setTimeout(tick, 120);
  }

  function collectSignals() {
    const nav = performance.getEntriesByType("navigation")[0];
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const load = nav
      ? Math.round((nav.responseEnd || 0) + (nav.domInteractive || 0) + (nav.duration || 0))
      : Math.round(performance.now());
    const connectionText = connection
      ? [connection.effectiveType || "type private", connection.downlink ? `${connection.downlink} Mbps` : "speed private", connection.rtt ? `${connection.rtt} ms` : "rtt private"].join(", ")
      : "not exposed by browser";

    return {
      load,
      cores: navigator.hardwareConcurrency || 1,
      memory: navigator.deviceMemory || "unknown",
      viewport: `${window.innerWidth}×${window.innerHeight} @ ${formatNumber(window.devicePixelRatio || 1, 2)}x`,
      screen: `${window.screen.width}×${window.screen.height}×${window.screen.colorDepth}`,
      connection: connectionText,
      timezoneOffset: new Date().getTimezoneOffset(),
      language: navigator.language || "private",
      timeStart: Date.now() % 86400000,
      perfStart: Math.round(performance.now() * 1000) / 1000
    };
  }

  function hashString(input) {
    let h = 1779033703 ^ input.length;
    for (let i = 0; i < input.length; i += 1) {
      h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function mulberry32(a) {
    return function nextRandom() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) return "0";
    return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  class VisualStage {
    constructor(targetCanvas, sharedState) {
      this.canvas = targetCanvas;
      this.ctx = targetCanvas.getContext("2d", { alpha: false });
      this.state = sharedState;
      this.particles = [];
      this.blooms = [];
      this.trails = [];
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.lastTime = 0;
      this.lastPaint = 0;
      this.palette = [
        [118, 89, 255],
        [72, 139, 255],
        [44, 214, 238],
        [187, 82, 255],
        [116, 99, 178]
      ];
      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);
      window.addEventListener("resize", this.resize);
      this.resize();
    }

    start() {
      window.requestAnimationFrame(this.draw);
    }

    rebuild() {
      this.resize();
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(this.state.reducedMotion ? 1 : 1.55, window.devicePixelRatio || 1);
      this.canvas.width = Math.max(1, Math.floor(this.width * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(this.height * this.dpr));
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.seedParticles();
      this.paintBase();
    }

    seedParticles() {
      const area = this.width * this.height;
      const targetCount = this.state.reducedMotion
        ? Math.min(130, Math.max(58, Math.floor(area / 14500)))
        : Math.min(390, Math.max(130, Math.floor(area / 5200)));
      this.particles = Array.from({ length: targetCount }, (_, index) => ({
        x: this.state.random() * this.width,
        y: this.state.random() * this.height,
        radius: 0.55 + this.state.random() * (index % 7 === 0 ? 2.4 : 1.45),
        angle: this.state.random() * Math.PI * 2,
        speed: 0.08 + this.state.random() * 0.38,
        phase: this.state.random() * Math.PI * 2,
        color: Math.floor(this.state.random() * this.palette.length),
        wobble: 0.6 + this.state.random() * 1.8
      }));
    }

    paintBase() {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(5, 4, 6)";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    addTrail(x, y, intensity) {
      if (this.state.reducedMotion && this.trails.length > 16) return;
      this.trails.push({
        x,
        y,
        age: 0,
        life: 900 + this.state.random() * 900,
        intensity,
        color: Math.floor(this.state.random() * this.palette.length)
      });
      if (this.trails.length > 90) this.trails.splice(0, this.trails.length - 90);
    }

    addBloom(x, y, intensity) {
      const bloom = {
        x,
        y,
        age: 0,
        life: 2600 + this.state.random() * 2200,
        intensity,
        color: Math.floor((x / Math.max(1, this.width)) * this.palette.length) % this.palette.length,
        spokes: []
      };
      const count = this.state.reducedMotion ? 18 : 42;
      for (let i = 0; i < count; i += 1) {
        bloom.spokes.push({
          angle: this.state.random() * Math.PI * 2,
          distance: 12 + this.state.random() * (70 + intensity * 135),
          radius: 0.55 + this.state.random() * 2.2,
          drift: (this.state.random() - 0.5) * 18,
          color: Math.floor(this.state.random() * this.palette.length)
        });
      }
      this.blooms.push(bloom);
      if (this.blooms.length > 18) this.blooms.shift();
    }

    draw(now) {
      const minFrame = this.state.reducedMotion ? 84 : 16;
      if (now - this.lastPaint < minFrame) {
        window.requestAnimationFrame(this.draw);
        return;
      }

      const delta = Math.min(64, now - (this.lastTime || now));
      this.lastTime = now;
      this.lastPaint = now;
      const t = now * 0.001;
      const ctx = this.ctx;
      const fade = this.state.reducedMotion ? 0.2 : 0.105 - this.state.energy * 0.03;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(5, 4, 6, ${clamp(fade, 0.055, 0.24)})`;
      ctx.fillRect(0, 0, this.width, this.height);

      this.drawFog(ctx, t);
      this.drawParticles(ctx, t, delta);
      this.drawBlooms(ctx, delta);
      this.drawTrails(ctx, delta);

      window.requestAnimationFrame(this.draw);
    }

    drawFog(ctx, t) {
      const points = [
        [
          0.18 + Math.sin(t * 0.13) * 0.12 + Math.cos(t * 0.041) * 0.05,
          0.22 + Math.cos(t * 0.1) * 0.09 + Math.sin(t * 0.052) * 0.04,
          440 + Math.sin(t * 0.17) * 82,
          [76, 48, 172],
          0.052 + Math.sin(t * 0.19) * 0.012
        ],
        [
          0.79 + Math.sin(t * 0.095) * 0.1 + Math.cos(t * 0.033) * 0.04,
          0.3 + Math.cos(t * 0.12) * 0.085 + Math.sin(t * 0.047) * 0.05,
          390 + Math.cos(t * 0.16) * 72,
          [34, 92, 180],
          0.047 + Math.cos(t * 0.18) * 0.011
        ],
        [
          0.48 + Math.sin(t * 0.082) * 0.11 + Math.cos(t * 0.037) * 0.07,
          0.82 + Math.cos(t * 0.088) * 0.1 + Math.sin(t * 0.061) * 0.04,
          500 + Math.sin(t * 0.14 + 1.4) * 92,
          [122, 46, 178],
          0.05 + Math.sin(t * 0.15 + 0.8) * 0.012
        ],
        [
          0.57 + Math.sin(t * 0.046) * 0.16,
          0.52 + Math.cos(t * 0.058) * 0.11,
          620 + Math.cos(t * 0.1) * 120,
          [28, 64, 120],
          0.027 + Math.sin(t * 0.12) * 0.006
        ]
      ];
      if (this.state.light.active) {
        points.push([
          0.5 + (this.state.light.hue / 360 - 0.5) * 0.34,
          0.82 - this.state.light.brightness * 0.58,
          220 + this.state.light.brightness * 270,
          this.state.light.color,
          0.045 + this.state.light.saturation * 0.105 + this.state.light.brightness * 0.045
        ]);
      }
      ctx.globalCompositeOperation = "screen";
      for (const [nx, ny, radius, color, alpha] of points) {
        const x = nx * this.width;
        const y = ny * this.height;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha + this.state.energy * 0.04})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawParticles(ctx, t, delta) {
      ctx.globalCompositeOperation = "lighter";
      const pointer = this.state.pointer;
      const speedScale = this.state.reducedMotion ? 0.32 : 1;
      for (const particle of this.particles) {
        const swirl = Math.sin(t * particle.wobble + particle.phase) * 0.6;
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const pull = pointer.active ? clamp(1 - distance / 260, 0, 1) * (0.4 + pointer.speed) : 0;
        particle.angle += 0.0015 * delta * speedScale + pull * 0.012;
        particle.x += Math.cos(particle.angle + swirl) * particle.speed * delta * speedScale + (dx / distance) * pull * 0.22;
        particle.y += Math.sin(particle.angle - swirl) * particle.speed * delta * speedScale + (dy / distance) * pull * 0.22;

        if (particle.x < -8) particle.x = this.width + 8;
        if (particle.x > this.width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = this.height + 8;
        if (particle.y > this.height + 8) particle.y = -8;

        const color = this.palette[particle.color];
        const alpha = 0.18 + (particle.radius / 4) * 0.22 + pull * 0.28;
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp(alpha, 0.1, 0.62)})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius + pull * 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBlooms(ctx, delta) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = this.blooms.length - 1; i >= 0; i -= 1) {
        const bloom = this.blooms[i];
        bloom.age += delta;
        const progress = bloom.age / bloom.life;
        if (progress >= 1) {
          this.blooms.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - progress, 3);
        const alpha = (1 - progress) * (0.34 + bloom.intensity * 0.28);
        const mainColor = this.palette[bloom.color];
        const radius = 18 + ease * (160 + bloom.intensity * 240);
        const gradient = ctx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, radius);
        gradient.addColorStop(0, `rgba(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]}, ${alpha})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, radius, 0, Math.PI * 2);
        ctx.fill();

        for (const spoke of bloom.spokes) {
          const color = this.palette[spoke.color];
          const distance = spoke.distance * ease;
          const wobble = Math.sin(progress * Math.PI * 2 + spoke.drift) * 6;
          const x = bloom.x + Math.cos(spoke.angle) * distance + wobble;
          const y = bloom.y + Math.sin(spoke.angle) * distance - wobble;
          ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.92})`;
          ctx.beginPath();
          ctx.arc(x, y, spoke.radius * (1 + progress * 1.8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawTrails(ctx, delta) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = this.trails.length - 1; i >= 0; i -= 1) {
        const trail = this.trails[i];
        trail.age += delta;
        const progress = trail.age / trail.life;
        if (progress >= 1) {
          this.trails.splice(i, 1);
          continue;
        }
        const color = this.palette[trail.color];
        const alpha = (1 - progress) * 0.22 * trail.intensity;
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, 3 + progress * 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  class LightInstrument {
    constructor(sharedState, video, sampler, engine, stage) {
      this.state = sharedState;
      this.video = video;
      this.sampler = sampler;
      this.ctx = sampler.getContext("2d", { willReadFrequently: true });
      this.audioEngine = engine;
      this.visualStage = stage;
      this.stream = null;
      this.sampleTimer = 0;
      this.lastBrightness = 0;
      this.lastHue = 0;
      this.lastSaturation = 0;
      this.lastVisualBloom = 0;
      this.sampler.width = 32;
      this.sampler.height = 24;
    }

    async start() {
      if (!this.state.light.available) {
        setStatus("camera unavailable");
        soundHint.textContent = "This browser does not expose camera access to the page.";
        renderSignals();
        return false;
      }

      setStatus("asking camera");
      soundHint.textContent = "Your browser will ask for camera access. OpenScapes samples light and color only inside this page.";

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 320 },
            height: { ideal: 240 }
          }
        });
        this.video.srcObject = this.stream;
        await this.video.play();
      } catch (_error) {
        this.state.light.active = false;
        this.state.light.denied = true;
        root.classList.remove("is-light-active");
        lightButton.setAttribute("aria-pressed", "false");
        lightButton.textContent = "Light";
        setStatus(this.state.running ? "sound running" : "camera blocked");
        soundHint.textContent = "Camera access was blocked. The default no-permission soundscape still works.";
        renderSignals();
        return false;
      }

      this.state.light.active = true;
      this.state.light.denied = false;
      root.classList.add("is-light-active");
      lightButton.setAttribute("aria-pressed", "true");
      lightButton.textContent = "Stop light";
      setStatus("light instrument");
      soundHint.textContent = "Camera light is now an instrument: move color, shadow, or brightness through the frame.";
      this.sample();
      renderSignals();
      return true;
    }

    stop() {
      window.clearTimeout(this.sampleTimer);
      if (this.stream) {
        for (const track of this.stream.getTracks()) track.stop();
      }
      this.stream = null;
      this.video.srcObject = null;
      this.state.light.active = false;
      this.state.light.brightness = 0;
      this.state.light.saturation = 0;
      this.state.light.movement = 0;
      root.classList.remove("is-light-active");
      lightButton.setAttribute("aria-pressed", "false");
      lightButton.textContent = "Light";
      setStatus(this.state.running ? "sound running" : "waiting for sound");
      soundHint.textContent = this.state.running
        ? "Click the field, drag slowly, or press Space to add a seed."
        : "If the room is quiet, press Enter OpenScape or click the field.";
      renderSignals();
    }

    sample() {
      if (!this.state.light.active) return;

      if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
        const width = this.sampler.width;
        const height = this.sampler.height;
        this.ctx.drawImage(this.video, 0, 0, width, height);
        const pixels = this.ctx.getImageData(0, 0, width, height).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          count += 1;
        }
        r /= count;
        g /= count;
        b /= count;
        const [hue, saturation] = rgbToHsl(r, g, b);
        const brightness = clamp((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, 0, 1);
        const hueMove = Math.min(Math.abs(hue - this.lastHue), 360 - Math.abs(hue - this.lastHue)) / 180;
        const movement = Math.min(1,
          Math.abs(brightness - this.lastBrightness) * 2.4
          + hueMove * 0.32
          + Math.abs(saturation - this.lastSaturation) * 0.62
        );

        this.state.light.brightness = brightness;
        this.state.light.hue = hue;
        this.state.light.saturation = saturation;
        this.state.light.movement = movement;
        this.state.light.color = [Math.round(r), Math.round(g), Math.round(b)];
        this.audioEngine.updateLight(this.state.light);
        this.audioEngine.playLight(this.state.light);

        const now = performance.now();
        if (now - this.lastVisualBloom > 620 && (movement > 0.045 || brightness > 0.62 || saturation > 0.32)) {
          const x = (hue / 360) * window.innerWidth;
          const y = (1 - brightness) * window.innerHeight;
          this.visualStage.addBloom(x, y, clamp(0.2 + movement * 2.8 + saturation * 0.38, 0.2, 0.94));
          this.lastVisualBloom = now;
        }

        this.lastBrightness = brightness;
        this.lastHue = hue;
        this.lastSaturation = saturation;
        renderSignals();
      }

      const delay = this.state.reducedMotion ? 260 : 120;
      this.sampleTimer = window.setTimeout(() => window.requestAnimationFrame(() => this.sample()), delay);
    }
  }

  function rgbToHsl(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    if (max === min) return [0, 0, light];
    const delta = max - min;
    const saturation = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let hue;
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    return [hue * 60, saturation, light];
  }

  class AudioEngine {
    constructor(sharedState) {
      this.state = sharedState;
      this.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.supported = Boolean(this.AudioContext);
      this.ctx = null;
      this.master = null;
      this.input = null;
      this.delay = null;
      this.feedback = null;
      this.convolver = null;
      this.wet = null;
      this.drones = [];
      this.started = false;
      this.pulseTimer = 0;
      this.lastLightPulse = 0;
      this.lightControl = {
        brightness: 0,
        hue: 0,
        saturation: 0,
        movement: 0,
        contrast: 0
      };
      this.volume = 0.46;
      this.scale = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
      this.baseFrequency = 46 + (sharedState.seed % 39);
    }

    async ensureContext() {
      if (!this.supported) return false;
      if (this.ctx) return true;

      this.ctx = new this.AudioContext({ latencyHint: "interactive" });
      const ctx = this.ctx;
      this.input = ctx.createGain();
      this.input.gain.value = 0.84;

      this.master = ctx.createGain();
      this.master.gain.value = 0;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 24;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.02;
      compressor.release.value = 0.28;

      this.delay = ctx.createDelay(7);
      this.delay.delayTime.value = 0.56 + this.state.random() * 0.22;
      this.feedback = ctx.createGain();
      this.feedback.gain.value = 0.28;
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.24;
      this.convolver = ctx.createConvolver();
      this.convolver.buffer = this.makeImpulse(4.8, 2.7);

      this.input.connect(this.master);
      this.input.connect(this.delay);
      this.delay.connect(this.feedback);
      this.feedback.connect(this.delay);
      this.delay.connect(this.convolver);
      this.convolver.connect(this.wet);
      this.wet.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(ctx.destination);
      return true;
    }

    async start() {
      const ready = await this.ensureContext();
      if (!ready) return false;
      try {
        await this.ctx.resume();
      } catch (_error) {
        return false;
      }
      if (this.ctx.state !== "running") return false;

      if (!this.started) {
        this.started = true;
        this.startDrones();
        this.queuePulse();
      }
      this.state.paused = false;
      this.rampVolume();
      return true;
    }

    setMuted(muted) {
      this.state.muted = muted;
      this.rampVolume();
    }

    setPaused(paused) {
      this.state.paused = paused;
      this.rampVolume();
    }

    setPageHidden(hidden) {
      if (!this.master || !this.ctx) return;
      const target = hidden ? 0.03 : this.targetVolume();
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, hidden ? 0.65 : 0.9);
    }

    targetVolume() {
      if (this.state.muted || this.state.paused) return 0;
      return this.volume;
    }

    rampVolume() {
      if (!this.master || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.targetVolume(), now, 0.7);
    }

    startDrones() {
      const ctx = this.ctx;
      const droneCount = this.state.reducedMotion ? 3 : 5;
      for (let i = 0; i < droneCount; i += 1) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const ratio = this.scale[(i * 2 + (this.state.seed % this.scale.length)) % this.scale.length];
        const octave = i < 2 ? 0.5 : i < 4 ? 1 : 2;
        osc.type = i % 3 === 0 ? "triangle" : "sine";
        osc.frequency.value = this.baseFrequency * ratio * octave;
        osc.detune.value = (this.state.random() - 0.5) * 14;
        filter.type = "lowpass";
        filter.frequency.value = 460 + this.state.random() * 620;
        filter.Q.value = 0.6 + this.state.random() * 2.2;
        gain.gain.value = 0;
        osc.connect(filter);
        filter.connect(gain);
        if (panner) {
          panner.pan.value = -0.72 + (1.44 * i) / Math.max(1, droneCount - 1);
          gain.connect(panner);
          panner.connect(this.input);
        } else {
          gain.connect(this.input);
        }
        osc.start();
        gain.gain.setTargetAtTime(0.018 + this.state.random() * 0.018, ctx.currentTime + i * 0.18, 2.8);
        this.drones.push({ osc, filter, gain, panner, ratio, octave, index: i });
      }
      window.setInterval(() => this.morphDrones(), 5200);
    }

    updateLight(light) {
      if (!this.ctx || this.ctx.state !== "running" || this.state.paused || !light.active) return;
      const now = this.ctx.currentTime;
      const brightness = clamp(light.brightness, 0, 1);
      const hue = clamp(light.hue / 360, 0, 1);
      const saturation = clamp(light.saturation, 0, 1);
      const movement = clamp(light.movement, 0, 1);
      const contrast = Math.abs(brightness - 0.5) * 2;
      const darkness = 1 - brightness;
      const smoothing = 0.26;

      this.lightControl.brightness += (brightness - this.lightControl.brightness) * smoothing;
      this.lightControl.hue += (hue - this.lightControl.hue) * smoothing;
      this.lightControl.saturation += (saturation - this.lightControl.saturation) * smoothing;
      this.lightControl.movement += (movement - this.lightControl.movement) * 0.38;
      this.lightControl.contrast += (contrast - this.lightControl.contrast) * smoothing;

      for (const drone of this.drones) {
        const degreeShift = Math.floor((this.lightControl.hue * 1.35 + drone.index * 0.19) * this.scale.length) % this.scale.length;
        const ratio = this.scale[(drone.index + degreeShift) % this.scale.length];
        const octaveTilt = 1 + (brightness - 0.5) * 0.09 + saturation * 0.025;
        const filterTarget = 170 + brightness * 4200 + saturation * 1450 + movement * 2200;
        const gainTarget = 0.012
          + brightness * 0.025
          + darkness * 0.01
          + saturation * 0.012
          + movement * 0.026;
        drone.osc.frequency.setTargetAtTime(this.baseFrequency * ratio * drone.octave * octaveTilt, now, 0.62);
        drone.filter.frequency.setTargetAtTime(filterTarget, now, 0.42);
        drone.filter.Q.setTargetAtTime(0.72 + saturation * 3.4 + contrast * 1.1, now, 0.5);
        drone.gain.gain.setTargetAtTime(gainTarget, now, 0.54);
        if (drone.panner) {
          const panTarget = clamp((this.lightControl.hue - 0.5) * 1.15 + (drone.index % 2 ? -0.18 : 0.18), -0.95, 0.95);
          drone.panner.pan.setTargetAtTime(panTarget, now, 0.56);
        }
      }

      if (this.delay && this.feedback && this.wet) {
        this.delay.delayTime.setTargetAtTime(0.42 + darkness * 0.52 + saturation * 0.18, now, 0.74);
        this.feedback.gain.setTargetAtTime(0.22 + darkness * 0.18 + saturation * 0.08, now, 0.86);
        this.wet.gain.setTargetAtTime(0.18 + brightness * 0.18 + movement * 0.16, now, 0.64);
      }
    }

    morphDrones() {
      if (!this.ctx || this.ctx.state !== "running" || this.state.paused) return;
      const now = this.ctx.currentTime;
      const pointer = this.state.pointer;
      const light = this.state.light;
      const lightHue = light.active ? light.hue / 360 : 0;
      const lightBrightness = light.active ? light.brightness : 0;
      for (const drone of this.drones) {
        const degreeShift = Math.floor((pointer.nx * 0.7 + lightHue * 0.9 + this.state.random() * 0.35) * this.scale.length) % this.scale.length;
        const ratio = this.scale[(drone.index + degreeShift) % this.scale.length];
        const brightness = 360 + (1 - pointer.ny) * 820 + lightBrightness * 1550 + this.state.jitter * 8;
        drone.osc.frequency.setTargetAtTime(this.baseFrequency * ratio * drone.octave * (1 + lightBrightness * 0.018), now, 2.5);
        drone.filter.frequency.setTargetAtTime(brightness, now, 2.2);
        drone.gain.gain.setTargetAtTime(0.014 + this.state.energy * 0.018 + lightBrightness * 0.014 + this.state.random() * 0.012, now, 2.8);
        if (drone.panner) drone.panner.pan.setTargetAtTime((pointer.nx - 0.5) * 0.34 + (lightHue - 0.5) * 0.42 + (this.state.random() - 0.5) * 0.46, now, 2.4);
      }
    }

    queuePulse() {
      window.clearTimeout(this.pulseTimer);
      const light = this.state.light;
      const wait = 1350 + this.state.random() * 3600 + Math.min(900, this.state.jitter * 35) - (light.active ? light.brightness * 520 : 0);
      this.pulseTimer = window.setTimeout(() => {
        if (this.ctx && this.ctx.state === "running" && !this.state.paused && !this.state.muted) {
          const x = this.state.random() * window.innerWidth;
          const y = this.state.random() * window.innerHeight;
          this.playAt(x, y, 0.28 + this.state.random() * 0.28);
        }
        this.queuePulse();
      }, wait);
    }

    playAt(x, y, intensity) {
      if (!this.ctx || this.ctx.state !== "running" || this.state.paused || this.state.muted) return;
      const ctx = this.ctx;
      const nx = clamp(x / Math.max(1, window.innerWidth), 0, 1);
      const ny = clamp(y / Math.max(1, window.innerHeight), 0, 1);
      const degree = Math.floor((nx * this.scale.length * 1.9 + this.state.jitter * 0.08) % this.scale.length);
      const octave = ny < 0.28 ? 2 : ny < 0.62 ? 1 : 0.5;
      const base = this.baseFrequency * this.scale[degree] * octave;
      const drift = 1 + (this.state.random() - 0.5) * 0.018;
      const freq = base * drift;
      const pan = nx * 2 - 1;
      const decay = 2.4 + (1 - ny) * 3.8 + intensity * 1.8;
      const cutoff = 520 + (1 - ny) * 2300 + this.state.pointer.speed * 1200;
      const gainLevel = 0.055 + intensity * 0.075;
      this.makeVoice(freq, pan, decay, cutoff, gainLevel);
      if (intensity > 0.72) {
        this.makeVoice(freq * (this.scale[(degree + 3) % this.scale.length] / this.scale[degree]), pan * -0.65, decay * 0.8, cutoff * 0.72, gainLevel * 0.42);
      }
    }

    playLight(light) {
      if (!this.ctx || this.ctx.state !== "running" || this.state.paused || this.state.muted || !light.active) return;
      const nowMs = performance.now();
      const threshold = this.state.reducedMotion ? 760 : 260;
      const extremeLight = light.brightness > 0.74 || light.brightness < 0.18;
      const colorShift = light.saturation > 0.22 && light.movement > 0.025;
      const shouldPulse = light.movement > 0.032 || colorShift || (extremeLight && nowMs - this.lastLightPulse > 720);
      if (!shouldPulse || nowMs - this.lastLightPulse < threshold) return;

      const huePosition = light.hue / 360;
      const degree = Math.floor(huePosition * this.scale.length) % this.scale.length;
      const octave = light.brightness > 0.72 ? 2 : light.brightness > 0.28 ? 1 : 0.5;
      const darkness = 1 - light.brightness;
      const freq = this.baseFrequency * this.scale[degree] * octave * (1 + light.saturation * 0.055 - darkness * 0.018);
      const pan = clamp(huePosition * 2 - 1 + (light.brightness - 0.5) * 0.22, -1, 1);
      const decay = 1.8 + light.brightness * 4.8 + darkness * 2.3 + light.saturation * 2.1;
      const cutoff = 220 + light.brightness * 5200 + light.saturation * 1500 + light.movement * 1800;
      const gainLevel = 0.04 + light.movement * 0.13 + light.brightness * 0.055 + darkness * 0.018;
      this.makeVoice(freq, pan, decay, cutoff, gainLevel);
      if (light.saturation > 0.2 || light.movement > 0.12 || light.brightness < 0.2) {
        this.makeVoice(freq * 1.5, pan * -0.5, decay * 0.72, cutoff * 0.74, gainLevel * 0.34);
      }
      this.lastLightPulse = nowMs;
    }

    makeVoice(freq, pan, decay, cutoff, gainLevel) {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const companion = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      osc.type = "sine";
      companion.type = "triangle";
      osc.frequency.value = freq;
      companion.frequency.value = freq * 0.5;
      companion.detune.value = (this.state.random() - 0.5) * 9;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(180, cutoff), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(140, cutoff * 0.32), now + decay);
      filter.Q.value = 0.7 + this.state.random() * 2.3;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainLevel, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(filter);
      companion.connect(filter);
      filter.connect(gain);
      if (panner) {
        panner.pan.value = pan;
        gain.connect(panner);
        panner.connect(this.input);
      } else {
        gain.connect(this.input);
      }
      osc.start(now);
      companion.start(now + 0.015);
      osc.stop(now + decay + 0.2);
      companion.stop(now + decay + 0.2);
    }

    makeImpulse(seconds, decay) {
      const rate = this.ctx.sampleRate;
      const length = Math.max(1, Math.floor(rate * seconds));
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let channel = 0; channel < 2; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          const n = i / length;
          data[i] = (this.state.random() * 2 - 1) * Math.pow(1 - n, decay);
        }
      }
      return impulse;
    }
  }

  visualStage = new VisualStage(canvas, state);
  audioEngine = new AudioEngine(state);
  lightInstrument = new LightInstrument(state, lightVideo, lightSampler, audioEngine, visualStage);
  visualStage.start();
  startJitterSampler();
  renderSignals();
})();
