# Projectile Manager Autoload
# Pooled projectile system — handles spawning, movement, homing, bouncing
extends Node

const FRIENDLY_TYPES := ["seekerDart", "prismBeam", "counterBurst"]
const HOSTILE_TYPES := ["enemyBullet", "enemyMissile", "enemyLaser", "enemyFlame"]

var _pool: Array[Dictionary] = []
const POOL_SIZE := 400

func _ready() -> void:
	for i in POOL_SIZE:
		_pool.append(_make_projectile())

func _make_projectile() -> Dictionary:
	return {
		"active": false,
		"type": "enemyBullet",
		"x": 0.0, "y": 0.0,
		"vx": 0.0, "vy": 0.0,
		"r": 3.0,
		"dmg": 1,
		"life": 3.0,
		"angle": 0.0,
		"homing": 0.0,
		"bounces": 0,
		"max_bounces": 0,
		"speed": 300.0,
		"owner": "player",
	}

func spawn(opts: Dictionary) -> Dictionary:
	var p := _get_inactive()
	p["active"] = true
	p["type"] = opts.get("type", "enemyBullet")
	p["x"] = opts.get("x", 0.0)
	p["y"] = opts.get("y", 0.0)
	p["angle"] = opts.get("angle", 0.0)
	p["speed"] = opts.get("speed", 300.0)
	p["vx"] = cos(p["angle"]) * p["speed"]
	p["vy"] = sin(p["angle"]) * p["speed"]
	p["r"] = opts.get("r", 3.0)
	p["dmg"] = opts.get("dmg", 1)
	p["life"] = opts.get("life", 3.0)
	p["homing"] = opts.get("homing", 0.0)
	p["bounces"] = 0
	p["max_bounces"] = opts.get("max_bounces", 0)
	if p["type"] in FRIENDLY_TYPES:
		p["owner"] = "player"
	else:
		p["owner"] = "enemy"
	return p

func _get_inactive() -> Dictionary:
	for p in _pool:
		if not p["active"]:
			return p
	# Expand pool
	var p := _make_projectile()
	_pool.append(p)
	return p

func update(delta: float, bounds: Rect2, player_pos: Vector2, enemies: Array) -> void:
	for p in _pool:
		if not p["active"]:
			continue

		p["life"] -= delta
		if p["life"] <= 0:
			p["active"] = false
			continue

		# Homing
		if p["homing"] > 0:
			var target_pos := Vector2.ZERO
			var best_dist := INF
			if p["owner"] == "player" and enemies.size() > 0:
				for e in enemies:
					var d := Vector2(p["x"], p["y"]).distance_to(e.global_position)
					if d < best_dist:
						best_dist = d
						target_pos = e.global_position
			elif p["owner"] == "enemy":
				target_pos = player_pos
				best_dist = Vector2(p["x"], p["y"]).distance_to(player_pos)

			if best_dist < 400:
				var desired := atan2(target_pos.y - p["y"], target_pos.x - p["x"])
				var diff := GameManager.angle_diff(p["angle"], desired)
				p["angle"] += clampf(diff, -p["homing"] * delta, p["homing"] * delta)
				p["vx"] = cos(p["angle"]) * p["speed"]
				p["vy"] = sin(p["angle"]) * p["speed"]

		p["x"] += p["vx"] * delta
		p["y"] += p["vy"] * delta

		# Prism bouncing
		if p["max_bounces"] > 0:
			var bounced := false
			if p["x"] - p["r"] < bounds.position.x:
				p["x"] = bounds.position.x + p["r"]
				p["vx"] = absf(p["vx"])
				bounced = true
			if p["x"] + p["r"] > bounds.end.x:
				p["x"] = bounds.end.x - p["r"]
				p["vx"] = -absf(p["vx"])
				bounced = true
			if p["y"] - p["r"] < bounds.position.y:
				p["y"] = bounds.position.y + p["r"]
				p["vy"] = absf(p["vy"])
				bounced = true
			if p["y"] + p["r"] > bounds.end.y:
				p["y"] = bounds.end.y - p["r"]
				p["vy"] = -absf(p["vy"])
				bounced = true
			if bounced:
				p["bounces"] += 1
				p["angle"] = atan2(p["vy"], p["vx"])
				if p["bounces"] >= p["max_bounces"]:
					p["active"] = false
					continue

		# Out of bounds kill
		var margin := 100.0
		if p["x"] < bounds.position.x - margin or p["x"] > bounds.end.x + margin \
			or p["y"] < bounds.position.y - margin or p["y"] > bounds.end.y + margin:
			p["active"] = false

func count_hostile_near(x: float, y: float, radius: float) -> int:
	var c := 0
	var r2 := radius * radius
	for p in _pool:
		if p["active"] and p["type"] in HOSTILE_TYPES:
			var dx := p["x"] - x
			var dy := p["y"] - y
			if dx * dx + dy * dy < r2:
				c += 1
	return c

func absorb_hostile_near(x: float, y: float, radius: float) -> int:
	var c := 0
	var r2 := radius * radius
	for p in _pool:
		if p["active"] and p["type"] in HOSTILE_TYPES:
			var dx := p["x"] - x
			var dy := p["y"] - y
			if dx * dx + dy * dy < r2:
				p["active"] = false
				c += 1
	return c

func get_all_active() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for p in _pool:
		if p["active"]:
			result.append(p)
	return result

func get_friendly() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for p in _pool:
		if p["active"] and p["type"] in FRIENDLY_TYPES:
			result.append(p)
	return result

func get_hostile() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for p in _pool:
		if p["active"] and p["type"] in HOSTILE_TYPES:
			result.append(p)
	return result

func clear_all() -> void:
	for p in _pool:
		p["active"] = false
