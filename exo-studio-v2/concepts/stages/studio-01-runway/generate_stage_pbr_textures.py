"""Procedural tileable physically-plausible material maps for original EXO set.
Uses the user's local Python Pillow/numpy and stores no external assets.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
ROOT=Path(__file__).resolve().parent
DST=ROOT/'textures';DST.mkdir(exist_ok=True)
rng=np.random.default_rng(20261017)
n=512

def octave(scale,blur):
    small=rng.random((scale,scale),dtype=np.float32)
    raw=np.asarray(Image.fromarray(np.uint8(small*255)).resize((n,n),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(blur)),dtype=np.float32)/255
    return raw-.5

# Mean-centered octave fields with fine grain for the light grazing the slab.
medium=octave(35,1.2);coarse=octave(8,5);fine=octave(125,.2)
Y,X=np.mgrid[:n,:n];X=X/n;Y=Y/n
materials={
 'limestone':((.35,.335,.31),.9,.04,.07),
 'basalt':((.065,.073,.083),.75,.045,.038),
 'charcoal_concrete':((.10,.107,.115),.58,.09,.085),
 'architectural_plaster':((.090,.093,.095),.67,.035,.05),
 'midnight_seat_fabric':((.12,.128,.141),.65,.08,.06),
 'black_seat_shell':((.042,.043,.05),.43,.036,.034),
 'ivory_heavy_cotton':((.69,.656,.601),.73,.065,.05),
 'rinsed_denim':((.09,.097,.11),.60,.09,.055),
 'satin_steel':((.18,.175,.16),.48,.025,.045),
}
for key,(base,coarseW,medW,grainW) in materials.items():
    c=np.array(base)[None,None,:]
    value=coarseW*coarse+medW*medium+grainW*fine
    if key=='limestone':
        veins=np.sin((X*8.6+Y*2.5+.8*coarse)*np.pi*2)*.018
        value=value+veins
    if key=='rinsed_denim':
        value=value+np.sin((X+Y)*n*.37)*.006
    if key=='satin_steel':
        value=value+np.sin(Y*n*1.9)*.003
    # Color values encoded as sRGB image, maps survive Blender -> GLB.
    out=np.clip(c*(1+value[:,:,None]*.30),.002,1.)
    Image.fromarray(np.uint8(out*255),'RGB').save(DST/(key+'.png'),optimize=True)
print('WROTE PBR MAPS',len(materials),'TO',DST)
