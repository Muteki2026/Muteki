// ============================================================
// Muteki - Enemy System (8 Archetypes)
// ============================================================
'use strict';

M.Enemies = (() => {
    /*
     * Archetypes:
     * 0 = Turret     - wall-embedded port, fires at player
     * 1 = Hopper     - squat block with spring legs, jumps
     * 2 = Flyer      - diamond body with fins, aerial patrol
     * 3 = Laser      - tall pylon, fires beam after wind-up
     * 4 = FlamePivot - rotating nozzle armature
     * 5 = Spawner    - reactor core, spawns small drones
     * 6 = Sniper     - long-range precision shooter
     * 7 = Shield     - defensive, blocks shots from front
     */

    const ARCHETYPES = {
        turret:     { hp: 4,  speed: 0,   r: 12, score: 50,  color: '#9e9e9e', fireRate: 1.2,  archetype: 0 },
        hopper:     { hp: 3,  speed: 100, r: 10, score: 40,  color: '#8d6e63', fireRate: 0,    archetype: 1 },
        flyer:      { hp: 3,  speed: 120, r: 9,  score: 60,  color: '#42a5f5', fireRate: 1.5,  archetype: 2 },
        laser:      { hp: 5,  speed: 0,   r: 10, score: 80,  color: '#ef5350', fireRate: 3.0,  archetype: 3 },
        flamePivot: { hp: 6,  speed: 0,   r: 14, score: 90,  color: '#ff7043', fireRate: 0.06, archetype: 4 },
        spawner:    { hp: 10, speed: 0,   r: 16, score: 120, color: '#ab47bc', fireRate: 3.0,  archetype: 5 },
        sniper:     { hp: 2,  speed: 60,  r: 8,  score: 70,  color: '#66bb6a', fireRate: 2.5,  archetype: 6 },
        shield:     { hp: 8,  speed: 80,  r: 12, score: 100, color: '#78909c', fireRate: 1.8,  archetype: 7 },
    };

    const pool = new M.Pool(() => ({
        active: false,
        type: 'turret',
        x: 0, y: 0,
        vx: 0, vy: 0,
        hp: 4, maxHp: 4,
        r: 12,
        speed: 0,
        score: 50,
        color: '#9e9e9e',
        fireRate: 1.0,
        fireTimer: 0,
        angle: 0,        // facing angle
        windUp: 0,       // wind-up timer for telegraphs
        windUpMax: 0,
        stateTimer: 0,   // generic state timer
        archetype: 0,
        spawnCount: 0,    // for spawner
        shieldAngle: 0,   // for shield
        patrolDir: 1,
        isBoss: false,
    }), 50);

    function spawn(type, x, y) {
        const arch = ARCHETYPES[type];
        if (!arch) return null;
        const e = pool.spawn();
        e.type = type;
        e.x = x; e.y = y;
        e.vx = 0; e.vy = 0;
        e.hp = arch.hp; e.maxHp = arch.hp;
        e.r = arch.r;
        e.speed = arch.speed;
        e.score = arch.score;
        e.color = arch.color;
        e.fireRate = arch.fireRate;
        e.fireTimer = M.rand(0, arch.fireRate);
        e.angle = 0;
        e.windUp = 0;
        e.windUpMax = 0;
        e.stateTimer = 0;
        e.archetype = arch.archetype;
        e.spawnCount = 0;
        e.shieldAngle = 0;
        e.patrolDir = M.randSign();
        e.isBoss = false;
        return e;
    }

    function update(dt, playerX, playerY, stage) {
        pool.forEach(e => {
            if (e.isBoss) return; // Bosses update separately

            const toPlayer = M.angle(e.x, e.y, playerX, playerY);
            const distToPlayer = M.dist(e.x, e.y, playerX, playerY);

            e.angle = M.lerp(e.angle, toPlayer, dt * 3);

            switch (e.archetype) {
                case 0: updateTurret(e, dt, toPlayer, distToPlayer); break;
                case 1: updateHopper(e, dt, toPlayer, distToPlayer, stage); break;
                case 2: updateFlyer(e, dt, toPlayer, distToPlayer, stage); break;
                case 3: updateLaser(e, dt, toPlayer, distToPlayer); break;
                case 4: updateFlamePivot(e, dt, toPlayer, distToPlayer); break;
                case 5: updateSpawner(e, dt, toPlayer, distToPlayer); break;
                case 6: updateSniper(e, dt, toPlayer, distToPlayer, stage); break;
                case 7: updateShield(e, dt, toPlayer, distToPlayer, playerX, playerY); break;
            }

            // Stage bounds
            if (stage && stage.bounds) {
                const b = stage.bounds;
                e.x = M.clamp(e.x, b.x + e.r, b.x + b.w - e.r);
                e.y = M.clamp(e.y, b.y + e.r, b.y + b.h - e.r);
            }
        });
    }

    // -- Turret: stationary, fires aimed bursts --
    function updateTurret(e, dt, toPlayer, dist) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 500) {
            e.fireTimer = e.fireRate;
            // 3-bullet spread
            for (let i = -1; i <= 1; i++) {
                M.Projectiles.spawn({
                    type: 'enemyBullet', x: e.x, y: e.y,
                    angle: toPlayer + i * 0.15,
                    speed: 220, r: 3, dmg: 1, life: 3,
                });
            }
        }
    }

    // -- Hopper: jumps toward player, contact damage --
    function updateHopper(e, dt, toPlayer, dist, stage) {
        e.vy += M.GRAVITY * dt;
        e.stateTimer -= dt;

        if (e.stateTimer <= 0 && dist < 400) {
            // Jump
            e.vy = -250 - M.rand(0, 80);
            e.vx = Math.cos(toPlayer) * (150 + M.rand(0, 50));
            e.stateTimer = M.rand(1.0, 2.0);
        }

        e.vx *= 0.98;
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        // Floor collision (bottom of stage)
        if (stage && stage.bounds) {
            if (e.y + e.r > stage.bounds.y + stage.bounds.h) {
                e.y = stage.bounds.y + stage.bounds.h - e.r;
                e.vy = 0;
            }
        }
    }

    // -- Flyer: aerial patrol, occasional shots --
    function updateFlyer(e, dt, toPlayer, dist, stage) {
        e.stateTimer += dt;
        // Sinusoidal patrol
        e.x += Math.cos(e.stateTimer * 1.5) * e.speed * 0.5 * dt * e.patrolDir;
        e.y += Math.sin(e.stateTimer * 2) * e.speed * 0.3 * dt;

        // Drift toward player slowly
        if (dist > 150) {
            e.x += Math.cos(toPlayer) * 30 * dt;
            e.y += Math.sin(toPlayer) * 30 * dt;
        }

        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 450) {
            e.fireTimer = e.fireRate;
            M.Projectiles.spawn({
                type: 'enemyBullet', x: e.x, y: e.y,
                angle: toPlayer + M.rand(-0.1, 0.1),
                speed: 200, r: 3, dmg: 1, life: 2.5,
            });
        }
    }

    // -- Laser: wind-up telegraph then beam --
    function updateLaser(e, dt, toPlayer, dist) {
        e.fireTimer -= dt;

        if (e.windUp > 0) {
            e.windUp -= dt;
            if (e.windUp <= 0) {
                // Fire laser
                for (let i = 0; i < 3; i++) {
                    M.Projectiles.spawn({
                        type: 'enemyLaser', x: e.x, y: e.y,
                        angle: e.angle + M.rand(-0.03, 0.03),
                        speed: 500, r: 4, dmg: 2, life: 1.5,
                    });
                }
            }
        }

        if (e.fireTimer <= 0 && dist < 500) {
            e.fireTimer = e.fireRate;
            e.windUp = 0.8; // telegraph duration
            e.windUpMax = 0.8;
            e.angle = toPlayer; // Lock aim at start of wind-up
        }
    }

    // -- Flame Pivot: rotating fire stream --
    function updateFlamePivot(e, dt, toPlayer, dist) {
        e.stateTimer += dt;
        e.angle += 1.5 * dt; // Rotate

        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 400) {
            e.fireTimer = 0.06;
            M.Projectiles.spawn({
                type: 'enemyFlame', x: e.x, y: e.y,
                angle: e.angle,
                speed: 180, r: 5, dmg: 1, life: 0.5,
            });
        }
    }

    // -- Spawner: spawns small drones periodically --
    function updateSpawner(e, dt, toPlayer, dist) {
        e.stateTimer += dt;
        e.fireTimer -= dt;

        // Pulse visual
        e.r = 16 + Math.sin(e.stateTimer * 3) * 2;

        if (e.fireTimer <= 0 && e.spawnCount < 8) {
            e.fireTimer = e.fireRate;
            e.spawnCount++;
            // Spawn a flyer drone nearby
            const a = M.rand(0, M.TAU);
            const d = 30;
            const drone = spawn('flyer', e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
            if (drone) {
                drone.hp = 1;
                drone.maxHp = 1;
                drone.score = 20;
            }
        }
    }

    // -- Sniper: slow, precise, long-range --
    function updateSniper(e, dt, toPlayer, dist, stage) {
        // Slowly back away if too close
        if (dist < 200) {
            e.x -= Math.cos(toPlayer) * e.speed * dt;
            e.y -= Math.sin(toPlayer) * e.speed * dt;
        } else if (dist > 400) {
            e.x += Math.cos(toPlayer) * e.speed * 0.5 * dt;
            e.y += Math.sin(toPlayer) * e.speed * 0.5 * dt;
        }

        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 600) {
            e.fireTimer = e.fireRate;
            M.Projectiles.spawn({
                type: 'enemyBullet', x: e.x, y: e.y,
                angle: toPlayer,
                speed: 400, r: 2, dmg: 2, life: 3,
            });
        }
    }

    // -- Shield: blocks from front, vulnerable from behind --
    function updateShield(e, dt, toPlayer, dist, px, py) {
        e.shieldAngle = toPlayer; // Face player

        // Advance toward player
        if (dist > 100) {
            e.x += Math.cos(toPlayer) * e.speed * dt;
            e.y += Math.sin(toPlayer) * e.speed * dt;
        }

        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 350) {
            e.fireTimer = e.fireRate;
            // Fire from sides
            M.Projectiles.spawn({
                type: 'enemyBullet', x: e.x, y: e.y,
                angle: toPlayer + 0.3,
                speed: 200, r: 3, dmg: 1, life: 2.5,
            });
            M.Projectiles.spawn({
                type: 'enemyBullet', x: e.x, y: e.y,
                angle: toPlayer - 0.3,
                speed: 200, r: 3, dmg: 1, life: 2.5,
            });
        }
    }

    // -- Damage & death --
    function damage(e, dmg, fromAngle) {
        // Shield blocks frontal damage
        if (e.archetype === 7 && fromAngle !== undefined) {
            const angleDiff = Math.abs(M.angleDiff(e.shieldAngle, fromAngle + Math.PI));
            if (angleDiff < Math.PI * 0.4) {
                M.Particles.hitSpark(
                    e.x + Math.cos(fromAngle) * e.r,
                    e.y + Math.sin(fromAngle) * e.r,
                    '#78909c'
                );
                return false; // Blocked
            }
        }

        e.hp -= dmg;
        M.Particles.hitSpark(e.x, e.y, e.color);

        if (e.hp <= 0) {
            kill(e);
            return true;
        }
        return false;
    }

    function kill(e) {
        e.active = false;
        M.Particles.explosion(e.x, e.y, 15, e.color, e.r * 2);
        M.Cascade.addKill(e.x, e.y);
        M.Player.state.score += e.score;
    }

    // -- Drawing --
    function draw(ctx, camX, camY) {
        pool.forEach(e => {
            if (e.isBoss) return;
            const sx = e.x - camX;
            const sy = e.y - camY;
            if (sx < -40 || sx > M.GAME_W + 40 || sy < -40 || sy > M.GAME_H + 40) return;

            ctx.save();
            switch (e.archetype) {
                case 0: drawTurret(ctx, sx, sy, e); break;
                case 1: drawHopper(ctx, sx, sy, e); break;
                case 2: drawFlyer(ctx, sx, sy, e); break;
                case 3: drawLaser(ctx, sx, sy, e); break;
                case 4: drawFlamePivot(ctx, sx, sy, e); break;
                case 5: drawSpawner(ctx, sx, sy, e); break;
                case 6: drawSniper(ctx, sx, sy, e); break;
                case 7: drawShield(ctx, sx, sy, e); break;
            }

            // HP bar (if damaged)
            if (e.hp < e.maxHp) {
                const bw = e.r * 2;
                const bh = 2;
                const bx = sx - bw / 2;
                const by = sy - e.r - 6;
                ctx.fillStyle = '#333';
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#76ff03' : '#ff1744';
                ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
            }

            ctx.restore();
        });
    }

    function drawTurret(ctx, x, y, e) {
        // Wall-embedded port with rotating shutter
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(x - e.r, y - e.r, e.r * 2, e.r * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - e.r, y - e.r, e.r * 2, e.r * 2);

        // Muzzle port
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.angle);
        ctx.fillStyle = e.color;
        ctx.fillRect(0, -3, e.r + 2, 6);
        // Shutter lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(e.r * 0.3, -e.r * 0.6);
        ctx.lineTo(e.r * 0.3, e.r * 0.6);
        ctx.stroke();
        ctx.restore();
    }

    function drawHopper(ctx, x, y, e) {
        // Squat block with spring legs
        ctx.fillStyle = '#2a2018';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        // Body
        ctx.fillRect(x - e.r, y - e.r * 0.8, e.r * 2, e.r * 1.2);
        ctx.strokeRect(x - e.r, y - e.r * 0.8, e.r * 2, e.r * 1.2);
        // Spring legs
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const legY = y + e.r * 0.4;
        // Left leg zigzag
        ctx.moveTo(x - e.r * 0.6, legY);
        ctx.lineTo(x - e.r * 0.8, legY + 4);
        ctx.lineTo(x - e.r * 0.4, legY + 8);
        ctx.lineTo(x - e.r * 0.6, legY + 12);
        // Right leg
        ctx.moveTo(x + e.r * 0.6, legY);
        ctx.lineTo(x + e.r * 0.8, legY + 4);
        ctx.lineTo(x + e.r * 0.4, legY + 8);
        ctx.lineTo(x + e.r * 0.6, legY + 12);
        ctx.stroke();
        // Eyes
        M.drawCircle(ctx, x - 3, y - e.r * 0.3, 2, '#ff5252');
        M.drawCircle(ctx, x + 3, y - e.r * 0.3, 2, '#ff5252');
    }

    function drawFlyer(ctx, x, y, e) {
        // Diamond body with fins
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.angle);
        ctx.fillStyle = '#141428';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        // Diamond
        ctx.beginPath();
        ctx.moveTo(e.r, 0);
        ctx.lineTo(0, -e.r * 0.7);
        ctx.lineTo(-e.r, 0);
        ctx.lineTo(0, e.r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Fins
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.5, -e.r * 0.5);
        ctx.lineTo(-e.r * 0.3, -e.r);
        ctx.moveTo(-e.r * 0.5, e.r * 0.5);
        ctx.lineTo(-e.r * 0.3, e.r);
        ctx.stroke();
        ctx.restore();
    }

    function drawLaser(ctx, x, y, e) {
        // Tall pylon with lens head
        ctx.fillStyle = '#1a1020';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        // Pylon body
        ctx.fillRect(x - 4, y - e.r, 8, e.r * 2);
        ctx.strokeRect(x - 4, y - e.r, 8, e.r * 2);
        // Lens head
        ctx.save();
        ctx.translate(x, y - e.r);
        ctx.rotate(e.angle + Math.PI / 2);
        M.drawCircle(ctx, 0, 0, 5, e.color);
        M.drawCircle(ctx, 0, 0, 2, '#fff');
        ctx.restore();

        // Wind-up telegraph
        if (e.windUp > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const t = 1 - e.windUp / e.windUpMax;
            ctx.globalAlpha = t * 0.6;
            ctx.strokeStyle = M.COL.laser;
            ctx.lineWidth = 1 + t * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(e.angle) * 200, y + Math.sin(e.angle) * 200);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawFlamePivot(ctx, x, y, e) {
        // Rotating nozzle armature
        ctx.save();
        ctx.translate(x, y);
        // Base
        M.drawCircle(ctx, 0, 0, e.r * 0.6, '#1a1010', e.color, 2);
        // Nozzle arm
        ctx.rotate(e.angle);
        ctx.fillStyle = e.color;
        ctx.fillRect(0, -2, e.r + 4, 4);
        // Nozzle tip
        M.drawPoly(ctx, e.r + 6, 0, 4, 3, e.angle, e.color);
        ctx.restore();
    }

    function drawSpawner(ctx, x, y, e) {
        // Reactor core with pulsing vents
        const pulse = Math.sin(e.stateTimer * 3) * 0.2 + 0.8;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3;
        M.drawCircle(ctx, x, y, e.r * 1.3 * pulse, e.color + '40');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        // Core
        M.drawPoly(ctx, x, y, e.r, 6, e.stateTimer * 0.5, '#1a1020', e.color, 2);
        // Inner core
        M.drawCircle(ctx, x, y, e.r * 0.4, e.color);
        // Vents (4 pulsing dots)
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * M.TAU + e.stateTimer;
            const vr = e.r + 4;
            M.drawCircle(ctx, x + Math.cos(a) * vr, y + Math.sin(a) * vr, 2 * pulse, e.color);
        }
        ctx.restore();
    }

    function drawSniper(ctx, x, y, e) {
        // Slim body with long barrel
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.angle);
        ctx.fillStyle = '#0a1a0a';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r, e.r * 0.5, 0, 0, M.TAU);
        ctx.fill();
        ctx.stroke();
        // Barrel
        ctx.fillStyle = e.color;
        ctx.fillRect(e.r * 0.5, -1.5, e.r, 3);
        // Scope glint
        M.drawCircle(ctx, e.r * 1.4, 0, 1.5, '#fff');
        ctx.restore();
    }

    function drawShield(ctx, x, y, e) {
        // Body
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.shieldAngle);
        // Shield plate (front)
        ctx.fillStyle = '#1a2030';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.lineTo(e.r * 0.6, Math.sin(Math.PI * 0.4) * e.r * 0.6);
        ctx.arc(0, 0, e.r * 0.6, Math.PI * 0.4, -Math.PI * 0.4, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Body behind
        M.drawCircle(ctx, -2, 0, e.r * 0.5, '#1a2030', '#556677', 1.5);
        // Weak point (rear)
        M.drawCircle(ctx, -e.r * 0.5, 0, 3, '#ff5252');
        ctx.restore();
    }

    // -- Query helpers --
    function forEach(fn) { pool.forEach(fn); }
    function count() { return pool.count(); }
    function countNear(x, y, radius) {
        let n = 0;
        pool.forEach(e => {
            if (M.dist(x, y, e.x, e.y) < radius + e.r) n++;
        });
        return n;
    }
    function clear() { pool.clear(); }

    function getActive() {
        const list = [];
        pool.forEach(e => { if (!e.isBoss) list.push(e); });
        return list;
    }

    function getAllActive() {
        const list = [];
        pool.forEach(e => list.push(e));
        return list;
    }

    return {
        ARCHETYPES, spawn, update, draw, damage, kill,
        forEach, count, countNear, clear, getActive, getAllActive, pool
    };
})();
