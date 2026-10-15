--- The Transit Overlay button in the mod button area (top left, next to the Layers button).
-- An icon button like its neighbours (a 32 x 32 toggle with a 24 x 24 icon, styled in
-- button.css.lua). Clicking it runs one export (export.lua); the tooltip says how the last one went.
-- After a successful export the toggle shows "on" for about two seconds as a confirmation, then
-- goes back to off: it is a push button that looks like the buttons next to it.
-- The recipe never lets an error escape: an error in a recipe drops the whole game UI, so
-- everything runs in pcall and failures are logged.
-- @module transit_overlay.button
local react = require("::/gui/main/react.lua")
local builtin = require("::/gui/main/builtin.lua")

local EXPORT = "transit_overlay_1::/transit_overlay/export.lua"
local ICON = "transit_overlay_1::/transit_overlay/icon.tga"
local LIT_TICKS = 4 -- half-second ticks the button stays lit after an export (about 2 s)
local TOOLTIP = "Transit Overlay: send lines, stops, coverage, cargo, roads and terrain to the desktop app"

local function log(msg)
	local p = debugPrint or print
	pcall(p, "[transit_overlay] " .. tostring(msg))
end

local function clock()
	local ok, t = pcall(os.date, "%H:%M")
	return ok and type(t) == "string" and t or nil
end

local function run_export()
	local ok, err = pcall(function()
		local export = require(EXPORT)
		export.run()
	end)
	if not ok then log("export failed: " .. tostring(err)) end
	return ok
end

local stub = {}

stub.TfoExportButton = react.RegisterRecipe("TfoExportButton", function()
	-- hooks first, the same on every render
	local status = react.useState("") -- tooltip line about the last export
	local lit = react.useState(false) -- shown as "on" right after a successful export
	local ticks = react.useRef(0)
	react.onStepTimer(function()
		pcall(function()
			if not lit:old() then return end
			ticks:set(ticks:get() + 1)
			if ticks:get() >= LIT_TICKS then lit:set(false) end
		end)
	end, 0.5)
	local ok, node = pcall(function()
		local last = status:old()
		local tooltip = last ~= "" and (TOOLTIP .. "\n" .. last) or TOOLTIP
		return builtin.BoxLayout{
			children = {
				builtin.ToggleButton{
					meta = { tooltip = tooltip, class = "tfo-export-toggle", id = "tfo.export" },
					content = builtin.ImageView{
						meta = { class = "tfo-export-icon" },
						path = ICON,
						scaling = builtin.type.ImageViewScaling.AutoFit,
					},
					value = lit:old() and 1 or 0,
					onValueChange = function()
						local t = clock()
						if run_export() then
							status:set("Last export: done" .. (t and (" at " .. t) or ""))
							ticks:set(0)
							lit:set(true)
						else
							status:set("Last export: failed, see the game log")
							lit:set(false)
						end
					end,
				},
			},
		}
	end)
	if ok and node then return node end
	log("button failed: " .. tostring(node))
	return builtin.BoxLayout{}
end)

-- The engine loads *.script.lua resources by calling data().
function data()
	return stub
end

return stub
