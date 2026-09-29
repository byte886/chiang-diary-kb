-- 递归遍历 Chrome 窗口（跳过 AXWebArea），收集所有原生 AXButton，
-- 点击位置最靠右且非窗口框架按钮中的最右一个（「允许」永远在对话框最右）。
on walk(e, depth)
	global btns
	if depth > 14 then return
	try
		if (role of e) is "AXButton" then
			set p to position of e
			set s to size of e
			set t to title of e
			set d to description of e
			set end of btns to {item 1 of p, item 2 of p, item 1 of s, item 2 of s, t, d}
		end if
	end try
	try
		if (role of e) is "AXWebArea" then return
	end try
	try
		set kids to UI elements of e
		repeat with k in kids
			my walk(k, depth + 1)
		end repeat
	end try
end walk

on run
	tell application "System Events"
		if not (exists process "Google Chrome") then return "NOCHROME"
		tell process "Google Chrome"
			set btns to {}
			repeat with w in windows
				my walk(w, 0)
			end repeat
			-- 筛选：对话框按钮（标题长度 1-4，描述为空，y 在窗口中部 400-1100，x>700）
			set cands to {}
			repeat with b in btns
				set bx to item 1 of b
				set by to item 2 of b
				set bw to item 3 of b
				set t to item 5 of b
				set d to item 6 of b
				if d is "" and (count of t) <= 4 and (count of t) >= 1 then
					if by > 400 and by < 1100 and bx > 700 and bw < 200 then
						set end of cands to b
					end if
				end if
			end repeat
			if (count of cands) = 0 then return "NOTFOUND"
			-- 取 x 最大者
			set best to item 1 of cands
			repeat with b in cands
				if (item 1 of b) > (item 1 of best) then set best to b
			end repeat
			set bx to item 1 of best
			set by to item 2 of best
			set bw to item 3 of best
			set bh to item 4 of best
			set cx to (bx + (bw / 2)) as integer
			set cy to (by + (bh / 2)) as integer
			-- 通过坐标点击按钮中心（cliclick），避免 AXPress 兼容问题
			do shell script "/usr/local/bin/cliclick c:" & cx & "," & cy
			return "CLICKED " & cx & "," & cy
		end tell
	end tell
end run
