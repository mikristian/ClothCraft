# CLO 3D hardware and trim files — local inventory

**Audited:** October 17, 2026. **Core library:** 162 files, counted by actual file path.

## Source folders

- **Installed and available offline:** `/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims`
- **iCloud Documents mirror:** `/Users/mikylecouto/Documents/clo/Assets/Materials/Hardware_and_Trims`
- **Separate installed zipper presets:** `/Applications/CLO_Standalone_OnlineAuth.app/Contents/Resources/Preset/Zipper`

All 162 entries in the installed folder have matching relative names and listed sizes in Documents. The Documents mirror now has 0 files allocated locally and 162 dataless placeholders. 0 downloaded entries have identical SHA-256 hashes to installed CLO files. The installed CLO copy was used for the mesh conversion; macOS Optimize Storage could evict iCloud copies again later.

## Exact counts

| Category | Files | Files containing OBJ geometry |
|---|---:|---:|
| Buttons | 45 | 45 |
| Buttonholes | 10 | 0 |
| Graphics | 1 | 0 |
| Zipper pullers | 31 | 31 |
| Zipper sliders | 20 | 20 |
| Zipper stoppers | 7 | 7 |
| Zipper tape and teeth textures | 18 | 0 |
| OBJ ZIP archives | 30 | 30 |
| **Total** | **162** | **133** |

**YKK:** 10 pullers and 11 sliders, included in the categories above (21 total). The 30 `.zip` files are companion OBJ archives for the corresponding numbered puller and slider styles. They are separate file entries; the matching OBJ bytes can differ, so they are not assumed duplicate contents.

**File extensions:** `.bth` 10, `.btn` 45, `.grp` 1, `.png` 18, `.zip` 30, `.zpl` 31, `.zsd` 20, `.zsp` 7.

**Total recorded size:** 46,546,294 bytes (46.55 MB).

## What is actually 3D?

- Every `.btn` (45), `.zpl` (31), `.zsd` (20), `.zsp` (7) and companion `.zip` (30) contains one or more OBJ meshes. These files are ZIP-compatible containers, even when their filename extension is CLO-specific.
- The 10 `.bth` buttonholes contain `.bnd` definitions, preview PNG and JSON. They do not contain `.obj` meshes.
- The one `.grp` graphic includes Adobe Illustrator `.ai` data and its CLO graphic package, with no OBJ mesh.
- The 18 PNGs are zipper tape and tooth textures, including normal maps.
- Mesh presence confirms geometry availability, not collision physics, compatible sizing or redistribution rights.

## Complete file-by-file list

Files below are relative to the installed source or Documents mirror above. For searchable absolute paths, content checksum, sizes and embedded OBJ names use `inventory.csv`.

### Buttons (45)

**`Button & Buttonhole/Button/`** (45 files)

- `1_Sew-through_Button_01_Cross.btn`
- `1_Sew-through_Button_01_Parallel.btn`
- `1_Sew-through_Button_01_Square.btn`
- `1_Sew-through_Button_02_Cross.btn`
- `1_Sew-through_Button_02_Parallel.btn`
- `1_Sew-through_Button_02_Square.btn`
- `1_Sew-through_Button_03_Cross.btn`
- `1_Sew-through_Button_03_Parallel.btn`
- `1_Sew-through_Button_03_Square.btn`
- `1_Sew-through_Button_04_Cross.btn`
- `1_Sew-through_Button_04_Parallel.btn`
- `1_Sew-through_Button_04_Square.btn`
- `1_Sew-through_Button_05_Cross.btn`
- `1_Sew-through_Button_05_Parallel.btn`
- `1_Sew-through_Button_05_Square.btn`
- `1_Sew-through_Button_06_Cross.btn`
- `1_Sew-through_Button_06_Parallel.btn`
- `1_Sew-through_Button_06_Square.btn`
- `1_Sew-through_Button_07_Cross.btn`
- `1_Sew-through_Button_07_Parallel.btn`
- `1_Sew-through_Button_07_Square.btn`
- `1_Sew-through_Button_08.btn`
- `1_Sew-through_Button_09.btn`
- `1_Sew-through_Button_10.btn`
- `1_Sew-through_Button_11.btn`
- `2_Shank_Button_01.btn`
- `2_Shank_Button_02.btn`
- `2_Shank_Button_03.btn`
- `2_Shank_Button_04.btn`
- `2_Shank_Button_05.btn`
- `2_Shank_Button_06.btn`
- `3_Snap_Rivet_01.btn`
- `3_Snap_Rivet_02.btn`
- `3_Snap_Rivet_03.btn`
- `3_Snap_Rivet_04.btn`
- `3_Snap_Rivet_05.btn`
- `3_Snap_Rivet_06.btn`
- `3_Snap_Rivet_07.btn`
- `3_Snap_Rivet_08.btn`
- `3_Snap_Rivet_09.btn`
- `3_Snap_Rivet_10.btn`
- `4_Eyelet_01.btn`
- `4_Eyelet_02.btn`
- `4_Eyelet_03.btn`
- `4_Eyelet_04.btn`


