"""Forty additional, sculpted mix-and-match Drifella wardrobe options.

Execute with build_drifmaker.py's globals immediately before its grouping pass.
The parent builder owns Blender, the rig, export, and final visibility. This file
only adds meshes through its existing skinning helpers. No external resources
or textures are required. Collection reference: tensor.trade/trade/drifella_2.
These are original adaptations of its plush, streetwear and playful trait cues.
"""

EXTENDED_VARIANTS = {
    'Eyes': ['hearts', 'buttons', 'wink', 'angry', 'bored', 'tears', 'dead', 'cyclops', 'pixel', 'lashes'],
    'Shirt': ['jersey', 'tiedye', 'skeleton', 'cloud', 'cloak', 'suit', 'raincoat', 'puffer', 'rugby', 'armor'],
    'Hat': ['tophat', 'wizard', 'crown', 'antlers', 'bunny', 'spinner', 'officer', 'bucket', 'horns', 'halo'],
    'Accessory': ['scarf', 'medallion', 'wings', 'bowtie', 'satchel', 'camera', 'skateboard', 'flower', 'cassette', 'keychain'],
}

# Shared colors consolidate into a small set of material slots when the parent
# joins each option. Curved details use 6-12 sides, with no subdivision modifier.
dm_cream = material('Drif_Ext_Cream', (.95, .86, .66), .76)
dm_mint = material('Drif_Ext_Mint', (.34, .75, .58), .75)
dm_sky = material('Drif_Ext_Sky', (.23, .58, .86), .69)
dm_lilac = material('Drif_Ext_Lilac', (.56, .36, .79), .73)
dm_yellow = material('Drif_Ext_Yellow', (.96, .66, .06), .60)
dm_leather = material('Drif_Ext_Leather', (.20, .075, .03), .86)
dm_silver = material('Drif_Ext_Silver', (.48, .57, .63), .30, .65)
dm_steel = material('Drif_Ext_Steel', (.11, .18, .24), .38, .55)
dm_rose = material('Drif_Ext_Rose', (.84, .12, .29), .53)
dm_burgundy = material('Drif_Ext_Burgundy', (.24, .018, .055), .78)
dm_tan = material('Drif_Ext_Tan', (.59, .40, .20), .86)


def dm_ell(name, center, scale, mat, weights='Head', n=12, m=8):
    return ell(name, center, scale, mat, weights, n=n, m=m)


