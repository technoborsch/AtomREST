import * as THREE from '../../threejs/build/three.module.js';
import {GUI} from '../../threejs/examples/jsm/libs/dat.gui.module.js';
import {GLTFLoader} from '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from '../../threejs/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../../threejs/examples/jsm/environments/RoomEnvironment.js';

import APIService from "./APIService.js";
import ViewpointManager from "./ViewPointsManager.js";

let camera, scene, renderer, controls, environment, pmremGenerator;

// Wrapper to handle API calls
const apiService = new APIService();

const raycaster = new THREE.Raycaster();

//Clip planes
const clipPlanes = [];
[
    [-1, 0, 0], [1, 0, 0],
    [0, -1, 0], [0, 1, 0],
    [0, 0, -1], [0, 0, 1],

].forEach( (array) => {
    clipPlanes.push( new THREE.Plane( new THREE.Vector3().fromArray( array ), 0 ) );
} );

//Control panel with sectioning, notes disabling button and so on
GUI.TEXT_CLOSED = 'Закрыть панель управления';
GUI.TEXT_OPEN = 'Открыть панель управления';

class ControlPanel {
    constructor() {
        this.params = {
            planeConstantX: 0,
            planeConstantXNeg: 0,
            planeConstantY: 0,
            planeConstantYNeg: 0,
            planeConstantZ: 0,
            planeConstantZNeg: 0,
            areNotesShowed: true,
        };
        this.gui = new GUI();
    }

    setControls( boundBox ) {
        //Set all necessary controls off given bound box of a model

        const clipping = this.gui.addFolder('Сечения');
        [
            ['planeConstantY', 'y', 2, 'Сверху'], ['planeConstantYNeg', 'y', 3, 'Снизу'],
            ['planeConstantX', 'x', 0, 'Спереди'], ['planeConstantXNeg', 'x', 1, 'Сзади'],
            ['planeConstantZ', 'z', 4, 'Слева'], ['planeConstantZNeg', 'z', 5, 'Справа'],

        ].forEach( (case_) => {
            clipping.add( this.params, case_[0], boundBox.min[case_[1]], boundBox.max[case_[1]] )
                .step( 10 )
                .name( case_[3] )
                .onChange( (value) => {
                    clipPlanes[case_[2]].constant = (-1) ** case_[2] * value;
                    render();
                } )
        } );

        //Option to hide/show notes
		this.gui.add( this.params, 'areNotesShowed' )
            .name( 'Заметки' )
            .onChange( ( value ) => {
                scene.traverse( (o) => {
                    if (o.isSprite) {
                        o.material.visible = value;
                    }
                } );
                render();
            });

        //To make it appear opened
        clipping.open();

    }

    setClipping( boundBox, clipPlanes, clipConstants ) {
        //Manipulate with clipping planes here
        let array = [boundBox.max.x, boundBox.min.x, boundBox.max.y, boundBox.min.y, boundBox.max.z, boundBox.min.z];
        const paramsArray = [
            'planeConstantX', 'planeConstantXNeg',
            'planeConstantY', 'planeConstantYNeg',
            'planeConstantZ', 'planeConstantZNeg'
        ]
        if (clipConstants) {
            array = clipConstants;
        }
        for (let i = 0; i < array.length; i++) {
            clipPlanes[i].constant = (-1)**i * array[i];
            this.params[paramsArray[i]] = array[i];
        }

    }

}

const controlPanel = new ControlPanel();

// get settings here from DOM which were set by django templates
const settingsElement = document.getElementById('viewer_settings');

const model = await apiService.getModelByPK(settingsElement.getAttribute('model_pk'));
const initialViewPointPK = settingsElement.getAttribute('view_point_pk');
let initialViewPoint;
if (initialViewPointPK) {
    initialViewPoint = await apiService.getViewPointByPK(initialViewPointPK);
}

const geometry = new THREE.SphereGeometry(1);
const material = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    transparent: true,
    opacity: 0.5,
});

const guideSphere = new THREE.Mesh( geometry, material );

const boundBox = new THREE.Box3();
const modelCenter = new THREE.Vector3();

init();

