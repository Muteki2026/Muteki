// ============================================================
// Muteki - Main Game Controller
// ============================================================
'use strict';

M.Game = (() => {
    let canvas, ctx;
    let gameState = 'title'; // title, playing, paused, gameover, stageComplete, victory
    let camX = 0, camY = 0;
    let burstRechargeTimer = 0;
    const BURST_RECHARGE_INTERVAL = 6; // seconds per charge regen
    let stageTransitionTimer = 0;
    let aftermathTimer = 0; // Counterburst "breathe" effect

    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        resize();
        window.addEventListener('resize', resize);

        M.Input.init(canvas);

        // Menu buttons
        document.getElementById('btnStart').addEventListener('click', startGame);
        document.getElementById('btnStart').addEventListener('touchend', e => { e.preventDefault(); startGame(); });
        document.getElementById('btnRestart').addEventListener('click', startGame);
        document.getElementById('btnRestart').addEventListener('touchend', e => { e.preventDefault(); startGame(); });

        // Start render loop
        let lastTime = performance.now();

        function loop(now) {
            const rawDt = (now - lastTime) / 1000;
            const dt = Math.min(rawDt, 1 / 20); // Cap at 50ms
            lastTime = now;

            if (gameState === 'playing') {
                update(dt);
            }

            render();
            M.Input.endFrame();
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = M.GAME_W * dpr;
        canvas.height = M.GAME_H * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function startGame() {
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        gameState = 'playing';

        // Reset all systems
        M.Projectiles.clear();
        M.Particles.clear();
        M.Pickups.clear();
        M.Enemies.clear();
        M.Bosses.clear();
        M.Cascade.reset();
        if (M.ZatanRenderer) M.ZatanRenderer.clearAfterimages();

        // Load first stage
        M.Stages.loadStage(0);
        const stage = M.Stages.getCurrent();
        M.Player.reset(stage.bounds.x + stage.bounds.w / 2, stage.bounds.y + stage.bounds.h / 2);

        burstRechargeTimer = 0;
        stageTransitionTimer = 0;
    }

    function update(dt) {
        const stage = M.Stages.getCurrent();
        const p = M.Player.state;

        // -- Burst recharge --
        burstRechargeTimer += dt;
        if (burstRechargeTimer >= BURST_RECHARGE_INTERVAL) {
            burstRechargeTimer -= BURST_RECHARGE_INTERVAL;
            M.Player.rechargeBurst();
        }

        // -- Update player --
        M.Player.update(dt, stage);

        // -- Update stage (wave spawning) --
        const stageComplete = M.Stages.update(dt);

        // -- Overclock drain (after stage timer updates) --
        const timeRemaining = M.Stages.getTimeRemaining();
        if (timeRemaining < 0 && Math.floor(timeRemaining) !== Math.floor(timeRemaining + dt)) {
            M.Player.takeDamage(1);
        }

        // -- Update enemies --
        M.Enemies.update(dt, p.x, p.y, stage);

        // -- Update bosses --
        M.Bosses.update(dt, p.x, p.y, stage);

        // -- Update projectiles --
        const allEnemies = M.Enemies.getAllActive();
        M.Projectiles.update(dt, stage, p.x, p.y, allEnemies);

        // -- Update cascade --
        M.Cascade.update(dt);

        // -- Update pickups --
        if (p.alive) {
            const pickupScore = M.Pickups.update(dt, p.x, p.y, M.Player.RADIUS);
            p.score += pickupScore;
        }

        // -- Update particles --
        M.Particles.update(dt);

        // -- Collision detection --
        handleCollisions();

        // -- Camera --
        updateCamera(dt);

        // -- Screen effects --
        M.updateShake();

        // Aftermath "breathe" effect
        if (aftermathTimer > 0) {
            aftermathTimer -= dt;
        }

        // Check if player released counterburst (for aftermath)
        if (p.burstReleased) {
            aftermathTimer = 0.3;
            p.burstReleased = false;
        }

        // -- Game over check --
        if (!p.alive) {
            gameState = 'gameover';
            document.getElementById('finalScore').textContent = p.score.toLocaleString();
            document.getElementById('gameOverScreen').classList.remove('hidden');
        }

        // -- Stage transition --
        if (stageComplete) {
            if (M.Stages.getStageIndex() < M.Stages.getStageCount() - 1) {
                stageTransitionTimer += dt;
                if (stageTransitionTimer > 3) {
                    nextStage();
                }
            } else {
                // Victory!
                gameState = 'gameover';
                p.score += Math.max(0, Math.floor(M.Stages.getTimeRemaining())) * 100; // Time bonus
                document.getElementById('finalScore').textContent = p.score.toLocaleString();
                document.getElementById('gameOverScreen').classList.remove('hidden');
                document.querySelector('.go-title').textContent = 'MISSION COMPLETE';
            }
        }
    }

    function nextStage() {
        const nextIdx = M.Stages.getStageIndex() + 1;
        M.Projectiles.clear();
        M.Particles.clear();
        M.Pickups.clear();
        M.Enemies.clear();
        M.Bosses.clear();
        M.Stages.loadStage(nextIdx);

        const stage = M.Stages.getCurrent();
        const p = M.Player.state;
        p.x = stage.bounds.x + stage.bounds.w / 2;
        p.y = stage.bounds.y + stage.bounds.h / 2;
        p.vx = 0;
        p.vy = 0;
        stageTransitionTimer = 0;
    }

    function handleCollisions() {
        const p = M.Player.state;
        if (!p.alive) return;

        // -- Player projectiles vs Enemies --
        M.Projectiles.forEachFriendly(proj => {
            // vs regular enemies
            M.Enemies.forEach(e => {
                if (e.isBoss) return;
                if (!proj.active) return;
                if (M.circleCircle(proj.x, proj.y, proj.r, e.x, e.y, e.r)) {
                    const fromAngle = M.angle(proj.x, proj.y, e.x, e.y);
                    const killed = M.Enemies.damage(e, proj.dmg, fromAngle);
                    proj.active = false;
                    M.Particles.hitSpark(proj.x, proj.y, M.COL.player);
                }
            });

            // vs boss
            if (M.Bosses.isActive()) {
                const boss = M.Bosses.getActiveBoss();
                if (proj.active && M.circleCircle(proj.x, proj.y, proj.r, boss.x, boss.y, boss.r)) {
                    M.Bosses.damage(proj.dmg);
                    proj.active = false;
                }
            }
        });

        // -- Enemy projectiles vs Player --
        M.Projectiles.forEachHostile(proj => {
            if (M.circleCircle(proj.x, proj.y, proj.r, p.x, p.y, M.Player.RADIUS)) {
                if (M.Player.takeDamage(proj.dmg)) {
                    proj.active = false;
                }
            }
        });

        // -- Enemy body vs Player (contact damage) --
        M.Enemies.forEach(e => {
            if (M.circleCircle(e.x, e.y, e.r, p.x, p.y, M.Player.RADIUS)) {
                M.Player.takeDamage(1);
            }
        });

        // Boss body contact
        if (M.Bosses.isActive()) {
            const boss = M.Bosses.getActiveBoss();
            if (M.circleCircle(boss.x, boss.y, boss.r, p.x, p.y, M.Player.RADIUS)) {
                M.Player.takeDamage(1);
            }
        }
    }

    function updateCamera(dt) {
        const p = M.Player.state;
        const stage = M.Stages.getCurrent();

        // Smoothly follow player
        const targetX = p.x - M.GAME_W / 2;
        const targetY = p.y - M.GAME_H / 2;
        camX = M.lerp(camX, targetX, dt * 5);
        camY = M.lerp(camY, targetY, dt * 5);

        // Clamp to stage bounds
        camX = M.clamp(camX, stage.bounds.x, stage.bounds.x + stage.bounds.w - M.GAME_W);
        camY = M.clamp(camY, stage.bounds.y, stage.bounds.y + stage.bounds.h - M.GAME_H);

        // Apply shake
        camX += M.shake.x;
        camY += M.shake.y;
    }

    function render() {
        ctx.save();

        if (gameState === 'title') {
            // Title screen just needs the canvas black
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, M.GAME_W, M.GAME_H);
            ctx.restore();
            return;
        }

        // -- Aftermath brightness --
        // (overlay applied after scene, before HUD)

        // -- Background --
        M.Stages.drawBackground(ctx, camX, camY);

        // -- Pickups --
        M.Pickups.draw(ctx, camX, camY);

        // -- Enemies --
        M.Enemies.draw(ctx, camX, camY);

        // -- Bosses --
        M.Bosses.draw(ctx, camX, camY);

        // -- Player --
        M.Player.draw(ctx, camX, camY);

        // -- Projectiles --
        M.Projectiles.draw(ctx, camX, camY);

        // -- Particles (on top) --
        M.Particles.draw(ctx, camX, camY);

        // -- Aftermath "breathe" dim overlay --
        if (aftermathTimer > 0) {
            const t = aftermathTimer / 0.3;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,' + (t * 0.35).toFixed(2) + ')';
            ctx.fillRect(0, 0, M.GAME_W, M.GAME_H);
            // White flash ring at player position
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = t * 0.6;
            const px = M.Player.state.x - camX;
            const py = M.Player.state.y - camY;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 60 * (1 - t) + 30, 0, M.TAU);
            ctx.stroke();
            ctx.restore();
        }

        // -- HUD (screen space, no camera offset) --
        ctx.globalAlpha = 1;
        const timeRemaining = M.Stages.getTimeRemaining();
        M.HUD.draw(ctx, timeRemaining, M.Stages.getCurrent().name);

        // -- Stage transition overlay --
        if (stageTransitionTimer > 0) {
            ctx.save();
            ctx.globalAlpha = M.clamp(stageTransitionTimer / 2, 0, 0.7);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, M.GAME_W, M.GAME_H);

            if (stageTransitionTimer > 1) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#00e5ff';
                ctx.font = 'bold 20px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText('SECTOR CLEAR', M.GAME_W / 2, M.GAME_H / 2 - 10);
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = '12px Courier New';
                ctx.fillText('ADVANCING...', M.GAME_W / 2, M.GAME_H / 2 + 15);
                ctx.textAlign = 'left';
            }
            ctx.restore();
        }

        ctx.restore();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init };
})();
