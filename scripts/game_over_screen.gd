# Game Over Screen
extends Control

signal restart_pressed

func _ready() -> void:
	visible = false
	GameManager.game_over.connect(_on_game_over)
	GameManager.stage_completed.connect(_on_stage_complete)

func _on_game_over() -> void:
	visible = true
	queue_redraw()

func _on_stage_complete() -> void:
	visible = true
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed("ui_start") or event.is_action_pressed("ui_accept") or event.is_action_pressed("counterburst"):
		restart_pressed.emit()
		accept_event()

func _draw() -> void:
	if not visible:
		return

	# Dim overlay
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.75))

	var cx := size.x / 2.0
	var cy := size.y / 2.0

	var title_text := "MISSION COMPLETE" if GameManager.state == GameManager.GameState.STAGE_COMPLETE else "MISSION FAILED"
	var title_col := Color(0, 0.898, 1.0) if GameManager.state == GameManager.GameState.STAGE_COMPLETE else Color(1, 0.09, 0.267)

	draw_string(ThemeDB.fallback_font, Vector2(cx - 100, cy - 30), title_text,
		HORIZONTAL_ALIGNMENT_CENTER, 200, 24, title_col)

	draw_string(ThemeDB.fallback_font, Vector2(cx - 80, cy + 10), "SCORE: " + str(GameManager.score),
		HORIZONTAL_ALIGNMENT_CENTER, 160, 16, Color.WHITE)

	var alpha := 0.4 + sin(Time.get_ticks_msec() * 0.004) * 0.3
	draw_string(ThemeDB.fallback_font, Vector2(cx - 100, cy + 60), "PRESS ENTER TO RESTART",
		HORIZONTAL_ALIGNMENT_CENTER, 200, 12, Color(1, 1, 1, alpha))
