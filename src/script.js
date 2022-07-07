import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';



// Texture Loader
// textures
const textureLoader = new THREE.TextureLoader();
const sandstoneBrickWallTexture = textureLoader.load('/textures/sandstone_brick_wall_01_1k/textures/sandstone_brick_wall_01_diff_1k.png');
const damagedRoadBlockTexture = textureLoader.load("/textures/Roadblock_Damaged_Albedo.png");



// GUI
const gui = new dat.GUI();



// Performance Monitor
var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

var stats2 = new Stats();
stats2.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats2.dom );
stats2.dom.style.position = 'absolute';
stats2.dom.style.left = '75px';
stats2.dom.style.top = '0px';

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}


// Collision arrays to hold bounding box and collision obstacle objects
const collisions = [];
const collisionObjects = [];


// Create the controls 
// WASD -> movement controls
// Shift -> Running or walking controls
const W = 'w'
const A = 'a'
const S = 's'
const D = 'd'
const SHIFT = 'shift'
const DIRECTIONS = [W, A, S, D]

class KeyDisplay {

    map = new Map()

    constructor() {
        const w = document.createElement("div")
        const a = document.createElement("div")
        const s = document.createElement("div")
        const d = document.createElement("div")
        const shift = document.createElement("div")

        this.map.set(W, w)
        this.map.set(A, a)
        this.map.set(S, s)
        this.map.set(D, d)
        this.map.set(SHIFT, shift)

        this.map.forEach( (v, k) => {
            v.style.color = 'blue'
            v.style.fontSize = '50px'
            v.style.fontWeight = '800'
            v.style.position = 'absolute'
            v.textContent = k
        })

        this.updatePosition()

        this.map.forEach( (v, _) => {
            document.body.append(v)
        })
    }

    updatePosition() {
        this.map.get(W).style.top = `${window.innerHeight - 150}px`
        this.map.get(A).style.top = `${window.innerHeight - 100}px`
        this.map.get(S).style.top = `${window.innerHeight - 100}px`
        this.map.get(D).style.top = `${window.innerHeight - 100}px`
        this.map.get(SHIFT).style.top = `${window.innerHeight - 100}px`

        this.map.get(W).style.left = `${300}px`
        this.map.get(A).style.left = `${200}px`
        this.map.get(S).style.left = `${300}px`
        this.map.get(D).style.left = `${400}px`
        this.map.get(SHIFT).style.left = `${50}px`
    }

    down (key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'red'
        }
    }

    up (key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'blue'
        }
    }
}



// Charector controls and movement
// performs animation mixer
let footballKick = 0;
let newPosition = new THREE.Vector3();
// Charecter Controls
class CharacterControls {
    model
    mixer
    animationsMap = new Map() // Walk, Run, Idle
    orbitControl
    camera

    // state
    toggleRun = true
    currentAction
    
    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    fpscameraTarget = new THREE.Vector3()
    