### Buttonholes (10)

**`Button & Buttonhole/Buttonhole/`** (10 files)

- `Buttonhole_Bound.bth`
- `Buttonhole_Eyelet_A_Radial.bth`
- `Buttonhole_Eyelet_A_Square.bth`
- `Buttonhole_Eyelet_A_Taper_Bartacking_A.bth`
- `Buttonhole_Eyelet_B_Radial.bth`
- `Buttonhole_Eyelet_B_Taper_Bartacking_B.bth`
- `Buttonhole_Radial.bth`
- `Buttonhole_Radial_Square.bth`
- `Buttonhole_Square_A.bth`
- `Buttonhole_Square_B.bth`


### Graphics (1)

**`Graphic/`** (1 files)

- `BI_CLO_Blue.grp`


### Zipper pullers (31)

**`Zipper/Puller/`** (21 files)

- `Puller_01.zpl`
- `Puller_02.zpl`
- `Puller_03.zpl`
- `Puller_04.zpl`
- `Puller_05.zpl`
- `Puller_06.zpl`
- `Puller_07.zpl`
- `Puller_08.zpl`
- `Puller_09.zpl`
- `Puller_10.zpl`
- `Puller_11.zpl`
- `Puller_12.zpl`
- `Puller_13.zpl`
- `Puller_14.zpl`
- `Puller_15.zpl`
- `Puller_16.zpl`
- `Puller_17.zpl`
- `Puller_18.zpl`
- `Puller_19.zpl`
- `Puller_20.zpl`
- `Puller_21.zpl`

**`Zipper/YKK/Puller/`** (10 files)

- `YKK_Puller_3VSDFL.zpl`
- `YKK_Puller_COILDA.zpl`
- `YKK_Puller_DADR4.zpl`
- `YKK_Puller_DADR7.zpl`
- `YKK_Puller_DALH.zpl`
- `YKK_Puller_DFL.zpl`
- `YKK_Puller_DFW.zpl`
- `YKK_Puller_DSYG.zpl`
- `YKK_Puller_METALDA.zpl`
- `YKK_Puller_VISLONDA.zpl`


### Zipper sliders (20)

**`Zipper/Slider/`** (9 files)

- `Slider_01.zsd`
- `Slider_02.zsd`
- `Slider_03.zsd`
- `Slider_04.zsd`
- `Slider_05.zsd`
- `Slider_06.zsd`
- `Slider_07.zsd`
- `Slider_08.zsd`
- `Slider_09.zsd`

**`Zipper/YKK/Slider/`** (11 files)

- `YKK_Slider_03CDAREVERSE.zsd`
- `YKK_Slider_03CDASTANDARD.zsd`
- `YKK_Slider_03CDFREVERSE.zsd`
- `YKK_Slider_03CDFSTANDARD.zsd`
- `YKK_Slider_03MSTANDARD.zsd`
- `YKK_Slider_03VSSTANDARD.zsd`
- `YKK_Slider_05CNREVERSE.zsd`
- `YKK_Slider_05CNSEMILOCK.zsd`
- `YKK_Slider_05CNSTANDARD.zsd`
- `YKK_Slider_05MSTANDARD.zsd`
- `YKK_Slider_05VSSTANDARD.zsd`


### Zipper stoppers (7)

