const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 10,
    speed: 7,
    dx: 7,
    dy: 7
};

const paddle = {
    width: 10,
    height: 100,
    player: {
        y: canvas.height / 2 - 50,
        score: 0
    },
    computer: {
        y: canvas.height / 2 - 50,
        score: 0
    }
};

// Keyboard control
const keys = {
    ArrowUp: false,
    ArrowDown: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Draw functions
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle(x, y) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, paddle.width, paddle.height);
}

function drawScore() {
    document.getElementById('playerScore').textContent = paddle.player.score;
    document.getElementById('computerScore').textContent = paddle.computer.score;
}

// Game logic
function movePaddles() {
    // Player paddle
    if (keys.ArrowUp && paddle.player.y > 0) {
        paddle.player.y -= 8;
    }
    if (keys.ArrowDown && paddle.player.y < canvas.height - paddle.height) {
        paddle.player.y += 8;
    }

    // Computer paddle (AI)
    const computerSpeed = 6;
    const computerCenter = paddle.computer.y + paddle.height / 2;
    if (computerCenter < ball.y - 35) {
        paddle.computer.y += computerSpeed;
    } else if (computerCenter > ball.y + 35) {
        paddle.computer.y -= computerSpeed;
    }
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (top and bottom)
    if (ball.y + ball.size > canvas.height || ball.y - ball.size < 0) {
        ball.dy *= -1;
    }

    // Paddle collision
    if (ball.dx < 0) {
        // Player paddle
        if (
            ball.x - ball.size < paddle.width &&
            ball.y > paddle.player.y &&
            ball.y < paddle.player.y + paddle.height
        ) {
            ball.dx *= -1;
            const diff = ball.y - (paddle.player.y + paddle.height / 2);
            ball.dy = diff * 0.2;
        }
    } else {
        // Computer paddle
        if (
            ball.x + ball.size > canvas.width - paddle.width &&
            ball.y > paddle.computer.y &&
            ball.y < paddle.computer.y + paddle.height
        ) {
            ball.dx *= -1;
            const diff = ball.y - (paddle.computer.y + paddle.height / 2);
            ball.dy = diff * 0.2;
        }
    }

    // Scoring
    if (ball.x < 0) {
        paddle.computer.score++;
        resetBall();
    } else if (ball.x > canvas.width) {
        paddle.player.score++;
        resetBall();
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = -ball.dx;
    ball.dy = Math.random() * 10 - 5;
}

function update() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePaddles();
    moveBall();

    // Draw everything
    drawBall();
    drawPaddle(0, paddle.player.y); // Player paddle
    drawPaddle(canvas.width - paddle.width, paddle.computer.y); // Computer paddle
    drawScore();

    requestAnimationFrame(update);
}

// Start the game
update();
