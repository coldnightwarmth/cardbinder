import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

// PMREM render targets belong to their WebGL renderer. Create a separate target
// for thumbnails and exports so gold reflects correctly in every context.
export function createDrifmakerEnvironment(renderer){
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
 try{return pmrem.fromScene(room,.025);}finally{room.dispose();pmrem.dispose();}
}
