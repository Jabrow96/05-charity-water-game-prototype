// Game State
const gameState = {
    phase: 'start', // start, instruction, countdown, playing, end
    score: 0,
    streak: 0,
    lives: 3,
    maxLives: 3,
    drops: [],
    bucket: { x: window.innerWidth / 2 - 40, width: 80 },
    gameLoopId: null,
    dropSpawnId: null,
    bucketSpeed: 8,
};

// DOM Elements
const screens = {
    start: document.getElementById('startScreen'),
    instruction: document.getElementById('instructionScreen'),
    countdown: document.getElementById('countdownScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen'),
};

const gameElements = {
    bucket: document.getElementById('bucket'),
    gameDrops: document.getElementById('gameDrops'),
    dropCounter: document.getElementById('dropCounter'),
    streakText: document.getElementById('streakText'),
    heartSvg: document.getElementById('heartSvg'),
    countdownText: document.getElementById('countdownText'),
    finalScore: document.getElementById('finalScore'),
    previewDrops: document.getElementById('previewDrops'),
};

// ============ SCREEN MANAGEMENT ============

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
    gameState.phase = screenName;
}

// ============ DROP CREATION ============

function createDrop() {
    const dropType = Math.random() > 0.7 ? 'bad' : 'good'; // 30% bad, 70% good
    const x = Math.random() * (window.innerWidth - 30);
    const speed = 2 + Math.random() * 2; // Random speed between 2-4
    
    return {
        x,
        y: -30,
        width: 20,
        height: 30,
        type: dropType,
        speed,
        element: null,
    };
}

function spawnDropPreviewDrops() {
    // Spawn preview drops for the start screen preview container
    const container = gameElements.previewDrops;
    if (!container) return;

    const drop = createDrop();
    const dropEl = document.createElement('div');
    dropEl.className = `drop ${drop.type}`;
    dropEl.style.left = drop.x % 300 + 'px';
    dropEl.style.top = '-30px';

    container.appendChild(dropEl);

    // Animate fall
    let y = -30;
    const interval = setInterval(() => {
        y += 3;
        dropEl.style.top = y + 'px';

        if (y > 300) {
            clearInterval(interval);
            dropEl.remove();
        }
    }, 30);
}

function spawnGameDrops() {
    // Main game drop spawning
    const drop = createDrop();
    const dropEl = document.createElement('div');
    dropEl.className = `drop ${drop.type}`;
    dropEl.style.left = drop.x + 'px';
    dropEl.style.top = '-30px';
    drop.element = dropEl;

    gameElements.gameDrops.appendChild(dropEl);
    gameState.drops.push(drop);
}

// ============ BUCKET CONTROL ============

let keyStates = {};
let isDraggingBucket = false;

