/**
 * A class that represents current interface and encapsulates all logic and methods related to it.
 */
export default class AppInterface {
    /**
     * Constructor of an interface, all elements inside DOM that user can interact with should be bound here.
     */
    constructor() {
        this.viewPointModal = new bootstrap.Modal(document.getElementById('viewPointModal'));
        this.viewPointModal.cancelButton = document.getElementById('cancelViewPoint');
        this.viewPointModal.saveButton = document.getElementById('saveViewPoint');
        this.viewPointModal.openButton = document.getElementById('camera');
        this.viewPointModal.descriptionInput = document.getElementById('descriptionInput');
        this.viewPointModal.noteInsertionElement = document.getElementById( 'notesInsideModal' );

        this.noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
        this.noteModal.saveButton = document.getElementById('saveNote');
        this.noteModal.openButton = document.getElementById('note');
        this.noteModal.cancelButton = document.getElementById('cancelNoteButton');
        this.noteModal.descriptionInput = document.getElementById('noteTextInput');

        this.viewPointToast = new bootstrap.Toast(document.getElementById('viewPointToast'));
        this.viewPointDescriptionToast = new bootstrap.Toast(
            document.getElementById('viewPointDescriptionToast')
        );
        this.viewPointDeletionToast = new bootstrap.Toast(document.getElementById('viewPointDeletionToast'));
        this.viewPointDescriptionToast.text = document.getElementById('descriptionText');
        this.viewPointsCollapseButton = document.getElementById('viewPointsCollapseButton');
        this.viewPointsButtonsInsertionElement = document.getElementById( 'pointButtons' );

        this.viewPointsExportButton = document.getElementById('viewPointsExportButton');
        this.viewPointsImportButton = document.getElementById('viewPointsImportButton');

        this.removeNoteButtons = [];

        //Methods that react on user actions and not depend on some external logic
        this.viewPointModal.openButton.addEventListener( 'click', this.onViewPointOpenClick.bind(this) );
        this.noteModal.openButton.addEventListener( 'click', this.onNoteOpenClick.bind(this) );
        this.noteModal.cancelButton.addEventListener( 'click', this.onNoteCancelClick.bind(this) );

        //Passive things that work just after page load
        document.addEventListener("DOMContentLoaded",() => {});

    }

    /**
     * Method to describe actions on click on camera button.
     * Simply shows view point modal.
     */
    onViewPointOpenClick() {
        this.viewPointModal.show();
    }

    /**
     * Method to describe actions on click on button that adds new note into current view point.
     * We need to show note modal and hide view point modal.
     */
    onNoteOpenClick() {
        this.noteModal.show();
        this.viewPointModal.hide();
    }

    /**
     * Method to describe actions on note modal cancel button.
     * Shows previous modal, empties input value of note description.
     */
    onNoteCancelClick() {
        this.viewPointModal.show();
        this.noteModal.descriptionInput.value = '';
    }

    /**
     * Method used to create and add a label on viewpoints modal with simple interface to manipulate a note before
     * saving.
     *
     * @param { Note } note Note that needs to be inserted.
     * @param { String } key Key of the note, used later to manipulate it.
     * @param { function } deletionCallback Callback executed when deletion button has been pressed.
     */
    addNoteToModal( note, key, deletionCallback ) {
        const tag = document.createElement('a');
        tag.closeBtn = document.createElement( 'button' );
        ['btn', 'btn-secondary', 'm-1'].forEach( className => tag.classList.add( className ) );
        tag.setAttribute('key', key );
        ['btn-close', 'ms-1'].forEach( className => tag.closeBtn.classList.add( className ) );
        let text = document.createTextNode( note.text );
        tag.appendChild( text );
        tag.appendChild( tag.closeBtn );
        this.viewPointModal.noteInsertionElement.appendChild( tag );
        // Bind a method here that deletes this note label from modal
        tag.closeBtn.addEventListener( 'click', deletionCallback );
    }

    /**
     * Method used to delete note label from modal.
     *
     * @param { String } key Key of the note label that should be deleted.
     */
    removeNoteFromModal( key ) {
        const noteLabels = this.viewPointModal.noteInsertionElement.children;
        for (let i=0; i < noteLabels.length; i++) {
            if (noteLabels[i].getAttribute('key') === key) {
                noteLabels[i].remove();
                break;
            }
        }
    }

    /**
     * Renders given list of view points to the interface.
     *
     * @param { ViewPoint[] } viewPointsList List of view points that should be rendered.
     * @param { function } clickCallback Function executed on clicking on each button. Just passed here further.
     * @param { function } deletionCallback Function executed on view point deletion. Just passed here further.
     */
    renderViewpointsList( viewPointsList, clickCallback, deletionCallback ) {
        this._emptyRenderedButtons().then(() => {
            viewPointsList.forEach( (viewPoint) => {
                this._insertViewPointButton(viewPoint, clickCallback, deletionCallback);
            } );
        });
    }

    /**
     * Method used to clear all view points from a side menu.
     *
     * @return { Promise<void> } Promise fulfilled when all view point buttons were deleted from side menu.
     */
    async _emptyRenderedButtons() {
        while (this.viewPointsButtonsInsertionElement.firstChild) {
            this.viewPointsButtonsInsertionElement.firstChild.remove();
        }
    }

    /**
     * Method to insert a view point button to the side menu.
     *
     * @param { ViewPoint } viewPoint A view point object that should be inserted.
     * @param { function } clickCallback Function executed on clicking on each button.
     * @param { function } deletionCallback Function executed on view point deletion.
     * @return { Element } Created and inserted viewpoint button.
     */
    _insertViewPointButton( viewPoint , clickCallback, deletionCallback) {
        const tag = document.createElement( 'a' );
        tag.closeBtn = document.createElement( 'button' );
        ['list-group-item', 'list-group-item-active'].forEach( className => tag.classList.add(className) );
        tag.setAttribute('key', viewPoint.pk);
        ['btn-close', 'btn-danger', 'float-end', 'me-1'].forEach( className => tag.closeBtn.classList.add(className) );
        let text = 'Точка обзора ' + viewPoint.pk;
        if ( viewPoint.description ) { text = viewPoint.description; }
        const textNode = document.createTextNode( text );
        tag.appendChild( textNode );
        tag.appendChild( tag.closeBtn );
        tag.addEventListener( 'click', clickCallback );
        tag.closeBtn.addEventListener( 'click', deletionCallback );
        this.viewPointsButtonsInsertionElement.prepend( tag );
        this.viewPointsCollapseButton.classList.remove('disabled');
        return tag;
    }

    /**
     * Method shows description modal with given text.
     *
     * @param { String } text Text that should be shown.
     */
    showDescriptionToast( text ) {
        this.viewPointDescriptionToast.text.innerHTML = text;
        this.viewPointDescriptionToast.show();
    }

    //Passive methods

    handleSidebarToggling() {

    }

}