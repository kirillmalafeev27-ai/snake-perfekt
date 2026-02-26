const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelValue = document.getElementById("levelValue");
const livesValue = document.getElementById("livesValue");
const seqValue = document.getElementById("seqValue");
const speedValue = document.getElementById("speedValue");
const statusMessage = document.getElementById("statusMessage");
const pauseBtn = document.getElementById("pauseBtn");
const resetSeqBtn = document.getElementById("resetSeqBtn");
const speedUpBtn = document.getElementById("speedUp");
const speedDownBtn = document.getElementById("speedDown");

const WORLD_W = 1350;
const WORLD_H = 900;
const PANEL_H = 150;
const PLAYFIELD = { x: 75, y: 76, w: WORLD_W - 150, h: WORLD_H - 240 };

const snakeSize = 31;
const fruitSize = snakeSize;
const collisionRadius = 45;
const baseSpeed = 3;
const speedMin = 2;
const speedMax = baseSpeed + 10;
const numFruits = 6;

const C = {
  red: "#ff4242",     // 0
  yellow: "#ffe636",  // 1
  blue: "#4294ff",    // 2
  purple: "#976bff",  // 3
  orange: "#ff9d4d",  // 4
  pink: "#ff69b4",    // 5
};

const baseFruitTypes = [
  { color: C.red, effect: "grow" },
  { color: C.yellow, effect: "speed_up" },
  { color: C.blue, effect: "slow_down" },
  { color: C.purple, effect: "extra_life" },
  { color: C.orange, effect: "invincible" },
  { color: C.pink, effect: "shrink" },
];

// 7 уровней для тренировки Perfekt (A1)
const levels = [
  {
    // 1: Ich habe eine Pizza gegessen. (Глагол haben)
    sequence: [C.orange, C.yellow, C.purple, C.pink, C.red],
    snakeSpeed: baseSpeed,
    description: ["gegessen.", "habe", "bin (ловушка)", "eine", "Ich", "Pizza"],
  },
  {
    // 2: Du bist nach Hause gegangen. (Глагол sein + движение)
    sequence: [C.yellow, C.pink, C.blue, C.orange, C.red],
    snakeSpeed: baseSpeed + 1,
    description: ["gegangen.", "Du", "nach", "hast (ловушка)", "Hause", "bist"],
  },
  {
    // 3: Er hat Fußball gespielt.
    sequence: [C.purple, C.pink, C.yellow, C.orange],
    snakeSpeed: baseSpeed + 2,
    description: ["spielen (ловушка)", "Fußball", "ist (ловушка)", "Er", "gespielt.", "hat"],
  },
  {
    // 4: Wir haben Wasser getrunken.
    sequence: [C.pink, C.purple, C.yellow, C.blue],
    snakeSpeed: baseSpeed + 3,
    description: ["sind (ловушка)", "Wasser", "getrunken.", "haben", "getrinkt (ловушка)", "Wir"],
  },
  {
    // 5: Ihr seid ins Kino gegangen.
    sequence: [C.orange, C.yellow, C.pink, C.red, C.purple],
    snakeSpeed: baseSpeed + 4,
    description: ["Kino", "seid", "habt (ловушка)", "gegangen.", "Ihr", "ins"],
  },
  {
    // 6: Sie hat Hausaufgaben gemacht.
    sequence: [C.purple, C.pink, C.red, C.yellow],
    snakeSpeed: baseSpeed + 5,
    description: ["Hausaufgaben", "gemacht.", "gemachen (ловушка)", "Sie", "ist (ловушка)", "hat"],
  },
  {
    // 7: Wir sind nach Hause geflogen.
    sequence: [C.blue, C.pink, C.red, C.purple, C.yellow],
    snakeSpeed: baseSpeed + 6,
    description: ["nach", "geflogen.", "Wir", "Hause", "geflogt (ловушка)", "sind"],
  }
];

const fruitLimits = {
  grow: 1,
  speed_up: 1,
  slow_down: 1,
  extra_life: 1,
  invincible: 1,
  shrink: 1,
};

