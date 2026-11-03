# Changelog

## 2.14.0
- Building card: in Coverage or Cargo, click a home, shop or workplace (Edit tool) to see who lives, works or shops there and how they travel (walk, car, lines), which lines they were riding when you exported and between which stops, and, for shops, town industry and industries, where each kind of goods comes from, on which lines, and how many items are in vehicles, waiting at a station or still at the source. Needs mod revision 7.
- Inspect tool: the first tool in Coverage and Cargo (and in Lines, key I). Click a building, stop, industry or line to see its card; nothing moves. Edit now only moves points, adds bends and cuts.
- First-start tips: a short "How Transit Overlay works" on the first start, and later from ⚙ Settings → Shortcuts → "How the app works".
- Mod revision 7: exports every person's home, shop and workplace with the move mode used, everyone on a line with their stops, and every cargo item with its source, target and lines. Restart the game so mod.io updates it, then re-import. The console command does not carry this data (it would go over the paste limit).

## 2.13.0
- Schematic map, redrawn for bus networks after LOOM (Freiburg): stretches shared by several lines become one corridor with the lines ordered so they need not cross where they part; stations have one port per line, so a terminal where three or more lines end is a hub box with the station's name and a bay per line in the order they leave; a line that doubles back round a ring of stops is drawn as one stroke that forks into a box (three stops make a triangle); each line leaving a terminal keeps to its own wedge of the compass, stops keep off stretches and loops they are not part of, and everything is spread further out.

## 2.12.0
- Line stats: the selected line's card shows its stops, length, vehicles and seats (vehicles need mod revision 6).
- Hide lines: an eye in the line list hides a line from the map without deleting it; "Show all" and "Hide all" sit in the list's title.
- Hovering a stop or station in any tool shows a card with its name, kind, lines and what it reaches.
- Vehicle routes: with a game line selected, a thin thread with arrows shows the route its vehicles were actually driving when you exported; the card says how many stretches were recorded.
- Station buildings (bus and tram stations, railway stations) get a square plate behind their marker, so they stand apart from stops on the road; the station card says how many terminals it has.
- Coverage: every catchment circle of a game stop is drawn (a station has one per terminal); stops that only idle lines call at no longer count as reached; the station card says how many residents and jobs the game itself counts in a stop's catchment; a planned stop's reach defaults to the usual reach of the stops in your save.
- Game map: roads and buildings are drawn as vectors at the current zoom, so they stay crisp however far you zoom in. Three looks in ⚙ Settings → Map display: Atlas, Plan, Ink.
- Heatmaps: four looks in ⚙ Settings → Map display: Ember, Field guide, Bands, Sea.
- Mod revision 6: exports every catchment circle, station buildings vs road stops, and vehicles per line. Restart the game so mod.io updates it, or copy the console command again, then re-import.
- Under the hood: the app is split into one file per area instead of one 4,300-line page.

## 2.11.0
- Game map: roads are drawn by size and type, like a road atlas — lanes thin, town streets white, avenues yellow, country roads grey-edged, highways orange. Needs mod revision 5 (restart the game so mod.io updates it) or a freshly copied console command, then re-import.

## 2.10.0
- New look: warmer colours, bigger controls, cards in the side panel, and a legend on the map.
- Theme setting: light, dark, or follow the system (⚙ Settings → Map display).
- Coverage: reached buildings are green, unreached orange-red, and what a planned stop would add is light green; the stop card says how many people it gives a stop.
- Lines: the selected line's mode and colour are picked from pills and swatches.
- Schematic map is a tab.
- Cargo: "Shops" and "Town industry"; the legend names the goods you picked.
- After an update, the app shows what changed.

## 2.9.0
- Schematic map has a new look: town boxes, straighter lines with rounded bends, line badges at the ends, a distinct colour per line and a legend grouped by mode.
- Light rail and other lines that run on their own tracks now follow those tracks instead of snapping to nearby roads.

## 2.8.0
- Cargo heatmap: shows unmet demand for goods in towns.
- Suggested cargo stops: the best spots for a new cargo stop, each with the nearest industry that makes the goods.

## 2.7.3
- Schematic map: lines that are split into pieces on the game map now stay connected, following the game's stop order.

## 2.7.2
- Schematic map: choose which kinds of lines (bus, tram, train and so on) and which single lines to show.

## 2.7.1
- Suggested stop spots can be turned off, just like the heatmap.

## 2.7.0
- Coverage heatmap: shows where people live and work outside the reach of your stops.
- Suggested stops: the best spots for a new stop.
- Schematic map: a metro-style diagram of your network, saved as PNG or SVG.
- German translation, with a language setting.
- Warning when the in-game mod and the app don't match.

## 2.6.0
- The app tells you when a newer version is out.
- Mod: the button matches the other top-left buttons and lights up for a moment after a successful export.

## 2.5.1
- Download links that always point to the newest release.

## 2.5.0
- Linux version (AppImage), and support for Flatpak and Snap Steam installs.

## 2.4.0
- First release: the in-game export button and the desktop app.
