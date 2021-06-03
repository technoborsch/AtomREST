import * as THREE from '../../threejs/build/three.module.js';
import {GLTFLoader} from '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from '../../threejs/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../../threejs/examples/jsm/environments/RoomEnvironment.js';
import SpriteText from "../../three-spritetext/src/index.js";

import { prettify } from "./Utils.js";

//Create six clipping planes for each side of a model
const clipPlanes = [];
[
    [-1, 0, 0], [1, 0, 0],
    [0, -1, 0], [0, 1, 0],
    [0, 0, -1], [0, 0, 1],

].forEach( (array) => {
    this.clipPlanes.push( new THREE.Plane( new THREE.Vector3().fromArray( array ), 0 ) );
} );

//Draw here a little sphere that will guide a viewer during manipulations
const geometry = new THREE.SphereGeometry(1);
const material = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    transparent: true,
    opacity: 0.5,
});
const guideSphere = new THREE.Mesh( geometry, material );

//Set up a renderer here
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.localClippingEnabled = true;

//Set up scene
const scene = new THREE.Scene();
const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.background = new THREE.Color(0xe8f9fc);
scene.environment = pmremGenerator.fromScene(environment).texture;

//Camera settings
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200000);

//Raycaster
const raycaster = new THREE.Raycaster();

//Controls settings
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 1;
controls.maxDistance = 100000;
controls.enablePan = true;
controls.panSpeed = 2;

//Loading manager to define actions after model's load
const loadingManager = new THREE.LoadingManager();

//Loader and decompressor of GLTF/GLB models
const ktx2Loader = new KTX2Loader().setTranscoderPath('../../threejs/examples/js/libs/basis').detectSupport(renderer);
const loader = new GLTFLoader(loadingManager);
loader.setKTX2Loader(ktx2Loader);
loader.setMeshoptDecoder(MeshoptDecoder);


export default class Engine {
    //A graphical engine that works on THREE.js library

    constructor( rootElement ) {
        this.rootElement = rootElement;
        this.clipPlanes = clipPlanes;
        this.model = undefined;
        this.viewPoint = undefined;
        this.guideSphere = guideSphere;
        this.boundBox = new THREE.Box3();
        this.modelCenter = new THREE.Vector3();

        this.renderer = renderer;
        this.rootElement.appendChild( this.renderer.domElement );
        this.camera = camera;
        this.scene = scene;
        this.raycaster = raycaster;

        this.controls = controls;
        this.controls.addEventListener('change', this.render.bind(this));
        this.controls.addEventListener('start', this.showGuideSphere.bind(this));
        this.controls.addEventListener('end', this.hideGuideSphere.bind(this));

        this.loadingManager = loadingManager;
        this.loadingManager.onLoad = this.onModelLoad;
        this.loader = loader;

        window.addEventListener('resize', this.onWindowResize.bind(this));

    }

    onModelLoad() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', (event) => {event.target.remove();});
        this.onWindowResize();
    }

    async loadModel( model ) {
        this.loader.load( model.gltf, ( gltf ) => {

        //traversing of scene - elements can be manipulated here on load
        gltf.scene.traverse((o) => {
            if (o.isMesh) {
                o.material.side = THREE.DoubleSide;
                o.material.clippingPlanes = clipPlanes;
            }
        });

        //set bound box and model center here off the scene to use it later
        this.boundBox.setFromObject(gltf.scene).getCenter(this.modelCenter);

        this.scene.add(gltf.scene);

        },

        //callback on loading process
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        // called when loading has errors
        (error) => { console.log('An error happened' + error); }
        );
    }

    setViewFromViewPoint( point ) {
        this.camera.position.set(point.position[0], point.position[1], point.position[2]);
        this.camera.quaternion.set(point.quaternion[0], point.quaternion[1], point.quaternion[2], point.quaternion[3]);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const target = new THREE.Vector3().copy(this.camera.position);
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;
        }
        target.add(direction.multiplyScalar(distance));
        this.controls.target.set(target.x, target.y, target.z);

        //controlPanel.setClipping(boundBox, clipPlanes, point.clip_constants); TODO move to control panel

        //if (point.description) {
        //    viewpointManager.showDescriptionToast( point.description );
        //}  TODO move to manager

        point.notes.forEach((note) => {
            this.insertNote(note);
        });
        this.controls.update();
    }

    setDefaultView() {
        this.controls.target.set(
            this.modelCenter.x,
            this.modelCenter.y,
            this.modelCenter.z,
        );
        this.camera.position.set(
            this.boundBox.min.x + 2 * (this.boundBox.max.x - this.boundBox.min.x),
            this.boundBox.min.y + 2 * (this.boundBox.max.y - this.boundBox.min.y),
            this.boundBox.min.z + 2 * (this.boundBox.max.z - this.boundBox.min.z),
        );

        //controlPanel.setClipping(boundBox, clipPlanes); TODO Move to control panel

        this.controls.update();
    }

    getFirstIntersectionPosition( x, y ) {
        let intersected;
        const mouse = new THREE.Vector2();

        mouse.x = x;
        mouse.y = y;

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length) {
            intersected = intersects[0]; // TODO add proper logic that takes sectioning into consideration
            return intersected;
        }
    }

    insertNote( noteObject ) {
        const text = prettify( noteObject.text, 20 );
        const note = new SpriteText(text, 400, 'black');
        note.backgroundColor = 'white';
        note.padding = 10;
        note.borderRadius = 10;
        note.position.set( noteObject.position[0], noteObject.position[1], noteObject.position[2] );
        note.material.depthTest = false;
        note.material.transparent = true;
        note.material.opacity = 0.5;
        this.scene.add( note );
        this.render();
    }

    //A method to handle window resizing
    onWindowResize() {
        const main = document.getElementById('main');
        this.renderer.setSize(main.clientWidth, main.clientHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        //if (main.clientWidth < 600) {
        //    controlPanel.gui.close();
        //}  TODO move to GUI
        this.render();
    }

    render() {
        this.placeGuideSphereInTarget();
        renderer.render(scene, camera);
    }

    showGuideSphere() {
        this.scene.add( this.guideSphere );
        this.placeGuideSphereInTarget();
    }

    hideGuideSphere() {
        this.scene.remove( this.guideSphere );
        render();
    }

    placeGuideSphereInTarget() {
        const distance = this.camera.position.distanceTo( this.controls.target );
        const newScale = distance / 100;
        this.guideSphere.scale.x = newScale;
        this.guideSphere.scale.y = newScale;
        this.guideSphere.scale.z = newScale;

        this.guideSphere.position.set( controls.target.x, controls.target.y, controls.target.z );

    }

}