document.addEventListener('keydown', (e) => {
    keyStates[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keyStates[e.key] = false;
});

// Press-and-drag bucket movement
gameElements.bucket.addEventListener('pointerdown', (e) => {
    if (gameState.phase !== 'game') return;

    isDraggingBucket = true;
    gameElements.bucket.setPointerCapture(e.pointerId);
    updateBucketPosition(e.clientX);
});

document.addEventListener('pointermove', (e) => {
    if (gameState.phase !== 'game' || !isDraggingBucket) return;
    updateBucketPosition(e.clientX);
});

document.addEventListener('pointerup', () => {
    isDraggingBucket = false;
});

document.addEventListener('pointercancel', () => {
    isDraggingBucket = false;
});

function updateBucketPosition(x) {
    // Keep bucket within screen bounds
    gameState.bucket.x = Math.max(10, Math.min(x - gameState.bucket.width / 2, window.innerWidth - gameState.bucket.width - 10));
    gameElements.bucket.style.left = gameState.bucket.x + 'px';
}

// ============ COLLISION DETECTION ============

function getBucketBounds() {
    const bottom = window.innerHeight - 100; // approximate bucket position
    const top = bottom - 50;
    const left = gameState.bucket.x;
    const right = left + gameState.bucket.width;

    return { left, right, top, bottom };
}

function checkCollision(drop) {
    const bucket = getBucketBounds();
    const dropBounds = {
        left: drop.x,
        right: drop.x + drop.width,
        top: drop.y,
        bottom: drop.y + drop.height,
    };

    return !(
        dropBounds.right < bucket.left ||
        dropBounds.left > bucket.right ||
        dropBounds.bottom < bucket.top ||
        dropBounds.top > bucket.bottom
    );
}

// ============ GAME LOOP ============

function gameLoop() {
    // Update drops
    for (let i = gameState.drops.length - 1; i >= 0; i--) {
        const drop = gameState.drops[i];
        drop.y += drop.speed;

        // Update visual position
        if (drop.element) {
            drop.element.style.top = drop.y + 'px';
        }

        // Check collision
        if (checkCollision(drop)) {
            if (drop.type === 'good') {
                gameState.score++;
                gameState.streak++;
                updateHUD();

                // Check if streak hits milestone for healing
                if (gameState.streak > 0 && gameState.streak % 10 === 0) {
                    gameState.lives = Math.min(gameState.lives + 1, gameState.maxLives);
                    updateHeart();
                }
            } else {
                // Hit bad drop
                gameState.lives--;
                gameState.streak = 0;
                updateHUD();

                if (gameState.lives <= 0) {
                    endGame();
                    return;
                }
            }

            // Remove drop
            if (drop.element) {
                drop.element.remove();
            }
            gameState.drops.splice(i, 1);
        } else if (drop.y > window.innerHeight) {
            // Missed drop (was good, should have caught it)
            if (drop.type === 'good') {
                gameState.lives--;
                gameState.streak = 0;
                updateHUD();

                if (gameState.lives <= 0) {
                    endGame();
                    return;
                }
            }

            // Remove drop
            if (drop.element) {
                drop.element.remove();
            }
            gameState.drops.splice(i, 1);
        }
    }
}

// ============ HUD UPDATE ============

function updateHUD() {
    gameElements.dropCounter.textContent = gameState.score;
    gameElements.streakText.textContent = gameState.streak;
    updateHeart();
}

function updateHeart() {
    // Simple heart damage visualization: change opacity based on lives
    const opacity = (gameState.lives / gameState.maxLives) * 1;
    gameElements.heartSvg.style.opacity = opacity;

    // Add crack effect at low health
    if (gameState.lives === 1) {
        gameElements.heartSvg.style.filter = 'drop-shadow(0 0 5px rgba(245, 64, 44, 0.8))';
    } else {
        gameElements.heartSvg.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))';
    }
}

// ============ PHASE TRANSITIONS ============

// Start Button -> Instructions
document.getElementById('collectBtn').addEventListener('click', () => {
    switchScreen('instruction');
    // Stop preview drops
    gameElements.previewDrops.innerHTML = '';
});

// Instructions -> Countdown
document.getElementById('continueBtn').addEventListener('click', () => {
    switchScreen('countdown');
    startCountdown();
});

function startCountdown() {
    let count = 3;
    gameElements.countdownText.textContent = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            gameElements.countdownText.textContent = count;
        } else {
            gameElements.countdownText.textContent = 'GO!';
            clearInterval(countdownInterval);
            setTimeout(() => {
                startGame();
            }, 500);
        }
    }, 1000);
}

function startGame() {
    switchScreen('game');

    // Reset game state
    gameState.score = 0;
    gameState.streak = 0;
    gameState.lives = gameState.maxLives;
    gameState.drops = [];
    gameElements.gameDrops.innerHTML = '';
    gameState.bucket.x = window.innerWidth / 2 - gameState.bucket.width / 2;
    gameElements.bucket.style.left = gameState.bucket.x + 'px';
    updateHUD();

    // Start spawn loop
    gameState.dropSpawnId = setInterval(spawnGameDrops, 800);

    // Start game loop
    gameState.gameLoopId = setInterval(gameLoop, 30);
}

function endGame() {
    // Stop loops
    clearInterval(gameState.dropSpawnId);
    clearInterval(gameState.gameLoopId);

    // Show end screen
    gameElements.finalScore.textContent = gameState.score;
    switchScreen('end');
}

// Retry Button
document.getElementById('retryBtn').addEventListener('click', () => {
    switchScreen('start');
    gameElements.previewDrops.innerHTML = '';
    // Start preview drops again
    spawnPreviewDropsLoop();
});

// ============ INITIALIZATION ============

function spawnPreviewDropsLoop() {
    // Continuously spawn preview drops for start screen
    setInterval(() => {
        if (gameState.phase === 'start') {
            spawnDropPreviewDrops();
        }
    }, 1000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    switchScreen('start');
    gameElements.bucket.style.left = gameState.bucket.x + 'px';
    spawnPreviewDropsLoop();
    updateHUD();
});

// Handle window resize
window.addEventListener('resize', () => {
    gameState.bucket.x = Math.min(gameState.bucket.x, window.innerWidth - gameState.bucket.width);
    gameElements.bucket.style.left = gameState.bucket.x + 'px';
});
