import * as THREE from "../../threejs/build/three.module.js";
import SpriteText from "../../three-spritetext/src/index.js";
import { prettify } from "./Utils.js";

export default class ViewpointManager {
    //Describes an object that's responsible for all actions related to viewpoints
    constructor(
        viewPointModal, viewPointModalCancelButton, viewPointModalSaveButton, viewPointModalOpenButton,
        viewPointModalDescriptionInput, viewPointModalNoteInsertionElement,
        noteModal, noteModalSaveButton, noteModalOpenButton, noteModalDescriptionInput,
        viewPointToast, viewPointDescriptionToast, viewPointToastDescriptionOutput,
        apiService, scene, camera, raycaster, renderFunction
        ) {
        this.viewPointModal = viewPointModal;
        this.viewPointModal.cancelButton = viewPointModalCancelButton;
        this.viewPointModal.saveButton = viewPointModalSaveButton;
        this.viewPointModal.openButton = viewPointModalOpenButton;
        this.viewPointModal.descriptionInput = viewPointModalDescriptionInput;
        this.viewPointModal.noteInsertionElement = viewPointModalNoteInsertionElement;

        this.noteModal = noteModal;
        this.noteModal.saveButton = noteModalSaveButton;
        this.noteModal.openButton = noteModalOpenButton;
        this.noteModal.descriptionInput = noteModalDescriptionInput;

        this.viewPointToast = viewPointToast;
        this.viewPointDescriptionToast = viewPointDescriptionToast;
        this.viewPointDescriptionToast.text = viewPointToastDescriptionOutput;

        this.apiService = apiService;
        this.scene = scene;
        this.camera = camera;
        this.raycaster = raycaster;
        this.renderFunction = renderFunction;

        this.currentNotes = [];
        this.removeNoteButtons = [];
        this.isWaitingForNote = false;

        this.viewPointModal.openButton.addEventListener( 'click', this.onViewPointModalOpenButtonClick.bind(this) );
        this.viewPointModal.saveButton.addEventListener( 'click', this.onViewPointModalSaveButtonClick.bind(this) );
        this.viewPointModal.cancelButton.addEventListener( 'click', this.onViewPointModalCancelButtonClick.bind(this) );
        this.noteModal.openButton.addEventListener( 'click', this.onNoteModalOpenButtonClick.bind(this) );
        this.noteModal.saveButton.addEventListener( 'click', this.onNoteModalSaveButtonClick.bind(this) );

    }
    that = this;

    onViewPointModalOpenButtonClick() {
        //Show modal
        console.dir(this);
        this.viewPointModal.show();
    }

    onViewPointModalSaveButtonClick() {
        //Get all notes and values, save them
        console.dir(this);
        this.apiService.saveViewPoint(this.viewPointModal.descriptionInput.value)
            .then((savedViewPoint) => {
                this.currentNotes.forEach( (note) => {
                    note.view_point = savedViewPoint.url;
                    this.apiService.addNote( note );
                });
                this.currentNotes = [];
                navigator.clipboard.writeText(savedViewPoint.viewer_url)
                    .then( () => {
                        this.viewPointToast.show();
                    });
            });
    }

    onViewPointModalCancelButtonClick() {
        //On cancelling of viewpoint input
        this.removeNoteButtons.forEach( (button) => {
            button.click();
        } );
        this.currentNotes = [];
    }

    onViewPointModalRemoveNoteButton(event) {
        let key = event.target.parentElement.getAttribute('key');
        delete this.currentNotes[key];
        event.target.parentElement.remove();
        this.scene.remove( this.scene.getObjectByName(key) );
        this.renderFunction();
    }

    onNoteModalOpenButtonClick() {
        this.noteModal.show();
        this.viewPointModal.hide();
    }

    onNoteModalSaveButtonClick() {
        setTimeout(() => {this.isWaitingForNote = true;}, 1);
        window.addEventListener( 'click', this.getPositionToInsertNote.bind(this) );
    }

    getPositionToInsertNote( event ) {
        if (this.isWaitingForNote) {
            let intersected;
            const mouse = new THREE.Vector2();

            mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( ( event.clientY - 36 ) / window.innerHeight ) * 2 + 1;

            this.raycaster.setFromCamera( mouse, this.camera );
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            if (intersects.length) {
                intersected = intersects[0]; //add proper logic that takes sectioning into consideration
                const note = {
                    text: this.noteModal.descriptionInput.value,
                    position: intersected.point.toArray(),
                };
                this.currentNotes.push( note );
                this.insertNote( note );
                this.isWaitingForNote = false;
                this.addNoteToModal( note );
                this.viewPointModal.show();
                }
            }
        }

    insertNote( noteObject ) {
        const text = prettify( noteObject.text, 20 );
        const note = new SpriteText(text, 400, 'black');
        note.backgroundColor = 'white';
        note.padding = 10;
        note.borderRadius = 10;
        note.name = this.currentNotes.indexOf(noteObject).toString();
        note.position.set( noteObject.position[0], noteObject.position[1], noteObject.position[2] );
        note.material.depthTest = false;
        note.material.transparent = true;
        note.material.opacity = 0.5;
        this.scene.add( note );
        window.removeEventListener( 'click', this.getPositionToInsertNote.bind(this) );
        this.renderFunction();
    }

    addNoteToModal( note ) {
        let tag = document.createElement('a');
        let closeBtn = document.createElement( 'button' );
        tag.classList.add("btn");
        tag.classList.add("btn-secondary");
        tag.classList.add("m-1");
        tag.setAttribute('key', this.currentNotes.indexOf(note).toString());
        closeBtn.classList.add("btn-close");
        closeBtn.classList.add("ms-1");
        closeBtn.addEventListener('click', this.onViewPointModalRemoveNoteButton.bind(this) );
        this.removeNoteButtons.push( closeBtn );
        let text = document.createTextNode( note.text );
        tag.appendChild( text );
        tag.appendChild( closeBtn );
        this.viewPointModal.noteInsertionElement.appendChild( tag );
    }

    showDescriptionToast( text ) {
        this.viewPointDescriptionToast.text.innerText = text;
        this.viewPointDescriptionToast.show();
    }

}
