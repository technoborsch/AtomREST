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
const buildingSlug = settingsElement.getAttribute('building_slug')
const viewpointURL = settingsElement.getAttribute('viewpoint_url');

const params = {
    clipIntersection: true,
    planeConstant: 0,
    showHelpers: false
};

const clipPlanes = [
    new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 ),
];

const xSpeed = 1000; // those speeds can be removed then
const zSpeed = 1000;
const speed = 1000;

const viewDirection = new THREE.Vector3();

init();
render();

function init() {

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    // TODO should get size from container element
    renderer.setSize( window.innerWidth/1.25, window.innerHeight/1.25, false );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true;
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    environment = new RoomEnvironment();
    pmremGenerator = new THREE.PMREMGenerator( renderer );

    scene.background = new THREE.Color( 0xbbbbbb );
    scene.environment = pmremGenerator.fromScene( environment ).texture;

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 200000 );
    camera.position.set( 0, 0, 0 );

    // TODO should try other controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.zoomSpeed = 3;
    controls.minDistance = 1;
    controls.maxDistance = 1000000;
    controls.enablePan = false;

    const group = new THREE.Group();
    const bound_box = new THREE.Box3();

    // loading manager to manage loading screen
    const loadingManager = new THREE.LoadingManager( () => {
        const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		loadingScreen.addEventListener( 'transitionend', onTransitionEnd );
	});

    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath( '../../threejs/examples/js/libs/basis' )
        .detectSupport( renderer );

    const loader = new GLTFLoader( loadingManager );
    loader.setKTX2Loader( ktx2Loader );
    loader.setMeshoptDecoder( MeshoptDecoder );
    loader.load( modelURL, function ( gltf ) {

        gltf.scene.traverse((o) => {
            if (o.isMesh) {
                o.material.side = THREE.DoubleSide;
                o.material.clippingPlanes = clipPlanes;
            }
        });

        const box = new THREE.Box3().setFromObject( gltf.scene );
        const center = box.getCenter( new THREE.Vector3() );

        // FIXME some fuckery that should be removed by using right controls
        gltf.scene.position.x += ( gltf.scene.position.x - 2 * center.x );
        gltf.scene.position.y += ( gltf.scene.position.y - 2 * center.y );
        gltf.scene.position.z += ( gltf.scene.position.z + center.z );

        bound_box.setFromObject(gltf.scene);
        group.add( gltf.scene );

        gui.add( params, 'planeConstant', bound_box.min.y, bound_box.max.y )
            .step( 10 )
            .name( 'plane constant' )
            .onChange( function ( value ) {

                for ( let j = 0; j < clipPlanes.length; j ++ ) {
                    clipPlanes[ j ].constant = value;
                }
                render();
				});

        render();

        },

        function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
        console.log('An error happened' + error);
    });

    scene.add( group );

    const gui = new GUI();

    gui.close();

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener( 'keydown', onDocumentKeyDown, false);

    function onDocumentKeyDown(event) {
        camera.getWorldDirection( viewDirection );
        const xChange = viewDirection.x * speed;
        const yChange = viewDirection.y * speed;
        const zChange = viewDirection.z * speed;

        const keyCode = event.which;
        if (keyCode === 87) {
            group.position.x -= xChange;
            group.position.y -= yChange;
            group.position.z -= zChange;
            clipPlanes[0].constant -= yChange;
        } else if (keyCode === 83) {
            group.position.x += xChange;
            group.position.y += yChange;
            group.position.z += zChange;
            clipPlanes[0].constant += yChange;
        } else if (keyCode === 65) {
            group.position.x -= xSpeed;
        } else if (keyCode === 68) {
            group.position.x += xSpeed;
        } else if (keyCode === 32) {
            saveViewPoint( buildingSlug, group.position, viewDirection );
            console.log(viewDirection);
            console.log(group.position);
        } else if (keyCode === 16) {
            group.position.y -= zSpeed;
            clipPlanes[0].constant -= zSpeed;
        } else if (keyCode === 17) {
            group.position.y += zSpeed;
            clipPlanes[0].constant += zSpeed;
        }
        render();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
}

function render() {
    renderer.render(scene, camera);
}

function saveViewPoint(building, position, direction) {
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
    console.log("saving: " + building + ", " + current_position + ", " + current_direction)
    $.get(
        viewpointURL,
        {
            building: building,
            position: current_position,
            direction: current_direction,
        },
        function (response) {
            console.log(response)
        });
}

function onTransitionEnd( event ) {
	const element = event.target;
	element.remove();
}