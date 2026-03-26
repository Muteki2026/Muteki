# Title Screen
# Press Enter / Space to start
extends Control

signal start_pressed

func _ready() -> void:
	GameManager.state = GameManager.GameState.TITLE

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_start") or event.is_action_pressed("ui_accept") or event.is_action_pressed("counterburst"):
		start_pressed.emit()
		accept_event()

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	# Full black background
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.04, 0.07))

	var cx := size.x / 2.0
	var cy := size.y / 2.0

	# Title text
	draw_string(ThemeDB.fallback_font, Vector2(cx - 100, cy - 60), "MUTEKI",
		HORIZONTAL_ALIGNMENT_CENTER, 200, 48, Color(0.0, 0.898, 1.0))

	# Subtitle
	draw_string(ThemeDB.fallback_font, Vector2(cx - 120, cy - 20), "INVINCIBLE MACHINE",
		HORIZONTAL_ALIGNMENT_CENTER, 240, 14, Color(1.0, 0.251, 0.506))

	# Zatan identity line
	draw_string(ThemeDB.fallback_font, Vector2(cx - 80, cy + 20), "PILOT: ZATAN",
		HORIZONTAL_ALIGNMENT_CENTER, 160, 10, Color(1, 1, 1, 0.3))

	# Prompt (pulsing)
	var alpha := 0.4 + sin(Time.get_ticks_msec() * 0.004) * 0.3
	draw_string(ThemeDB.fallback_font, Vector2(cx - 100, cy + 80), "PRESS ENTER TO START",
		HORIZONTAL_ALIGNMENT_CENTER, 200, 12, Color(1, 1, 1, alpha))

	# Controls hint
	var hint_y := cy + 140
	draw_string(ThemeDB.fallback_font, Vector2(cx - 120, hint_y), "WASD Move  |  Arrows Aim/Fire",
		HORIZONTAL_ALIGNMENT_CENTER, 240, 9, Color(1, 1, 1, 0.2))
	draw_string(ThemeDB.fallback_font, Vector2(cx - 120, hint_y + 14), "SPACE Burst  |  SHIFT Dash  |  E Swap",
		HORIZONTAL_ALIGNMENT_CENTER, 240, 9, Color(1, 1, 1, 0.2))

	# Decorative lines
	draw_line(Vector2(cx - 120, cy - 40), Vector2(cx + 120, cy - 40), Color(0, 0.898, 1.0, 0.15), 1.0)
	draw_line(Vector2(cx - 80, cy + 40), Vector2(cx + 80, cy + 40), Color(1, 0.251, 0.506, 0.1), 1.0)
