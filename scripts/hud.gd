# HUD — Game overlay display
# HP, mode, burst charges, cascade meter, score, timer
extends Control

var player: Node = null  # Set by stage script
var stage_ref: Node = null  # Set by stage script (optional)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Find stage ref
	stage_ref = get_tree().current_scene

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	if not player:
		return

	var pad := 10.0
	_draw_hp(pad)
	_draw_mode(pad)
	_draw_burst(pad)
	_draw_cascade_meter(pad)
	_draw_score(pad)
	_draw_timer(pad)
	_draw_tier_flash()
	_draw_invincible_banner()

func _draw_hp(pad: float) -> void:
	var hp_x := pad + 4
	var hp_y := pad + 4
	var seg_w := 16.0
	var seg_h := 10.0
	var seg_gap := 3.0

	for i in player.MAX_HP:
		var x := hp_x + i * (seg_w + seg_gap)
		var col: Color
		if i < player.hp:
			var hp_pct := float(player.hp) / float(player.MAX_HP)
			col = GameManager.COL["hp_full"] if hp_pct > 0.3 else GameManager.COL["hp_low"]
		else:
			col = Color(1, 1, 1, 0.08)

		# Slight skew effect via manual quad
		var pts := PackedVector2Array([
			Vector2(x - 2, hp_y),
			Vector2(x + seg_w - 2, hp_y),
			Vector2(x + seg_w, hp_y + seg_h),
			Vector2(x, hp_y + seg_h),
		])
		draw_colored_polygon(pts, col)

	# HP label
	draw_string(ThemeDB.fallback_font, Vector2(hp_x - 2, hp_y + seg_h + 18), "HP",
		HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, 1, 1, 0.4))

	# Player name
	draw_string(ThemeDB.fallback_font, Vector2(hp_x + 34, hp_y + seg_h + 18), "ZATAN",
		HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(1, 1, 1, 0.25))

func _draw_mode(pad: float) -> void:
	var hp_x := pad + 4
	var mode_y := pad + 42
	var mode_txt: String = "SEEK" if player.mode == "seeker" else "PRISM"
	var mode_col: Color = GameManager.COL["seeker"] if player.mode == "seeker" else GameManager.COL["prism"]

	draw_string(ThemeDB.fallback_font, Vector2(hp_x, mode_y), mode_txt,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 12, mode_col)

	# Mode icon
	if player.mode == "seeker":
		# Triangle
		var icon_x := hp_x + 52
		var icon_y := mode_y - 8
		draw_colored_polygon(PackedVector2Array([
			Vector2(icon_x, icon_y - 4),
			Vector2(icon_x - 4, icon_y + 4),
			Vector2(icon_x + 4, icon_y + 4),
		]), mode_col)
	else:
		# Diamond
		var icon_x := hp_x + 52
		var icon_y := mode_y - 4
		draw_colored_polygon(PackedVector2Array([
			Vector2(icon_x, icon_y - 5),
			Vector2(icon_x + 4, icon_y),
			Vector2(icon_x, icon_y + 5),
			Vector2(icon_x - 4, icon_y),
		]), mode_col)

func _draw_burst(pad: float) -> void:
	var hp_x := pad + 4
	var burst_y := pad + 56

	for i in player.MAX_BURST:
		var bx := hp_x + i * 14
		var col: Color
		if i < player.burst_charges:
			col = Color(1.0, 0.671, 0.0)  # #ffab00
		else:
			col = Color(1, 1, 1, 0.08)
		draw_rect(Rect2(bx, burst_y, 10, 6), col)

	draw_string(ThemeDB.fallback_font, Vector2(hp_x - 2, burst_y + 18), "BURST",
		HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, 1, 1, 0.4))

