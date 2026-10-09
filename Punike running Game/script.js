const game = document.getElementById('game');
const dino = document.getElementById('dino');
const rock = document.getElementById('rock');
const score = document.getElementById('score');
const bestScore = document.getElementById('best-score');
const speedLevel = document.getElementById('speed-level');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const soundButton = document.getElementById('sound-button');
const message = document.getElementById('message');
const messageTitle = document.getElementById('message-title');
const messageDetail = document.getElementById('message-detail');
const levelSelect = document.getElementById('level-select');
const celebration = document.getElementById('celebration');
const celebrationLabel = document.getElementById('celebration-label');
const confetti = document.getElementById('confetti');

const LEVELS = {
  easy: { speed: 1400, label: 'Easy' },
  medium: { speed: 1500, label: 'Medium' },
  hard: { speed: 1600, label: 'Hard' },
  extreme: { speed: 1700, label: 'Extreme' }
};

let currentLevel = LEVELS[levelSelect.value] || LEVELS.medium;
let rockX = 0;
let elapsed = 0;
let passedObstacles = 0;
let displayedScore = 0;
let nextPartyScore = 500;
let speedMultiplier = 1;
let isSecondScene = false;
let isStarted = false;
let isCountingDown = false;
let isPaused = false;
let isGameOver = false;
let soundEnabled = true;
let countdownRemaining = 3;
let lastFrameTime = 0;
let audioContext;
let celebrationTimeout;
let best = Number(localStorage.getItem('punike-best-score') || 0);

bestScore.textContent = String(best);

function playTone(frequency, duration, waveform = 'sine', volume = 0.08) {
  if (!soundEnabled) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = waveform;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function getHitbox(element, inset) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + rect.width * inset.left,
    top: rect.top + rect.height * inset.top,
    right: rect.right - rect.width * inset.right,
    bottom: rect.bottom - rect.height * inset.bottom
  };
}

function jump() {
  if (!isStarted || isPaused || isGameOver || dino.classList.contains('jump-animation')) {
    return;
  }

  dino.classList.add('jump-animation');
  playTone(520, 0.16, 'triangle');
  setTimeout(() => dino.classList.remove('jump-animation'), 620);
}

function resetRock() {
  const spawnGap = Math.max(100, game.clientWidth * (0.25 + Math.random() * 0.2));
  rockX = game.clientWidth + spawnGap;
  rock.style.transform = `translate3d(${rockX}px, 0, 0)`;
}

function setScene(secondScene) {
  if (isSecondScene === secondScene) return;

  isSecondScene = secondScene;
  game.classList.toggle('second-scene', secondScene);
  document.querySelector('.scene-background-one').style.opacity = secondScene ? '0' : '1';
  document.querySelector('.scene-background-two').style.opacity = secondScene ? '1' : '0';
}

function celebrateScore(milestone) {
  celebrationLabel.textContent = `\uD83C\uDF89 ${milestone} POINTS! \uD83C\uDF89`;
  confetti.replaceChildren();
  for (let index = 0; index < 48; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
    piece.style.setProperty('--delay', `${Math.random() * 0.35}s`);
    piece.style.setProperty('--drift', `${Math.random() * 240 - 120}px`);
    piece.style.setProperty('--spin', `${Math.random() * 1080 - 540}deg`);
    confetti.append(piece);
  }

  celebration.classList.remove('active');
  void celebration.offsetWidth;
  celebration.classList.add('active');
  clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => {
    celebration.classList.remove('active');
    confetti.replaceChildren();
  }, 1600);

  playTone(880, 0.14, 'triangle');
  setTimeout(() => playTone(1175, 0.2, 'triangle'), 100);
}

function showMessage(title, detail = '') {
  messageTitle.textContent = title;
  messageDetail.textContent = detail;
  message.classList.remove('hidden');
}

