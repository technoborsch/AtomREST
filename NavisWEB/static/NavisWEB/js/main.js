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
const position_x = parseFloat(settingsElement.getAttribute('position_x'));
const position_y = parseFloat(settingsElement.getAttribute('position_y'));
const position_z = parseFloat(settingsElement.getAttribute('position_z'));
const target_x = parseFloat(settingsElement.getAttribute('target_x'));
const target_y = parseFloat(settingsElement.getAttribute('target_y'));
const target_z = parseFloat(settingsElement.getAttribute('target_z'));
const planeConstant = parseFloat(settingsElement.getAttribute('plane_constant'));

// for GUI
const params = {
    //planeConstantX: 0,
    //planeConstantXNeg: 0,
    planeConstantY: 0,
    //planeConstantYNeg: 0,
    //planeConstantZ: 0,
    //planeConstantZneg: 0,
};

const clipPlanes = [
    new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( -1, 0, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), 0 ),
    //new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 0 ),
];

const boundBox = new THREE.Box3();
const modelCenter = new THREE.Vector3();

//const raycaster = new THREE.Raycaster();
// replace then with faster raycaster
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

    //camera settings
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 200000 );

    //controls settings
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.zoomSpeed = 5;
    controls.panSpeed = 1;
    controls.minDistance = 1;
    controls.maxDistance = 100000;
    controls.enablePan = true;

    // loading manager to define actions after model's load
    const loadingManager = new THREE.LoadingManager( () => {
        const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		loadingScreen.addEventListener( 'transitionend', onTransitionEnd );

		setTarget();
		setPosition();
		setClipping();

		controls.update();
		gui.add( params, 'planeConstantY', boundBox.min.y, boundBox.max.y ).step( 10 )
            .name( 'Сечение сверху' )
            .onChange( function ( value ) {
                clipPlanes[ 0 ].constant = value;
                render();
            });

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

        //set bound box and model center here off the scene to use it later
        boundBox.setFromObject( gltf.scene ).getCenter( modelCenter );

        scene.add( gltf.scene );

        },

        //callback on loading process
        function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
        console.log('An error happened' + error);
    });

    const gui = new GUI();

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener('click', onMouseClick, false);

    document.getElementById('camera').addEventListener('click', onCameraClick);

    //actions on click of camera button
    function onCameraClick() {
        saveViewPoint( projectSlug, buildingSlug, camera.position, controls.target , clipPlanes[0].constant );
    }

    //actions on click on the model
    function onMouseClick( event ) {
    //let intersected;

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    //raycaster.setFromCamera( mouse, camera );
    //const intersects = raycaster.intersectObjects(scene.children, true);
    //if (intersects.length) {
    //    console.log(intersects);
    //    intersected = intersects[0];
    //    intersected.object.material.color.set( 0xff0000 );
    //}
    //render();
    }

    //set the target either to given coordinates or to model center if they aren't presented
    function setTarget() {
        if (target_x && target_y && target_z) {
            controls.target.set(
                target_x,
                target_y,
                target_z
            );
        } else {
            controls.target.set(
                modelCenter.x,
                modelCenter.y,
                modelCenter.z
            );
        }
    }

    //set the target either to given coordinates or to model center if they aren't presented
    function setPosition() {
        if (position_x && position_y && position_z) {
            camera.position.set(
                position_x,
                position_y,
                position_z
            );
        } else {
            camera.position.set(
                2 * boundBox.max.x,
                2 * boundBox.max.y,
                2 * boundBox.max.z,
            );
        }
    }

    //set clipping either to given value or set to default
    function setClipping() {
        if (planeConstant) {
            clipPlanes[0].constant = planeConstant;
            params.planeConstantY = planeConstant;
        } else {
            clipPlanes[0].constant = boundBox.max.y;
            params.planeConstantY = boundBox.max.y;
        }
    }

}

//function to handle window resizing
function onWindowResize() {
    const main = document.getElementById('main');
    renderer.setSize( main.clientWidth, main.clientHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    render();
}

//main function here - render the scene
function render() {
    renderer.render(scene, camera);
}

//this function saves a viewpoint by sending an AJAX request back to server
function saveViewPoint(project, building, position, target, clipConstant) {
    const camera_position = {
        x: position.x,
        y: position.y,
        z: position.z,
    }
    const target_position = {
        x: target.x,
        y: target.y,
        z: target.z,
    }
    $.get(
        viewpointURL,
        {
            project: project,
            building: building,
            position: camera_position,
            target: target_position,
            clipConstant: clipConstant,
        },
        function (response) {
            if (response.status === 'ok') {
                alert('Точка обзора сохранена, ссылка: http://127.0.01:8000' + response.url );
            }
            else {
                alert('Что-то пошло не так');
            }
        });
}

//to remove the loading screen
function onTransitionEnd( event ) {
	const element = event.target;
	element.remove();
}