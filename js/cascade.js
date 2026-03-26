// ============================================================
// Muteki - Cascade System (Explosion Chain Counter)
// ============================================================
'use strict';

M.Cascade = (() => {
    const TIERS = [
        { threshold: 50,  dropTier: 1, color: '#00e5ff',  label: 'CHAIN x50' },
        { threshold: 100, dropTier: 2, color: '#ffab00',  label: 'CHAIN x100' },
        { threshold: 200, dropTier: 3, color: '#ff4081',  label: 'CHAIN x200' },
        { threshold: 400, dropTier: 4, color: '#e040fb',  label: 'CHAIN x400' },
        { threshold: 500, dropTier: 4, color: '#ffd740',  label: 'INVINCIBLE!' },
    ];

    let count = 0;
    let decayTimer = 0;
    let currentTier = -1;
    let maxCount = 0;
    let invincible = false;
    let invincibleTimer = 0;
    let tierFlash = 0;
    let tierFlashColor = '';
    let tierFlashLabel = '';
    let tierPopIdx = -1;   // which tier just popped
    let tierPopTimer = 0;  // animation timer for meter pop

    const DECAY_TIME = 1.5; // seconds without a kill before decay
    const DECAY_RATE = 20;  // per second
    const INVINCIBLE_DURATION = 4; // seconds

    function reset() {
        count = 0;
        decayTimer = 0;
        currentTier = -1;
        maxCount = 0;
        invincible = false;
        invincibleTimer = 0;
        tierFlash = 0;
        tierPopIdx = -1;
        tierPopTimer = 0;
    }

    function addKill(enemyX, enemyY) {
        count++;
        decayTimer = DECAY_TIME;
        if (count > maxCount) maxCount = count;

        // Check tier crossings
        for (let i = TIERS.length - 1; i >= 0; i--) {
            if (count >= TIERS[i].threshold && currentTier < i) {
                currentTier = i;
                tierFlash = 1.0;
                tierFlashColor = TIERS[i].color;
                tierFlashLabel = TIERS[i].label;
                tierPopIdx = i;
                tierPopTimer = 0.5;

                // Spawn tier-appropriate drop
                M.Pickups.spawn(enemyX, enemyY, TIERS[i].dropTier);
                M.Particles.tierBurst(enemyX, enemyY, TIERS[i].color);

                // Invincibility at 500
                if (TIERS[i].threshold >= 500) {
                    invincible = true;
                    invincibleTimer = INVINCIBLE_DURATION;
                }
                break;
            }
        }

        // Regular drop (base tier)
        if (Math.random() < 0.3) {
            const dropTier = currentTier >= 0 ? Math.min(currentTier, 2) : 0;
            M.Pickups.spawn(enemyX, enemyY, dropTier);
        }
    }

    function update(dt) {
        // Decay
        decayTimer -= dt;
        if (decayTimer <= 0 && count > 0) {
            count -= DECAY_RATE * dt;
            if (count <= 0) {
                count = 0;
                currentTier = -1;
            } else {
                // Update tier
                currentTier = -1;
                for (let i = TIERS.length - 1; i >= 0; i--) {
                    if (count >= TIERS[i].threshold) { currentTier = i; break; }
                }
            }
        }

        // Invincibility timer
        if (invincible) {
            invincibleTimer -= dt;
            if (invincibleTimer <= 0) {
                invincible = false;
            }
        }

        // Tier flash
        if (tierFlash > 0) {
            tierFlash -= dt * 2;
        }

        // Tier pop
        if (tierPopTimer > 0) {
            tierPopTimer -= dt;
        }
    }

    function getCount() { return Math.floor(count); }
    function getMaxCount() { return maxCount; }
    function getTier() { return currentTier; }
    function isInvincible() { return invincible; }
    function getInvincibleTimer() { return invincibleTimer; }
    function getTierFlash() { return tierFlash; }
    function getTierFlashColor() { return tierFlashColor; }
    function getTierFlashLabel() { return tierFlashLabel; }
    function getTierPopIdx() { return tierPopIdx; }
    function getTierPopTimer() { return tierPopTimer; }
    function getTiers() { return TIERS; }

    return {
        reset, addKill, update,
        getCount, getMaxCount, getTier, isInvincible,
        getInvincibleTimer, getTierFlash, getTierFlashColor,
        getTierFlashLabel, getTierPopIdx, getTierPopTimer, getTiers
    };
})();
