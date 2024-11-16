<script>
    import { onMount } from 'svelte';

    let canvas;
    let ctx;
    let animationId;

    const ball = {
        x: 400,
        y: 200,
        size: 12,
        speed: 7,
        dx: 7,
        dy: 7,
        maxSpeed: 15  // Maximum speed threshold
    };

    const paddle = {
        width: 20,
        height: 100,
        player: {
            y: 150,
            score: 0
        },
        computer: {
            y: 150,
            score: 0
        }
    };

    const keys = {
        ArrowUp: false,
        ArrowDown: false
    };

    let particles = [];
    let ballTrail = [];
    let screenShake = { x: 0, y: 0, intensity: 0 };
    let powerUpActive = false;
    let comboCount = 0;
    let lastHitTime = 0;

    function createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x,
                y,
                dx: (Math.random() - 0.5) * 10,
                dy: (Math.random() - 0.5) * 10,
                size: Math.random() * 4 + 2,
                color,
                life: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    function updateParticles() {
        particles = particles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dx *= 0.95;
            p.dy *= 0.95;
            p.life -= 0.02;
            p.rotation += 0.1;
            return p.life > 0;
        });
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });
    }

    function addScreenShake(intensity = 20) {
        screenShake.intensity = intensity;
    }

    function updateScreenShake() {
        if (screenShake.intensity > 0) {
            screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.intensity *= 0.9;
        } else {
            screenShake.x = 0;
            screenShake.y = 0;
        }
    }

    function handleKeyDown(e) {
        if (e.key in keys) {
            keys[e.key] = true;
        }
    }

    function handleKeyUp(e) {
        if (e.key in keys) {
            keys[e.key] = false;
        }
    }

    function drawBall() {
        // Ball trail
        ballTrail.forEach((pos, i) => {
            const alpha = i / ballTrail.length;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ball.size * (1 - alpha * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = powerUpActive 
                ? `rgba(255, 215, 0, ${alpha * 0.5})` 
                : `rgba(179, 157, 219, ${alpha * 0.5})`;
            ctx.fill();
        });

        // Main ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
        ctx.fillStyle = powerUpActive ? '#ffd700' : '#b39ddb';
        ctx.strokeStyle = powerUpActive ? '#ffa000' : '#9575cd';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        
        // Ball glow effect
        if (powerUpActive) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.size * 1.5, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                ball.x, ball.y, ball.size,
                ball.x, ball.y, ball.size * 1.5
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    function drawPaddle(x, y, isPlayer) {
        // Draw a rounded rectangle for the paddle
        const radius = 10;
        ctx.fillStyle = '#9575cd';  // Medium purple
        ctx.strokeStyle = '#7e57c2';  // Darker purple
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + paddle.width - radius, y);
        ctx.quadraticCurveTo(x + paddle.width, y, x + paddle.width, y + radius);
        ctx.lineTo(x + paddle.width, y + paddle.height - radius);
        ctx.quadraticCurveTo(x + paddle.width, y + paddle.height, x + paddle.width - radius, y + paddle.height);
        ctx.lineTo(x + radius, y + paddle.height);
        ctx.quadraticCurveTo(x, y + paddle.height, x, y + paddle.height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Add some cute details
        const pawSize = 8;
        const pawSpacing = (paddle.height - pawSize * 3) / 4;
        
        for (let i = 0; i < 3; i++) {
            const pawY = y + pawSpacing + (pawSize + pawSpacing) * i;
            ctx.beginPath();
            ctx.arc(x + paddle.width/2, pawY, pawSize/2, 0, Math.PI * 2);
            ctx.fillStyle = '#b39ddb';  // Light purple
            ctx.fill();
        }
    }

    function drawCombo() {
        if (comboCount > 1) {
            ctx.font = 'bold 24px Comic Sans MS';
            ctx.fillStyle = '#7e57c2';
            ctx.textAlign = 'center';
            ctx.fillText(`${comboCount}x COMBO!`, canvas.width/2, 50);
        }
    }

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
        // Update ball trail
        ballTrail.unshift({ x: ball.x, y: ball.y });
        if (ballTrail.length > 10) ballTrail.pop();

        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collision
        if (ball.y + ball.size > canvas.height || ball.y - ball.size < 0) {
            ball.dy *= -1;
            createParticles(ball.x, ball.y, '149, 117, 205');
            addScreenShake(5);
        }

        // Paddle collision
        if (ball.dx < 0) {
            if (
                ball.x - ball.size < paddle.width &&
                ball.y > paddle.player.y &&
                ball.y < paddle.player.y + paddle.height
            ) {
                handlePaddleHit(true);
            }
        } else {
            if (
                ball.x + ball.size > canvas.width - paddle.width &&
                ball.y > paddle.computer.y &&
                ball.y < paddle.computer.y + paddle.height
            ) {
                handlePaddleHit(false);
            }
        }

        // Scoring
        if (ball.x < 0 || ball.x > canvas.width) {
            if (ball.x < 0) {
                paddle.computer.score++;
            } else {
                paddle.player.score++;
            }
            createParticles(ball.x, ball.y, '149, 117, 205', 20);
            addScreenShake(15);
            comboCount = 0;
            resetBall();
        }
    }

    function handlePaddleHit(isPlayer) {
        const now = Date.now();
        if (now - lastHitTime < 1000) {
            comboCount++;
            if (comboCount > 2) {
                powerUpActive = true;
                setTimeout(() => powerUpActive = false, 3000);
            }
        } else {
            comboCount = 1;
        }
        lastHitTime = now;

        // Check if ball speed is too high
        if (Math.abs(ball.dx) > ball.maxSpeed) {
            // Reset to initial speed while maintaining direction
            ball.dx = ball.speed * (ball.dx > 0 ? 1 : -1);
        } else {
            ball.dx *= -1.1; // Normal speed increase
        }

        const diff = ball.y - (isPlayer ? paddle.player.y : paddle.computer.y + paddle.height / 2);
        ball.dy = diff * 0.2;
        
        createParticles(ball.x, ball.y, powerUpActive ? '255, 215, 0' : '149, 117, 205', 15);
        addScreenShake(10);
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = -ball.dx;
        ball.dy = Math.random() * 10 - 5;
    }

    function update() {
        updateScreenShake();
        updateParticles();
        
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);
        
        ctx.clearRect(-screenShake.x, -screenShake.y, canvas.width, canvas.height);

        movePaddles();
        moveBall();

        drawParticles();
        drawBall();
        drawPaddle(0, paddle.player.y, true);
        drawPaddle(canvas.width - paddle.width, paddle.computer.y, false);
        drawCombo();

        ctx.restore();

        animationId = requestAnimationFrame(update);
    }

    onMount(() => {
        ctx = canvas.getContext('2d');
        
        // Start the game loop
        update();

        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationId);
        };
    });
