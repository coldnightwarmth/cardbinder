// Trait packs carry the same bind pose but no duplicate animation library.
// Rebind every primitive to the base rig before cloning a visitor's avatar.
export function mergeAvatarParts(base,pack){
 const bones=new Map(),roots=[],skeletons=new Map();
 base.traverse(node=>{if(node.isBone)bones.set(node.name,node);});
 pack.traverse(node=>{
  if(/^Drif_/.test(node.name)&&!/^Drif_/.test(node.parent?.name||''))roots.push(node);
  if(!node.isSkinnedMesh)return;
  if(!skeletons.has(node.skeleton)){
   const skeleton=node.skeleton.clone();
   skeleton.bones=node.skeleton.bones.map(bone=>{
    const shared=bones.get(bone.name);
    if(!shared)throw Error(`Trait pack references an unknown bone: ${bone.name}`);
    return shared;
   });
   skeletons.set(node.skeleton,skeleton);
  }
  node.bind(skeletons.get(node.skeleton),node.bindMatrix);
 });
 for(const root of roots){
  if(base.getObjectByName(root.name))throw Error(`Duplicate avatar part: ${root.name}`);
  const parent=base.getObjectByName(root.parent?.name);
  if(!parent)throw Error(`Trait pack parent is missing: ${root.parent?.name}`);
  parent.add(root);
 }
 return base;
}
