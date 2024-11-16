<script>
    import { onMount } from 'svelte';

    let canvas;
    let ctx;
    let animationId;
    let gameLevel = 1;
    let isGameOver = false;
    let touchY = null;

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
            ctx.font = 'bold 24px "Fredoka One"';
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

        // Increment level after every 5 successful hits
        if (isPlayer && (paddle.player.score + paddle.computer.score) % 5 === 0) {
            gameLevel++;
            if (gameLevel >= 100) {
                isGameOver = true;
                createParticles(canvas.width/2, canvas.height/2, '255, 215, 0', 50);
            }
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchY = touch.clientY - rect.top;
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (isGameOver) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const newTouchY = touch.clientY - rect.top;
        
        // Move paddle based on touch position
        if (newTouchY < touchY) {
            paddle.player.y -= 10;
        } else if (newTouchY > touchY) {
            paddle.player.y += 10;
        }
        
        // Keep paddle within canvas bounds
        paddle.player.y = Math.max(0, Math.min(canvas.height - paddle.height, paddle.player.y));
        touchY = newTouchY;
    }

    function handleTouchEnd() {
        touchY = null;
    }

    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = -ball.dx;
        ball.dy = Math.random() * 10 - 5;
    }

    function update() {
        if (isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 48px "Fredoka One"';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 Game Complete! 🎉', canvas.width/2, canvas.height/2 - 30);
            ctx.font = 'bold 24px "Fredoka One"';
            ctx.fillText('You reached Level 100!', canvas.width/2, canvas.height/2 + 20);
            return;
        }

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

        // Draw level
        ctx.fillStyle = '#7e57c2';
        ctx.font = 'bold 24px "Fredoka One"';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${gameLevel}`, canvas.width/2, 30);

        ctx.restore();

        animationId = requestAnimationFrame(update);
    }

    onMount(() => {
        ctx = canvas.getContext('2d');
        
        // Load custom font
        const font = new FontFace('Fredoka One', 'url(https://fonts.gstatic.com/s/fredokaone/v14/k3kUo8kEI-tA1RRcTZGmTmHBA6aF8Bf_.woff2)');
        font.load().then(() => {
            document.fonts.add(font);
        });

        // Start the game loop
        update();

        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        // Make canvas responsive
        function resizeCanvas() {
            const container = canvas.parentElement;
            const scale = Math.min(
                container.clientWidth / 800,
                container.clientHeight / 400
            );
            canvas.style.width = `${800 * scale}px`;
            canvas.style.height = `${400 * scale}px`;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            cancelAnimationFrame(animationId);
        };
    });
</script>

<svelte:head>
    <title>Kitty Pong Game</title>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" rel="stylesheet">
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
    <div class="canvas-container">
        <canvas
            bind:this={canvas}
            width="800"
            height="400"
            class="game-canvas"
        />
    </div>
    <div class="controls">
        {#if isGameOver}
            Game Complete! 🎉
        {:else}
            Use Up/Down arrows or touch screen to move your kitty paw! 🐾
        {/if}
    </div>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');

    .game-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #ede7f6;  /* Very light purple */
        padding: 20px;
        font-family: 'Fredoka One', cursive;
    }

    .title {
        color: #7e57c2;  /* Dark purple */
        font-size: 2.5rem;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }

    .canvas-container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        position: relative;
    }

    .game-canvas {
        border: 4px solid #b39ddb;  /* Light purple */
        background-color: #f5f0ff;  /* Very light purple */
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        touch-action: none;  /* Prevents default touch actions */
        max-width: 100%;
        height: auto;
        display: block;
    }

    .score {
        display: flex;
        gap: 40px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        justify-content: center;
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
        text-align: center;
    }

    @media (max-width: 600px) {
        .title {
            font-size: 2rem;
        }

        .score {
            gap: 20px;
        }

        .controls {
            font-size: 1rem;
            padding: 8px 16px;
        }
    }
</style>
