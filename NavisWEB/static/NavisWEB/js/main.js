import * as THREE from '../../threejs/build/three.module.js';
import {GUI} from '../../threejs/examples/jsm/libs/dat.gui.module.js';
import {GLTFLoader} from '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from '../../threejs/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../../threejs/examples/jsm/environments/RoomEnvironment.js';
import SpriteText from "../../three-spritetext/src/index.js";

import APIService from "./APIService.js";

let camera, scene, renderer, controls, environment, pmremGenerator;

const apiService = new APIService();

// get settings here from DOM which were set by django templates
const settingsElement = document.getElementById('viewer_settings');
const viewPointToast = new bootstrap.Toast(document.getElementById('viewPointToast'));
const viewPointModal = new bootstrap.Modal(document.getElementById('viewPointModal'));
const noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
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

const gui = new GUI();

const clipPlanes = [
    new THREE.Plane( new THREE.Vector3( -1, 0, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), 0 ),
    new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 0 ),
];

const boundBox = new THREE.Box3();
const modelCenter = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
let isWaitingForNote = false;
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
    controls.panSpeed = 2;

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
    loader.load( model.gltf, ( gltf ) => {

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
        ( xhr ) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        ( error ) => {
        console.log('An error happened' + error);
    });

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener('click', onMouseClick, false);

    document.getElementById('camera').addEventListener('click', onCameraClick, false);

    document.getElementById('note').addEventListener('click', onNoteClick, false);

    document.getElementById('saveViewPoint').addEventListener('click', onSaveViewPointClick);

    document.getElementById('saveNote').addEventListener('click', onSaveNoteClick);

    //actions on click of camera button
    function onCameraClick() {
        viewPointModal.show();
     }

     function onNoteClick() {
        noteModal.show();
     }

     function onSaveViewPointClick() {
        let description = document.getElementById('descriptionInput').value;
         saveViewPoint(model.url, camera, controls, clipPlanes, description)
             .then((savedViewPoint) => {
                 navigator.clipboard.writeText(savedViewPoint.viewer_url)
                     .then(() => {
                         viewPointToast.show();
                     });
             });
     }

     function onSaveNoteClick() {
        setTimeout(() => {isWaitingForNote = true;}, 1);
     }

    //actions on click on the model
    function onMouseClick( event ) {

        let intersected;

        if (isWaitingForNote) {

            mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( ( event.clientY - 36 ) / window.innerHeight ) * 2 + 1;

            raycaster.setFromCamera( mouse, camera );
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length) {
                const text = document.getElementById('noteTextInput').value;
                intersected = intersects[0];
                insertNote( intersected.point, text );
                }
            }
        }

     function insertNote( position, text ) {
        text = prettify( text, 20 );
        const note = new SpriteText(text, 400, 'black');
        note.backgroundColor = 'white';
        note.padding = 10;
        note.borderRadius = 10;
        note.position.set( position.x, position.y, position.z );
        note.material.depthTest = false;
        note.material.transparent = true;
        note.material.opacity = 0.5;
        scene.add( note );
        isWaitingForNote = false;
        render();
     }

    //set the target either to given coordinates or to model center if they aren't presented
    function setViewFromViewPoint(point) {
        camera.position.set( point.position[0], point.position[1], point.position[2] );
        camera.quaternion.set( point.quaternion[0], point.quaternion[1], point.quaternion[2], point.quaternion[3] );
        const direction = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( camera.quaternion ).normalize();
        const target = new THREE.Vector3().copy( camera.position );
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;
        }
        target.add( direction.multiplyScalar( distance ) );
        controls.target.set( target.x, target.y, target.z );

        set_clipping( point.clip_constants );

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
            boundBox.min.x + 2 * ( boundBox.max.x - boundBox.min.x ),
            boundBox.min.y + 2 * ( boundBox.max.y - boundBox.min.y ),
            boundBox.min.z + 2 * ( boundBox.max.z - boundBox.min.z ),
        );

        set_clipping();

        controls.update();
    }

    function set_clipping( clip_constants ) {
        let array;
        if (clip_constants) {
            array = clip_constants;
        } else {
            array = [boundBox.max.x, boundBox.min.x, boundBox.max.y, boundBox.min.y, boundBox.max.z, boundBox.min.z];
        }
        for (let i = 0; i < array.length; i++) {
            clipPlanes[i].constant = (-1)**i * array[i];
            switch (i) {
                case 0: { params.planeConstantX = array[i]; break;}
                case 1: { params.planeConstantXNeg = array[i]; break;}
                case 2: { params.planeConstantY = array[i]; break;}
                case 3: { params.planeConstantYNeg = array[i]; break;}
                case 4: { params.planeConstantZ = array[i]; break;}
                case 5: { params.planeConstantZNeg = array[i]; break;}
                default: { console.log('Some troubles with plane constants') }
            }
        }
    }
}

//function to handle window resizing
function onWindowResize() {
    const main = document.getElementById('main');
    renderer.setSize( main.clientWidth, main.clientHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (main.clientWidth < 600) {
        gui.close();
    }
    render();
}

//main function here - render the scene
function render() {
    renderer.render(scene, camera);
}

//the function saves a viewpoint by calling an API
async function saveViewPoint(model, camera, controls, clipPlanes, description) {
    const distance = camera.position.distanceTo( controls.target );
    const view_point = {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        distance_to_target: distance,
        clip_constants: [
            clipPlanes[0].constant, - clipPlanes[1].constant,
            clipPlanes[2].constant, - clipPlanes[3].constant,
            clipPlanes[4].constant, - clipPlanes[5].constant
        ],
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

//adds spacing to long strings
function prettify (text, maxLength) {
    const space = ' ';
    let wordsArray = text.split(space);
    let stringsArray = [];
    let string = [];
    let lettersCounter = 0;

    wordsArray.forEach(( word ) => {
        lettersCounter += word.length;
        if ( lettersCounter > maxLength ) {
            stringsArray.push( string );
            string = [];
            lettersCounter = word.length;
        }
        string.push( word );
    })
    stringsArray.push( string );
    const joinedStringsArray = []
    stringsArray.forEach(( string ) => {
        joinedStringsArray.push( string.join( space ) );
    })

    return joinedStringsArray.join('\n');
}