function init() {

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true;
    settingsElement.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    environment = new RoomEnvironment();
    pmremGenerator = new THREE.PMREMGenerator(renderer);

    scene.background = new THREE.Color(0xe8f9fc);
    scene.environment = pmremGenerator.fromScene(environment).texture;

    //camera settings
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200000);

    //controls settings
    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.addEventListener('start', showGuideSphere);
    controls.addEventListener('end', hideGuideSphere);
    controls.minDistance = 1;
    controls.maxDistance = 100000;
    controls.enablePan = true;
    controls.panSpeed = 2;

    // loading manager to define actions after model's load
    const loadingManager = new THREE.LoadingManager(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', onTransitionEnd);

        //set view here either to given view point or to default
        if (initialViewPoint) {
            setViewFromViewPoint(initialViewPoint);
        } else {
            setDefaultView();
        }

        controlPanel.setControls(boundBox);

        onWindowResize();
    });

    //loading and decompressing of GLTF/GLB model
    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('../../threejs/examples/js/libs/basis')
        .detectSupport(renderer);
    const loader = new GLTFLoader(loadingManager);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(model.gltf, (gltf) => {

            //traversing of scene - elements can be manipulated here on load
            gltf.scene.traverse((o) => {
                if (o.isMesh) {
                    o.material.side = THREE.DoubleSide;
                    o.material.clippingPlanes = clipPlanes;
                }
            });

            //set bound box and model center here off the scene to use it later
            boundBox.setFromObject(gltf.scene).getCenter(modelCenter);

            scene.add(gltf.scene);

        },

        //callback on loading process
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        (error) => {
            console.log('An error happened' + error);
        });

    window.addEventListener('resize', onWindowResize);

    //set the target either to given coordinates or to model center if they aren't presented
    function setViewFromViewPoint(point) {
        camera.position.set(point.position[0], point.position[1], point.position[2]);
        camera.quaternion.set(point.quaternion[0], point.quaternion[1], point.quaternion[2], point.quaternion[3]);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        const target = new THREE.Vector3().copy(camera.position);
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;
        }
        target.add(direction.multiplyScalar(distance));
        controls.target.set(target.x, target.y, target.z);

        controlPanel.setClipping(boundBox, clipPlanes, point.clip_constants);

        if (point.description) {
            viewpointManager.showDescriptionToast( point.description );
        }

        point.notes.forEach((url) => {
            apiService.getObject(url).then((note) => {
                viewpointManager.insertNote(note);
            });
        });
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
            boundBox.min.x + 2 * (boundBox.max.x - boundBox.min.x),
            boundBox.min.y + 2 * (boundBox.max.y - boundBox.min.y),
            boundBox.min.z + 2 * (boundBox.max.z - boundBox.min.z),
        );

        controlPanel.setClipping(boundBox, clipPlanes);

        controls.update();
    }

    function showGuideSphere() {
        scene.add(guideSphere);
        placeGuideSphereInTarget(camera, controls, guideSphere);
    }

    function hideGuideSphere() {
        scene.remove(guideSphere);
        render();
    }

    //function to handle window resizing
    function onWindowResize() {
        const main = document.getElementById('main');
        renderer.setSize(main.clientWidth, main.clientHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        if (main.clientWidth < 600) {
            controlPanel.gui.close();
        }
        render();
    }
}

//main function here - render the scene
function render() {
    placeGuideSphereInTarget(camera, controls, guideSphere);
    renderer.render(scene, camera);
}

function placeGuideSphereInTarget(camera, controls, guideSphere) {
    const distance = camera.position.distanceTo( controls.target );
    const newScale = distance / 100;
    guideSphere.scale.x = newScale;
    guideSphere.scale.y = newScale;
    guideSphere.scale.z = newScale;

    guideSphere.position.set( controls.target.x, controls.target.y, controls.target.z );

}

//This binding should be after init(); this is temporary. TODO
apiService.model = model;
apiService.camera = camera;
apiService.controls = controls;
apiService.clipPlanes = clipPlanes;


//Initialise viewpoint manager here and bind it to the interface
const viewpointManager = new ViewpointManager(
    new bootstrap.Modal(document.getElementById('viewPointModal')),
    document.getElementById('cancelViewPoint'),
    document.getElementById('saveViewPoint'),
    document.getElementById('camera'),
    document.getElementById('descriptionInput'),
    document.getElementById( 'notesInsideModal' ),
    new bootstrap.Modal(document.getElementById('noteModal')),
    document.getElementById('saveNote'),
    document.getElementById('note'),
    document.getElementById('noteTextInput'),
    new bootstrap.Toast(document.getElementById('viewPointToast')),
    new bootstrap.Toast(document.getElementById('viewPointDescriptionToast')),
    document.getElementById('descriptionText'),
    apiService,
    scene,
    camera,
    raycaster,
    render
);

//to remove loading screen on load
function onTransitionEnd( event ) {
	const element = event.target;
	element.remove();
}