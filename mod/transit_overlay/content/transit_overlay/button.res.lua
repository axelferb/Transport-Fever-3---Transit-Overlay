-- Registers the export button as a plugin of the mod button area (top left of the screen).
function data()
	return {
		type = "react-plugin ::MainModButtonAreaExtension",
		data = {
			filePath = "transit_overlay_1::/transit_overlay/button.script@TfoExportButton",
			order = 70,
		},
	}
end