**`Zipper/Stopper/Bottom/Closed/`** (2 files)

- `Closed_Bottom_Stopper_01.zsp`
- `Closed_Bottom_Stopper_02.zsp`

**`Zipper/Stopper/Bottom/Open/`** (3 files)

- `Open_Bottom_Stopper_01.zsp`
- `Open_Bottom_Stopper_02.zsp`
- `Open_Bottom_Stopper_03.zsp`

**`Zipper/Stopper/Top/`** (2 files)

- `Top_Stopper_01.zsp`
- `Top_Stopper_02.zsp`


### Zipper tape and teeth textures (18)

**`Zipper/Tape/Conceal_01/`** (1 files)

- `Conceal_01.png`

**`Zipper/Tape/Conceal_02/`** (1 files)

- `Conceal_02.png`

**`Zipper/Tape/Metal/`** (4 files)

- `Metal_Tape.png`
- `Metal_Tape_NRM.png`
- `Metal_Teeth.png`
- `Metal_Teeth_NRM.png`

**`Zipper/Tape/Nylon/`** (4 files)

- `Nylon_Tape.png`
- `Nylon_Tape_NRM.png`
- `Nylon_Teeth.png`
- `Nylon_Teeth_NRM.png`

**`Zipper/Tape/Plastic_01/`** (4 files)

- `Plastic_01_Tape.png`
- `Plastic_01_Tape_NRM.png`
- `Plastic_01_Teeth.png`
- `Plastic_01_Teeth_NRM.png`

**`Zipper/Tape/Plastic_02/`** (4 files)

- `Plastic_02_Tape.png`
- `Plastic_02_Tape_NRM.png`
- `Plastic_02_Teeth.png`
- `Plastic_02_Teeth_NRM.png`


### OBJ ZIP archives (30)

**`Zipper/Puller/OBJ/`** (21 files)

- `Puller_01.zip`
- `Puller_02.zip`
- `Puller_03.zip`
- `Puller_04.zip`
- `Puller_05.zip`
- `Puller_06.zip`
- `Puller_07.zip`
- `Puller_08.zip`
- `Puller_09.zip`
- `Puller_10.zip`
- `Puller_11.zip`
- `Puller_12.zip`
- `Puller_13.zip`
- `Puller_14.zip`
- `Puller_15.zip`
- `Puller_16.zip`
- `Puller_17.zip`
- `Puller_18.zip`
- `Puller_19.zip`
- `Puller_20.zip`
- `Puller_21.zip`

**`Zipper/Slider/OBJ/`** (9 files)

- `Slider_01.zip`
- `Slider_02.zip`
- `Slider_03.zip`
- `Slider_04.zip`
- `Slider_05.zip`
- `Slider_06.zip`
- `Slider_07.zip`
- `Slider_08.zip`
- `Slider_09.zip`

## Additional CLO zipper presets

The installed Resources/Preset/Zipper folder has 10 support files. These are counted separately to avoid inflating the 162 core library files.

| Resource-relative file | Filename also in core | Identical bytes to a core file |
|---|---|---|
| `Object/Closed_Bottom_Stopper_01.zsp` | Yes | Yes |
| `Object/Open_Bottom_Stopper_01.zsp` | Yes | Yes |
| `Object/Puller_01.zpl` | Yes | Yes |
| `Object/Slider_01.zsd` | Yes | Yes |
| `Object/Top_Stopper_01.zsp` | Yes | Yes |
| `Tape/Plastic_01_Tape.png` | Yes | Yes |
| `Tape/Plastic_01_Tape_NRM.png` | Yes | Yes |
| `Tape/Plastic_01_Teeth.png` | Yes | Yes |
| `Tape/Plastic_01_Teeth_NRM.png` | Yes | Yes |
| `Tape/Transparent.png` | No | No |

## Working with the assets

- Both installed CLO.app resources and the hydrated Documents copy can be inspected offline. The original source files remain unchanged.
- The iCloud copies were downloaded separately by the authorized hydration helper; see `icloud-hydration-report.md`. This inventory only reads metadata, hashes and ZIP member names.
- Before distributing or incorporating vendor YKK/CLO assets in EXO, check the applicable supplier and CLO license permissions.
