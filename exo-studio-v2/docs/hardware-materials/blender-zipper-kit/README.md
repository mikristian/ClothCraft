# EXO custom zipper: installed CLO reference audit and Blender prototype

Verified on the user's Mac on 17 October 2026 with **Blender 5.1.2**.

## Installed sources

The existing CLO installation contains this folder:

`/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims/Zipper/`

| Source file type | Count | What it represents | Blender access verified |
|---|---:|---|---|
| `.zpl` | 31 | CLO puller assets, including 10 named YKK pullers | CLO-specific v7 binary; no direct Blender importer verified |
| `.zsd` | 20 | CLO slider assets, including 11 named YKK sliders | CLO-specific v7 binary; no direct Blender importer verified |
| `.zsp` | 7 | CLO top/bottom stopper assets | CLO-specific file; no direct Blender importer verified |
| `.zip` | 30 | Generic puller/slider source archives containing OBJ, MTL and images | **Yes**, 21 puller and 9 slider archives |
| `.png` | 18 | Reference/texture images | Yes |

Every one of the 30 source ZIP archives passed a ZIP integrity check and contains at least one OBJ mesh. Blender's OBJ importer successfully loaded `Puller_11.obj` (1,370 vertices) and `Slider_08.OBJ` (1,347 vertices). The YKK proprietary ZPL/ZSD files are **not** these archives. In particular, their ` ZPL        CLO ` / ` ZSD        CLO ` v7 headers do not make them regular OBJ or FBX files.

## Blender files created

### Original EXO zipper (no copied CLO geometry)

Open `output/EXO_Custom_Zipper.blend` in Blender. It contains editable objects in five named collections: two woven tapes, separate chain teeth, the custom slider body, a custom metallic puller, and top/bottom stops. Dimensions are authored in millimetres (converted into Blender metres); object names and materials are editable. The initial model has a 160 mm length and a 5 mm chain with 94 visible teeth.

`output/EXO_Custom_Zipper.glb` contains only the EXO-created model geometry and materials, with no studio lights, background, third-party meshes or YKK markings. `output/EXO_Custom_Zipper_Studio.png` is the product preview.

To regenerate a different design, edit the `CONFIG` dictionary near the top of `build_custom_zipper.py` and run:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python docs/hardware-materials/blender-zipper-kit/build_custom_zipper.py
```

You can edit the materials directly inside the Blender project after generation. The generator values control the next regeneration; changing the custom properties on the scene's EXO master object alone does not regenerate geometry.

### Private local CLO generic reference gallery

The following local-only files are in the user's Documents folder:

`~/Documents/EXO Asset Research/CLO Zipper Reference Gallery/CLO_Generic_Pullers_Sliders_Reference_LOCAL_ONLY.blend`

`~/Documents/EXO Asset Research/CLO Zipper Reference Gallery/CLO_Generic_Pullers_Sliders_Reference.png`

The gallery imports all **30 generic OBJ meshes** from the user's existing CLO installation and arranges them in a labeled Blender comparison grid. Its `import-manifest.json` records original ZIP paths, mesh counts, vertex counts and layout scaling. Rebuild it, while CLO remains installed, with:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python docs/hardware-materials/blender-zipper-kit/build_local_clo_reference_gallery.py
```

The gallery includes source mesh geometry and is for private local reference. Its content is **not** exported into the independent EXO GLB or into EXO ClothCraft Studio V2, and must not be redistributed without source asset permissions. The original installed CLO files remain untouched.

## Next implementation path

For a CLO-compatible custom puller/slider, model the desired design in Blender, maintain metric dimensions and separate submeshes, and check the installed CLO application's available hardware import/export interface. Exporting a generic mesh as OBJ/GLB is supported in Blender; import back into proprietary CLO asset formats has not yet been confirmed. The output GLB is ready to be evaluated for EXO ClothCraft's own hardware renderer, pending app integration.
