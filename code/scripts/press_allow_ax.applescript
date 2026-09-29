-- 等待 Chrome 远程调试授权弹窗，直接点击「允许」按钮（AX，不用坐标）
-- 用法: osascript press_allow_ax.applescript [超时秒]
on run argv
	set timeoutSec to 120
	if (count of argv) > 0 then set timeoutSec to (item 1 of argv) as integer
	set t0 to current date
	repeat until (current date) - t0 > timeoutSec
		tell application "System Events"
			if exists process "Google Chrome" then
				tell process "Google Chrome"
					repeat with w in windows
						try
							repeat with b in (buttons of w)
								if (title of b) is "允许" then
									click b
									return "clicked window allow"
								end if
							end repeat
						end try
						try
							repeat with s in (sheets of w)
								repeat with b in (buttons of s)
									if (title of b) is "允许" then
										click b
										return "clicked sheet allow"
									end if
								end repeat
							end repeat
						end try
					end repeat
				end tell
			end if
		end tell
		delay 0.4
	end repeat
	return "timeout"
end run
