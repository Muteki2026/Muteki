// ============================================================
// Muteki - Player Mech: ZATAN
// ============================================================
'use strict';

M.Player = (() => {
    // --- Zatan config (canonical source: game/entities/player/zatan.json) ---
    // Values loaded inline to preserve no-build HTML5 architecture.
    // If a JSON loader is added later, these can be read dynamically.
    const CFG_ID = 'player_zatan';
    const CFG_NAME = 'Zatan';

    // Movement
    const SPEED = 280;
    const ACCEL = 1600;
    const FRICTION = 0.88;
    const HOVER_COUNTER = 1.5;

    // Dash
    const DASH_SPEED = 800;
    const DASH_DUR = 0.13;
    const DASH_CD = 0.8;

    // Weapons
    const FIRE_RATE_SEEKER = 0.09;
    const FIRE_RATE_PRISM  = 0.15;

    // Stats
    const MAX_HP = 10;
    const RADIUS = 10;
    const INV_TIME = 1.5;

    // Counterburst
    const MAX_BURST = 5;
    const BURST_SAMPLE_R = 150;
    const BURST_BASE = 40;
    const BURST_MAX = 420;
    const BURST_CHARGE_RATE = 0.8;

    const state = {
        x: 400, y: 300,
        vx: 0, vy: 0,
        hp: MAX_HP,
        mode: 'seeker', // 'seeker' or 'prism'
        burstCharges: MAX_BURST,
        burstCharging: false,
        burstChargeTime: 0,
        burstDangerCount: 0,
        burstPredicted: 0,
        burstReleased: false, // one-frame flag for aftermath
        fireTimer: 0,
        dashTimer: 0,
        dashCooldown: 0,
        dashAngle: 0,
        invTimer: 0,
        alive: true,
        aimAngle: 0,
        thrustAngle: 0,
        isThrusting: false,
        modeSwapFlash: 0,
        radius: RADIUS,
        score: 0,
    };

    function reset(x, y) {
        state.x = x || 400;
        state.y = y || 300;
        state.vx = 0;
        state.vy = 0;
        state.hp = MAX_HP;
        state.mode = 'seeker';
        state.burstCharges = MAX_BURST;
        state.burstCharging = false;
        state.burstChargeTime = 0;
        state.burstDangerCount = 0;
        state.burstPredicted = 0;
        state.burstReleased = false;
        state.fireTimer = 0;
        state.dashTimer = 0;
        state.dashCooldown = 0;
        state.invTimer = 0;
        state.alive = true;
        state.score = 0;
        state.modeSwapFlash = 0;
    }

    function update(dt, stage) {
        if (!state.alive) return;

        // -- Mode switch --
        if (M.Input.switchMode()) {
            state.mode = state.mode === 'seeker' ? 'prism' : 'seeker';
            state.modeSwapFlash = 0.12;
        }
        if (state.modeSwapFlash > 0) state.modeSwapFlash -= dt;

        // -- Movement --
        const mx = M.Input.moveX();
        const my = M.Input.moveY();
        state.isThrusting = mx !== 0 || my !== 0;

        if (state.dashTimer > 0) {
            // Dashing — fixed velocity
            state.dashTimer -= dt;
            state.vx = Math.cos(state.dashAngle) * DASH_SPEED;
            state.vy = Math.sin(state.dashAngle) * DASH_SPEED;
            M.Particles.dashTrail(state.x, state.y, state.mode === 'seeker' ? M.COL.seeker : M.COL.prism);
        } else if (state.burstCharging) {
            // Locked during Counterburst charge
            state.vx *= 0.85;
            state.vy *= 0.85;
            state.vy += M.GRAVITY * 0.3 * dt;
        } else {
            // Normal movement
            if (mx !== 0) state.vx += mx * ACCEL * dt;
            if (my !== 0) state.vy += my * ACCEL * dt;

            // Gravity
            state.vy += M.GRAVITY * dt;

            // Thrust counters gravity when moving up
            if (my < 0) {
                state.vy -= M.GRAVITY * HOVER_COUNTER * dt;
                state.thrustAngle = Math.atan2(my, mx || 0.001);
            }

            state.vx *= FRICTION;
            state.vy *= FRICTION;

            // Speed cap
            const spd = Math.hypot(state.vx, state.vy);
            if (spd > SPEED) {
                state.vx = (state.vx / spd) * SPEED;
                state.vy = (state.vy / spd) * SPEED;
            }
        }

        state.x += state.vx * dt;
        state.y += state.vy * dt;

        // Stage bounds clamping
        if (stage && stage.bounds) {
            const b = stage.bounds;
            const r = RADIUS;
            if (state.x - r < b.x)       { state.x = b.x + r; state.vx = 0; }
            if (state.x + r > b.x + b.w) { state.x = b.x + b.w - r; state.vx = 0; }
            if (state.y - r < b.y)       { state.y = b.y + r; state.vy = 0; }
            if (state.y + r > b.y + b.h) { state.y = b.y + b.h - r; state.vy = 0; }

            // Wall collision
            if (stage.walls) {
                for (const w of stage.walls) {
                    if (M.circleRect(state.x, state.y, r, w.x, w.y, w.w, w.h)) {
                        // Push out
                        const cx = state.x - (w.x + w.w / 2);
                        const cy = state.y - (w.y + w.h / 2);
                        if (Math.abs(cx / w.w) > Math.abs(cy / w.h)) {
                            state.x = cx > 0 ? w.x + w.w + r : w.x - r;
                            state.vx = 0;
                        } else {
                            state.y = cy > 0 ? w.y + w.h + r : w.y - r;
                            state.vy = 0;
                        }
                    }
                }
            }
        }

        // -- Aim --
        const camX = state.x - M.GAME_W / 2;
        const camY = state.y - M.GAME_H / 2;
        state.aimAngle = M.Input.aimAngle(state.x - camX, state.y - camY);

        // -- Dash --
        state.dashCooldown -= dt;
        if (M.Input.dash() && state.dashTimer <= 0 && state.dashCooldown <= 0 && !state.burstCharging) {
            state.dashTimer = DASH_DUR;
            state.dashCooldown = DASH_CD;
            const dashMx = mx || Math.cos(state.aimAngle);
            const dashMy = my || Math.sin(state.aimAngle);
            state.dashAngle = Math.atan2(dashMy, dashMx);
        }

        // -- Counterburst --
        if (M.Input.burst() && state.burstCharges > 0 && !state.burstCharging && state.dashTimer <= 0) {
            state.burstCharging = true;
            state.burstChargeTime = 0;
        }

        if (state.burstCharging) {
            state.burstChargeTime += dt;
            const projCount = M.Projectiles.countHostileNear(state.x, state.y, BURST_SAMPLE_R);
            const enemyCount = M.Enemies.countNear(state.x, state.y, BURST_SAMPLE_R);
            state.burstDangerCount = projCount + enemyCount;
            const dangerScale = Math.min(state.burstDangerCount / 30, 1);
            state.burstPredicted = Math.floor(BURST_BASE + (BURST_MAX - BURST_BASE) * dangerScale);

            M.Particles.counterburstCharge(state.x, state.y, BURST_SAMPLE_R * 0.6);

            if (!M.Input.burst()) {
                // Release!
                releaseCounterburst();
            }
        }

        // -- Firing --
        state.fireTimer -= dt;
        if (M.Input.firing() && state.fireTimer <= 0 && !state.burstCharging && state.dashTimer <= 0) {
            fire();
        }

        // -- Invincibility --
        if (state.invTimer > 0) state.invTimer -= dt;

        // -- Thrust particles --
        if (state.isThrusting && state.dashTimer <= 0 && !state.burstCharging) {
            const ta = Math.atan2(state.vy, state.vx);
            M.Particles.thrust(state.x, state.y, ta, state.mode === 'seeker' ? M.COL.seeker : M.COL.prism);
        }
    }

    function fire() {
        const rate = state.mode === 'seeker' ? FIRE_RATE_SEEKER : FIRE_RATE_PRISM;
        state.fireTimer = rate;
        const spread = 0.08;

        if (state.mode === 'seeker') {
            // Fire 2 homing darts
            for (let i = -1; i <= 1; i += 2) {
                M.Projectiles.spawn({
                    type: 'seekerDart',
                    x: state.x + Math.cos(state.aimAngle + Math.PI / 2 * i) * 6,
                    y: state.y + Math.sin(state.aimAngle + Math.PI / 2 * i) * 6,
                    angle: state.aimAngle + M.rand(-spread, spread),
                    speed: 500,
                    r: 4,
                    dmg: 1,
                    life: 2,
                    homing: 4,
                });
            }
        } else {
            // Prism: single bouncing beam segment
            M.Projectiles.spawn({
                type: 'prismBeam',
                x: state.x + Math.cos(state.aimAngle) * 12,
                y: state.y + Math.sin(state.aimAngle) * 12,
                angle: state.aimAngle + M.rand(-spread * 0.5, spread * 0.5),
                speed: 600,
                r: 3,
                dmg: 2,
                life: 3,
                maxBounces: 5,
            });
        }
    }

    function releaseCounterburst() {
        state.burstCharging = false;
        state.burstCharges--;

        // Absorb nearby enemy bullets
        const absorbed = M.Projectiles.absorbHostileNear(state.x, state.y, BURST_SAMPLE_R);
        const dangerScale = Math.min((state.burstDangerCount + absorbed) / 30, 1);
        const burstCount = Math.floor(BURST_BASE + (BURST_MAX - BURST_BASE) * dangerScale);

        // Spawn radial burst
        for (let i = 0; i < burstCount; i++) {
            const a = (i / burstCount) * M.TAU + M.rand(-0.02, 0.02);
            M.Projectiles.spawn({
                type: 'counterBurst',
                x: state.x,
                y: state.y,
                angle: a,
                speed: M.rand(350, 500),
                r: 3,
                dmg: 3,
                life: 1.2,
            });
        }

        M.Particles.counterburstRelease(state.x, state.y, burstCount);
        state.burstChargeTime = 0;
        state.burstDangerCount = 0;
        state.burstPredicted = 0;
        state.burstReleased = true; // signal game.js for aftermath effect

        // Recharge one burst charge after a delay (handled by game timer)
    }

    function takeDamage(dmg) {
        if (state.invTimer > 0 || M.Cascade.isInvincible() || state.dashTimer > 0) return false;
        state.hp -= dmg;
        state.invTimer = INV_TIME;
        M.addShake(6);
        M.Particles.explosion(state.x, state.y, 10, '#ff1744', 15);
        if (state.hp <= 0) {
            state.hp = 0;
            state.alive = false;
            M.Particles.explosionLarge(state.x, state.y, '#ff1744');
        }
        return true;
    }

    function rechargeBurst() {
        if (state.burstCharges < MAX_BURST) state.burstCharges++;
    }

    function draw(ctx, camX, camY) {
        if (!state.alive) return;
        const sx = state.x - camX;
        const sy = state.y - camY;

        // I-frame blink
        if (state.invTimer > 0 && Math.sin(state.invTimer * 30) > 0) return;

        // Delegate all rendering to the Zatan renderer
        M.ZatanRenderer.draw(ctx, sx, sy, state, null);
    }

    return {
        state, reset, update, draw, takeDamage, rechargeBurst,
        MAX_HP, MAX_BURST, RADIUS, NAME: CFG_NAME
    };
})();
