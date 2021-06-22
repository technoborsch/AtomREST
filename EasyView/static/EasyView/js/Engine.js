import * as THREE from '../../threejs/build/three.module.js';
import {GLTFLoader} from '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from '../../threejs/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../../threejs/examples/jsm/environments/RoomEnvironment.js';
import SpriteText from "../../three-spritetext/src/index.js";

import {prettify} from "./Utils.js";

// Create six clipping planes for each side of a model
const clipPlanes = [];
[
    [0, -1, 0], [0, 1, 0],
    [0, 0, -1], [0, 0, 1],
    [-1, 0, 0], [1, 0, 0],

].forEach( (array) => {
    clipPlanes.push( new THREE.Plane( new THREE.Vector3().fromArray( array ), 0 ) );
} );

// Draw here a little sphere that will guide a viewer during manipulations
const geometry = new THREE.SphereGeometry(1);
const material = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    transparent: true,
    opacity: 0.5,
});
const guideSphere = new THREE.Mesh( geometry, material );

// Set up a renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.localClippingEnabled = true;

// Set up a scene
const scene = new THREE.Scene();
const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.background = new THREE.Color(0xe8f9fc);
scene.environment = pmremGenerator.fromScene(environment).texture;

// Camera settings
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 200, 2000000);

// Raycaster
const raycaster = new THREE.Raycaster();

// Controls settings
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 10;
controls.maxDistance = 100000;
controls.enablePan = true;
controls.panSpeed = 2;

// Loading manager to define actions after model's load
const loadingManager = new THREE.LoadingManager();

const loader = new GLTFLoader(loadingManager);

/**
 * A graphical engine that works on THREE.js library.
 */
export default class Engine {
    /**
     * @param {Element} rootElement Canvas of the engine will be appended as a child to this element.
     * @property { Model } model Current loaded model.
     * @property { ViewPoint } viewPoint Current view point.
     */

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

    /**
     * Method that loads given Model object into current scene.
     *
     * @param { Model } model Model that should be loaded.
     */
    loadModel( model ) {
        this.model = model;
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('../../threejs/examples/js/libs/basis')
            .detectSupport(this.renderer);
        this.loader.setKTX2Loader(ktx2Loader);
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.loader.load( model.gltf, ( gltf ) => {

        gltf.scene.traverse((o) => { // Walk through all elements of scene
            if (o.isMesh) {
                if ( ( o.material.color.r >= 0.64 && o.material.color.r <= 0.65 )
                    && ( o.material.color.g >= 0.819 && o.material.color.g <= 0.82 )
                    && ( o.material.color.b >= 0.99 && o.material.color.b <= 1 )
                ) {
                    o.material.visible = false; // These are inner room spaces - hide them to avoid z-fighting.
                }
                else {
                    o.material.roughness = 0.75;
                    o.material.side = THREE.DoubleSide; // Or it will look unnatural.
                    o.material.clippingPlanes = this.clipPlanes; // Assign current clip planes to each mesh material.
                }
            }
        });

        // Set bound box and model center here off the scene to use it later.
        this.boundBox.setFromObject(gltf.scene).getCenter(this.modelCenter);
        this.scene.add( gltf.scene );
        },

        // Callback on loading process.
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        // Called when loading has errors.
        (error) => { console.log('An error happened' + error); }
        );
    }

    /**
     * Method that sets current view to a given view point - position, rotation. TODO should also set clipping.
     *
     * @param { ViewPoint } point Viewpoint that should be set.
     */
    setViewFromViewPoint( point ) {
        this.viewPoint = point;
        this.camera.position.set(point.position[0], point.position[2], (-1 * point.position[1]) );
        const quaternion = this.convertFromNWQuaternionToLocal( new THREE.Quaternion().fromArray(point.quaternion) );
        this.camera.quaternion.set( quaternion.x, quaternion.y, quaternion.z, quaternion.w );
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const target = new THREE.Vector3().copy(this.camera.position);
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;  // Default distance to target. TODO move to constructor?
        }
        target.add(direction.multiplyScalar(distance));
        this.controls.target.set(target.x, target.y, target.z);