    // constants
    fadeDuration = 0.2
    runVelocity = 5
    walkVelocity = 2

    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction) 
    {
        this.model = model
        this.mixer = mixer
        this.animationsMap = animationsMap
        this.currentAction = currentAction
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play()
            }
        })
        this.orbitControl = orbitControl
        // this.fpsCamera = fpsCamera;
        // this.fpsOrbitControl = fpsOrbitControl;
        this.camera = camera
        this.carryMode = true;
        this.dribbleMode = false;
        this.kickMode = false;
        this.updateCameraTarget(0,0)
    }


    // add football to the player group
    addFootball(football)
    {
        this.football = football;
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }


    // set dribble mode
    setDribbleMode() {
        this.dribbleMode = true;
        this.carryMode = false;
        this.kickMode = false;
    }

    // set carry mode
    setCarryMode() {
        this.carryMode = true;
        this.dribbleMode = false;
        this.kickMode = false;
    }

    // set kick mode
    setKickMode() {
        this.kickMode = true;
        this.carryMode = false;
        this.dribbleMode = false;
    }


    // adds First person camera
    addCamera(camera) {
        this.fpsCamera = camera;
    }


    // adds First person camera orbit controls
    addfpsCameraControls(fpsCamcontrols) {
        this.fpsCamcontrols = fpsCamcontrols;
    }

    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)

        var play = '';
        if (directionPressed && this.toggleRun) {
            play = 'Run'
        } else if (directionPressed) {
            play = 'Walk'
        } else {
            play = 'Idle'
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(this.currentAction)

            current.fadeOut(this.fadeDuration)
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play
        }

        this.mixer.update(delta)

        if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
            // calculate towards camera direction
            var angleYCameraDirection = Math.atan2(
                    (this.camera.position.x - this.model.position.x), 
                    (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            var directionOffset = this.directionOffset(keysPressed)

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            // run/walk velocity
            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity

            // move model & camera
            const moveX = this.walkDirection.x * velocity * delta
            const moveZ = this.walkDirection.z * velocity * delta

            this.model.position.x += moveX
            this.model.position.z += moveZ
            

            if(this.fpsCamera)
            {
                // this.fpsCamera.position.x += moveX;
                // this.fpsCamera.position.z += moveZ;
                // this.fpsCamera.rotation.x = this.walkDirection.x;
                // this.fpsCamera.rotation.z = this.walkDirection.z;

                // this.fpscameraTarget.x = moveX; 
                // this.fpscameraTarget.y = this.walkDirection.y + 1;
                // this.fpscameraTarget.z = moveZ;
                // this.fpsCamcontrols.target = this.fpscameraTarget;
                // this.fpsCamcontrols.enabled = false;
                // this.fpsCamcontrols.target = this.football.position;
            }
            
            
            // carry mode
            // moves the ball in carry mode
            // if there is football obstacle collision then the ball is pushed back
            // if there is no football obstacle collision then the ball is moved forward
            if(this.detectCollision() && this.carryMode && this.insideBoundaries(moveX, moveZ)) {
                if(!this.detectObstacleCollision()) {
                    this.football.position.x += moveX
                    this.football.position.z += moveZ

                    // get random number between 0.1 and 0.5
                    this.football.rotation.y += Math.random() * 0.4 + 0.1;
                    this.football.rotation.x += Math.random() * 0.4 + 0.1;
                }
                if(this.detectObstacleCollision()) {
                    this.football.position.x -= moveX
                    this.football.position.z -= moveZ

                    // get random number between 0.1 and 0.5
                    this.football.rotation.y -= Math.random() * 0.4 + 0.1;
                    this.football.rotation.x -= Math.random() * 0.4 + 0.1;
                }
            }
            

            // dribble mode
            // moves the ball in dribble mode
            // if there is football obstacle collision then the ball is pushed back
            // if there is no football obstacle collision then the ball is moved forward
            if(this.detectCollision() && this.dribbleMode) {
                for(let i = 0;i < 12;i++) {
                    this.football.position.x += moveX
                    this.football.position.z += moveZ
                    this.football.rotation.y += Math.random() * 0.4 + 0.1;
                    this.football.rotation.x += Math.random() * 0.4 + 0.1;
                    if(this.football.position.x < 14.29 && this.football.position.x > 14.17 && this.football.position.z > -1.3 && this.football.position.z < 1.3) {
                        console.log("Game Reset - Goal Scored");
                        this.football.position.set(5.4, 0.3, 0);
                        break;
                    }
                    if(this.football.position.x > -14.28 && this.football.position.x < -14.00 && this.football.position.z > -1.21 && this.football.position.z < 1.14) {
                        console.log("Game Reset - Goal Scored");
                        this.football.position.set(5.4, 0.3, 0);
                        break;
                    }
                    if(this.detectObstacleCollision()) {
                        // console.log('collision');
                        for(let i = 0;i < 40;i++) {
                            this.football.position.x -= moveX
                            this.football.position.z -= moveZ
                            this.football.rotation.y += Math.random() * 0.4 + 0.1;
                            this.football.rotation.x += Math.random() * 0.4 + 0.1;
                        }
                        break;
                    }
                }
            }


            // kick mode
            // moves the ball in kick mode
            // if there is football obstacle collision then the ball is pushed back
            // if there is no football obstacle collision then the ball is moved forward
            if(this.detectCollision() && this.kickMode) {
                newPosition = this.football.position.clone()
                for(let i = 0;i < 50;i++) 
                {
                    this.football.position.x += moveX
                    this.football.position.z += moveZ
                    this.football.rotation.y += Math.random() * 0.4 + 0.1;
                    this.football.rotation.x += Math.random() * 0.4 + 0.1;
                    if(this.football.position.x < 14.29 && this.football.position.x > 14.17 && this.football.position.z > -1.3 && this.football.position.z < 1.3) {
                        console.log("Game Reset - Goal Scored");
                        this.football.position.set(5.4, 0.3, 0);
                        break;
                    }
                    if(this.football.position.x > -14.28 && this.football.position.x < -14.00 && this.football.position.z > -1.21 && this.football.position.z < 1.14) {
                        console.log("Game Reset - Goal Scored");
                        this.football.position.set(5.4, 0.3, 0);
                        break;
                    }
                    if(this.detectObstacleCollision()) {
                        // console.log('collision');
                        for(let i = 0;i < 40;i++) {
                            this.football.position.x -= moveX
                            this.football.position.z -= moveZ
                            this.football.rotation.y += Math.random() * 0.4 + 0.1;
                            this.football.rotation.x += Math.random() * 0.4 + 0.1;
                        }
                        break;
                    }
                }
                // console.log(this.football.position, newPosition);
                // footballKick = 1;
            }


            // updates top view camera and FPS camera
            this.updateCameraTarget(moveX, moveZ);
            this.updateFPSCameraTarget(moveX, moveZ);
        }
    }

    // Sleep Promise
    sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }


    // check if football is inside boundaries
    insideBoundaries(moveX,moveZ) {
        if(this.football.position.x - moveX > -16 && this.football.position.x + moveX < 16 && this.football.position.z - moveZ > -9.5 && this.football.position.z + moveZ < 9.5) {
            return true;
        }
    }

      
    // detects object model collision
    // uses 0.5 as a threshold factor so that ball and model don't get struck together
    detectCollision() {
        if(this.football) {
            if(this.football.position.x > this.model.position.x - 0.5 && this.football.position.x < this.model.position.x + 0.5 && this.football.position.z > this.model.position.z - 0.5 && this.football.position.z < this.model.position.z + 0.5) {
                return true;
            }
        }
    }


    // detects player obstacle collision
    // calculates intersection of player and obstacle bounding box
    detectPlayerCollision(moveX, moveZ) {
        for(let i = 0;i < collisionObjects.length; i++)
        {
            let selectedBbox = new THREE.Box3().setFromObject(this.model);
            let bbox = new THREE.Box3().setFromObject(collisionObjects[i]);
            if(selectedBbox.intersectsBox(bbox)) {
                return true;
            }
        }
        return false;
    }


    // detects obstacle collision with football
    // calculates intersection of football and obstacle bounding box
    detectObstacleCollision() {
        for(let i = 0;i < collisionObjects.length; i++)
        {
            // if(this.football) {
            //     if(this.football.position.x < collisions[i].xMax && this.football.position.x > collisions[i].xMin && this.football.position.z < collisions[i].zMax && this.football.position.z > collisions[i].zMin && this.football.position.y < collisions[i].yMax && this.football.position.y > collisions[i].yMin) 
            //     {
            //         return true;
            //     }
            // }
            let footballBbox = new THREE.Box3().setFromObject(this.football);
            let obstacleBbox = new THREE.Box3().setFromObject(collisionObjects[i]);
            if(footballBbox.intersectsBox(obstacleBbox)) {
                return true;
            }
        }
        return false;
    }


    // updates top view camera
    updateCameraTarget(moveX, moveZ) {
        // move camera
        this.camera.position.x += moveX
        this.camera.position.z += moveZ

        // update camera target
        this.cameraTarget.x = this.model.position.x
        this.cameraTarget.y = this.model.position.y + 1
        this.cameraTarget.z = this.model.position.z
        this.orbitControl.target = this.cameraTarget
    }

    // updates first person camera controls
    updateFPSCameraTarget(moveX, moveZ) {
        // move camera
        this.fpsCamera.position.x += moveX
        this.fpsCamera.position.z += moveZ

        // update camera target
        this.fpscameraTarget.x = this.model.position.x
        this.fpscameraTarget.y = this.model.position.y + 1
        this.fpscameraTarget.z = this.model.position.z
        this.fpsCamcontrols.target = this.fpscameraTarget
    }


    // sets a direction offset to the movement of the person
    directionOffset(keysPressed) {
        var directionOffset = 0 // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }
}