def dm_box(name, center, size, mat, weights='Chest'):
    x, y, z = center
    a, b, c = (s / 2 for s in size)
    verts = [(x-a, y-b, z-c), (x+a, y-b, z-c), (x+a, y+b, z-c), (x-a, y+b, z-c),
             (x-a, y-b, z+c), (x+a, y-b, z+c), (x+a, y+b, z+c), (x-a, y+b, z+c)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh(name, verts, faces, mat, weights, False)


def dm_loop(name, center, radii, radius, mat, weights='Head', plane='xz', steps=20):
    x, y, z = center
    if plane == 'xy':
        pts = [(x+radii[0]*math.cos(i*math.tau/steps), y+radii[1]*math.sin(i*math.tau/steps), z) for i in range(steps+1)]
    elif plane == 'yz':
        pts = [(x, y+radii[0]*math.cos(i*math.tau/steps), z+radii[1]*math.sin(i*math.tau/steps)) for i in range(steps+1)]
    else:
        pts = [(x+radii[0]*math.cos(i*math.tau/steps), y, z+radii[1]*math.sin(i*math.tau/steps)) for i in range(steps+1)]
    return line(name, pts, radius, mat, weights, 6)


def dm_disc(name, center, radius, mat, weights='Head', sides=16, depth=.015):
    x, y, z = center
    return plaque(name, [(x+radius*math.cos(i*math.tau/sides), z+radius*math.sin(i*math.tau/sides)) for i in range(sides)], y, depth, mat, weights)


def dm_heart(name, center, scale, mat, weights='Head'):
    x, y, z = center
    outline = [(0, -.90), (-.85, -.08), (-1, .37), (-.77, .78), (-.36, .86),
               (0, .48), (.36, .86), (.77, .78), (1, .37), (.85, -.08)]
    return plaque(name, [(x+a*scale, z+b*scale) for a, b in outline], y, .018, mat, weights)


def dm_eye_socket(prefix, x, mat=ink, height=.235):
    return dm_ell(prefix+'_socket', (x, -.425, 2.17), (.177, .10, height), mat, n=16, m=10)


# EYES -----------------------------------------------------------------------
for dm_side in [-1, 1]:
    dm_x = dm_side * .302
    dm_prefix = 'Drif_Eyes_hearts'
    dm_eye_socket(dm_prefix, dm_x)
    dm_heart(dm_prefix+'_heart', (dm_x, -.541, 2.18), .136, dm_rose)
    dm_ell(dm_prefix+'_shine', (dm_x-.055, -.553, 2.25), (.021, .007, .031), glint, n=8, m=6)

    dm_prefix = 'Drif_Eyes_buttons'
    dm_eye_socket(dm_prefix, dm_x, navy, .205)
    dm_disc(dm_prefix+'_button', (dm_x, -.531, 2.17), .15, dm_cream, sides=16, depth=.022)
    dm_loop(dm_prefix+'_rim', (dm_x, -.544, 2.17), (.132, .132), .009, dm_tan)
    for dm_dx in [-.042, .042]:
        for dm_dz in [-.042, .042]:
            dm_disc(dm_prefix+'_hole', (dm_x+dm_dx, -.548, 2.17+dm_dz), .019, ink, sides=8, depth=.004)
    for dm_sign in [-1, 1]:
        line(dm_prefix+'_stitch', [(dm_x-.042, -.558, 2.17+dm_sign*.042), (dm_x+.042, -.558, 2.17-dm_sign*.042)], .008, dm_rose, 'Head', 6)

    dm_prefix = 'Drif_Eyes_wink'
    if dm_side == -1:
        dm_eye_socket(dm_prefix, dm_x)
        dm_ell(dm_prefix+'_glint', (dm_x-.035, -.532, 2.24), (.039, .014, .065), glint)
        dm_ell(dm_prefix+'_small_glint', (dm_x+.045, -.533, 2.12), (.018, .01, .023), glint, n=8, m=6)
    else:
        line(dm_prefix+'_closed', [(dm_x-.14, -.508, 2.13), (dm_x-.07, -.537, 2.19), (dm_x, -.546, 2.21), (dm_x+.08, -.534, 2.18), (dm_x+.14, -.51, 2.13)], .022, ink, 'Head', 8)
        for dm_dx in [.075, .13]:
            line(dm_prefix+'_lash', [(dm_x+dm_dx, -.53, 2.16), (dm_x+dm_dx+.035, -.535, 2.22)], .012, ink, 'Head', 6)

    dm_prefix = 'Drif_Eyes_angry'
    dm_eye_socket(dm_prefix, dm_x, dm_cream, .185)
    dm_ell(dm_prefix+'_pupil', (dm_x-dm_side*.035, -.533, 2.135), (.063, .018, .095), ink)
    plaque(dm_prefix+'_lid', [(dm_x-.17, 2.34), (dm_x+.17, 2.34), (dm_x+.17, 2.22+dm_side*.055), (dm_x-.17, 2.22-dm_side*.055)], -.525, .025, blue)
    line(dm_prefix+'_brow', [(dm_x-.15, -.55, 2.22-dm_side*.05), (dm_x+.15, -.55, 2.22+dm_side*.05)], .022, navy, 'Head', 6)
    dm_ell(dm_prefix+'_glint', (dm_x-dm_side*.045, -.554, 2.17), (.016, .008, .023), glint, n=8, m=6)

    dm_prefix = 'Drif_Eyes_bored'
    dm_eye_socket(dm_prefix, dm_x, dm_cream)
    dm_ell(dm_prefix+'_pupil', (dm_x+dm_side*.025, -.534, 2.12), (.056, .02, .075), ink)
    dm_ell(dm_prefix+'_lid', (dm_x, -.47, 2.30), (.184, .09, .145), blue, n=16, m=8)
    line(dm_prefix+'_lid_edge', [(dm_x-.145, -.526, 2.205), (dm_x, -.552, 2.205), (dm_x+.145, -.526, 2.205)], .014, navy, 'Head', 6)

    dm_prefix = 'Drif_Eyes_tears'
    dm_eye_socket(dm_prefix, dm_x)
    dm_ell(dm_prefix+'_glint', (dm_x-.035, -.534, 2.24), (.036, .015, .062), glint)
    dm_ell(dm_prefix+'_waterline', (dm_x, -.529, 2.045), (.129, .026, .035), dm_sky)
    # Keep falling drops on the outer cheeks, clear of the protruding muzzle
    # and all interchangeable mouths in the central lower-face volume.
    for dm_dx, dm_drop in [(dm_side*.085, .10), (dm_side*.135, .065)]:
        dm_ell(dm_prefix+'_tear', (dm_x+dm_dx, -.532, 2.015-dm_drop*.25), (.023, .018, dm_drop*.55), dm_sky, n=10, m=8)
        dm_ell(dm_prefix+'_tear_shine', (dm_x+dm_dx-.006, -.551, 2.025-dm_drop*.25), (.006, .004, .026), glint, n=8, m=6)

    dm_prefix = 'Drif_Eyes_dead'
    dm_eye_socket(dm_prefix, dm_x, charcoal, .205)
    for dm_sign in [-1, 1]:
        line(dm_prefix+'_cross', [(dm_x-.105, -.539, 2.17-dm_sign*.105), (dm_x+.105, -.539, 2.17+dm_sign*.105)], .026, dm_cream, 'Head', 6)

    dm_prefix = 'Drif_Eyes_pixel'
    dm_grid = [(-3, -3), (2, -3), (2, -2), (3, -2), (3, 2), (2, 2), (2, 3), (-3, 3), (-3, 2), (-4, 2), (-4, -2), (-3, -2)]
    plaque(dm_prefix+'_pixel_socket', [(dm_x+a*.041, 2.17+b*.058) for a, b in dm_grid], -.511, .035, navy)
    dm_box(dm_prefix+'_pupil', (dm_x-.025, -.548, 2.19), (.082, .02, .116), cyan, 'Head')
    dm_box(dm_prefix+'_glint', (dm_x-.045, -.562, 2.23), (.028, .01, .033), glint, 'Head')
    dm_box(dm_prefix+'_small_pixel', (dm_x+.065, -.551, 2.08), (.035, .016, .037), cyan, 'Head')

    dm_prefix = 'Drif_Eyes_lashes'
    dm_eye_socket(dm_prefix, dm_x, dm_cream)
    dm_ell(dm_prefix+'_iris', (dm_x, -.533, 2.17), (.091, .023, .133), dm_lilac)
    dm_ell(dm_prefix+'_pupil', (dm_x, -.555, 2.17), (.045, .013, .09), ink)
    dm_ell(dm_prefix+'_glint', (dm_x-.025, -.569, 2.22), (.024, .006, .036), glint)
    for dm_i in range(3):
        dm_dx = dm_side*(.07+.035*dm_i)
        line(dm_prefix+'_lash', [(dm_x+dm_dx, -.508, 2.34-.015*dm_i), (dm_x+dm_dx+dm_side*.045, -.524, 2.41-.008*dm_i)], .012, ink, 'Head', 6)

dm_prefix = 'Drif_Eyes_cyclops'
dm_ell(dm_prefix+'_socket', (0, -.467, 2.20), (.392, .116, .225), dm_cream, n=24, m=12)
dm_ell(dm_prefix+'_iris', (0, -.577, 2.20), (.134, .025, .166), dm_mint, n=16, m=10)
dm_ell(dm_prefix+'_pupil', (0, -.601, 2.20), (.064, .017, .113), ink)
dm_ell(dm_prefix+'_glint', (-.035, -.618, 2.265), (.027, .007, .04), glint)


# SHIRTS ---------------------------------------------------------------------
def dm_arm_weights(co, label):
    t = max(0, min(1, (abs(co.x)-.73)/.20))
    return {'UpperArm.'+label: 1-t, 'Forearm.'+label: t}


def dm_sleeve(prefix, side, label, cloth, trim, puff=False):
    sections = [(.33, .15), (.44, .195), (.61, .191), (.75, .175), (.87, .167), (1.04, .162), (1.12, .149)]
    if puff:
        sections = [(.33, .15), (.43, .206), (.52, .215), (.60, .197), (.69, .210), (.77, .185), (.87, .195), (.96, .176), (1.07, .18), (1.12, .15)]
    def weights(co):
        return dm_arm_weights(co, label)
    verts = [(side*x, math.cos(j*math.tau/12)*r, 1.465+math.sin(j*math.tau/12)*r) for x, r in sections for j in range(12)]
    faces = [(i*12+j, i*12+(j+1)%12, (i+1)*12+(j+1)%12, (i+1)*12+j) for i in range(len(sections)-1) for j in range(12)]
    faces += [tuple(reversed(range(12))), tuple((len(sections)-1)*12+j for j in range(12))]
    obj = mesh(prefix+'_sleeve', verts, faces, cloth, weights)
    dm_loop(prefix+'_cuff', (side*1.095, 0, 1.465), (.164, .164), .021, trim, 'Forearm.'+label, 'yz', 16)
    return obj


def dm_shirt_base(style, cloth, trim=navy, puff=False, lower=.75):
    prefix = 'Drif_Shirt_'+style
    sections = [(lower, .37, .235, 0, 0), (.82, .409, .255, 0, 0), (1.04, .410, .267, 0, 0), (1.29, .407, .245, 0, 0), (1.48, .36, .21, 0, 0), (1.56, .237, .165, 0, 0)]
    if puff:
        sections = [(.75, .372, .237, 0, 0), (.82, .422, .271, 0, 0), (.93, .425, .28, 0, 0), (.98, .408, .257, 0, 0), (1.08, .425, .282, 0, 0), (1.16, .409, .255, 0, 0), (1.27, .42, .27, 0, 0), (1.34, .40, .238, 0, 0), (1.47, .365, .215, 0, 0), (1.56, .24, .17, 0, 0)]
    body = rings(prefix+'_body', sections, cloth, torso_weights, sides=20)
    dm_loop(prefix+'_neck', (0, 0, 1.548), (.234, .166), .023, trim, 'Chest', 'xy', 20)
    rings(prefix+'_hem', [(lower, .375, .241, 0, 0), (lower+.045, .402, .252, 0, 0)], trim, 'Pelvis', sides=20)
    sleeves = [dm_sleeve(prefix, side, label, cloth, trim, puff) for side, label in [(-1, 'R'), (1, 'L')]]
    return prefix, body, sleeves


dm_prefix, dm_body, dm_sleeves = dm_shirt_base('jersey', dm_burgundy, dm_cream)
for dm_side in [-1, 1]:
    line(dm_prefix+'_side_stripe', [(dm_side*.32, -.16, .82), (dm_side*.35, -.18, 1.04), (dm_side*.34, -.18, 1.31), (dm_side*.28, -.16, 1.48)], .026, dm_cream, torso_weights, 6)
    for dm_x in [.58, .65]:
        dm_loop(dm_prefix+'_sleeve_stripe', (dm_side*dm_x, 0, 1.465), (.195, .195), .012, dm_cream, 'UpperArm.'+('R' if dm_side<0 else 'L'), 'yz', 16)
plaque(dm_prefix+'_number_one', [(-.13, 1.32), (-.04, 1.38), (-.04, 1.02), (-.11, 1.02), (-.11, 1.27), (-.13, 1.25)], -.291, .009, dm_cream, torso_weights)
plaque(dm_prefix+'_number_seven', [(.035, 1.37), (.19, 1.37), (.19, 1.31), (.10, 1.02), (.025, 1.02), (.12, 1.30), (.035, 1.30)], -.291, .009, dm_cream, torso_weights)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('tiedye', dm_lilac, dm_cream)
dm_colors = [dm_rose, dm_yellow, dm_mint, dm_sky]
for dm_i, dm_color in enumerate(dm_colors):
    dm_pts=[]
    for dm_j in range(17):
        dm_angle=(dm_i*.5+dm_j/16*.56)*math.pi
        dm_radius=.035+.17*(dm_i*16+dm_j)/64
        dm_pts.append((math.cos(dm_angle*2.0)*dm_radius, -.293, 1.19+math.sin(dm_angle*2.0)*dm_radius))
    line(dm_prefix+'_dye_spiral', dm_pts, .023, dm_color, torso_weights, 6)
for dm_side, dm_label in [(-1, 'R'), (1, 'L')]:
    for dm_x, dm_color in [(.50, dm_mint), (.74, dm_yellow), (.96, dm_rose)]:
        dm_loop(dm_prefix+'_dye_sleeve', (dm_side*dm_x, 0, 1.465), (.193 if dm_x<.7 else .177, .193 if dm_x<.7 else .177), .026, dm_color, lambda co, label=dm_label: dm_arm_weights(co, label), 'yz', 16)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('skeleton', charcoal, charcoal)
line(dm_prefix+'_sternum', [(0, -.282, 1.40), (0, -.296, 1.23), (0, -.297, 1.05)], .023, dm_cream, torso_weights, 6)
for dm_i in range(4):
    dm_z=1.36-dm_i*.09
    for dm_side in [-1, 1]:
        line(dm_prefix+'_rib', [(dm_side*.025, -.298, dm_z), (dm_side*.11, -.292, dm_z+.025), (dm_side*.24, -.249, dm_z-.005), (dm_side*.26, -.24, dm_z-.047)], .016, dm_cream, torso_weights, 6)
for dm_side, dm_label in [(-1, 'R'), (1, 'L')]:
    line(dm_prefix+'_arm_bone', [(dm_side*.47, -.207, 1.465), (dm_side*.70, -.20, 1.465)], .026, dm_cream, 'UpperArm.'+dm_label, 6)
    for dm_z in [1.43, 1.50]:
        line(dm_prefix+'_forearm_bone', [(dm_side*.87, -.179, dm_z), (dm_side*1.055, -.176, dm_z)], .014, dm_cream, lambda co, label=dm_label: dm_arm_weights(co, label), 6)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('cloud', dm_sky, dm_cream)
for dm_x, dm_z, dm_scale in [(-.17, 1.31, 1), (.16, 1.04, .9), (.13, 1.42, .65)]:
    for dm_dx, dm_dz, dm_r in [(-.07, 0, .06), (0, .027, .082), (.075, 0, .056)]:
        dm_ell(dm_prefix+'_cloud_puff', (dm_x+dm_dx*dm_scale, -.278, dm_z+dm_dz*dm_scale), (dm_r*dm_scale, .026, dm_r*.63*dm_scale), glint, torso_weights, n=10, m=6)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('cloak', navy, dm_lilac, lower=.70)
dm_cape_verts=[(-.27, .15, 1.53), (.27, .15, 1.53), (-.40, .29, 1.20), (.40, .29, 1.20), (-.46, .34, .73), (-.23, .36, .68), (0, .37, .76), (.23, .36, .68), (.46, .34, .73)]
mesh(dm_prefix+'_cape', dm_cape_verts, [(0, 1, 3, 2), (2, 3, 8, 7, 6, 5, 4)], dm_lilac, torso_weights, False)
line(dm_prefix+'_cape_trim', [dm_cape_verts[i] for i in [0, 2, 4, 5, 6, 7, 8, 3, 1]], .018, gold, torso_weights, 6)
for dm_side in [-1, 1]:
    plaque(dm_prefix+'_collar', [(dm_side*.04, 1.46), (dm_side*.25, 1.56), (dm_side*.29, 1.42), (dm_side*.12, 1.31)], -.239, .035, dm_lilac, 'Chest')
dm_disc(dm_prefix+'_clasp', (0, -.264, 1.44), .035, gold, 'Chest', sides=12)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('suit', charcoal, charcoal)
plaque(dm_prefix+'_shirt_front', [(-.13, 1.51), (.13, 1.51), (.11, 1.12), (-.11, 1.12)], -.278, .014, dm_cream, torso_weights)
for dm_side in [-1, 1]:
    plaque(dm_prefix+'_lapel', [(dm_side*.12, 1.53), (dm_side*.29, 1.47), (dm_side*.22, 1.31), (dm_side*.07, 1.12)], -.295, .018, dm_steel, torso_weights)
    line(dm_prefix+'_pocket', [(dm_side*.16, -.277, .97), (dm_side*.29, -.248, 1.0)], .012, dm_steel, torso_weights, 6)
plaque(dm_prefix+'_tie', [(0, 1.43), (.047, 1.39), (.033, 1.11), (0, 1.07), (-.033, 1.11), (-.047, 1.39)], -.315, .018, dm_burgundy, torso_weights)
for dm_z in [.99, .88]:
    dm_disc(dm_prefix+'_button', (0, -.282, dm_z), .015, dm_silver, torso_weights, sides=10)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('raincoat', dm_yellow, dm_yellow, lower=.70)
line(dm_prefix+'_zip', [(0, -.268, .77), (0, -.293, 1.03), (0, -.275, 1.31), (0, -.209, 1.54)], .014, dm_cream, torso_weights, 6)
dm_loop(dm_prefix+'_hood_fold', (0, .025, 1.53), (.266, .195), .055, dm_yellow, 'Chest', 'xy', 20)
for dm_side in [-1, 1]:
    dm_x=dm_side*.22
    plaque(dm_prefix+'_pocket', [(dm_x-.075, 1.10), (dm_x+.075, 1.10), (dm_x+.07, .93), (dm_x-.07, .93)], -.28, .025, dm_yellow, torso_weights)
    line(dm_prefix+'_pocket_flap', [(dm_x-.08, -.31, 1.09), (dm_x, -.317, 1.055), (dm_x+.08, -.31, 1.09)], .014, dm_cream, torso_weights, 6)
    line(dm_prefix+'_drawstring', [(dm_side*.13, -.25, 1.49), (dm_side*.14, -.295, 1.27)], .008, charcoal, 'Chest', 6)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('puffer', dm_mint, charcoal, puff=True)
line(dm_prefix+'_zip', [(0, -.283, .80), (0, -.306, 1.03), (0, -.299, 1.25), (0, -.217, 1.54)], .014, charcoal, torso_weights, 6)
for dm_z, dm_rx, dm_ry in [(.98, .411, .259), (1.16, .411, .257), (1.34, .402, .240)]:
    dm_loop(dm_prefix+'_quilt', (0, 0, dm_z), (dm_rx, dm_ry), .006, teal, torso_weights, 'xy', 24)
for dm_side in [-1, 1]:
    line(dm_prefix+'_pocket', [(dm_side*.21, -.267, .90), (dm_side*.30, -.24, 1.07)], .014, charcoal, torso_weights, 6)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('rugby', dm_cream, dm_burgundy)
dm_body.data.materials.append(dm_burgundy)
for dm_poly in dm_body.data.polygons:
    dm_poly.material_index = int((dm_poly.center.z-.75)/.14) % 2
for dm_obj in dm_sleeves:
    dm_obj.data.materials.append(dm_burgundy)
    for dm_poly in dm_obj.data.polygons:
        dm_poly.material_index = int(abs(dm_poly.center.x)/.14) % 2
for dm_side in [-1, 1]:
    plaque(dm_prefix+'_collar', [(dm_side*.02, 1.50), (dm_side*.20, 1.54), (dm_side*.16, 1.37)], -.228, .025, glint, 'Chest')
dm_box(dm_prefix+'_placket', (0, -.261, 1.37), (.045, .018, .15), glint, 'Chest')
for dm_z in [1.39, 1.34]:
    dm_disc(dm_prefix+'_button', (0, -.275, dm_z), .009, navy, 'Chest', sides=8)

dm_prefix, dm_body, dm_sleeves = dm_shirt_base('armor', dm_steel, charcoal)
plaque(dm_prefix+'_breastplate', [(-.25, 1.46), (.25, 1.46), (.31, 1.17), (.24, 1.04), (0, .98), (-.24, 1.04), (-.31, 1.17)], -.287, .027, dm_silver, torso_weights)
line(dm_prefix+'_center_ridge', [(0, -.326, 1.45), (0, -.332, 1.20), (0, -.326, 1.02)], .016, dm_steel, torso_weights, 6)
star(dm_prefix+'_crest', (0, -.349, 1.30), .075, .034, gold, torso_weights, points=4)
for dm_side, dm_label in [(-1, 'R'), (1, 'L')]:
    dm_ell(dm_prefix+'_pauldron', (dm_side*.46, 0, 1.56), (.21, .215, .13), dm_silver, 'UpperArm.'+dm_label, n=12, m=8)
    dm_loop(dm_prefix+'_gauntlet', (dm_side*.97, 0, 1.465), (.183, .183), .027, dm_silver, 'Forearm.'+dm_label, 'yz', 16)


# Fit relief to the curved cloth instead of leaving patches suspended on an
# arbitrary front plane. Keep each detail's sculpted thickness and its original
# normalized skin weights. Collars, sleeves and hanging drawstrings stay free.
dm_relief_parts = {
    'jersey': ['number', 'side_stripe'], 'tiedye': ['dye_spiral'],
    'skeleton': ['sternum', 'rib'], 'cloud': ['cloud_puff'],
    'suit': ['shirt_front', 'lapel', 'tie', 'pocket', 'button'],
    'raincoat': ['zip', 'pocket'], 'puffer': ['zip', 'pocket'],
    'rugby': ['placket', 'button'], 'armor': ['breastplate', 'center_ridge', 'crest'],
}


def dm_front_surface(x, z, puff=False):
    shape = [(.70, .37, .235), (.82, .409, .255), (1.04, .410, .267), (1.29, .407, .245), (1.48, .36, .21), (1.56, .237, .165)]
    if puff:
        shape = [(.75, .372, .237), (.82, .422, .271), (.93, .425, .28), (.98, .408, .257), (1.08, .425, .282), (1.16, .409, .255), (1.27, .42, .27), (1.34, .40, .238), (1.47, .365, .215), (1.56, .24, .17)]
    rx, ry = shape[0][1:]
    for i in range(len(shape)-1):
        a, b = shape[i], shape[i+1]
        if z >= a[0]:
            t = max(0, min(1, (z-a[0])/(b[0]-a[0])))
            rx, ry = a[1]+t*(b[1]-a[1]), a[2]+t*(b[2]-a[2])
    return -ry*math.sqrt(max(.02, 1-(x/rx)**2))


for dm_style, dm_details in dm_relief_parts.items():
    for dm_obj in list(collection.objects):
        if dm_obj.type != 'MESH' or not any(dm_obj.name.startswith('Drif_Shirt_'+dm_style+'_'+part) for part in dm_details):
            continue
        dm_back = max(v.co.y for v in dm_obj.data.vertices)
        dm_clearance = .008
        if dm_obj.name.startswith('Drif_Shirt_armor_crest'):
            dm_clearance = .037  # Badge sits on the breastplate, not under it.
        elif dm_obj.name.startswith('Drif_Shirt_rugby_button'):
            dm_clearance = .028  # Raised buttons sit above the sewn placket.
        for dm_vertex in dm_obj.data.vertices:
            dm_vertex.co.y = dm_front_surface(dm_vertex.co.x, dm_vertex.co.z, dm_style=='puffer') + dm_vertex.co.y - dm_back - dm_clearance
        dm_obj.data.update()


# HATS -----------------------------------------------------------------------
dm_prefix = 'Drif_Hat_tophat'
dm_ell(dm_prefix+'_brim', (0, .025, 2.69), (.50, .43, .04), charcoal, n=24, m=6)
rings(dm_prefix+'_crown', [(2.70, .335, .30, 0, .025), (2.80, .33, .30, 0, .025), (3.27, .36, .325, 0, .025), (3.30, .355, .32, 0, .025)], charcoal, 'Head', sides=24)
rings(dm_prefix+'_ribbon', [(2.76, .337, .307, 0, .025), (2.85, .337, .307, 0, .025)], dm_burgundy, 'Head', sides=24)
dm_disc(dm_prefix+'_pin', (.16, -.285, 2.81), .028, gold, sides=12)

dm_prefix = 'Drif_Hat_wizard'
dm_ell(dm_prefix+'_brim', (0, .02, 2.69), (.49, .43, .035), dm_lilac, n=24, m=6)
rings(dm_prefix+'_cone', [(2.70, .33, .30, 0, .02), (2.93, .265, .24, .025, .025), (3.18, .16, .15, .065, .04), (3.38, .07, .065, .14, .05), (3.48, .008, .008, .20, .06)], dm_lilac, 'Head', sides=20)
for dm_x, dm_y, dm_z, dm_r in [(-.12, -.27, 2.86, .055), (.11, -.213, 3.07, .047), (.075, -.12, 3.29, .03)]:
    star(dm_prefix+'_star', (dm_x, dm_y, dm_z), dm_r, dm_r*.42, gold, points=5)
dm_loop(dm_prefix+'_ribbon', (0, .02, 2.75), (.327, .301), .018, navy, plane='xy', steps=24)

dm_prefix = 'Drif_Hat_crown'
rings(dm_prefix+'_band', [(2.68, .404, .358, 0, .02), (2.81, .42, .37, 0, .02)], gold, 'Head', sides=24)
dm_verts=[]
for dm_i in range(16):
    dm_angle=dm_i*math.tau/16
    for dm_z, dm_radius in [(2.79, .418), (3.06 if dm_i%2==0 else 2.84, .438)]:
        dm_verts.append((dm_radius*math.cos(dm_angle), .02+dm_radius*.885*math.sin(dm_angle), dm_z))
dm_faces=[(dm_i*2, (dm_i*2+2)%32, (dm_i*2+3)%32, dm_i*2+1) for dm_i in range(16)]
mesh(dm_prefix+'_points', dm_verts, dm_faces, gold, 'Head', False)
for dm_x, dm_color in [(-.20, dm_sky), (0, dm_rose), (.20, dm_mint)]:
    dm_ell(dm_prefix+'_jewel', (dm_x, -.337 if dm_x else -.365, 2.76), (.037, .018, .043), dm_color, n=8, m=6)

dm_prefix = 'Drif_Hat_antlers'
dm_loop(dm_prefix+'_band', (0, .02, 2.73), (.39, .345), .033, dm_leather, plane='xy', steps=24)
for dm_side in [-1, 1]:
    line(dm_prefix+'_main', [(dm_side*.26, .02, 2.74), (dm_side*.30, .04, 2.98), (dm_side*.39, .05, 3.18), (dm_side*.40, .07, 3.38)], .035, dm_leather, 'Head', 8)
    line(dm_prefix+'_branch_outer', [(dm_side*.32, .045, 3.04), (dm_side*.50, .04, 3.15), (dm_side*.55, .03, 3.32)], .023, dm_leather, 'Head', 7)
    line(dm_prefix+'_branch_inner', [(dm_side*.38, .055, 3.17), (dm_side*.23, .04, 3.29), (dm_side*.22, .035, 3.43)], .019, dm_leather, 'Head', 7)
    dm_ell(dm_prefix+'_root', (dm_side*.26, .02, 2.77), (.072, .064, .047), dm_tan)

dm_prefix = 'Drif_Hat_bunny'
dm_loop(dm_prefix+'_band', (0, .02, 2.64), (.39, .345), .041, dm_cream, plane='xy', steps=24)
line(dm_prefix+'_bridge', [(-.39,.02,2.64),(-.31,.025,2.72),(-.225,.035,2.80),
                          (0,.035,2.80),(.225,.035,2.80),(.31,.025,2.72),(.39,.02,2.64)],
     .04,dm_cream,'Head',8)
for dm_side in [-1, 1]:
    dm_ell(dm_prefix+'_ear', (dm_side*.225, .035, 3.13), (.115, .08, .32), dm_cream, n=16, m=12)
    dm_ell(dm_prefix+'_inner_ear', (dm_side*.225, -.037, 3.14), (.065, .018, .245), pink, n=12, m=10)

dm_prefix = 'Drif_Hat_spinner'
dm_obj=rings(dm_prefix+'_cap', [(2.66, .43, .38, 0, .02), (2.79, .415, .37, 0, .02), (2.92, .28, .25, 0, .02), (3.00, .02, .02, 0, .02)], dm_yellow, 'Head', sides=24)
for dm_mat in [dm_sky, dm_rose, dm_mint]:
    dm_obj.data.materials.append(dm_mat)
for dm_poly in dm_obj.data.polygons:
    dm_angle=math.atan2(dm_poly.center.y-.02, dm_poly.center.x)
    dm_poly.material_index=int((dm_angle+math.pi)/(math.pi/2))%4
line(dm_prefix+'_axle', [(0, .02, 2.99), (0, .02, 3.13)], .018, gold, 'Head', 6)
dm_ell(dm_prefix+'_propeller_x', (0, .02, 3.13), (.29, .047, .016), dm_rose, n=16, m=6)
dm_ell(dm_prefix+'_propeller_y', (0, .02, 3.14), (.047, .29, .016), dm_sky, n=16, m=6)
dm_ell(dm_prefix+'_hub', (0, .02, 3.16), (.038, .038, .027), gold)

dm_prefix = 'Drif_Hat_officer'
rings(dm_prefix+'_band', [(2.65, .433, .381, 0, .02), (2.77, .44, .389, 0, .02)], navy, 'Head', sides=24)
rings(dm_prefix+'_crown', [(2.76, .437, .385, 0, .02), (2.91, .475, .42, 0, .025), (3.01, .29, .27, 0, .04), (3.025, .02, .02, 0, .04)], navy, 'Head', sides=24)
dm_ell(dm_prefix+'_brim', (0, -.40, 2.68), (.435, .28, .033), charcoal, n=24, m=6)
plaque(dm_prefix+'_shield', [(-.055, 2.93), (.055, 2.93), (.06, 2.85), (0, 2.81), (-.06, 2.85)], -.416, .021, gold)
star(dm_prefix+'_badge', (0, -.442, 2.88), .032, .015, dm_cream, points=5)
line(dm_prefix+'_braid', [(-.31, -.256, 2.76), (-.17, -.36, 2.75), (0, -.388, 2.745), (.17, -.36, 2.75), (.31, -.256, 2.76)], .013, gold, 'Head', 6)

dm_prefix = 'Drif_Hat_bucket'
rings(dm_prefix+'_brim', [(2.64, .52, .46, 0, .02), (2.71, .43, .38, 0, .02), (2.75, .385, .34, 0, .02)], dm_tan, 'Head', sides=24)
rings(dm_prefix+'_crown', [(2.72, .386, .34, 0, .02), (2.94, .34, .30, 0, .02), (2.97, .31, .28, 0, .02)], dm_tan, 'Head', sides=24)
rings(dm_prefix+'_ribbon', [(2.75, .382, .338, 0, .02), (2.81, .369, .327, 0, .02)], dm_sky, 'Head', sides=24)
for dm_radius in [.46, .50]:
    dm_loop(dm_prefix+'_brim_seam', (0, .02, 2.665 if dm_radius<.5 else 2.65), (dm_radius, dm_radius*.885), .004, dm_cream, plane='xy', steps=24)

dm_prefix = 'Drif_Hat_horns'
dm_loop(dm_prefix+'_band', (0, .02, 2.73), (.39, .345), .031, charcoal, plane='xy', steps=24)
for dm_side in [-1, 1]:
    rings(dm_prefix+'_horn', [(2.75, .105, .09, dm_side*.27, .02), (2.93, .09, .075, dm_side*.35, .025), (3.11, .065, .055, dm_side*.42, .03), (3.27, .032, .03, dm_side*.39, .035), (3.37, .004, .004, dm_side*.31, .04)], dm_cream, 'Head', sides=12)
    dm_loop(dm_prefix+'_root_ring', (dm_side*.27, .02, 2.79), (.105, .09), .015, gold, plane='xy', steps=16)

dm_prefix = 'Drif_Hat_halo'
dm_loop(dm_prefix+'_ring', (0, .02, 3.14), (.43, .38), .032, gold, plane='xy', steps=32)
dm_loop(dm_prefix+'_inner_ring', (0, .02, 3.145), (.375, .325), .010, dm_yellow, plane='xy', steps=28)
for dm_x in [-.28, .28]:
    star(dm_prefix+'_sparkle', (dm_x, -.29, 3.14), .046, .014, dm_cream, points=4)


# ACCESSORIES ----------------------------------------------------------------
def dm_neck_cord(prefix, mat=charcoal, low=1.12):
    line(prefix+'_cord', [(-.18, -.17, 1.55), (-.20, -.274, 1.40), (-.14, -.33, 1.23), (0, -.365, low), (.14, -.33, 1.23), (.20, -.274, 1.40), (.18, -.17, 1.55)], .013, mat, torso_weights, 6)


dm_prefix='Drif_Accessory_scarf'
dm_loop(dm_prefix+'_wrap', (0, .01, 1.56), (.245, .192), .057, dm_burgundy, 'Chest', 'xy', 24)
plaque(dm_prefix+'_tail_left', [(-.20, 1.54), (-.07, 1.49), (-.11, 1.11), (-.24, 1.13)], -.329, .035, dm_burgundy, torso_weights)
plaque(dm_prefix+'_tail_right', [(.04, 1.51), (.16, 1.54), (.20, 1.22), (.08, 1.19)], -.337, .035, dm_burgundy, torso_weights)
for dm_x, dm_z in [(-.177, 1.19), (.135, 1.28)]:
    line(dm_prefix+'_stripe', [(dm_x-.055, -.377, dm_z), (dm_x+.055, -.377, dm_z+.015)], .017, dm_cream, torso_weights, 6)
    for dm_dx in [-.045, -.015, .015, .045]:
        line(dm_prefix+'_fringe', [(dm_x+dm_dx, -.355, dm_z-.065), (dm_x+dm_dx-.006, -.356, dm_z-.105)], .006, dm_cream, torso_weights, 6)

dm_prefix='Drif_Accessory_medallion'
dm_neck_cord(dm_prefix, gold, 1.20)
dm_loop(dm_prefix+'_bail', (0, -.369, 1.20), (.024, .035), .010, gold, torso_weights, steps=12)
dm_disc(dm_prefix+'_coin', (0, -.385, 1.09), .102, gold, torso_weights, sides=20, depth=.035)
dm_loop(dm_prefix+'_rim', (0, -.395, 1.09), (.088, .088), .008, dm_cream, torso_weights, steps=20)
star(dm_prefix+'_emboss', (0, -.407, 1.09), .065, .025, dm_leather, torso_weights, points=6)

dm_prefix='Drif_Accessory_wings'
for dm_side in [-1, 1]:
    dm_outline=[(dm_side*.10, 1.24), (dm_side*.22, 1.57), (dm_side*.49, 1.72), (dm_side*.68, 1.62), (dm_side*.63, 1.40), (dm_side*.48, 1.12), (dm_side*.27, 1.01)]
    plaque(dm_prefix+'_wing', dm_outline, .43, .035, dm_cream, 'Chest')
    for dm_i in range(4):
        dm_start=(dm_side*(.22+.052*dm_i), .483, 1.48+.035*dm_i)
        dm_end=(dm_side*(.30+.095*dm_i), .493, 1.07+.13*dm_i)
        line(dm_prefix+'_feather', [dm_start, ((dm_start[0]+dm_end[0])/2, .50, (dm_start[2]+dm_end[2])/2), dm_end], .037, glint, 'Chest', 8)
    line(dm_prefix+'_strap', [(dm_side*.20, .30, 1.44), (dm_side*.28, .04, 1.56), (dm_side*.29, -.21, 1.43), (dm_side*.30, -.28, 1.19), (dm_side*.27, .24, 1.09)], .021, dm_tan, torso_weights, 6)

dm_prefix='Drif_Accessory_bowtie'
dm_loop(dm_prefix+'_neckband', (0, 0, 1.53), (.238, .178), .016, dm_burgundy, 'Chest', 'xy', 20)
for dm_side in [-1, 1]:
    plaque(dm_prefix+'_bow', [(dm_side*.025, 1.48), (dm_side*.18, 1.57), (dm_side*.18, 1.39), (dm_side*.025, 1.45)], -.27, .06, dm_burgundy, 'Chest')
    line(dm_prefix+'_fold', [(dm_side*.045, -.282, 1.465), (dm_side*.14, -.285, 1.49)], .007, dm_rose, 'Chest', 6)
dm_ell(dm_prefix+'_knot', (0, -.29, 1.47), (.047, .041, .06), dm_rose, 'Chest')

dm_prefix='Drif_Accessory_satchel'
line(dm_prefix+'_strap', [(-.23, .06, 1.55), (-.22, -.22, 1.49), (-.09, -.304, 1.30), (.12, -.335, 1.08), (.32, -.31, .96)], .032, dm_leather, torso_weights, 8)
dm_box(dm_prefix+'_bag', (.28, -.36, .91), (.32, .125, .25), dm_leather, 'Pelvis')
plaque(dm_prefix+'_flap', [(.105, 1.045), (.455, 1.045), (.43, .91), (.28, .87), (.13, .91)], -.435, .025, dm_tan, 'Pelvis')
dm_box(dm_prefix+'_buckle', (.28, -.468, .945), (.061, .018, .068), gold, 'Pelvis')
dm_box(dm_prefix+'_buckle_inset', (.28, -.48, .945), (.031, .009, .036), dm_leather, 'Pelvis')
line(dm_prefix+'_stitch', [(.15, -.466, 1.02), (.41, -.466, 1.02), (.39, -.467, .93), (.28, -.467, .905), (.17, -.467, .93)], .004, dm_cream, 'Pelvis', 6)

dm_prefix='Drif_Accessory_camera'
dm_neck_cord(dm_prefix, charcoal, 1.25)
dm_box(dm_prefix+'_body', (0, -.395, 1.13), (.35, .135, .225), dm_silver, 'Chest')
dm_box(dm_prefix+'_grip', (.125, -.425, 1.13), (.10, .14, .225), charcoal, 'Chest')
dm_disc(dm_prefix+'_lens_barrel', (-.035, -.486, 1.13), .092, charcoal, 'Chest', sides=20, depth=.047)
dm_disc(dm_prefix+'_lens_ring', (-.035, -.50, 1.13), .075, dm_silver, 'Chest', sides=20, depth=.013)
dm_disc(dm_prefix+'_glass', (-.035, -.515, 1.13), .061, dm_sky, 'Chest', sides=20, depth=.014)
dm_ell(dm_prefix+'_glass_glint', (-.055, -.533, 1.155), (.014, .005, .023), glint, 'Chest', n=8, m=6)
dm_box(dm_prefix+'_viewfinder', (-.06, -.397, 1.26), (.105, .10, .05), charcoal, 'Chest')
dm_box(dm_prefix+'_flash', (-.125, -.469, 1.195), (.055, .014, .03), glint, 'Chest')
dm_ell(dm_prefix+'_shutter', (.10, -.395, 1.26), (.023, .024, .012), red, 'Chest', n=10, m=6)

dm_prefix='Drif_Accessory_skateboard'
dm_outline=[(-.25, .87), (-.22, .81), (-.12, .80), (.27, 1.56), (.25, 1.64), (.15, 1.66)]
plaque(dm_prefix+'_deck', dm_outline, .49, .052, dm_leather, 'Chest')
dm_inner=[(-.22, .88), (-.195, .84), (-.135, .84), (.235, 1.56), (.22, 1.60), (.165, 1.62)]
plaque(dm_prefix+'_paint', dm_inner, .548, .01, dm_lilac, 'Chest')
for dm_x, dm_z in [(-.14, .98), (.15, 1.47)]:
    dm_box(dm_prefix+'_truck', (dm_x, .60, dm_z), (.245, .065, .045), dm_silver, 'Chest')
    for dm_side in [-1, 1]:
        dm_ell(dm_prefix+'_wheel', (dm_x+dm_side*.13, .616, dm_z), (.041, .05, .047), dm_yellow, 'Chest', n=12, m=8)
star(dm_prefix+'_graphic', (.015, .565, 1.25), .065, .03, dm_cream, 'Chest', points=5)
for dm_z in [1.01, 1.45]:
    line(dm_prefix+'_mount_strap', [(-.23, .27, dm_z), (-.23, .57, dm_z), (.25, .57, dm_z), (.25, .27, dm_z)], .02, charcoal, 'Chest', 6)

dm_prefix='Drif_Accessory_flower'
line(dm_prefix+'_stem', [(.18, -.31, 1.12), (.19, -.335, 1.24), (.18, -.34, 1.38)], .012, teal, 'Chest', 6)
for dm_i in range(7):
    dm_angle=dm_i*math.tau/7
    dm_ell(dm_prefix+'_petal', (.18+.063*math.cos(dm_angle), -.344, 1.38+.063*math.sin(dm_angle)), (.047, .016, .047), pink if dm_i%2 else dm_rose, 'Chest', n=10, m=6)
dm_ell(dm_prefix+'_center', (.18, -.368, 1.38), (.036, .023, .036), dm_yellow, 'Chest')
plaque(dm_prefix+'_leaf', [(.19, 1.21), (.28, 1.28), (.27, 1.20), (.19, 1.18)], -.331, .012, dm_mint, 'Chest')

dm_prefix='Drif_Accessory_cassette'
dm_neck_cord(dm_prefix, navy, 1.25)
dm_box(dm_prefix+'_case', (0, -.395, 1.12), (.32, .105, .22), dm_rose, 'Chest')
dm_box(dm_prefix+'_window', (0, -.453, 1.12), (.245, .012, .115), dm_cream, 'Chest')
for dm_x in [-.067, .067]:
    dm_disc(dm_prefix+'_reel', (dm_x, -.468, 1.12), .038, dm_steel, 'Chest', sides=12)
    dm_disc(dm_prefix+'_hub', (dm_x, -.48, 1.12), .014, dm_cream, 'Chest', sides=8)
line(dm_prefix+'_tape', [(-.067, -.483, 1.095), (.067, -.483, 1.095)], .005, charcoal, 'Chest', 6)
dm_box(dm_prefix+'_label', (0, -.454, 1.20), (.20, .012, .024), charcoal, 'Chest')
for dm_x in [-.11, -.055, 0, .055]:
    dm_box(dm_prefix+'_button', (dm_x, -.402, 1.242), (.028, .045, .022), dm_cream, 'Chest')
dm_box(dm_prefix+'_record_button', (.11, -.402, 1.242), (.028, .045, .022), red, 'Chest')

dm_prefix='Drif_Accessory_keychain'
dm_loop(dm_prefix+'_clip', (.32, -.319, .98), (.038, .052), .010, gold, 'Pelvis', steps=16)
for dm_i in range(3):
    dm_loop(dm_prefix+'_link', (.32, -.34, .915-dm_i*.04), (.014, .026), .006, gold, 'Pelvis', steps=10)
dm_loop(dm_prefix+'_key_ring', (.355, -.354, .78), (.025, .025), .009, dm_silver, 'Pelvis', steps=12)
line(dm_prefix+'_key_stem', [(.355, -.354, .758), (.355, -.354, .655)], .012, dm_silver, 'Pelvis', 6)
for dm_z in [.68, .71]:
    line(dm_prefix+'_key_tooth', [(.355, -.354, dm_z), (.385, -.354, dm_z)], .010, dm_silver, 'Pelvis', 6)
dm_heart(dm_prefix+'_heart_charm', (.27, -.355, .755), .045, dm_lilac, 'Pelvis')

print('DRIFMAKER_EXTENDED', {category: len(variants) for category, variants in EXTENDED_VARIANTS.items()})
