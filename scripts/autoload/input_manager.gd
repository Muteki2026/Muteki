# Input Manager Autoload
# Handles keyboard input and provides clean movement/aim vectors
extends Node

# Movement vector (WASD)
var move_dir: Vector2 = Vector2.ZERO
# Aim vector (arrow keys, normalized to 8-way)
var aim_dir: Vector2 = Vector2.RIGHT
var aim_angle: float = 0.0
var is_firing: bool = false

# One-shot actions (consumed after read)
var _swap_pressed: bool = false
var _dash_pressed: bool = false

func _process(_delta: float) -> void:
	# Movement (WASD)
	move_dir = Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		move_dir.x -= 1.0
	if Input.is_action_pressed("move_right"):
		move_dir.x += 1.0
	if Input.is_action_pressed("move_up"):
		move_dir.y -= 1.0
	if Input.is_action_pressed("move_down"):
		move_dir.y += 1.0
	if move_dir.length_squared() > 0:
		move_dir = move_dir.normalized()

	# Aim (Arrow keys) — snaps to 8-way when keys held
	var raw_aim := Vector2.ZERO
	if Input.is_action_pressed("aim_left"):
		raw_aim.x -= 1.0
	if Input.is_action_pressed("aim_right"):
		raw_aim.x += 1.0
	if Input.is_action_pressed("aim_up"):
		raw_aim.y -= 1.0
	if Input.is_action_pressed("aim_down"):
		raw_aim.y += 1.0

	if raw_aim.length_squared() > 0:
		aim_dir = raw_aim.normalized()
		aim_angle = aim_dir.angle()
		is_firing = true
	else:
		is_firing = false

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("swap_mode"):
		_swap_pressed = true
	if event.is_action_pressed("dash"):
		_dash_pressed = true

func is_burst_held() -> bool:
	return Input.is_action_pressed("counterburst")

func consume_swap() -> bool:
	if _swap_pressed:
		_swap_pressed = false
		return true
	return false

func consume_dash() -> bool:
	if _dash_pressed:
		_dash_pressed = false
		return true
	return false
