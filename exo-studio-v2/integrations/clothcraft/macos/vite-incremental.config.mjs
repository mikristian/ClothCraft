// Compile updated source JS/CSS without duplicating the 300 MB installed
// public 3D asset catalog. For installs only when public assets are unchanged.
import base from '../../../vite.config.mjs'

export default {
  ...base,
  publicDir:false,
  build:{...base.build,copyPublicDir:false},
}
