// Shared allowlist for Blender clips, editor controls and multiplayer packets.
export const POSES=Object.freeze([
 ['salute','Salute'],['tpose','T-pose'],['bow','Deep bow'],['victory','Victory'],
 ['think','Thinking'],['point','Point'],['summon','Spellcast'],['flex','Flex'],
 ['welcome','Welcome'],['heart','Heart hands'],
 ['wave','Wave'],['dab','Dab'],['lunge','Hero lunge'],['crane','Crane balance'],
 ['airguitar','Air guitar'],['kneel','Kneel'],['boxer','Boxing guard'],['shrug','Shrug'],
 ['leanback','Lean back'],['lookout','Lookout'],['conductor','Conductor'],['curtsey','Curtsey'],
].map(([id,label])=>Object.freeze({id,label,clip:`Pose_${id}`,duration:2})));
export const normalizePose=id=>POSES.some(pose=>pose.id===id)?id:'';
// Card holding uses the existing showroom Hold_Right clip, with its card prop.
export const PORTRAIT_POSES=Object.freeze([...POSES,Object.freeze({id:'holdcard',label:'Hold card'})]);
export const normalizePortraitPose=id=>PORTRAIT_POSES.some(pose=>pose.id===id)?id:'';
export const normalizePoseTime=time=>Number.isFinite(time)?Math.max(0,Math.min(2,time)):0;
export function createPoseState(){
 let id='',time=0;
 return {get value(){return {emote:id,emoteTime:time};},select(value){id=normalizePose(value);time=0;},cancel(){id='';time=0;},update(dt){if(id)time=normalizePoseTime(time+Math.max(0,dt));return this.value;}};
}
