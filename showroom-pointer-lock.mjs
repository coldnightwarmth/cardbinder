// Capture intent survives asynchronous browser events. Failed capture requests
// remain retryable; a security/cooldown rejection must not enable drag-to-look.
export function createShowroomPointerLock({element,document,onChange,onError=()=>{}}) {
 let releasing=false,wanted=false,pending=0,serial=0,locked=document.pointerLockElement===element;
 function failed(request,error){
  if(pending!==request)return;
  pending=0;
  if(!wanted)return;
  wanted=false;onError(error);onChange(false,'error');
 }
 function changed(){
  const next=document.pointerLockElement===element;
  if(next){
   pending=0;locked=true;
   if(!wanted){releasing=true;document.exitPointerLock?.();return;}
   onChange(true,'capture');
  }else{
   const wasLocked=locked;locked=false;
   if(releasing){releasing=false;if(wanted){request();return;}}
   // This can be the queued unlock from immediately before a fresh request.
   if(wanted&&pending)return;
   const reason=wanted&&wasLocked?'native':'release';wanted=false;
   onChange(false,reason);
  }
 }
 document.addEventListener('pointerlockchange',changed);
 document.addEventListener('pointerlockerror',()=>{if(pending)failed(pending,new Error('Mouse capture was declined'));});
 function request(){
   wanted=true;
   if(releasing)return;
   if(document.pointerLockElement===element){onChange(true,'capture');return;}
   if(pending)return;
   const request=++serial;pending=request;
   try {
    if(!element.requestPointerLock)throw new Error('Pointer lock is unavailable');
    element.requestPointerLock()?.catch(error=>failed(request,error));
   }catch(error){failed(request,error);}
  }
 return {request,
  release(){wanted=false;if(document.pointerLockElement===element){releasing=true;document.exitPointerLock?.();}onChange(false,'release');},
 };
}
