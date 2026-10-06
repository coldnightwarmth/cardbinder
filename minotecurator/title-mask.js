export function maskName(image){
 if(!image?.parentElement||image.parentElement.classList.contains('title-mask'))return;
 const mask=document.createElement('div');mask.className='title-mask';
 Object.assign(mask.style,{position:'absolute',inset:'0',zIndex:'2',pointerEvents:'none',maskImage:'url(/minotecurator/assets/strip.png)',maskSize:'100% 100%',maskRepeat:'no-repeat',webkitMaskImage:'url(/minotecurator/assets/strip.png)',webkitMaskSize:'100% 100%',webkitMaskRepeat:'no-repeat'});
 image.before(mask);mask.append(image);
}
export function drawMaskedName(ctx,name,strip,n){const layer=document.createElement('canvas');layer.width=2000;layer.height=2800;const ink=layer.getContext('2d');ink.drawImage(name,n.cx-n.w/2,n.cy-n.h/2,n.w,n.h);ink.globalCompositeOperation='destination-in';ink.drawImage(strip,0,0,2000,2800);ctx.drawImage(layer,0,0);}