let snakeSpeed = baseSpeed;
let snake = [{ x: WORLD_W / 2, y: WORLD_H / 2 }];
let snakeLength = 10;
let direction = "RIGHT";
let moveX = snakeSpeed;
let moveY = 0;
let lives = 100;
let paused = false;
let invincible = false;
let invincibleTimer = 0;
let collisionEnabled = false;
let startTime = performance.now();
let lastMoveTs = performance.now();
let running = true;

let currentLevel = 0;
let correctSequence = [...levels[currentLevel].sequence];
let pickedColors = [];
let statusText = "Perfekt! Sammle die Wörter (haben/sein + Partizip II)";
let statusUntil = performance.now() + 3500;
let fruitTypes = baseFruitTypes.map((item, i) => ({
  ...item,
  description: levels[currentLevel].description[i],
}));
let fruits = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  const value = (x) => x.toString(16).padStart(2, "0");
  return `#${value(r)}${value(g)}${value(b)}`;
}

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bColor = Math.round(a[2] + (b[2] - a[2]) * t);
  return rgbToHex(r, g, bColor);
}

function setStatus(text, duration = 1500) {
  statusText = text;
  statusUntil = performance.now() + duration;
  statusMessage.textContent = text;
}

function updateHud() {
  levelValue.textContent = `Level ${Math.min(currentLevel + 1, levels.length)}/${levels.length}`;
  livesValue.textContent = `Lives ${lives}`;
  seqValue.textContent = `Sequence ${pickedColors.length}/${correctSequence.length}`;
  speedValue.textContent = String(snakeSpeed);
}

function updateVelocityFromDirection() {
  if (direction === "UP") {
    moveX = 0;
    moveY = -snakeSpeed;
  } else if (direction === "DOWN") {
    moveX = 0;
    moveY = snakeSpeed;
  } else if (direction === "LEFT") {
    moveX = -snakeSpeed;
    moveY = 0;
  } else {
    moveX = snakeSpeed;
    moveY = 0;
  }
}

function setDirection(newDirection) {
  const opposite = {
    UP: "DOWN",
    DOWN: "UP",
    LEFT: "RIGHT",
    RIGHT: "LEFT",
  };
  if (opposite[direction] !== newDirection) {
    direction = newDirection;
    updateVelocityFromDirection();
  }
}

function changeSpeed(delta) {
  snakeSpeed = clamp(snakeSpeed + delta, speedMin, speedMax);
  updateVelocityFromDirection();
  updateHud();
}

function countFruitTypes(existingFruits) {
  const count = { grow: 0, speed_up: 0, slow_down: 0, extra_life: 0, invincible: 0, shrink: 0 };
  existingFruits.forEach((fruit) => {
    count[fruit.type.effect] += 1;
  });
  return count;
}

function spawnLimitedFruit(existingFruits) {
  const count = countFruitTypes(existingFruits);
  const available = fruitTypes.filter((type) => count[type.effect] < fruitLimits[type.effect]);
  if (available.length === 0) {
    return null;
  }
  const type = available[randomInRange(0, available.length - 1)];
  return {
    pos: {
      x: randomInRange(PLAYFIELD.x + 40, PLAYFIELD.x + PLAYFIELD.w - 40),
      y: randomInRange(PLAYFIELD.y + 40, PLAYFIELD.y + PLAYFIELD.h - 40),
    },
    type,
  };
}

function spawnFruits() {
  const list = [];
  while (list.length < numFruits) {
    const fruit = spawnLimitedFruit(list);
    if (!fruit) {
      break;
    }
    list.push(fruit);
  }
  return list;
}

function nextLevel() {
  currentLevel += 1;
  if (currentLevel >= levels.length) {
    setStatus("Alle Level geschafft! (Вы прошли все уровни!)", 4000);
    running = false;
    return;
  }
  const level = levels[currentLevel];
  correctSequence = [...level.sequence];
  snakeSpeed = clamp(level.snakeSpeed, speedMin, speedMax);
  fruitTypes = baseFruitTypes.map((item, i) => ({
    ...item,
    description: level.description[i],
  }));
  updateVelocityFromDirection();
  updateHud();
  setStatus(`Level ${currentLevel + 1}`, 1600);
}

