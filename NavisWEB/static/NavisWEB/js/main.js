import * as THREE from '../../threejs/build/three.module.js';
import { GUI } from '../../threejs/examples/jsm/libs/dat.gui.module.js';
import { GLTFLoader } from  '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from '../../threejs/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from '../../threejs/examples/jsm/environments/RoomEnvironment.js';
//import { MeshBVH, acceleratedRaycast } from "../../three-mesh-bvh/src/index.js";

//THREE.Mesh.prototype.raycast = acceleratedRaycast;

import APIService from "./APIService.js";

let camera, scene, renderer, controls, environment, pmremGenerator;

const apiService = new APIService();

// get settings here from DOM which were set by django templates
const settingsElement = document.getElementById('viewer_settings');
const viewPointToast = new bootstrap.Toast(document.getElementById('viewPointToast'));
const viewPointModal = new bootstrap.Modal(document.getElementById('viewPointModal'));
const viewPointDescriptionToast = new bootstrap.Toast(document.getElementById('viewPointDescriptionToast'));
const descriptionText = document.getElementById('descriptionText');

const model = await apiService.getModelByPK(settingsElement.getAttribute('model_pk'));
const initialViewPointPK = settingsElement.getAttribute('view_point_pk');
let initialViewPoint;
if (initialViewPointPK) {
    initialViewPoint = await apiService.getViewPointByPK(initialViewPointPK);
}

// for GUI
const params = {
    planeConstantX: 0,
    planeConstantXNeg: 0,
    planeConstantY: 0,
    planeConstantYNeg: 0,
    planeConstantZ: 0,
    planeConstantZNeg: 0,
};

GUI.TEXT_CLOSED = 'Закрыть панель управления';
GUI.TEXT_OPEN = 'Открыть панель управления';

const clipPlanes = [
    new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( -1, 0, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 0 ),
];

const boundBox = new THREE.Box3();
const modelCenter = new THREE.Vector3();