// kick the football in slo-mo
const kickFootball = (football,newPosition) => 
{
    const targetNormalizedVector = new THREE.Vector3(0,0,0);
    targetNormalizedVector.x = newPosition.x - football.position.x;
    // targetNormalizedVector.y = targetPosition.y - ghost.position.y;
    targetNormalizedVector.z = newPosition.z - football.position.z;
    targetNormalizedVector.normalize();
    football.translateOnAxis(targetNormalizedVector,0.05);
}



// if the ball is inside one of the goals then the game is reset
// football is reset to the center of the field
const resetGame = () => {
    if(football && player) {
        if(football.position.x < 14.29 && football.position.x > 14.17 && football.position.z > -1.3 && football.position.z < 1.3) {
            console.log("Game Reset - Goal Scored");
            football.position.set(5.4, 0.3, 0);
        }
        if(football.position.x > -14.28 && football.position.x < -14.00 && football.position.z > -1.21 && football.position.z < 1.14) {
            console.log("Game Reset - Goal Scored");
            football.position.set(5.4, 0.3, 0);
        }
        // console.log(player.position);
    }
}


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene();


// Collision detection
function calculateCollisionPoints( mesh, type = 'collision' ) 
{ 
    // Compute the bounding box after scale, translation, etc.
    const bbox = new THREE.Box3().setFromObject(mesh);
   
    const bounds = {
      type: type,
      xMin: bbox.min.x,
      xMax: bbox.max.x,
      yMin: bbox.min.y,
      yMax: bbox.max.y,
      zMin: bbox.min.z,
      zMax: bbox.max.z,
    };
   
    collisions.push( bounds );
}