func _draw_cascade_meter(pad: float) -> void:
	var meter_x := pad + 4
	var meter_y := GameManager.GAME_H - pad - 16
	var meter_w := 200.0
	var meter_h := 8.0
	var count := CascadeManager.get_count()
	var max_display := 500.0

	# Background
	draw_rect(Rect2(meter_x, meter_y, meter_w, meter_h), Color(1, 1, 1, 0.06))

	# Fill
	var fill_w := (minf(count, max_display) / max_display) * meter_w
	var tier_idx := CascadeManager.get_tier()
	var fill_color: Color = CascadeManager.TIERS[tier_idx]["color"] if tier_idx >= 0 else GameManager.COL["cascade"]
	draw_rect(Rect2(meter_x, meter_y, fill_w, meter_h), fill_color)

	# Tier notch lines
	for t in CascadeManager.TIERS:
		var nx := meter_x + (t["threshold"] / max_display) * meter_w
		draw_line(Vector2(nx, meter_y - 2), Vector2(nx, meter_y + meter_h + 2), Color(1, 1, 1, 0.3), 1.0)

	# Count text
	draw_string(ThemeDB.fallback_font, Vector2(meter_x, meter_y - 4), "CASCADE " + str(count),
		HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, 1, 1, 0.5))

func _draw_score(pad: float) -> void:
	var score_x := GameManager.GAME_W - pad
	# Score label
	draw_string(ThemeDB.fallback_font, Vector2(score_x - 100, pad + 10), "SCORE",
		HORIZONTAL_ALIGNMENT_RIGHT, 100, 9, Color(1, 1, 1, 0.4))
	# Score value
	draw_string(ThemeDB.fallback_font, Vector2(score_x - 100, pad + 24), _format_number(GameManager.score),
		HORIZONTAL_ALIGNMENT_RIGHT, 100, 14, Color.WHITE)

func _draw_timer(pad: float) -> void:
	var timer_x := GameManager.GAME_W - pad
	var time_remaining := 90.0
	if stage_ref and stage_ref.has_method("get_time_remaining"):
		time_remaining = stage_ref.get_time_remaining()

	var time_str := _format_time(time_remaining)
	var timer_y := pad + 40

	if time_remaining < 0:
		var flash := fmod(Time.get_ticks_msec() / 1000.0, 1.0)
		var col := Color(1, 0.09, 0.267) if flash > 0.5 else Color(1, 0.09, 0.267, 0.5)
		draw_string(ThemeDB.fallback_font, Vector2(timer_x - 120, timer_y), "OVERCLOCK " + time_str,
			HORIZONTAL_ALIGNMENT_RIGHT, 120, 12, col)
	else:
		draw_string(ThemeDB.fallback_font, Vector2(timer_x - 80, timer_y), time_str,
			HORIZONTAL_ALIGNMENT_RIGHT, 80, 12, Color(1, 1, 1, 0.6))

	# Stage label (top center)
	var stage_name := "SECTOR 01"
	if stage_ref and stage_ref.has_method("get_stage_name"):
		stage_name = stage_ref.get_stage_name()
	draw_string(ThemeDB.fallback_font, Vector2(GameManager.GAME_W / 2 - 60, pad + 14), stage_name,
		HORIZONTAL_ALIGNMENT_CENTER, 120, 10, Color(1, 1, 1, 0.3))

func _draw_tier_flash() -> void:
	if CascadeManager.tier_flash > 0:
		var col := CascadeManager.tier_flash_color
		col.a = CascadeManager.tier_flash
		draw_string(ThemeDB.fallback_font,
			Vector2(GameManager.GAME_W / 2 - 80, GameManager.GAME_H / 2 - 40),
			CascadeManager.tier_flash_label,
			HORIZONTAL_ALIGNMENT_CENTER, 160, 24, col)

func _draw_invincible_banner() -> void:
	if CascadeManager.is_invincible():
		var alpha := 0.6 + sin(Time.get_ticks_msec() * 0.008) * 0.3
		draw_string(ThemeDB.fallback_font,
			Vector2(GameManager.GAME_W / 2 - 60, GameManager.GAME_H - 40),
			"INVINCIBLE",
			HORIZONTAL_ALIGNMENT_CENTER, 120, 14, Color(1.0, 0.843, 0.251, alpha))

func _format_time(t: float) -> String:
	var abs_t := absf(t)
	var m := int(abs_t) / 60
	var s := int(abs_t) % 60
	var prefix := "-" if t < 0 else ""
	return prefix + str(m).pad_zeros(2) + ":" + str(s).pad_zeros(2)

func _format_number(n: int) -> String:
	var s := str(n)
	var result := ""
	var count := 0
	for i in range(s.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			result = "," + result
		result = s[i] + result
		count += 1
	return result
