import * as THREE from '../../threejs/build/three.module.js';
import { GUI } from '../../threejs/examples/jsm/libs/dat.gui.module.js';
import { GLTFLoader } from  '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from '../../threejs/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from '../../threejs/examples/jsm/environments/RoomEnvironment.js';

let camera, scene, renderer, controls, environment, pmremGenerator;

// get settings here from DOM which were set by django templates
const settingsElement = document.getElementById('viewer_settings');
const modelURL = settingsElement.getAttribute('model_url');
const projectSlug = settingsElement.getAttribute('project_slug');
const buildingSlug = settingsElement.getAttribute('building_slug');
const viewpointURL = settingsElement.getAttribute('viewpoint_url');

// for GUI
const params = {
    clipIntersection: true,
    planeConstant: 0,
    showHelpers: false
};

const clipPlanes = [
    new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 ),
];

const viewDirection = new THREE.Vector3();
const boundBox = new THREE.Box3();
const modelCenter = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

init();
render();

function init() {

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true;
    settingsElement.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    environment = new RoomEnvironment();
    pmremGenerator = new THREE.PMREMGenerator( renderer );

    scene.background = new THREE.Color( 0xf5f5f5 );
    scene.environment = pmremGenerator.fromScene( environment ).texture;

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 200000 );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.zoomSpeed = 3;
    controls.minDistance = 1;
    controls.maxDistance = 100000;
    controls.enablePan = false;

    // loading manager to define actions after model's load
    const loadingManager = new THREE.LoadingManager( () => {
        const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		loadingScreen.addEventListener( 'transitionend', onTransitionEnd );
		controls.target = modelCenter;
		camera.position.set( boundBox.max.x , boundBox.max.y, boundBox.max.z );
		controls.update();
		onWindowResize();
	});

    //loading and decompressing of GLTF/GLB model
    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath( '../../threejs/examples/js/libs/basis' )
        .detectSupport( renderer );
    const loader = new GLTFLoader( loadingManager );
    loader.setKTX2Loader( ktx2Loader );
    loader.setMeshoptDecoder( MeshoptDecoder );
    loader.load( modelURL, function ( gltf ) {

        //traversing of scene - elements can be manipulated here
        gltf.scene.traverse((o) => {
            if (o.isMesh) {
                o.material.side = THREE.DoubleSide;
                o.material.clippingPlanes = clipPlanes;
            }
        });

        gltf.scene.name = 'GLTF';

        boundBox.setFromObject( gltf.scene ).getCenter( modelCenter );

        // FIXME some fuckery that should be removed by using right controls
        gltf.scene.position.x += ( gltf.scene.position.x - 2 * modelCenter.x );
        gltf.scene.position.y += ( gltf.scene.position.y - 2 * modelCenter.y );
        gltf.scene.position.z += ( gltf.scene.position.z + modelCenter.z );

        scene.add( gltf.scene );

        },

        function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
        console.log('An error happened' + error);
    });

    const gui = new GUI();

    gui.add( params, 'planeConstant', boundBox.min.y, boundBox.max.y )
        .step( 10 )
        .name( 'plane constant' )
        .onChange( function ( value ) {
            for ( let j = 0; j < clipPlanes.length; j ++ ) {
                clipPlanes[ j ].constant = value;
            }
            render();
        });

    gui.close();

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener( 'keydown', onDocumentKeyDown, false);

    window.addEventListener('click', onMouseClick, false);

    window.addEventListener( 'mousemove', onMouseMove, false );

    function onDocumentKeyDown(event) {
        const keyCode = event.which;
        if (keyCode === 32) {
            saveViewPoint( projectSlug, buildingSlug, camera.position, viewDirection );
            console.log(viewDirection);
            console.log(camera.position);
        }
        render();
    }
}

function onWindowResize() {
    const main = document.getElementById('main');
    renderer.setSize( main.clientWidth, main.clientHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    render();
}

function render() {
    renderer.render(scene, camera);
}

function saveViewPoint(project, building, position, direction) {
    let current_position = {
        x: position.x,
        y: position.y,
        z: position.z,
    }
    let current_direction = {
        x: direction.x,
        y: direction.y,
        z: direction.z,
    }
    console.log("saving: " + project + ", " + building + ", " + current_position + ", " + current_direction)
    $.get(
        viewpointURL,
        {
            project: project,
            building: building,
            position: current_position,
            direction: current_direction,
        },
        function (response) {
            console.log(response)
        });
}

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onMouseClick( event ) {
    console.log(scene.children);
    let intersected;
    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects(scene.children[0].children[1].children);
    if (intersects.length > 0) {
        intersected = intersects[0];
	    intersected.object.material.color.set( 0xff0000 );
    }
    render();
}

function onTransitionEnd( event ) {
	const element = event.target;
	element.remove();
}