/**
 * Camera
 */
// Base camera
let characterControls, player, camera2;


let camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height, 0.1, 10000);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 10;

// Controls
let controls;


// Camera control Mode
// function to make a perspective camera and return it
function makeCamera(fov = 100) {
    const aspect = sizes.width/sizes.height;  
    const zNear = 0.1;
    const zFar = 100000;
    return new THREE.PerspectiveCamera(fov, aspect, zNear, zFar);
}

// WORLD CAMERA
camera = makeCamera();
camera.position.set(0,0,10);

controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

let fpsCamcontrols, fpsCamera2;
let fpsCamCounter = 0;

// Model with animation
new GLTFLoader().load('/models/Soldier.glb', function (gltf) {
    const model = gltf.scene;
    player = gltf.scene;
    // model.scale.set(new Vector3(0.5,0.5,0.5));
    gltf.scene.scale.set(0.8, 0.8, 0.8); 

    camera2 = makeCamera();
    camera2.position.set(0,1.1,0);
    fpsCamcontrols = new OrbitControls(camera2, canvas);
    fpsCamcontrols.enablePan = false;
    fpsCamcontrols.enableDamping = true;
    fpsCamcontrols.enableZoom = false;
    

    fpsCamCounter = 1;


    // fpsCamcontrols.enableDamping = true;
    // fpsCamera2 = new FirstPersonCamera(camera2, []);
    scene.add(camera2);
    // const group = new THREE.Group();
    // group.add(model);
    // group.add(camera2);
    // player = group;

    model.traverse(function (object) {
        if (object.isMesh) 
        {
            object.castShadow = true;
        }
    });
    scene.add(player);

    const gltfAnimations = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map()
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a))
    })

    characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera,  'Idle');
    characterControls.addCamera(camera2);
    characterControls.addfpsCameraControls(fpsCamcontrols);
});



