"""Portrait-aware rigid placements, baked into the shared skinned bind space."""
from mathutils import Euler

def portrait_relocate(prefix,pivot,position,degrees,scale=1):
 rotation=Euler(tuple(math.radians(a) for a in degrees),'XYZ').to_matrix()
 for obj in pieces:
  if obj.name==prefix or obj.name.startswith((prefix+'_',prefix+'.')):
   for vertex in obj.data.vertices:vertex.co=Vector(position)+rotation@((vertex.co-Vector(pivot))*scale)
   obj.data.update()

portrait_relocate('Drif_Accessory_shield',(0,.43,1.28),(.57,.59,1.39),(0,-18,-22),1.10)
portrait_relocate('Drif_Hat_halo',(0,.02,3.14),(0,-.06,2.96),(15,-8,0))

# The summon pose reaches beyond the neutral hands. Move these satellites
# forward while compensating sideways to retain their portrait composition.
portrait_relocate('Drif_Extra_crystals',(0,0,0),(.2702,-.70,0),(0,0,0))
portrait_relocate('Drif_Extra_dragon',(0,0,0),(.2316,-.60,0),(0,0,0))

# Match the original head's broad silhouette and low jaw (z=1.445), rather
# than centering the replacements above the neck. Work in mesh bind space so
# every facial detail stays together and all existing Head animation survives.
# The TV needs the largest correction: its old flat base was at z=1.725.
HEAD_FITS={
 'void':(1.10,1.24,1.12,-.10),
 'vortex':(1.10,1.24,1.12,-.10),
 'gasmask':(1.14,1.28,1.14,-.11),
 'glitch':(1.10,1.24,1.12,-.10),
 'hockey':(1.14,1.28,1.18,-.11),
 'hayabusa':(1.10,1.24,1.12,-.11),
 'pumpkin':(1.12,1.28,1.12,-.10),
 'tv':(1.23,1.36,1.30,-.12),
 'crystal':(1.10,1.25,1.15,-.13),
}
for style,(sx,sy,sz,dz) in HEAD_FITS.items():
 prefix='Drif_Head_'+style
 for obj in pieces:
  if obj.name==prefix or obj.name.startswith((prefix+'_',prefix+'.')):
   for vertex in obj.data.vertices:
    x,y,z=vertex.co
    fitted_z=2.20+(z-2.20)*sz+dz
    # Keep the TV antennas inside the fixed portrait after enlarging the box.
    if style=='tv' and z>2.69:fitted_z=2.20+(2.69-2.20)*sz+dz+(z-2.69)*.80
    if style=='hayabusa' and fitted_z>2.80:fitted_z=2.80+(fitted_z-2.80)*.65
    vertex.co=(x*sx,y*sy,fitted_z)
   obj.data.update()
