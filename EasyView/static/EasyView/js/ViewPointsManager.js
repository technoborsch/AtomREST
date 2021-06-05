export default class ViewpointManager {
    // Describes an object that's responsible for all actions related to viewpoints
    constructor(
        // TODO Huge constructor and so maybe it is easier to bind all interface elements here
        viewPointModal, viewPointModalCancelButton, viewPointModalSaveButton, viewPointModalOpenButton,
        viewPointModalDescriptionInput, viewPointModalNoteInsertionElement,
        noteModal, noteModalSaveButton, noteModalOpenButton, noteModalDescriptionInput,
        viewPointToast, viewPointDescriptionToast, viewPointToastDescriptionOutput,
        engine, controlPanel, apiService
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
        this.engine = engine;
        this.controlPanel = controlPanel;

        this.currentNotes = [];
        this.removeNoteButtons = [];
        this.isWaitingForNote = false;

        // Bind methods to clicks on different buttons. Don't forget to register a button here if you want it to work
        this.viewPointModal.openButton.addEventListener( 'click', this.onViewPointModalOpenButtonClick.bind(this) );
        this.viewPointModal.saveButton.addEventListener( 'click', this.onViewPointModalSaveButtonClick.bind(this) );
        this.viewPointModal.cancelButton.addEventListener( 'click', this.onViewPointModalCancelButtonClick.bind(this) );
        this.noteModal.openButton.addEventListener( 'click', this.onNoteModalOpenButtonClick.bind(this) );
        this.noteModal.saveButton.addEventListener( 'click', this.onNoteModalSaveButtonClick.bind(this) );

    }

    onViewPointModalOpenButtonClick() {
        // Simply show view point modal
        this.viewPointModal.show();
    }

    onViewPointModalSaveButtonClick() {
        // Gets all notes and values and saves them
        this.saveViewPoint(this.viewPointModal.descriptionInput.value)
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
        // On cancelling of viewpoint input
        this.removeNoteButtons.forEach( (button) => {
            button.click(); // Simply click on each to remove.
        } );
        this.currentNotes = [];
    }

    onViewPointModalRemoveNoteButton(event) {
        // Removes this note from scene, modal and the list of current notes
        let key = event.target.parentElement.getAttribute('key');
        this.engine.scene.remove( this.engine.scene.getObjectByName( key ) );
        delete this.currentNotes[key];
        event.target.parentElement.remove();
        this.engine.render();
    }

    onNoteModalOpenButtonClick() {
        // So we want another modal to be shown, but also we should close a previous one
        this.noteModal.show();
        this.viewPointModal.hide();
    }

    onNoteModalSaveButtonClick() {
        // Bind listener to a window and start to wait for a click
        setTimeout(() => {this.isWaitingForNote = true;}, 1);
        window.addEventListener( 'click', this.getPositionToInsertNote.bind(this) );
    }

    setViewPoint( viewPoint ) {
        // Method that called to apply a viewpoint, it handles both view and clipping
        if (viewPoint) {
            this.engine.setViewFromViewPoint( viewPoint );
            this.controlPanel.setClipping(viewPoint.clip_constants);
            if (viewPoint.description) {
                this.showDescriptionToast( viewPoint.description );
            }
        } else {
            this.engine.setDefaultView();
            this.controlPanel.setClipping();
        }
    }

    async getPositionToInsertNote( event ) {
        // Actions when it waits for a click to insert a note there
        if (this.isWaitingForNote) { // TODO may be redundant

            const position = await this.engine.getFirstIntersectionPosition( event );
            if (position) {
                const note = {
                    text: this.noteModal.descriptionInput.value,
                    position: position.toArray(),
                };
                this.currentNotes.push( note );
                const key = this.currentNotes.indexOf( note );
                this.engine.insertNote( note, key.toString() );
                this.isWaitingForNote = false;
                this.addNoteToModal( note );
                window.removeEventListener( 'click', this.getPositionToInsertNote.bind(this) );
                this.viewPointModal.show();
            }
        }
    }

    addNoteToModal( note ) {
        // It creates and adds a label on modal with simple interface to manipulate it before saving
        let tag = document.createElement('a');
        let closeBtn = document.createElement( 'button' );
        tag.classList.add("btn");
        tag.classList.add("btn-secondary");
        tag.classList.add("m-1");
        tag.setAttribute('key', this.currentNotes.indexOf(note).toString());
        closeBtn.classList.add("btn-close");
        closeBtn.classList.add("ms-1");
        closeBtn.addEventListener('click', this.onViewPointModalRemoveNoteButton.bind(this) );
        this.removeNoteButtons.push( closeBtn ); // save them to click on each if we want to clear all notes
        let text = document.createTextNode( note.text );
        tag.appendChild( text );
        tag.appendChild( closeBtn );
        this.viewPointModal.noteInsertionElement.appendChild( tag );
    }

    showDescriptionToast( text ) {
        // Shows a toast with given text
        this.viewPointDescriptionToast.text.innerText = text;
        this.viewPointDescriptionToast.show();
    }

    async saveViewPoint( description ) {
        // It gets current view point, adds description and saves. Does not manage with notes
        const viewPoint = this.engine.getCurrentViewPoint();
        viewPoint.description = description;
        return await this.apiService.addViewPoint(viewPoint);
    }
}
