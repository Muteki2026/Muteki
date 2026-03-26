# Cascade Manager Autoload
# Explosion chain counter & drop system — ported from prototype
extends Node

const TIERS := [
	{ "threshold": 50,  "drop_tier": 1, "color": Color(0.0, 0.898, 1.0),   "label": "CHAIN x50" },
	{ "threshold": 100, "drop_tier": 2, "color": Color(1.0, 0.671, 0.0),   "label": "CHAIN x100" },
	{ "threshold": 200, "drop_tier": 3, "color": Color(1.0, 0.251, 0.506), "label": "CHAIN x200" },
	{ "threshold": 400, "drop_tier": 4, "color": Color(0.878, 0.251, 0.984),"label": "CHAIN x400" },
	{ "threshold": 500, "drop_tier": 4, "color": Color(1.0, 0.843, 0.251), "label": "INVINCIBLE!" },
]

var count: float = 0.0
var decay_timer: float = 0.0
var current_tier: int = -1
var max_count: float = 0.0
var invincible: bool = false
var invincible_timer: float = 0.0
var tier_flash: float = 0.0
var tier_flash_color: Color = Color.WHITE
var tier_flash_label: String = ""

const DECAY_TIME := 1.5
const DECAY_RATE := 20.0
const INVINCIBLE_DURATION := 4.0

signal tier_crossed(tier_idx: int, label: String, color: Color)
signal invincibility_started
signal invincibility_ended

func reset() -> void:
	count = 0.0
	decay_timer = 0.0
	current_tier = -1
	max_count = 0.0
	invincible = false
	invincible_timer = 0.0
	tier_flash = 0.0

func add_kill(enemy_pos: Vector2) -> void:
	count += 1.0
	decay_timer = DECAY_TIME
	if count > max_count:
		max_count = count

	# Check tier crossings
	for i in range(TIERS.size() - 1, -1, -1):
		if count >= TIERS[i]["threshold"] and current_tier < i:
			current_tier = i
			tier_flash = 1.0
			tier_flash_color = TIERS[i]["color"]
			tier_flash_label = TIERS[i]["label"]
			tier_crossed.emit(i, TIERS[i]["label"], TIERS[i]["color"])

			if TIERS[i]["threshold"] >= 500:
				invincible = true
				invincible_timer = INVINCIBLE_DURATION
				invincibility_started.emit()
			break

func _process(delta: float) -> void:
	# Decay
	decay_timer -= delta
	if decay_timer <= 0 and count > 0:
		count -= DECAY_RATE * delta
		if count <= 0:
			count = 0.0
			current_tier = -1
		else:
			current_tier = -1
			for i in range(TIERS.size() - 1, -1, -1):
				if count >= TIERS[i]["threshold"]:
					current_tier = i
					break

	# Invincibility timer
	if invincible:
		invincible_timer -= delta
		if invincible_timer <= 0:
			invincible = false
			invincibility_ended.emit()

	# Tier flash decay
	if tier_flash > 0:
		tier_flash -= delta * 1.5
		if tier_flash < 0:
			tier_flash = 0

func get_count() -> int:
	return int(count)

func get_tier() -> int:
	return current_tier

func is_invincible() -> bool:
	return invincible
