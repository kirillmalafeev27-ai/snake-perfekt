const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameShell = document.getElementById('gameShell');
const setupOverlay = document.getElementById('setupOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const setupForm = document.getElementById('setupForm');
const themeSelect = document.getElementById('themeSelect');
const languageLevel = document.getElementById('languageLevel');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const generationStatus = document.getElementById('generationStatus');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const resultBtn = document.getElementById('resultBtn');
const levelValue = document.getElementById('levelValue');
const livesValue = document.getElementById('livesValue');
const seqValue = document.getElementById('seqValue');
const topicValue = document.getElementById('topicValue');
const speedValue = document.getElementById('speedValue');
const taskHint = document.getElementById('taskHint');
const sequenceChips = document.getElementById('sequenceChips');
const statusMessage = document.getElementById('statusMessage');
const pauseBtn = document.getElementById('pauseBtn');
const resetSeqBtn = document.getElementById('resetSeqBtn');
const newGameBtn = document.getElementById('newGameBtn');
const speedUpBtn = document.getElementById('speedUp');
const speedDownBtn = document.getElementById('speedDown');

const WORLD_W = 1350;
const WORLD_H = 900;
const PANEL_H = 150;
const PLAYFIELD = { x: 75, y: 76, w: WORLD_W - 150, h: WORLD_H - 240 };
const snakeSize = 31;
const fruitSize = snakeSize;
const collisionRadius = 45;
const baseSpeed = 3;
const speedMin = 2;
const speedMax = 9;
const numFruits = 6;

const CLIENT_TOPICS = [
  { id: 'alltag', title: 'Alltag', description: 'Повседневные ситуации' },
  { id: 'was-ist-das', title: 'Was ist das?', description: 'Вещи в классе и офисе' },
  { id: 'shoppen', title: 'Und heute: Shoppen!', description: 'Покупки, магазины и город' },
  { id: 'freizeit', title: 'Tanzen oder wandern?', description: 'Досуг, времена года и дни недели' },
];

const C = {
  red: '#ff4242',
  yellow: '#ffe636',
  blue: '#4294ff',
  purple: '#976bff',
  orange: '#ff9d4d',
  pink: '#ff69b4',
};

const baseFruitTypes = [
  { color: C.red, effect: 'grow' },
  { color: C.yellow, effect: 'speed_up' },
  { color: C.blue, effect: 'slow_down' },
  { color: C.purple, effect: 'extra_life' },
  { color: C.orange, effect: 'invincible' },
  { color: C.pink, effect: 'shrink' },
];

const fruitLimits = {
  grow: 1,
  speed_up: 1,
  slow_down: 1,
  extra_life: 1,
  invincible: 1,
  shrink: 1,
};

let levels = [];
let currentLevel = 0;
let currentTheme = CLIENT_TOPICS[0];
let packSource = 'fallback';
let snakeSpeed = baseSpeed;
let snake = [{ x: WORLD_W / 2, y: WORLD_H / 2 }];
let snakeLength = 10;
let direction = 'RIGHT';
let moveX = snakeSpeed;
let moveY = 0;
let lives = 5;
let paused = false;
let invincible = false;
let invincibleTimer = 0;
let collisionEnabled = false;
let startTime = performance.now();
let lastMoveTs = performance.now();
let running = false;
let transitioning = false;
let statusText = '';
let statusUntil = 0;
let correctSequence = [];
let pickedColors = [];
let pickedLabels = [];
let fruitTypes = [];
let fruits = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(red, green, blue) {
  const value = (channel) => channel.toString(16).padStart(2, '0');
  return `#${value(red)}${value(green)}${value(blue)}`;
}

function lerpColor(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  );
}

function setStatus(text, duration = 1700) {
  statusText = text;
  statusUntil = performance.now() + duration;
  statusMessage.textContent = text;
}

function sourceLabel(source) {
  if (source === 'ai') return 'AI создал 10 уровней.';
  if (source === 'mixed') return 'AI-набор дополнен проверенными резервными уровнями.';
  if (source === 'cache') return 'Готовый AI-набор загружен из кеша.';
  return 'AI недоступен: загружен тематический резервный набор.';
}

function updateSequenceChips() {
  sequenceChips.replaceChildren();
  if (!pickedLabels.length) {
    const empty = document.createElement('span');
    empty.className = 'sequence-empty';
    empty.textContent = 'Пока ничего не собрано';
    sequenceChips.appendChild(empty);
    return;
  }
  pickedLabels.forEach((label) => {
    const chip = document.createElement('span');
    chip.className = 'sequence-chip';
    chip.textContent = label;
    sequenceChips.appendChild(chip);
  });
}

