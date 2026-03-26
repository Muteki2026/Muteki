// ============================================================
// Muteki - Stage System
// ============================================================
'use strict';

M.Stages = (() => {
    /*
     * Each stage has:
     *  - bounds: { x, y, w, h }
     *  - walls: [{ x, y, w, h }] solid geometry for prism bouncing
     *  - waves: [{ time, enemies: [{ type, x, y }] }]
     *  - boss: { type, x, y } (optional)
     *  - timeLimit: seconds
     *  - tileset: 'arena' | 'corridor' | 'factory'
     */

    const STAGES = [
        // --- Stage 1: Arena (open area, basic enemies) ---
        {
            name: 'SECTOR 01 - SCRAP YARD',
            tileset: 'arena',
            timeLimit: 90,
            bounds: { x: 0, y: 0, w: 1200, h: 800 },
            walls: [
                { x: 300, y: 350, w: 80, h: 40 },
                { x: 800, y: 250, w: 40, h: 120 },
                { x: 500, y: 600, w: 120, h: 30 },
            ],
            waves: [
                { time: 0, enemies: [
                    { type: 'flyer', x: 200, y: 150 },
                    { type: 'flyer', x: 400, y: 100 },
                    { type: 'hopper', x: 600, y: 700 },
                    { type: 'hopper', x: 800, y: 700 },
                ]},
                { time: 8, enemies: [
                    { type: 'turret', x: 100, y: 200 },
                    { type: 'turret', x: 1100, y: 200 },
                    { type: 'flyer', x: 600, y: 100 },
                    { type: 'flyer', x: 700, y: 100 },
                    { type: 'hopper', x: 300, y: 700 },
                ]},
                { time: 20, enemies: [
                    { type: 'sniper', x: 1000, y: 150 },
                    { type: 'flyer', x: 200, y: 200 },
                    { type: 'flyer', x: 300, y: 200 },
                    { type: 'hopper', x: 500, y: 700 },
                    { type: 'hopper', x: 700, y: 700 },
                    { type: 'turret', x: 600, y: 100 },
                ]},
                { time: 35, enemies: [
                    { type: 'laser', x: 150, y: 400 },
                    { type: 'laser', x: 1050, y: 400 },
                    { type: 'flyer', x: 400, y: 150 },
                    { type: 'flyer', x: 800, y: 150 },
                    { type: 'sniper', x: 1100, y: 100 },
                ]},
                { time: 50, enemies: [
                    { type: 'shield', x: 600, y: 300 },
                    { type: 'turret', x: 200, y: 400 },
                    { type: 'turret', x: 1000, y: 400 },
                    { type: 'hopper', x: 400, y: 700 },
                    { type: 'hopper', x: 800, y: 700 },
                    { type: 'flyer', x: 600, y: 100 },
                ]},
            ],
            boss: { type: 'helixWarden', x: 600, y: 300, time: 70 },
        },

        // --- Stage 2: Corridor (narrow, prism-friendly) ---
        {
            name: 'SECTOR 02 - SIGNAL CORRIDOR',
            tileset: 'corridor',
            timeLimit: 120,
            bounds: { x: 0, y: 0, w: 1600, h: 600 },
            walls: [
                { x: 200, y: 0,   w: 30, h: 200 },
                { x: 200, y: 400, w: 30, h: 200 },
                { x: 500, y: 150, w: 30, h: 300 },
                { x: 800, y: 0,   w: 30, h: 250 },
                { x: 800, y: 350, w: 30, h: 250 },
                { x: 1100,y: 100, w: 30, h: 400 },
                { x: 1350,y: 0,   w: 30, h: 200 },
                { x: 1350,y: 400, w: 30, h: 200 },
            ],
            waves: [
                { time: 0, enemies: [
                    { type: 'turret', x: 150, y: 300 },
                    { type: 'turret', x: 450, y: 300 },
                    { type: 'flyer', x: 350, y: 150 },
                    { type: 'flyer', x: 350, y: 450 },
                ]},
                { time: 10, enemies: [
                    { type: 'laser', x: 650, y: 300 },
                    { type: 'flamePivot', x: 700, y: 150 },
                    { type: 'hopper', x: 600, y: 500 },
                    { type: 'hopper', x: 700, y: 500 },
                ]},
                { time: 22, enemies: [
                    { type: 'sniper', x: 950, y: 100 },
                    { type: 'sniper', x: 950, y: 500 },
                    { type: 'shield', x: 900, y: 300 },
                    { type: 'turret', x: 750, y: 100 },
                    { type: 'turret', x: 750, y: 500 },
                ]},
                { time: 38, enemies: [
                    { type: 'spawner', x: 1200, y: 300 },
                    { type: 'laser', x: 1250, y: 100 },
                    { type: 'laser', x: 1250, y: 500 },
                    { type: 'flamePivot', x: 1150, y: 300 },
                ]},
                { time: 55, enemies: [
                    { type: 'shield', x: 1400, y: 200 },
                    { type: 'shield', x: 1400, y: 400 },
                    { type: 'turret', x: 1500, y: 100 },
                    { type: 'turret', x: 1500, y: 500 },
                    { type: 'flyer', x: 1300, y: 300 },
                    { type: 'sniper', x: 1550, y: 300 },
                ]},
            ],
            boss: { type: 'signalMarshal', x: 1400, y: 300, time: 85 },
        },

        // --- Stage 3: Factory (complex layout, final boss) ---
        {
            name: 'SECTOR 03 - CORE FACTORY',
            tileset: 'factory',
            timeLimit: 150,
            bounds: { x: 0, y: 0, w: 1400, h: 1000 },
            walls: [
                { x: 200, y: 200, w: 100, h: 100 },
                { x: 600, y: 400, w: 200, h: 40 },
                { x: 1000,y: 200, w: 100, h: 100 },
                { x: 200, y: 700, w: 100, h: 100 },
                { x: 1000,y: 700, w: 100, h: 100 },
                { x: 600, y: 150, w: 200, h: 30 },
                { x: 600, y: 820, w: 200, h: 30 },
                { x: 400, y: 500, w: 40, h: 200 },
                { x: 960, y: 500, w: 40, h: 200 },
            ],
            waves: [
                { time: 0, enemies: [
                    { type: 'turret', x: 100, y: 100 },
                    { type: 'turret', x: 1300, y: 100 },
                    { type: 'turret', x: 100, y: 900 },
                    { type: 'turret', x: 1300, y: 900 },
                    { type: 'flyer', x: 700, y: 200 },
                    { type: 'flyer', x: 700, y: 800 },
                ]},
                { time: 10, enemies: [
                    { type: 'flamePivot', x: 350, y: 500 },
                    { type: 'flamePivot', x: 1050, y: 500 },
                    { type: 'hopper', x: 500, y: 900 },
                    { type: 'hopper', x: 900, y: 900 },
                    { type: 'sniper', x: 700, y: 100 },
                ]},
                { time: 25, enemies: [
                    { type: 'spawner', x: 200, y: 500 },
                    { type: 'spawner', x: 1200, y: 500 },
                    { type: 'laser', x: 500, y: 300 },
                    { type: 'laser', x: 900, y: 300 },
                    { type: 'shield', x: 700, y: 500 },
                ]},
                { time: 45, enemies: [
                    { type: 'shield', x: 400, y: 300 },
                    { type: 'shield', x: 1000, y: 300 },
                    { type: 'flamePivot', x: 700, y: 700 },
                    { type: 'laser', x: 300, y: 800 },
                    { type: 'laser', x: 1100, y: 800 },
                    { type: 'sniper', x: 700, y: 100 },
                    { type: 'sniper', x: 100, y: 500 },
                    { type: 'sniper', x: 1300, y: 500 },
                ]},
                { time: 65, enemies: [
                    { type: 'spawner', x: 700, y: 300 },
                    { type: 'flamePivot', x: 400, y: 500 },
                    { type: 'flamePivot', x: 1000, y: 500 },
                    { type: 'turret', x: 600, y: 100 },
                    { type: 'turret', x: 800, y: 100 },
                    { type: 'turret', x: 600, y: 900 },
                    { type: 'turret', x: 800, y: 900 },
                    { type: 'shield', x: 700, y: 600 },
                ]},
            ],
            boss: { type: 'twinPress', x: 700, y: 400, time: 100 },
        },
    ];

    let currentStageIdx = 0;
    let stageTime = 0;
    let waveIdx = 0;
    let bossSpawned = false;

    function loadStage(idx) {
        currentStageIdx = M.clamp(idx, 0, STAGES.length - 1);
        stageTime = 0;
        waveIdx = 0;
        bossSpawned = false;
    }

    function getCurrent() {
        return STAGES[currentStageIdx];
    }

    function getStageIndex() { return currentStageIdx; }
    function getStageCount() { return STAGES.length; }

    function update(dt) {
        const stage = getCurrent();
        stageTime += dt;

        // Spawn waves
        while (waveIdx < stage.waves.length && stageTime >= stage.waves[waveIdx].time) {
            const wave = stage.waves[waveIdx];
            for (const edef of wave.enemies) {
                M.Enemies.spawn(edef.type, edef.x, edef.y);
            }
            waveIdx++;
        }

        // Spawn boss
        if (stage.boss && !bossSpawned && stageTime >= stage.boss.time) {
            bossSpawned = true;
            M.Bosses.spawn(stage.boss.type, stage.boss.x, stage.boss.y);
        }

        // Stage complete check
        const allWavesSpawned = waveIdx >= stage.waves.length;
        const noEnemies = M.Enemies.count() === 0;
        const bossDefeated = !stage.boss || (bossSpawned && !M.Bosses.isActive());

        return allWavesSpawned && noEnemies && bossDefeated;
    }

    function getTimeRemaining() {
        const stage = getCurrent();
        return stage.timeLimit - stageTime;
    }

    function getStageTime() { return stageTime; }

    // -- Stage background drawing --
    function drawBackground(ctx, camX, camY) {
        const stage = getCurrent();

        // Dark void background
        ctx.fillStyle = M.COL.bg;
        ctx.fillRect(0, 0, M.GAME_W, M.GAME_H);

        // Grid lines (sparse geometry silhouettes)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const gridSize = 80;
        const startX = -(camX % gridSize);
        const startY = -(camY % gridSize);

        for (let x = startX; x < M.GAME_W; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, M.GAME_H);
            ctx.stroke();
        }
        for (let y = startY; y < M.GAME_H; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(M.GAME_W, y);
            ctx.stroke();
        }

        // Tileset-specific ambient details
        switch (stage.tileset) {
            case 'arena':
                drawArenaBG(ctx, camX, camY, stage);
                break;
            case 'corridor':
                drawCorridorBG(ctx, camX, camY, stage);
                break;
            case 'factory':
                drawFactoryBG(ctx, camX, camY, stage);
                break;
        }

        // Draw walls
        if (stage.walls) {
            for (const w of stage.walls) {
                const wx = w.x - camX;
                const wy = w.y - camY;
                if (wx + w.w < -10 || wx > M.GAME_W + 10 || wy + w.h < -10 || wy > M.GAME_H + 10) continue;

                ctx.fillStyle = '#0f0f1a';
                ctx.fillRect(wx, wy, w.w, w.h);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(wx, wy, w.w, w.h);

                // Subtle corner accents
                const cs = 4;
                ctx.strokeStyle = 'rgba(100,200,255,0.08)';
                ctx.beginPath();
                ctx.moveTo(wx, wy + cs); ctx.lineTo(wx, wy); ctx.lineTo(wx + cs, wy);
                ctx.moveTo(wx + w.w - cs, wy); ctx.lineTo(wx + w.w, wy); ctx.lineTo(wx + w.w, wy + cs);
                ctx.moveTo(wx + w.w, wy + w.h - cs); ctx.lineTo(wx + w.w, wy + w.h); ctx.lineTo(wx + w.w - cs, wy + w.h);
                ctx.moveTo(wx + cs, wy + w.h); ctx.lineTo(wx, wy + w.h); ctx.lineTo(wx, wy + w.h - cs);
                ctx.stroke();
            }
        }

        // Stage boundary outline
        const bx = stage.bounds.x - camX;
        const by = stage.bounds.y - camY;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, stage.bounds.w, stage.bounds.h);
    }

    function drawArenaBG(ctx, camX, camY, stage) {
        // Sparse industrial shapes in background
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1;
        // Large circle motif
        const cx = stage.bounds.w / 2 - camX;
        const cy = stage.bounds.h / 2 - camY;
        ctx.beginPath();
        ctx.arc(cx, cy, 200, 0, M.TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 250, 0, M.TAU);
        ctx.stroke();
        ctx.restore();
    }

    function drawCorridorBG(ctx, camX, camY, stage) {
        // Horizontal pipe lines
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = '#7c4dff';
        ctx.lineWidth = 1;
        for (let y = 50; y < stage.bounds.h; y += 100) {
            const sy = y - camY;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(M.GAME_W, sy);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawFactoryBG(ctx, camX, camY, stage) {
        // Gear-like shapes
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = '#ffab00';
        ctx.lineWidth = 1;
        const positions = [
            [300, 300], [1100, 300], [700, 700], [300, 800], [1100, 800]
        ];
        for (const [px, py] of positions) {
            const sx = px - camX;
            const sy = py - camY;
            M.drawPoly(ctx, sx, sy, 40, 8, stageTime * 0.1, null, '#ffab00', 1);
        }
        ctx.restore();
    }

    return {
        loadStage, getCurrent, getStageIndex, getStageCount,
        update, getTimeRemaining, getStageTime, drawBackground
    };
})();
