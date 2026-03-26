# Particle Manager Autoload
# Lightweight particle effects via draw calls (no scene instantiation)
extends Node

var particles: Array[Dictionary] = []
const MAX_PARTICLES := 700

func spawn(opts: Dictionary) -> void:
	if particles.size() >= MAX_PARTICLES:
		# Remove oldest
		particles.pop_front()
	particles.append({
		"x": opts.get("x", 0.0),
		"y": opts.get("y", 0.0),
		"vx": opts.get("vx", 0.0),
		"vy": opts.get("vy", 0.0),
		"life": opts.get("life", 1.0),
		"max_life": opts.get("life", 1.0),
		"size": opts.get("size", 3.0),
		"color": opts.get("color", Color.WHITE),
		"friction": opts.get("friction", 0.96),
		"shrink": opts.get("shrink", 0.98),
	})

func explosion(x: float, y: float, count_p: int, color: Color, radius: float = 15.0) -> void:
	for i in count_p:
		var a := randf() * TAU
		var spd := randf_range(30, radius * 8)
		spawn({
			"x": x, "y": y,
			"vx": cos(a) * spd, "vy": sin(a) * spd,
			"life": randf_range(0.2, 0.6),
			"size": randf_range(1.5, 4.0),
			"color": color,
		})

func hit_spark(x: float, y: float, color: Color) -> void:
	for i in 4:
		var a := randf() * TAU
		var spd := randf_range(60, 120)
		spawn({
			"x": x, "y": y,
			"vx": cos(a) * spd, "vy": sin(a) * spd,
			"life": randf_range(0.1, 0.25),
			"size": randf_range(1.0, 2.5),
			"color": color,
		})

func dash_trail(x: float, y: float, color: Color) -> void:
	for i in 3:
		spawn({
			"x": x + randf_range(-4, 4), "y": y + randf_range(-4, 4),
			"vx": randf_range(-20, 20), "vy": randf_range(-20, 20),
			"life": 0.25,
			"size": randf_range(2.0, 5.0),
			"color": color,
			"friction": 0.9,
		})

func counterburst_charge(x: float, y: float, radius: float) -> void:
	var a := randf() * TAU
	var dist := randf_range(radius * 0.5, radius)
	spawn({
		"x": x + cos(a) * dist, "y": y + sin(a) * dist,
		"vx": -cos(a) * 80, "vy": -sin(a) * 80,
		"life": 0.3,
		"size": randf_range(1.5, 3.0),
		"color": Color(1, 1, 1, 0.8),
	})

func counterburst_release(x: float, y: float, count_p: int) -> void:
	var n := mini(count_p / 4, 40)
	for i in n:
		var a := randf() * TAU
		var spd := randf_range(100, 300)
		spawn({
			"x": x, "y": y,
			"vx": cos(a) * spd, "vy": sin(a) * spd,
			"life": randf_range(0.3, 0.8),
			"size": randf_range(2.0, 6.0),
			"color": Color.WHITE,
		})

func thrust(x: float, y: float, angle: float, color: Color) -> void:
	spawn({
		"x": x, "y": y,
		"vx": -cos(angle) * randf_range(30, 60),
		"vy": -sin(angle) * randf_range(30, 60),
		"life": randf_range(0.1, 0.2),
		"size": randf_range(1.5, 3.0),
		"color": color,
	})

func tier_burst(x: float, y: float, color: Color) -> void:
	for i in 20:
		var a := randf() * TAU
		var spd := randf_range(80, 200)
		spawn({
			"x": x, "y": y,
			"vx": cos(a) * spd, "vy": sin(a) * spd,
			"life": randf_range(0.4, 0.8),
			"size": randf_range(2.0, 5.0),
			"color": color,
		})

func update_particles(delta: float) -> void:
	var i := 0
	while i < particles.size():
		var p := particles[i]
		p["life"] -= delta
		if p["life"] <= 0:
			particles.remove_at(i)
			continue
		p["x"] += p["vx"] * delta
		p["y"] += p["vy"] * delta
		p["vx"] *= p["friction"]
		p["vy"] *= p["friction"]
		p["size"] *= p["shrink"]
		i += 1

func clear() -> void:
	particles.clear()