function activeLevel() {
  return levels[currentLevel] || null;
}

function updateHud() {
  const level = activeLevel();
  const total = levels.length || 10;
  levelValue.textContent = `Уровень ${Math.min(currentLevel + 1, total)}/${total}`;
  livesValue.textContent = `Жизни ${lives}`;
  seqValue.textContent = `Порядок ${pickedColors.length}/${correctSequence.length || 4}`;
  topicValue.textContent = currentTheme.title;
  speedValue.textContent = String(snakeSpeed);
  taskHint.textContent = level ? level.hint : 'Подсказка появится здесь.';
  updateSequenceChips();
}

function updateVelocityFromDirection() {
  if (direction === 'UP') {
    moveX = 0;
    moveY = -snakeSpeed;
  } else if (direction === 'DOWN') {
    moveX = 0;
    moveY = snakeSpeed;
  } else if (direction === 'LEFT') {
    moveX = -snakeSpeed;
    moveY = 0;
  } else {
    moveX = snakeSpeed;
    moveY = 0;
  }
}

function setDirection(newDirection) {
  const opposite = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
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

function resetPickedSequence(message = '') {
  pickedColors = [];
  pickedLabels = [];
  updateHud();
  if (message) setStatus(message);
}

function buildFruitTypes(level) {
  const items = shuffle([
    ...level.chunks.map((description) => ({ description, correct: true })),
    ...level.distractors.map((description) => ({ description, correct: false })),
  ]);
  return baseFruitTypes.map((type, index) => ({ ...type, ...items[index] }));
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
  if (!available.length) return null;
  const type = available[randomInRange(0, available.length - 1)];
  return {
    pos: {
      x: randomInRange(PLAYFIELD.x + 55, PLAYFIELD.x + PLAYFIELD.w - 55),
      y: randomInRange(PLAYFIELD.y + 55, PLAYFIELD.y + PLAYFIELD.h - 55),
    },
    type,
  };
}

function spawnFruits() {
  const list = [];
  while (list.length < numFruits) {
    const fruit = spawnLimitedFruit(list);
    if (!fruit) break;
    list.push(fruit);
  }
  return list;
}

function activateLevel(index) {
  if (index >= levels.length) {
    finishGame();
    return;
  }
  currentLevel = index;
  const level = activeLevel();
  pickedColors = [];
  pickedLabels = [];
  snakeSpeed = clamp(baseSpeed + Math.floor(index / 2), speedMin, speedMax);
  fruitTypes = buildFruitTypes(level);
  correctSequence = level.chunks.map((chunk) => fruitTypes.find((type) => type.description === chunk).color);
  fruits = spawnFruits();
  transitioning = false;
  updateVelocityFromDirection();
  updateHud();
  setStatus(`Уровень ${index + 1}: собери предложение по подсказке.`);
}

function resetSnake() {
  snakeSpeed = baseSpeed;
  snake = [{ x: WORLD_W / 2, y: WORLD_H / 2 }];
  snakeLength = 10;
  direction = 'RIGHT';
  lives = 5;
  invincible = false;
  invincibleTimer = 0;
  collisionEnabled = false;
  startTime = performance.now();
  lastMoveTs = performance.now();
  updateVelocityFromDirection();
}

function startGame(pack) {
  levels = pack.levels;
  currentTheme = pack.theme;
  packSource = pack.source;
  resetSnake();
  gameShell.hidden = false;
  setupOverlay.hidden = true;
  resultOverlay.hidden = true;
  running = true;
  paused = false;
  pauseBtn.textContent = 'Пауза';
  activateLevel(0);
  setStatus(sourceLabel(packSource), 3200);
}

function finishGame() {
  running = false;
  transitioning = false;
  resultTitle.textContent = 'Все 10 уровней пройдены';
  resultText.textContent = `Тема «${currentTheme.title}» завершена. Можно собрать новый набор предложений.`;
  resultOverlay.hidden = false;
  setStatus('Все уровни пройдены!', 4000);
}

function applyFruitEffect(effect) {
  if (effect === 'grow') {
    snakeLength += 4;
  } else if (effect === 'speed_up') {
    changeSpeed(1);
    snakeLength += 4;
  } else if (effect === 'slow_down') {
    changeSpeed(-1);
    snakeLength += 4;
  } else if (effect === 'extra_life') {
    lives += 1;
    snakeLength += 4;
  } else if (effect === 'invincible') {
    invincible = true;
    invincibleTimer = performance.now();
    snakeLength += 4;
  } else if (effect === 'shrink') {
    snakeLength = Math.max(snakeLength - 2, 5);
  }
}

function completeCurrentLevel() {
  const completedIndex = currentLevel;
  const sentence = activeLevel().sentence;
  transitioning = true;
  setStatus(`Richtig! ${sentence}`, 2600);
  setTimeout(() => {
    if (!running || currentLevel !== completedIndex) return;
    activateLevel(completedIndex + 1);
  }, 1100);
}

function checkFruitCollision() {
  if (transitioning) return;
  const eatenIndex = fruits.findIndex((fruit) => {
    const distance = Math.hypot(snake[0].x - fruit.pos.x, snake[0].y - fruit.pos.y);
    return distance < collisionRadius + 10;
  });
  if (eatenIndex < 0) return;

  const [fruit] = fruits.splice(eatenIndex, 1);
  applyFruitEffect(fruit.type.effect);
  const expectedColor = correctSequence[pickedColors.length];
  if (fruit.type.color === expectedColor) {
    pickedColors.push(fruit.type.color);
    pickedLabels.push(fruit.type.description);
    if (pickedColors.length === correctSequence.length) {
      updateHud();
      completeCurrentLevel();
      return;
    }
    setStatus('Верно. Ищи следующий фрагмент.');
  } else {
    pickedColors = [];
    pickedLabels = [];
    setStatus('Не тот фрагмент. Порядок сброшен.', 2300);
  }

  while (fruits.length < numFruits) {
    const replacement = spawnLimitedFruit(fruits);
    if (!replacement) break;
    fruits.push(replacement);
  }
  updateHud();
}

function drawGlossyCircle(x, y, radius, color) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.arc(x + 3, y + 4, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const rgb = hexToRgb(color);
  ctx.fillStyle = rgbToHex(
    Math.min(255, rgb[0] + 50),
    Math.min(255, rgb[1] + 50),
    Math.min(255, rgb[2] + 50),
  );
  ctx.beginPath();
  ctx.arc(x - radius / 3, y - radius / 3, Math.max(4, radius / 3), 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(context, x, y, width, height, radius) {
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
  context.fill();
}

function drawScene(now) {
  const bg = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  bg.addColorStop(0, '#1a2456');
  bg.addColorStop(1, '#0b1027');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowA = ctx.createRadialGradient(180, 130, 30, 180, 130, 280);
  glowA.addColorStop(0, 'rgba(255, 148, 76, 0.34)');
  glowA.addColorStop(1, 'rgba(255, 148, 76, 0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowB = ctx.createRadialGradient(WORLD_W - 180, 150, 20, WORLD_W - 180, 150, 290);
  glowB.addColorStop(0, 'rgba(80, 137, 255, 0.34)');
  glowB.addColorStop(1, 'rgba(80, 137, 255, 0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const panel = ctx.createLinearGradient(0, WORLD_H - PANEL_H, 0, WORLD_H);
  panel.addColorStop(0, '#ff9f58');
  panel.addColorStop(1, '#d4592f');
  ctx.fillStyle = panel;
  ctx.fillRect(0, WORLD_H - PANEL_H, WORLD_W, PANEL_H);

  ctx.fillStyle = '#2f7452';
  roundRect(ctx, PLAYFIELD.x, PLAYFIELD.y + 8, PLAYFIELD.w, PLAYFIELD.h, 34);
  ctx.fillStyle = '#69d89d';
  roundRect(ctx, PLAYFIELD.x, PLAYFIELD.y, PLAYFIELD.w, PLAYFIELD.h, 30);

  ctx.strokeStyle = 'rgba(139, 229, 182, 0.52)';
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    roundRect(ctx, WORLD_W / 2 - 430, 32, 860, 56, 14);
    ctx.fillStyle = '#2341a3';
    roundRect(ctx, WORLD_W / 2 - 434, 28, 860, 56, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 26px Manrope';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, WORLD_W / 2 - 4, 64, 810);
    ctx.textAlign = 'left';
  }
}

function drawSnake() {
  if (!snake.length) return;
  for (let index = 0; index < snake.length - 1; index += 1) {
    const part = snake[index];
    const next = snake[index + 1];
    const amount = index / Math.max(1, snake.length - 1);
    const color = lerpColor('#ffe636', '#d8b20b', amount);
    ctx.strokeStyle = color;
    ctx.lineWidth = snakeSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(part.x, part.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    drawGlossyCircle(part.x, part.y, Math.floor(snakeSize / 2), color);
  }

  const head = snake[0];
  drawGlossyCircle(head.x, head.y, Math.floor(snakeSize / 2), '#ffe636');
  ctx.fillStyle = '#111114';
  if (direction === 'LEFT' || direction === 'RIGHT') {
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

function wrappedLines(text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawFruitLabel(text, x, y) {
  ctx.font = '800 13px Manrope, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrappedLines(text, 94);
  const startY = y - ((lines.length - 1) * 13) / 2;
  lines.forEach((line, index) => {
    const lineY = startY + index * 13;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.86)';
    ctx.lineWidth = 4;
    ctx.strokeText(line, x, lineY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, x, lineY);
  });
}

function drawFruits() {
  fruits.forEach((fruit) => {
    drawGlossyCircle(fruit.pos.x, fruit.pos.y, Math.floor(fruitSize / 2) + 13, fruit.type.color);
    drawFruitLabel(fruit.type.description, fruit.pos.x, fruit.pos.y);
  });
}

function drawLives() {
  const visible = Math.min(lives, 6);
  const y = WORLD_H - 42;
  for (let index = 0; index < visible; index += 1) {
    const x = 1020 + index * 34;
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
}

function drawBonusPanel() {
  ctx.font = '800 20px Manrope';
  fruitTypes.forEach((fruitType, index) => {
    const column = Math.floor(index / 3);
    const row = index % 3;
    const x = 38 + column * 390;
    const y = WORLD_H - PANEL_H + 32 + row * 35;
    ctx.fillStyle = fruitType.color;
    ctx.beginPath();
    ctx.arc(x, y - 7, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fruitType.description, x + 25, y, 340);
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 23px Manrope';
  ctx.fillText(`Уровень ${currentLevel + 1}/${levels.length || 10}`, 845, WORLD_H - PANEL_H + 36);
  ctx.fillText(`Порядок ${pickedColors.length}/${correctSequence.length}`, 845, WORLD_H - PANEL_H + 70);
  if (invincible) ctx.fillText('Защита включена', 845, WORLD_H - PANEL_H + 104);
  drawLives();
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px Russo One';
  ctx.textAlign = 'center';
  ctx.fillText('ПАУЗА', WORLD_W / 2, WORLD_H / 2);
  ctx.textAlign = 'left';
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
  for (let index = 4; index < snake.length; index += 1) {
    const segment = snake[index];
    if (Math.hypot(head.x - segment.x, head.y - segment.y) < snakeSize * 0.48) return index;
  }
  return -1;
}

function snakeBounceAndWobble() {
  const head = { ...snake[0] };
  const push = 46;
  if (direction === 'RIGHT') head.x -= push;
  if (direction === 'LEFT') head.x += push;
  if (direction === 'UP') head.y += push;
  if (direction === 'DOWN') head.y -= push;
  const wobble = 4 * Math.sin(performance.now() / 85);
  if (direction === 'LEFT' || direction === 'RIGHT') head.y += wobble;
  else head.x += wobble;
  snake[0] = head;
}

function loseLife(message) {
  lives -= 1;
  if (lives <= 0) {
    lives = 0;
    running = false;
    resultTitle.textContent = 'Попробуй ещё раз';
    resultText.textContent = `Тема «${currentTheme.title}». Можно выбрать тему и создать новый набор.`;
    resultOverlay.hidden = false;
    setStatus('Игра окончена.', 3000);
  } else if (message) {
    setStatus(message);
  }
}

function stepGame(now) {
  if (!running || paused || transitioning) return;
  if (!collisionEnabled && now - startTime >= 5000) collisionEnabled = true;
  if (invincible && now - invincibleTimer > 5000) invincible = false;

  const moveInterval = Math.max(68, 210 - snakeSpeed * 14);
  if (now - lastMoveTs < moveInterval) return;
  const head = snake[0];
  snake = [{ x: head.x + moveX, y: head.y + moveY }, ...snake.slice(0, -1)];
  while (snake.length < snakeLength) snake.push({ ...snake[snake.length - 1] });

  checkFruitCollision();
  if (!invincible && checkWallCollision(snake[0])) {
    loseLife('Осторожно, граница поля.');
    snakeBounceAndWobble();
  }

  const cutIndex = collisionEnabled ? findSelfCollisionIndex() : -1;
  if (cutIndex > 0) {
    snake = snake.slice(0, cutIndex);
    snakeLength = snake.length;
    loseLife('Змейка задела хвост.');
  }

  updateHud();
  lastMoveTs = now;
}

function render(now) {
  if (!levels.length) return;
  drawScene(now);
  drawFruits();
  drawSnake();
  drawBonusPanel();
  if (paused) drawPauseOverlay();
}

function frame(now) {
  stepGame(now);
  render(now);
  requestAnimationFrame(frame);
}

function toWorldCoordinates(pointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((pointerEvent.clientX - rect.left) / rect.width) * WORLD_W,
    y: ((pointerEvent.clientY - rect.top) / rect.height) * WORLD_H,
  };
}

function handleScreenClick(x, y) {
  if (y < WORLD_H / 4) setDirection('UP');
  else if (y > (WORLD_H * 3) / 4) setDirection('DOWN');
  else if (x < WORLD_W / 4) setDirection('LEFT');
  else if (x > (WORLD_W * 3) / 4) setDirection('RIGHT');
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Продолжить' : 'Пауза';
}

function showSetup() {
  running = false;
  setupOverlay.hidden = false;
  setupOverlay.scrollTop = 0;
  resultOverlay.hidden = true;
  gameShell.hidden = true;
}

function bindControls() {
  document.querySelectorAll('[data-dir]').forEach((button) => {
    button.addEventListener('pointerdown', () => setDirection(button.dataset.dir));
  });
  speedUpBtn.addEventListener('click', () => changeSpeed(1));
  speedDownBtn.addEventListener('click', () => changeSpeed(-1));
  pauseBtn.addEventListener('click', togglePause);
  resetSeqBtn.addEventListener('click', () => resetPickedSequence('Порядок сброшен.'));
  newGameBtn.addEventListener('click', showSetup);
  resultBtn.addEventListener('click', showSetup);
  canvas.addEventListener('pointerdown', (event) => {
    const point = toWorldCoordinates(event);
    handleScreenClick(point.x, point.y);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P') togglePause();
    else if (event.key === 'z' || event.key === 'Z') resetPickedSequence('Порядок сброшен.');
    else if (event.key === '+' || event.key === '=') changeSpeed(1);
    else if (event.key === '-' || event.key === '_') changeSpeed(-1);
    else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') setDirection('UP');
    else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') setDirection('DOWN');
    else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') setDirection('LEFT');
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') setDirection('RIGHT');
  });
}

function populateThemes(themes) {
  const selected = localStorage.getItem('snake.theme') || themeSelect.value;
  themeSelect.replaceChildren();
  themes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = `${theme.title} — ${theme.description}`;
    themeSelect.appendChild(option);
  });
  themeSelect.value = themes.some((theme) => theme.id === selected) ? selected : themes[0].id;
}

async function checkGenerator() {
  populateThemes(CLIENT_TOPICS);
  try {
    const response = await fetch('/api/snake/status');
    if (!response.ok) throw new Error('status request failed');
    const status = await response.json();
    populateThemes(status.themes || CLIENT_TOPICS);
    generationStatus.className = `generation-status ${status.generationConfigured ? 'online' : ''}`;
    generationStatus.textContent = status.generationConfigured
      ? 'AI подключен: новый набор будет создан по выбранной теме.'
      : 'AI-ключ не настроен: для проверки доступен тематический резервный набор.';
  } catch (_) {
    generationStatus.className = 'generation-status error';
    generationStatus.textContent = 'Сервер генерации не отвечает. Проверь запуск приложения.';
  }
}

setupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  startBtn.disabled = true;
  generationStatus.className = 'generation-status loading';
  generationStatus.textContent = 'Создаю и проверяю 10 уровней…';
  const settings = {
    theme: themeSelect.value,
    level: languageLevel.value,
    mode: modeSelect.value,
  };
  try {
    const response = await fetch('/api/snake/levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pack = await response.json();
    if (!pack.ok || !Array.isArray(pack.levels) || pack.levels.length !== 10) {
      throw new Error('Сервер вернул неполный набор уровней');
    }
    localStorage.setItem('snake.theme', settings.theme);
    localStorage.setItem('snake.level', settings.level);
    localStorage.setItem('snake.mode', settings.mode);
    generationStatus.className = 'generation-status online';
    generationStatus.textContent = sourceLabel(pack.source);
    startGame(pack);
  } catch (error) {
    generationStatus.className = 'generation-status error';
    generationStatus.textContent = `Не удалось загрузить уровни: ${error.message}`;
  } finally {
    startBtn.disabled = false;
  }
});

function loadSavedSettings() {
  languageLevel.value = localStorage.getItem('snake.level') || 'A1';
  modeSelect.value = localStorage.getItem('snake.mode') || 'compact';
}

window.SNAKE_DEBUG = {
  getState() {
    return {
      levels: levels.length,
      currentLevel: currentLevel + 1,
      correctLength: correctSequence.length,
      pickedLabels: [...pickedLabels],
      theme: currentTheme.id,
      source: packSource,
      running,
    };
  },
  completeLevel() {
    if (running) activateLevel(currentLevel + 1);
  },
};

bindControls();
loadSavedSettings();
checkGenerator();
requestAnimationFrame(frame);
