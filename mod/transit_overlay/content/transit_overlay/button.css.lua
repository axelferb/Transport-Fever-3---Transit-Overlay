-- The export button in the mod button area (button.script.lua): the size, padding and margins of
-- the other buttons there (a 32 x 32 toggle with a 24 x 24 icon, margins 1, 1, 2, 1), so the area
-- spaces all of them alike. Only this mod's own classes are selected.
local ssu = require("::/gui/main/stylesheetutil.lua")

function data()
	local result = {}
	local add = ssu.makeAdder(result)
	add("ToggleButton!tfo-export-toggle", {
		size = { 32, 32 }, minSize = { 32, 32 }, maxSize = { 32, 32 },
		padding = { 4, 4, 4, 4 }, margin = { 1, 1, 2, 1 }, gravity = { 0.5, 0.5 },
	})
	add("ToggleButton!tfo-export-toggle ImageView!tfo-export-icon", {
		size = { 24, 24 }, minSize = { 24, 24 }, maxSize = { 24, 24 }, gravity = { 0.5, 0.5 },
	})
	return result
end
