import React from 'react'
import {createRoot} from 'react-dom/client'
import FabricDrapeBallPreview from '../src/components/FabricDrapeBallPreview.jsx'

const root=createRoot(document.getElementById('ball'))
window.renderEXOFabricBall=fabric=>{
 root.render(<FabricDrapeBallPreview fabric={fabric} compact height={460}/>)
}
document.documentElement.dataset.rendererReady='true'