function drawGlossyCircle(x, y, radius, color) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.arc(x + 3, y + 4, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const rgb = hexToRgb(color);
  const shine = rgbToHex(
    Math.min(255, rgb[0] + 50),
    Math.min(255, rgb[1] + 50),
    Math.min(255, rgb[2] + 50),
  );
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(x - radius / 3, y - radius / 3, Math.max(4, radius / 3), 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(now) {
  const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  bg.addColorStop(0, "#1a2456");
  bg.addColorStop(1, "#0b1027");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowA = ctx.createRadialGradient(180, 130, 30, 180, 130, 280);
  glowA.addColorStop(0, "rgba(255, 148, 76, 0.34)");
  glowA.addColorStop(1, "rgba(255, 148, 76, 0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowB = ctx.createRadialGradient(WORLD_W - 180, 150, 20, WORLD_W - 180, 150, 290);
  glowB.addColorStop(0, "rgba(80, 137, 255, 0.34)");
  glowB.addColorStop(1, "rgba(80, 137, 255, 0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const panel = ctx.createLinearGradient(0, WORLD_H - PANEL_H, 0, WORLD_H);
  panel.addColorStop(0, "#ff9f58");
  panel.addColorStop(1, "#d4592f");
  ctx.fillStyle = panel;
  ctx.fillRect(0, WORLD_H - PANEL_H, WORLD_W, PANEL_H);

  ctx.fillStyle = "#2f7452";
  roundRect(ctx, PLAYFIELD.x, PLAYFIELD.y + 8, PLAYFIELD.w, PLAYFIELD.h, 34, true, false);
  ctx.fillStyle = "#69d89d";
  roundRect(ctx, PLAYFIELD.x, PLAYFIELD.y, PLAYFIELD.w, PLAYFIELD.h, 30, true, false);

  ctx.strokeStyle = "rgba(139, 229, 182, 0.52)";
  ctx.lineWidth = 1;
  for (let x = PLAYFIELD.x + 40; x < PLAYFIELD.x + PLAYFIELD.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, PLAYFIELD.y + 10);
    ctx.lineTo(x, PLAYFIELD.y + PLAYFIELD.h - 10);
    ctx.stroke();
  }
  for (let y = PLAYFIELD.y + 40; y < PLAYFIELD.y + PLAYFIELD.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(PLAYFIELD.x + 10, y);
    ctx.lineTo(PLAYFIELD.x + PLAYFIELD.w - 10, y);
    ctx.stroke();
  }

  if (now < statusUntil && statusText) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    roundRect(ctx, WORLD_W / 2 - 320, 32, 640, 56, 14, true, false);
    ctx.fillStyle = "#2341a3";
    roundRect(ctx, WORLD_W / 2 - 324, 28, 640, 56, 14, true, false);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 28px Manrope";
    ctx.textAlign = "center";
    ctx.fillText(statusText, WORLD_W / 2, 65);
    ctx.textAlign = "left";
  }
}

function drawSnake() {
  if (snake.length === 0) {
    return;
  }

  for (let i = 0; i < snake.length - 1; i += 1) {
    const part = snake[i];
    const next = snake[i + 1];
    const t = i / Math.max(1, snake.length - 1);
    const color = lerpColor("#ffe636", "#d8b20b", t);
    ctx.strokeStyle = color;
    ctx.lineWidth = snakeSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(part.x, part.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    drawGlossyCircle(part.x, part.y, Math.floor(snakeSize / 2), color);
  }

  const head = snake[0];
  drawGlossyCircle(head.x, head.y, Math.floor(snakeSize / 2), "#ffe636");

  ctx.fillStyle = "#111114";
  if (direction === "LEFT" || direction === "RIGHT") {
    ctx.beginPath();
    ctx.arc(head.x, head.y - 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(head.x, head.y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(head.x - 7, head.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(head.x + 7, head.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFruits() {
  fruits.forEach((fruit) => {
    // Рисуем цветной кружок
    drawGlossyCircle(fruit.pos.x, fruit.pos.y, Math.floor(fruitSize / 2) + 10, fruit.type.color);
    
    // Рисуем текст прямо поверх кружка (обрезаем пометку "ловушка" для чистоты визуала)
    const shortText = fruit.type.description.replace(" (ловушка)", "");
    
    ctx.font = "700 13px Manrope, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Обводка текста, чтобы было видно на любом цвете
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 3;
    ctx.strokeText(shortText, fruit.pos.x, fruit.pos.y);
    
    // Белая заливка текста
    ctx.fillStyle = "#ffffff";
    ctx.fillText(shortText, fruit.pos.x, fruit.pos.y);
  });
}

function drawLives() {
  const visible = Math.min(lives, 8);
  const y = WORLD_H - 44;
  for (let i = 0; i < visible; i += 1) {
    const x = 50 + i * 34;
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 2);
    ctx.lineTo(x + 15, y - 2);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
    ctx.fill();
  }
  if (lives > visible) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px Manrope";
    ctx.fillText(`x${lives}`, 50 + visible * 34 + 8, y + 4);
  }
}

function drawBonusPanel() {
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 27px Manrope";
  let y = WORLD_H - PANEL_H + 34;
  fruitTypes.forEach((fruitType) => {
    ctx.fillStyle = fruitType.color;
    ctx.beginPath();
    ctx.arc(42, y - 8, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(fruitType.description, 68, y);
    y += 23;
  });

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Manrope";
  ctx.fillText(`Level ${Math.min(currentLevel + 1, levels.length)}/${levels.length}`, WORLD_W / 2 - 78, WORLD_H - PANEL_H + 34);
  ctx.fillText(`Sequence ${pickedColors.length}/${correctSequence.length}`, WORLD_W / 2 - 90, WORLD_H - PANEL_H + 64);
  if (invincible) {
    ctx.fillText("Invincible ON", WORLD_W / 2 - 74, WORLD_H - PANEL_H + 94);
  }
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px Russo One";
  ctx.textAlign = "center";
  ctx.fillText("PAUSE", WORLD_W / 2, WORLD_H / 2);
  ctx.textAlign = "left";
}

function checkWallCollision(head) {
  const minX = PLAYFIELD.x + snakeSize / 2;
  const maxX = PLAYFIELD.x + PLAYFIELD.w - snakeSize / 2;
  const minY = PLAYFIELD.y + snakeSize / 2;
  const maxY = PLAYFIELD.y + PLAYFIELD.h - snakeSize / 2;
  return head.x < minX || head.x > maxX || head.y < minY || head.y > maxY;
}

function findSelfCollisionIndex() {
  const head = snake[0];
  for (let i = 4; i < snake.length; i += 1) {
    const segment = snake[i];
    const d = Math.hypot(head.x - segment.x, head.y - segment.y);
    if (d < snakeSize * 0.48) {
      return i;
    }
  }
  return -1;
}

function snakeBounceAndWobble() {
  const head = { ...snake[0] };
  const push = 46;
  if (direction === "RIGHT") {
    head.x -= push;
  } else if (direction === "LEFT") {
    head.x += push;
  } else if (direction === "UP") {
    head.y += push;
  } else {
    head.y -= push;
  }
  const wobble = 4 * Math.sin(performance.now() / 85);
  if (direction === "LEFT" || direction === "RIGHT") {
    head.y += wobble;
  } else {
    head.x += wobble;
  }
  snake[0] = head;
}

function checkFruitCollision() {
  const newFruits = [];
  fruits.forEach((fruit) => {
    // Увеличил радиус коллизии, так как фрукты стали чуть больше из-за текста
    const d = Math.hypot(snake[0].x - fruit.pos.x, snake[0].y - fruit.pos.y);
    if (d < collisionRadius + 10) {
      
      const expectedColor = correctSequence[pickedColors.length];
      
      if (fruit.type.color === expectedColor) {
        pickedColors.push(fruit.type.color);
        
        if (pickedColors.length === correctSequence.length) {
          setStatus("Richtig! (Отлично!)");
          nextLevel();
        }
      } else {
        pickedColors = []; 
        setStatus("Falsches Wort! (Не то слово, начни предложение сначала)", 2500);
      }
      
      updateHud();

      const effect = fruit.type.effect;
      if (effect === "grow") {
        snakeLength += 4;
      } else if (effect === "speed_up") {
        changeSpeed(2);
        snakeLength += 4;
      } else if (effect === "slow_down") {
        changeSpeed(-2);
        snakeLength += 4;
      } else if (effect === "extra_life") {
        lives += 1;
        snakeLength += 4;
      } else if (effect === "invincible") {
        invincible = true;
        invincibleTimer = performance.now();
        snakeLength += 4;
      } else if (effect === "shrink") {
        snakeLength = Math.max(snakeLength - 2, 5);
      }
    } else {
      newFruits.push(fruit);
    }
  });

  while (newFruits.length < numFruits) {
    const fruit = spawnLimitedFruit(newFruits);
    if (!fruit) {
      break;
    }
    newFruits.push(fruit);
  }
  fruits = newFruits;
}

function handleScreenClick(x, y) {
  if (y < WORLD_H / 4) {
    setDirection("UP");
  } else if (y > (WORLD_H * 3) / 4) {
    setDirection("DOWN");
  } else if (x < WORLD_W / 4) {
    setDirection("LEFT");
  } else if (x > (WORLD_W * 3) / 4) {
    setDirection("RIGHT");
  }
}

function stepGame(now) {
  if (!running || paused) {
    return;
  }

  if (!collisionEnabled && now - startTime >= 5000) {
    collisionEnabled = true;
  }

  if (invincible && now - invincibleTimer > 5000) {
    invincible = false;
  }

  const moveInterval = Math.max(45, 210 - snakeSpeed * 14);
  if (now - lastMoveTs < moveInterval) {
    return;
  }

  const head = snake[0];
  snake = [{ x: head.x + moveX, y: head.y + moveY }, ...snake.slice(0, -1)];
  while (snake.length < snakeLength) {
    snake.push({ ...snake[snake.length - 1] });
  }

  checkFruitCollision();

  if (!invincible && checkWallCollision(snake[0])) {
    lives -= 1;
    snakeBounceAndWobble();
    if (lives <= 0) {
      lives = 0;
      running = false;
      setStatus("Game Over", 3000);
    }
  }

  const cutIndex = collisionEnabled ? findSelfCollisionIndex() : -1;
  if (cutIndex > 0) {
    snake = snake.slice(0, cutIndex);
    snakeLength = snake.length;
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      running = false;
      setStatus("Game Over", 3000);
    }
  }

  updateHud();
  lastMoveTs = now;
}

function render(now) {
  drawScene(now);
  drawFruits();
  drawSnake();
  drawLives();
  drawBonusPanel();
  if (paused) {
    drawPauseOverlay();
  }
}

function frame(now) {
  stepGame(now);
  render(now);
  requestAnimationFrame(frame);
}

function toWorldCoordinates(pointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = ((pointerEvent.clientX - rect.left) / rect.width) * WORLD_W;
  const y = ((pointerEvent.clientY - rect.top) / rect.height) * WORLD_H;
  return { x, y };
}

function bindControls() {
  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("pointerdown", () => {
      setDirection(button.dataset.dir);
    });
  });

  speedUpBtn.addEventListener("click", () => changeSpeed(1));
  speedDownBtn.addEventListener("click", () => changeSpeed(-1));

  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
  });

  resetSeqBtn.addEventListener("click", () => {
    pickedColors = [];
    updateHud();
    setStatus("Sequence reset.");
  });

  canvas.addEventListener("pointerdown", (event) => {
    const point = toWorldCoordinates(event);
    handleScreenClick(point.x, point.y);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "p" || event.key === "P") {
      paused = !paused;
      pauseBtn.textContent = paused ? "Resume" : "Pause";
    } else if (event.key === "z" || event.key === "Z") {
      pickedColors = [];
      updateHud();
      setStatus("Sequence reset.");
    } else if (event.key === "+" || event.key === "=") {
      changeSpeed(1);
    } else if (event.key === "-" || event.key === "_") {
      changeSpeed(-1);
    } else if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      setDirection("UP");
    } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      setDirection("DOWN");
    } else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      setDirection("LEFT");
    } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      setDirection("RIGHT");
    }
  });
}

function roundRect(context, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  if (fill) {
    context.fill();
  }
  if (stroke) {
    context.stroke();
  }
}

function initGame() {
  fruits = spawnFruits();
  updateHud();
  bindControls();
  requestAnimationFrame(frame);
}

initGame();