// Control Keys
const keysPressed = {  }
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key)
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle()
    } else {
        (keysPressed)[event.key.toLowerCase()] = true
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    (keysPressed)[event.key.toLowerCase()] = false
}, false);


// Change camera mode, kick mode, dribble mode and carry mode
let cameraControlMode = 0;
document.addEventListener("keydown", (event) => {
    // console.log(event.key);
    if(event.key === "D") {
        characterControls.setDribbleMode();
    }
    else if(event.key === "c") {
        characterControls.setCarryMode();
    }
    else if(event.key === "k") {
        characterControls.setKickMode();
    } else if(event.key === "C") {
        cameraControlMode = (cameraControlMode + 1) % 2;
    }
})





// Loader
// instantiate a loader
// const loader = new OBJLoader();
const loader = new FBXLoader();
const objLoader = new OBJLoader();
let field, street_light1, street_light2, roadblock, batman;


// load a soccer field fbx file
loader.load(
	'/models/Soccer_Field.fbx',
	function ( object ) 
    {
        // set object transforms
        field = object;
		scene.add( object );

        object.scale.set(0.013,0.013,0.013);
        object.position.set(0, 0, 0);
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);


// load staduim light 1
objLoader.load(
	'/models/Light.obj',
	function ( object ) 
    {
        // set object transforms
        street_light1 = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(13, 0, -10);
        object.rotation.y = -Math.PI/2 - Math.PI/6;
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);


// load stadium light 2
objLoader.load(
	'/models/Light.obj',
	function ( object ) 
    {
        // set object transforms
        street_light2 = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(-13, 0, -10);
        object.rotation.y = -Math.PI/2 + Math.PI/6;
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



// load stadium light 3
let street_light3;
objLoader.load(
	'/models/Light.obj',
	function ( object ) 
    {
        // set object transforms
        street_light3 = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(-13, 0, 10);
        object.rotation.y = Math.PI/2 - Math.PI/6;
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



let street_light4;
objLoader.load(
	'/models/Light.obj',
	function ( object ) 
    {
        // set object transforms
        street_light4 = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(13, 0, 10);
        object.rotation.y = -Math.PI/2 + Math.PI/6;
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



let barrel;
// load a barrel obstacle 1k fbx file
loader.load(
	'/models/treasure_chest_1k.fbx/treasure_chest_1k.fbx',
	function ( object ) 
    {
        // set object transforms
        barrel = object;
		scene.add( object );

        object.scale.set(0.02,0.02,0.02);
        object.position.set(-4, 0, -6);
        object.rotation.y = -Math.PI/2 + Math.PI/6;
        calculateCollisionPoints(object);
        collisionObjects.push(object);
	},
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



// load a football object onto the field
let football;
loader.load(
	'/models/Foot.fbx',
	function ( object ) 
    {
        // set object transforms
        football = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(5.4, 0.3, 0);

        object.traverse(function(child) {
            if (child instanceof THREE.Mesh){
                child.material = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load('/textures/football.png')});
            }
        });
    },
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);
// const footballGeometry = new THREE.SphereGeometry(0.2, 32, 32);
// const footballMaterial = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load('/textures/football.png')});
// let football = new THREE.Mesh(footballGeometry, footballMaterial);
// football.position.set(5.4, 0.3, 0);
// scene.add(football);




let tank;
// load a canon obstacle 1k fbx file
loader.load(
	'/models/cannon_01_1k.fbx/cannon_01_1k.fbx',
	function ( object ) 
    {
        // set object transforms
        tank = object;
		scene.add( object );

        object.scale.set(0.02,0.02,0.02);
        object.position.set(-4,0,6);
        calculateCollisionPoints(object);
        collisionObjects.push(object);
    },
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



let brassVase;
// load a brass vase obstacle 1k fbx file
loader.load(
    "/models/brass_vase_03_1k.fbx/brass_vase_03_1k.fbx",
	function ( object ) 
    {
        // set object transforms
        brassVase = object;
		scene.add( object );

        object.scale.set(0.1,0.1,0.1);
        object.position.set(6,0,6);
        calculateCollisionPoints(object);
        collisionObjects.push(object);
    },
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);



// load a Damaged roadblock obstacle 1k fbx file
loader.load(
	'/models/Roadblock_Damaged.fbx',
	function ( object ) 
    {
        // set object transforms
        roadblock = object;
		scene.add( object );

        object.scale.set(0.01,0.01,0.01);
        object.position.set(6, 0, -6);
        calculateCollisionPoints(object);
        collisionObjects.push(object);

        object.traverse(function(child) {
            if (child instanceof THREE.Mesh){
                child.material = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load("/textures/Roadblock_Damaged_Albedo.png")});
                // child.material.map = damagedRoadBlockTexture;
                // const texture2 = new THREE.TextureLoader().load('/textures/Roadblock_Damaged_Albedo.png');
                // child.material.map = texture2;
                // child.material.metalnessMap = new THREE.TextureLoader().load('/textures/Roadblock_Damaged_Metalness.png');
                // child.material.roughnessMap = new THREE.TextureLoader().load('/textures/Roadblock_Damaged_Roughness.png');
                // child.material.normalMap = new THREE.TextureLoader().load('/textures/Roadblock_Damaged_Normal.png');
                // child.material.aoMap = new THREE.TextureLoader().load('/textures/Roadblock_Damaged_AO.png');
            }
        });

        // console.log(collisions);
    },
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);


let ghost;
loader.load(
	ghost = '/models/CartoonGhost.fbx',
	function ( object ) 
    {
        // set object transforms
        ghost = object;
		scene.add( object );

        object.scale.set(0.2,0.2,0.2);
        object.position.set(-4, 1, 0);
        // calculateCollisionPoints(object);
        // console.log(collisions);

        ghost.traverse(function(child) {
            if (child instanceof THREE.Mesh){
                child.material = new THREE.MeshStandardMaterial({map: new THREE.TextureLoader().load('/textures/aerial_rocks_02_1k/textures/aerial_rocks_02_diff_1k.png')});
            }
        });
    },
	function ( xhr ) 
    {
    	console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) 
    {
		console.log( 'An error happened', error );
	}
);




const ghostBallCollision = function()
{
    if(football && ghost)
    {
        const firstBB = new THREE.Box3().setFromObject(football);
        const secondBB = new THREE.Box3().setFromObject(ghost);
        const collision = firstBB.intersectsBox(secondBB);
        // console.log(collision);
        return collision;
    }
    
}


const moveOpponent = function() {
    if(football && ghost)
    {
        if(!ghostBallCollision())
        {
            const targetPosition = football.position;
            const targetNormalizedVector = new THREE.Vector3(0,0,0);
            targetNormalizedVector.x = targetPosition.x - ghost.position.x;
            // targetNormalizedVector.y = targetPosition.y - ghost.position.y;
            targetNormalizedVector.z = targetPosition.z - ghost.position.z;
            targetNormalizedVector.normalize();
            ghost.translateOnAxis(targetNormalizedVector,0.03);
        }
        

        // check for bounding box
        if(ghostBallCollision())
        {
            // move ball and object towards 15,0,0
            const targetPosition = new THREE.Vector3(15,0.3,0);
            const targetNormalizedVector = new THREE.Vector3(0,0,0);
            targetNormalizedVector.x = targetPosition.x - football.position.x;
            targetNormalizedVector.z = targetPosition.z - football.position.z;
            targetNormalizedVector.normalize();
            ghost.translateOnAxis(targetNormalizedVector,0.03);
            football.translateOnAxis(targetNormalizedVector,0.03);
            football.position.y = 0.3;
        }
    }
}


// add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);


const PointLight1 = new THREE.PointLight(0xff0000, 1, 100);
PointLight1.position.set(13, 8, -10);
scene.add(PointLight1);

const PointLight2 = new THREE.PointLight(0x00ff00, 1, 100);
PointLight2.position.set(-13, 8, -10);
scene.add(PointLight2);

const PointLight3 = new THREE.PointLight(0x0000ff, 1, 100);
PointLight3.position.set(-13, 8, 10);
scene.add(PointLight3);

const PointLight4 = new THREE.PointLight(0xff00ff, 1, 100);
PointLight4.position.set(13, 8, 10);
scene.add(PointLight4);

const spotLight = new THREE.SpotLight( 0x0000ff );
spotLight.position.set( 5, 1 ,0 );
// spotLight.target = new THREE.Vector3( 0, 0, 0 );
spotLight.castShadow = true;
scene.add( spotLight );


gui.add(PointLight1, 'intensity', 0, 5).name("Light1 Intensity");
gui.add(PointLight2, 'intensity', 0, 5).name("Light2 Intensity");
gui.add(PointLight3, 'intensity', 0, 5).name("Light3 Intensity");
gui.add(PointLight4, 'intensity', 0, 5).name("Light4 Intensity");
gui.add(ambientLight, 'intensity', 0, 5).name("Ambient Light Intensity");
gui.add(spotLight, 'intensity', 0, 5).name("Spot Light Intensity");


const spotLightHelper = new THREE.SpotLightHelper( spotLight );
// scene.add( spotLightHelper );


const pointLightHelper1 = new THREE.PointLightHelper(PointLight1, 1);
scene.add(pointLightHelper1);

const pointLightHelper2 = new THREE.PointLightHelper(PointLight2, 1);
scene.add(pointLightHelper2);

const pointLightHelper3 = new THREE.PointLightHelper(PointLight3, 1);
scene.add(pointLightHelper3);

const pointLightHelper4 = new THREE.PointLightHelper(PointLight4, 1);
scene.add(pointLightHelper4);


const axisHelper = new THREE.AxesHelper(5);
scene.add(axisHelper);



window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})




/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))






/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0
let addFootballCounter = 0;
let printCounter = 0;
let dribbleCounter = 0;
let hackCounter = 0;

const tick = () =>
{
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - lastElapsedTime;
    lastElapsedTime = elapsedTime;

    stats.begin();
	// monitored code goes here
	stats.end();

    stats2.begin();
    stats2.end();

    // Update controls
    if(controls) {
        controls.update();
    }

    if(fpsCamCounter === 1 && fpsCamcontrols) {
        fpsCamcontrols.update();
    }


    // integrate football and player
    if(football && characterControls && addFootballCounter === 0)
    {
        characterControls.addFootball(football);
        addFootballCounter = 1;
    }


    if(football && spotLight)
    {
        spotLight.position.set(football.position.x, football.position.y + 2, football.position.z);
        spotLight.target = football;
    }
    


    // Render
    if(cameraControlMode === 0) {
        renderer.render(scene, camera);
       
    } else if(cameraControlMode === 1) {
        renderer.render(scene, camera2);
        if(hackCounter === 0) {
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'w'}));
            document.dispatchEvent(new KeyboardEvent('keyup', {'key': 'w'}));
            hackCounter = 1;
        } else {
            hackCounter = 1;
        }
    }

    // console.log(hackCounter);
    resetGame();
    moveOpponent();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick()