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
    clipPlanes.push( new THREE.Plane( new THREE.Vector3().fromArray( array ), 0 ) );
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
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
});
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

const loader = new GLTFLoader(loadingManager);

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
        this.loader = loader;

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    loadModel( model ) {
        // Loads given model object
        this.model = model;
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('../../threejs/examples/js/libs/basis')
            .detectSupport(this.renderer);
        this.loader.setKTX2Loader(ktx2Loader);
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.loader.load( model.gltf, ( gltf ) => {

        gltf.scene.traverse((o) => { // Walk through all elements of scene
            if (o.isMesh) {
                o.material.side = THREE.DoubleSide; // Or it will look unnatural
                o.material.clippingPlanes = this.clipPlanes; // Assign clip planes to each mesh material
            }
        });

        // Set bound box and model center here off the scene to use it later
        this.boundBox.setFromObject(gltf.scene).getCenter(this.modelCenter);
        this.scene.add( gltf.scene );
        },

        // Callback on loading process
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        // Called when loading has errors
        (error) => { console.log('An error happened' + error); }
        );
    }

    setViewFromViewPoint( point ) {
        // It sets view off given point object. Note that it doesn't set clipping, so clipping should be set separately
        this.viewPoint = point;
        this.camera.position.set(point.position[0], point.position[1], point.position[2]);
        this.camera.quaternion.set(point.quaternion[0], point.quaternion[1], point.quaternion[2], point.quaternion[3]);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const target = new THREE.Vector3().copy(this.camera.position);
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;  // Default distance to target. TODO move to constructor
        }
        target.add(direction.multiplyScalar(distance));
        this.controls.target.set(target.x, target.y, target.z);

        for (let i=0; i<point.notes.length; i++) {
            this.insertNote(point.notes[i], i.toString())
        }
        this.controls.update();
    }

    setDefaultView() {
        // It sets default view depending on loaded model
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

        this.controls.update();
    }

    async getFirstIntersectionPosition( event ) {
        // Async function that returns first intersection point, taking into consideration current clipping.
        const clipPlanes = this.clipPlanes;
        const mouse = new THREE.Vector2();

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( ( event.clientY - 36 ) / window.innerHeight ) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length) {
            for ( let i = 0; i < intersects.length; i++ ) {
                const point = intersects[i].point;
                if (
                    (clipPlanes[0].constant > point.x) && ( point.x > -clipPlanes[1].constant)
                    && (clipPlanes[2].constant > point.y) && (point.y > -clipPlanes[3].constant)
                    && (clipPlanes[4].constant > point.z) && (point.z > -clipPlanes[5].constant)
                ) {
                    return point //TODO should not react to sprites
                }
            }
        }
    }

    getCurrentViewPoint() {
        //Returns a view point with empty description
        const distance = this.camera.position.distanceTo( this.controls.target );
        return {
            position: this.camera.position.toArray(),
            quaternion: this.camera.quaternion.toArray(),
            distance_to_target: distance,
            clip_constants: [
                this.clipPlanes[0].constant, -this.clipPlanes[1].constant,
                this.clipPlanes[2].constant, -this.clipPlanes[3].constant,
                this.clipPlanes[4].constant, -this.clipPlanes[5].constant
            ],
            model: this.model.url,
            description: null,
        }
    }

    insertNote( noteObject, name ) {
        // Creates and inserts a note to a model
        const text = prettify( noteObject.text, 20 );
        const note = new SpriteText(text, 400, 'black');
        note.backgroundColor = 'white';
        note.padding = 10;
        note.borderRadius = 10;
        if (name) { // If a name wasn't passed, leave it empty.
            note.name = name;
        }
        note.position.set( noteObject.position[0], noteObject.position[1], noteObject.position[2] );
        note.material.depthTest = false; // To be visible through walls
        note.material.transparent = true;
        note.material.opacity = 0.5;
        this.scene.add( note );
        this.render();
    }

    onWindowResize() {
        // A method to handle window resizing
        const main = document.getElementById('main');
        this.renderer.setSize( main.clientWidth, main.clientHeight );
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.render();
    }

    render() {
        // A method called to render current scene to canvas
        this.placeGuideSphereInTarget();
        this.renderer.render( this.scene, this.camera );
    }

    showGuideSphere() {
        // Show little guide sphere in controls target
        this.scene.add( this.guideSphere );
        this.placeGuideSphereInTarget();
    }

    hideGuideSphere() {
        // Hide guide sphere
        this.scene.remove( this.guideSphere );
        this.render();
    }

    placeGuideSphereInTarget() {
        // This method should be called to place guide sphere in current controls target
        const distance = this.camera.position.distanceTo(this.controls.target);
        const newScale = distance / 100; // Scale of the sphere
        this.guideSphere.scale.x = newScale;
        this.guideSphere.scale.y = newScale;
        this.guideSphere.scale.z = newScale;
        this.guideSphere.position.set(controls.target.x, controls.target.y, controls.target.z);
    }
}