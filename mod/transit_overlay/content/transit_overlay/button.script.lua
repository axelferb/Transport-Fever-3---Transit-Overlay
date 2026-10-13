--- The "Transit Overlay" button in the mod button area (top left, next to the Layers button).
-- Clicking it runs one export (export.lua). The recipe never lets an error escape: an error in a
-- recipe drops the whole game UI, so everything runs in pcall and failures are logged.
-- @module transit_overlay.button
local react = require("::/gui/main/react.lua")
local builtin = require("::/gui/main/builtin.lua")

local EXPORT = "transit_overlay_1::/transit_overlay/export.lua"

local function log(msg)
	local p = debugPrint or print
	pcall(p, "[transit_overlay] " .. tostring(msg))
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
	local status = react.useState(0) -- 0 idle, 1 exported, 2 failed
	local ok, node = pcall(function()
		local s = status:old()
		local label = s == 1 and "Transit Overlay: exported" or s == 2 and "Transit Overlay: failed, see log" or "Transit Overlay"
		return builtin.BoxLayout{
			children = {
				builtin.Button{
					meta = { tooltip = "Send lines, stops, coverage, cargo, roads and terrain to the Transit Overlay app" },
					content = builtin.TextView{ text = label },
					onClick = function()
						status:set(run_export() and 1 or 2)
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