</script>

<svelte:head>
    <title>Kitty Pong Game</title>
</svelte:head>

<div class="game-container">
    <h1 class="title">🐱 Kitty Pong 🐱</h1>
    <div class="score">
        <div class="score-item">
            <span class="player-name">Kitty</span>
            <span class="score-value">{paddle.player.score}</span>
        </div>
        <div class="score-item">
            <span class="player-name">Meowbot</span>
            <span class="score-value">{paddle.computer.score}</span>
        </div>
    </div>
    <canvas
        bind:this={canvas}
        width="800"
        height="400"
        class="game-canvas"
    />
    <div class="controls">
        Use Up and Down arrow keys to move your kitty paw! 🐾
    </div>
</div>

<style>
    .game-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #ede7f6;  /* Very light purple */
        padding: 20px;
        font-family: 'Comic Sans MS', cursive, sans-serif;
    }

    .title {
        color: #7e57c2;  /* Dark purple */
        font-size: 2.5rem;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }

    .game-canvas {
        border: 4px solid #b39ddb;  /* Light purple */
        background-color: #f5f0ff;  /* Very light purple */
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .score {
        display: flex;
        gap: 40px;
        margin-bottom: 20px;
    }

    .score-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: #d1c4e9;  /* Light purple */
        padding: 10px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .player-name {
        color: #5e35b1;  /* Dark purple */
        font-size: 1.2rem;
        margin-bottom: 5px;
    }

    .score-value {
        color: #673ab7;  /* Purple */
        font-size: 1.5rem;
        font-weight: bold;
    }

    .controls {
        color: #5e35b1;  /* Dark purple */
        margin-top: 20px;
        font-size: 1.2rem;
        background-color: #d1c4e9;  /* Light purple */
        padding: 10px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