function startGame() {
  currentLevel = LEVELS[levelSelect.value] || LEVELS.medium;
  elapsed = 0;
  passedObstacles = 0;
  displayedScore = 0;
  nextPartyScore = 500;
  speedMultiplier = 1;
  setScene(false);
  countdownRemaining = 3;
  score.textContent = '0';
  speedLevel.textContent = 'x1.0';
  celebration.classList.remove('active');
  confetti.replaceChildren();
  isStarted = false;
  isCountingDown = true;
  isPaused = false;
  isGameOver = false;
  lastFrameTime = 0;
  dino.classList.remove('jump-animation');
  pauseButton.textContent = 'Pause';
  pauseButton.disabled = false;
  showMessage('3', `${currentLevel.label} level · Get ready!`);
  resetRock();
  startButton.textContent = 'Restart';
  playTone(440, 0.12);
}

function endGame() {
  if (isGameOver) return;

  isGameOver = true;
  isStarted = false;
  isCountingDown = false;
  isPaused = false;
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';

  const newRecord = displayedScore > best;
  if (newRecord) {
    best = displayedScore;
    localStorage.setItem('punike-best-score', String(best));
    bestScore.textContent = String(best);
  }

  showMessage(newRecord ? 'New Best!' : 'Run Over', `Score: ${displayedScore} · Best: ${best} · ${currentLevel.label}`);
  playTone(150, 0.45, 'sawtooth', 0.1);
}

function togglePause() {
  if (!isStarted || isGameOver) return;

  isPaused = !isPaused;
  lastFrameTime = 0;
  pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
  if (isPaused) {
    showMessage('Paused', 'Press P or Resume to continue');
  } else {
    message.classList.add('hidden');
  }
}

function updateGame(timestamp) {
  requestAnimationFrame(updateGame);

  if (isCountingDown) {
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    countdownRemaining -= deltaTime;

    if (countdownRemaining <= 0) {
      isCountingDown = false;
      isStarted = true;
      lastFrameTime = timestamp;
      message.classList.add('hidden');
      playTone(720, 0.2, 'triangle');
    } else {
      messageTitle.textContent = String(Math.ceil(countdownRemaining));
    }
    return;
  }

  if (!isStarted || isPaused || isGameOver) return;

  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;
  elapsed += deltaTime;

  const responsiveSpeed = currentLevel.speed * Math.min(game.clientWidth / 1200, 1);
  rockX -= responsiveSpeed * speedMultiplier * deltaTime;
  rock.style.transform = `translate3d(${rockX}px, 0, 0)`;

  const dinoBox = getHitbox(dino, { left: 0.2, top: 0.12, right: 0.2, bottom: 0.08 });
  const rockBox = getHitbox(rock, { left: 0.2, top: 0.45, right: 0.2, bottom: 0.08 });
  const colliding =
    rockBox.left < dinoBox.right &&
    rockBox.right > dinoBox.left &&
    rockBox.top < dinoBox.bottom &&
    rockBox.bottom > dinoBox.top;

  if (colliding) {
    endGame();
    return;
  }

  if (rockBox.right < dinoBox.left) {
    passedObstacles += 1;
    resetRock();
    playTone(880, 0.12, 'sine', 0.05);
  }

  displayedScore = Math.floor(elapsed * 20) + passedObstacles * 100;
  score.textContent = String(displayedScore);
  setScene(displayedScore >= 2000);

  while (displayedScore >= nextPartyScore) {
    celebrateScore(nextPartyScore);
    nextPartyScore += 500;
  }

  const speedTier = Math.floor(displayedScore / 800);
  speedMultiplier = 1 + speedTier * 0.15;
  speedLevel.textContent = `x${speedMultiplier.toFixed(2)}`;
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyP') {
    togglePause();
    return;
  }

  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    if (!isStarted && !isCountingDown && !isGameOver) {
      startGame();
    } else {
      jump();
    }
  }
});

game.addEventListener('pointerdown', jump);
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? 'Sound On' : 'Sound Off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) playTone(660, 0.12);
});

window.addEventListener('resize', resetRock);

resetRock();
requestAnimationFrame(updateGame);
