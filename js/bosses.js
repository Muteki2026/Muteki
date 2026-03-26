// ============================================================
// Muteki - Boss System (3 Bosses)
// ============================================================
'use strict';

M.Bosses = (() => {
    /*
     * Boss 1: Helix Warden  - rotating drill arms, weak-point core
     * Boss 2: Signal Marshal - shock ring telegraph, bullet spreads
     * Boss 3: Twin Press    - crusher plates, hazard stripes, missile fan
     */

    let activeBoss = null;

    const DEFS = {
        helixWarden: {
            name: 'HELIX WARDEN',
            hp: 120, r: 28,
            color: '#ff6e40',
            score: 2000,
        },
        signalMarshal: {
            name: 'SIGNAL MARSHAL',
            hp: 160, r: 24,
            color: '#7c4dff',
            score: 3000,
        },
        twinPress: {
            name: 'TWIN PRESS',
            hp: 200, r: 30,
            color: '#ffab00',
            score: 5000,
        },
    };

    function spawn(type, x, y) {
        const def = DEFS[type];
        if (!def) return null;

        // Use enemy pool but mark as boss
        const e = M.Enemies.pool.spawn();
        e.isBoss = true;
        e.type = type;
        e.x = x; e.y = y;
        e.vx = 0; e.vy = 0;
        e.hp = def.hp;
        e.maxHp = def.hp;
        e.r = def.r;
        e.score = def.score;
        e.color = def.color;
        e.angle = 0;
        e.stateTimer = 0;
        e.fireTimer = 0;
        e.windUp = 0;
        e.windUpMax = 0;
        e.patrolDir = 1;
        e.archetype = -1; // Boss
        e.spawnCount = 0;
        e.shieldAngle = 0;

        // Boss-specific state
        e.bossType = type;
        e.bossName = def.name;
        e.phase = 0;
        e.patternTimer = 0;
        e.armAngle = 0;
        e.vulnerable = true;
        e.flashTimer = 0;

        activeBoss = e;
        return e;
    }

    function update(dt, playerX, playerY, stage) {
        if (!activeBoss || !activeBoss.active) { activeBoss = null; return; }
        const b = activeBoss;
        const toPlayer = M.angle(b.x, b.y, playerX, playerY);
        const dist = M.dist(b.x, b.y, playerX, playerY);

        b.stateTimer += dt;
        b.patternTimer -= dt;
        if (b.flashTimer > 0) b.flashTimer -= dt;

        // Phase transitions at 66% and 33% HP
        const hpPct = b.hp / b.maxHp;
        b.phase = hpPct > 0.66 ? 0 : hpPct > 0.33 ? 1 : 2;

        switch (b.bossType) {
            case 'helixWarden':  updateHelix(b, dt, toPlayer, dist, playerX, playerY); break;
            case 'signalMarshal': updateSignal(b, dt, toPlayer, dist, playerX, playerY); break;
            case 'twinPress':    updateTwin(b, dt, toPlayer, dist, playerX, playerY, stage); break;
        }

        // Stage bounds
        if (stage && stage.bounds) {
            const bd = stage.bounds;
            b.x = M.clamp(b.x, bd.x + b.r, bd.x + bd.w - b.r);
            b.y = M.clamp(b.y, bd.y + b.r, bd.y + bd.h - b.r);
        }
    }

    // ---- Helix Warden ----
    function updateHelix(b, dt, toPlayer, dist, px, py) {
        b.armAngle += (2 + b.phase) * dt;

        // Slow orbit around center
        const cx = b.x, cy = b.y;
        b.x += Math.cos(b.stateTimer * 0.5) * 40 * dt;
        b.y += Math.sin(b.stateTimer * 0.7) * 30 * dt;

        // Drift toward player
        if (dist > 200) {
            b.x += Math.cos(toPlayer) * 50 * dt;
            b.y += Math.sin(toPlayer) * 50 * dt;
        }

        b.fireTimer -= dt;
        if (b.fireTimer <= 0) {
            b.fireTimer = Math.max(0.8 - b.phase * 0.2, 0.3);

            // Drill arm bullets: spiral pattern
            const arms = 2 + b.phase;
            for (let a = 0; a < arms; a++) {
                const baseAngle = b.armAngle + (a / arms) * M.TAU;
                const bulletCount = 3 + b.phase;
                for (let i = 0; i < bulletCount; i++) {
                    M.Projectiles.spawn({
                        type: 'enemyBullet',
                        x: b.x + Math.cos(baseAngle) * b.r,
                        y: b.y + Math.sin(baseAngle) * b.r,
                        angle: baseAngle + i * 0.15,
                        speed: 180 + b.phase * 30,
                        r: 3, dmg: 1, life: 3,
                    });
                }
            }
        }

        // Phase 2+: occasional aimed burst
        if (b.phase >= 1 && b.patternTimer <= 0) {
            b.patternTimer = 2.5 - b.phase * 0.5;
            for (let i = 0; i < 8 + b.phase * 4; i++) {
                M.Projectiles.spawn({
                    type: 'enemyBullet',
                    x: b.x, y: b.y,
                    angle: toPlayer + (i - (4 + b.phase * 2)) * 0.12,
                    speed: 250, r: 3, dmg: 1, life: 2.5,
                });
            }
        }

        // Vulnerability: core glows brighter when arms are aligned
        b.vulnerable = true;
    }

    // ---- Signal Marshal ----
    function updateSignal(b, dt, toPlayer, dist, px, py) {
        // Hover in place, slight drift
        b.x += Math.sin(b.stateTimer * 0.8) * 20 * dt;
        b.y += Math.cos(b.stateTimer * 0.6) * 15 * dt;

        b.fireTimer -= dt;

        // Pattern: expanding shock rings
        if (b.fireTimer <= 0) {
            b.fireTimer = Math.max(1.5 - b.phase * 0.3, 0.6);

            // Ring of bullets
            const count = 12 + b.phase * 8;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * M.TAU + b.stateTimer * 0.5;
                M.Projectiles.spawn({
                    type: 'enemyBullet',
                    x: b.x, y: b.y,
                    angle: a,
                    speed: 150 + b.phase * 20,
                    r: 3, dmg: 1, life: 3,
                });
            }

            // Visual telegraph ring
            M.Particles.spawn({
                x: b.x, y: b.y,
                r: 40 + b.phase * 10,
                life: 0.5,
                color: b.color,
                shape: 'ring',
                shrink: false,
                additive: true
            });
        }

        // Phase 1+: homing missiles
        if (b.phase >= 1 && b.patternTimer <= 0) {
            b.patternTimer = 3 - b.phase * 0.5;
            const missiles = 3 + b.phase * 2;
            for (let i = 0; i < missiles; i++) {
                M.Projectiles.spawn({
                    type: 'enemyMissile',
                    x: b.x, y: b.y,
                    angle: toPlayer + (i - missiles / 2) * 0.3,
                    speed: 160, r: 4, dmg: 1, life: 4,
                    homing: 2.5,
                });
            }
        } else {
            b.patternTimer -= dt;
        }
    }

    // ---- Twin Press ----
    function updateTwin(b, dt, toPlayer, dist, px, py, stage) {
        // Move left-right
        b.x += b.patrolDir * (60 + b.phase * 20) * dt;
        if (stage && stage.bounds) {
            if (b.x - b.r < stage.bounds.x + 40) b.patrolDir = 1;
            if (b.x + b.r > stage.bounds.x + stage.bounds.w - 40) b.patrolDir = -1;
        }

        b.fireTimer -= dt;

        // Crusher slam pattern: telegraph then bullet wave
        if (b.fireTimer <= 0) {
            b.fireTimer = Math.max(2.0 - b.phase * 0.4, 0.8);

            // Downward bullet crush
            const count = 10 + b.phase * 5;
            for (let i = 0; i < count; i++) {
                const spread = (i / count - 0.5) * Math.PI * 0.8;
                M.Projectiles.spawn({
                    type: 'enemyBullet',
                    x: b.x + (i - count / 2) * 8,
                    y: b.y + b.r,
                    angle: Math.PI / 2 + spread * 0.3,
                    speed: 200 + b.phase * 30,
                    r: 3, dmg: 1, life: 2,
                });
            }

            M.addShake(3);
        }

        // Phase 1+: missile fan
        if (b.phase >= 1 && b.patternTimer <= 0) {
            b.patternTimer = 3.5 - b.phase;
            const fanCount = 5 + b.phase * 3;
            for (let i = 0; i < fanCount; i++) {
                const a = toPlayer + ((i / fanCount) - 0.5) * Math.PI * 0.6;
                M.Projectiles.spawn({
                    type: 'enemyMissile',
                    x: b.x, y: b.y,
                    angle: a,
                    speed: 140, r: 4, dmg: 1, life: 4,
                    homing: 1.5,
                });
            }
        } else {
            b.patternTimer -= dt;
        }

        // Phase 2: laser sweeps
        if (b.phase >= 2) {
            b.windUp += dt;
            if (b.windUp > 2.0) {
                b.windUp = 0;
                for (let i = 0; i < 3; i++) {
                    M.Projectiles.spawn({
                        type: 'enemyLaser',
                        x: b.x, y: b.y,
                        angle: toPlayer + (i - 1) * 0.1,
                        speed: 450, r: 4, dmg: 2, life: 2,
                    });
                }
            }
        }
    }

    // -- Boss damage --
    function damage(dmg) {
        if (!activeBoss || !activeBoss.active) return false;
        activeBoss.hp -= dmg;
        activeBoss.flashTimer = 0.08;
        M.Particles.hitSpark(activeBoss.x, activeBoss.y, '#fff');

        if (activeBoss.hp <= 0) {
            killBoss();
            return true;
        }
        return false;
    }

    function killBoss() {
        if (!activeBoss) return;
        const b = activeBoss;
        b.active = false;

        // Big explosion
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                M.Particles.explosionLarge(
                    b.x + M.rand(-20, 20),
                    b.y + M.rand(-20, 20),
                    b.color
                );
            }, i * 150);
        }

        M.Player.state.score += b.score;
        M.Cascade.addKill(b.x, b.y);

        // Bonus drops
        for (let i = 0; i < 5; i++) {
            M.Pickups.spawn(b.x + M.rand(-30, 30), b.y + M.rand(-30, 30), M.randInt(2, 4));
        }

        activeBoss = null;
    }

    // -- Drawing --
    function draw(ctx, camX, camY) {
        if (!activeBoss || !activeBoss.active) return;
        const b = activeBoss;
        const sx = b.x - camX;
        const sy = b.y - camY;

        ctx.save();

        // Damage flash
        if (b.flashTimer > 0) {
            ctx.globalCompositeOperation = 'lighter';
            M.drawCircle(ctx, sx, sy, b.r + 4, 'rgba(255,255,255,0.3)');
            ctx.globalCompositeOperation = 'source-over';
        }

        switch (b.bossType) {
            case 'helixWarden':  drawHelix(ctx, sx, sy, b); break;
            case 'signalMarshal': drawSignal(ctx, sx, sy, b); break;
            case 'twinPress':    drawTwin(ctx, sx, sy, b); break;
        }

        ctx.restore();
    }

    function drawHelix(ctx, x, y, b) {
        // Rotating drill arms
        const arms = 2 + b.phase;
        ctx.save();
        ctx.translate(x, y);
        for (let a = 0; a < arms; a++) {
            const angle = b.armAngle + (a / arms) * M.TAU;
            ctx.save();
            ctx.rotate(angle);

            // Drill trail (fading arc behind each arm)
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, b.r + 5, -0.6, 0);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#3e1a0a';
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 2;
            // Arm
            ctx.fillRect(0, -4, b.r + 10, 8);
            ctx.strokeRect(0, -4, b.r + 10, 8);
            // Drill tip
            ctx.beginPath();
            ctx.moveTo(b.r + 10, -6);
            ctx.lineTo(b.r + 18, 0);
            ctx.lineTo(b.r + 10, 6);
            ctx.closePath();
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.restore();
        }

        // Charge telegraph (pulsing inner ring before aimed burst)
        if (b.phase >= 1 && b.patternTimer < 0.8 && b.patternTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(b.patternTimer * 20) * 0.2;
            ctx.strokeStyle = '#ff6e40';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, b.r * 0.5, 0, M.TAU);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Core body
        M.drawCircle(ctx, 0, 0, b.r * 0.6, '#1a0a0a', b.color, 2);

        // Weak-point core (glows brighter as HP drops)
        const glow = 1 - (b.hp / b.maxHp);
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8 + glow * 12;
        M.drawCircle(ctx, 0, 0, 6 + glow * 3, '#fff');
        ctx.restore();

        ctx.restore();
    }

    function drawSignal(ctx, x, y, b) {
        ctx.save();
        ctx.translate(x, y);

        // Outer rotating ring — color shifts to warn about imminent attack
        const attackSoon = b.fireTimer < 0.5;
        const ringColor = attackSoon ? '#ff6e40' : b.color;
        ctx.save();
        ctx.rotate(b.stateTimer * 1.5);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = attackSoon ? 3 : 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, b.r + 6, 0, M.TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Missile telegraph (pulsing crosshairs when about to fire missiles)
        if (b.phase >= 1 && b.patternTimer < 1.0 && b.patternTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.2 + Math.sin(b.patternTimer * 15) * 0.15;
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -b.r - 12); ctx.lineTo(0, b.r + 12);
            ctx.moveTo(-b.r - 12, 0); ctx.lineTo(b.r + 12, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Body
        M.drawPoly(ctx, 0, 0, b.r, 8, b.stateTimer * 0.3, '#0a0a20', b.color, 2);

        // Inner signal pattern
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5 + Math.sin(b.stateTimer * 4) * 0.3;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * M.TAU + b.stateTimer;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * b.r * 0.8, Math.sin(a) * b.r * 0.8);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Center eye
        M.drawCircle(ctx, 0, 0, 5, b.color);
        M.drawCircle(ctx, 0, 0, 2, '#fff');

        ctx.restore();
    }

    function drawTwin(ctx, x, y, b) {
        ctx.save();
        ctx.translate(x, y);

        // Laser sweep telegraph (target lanes before phase 2 laser)
        if (b.phase >= 2 && b.windUp > 1.2) {
            ctx.save();
            const warn = (b.windUp - 1.2) / 0.8; // 0→1
            ctx.globalAlpha = warn * 0.15;
            ctx.fillStyle = '#ff1744';
            // Downward lane
            ctx.fillRect(-8, b.r, 16, 300);
            // Angled lanes
            for (let i = -1; i <= 1; i++) {
                ctx.save();
                ctx.rotate(i * 0.1);
                ctx.fillRect(-4, b.r, 8, 300);
                ctx.restore();
            }
            ctx.restore();
        }

        // Left crusher plate
        ctx.fillStyle = '#2a2010';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.fillRect(-b.r - 5, -b.r * 0.4, 10, b.r * 0.8);
        ctx.strokeRect(-b.r - 5, -b.r * 0.4, 10, b.r * 0.8);

        // Right crusher plate
        ctx.fillRect(b.r - 5, -b.r * 0.4, 10, b.r * 0.8);
        ctx.strokeRect(b.r - 5, -b.r * 0.4, 10, b.r * 0.8);

        // Hazard stripes on plates
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const yy = i * 4;
            ctx.beginPath();
            ctx.moveTo(-b.r - 5, yy);
            ctx.lineTo(-b.r + 5, yy - 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(b.r - 5, yy);
            ctx.lineTo(b.r + 5, yy - 3);
            ctx.stroke();
        }
        ctx.restore();

        // Main body
        ctx.fillStyle = '#1a1810';
        M.drawPoly(ctx, 0, 0, b.r * 0.7, 6, 0, '#1a1810', b.color, 2);

        // Center core
        const pulse = Math.sin(b.stateTimer * 2) * 0.2 + 0.8;
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        M.drawCircle(ctx, 0, 0, 8 * pulse, b.color);
        M.drawCircle(ctx, 0, 0, 4, '#fff');
        ctx.restore();

        ctx.restore();
    }

    function getActiveBoss() { return activeBoss; }
    function isActive() { return activeBoss !== null && activeBoss.active; }

    function clear() {
        if (activeBoss) activeBoss.active = false;
        activeBoss = null;
    }

    return { DEFS, spawn, update, draw, damage, getActiveBoss, isActive, clear };
})();