        for (let i=0; i < point.notes.length; i++) {
            if (point.notes[i]) {
                this.insertNote(point.notes[i], this.viewPoint.pk + '_' + i.toString());
            }
        }
        this.controls.update();
    }

    /**
     * Method used to set default view of a model. By default, it sets view with position on a diagonal vector
     * multiplied by 2, looks on a model center.
     */
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

    /**
     * Method used to catch intersection position via ray casting. It catches click of a user and returns first
     * intersection, taking into consideration current clipping.
     *
     * @param { Object } event Generated click event.
     * @return {Promise<THREE.Vector3>} Promise that is fulfilled with position of first intersection as THREE.Vector3
     * if it gets intersection. May take several clicks.
     */
    async getFirstIntersectionPosition( event ) {
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
                    (clipPlanes[4].constant > point.x) && ( point.x > -clipPlanes[5].constant)
                    && (clipPlanes[0].constant > point.y) && (point.y > -clipPlanes[1].constant)
                    && (clipPlanes[2].constant > point.z) && (point.z > -clipPlanes[3].constant)
                ) {
                    return point //TODO should not react to sprites
                }
            }
        }
    }

    /**
     * Method used to return current view point. Note that it has empty description.
     *
     * @return { ViewPoint } Current view point.
     */
    getCurrentViewPoint() {
        const distance = this.camera.position.distanceTo( this.controls.target );
        const quaternion = this.getNWCameraQuaternion();
        const position = [ this.camera.position.x, -this.camera.position.z, this.camera.position.y ];
        return {
            position: position,
            quaternion: quaternion.toArray(),
            distance_to_target: distance,
            clip_constants_status: [        // In this order to synchronise with Navisworks
                this.clipPlanes[0].constant !== this.boundBox.max.y,
                -this.clipPlanes[1].constant !== this.boundBox.min.y,
                this.clipPlanes[2].constant !== this.boundBox.max.z,
                -this.clipPlanes[3].constant !== this.boundBox.min.z,
                -this.clipPlanes[4].constant !== this.boundBox.min.x,
                this.clipPlanes[5].constant !== this.boundBox.max.x,
            ],
            clip_constants: [               // In this order to synchronise with Navisworks
                -this.clipPlanes[0].constant, -this.clipPlanes[1].constant,
                -this.clipPlanes[2].constant, -this.clipPlanes[3].constant,
                -this.clipPlanes[5].constant, -this.clipPlanes[4].constant,
            ],
            model: this.model.url,
            description: null,
            pk: undefined,
            url: undefined,
            viewer_url: undefined,
            creation_time: undefined,
            notes: undefined,
        }
    }

    /**
     * Method used to calculate camera quaternion that fits in Navisworks coordinate system.
     *
     * @returns { THREE.Quaternion } quaternion suitable for NW.
     */
    getNWCameraQuaternion () {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        const newDirection = new THREE.Vector3( direction.x, - direction.z, direction.y );
        const mx = new THREE.Matrix4().lookAt(
            new THREE.Vector3(),
            newDirection,
            new THREE.Vector3(0, 0, 1),
        );
        return new THREE.Quaternion().setFromRotationMatrix(mx);
    }

    /**
     * Method that used to convert given quaternion used in Navisworks to a quaternion that will fit here.
     * Includes math and black magic.
     *
     * @param { THREE.Quaternion } nw_quaternion Quaternion used in Navisworks
     * @return { THREE.Quaternion } Quaternion that is suitable here
     */
    convertFromNWQuaternionToLocal ( nw_quaternion ) {
        const directionVector = new THREE.Vector3(0,0, -1);
        directionVector.applyQuaternion(nw_quaternion);
        const newDirectionVector = new THREE.Vector3(
            directionVector.x, directionVector.z, - directionVector.y
        );
        const mx = new THREE.Matrix4().lookAt(
            new THREE.Vector3(),
            newDirectionVector,
            new THREE.Vector3(0, 1, 0)
        );
        return new THREE.Quaternion().setFromRotationMatrix(mx);
    }

    /**
     * Inserts note object to current scene. It is a sprite with given text.
     *
     * @param { Note } noteObject Note that should be inserted.
     * @param { String } name Name of the note inside a scene. Should be unique.
     */
    insertNote( noteObject, name ) {
        const text = prettify( noteObject.text, 20 );
        const note = new SpriteText(text, 400, 'black');
        note.backgroundColor = 'white';
        note.padding = 10;
        note.borderRadius = 10;
        if (name) { // If a name wasn't passed, leave it empty. TODO Name must be always passed.
            note.name = name;
        }
        note.position.set( noteObject.position[0], noteObject.position[1], noteObject.position[2] );
        note.material.depthTest = false; // To be visible through walls
        note.material.transparent = true;
        note.material.opacity = 0.5;
        this.scene.add( note );
        this.render();
    }

    /**
     * Method used to remove a note from the scene by its name.
     *
     * @param { String } noteName Name of note that should be deleted.
     */
    removeNote( noteName ) {
        const note = this.scene.getObjectByName( noteName );
        this.scene.remove( note );
    }

    /**
     * Standard method for Three.js which handles window resizing.
     */
    onWindowResize() {
        const main = document.getElementById('main');
        this.renderer.setSize( main.clientWidth, main.clientHeight );
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.render();
    }

    /**
     * Standard method for Three.js which is called each time when a model should be rendered.
     */
    render() {
        this.placeGuideSphereInTarget();
        this.renderer.render( this.scene, this.camera );
    }

    //TODO Those methods should be encapsulated in a GuideSphere class.
    /**
     * Method used to show little guide sphere in a current target of controls.
     */
    showGuideSphere() {
        this.scene.add( this.guideSphere );
        this.placeGuideSphereInTarget();
    }

    /**
     * Hides guide sphere
     */
    hideGuideSphere() {
        this.scene.remove( this.guideSphere );
        this.render();
    }

    /**
     * Method that places guide sphere in current target. Should be called each time when target moves.
     */
    placeGuideSphereInTarget() {
        const distance = this.camera.position.distanceTo(this.controls.target);
        const newScale = distance / 100; // Scale of the sphere
        this.guideSphere.scale.x = newScale;
        this.guideSphere.scale.y = newScale;
        this.guideSphere.scale.z = newScale;
        this.guideSphere.position.set(controls.target.x, controls.target.y, controls.target.z);
    }
}