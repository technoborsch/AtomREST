import * as THREE from '../../threejs/build/three.module.js';
import {GLTFLoader} from '../../threejs/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from '../../threejs/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from '../../threejs/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from '../../threejs/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from '../../threejs/examples/jsm/environments/RoomEnvironment.js';
import SpriteText from "../../three-spritetext/src/index.js";

import ControlPanel from "./ControlPanel.js";
import {prettify} from "./Utils.js";

/**
 * A graphical engine that works on THREE.js library.
 */
export default class Engine {
    /**
     * @param {Element} rootElement Canvas of the engine will be appended as a child to this element.
     * @param { Number } defaultFOV Default camera FOV.
     * @param { Number } initialDistance Distance from upper bound box corner, proportional to main bound box diagonal
     * length, at which camera will appear by default.
     * @property { Model } model Current loaded model.
     * @property { ViewPoint } viewPoint Current view point.
     */
    constructor( rootElement, defaultFOV = 60, initialDistance = 0.2 ) {

        // Create six clipping planes for each side of a model
        this.clipPlanes = [];
        [
            [0, -1, 0], [0, 1, 0],
            [0, 0, -1], [0, 0, 1],
            [-1, 0, 0], [1, 0, 0],

        ].forEach( (array) => {
            this.clipPlanes.push( new THREE.Plane( new THREE.Vector3().fromArray( array ), 0 ) );
        } );

        // Set up a renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            logarithmicDepthBuffer: true,
        });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.localClippingEnabled = true;

        // Set up a scene
        this.scene = new THREE.Scene();
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.background = new THREE.Color(0xe8f9fc);
        this.scene.environment = pmremGenerator.fromScene(environment).texture;

        // Camera settings
        this.camera = new THREE.PerspectiveCamera(
            defaultFOV,
            window.innerWidth / window.innerHeight,
            200,   //FIXME hardcoded, move to constructor as default values
            2000000);

        // Raycaster
        this.raycaster = new THREE.Raycaster();

        // Controls settings
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.minDistance = 100;
        this.controls.maxDistance = 100000;
        this.controls.zoomSpeed = 1.2; //FIXME hardcoded, move to constructor as default values
        this.controls.panSpeed = 2;
        this.controls.keyPanSpeed = 150;

        // Loading manager to define actions after model's load
        this.loadingManager = new THREE.LoadingManager();
        this.loader = new GLTFLoader(this.loadingManager);

        this.rootElement = rootElement;
        this.model = undefined;
        this.viewPoint = undefined;

        this.boundBox = new THREE.Box3();
        this.modelCenter = new THREE.Vector3();

        this.rootElement.appendChild( this.renderer.domElement );
        this.defaultFOV = defaultFOV;
        this.initialDistance = initialDistance;

        this.controls.addEventListener('change', this.render.bind(this));
        this.controls.listenToKeyEvents( window );

        this.controlPanel = new ControlPanel(this);

        this.guideSphere = new GuideSphere(this);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Method that loads current model into current scene.
     *
     */
    loadModel() {
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('../../threejs/examples/js/libs/basis')
            .detectSupport(this.renderer);
        this.loader.setKTX2Loader(ktx2Loader);
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        this.loader.load( this.model.gltf, ( gltf ) => {

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
     * Method that sets current view to a given view point - position, rotation. Note that it doesn't set clipping.
     *
     * @param { ViewPoint } point Viewpoint that should be set.
     */
    setViewFromViewPoint( point ) {
        this.controlPanel.setClipping( point );
        this.viewPoint = point;
        this.camera.position.set(point.position[0], point.position[2], - point.position[1] );
        const quaternion = this.convertFromNWQuaternionToLocal( new THREE.Quaternion().fromArray(point.quaternion) );
        this.camera.quaternion.set( quaternion.x, quaternion.y, quaternion.z, quaternion.w );
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        const target = new THREE.Vector3().copy(this.camera.position);
        let distance = point.distance_to_target;
        if (!distance) {
            distance = 2000;  // Default distance to target.  TODO move to constructor
        }
        target.add( direction.multiplyScalar( distance ) );
        this.controls.target.set( ...target.toArray() );
        this.renderNotes( point );
        this.setFOV( point.fov ); // Render's being triggered here
        this.controls.update();
    }

    /**
     * Method used to insert all notes of a view point
     * @param { ViewPoint } point View point which notes should be rendered.
     */
    renderNotes( point ) {
        for (let i=0; i < point.notes.length; i++) {
            if (point.notes[i]) {
                this.insertNote(point.notes[i], this.viewPoint.pk + '_' + i.toString());
            }
        }
    }

    /**
     * Method used to set default view of a model. By default, it sets view with position on a diagonal vector
     * multiplied by (1 + initialDistance), looks on a model center.
     */
    setDefaultView() {
        // It sets default view depending on loaded model
        this.controlPanel.setClipping();
        this.controls.target.set( ...this.modelCenter.toArray() );
        const multiplier = 1 + this.initialDistance;
        this.camera.position.set(
            this.boundBox.min.x + multiplier * (this.boundBox.max.x - this.boundBox.min.x), //TODO simplify
            this.boundBox.min.y + multiplier * (this.boundBox.max.y - this.boundBox.min.y),
            this.boundBox.min.z + multiplier * (this.boundBox.max.z - this.boundBox.min.z),
        );
        this.setFOV(); // Render's being triggered here
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
        mouse.y = - ( (event.clientY - 73) / (window.innerHeight - 73) ) * 2 + 1; //FIXME wrong coordinate picking

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length) {
            for ( let i = 0; i < intersects.length; i++ ) {
                const point = intersects[i].point;
                if (
                    intersects[i].object.isMesh &&  // avoid sprites
                    (clipPlanes[4].constant > point.x) && ( point.x > -clipPlanes[5].constant)
                    && (clipPlanes[0].constant > point.y) && (point.y > -clipPlanes[1].constant)
                    && (clipPlanes[2].constant > point.z) && (point.z > -clipPlanes[3].constant)
                ) {
                    return point;
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
            fov: this.camera.fov,
            distance_to_target: distance,
            clip_constants_status: [        // In this order to synchronise with Navisworks
                this.clipPlanes[0].constant !== this.boundBox.max.y,
                this.clipPlanes[1].constant !== - this.boundBox.min.y,
                this.clipPlanes[2].constant !== this.boundBox.max.z,
                this.clipPlanes[3].constant !== - this.boundBox.min.z,
                this.clipPlanes[4].constant !== - this.boundBox.min.x,
                this.clipPlanes[5].constant !== this.boundBox.max.x,
            ],
            clip_constants: [         // In this order to synchronise with Navisworks
                -this.clipPlanes[0].constant, -this.clipPlanes[1].constant,
                -this.clipPlanes[2].constant, -this.clipPlanes[3].constant,
                //Note that these two are swapped so I left it like this.
                -this.clipPlanes[5].constant, -this.clipPlanes[4].constant,
            ],
            model: this.model.url,
            // All null elements just to match the type.
            description: null,
            pk: null,
            url: null,
            viewer_url: null,
            creation_time: null,
            notes: null,
            remark: null,
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
    insertNote( noteObject, name ) { //TODO customize? Color, size etc.
        const text = prettify( noteObject.text, 20 );
        const note = new SpriteText(text, 200, 'black');
        note.backgroundColor = 'white';
        note.padding = 3;
        note.borderWidth = 0.5;
        note.borderRadius = 6;
        note.borderColor = 'blue';
        note.name = name;
        note.position.set( ...noteObject.position );
        note.material.depthTest = false; // To be visible through walls
        note.material.transparent = true;
        note.material.opacity = 0.5;
        this.scene.add( note );
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
     * Method that changes current field of view of the camera.
     *
     * @param { Number } [fov] Field of view that should be set. Sets default FOV if it wasn't passed.
     */
    setFOV (fov) {
        if (!fov) {
            fov = this.defaultFOV;
        }
        this.camera.fov = fov;
        this.controlPanel.params.cameraFOV = fov;
        this.controlPanel.gui.updateDisplay();
        this.camera.updateProjectionMatrix();
        this.render();
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
     * Standard method for Three.js which is called each time when a model should be rendered to canvas.
     */
    render() {
        this.guideSphere.place();
        this.renderer.render( this.scene, this.camera );
    }
}

/**
 * Guide sphere that is always in current target of engine controls to help understand where is the target now.
 */
class GuideSphere {
    /**
     * @param { Engine } engine An engine this guide sphere should work with.
     * @param { Number } color HEX-color of the sphere. Default is red.
     * @param { Number } scale Scale of sphere, multiplied by distance to it. Default is 0.01.
     * @param { Number } opacity Opacity of the sphere, default is 0.5.
     */
    constructor( engine, color = 0xFF0000, scale= 0.01, opacity = 0.5 ) {
        const geometry = new THREE.SphereGeometry(1);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
        });

        this.engine = engine;
        this.sphere = new THREE.Mesh( geometry, material );
        this.scale = scale;

        this.engine.controls.addEventListener('start', this.show.bind(this));
        this.engine.controls.addEventListener('end', this.hide.bind(this));
    }

    /**
     * Method used to show little guide sphere in a current controls target.
     */
    show() {
        this.engine.scene.add( this.sphere );
        this.place();
    }

    /**
     * Hides guide sphere.
     */
    hide() {
        this.engine.scene.remove( this.sphere );
        this.engine.render();
    }

    /**
     * Method that scales guide sphere and places it in current target. Should be called each time when target moves.
     */
    place() {
        const target = this.engine.controls.target;
        const distance = this.engine.camera.position.distanceTo( target );
        const newScale = distance * this.scale;
        this.sphere.scale.setScalar( newScale );
        this.sphere.position.set( target.x, target.y, target.z );
    }
}