# Saved open-source 2D pattern CAD and grading repository library

Saved October 18, 2026, for EXO ClothCraft / EXO Sample 3D engineering. **All six repositories were cloned successfully** into `research/oss/pattern-cad/` on the shared Mac. Clones use Git's `--depth 1 --filter=blob:none --sparse` to preserve disk space. This is a **reference source library**, not a set of installed applications or a completed integration with EXO.

## Repositories and exact pinned commits

| Repository | Main project link | GitHub source / mirror | Saved local folder | Saved commit | License | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| **Seamly2D** | [GitHub / Seamly2D](https://github.com/FashionFreedom/Seamly2D) | [FashionFreedom/Seamly2D](https://github.com/FashionFreedom/Seamly2D) | `research/oss/pattern-cad/Seamly2D/` | `44037bd1866904b3f8e1145f37b0f080ce4146b2` | GPLv3+ | P0 |
| **Valentina** | [Main GitLab](https://gitlab.com/smart-pattern/valentina) | [dismine/valentina](https://github.com/dismine/valentina) (read-only mirror) | `research/oss/pattern-cad/Valentina/` | `6f4358d93c6da11051b093eff42e05cd6d056c2e` | GPLv3+ | P0 |
| **FreeSewing** | [Main Codeberg](https://codeberg.org/freesewing/freesewing) | [freesewing/freesewing](https://github.com/freesewing/freesewing) (legacy mirror) | `research/oss/pattern-cad/FreeSewing/` | `8a8de5a271d9823bb393735a41dd3993cf5bcf4b` | MIT | P0 |
| **GarmentCode / PyGarment** | [GitHub / GarmentCode](https://github.com/maria-korosteleva/GarmentCode) | [maria-korosteleva/GarmentCode](https://github.com/maria-korosteleva/GarmentCode) | `research/oss/pattern-cad/GarmentCode/` | `d449629979028123a5c4dc9e732a2ec19b7fce31` | MIT | P0 |
| **OpenPattern** | [GitHub / OpenPattern](https://github.com/fmetivier/OpenPattern) | [fmetivier/OpenPattern](https://github.com/fmetivier/OpenPattern) | `research/oss/pattern-cad/OpenPattern/` | `c8138ca68f8a59a040a456887686082b802c129f` | GPLv3 | P1 |
| **Clipper2** | [GitHub / Clipper2](https://github.com/AngusJohnson/Clipper2) | [AngusJohnson/Clipper2](https://github.com/AngusJohnson/Clipper2) | `research/oss/pattern-cad/Clipper2/` | `a6e7294703ae329576462f9471b356971f53010d` | BSL-1.0 | P0 |

## Why these are saved

- **Seamly2D:** precise parametric garment construction tools, curve geometry, constraints, formulas, measurement-driven patternmaking.
- **Valentina:** pattern drafting, curve/shape algorithms, notches, DXF and plotter interoperability. GitHub is the read-only mirror; follow the main GitLab for active development.
- **FreeSewing:** JavaScript-based parametric patterns and garment templates; useful for EXO's frontend drafting and measurement-driven regeneration. Follow Codeberg for active development.
- **GarmentCode/PyGarment:** programmatically linked panel boundaries, sewing pairs and source representations that bridge 2D patterns to 3D cloth meshes.
- **OpenPattern:** independent full-scale pattern drafting and printing references.
- **Clipper2:** robust polygon clipping, boolean and offset/derived-cutline algorithms; preserve analytic authored curves and references above this polygon backend.

## Locally downloaded source modules

To avoid another large checkout while free space was around 4 GiB, these paths were explicitly checked out. The Git metadata allows additional parts of the same shallow commit to be downloaded later if needed.

| Folder | Actual sparse source paths downloaded |
| --- | --- |
| Seamly2D | `src/libs/vgeometry`, `src/libs/vdxf`, `src/libs/vtools`, `src/app` |
| Valentina | `src/libs/vgeometry`, `src/libs/vdxf`, `src/libs/vhpgl`, `src/libs/vnesting`, `src/libs/vpatterndb` |
| FreeSewing | `packages/core`, `packages/utils`, `designs/brian` |
| GarmentCode | `pygarment` |
| OpenPattern | `OpenPattern` |
| Clipper2 | `CPP/Clipper2Lib` |

To retrieve more source from a saved clone without recloning, use `git -C research/oss/pattern-cad/<RepoName> sparse-checkout add <directory>`. Check free space first and do not download optional media, dataset archives, installer bundles or build outputs by default.

These local source clones are under the project's ignored `research/oss/` directory, so they **will not be pushed by an ordinary EXO Git commit**. This Markdown index is outside that ignored folder and preserves the repository URLs and immutable commits for future agents and recovery. No source code was merged into EXO and no external repositories were starred, forked, pushed to or modified.

## Validation of save

Each of the six local Git clones responded to `git rev-parse HEAD` with the recorded commit and to `git remote get-url origin` with the expected GitHub source URL. Source trees were fetched as sparse checkouts (not empty bookmarks). The disk had approximately **3.8 GiB free** after these downloads. The repositories were not built, installed or given manufacturing certification.

Related detailed engineering decision: [Open-source 2D pattern and grading analysis](OPEN_SOURCE_2D_PATTERN_AND_GRADING_DECISION_20261018.md).