//const raycaster = new THREE.Raycaster();
//raycaster.firstHitOnly = true;
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

    scene.background = new THREE.Color( 0xe8f9fc );
    scene.environment = pmremGenerator.fromScene( environment ).texture;

    //camera settings
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 200000 );

    //controls settings
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.minDistance = 1;
    controls.maxDistance = 100000;
    controls.enablePan = true;
    controls.panSpeed =2;

    // loading manager to define actions after model's load
    const loadingManager = new THREE.LoadingManager( () => {
        const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		loadingScreen.addEventListener( 'transitionend', onTransitionEnd );

		//set view here either to given view point or to default
		if (initialViewPoint) {
		    setViewFromViewPoint(initialViewPoint);
        } else {
		    setDefaultView();
        }

		const clipping = gui.addFolder('Сечения');

		clipping.add( params, 'planeConstantY', boundBox.min.y, boundBox.max.y ).step( 10 )
            .name( 'Сверху' )
            .onChange( function ( value ) {
                clipPlanes[ 0 ].constant = value;
                render();
            });

		clipping.add( params, 'planeConstantYNeg', boundBox.min.y, boundBox.max.y ).step( 10 )
            .name( 'Снизу' )
            .onChange( function ( value ) {
                clipPlanes[ 1 ].constant = - value;
                render();
            });

		clipping.add( params, 'planeConstantX', boundBox.min.x, boundBox.max.x ).step( 10 )
            .name( 'Спереди' )
            .onChange( function ( value ) {
                clipPlanes[ 2 ].constant = value;
                render();
            });

		clipping.add( params, 'planeConstantXNeg', boundBox.min.x, boundBox.max.x ).step( 10 )
            .name( 'Сзади' )
            .onChange( function ( value ) {
                clipPlanes[ 3 ].constant = - value;
                render();
            });

		clipping.add( params, 'planeConstantZ', boundBox.min.z, boundBox.max.z ).step( 10 )
            .name( 'Слева' )
            .onChange( function ( value ) {
                clipPlanes[ 4 ].constant = value;
                render();
            });

		clipping.add( params, 'planeConstantZNeg', boundBox.min.z, boundBox.max.z ).step( 10 )
            .name( 'Справа' )
            .onChange( function ( value ) {
                clipPlanes[ 5 ].constant = - value;
                render();
            });
        clipping.open();
		onWindowResize();
	});

    //loading and decompressing of GLTF/GLB model
    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath( '../../threejs/examples/js/libs/basis' )
        .detectSupport( renderer );
    const loader = new GLTFLoader( loadingManager );
    loader.setKTX2Loader( ktx2Loader );
    loader.setMeshoptDecoder( MeshoptDecoder );
    loader.load( model.gltf, function ( gltf ) {

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

    document.getElementById('saveViewPoint').addEventListener('click', onSaveViewPointClick);

    //actions on click of camera button
    function onCameraClick() {
        viewPointModal.show();
     }

     function onSaveViewPointClick() {
        const description = document.getElementById('descriptionInput').value;
         saveViewPoint(model.url, camera.position, controls.target, clipPlanes, description)
             .then((savedViewPoint) => {
                 navigator.clipboard.writeText(savedViewPoint.viewer_url)
                     .then(() => {
                         viewPointToast.show();
                     });
             });
     }

    //actions on click on the model
    function onMouseClick( event ) {
    //let intersected;

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	//raycaster.setFromCamera( mouse, camera );
    //const intersects = raycaster.intersectObjects(scene.children, true);
    //console.dir(scene);
    //if (intersects.length) {
    //    console.log(intersects);
    //    intersected = intersects[0];
    //    }
    //render();
    }

    //set the target either to given coordinates or to model center if they aren't presented
    function setViewFromViewPoint(point) {
        controls.target.set(
            point.target_x,
            point.target_y,
            point.target_z
        );
        camera.position.set(
            point.position_x,
            point.position_y,
            point.position_z,
        );
        clipPlanes[0].constant = point.clip_constant_y;
        params.planeConstantY = point.clip_constant_y;
        clipPlanes[1].constant = - point.clip_constant_y_neg;
        params.planeConstantYNeg = point.clip_constant_y_neg;
        clipPlanes[2].constant = point.clip_constant_x;
        params.planeConstantX = point.clip_constant_x;
        clipPlanes[3].constant = - point.clip_constant_x_neg;
        params.planeConstantXNeg = point.clip_constant_x_neg;
        clipPlanes[4].constant = point.clip_constant_z;
        params.planeConstantZ = point.clip_constant_z;
        clipPlanes[5].constant = - point.clip_constant_z_neg;
        params.planeConstantZNeg = point.clip_constant_z_neg;

        if (point.description) {
            descriptionText.innerText = point.description;
            viewPointDescriptionToast.show();
        }

        controls.update();
    }

    //set the view to default point
    function setDefaultView() {
        controls.target.set(
            modelCenter.x,
            modelCenter.y,
            modelCenter.z,
        );
        camera.position.set(
            2 * boundBox.max.x,
            2 * boundBox.max.y,
            2 * boundBox.max.z,
        );
        clipPlanes[0].constant = boundBox.max.y;
        params.planeConstantY = boundBox.max.y;
        clipPlanes[1].constant = - boundBox.min.y;
        params.planeConstantYNeg = boundBox.min.y;
        clipPlanes[2].constant = boundBox.max.x;
        params.planeConstantX = boundBox.max.x;
        clipPlanes[3].constant = - boundBox.min.x;
        params.planeConstantXNeg = boundBox.min.x;
        clipPlanes[4].constant = boundBox.max.z;
        params.planeConstantZ = boundBox.max.z;
        clipPlanes[5].constant = - boundBox.min.z;
        params.planeConstantZNeg = boundBox.min.z;

        controls.update();
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

//the function saves a viewpoint by calling an API
async function saveViewPoint(model, position, target, clipPlanes, description) {
    const view_point = {
        position_x: position.x,
        position_y: position.y,
        position_z: position.z,
        target_x: target.x,
        target_y: target.y,
        target_z: target.z,
        clip_constant_y: clipPlanes[0].constant,
        clip_constant_y_neg: - clipPlanes[1].constant,
        clip_constant_x: clipPlanes[2].constant,
        clip_constant_x_neg: - clipPlanes[3].constant,
        clip_constant_z: clipPlanes[4].constant,
        clip_constant_z_neg:  - clipPlanes[5].constant,
        model: model,
        description: description,
    }
    return await apiService.addViewPoint(view_point);
}

//to remove loading screen on load
function onTransitionEnd( event ) {
	const element = event.target;
	element.remove();
}