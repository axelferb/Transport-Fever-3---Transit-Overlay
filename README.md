**Transit Overlay: a planning companion for Transport Fever 3**

Transit Overlay is a desktop app for planning your network outside the game. It reads your save's lines, stations, roads, buildings and industries, and draws them as a clean transit-style map you can plan on.

**Lines**
- Your in-game lines are drawn on the actual roads and tracks they use. Bus, tram, train, subway and ferry each have their own style.
- You can draw new lines on top: branches, loops and one-way stretches, snapped to roads if you like.

**Coverage (passengers)**
- See which homes and workplaces are inside a stop's reach and which are left out.
- Place planned stops and the buildings inside their circle turn green straight away. You can see what a new line would add before you build it.
- A heatmap shows where the people no stop reaches live, and the app suggests the five best spots for a new stop. One click adds a stop there.
- Coverage numbers per town.

**Cargo**
- Industries and businesses are colored by whether they're supplied, reached but missing inputs, or not reached by any cargo stop.
- Filter by goods, for example only what wants bricks, and see which industries make it.
- Toggle commercial buildings, town industrial buildings and industries separately.
- Town demand shows delivered against wanted for each good.
- Plan cargo stops and see what they would reach.

**Map**
- Terrain with water and hill shading.
- Focus on a single town, rotate the map to match your in-game view, and export a PNG.
- **Schematic map:** turn your network into a metro-style diagram (45° angles, interchanges, legend) and save it as PNG or SVG to share.
- You can also paste any screenshot and draw lines over it.

**Languages:** English and German (⚙ Settings → Map display → Language).

**How it works**
- Click the Transit Overlay button in the game (or run one export command in the game console). The app picks the data up automatically and updates whenever you export again.
- Nothing in your save is changed. The export only reads data.

## Install

### 1. The desktop app
Neither version needs installing. Older versions are on the [Releases](../../releases) page.

- **Windows:** download [TransitOverlay-portable.exe](https://github.com/axelferb/Transport-Fever-3---Transit-Overlay/releases/latest/download/TransitOverlay-portable.exe) and run it. Windows SmartScreen may warn because the file isn't signed: choose *More info → Run anyway*.
- **Linux:** download [TransitOverlay-linux-x86_64.AppImage](https://github.com/axelferb/Transport-Fever-3---Transit-Overlay/releases/latest/download/TransitOverlay-linux-x86_64.AppImage), run `chmod +x TransitOverlay-linux-x86_64.AppImage`, then start it. Some distributions need `libfuse2` for AppImages. The app looks for the game log in the usual Steam folders, including Flatpak and Snap Steam; if it doesn't find it, use ⚙ Settings → **Choose log file…**.

### 2. The in-game button (mod)
The mod adds a **Transit Overlay** button at the top left of the game screen, next to the Layers button.

- **From mod.io:** subscribe to [Transit Overlay](https://mod.io/g/transportfever3/m/transit-overlay) in the game's mod manager and enable it for your save.
- **By hand:** copy the folder `mod/transit_overlay` to `Steam\userdata\<your Steam id>\3493540\local\staging_area\`, then enable it in the game's mod list.

The mod only reads data and adds one button, so it can be added to and removed from a save at any time.

### Without the mod
In the app, open ⚙ Settings → Game connection → **Copy command**. In the game, open the console (key left of 1), paste and press Enter.

## Using it
1. Start the app, then the game.
2. Click **Transit Overlay** in the game. The app updates within a couple of seconds.
3. Pick a town under **Area**, then plan in the **Lines**, **Coverage** and **Cargo** tabs.

The app finds the game log (`Steam\userdata\<id>\3493540\local\crash_dump\stdout.txt`) by itself. If it doesn't, use ⚙ Settings → **Choose log file…**.

## Repository layout
```
mod/transit_overlay/        the TF3 mod (in-game button)
  mod.json, _content.json
  _metadata/                modinfo.json (mod.io text), 0.png (preview)
  content/transit_overlay/
    button.res.lua          plugin of ::MainModButtonAreaExtension
    button.script.lua       the button recipe
    export.lua              the exporter (read-only engine queries, prints TFO|... lines)
desktop/                    the Electron app
  main.js                   window, log discovery, live watcher
  logtools.js               finds the game log and the newest export in it
  preload.js                bridge for the page (window.desktop)
  app/index.html            the app itself
console/                    the same exporter as a console command
```

## Build the app
Requires Node.js 20+.
```
cd desktop
npm install
npm start                   # run from source
npm run dist                # Windows: dist/TransitOverlay-portable.exe
npm run dist:linux          # Linux:   dist/TransitOverlay-linux-x86_64.AppImage
```

## Making a release
In GitHub: Actions → **Release** → **Run workflow**. It builds the Windows exe and the Linux AppImage, zips the mod, and publishes all three as release `v<version>` (the version in `desktop/package.json`). Bump that version first for a new release.

## Publishing the mod
Copy `mod/transit_overlay` into the staging area (see above), then in the game: Main menu → Mods → Transit Overlay → Publish. After the first publish, copy `_metadata/mod.io_fileid.txt` from the staging folder back into `mod/transit_overlay/_metadata/` and commit it, so later publishes update the same mod.io entry.

## Export format
One line per record between `TFO|BEGIN` and `TFO|END`: lines (`L`), stop groups (`G`), passenger and cargo catchment (`C`, `K`), towns (`T`), buildings (`B`), business stock (`S`), industries (`I`), cargo names (`N`), town demand (`D`), vehicle routes (`R`), road and track edges (`E`), terrain grid (`W`, `H`) and errors (`ERR`).

## License
[MIT](LICENSE). Transport Fever 3 is a trademark of Urban Games; this project is not affiliated with Urban Games.
