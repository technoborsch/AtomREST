import { truncate } from "./Utils.js";

/**
 * A class that represents current interface and encapsulates all logic and methods related to it.
 */
export default class AppInterface {
    /**
     * Constructor of an interface, all elements inside DOM that user can interact with should be bound here.
     */
    constructor() {

        //Things related to view point modal
        this.viewPointModal = new bootstrap.Modal(document.getElementById('viewPointModal'));
        this.viewPointModal.cancelButton = document.getElementById('cancelViewPoint');
        this.viewPointModal.saveButton = document.getElementById('saveViewPoint');
        this.viewPointModal.openButton = document.getElementById('camera');
        this.viewPointModal.descriptionInput = document.getElementById('descriptionInput');
        this.viewPointModal.noteInsertionElement = document.getElementById( 'notesInsideModal' );

        //Things related to note modal
        this.noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
        this.noteModal.saveButton = document.getElementById('saveNote');
        this.noteModal.openButton = document.getElementById('note');
        this.noteModal.cancelButton = document.getElementById('cancelNoteButton');
        this.noteModal.descriptionInput = document.getElementById('noteTextInput');

        // Toasts
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

        this.openBtn = document.getElementById('openbtn');
        this.sidebarMenu = document.getElementById("sidebarMenu");
        this.viewPointsMenu = document.getElementById('viewpointsMenu');
        this.viewPointsMenuButton = document.getElementById('viewpointsMenuToggleButton');
        this.viewPointsMenuButtonPlacer = document.getElementById('btnPlacer');

        this.loadingScreen = document.getElementById('loading-screen');

        this.settingsElement = document.getElementById('viewer_settings');

        this.removeNoteButtons = [];
        this.isExportDisabled = true;
        this.isSidebarOpen = false;
        this.isViewpointsMenuOpen = false;
        this.isSaveNoteButtonEnabled = false;

        //Methods that react on user actions and not depend on some external logic
        this.viewPointModal.openButton.addEventListener( 'click', this.onViewPointOpenClick.bind(this) );
        this.noteModal.openButton.addEventListener( 'click', this.onNoteOpenClick.bind(this) );
        this.noteModal.descriptionInput.addEventListener( 'input', this.handleSaveNoteButtonState.bind(this) );
        this.noteModal.cancelButton.addEventListener( 'click', this.onNoteCancelClick.bind(this) );
        this.viewPointsMenuButton.addEventListener( 'click', this.handleViewpointMenuToggle.bind(this) );
        this.openBtn.addEventListener( 'click', this.handleSidebarToggling.bind(this) );

        //Passive things that work just after page load
        [this.initTooltips.bind(this), this.initCollapseButtons.bind(this)].forEach( handler => {
            document.addEventListener("DOMContentLoaded", handler);
        } );
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
        let text = document.createTextNode( truncate( note.text, 30 ) );
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
     * Method used to clear all view points from the side menu.
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
        if ( viewPoint.description ) { text = truncate(viewPoint.description, 22); }
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
     * Method to insert a sign that there are no locally saved view points.
     */
    insertNoViewPointsSign() {
        const tag = document.createElement('div');
        const p = document.createElement('p');
        const textInP = document.createTextNode( 'Сохраненных точек обзора нет.' );
        const a = document.createElement('a');
        const textInA = document.createTextNode( 'Создать точку обзора' );
        ['p-2', 'text-center'].forEach( className => tag.classList.add(className) );
        ['text-muted', 'mb-0'].forEach( className => p.classList.add(className) );
        ['link', 'link-primary'].forEach( className => a.classList.add(className) );
        p.appendChild( textInP );
        a.appendChild( textInA );
        a.addEventListener('click', () => { this.viewPointModal.openButton.click(); } );
        [p, a].forEach( el => tag.appendChild( el ) );
        this.viewPointsButtonsInsertionElement.appendChild( tag );
    }

    /**
     * Method that shows description modal with given text.
     *
     * @param { String } text Text that should be shown.
     */
    showDescriptionToast( text ) {
        this.viewPointDescriptionToast.text.innerHTML = text;
        this.viewPointDescriptionToast.show();
    }

    /**
     * Toggles state of export button.
     */
    toggleExportButton() {
        this.viewPointsExportButton.classList.toggle('disabled');
        this.isExportDisabled = !this.isExportDisabled;
    }

    /**
     * Removes initial load animation effect.
     */
    removeLoadingScreen() {
        this.loadingScreen.classList.add('fade-out');
        this.loadingScreen.addEventListener('transitionend', (event) => {
            event.target.remove();
        });
    }

    // Passive methods
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
     * Initializes all bootstrap tooltips.
     */
    initTooltips() {
        let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map( (triggerEl) => {
            new bootstrap.Tooltip(triggerEl);
        } );
    }

    /**
     * Seeks and adds event listeners to buttons that trigger collapse. Responsible for 90deg-rotating of them.
     */
    initCollapseButtons() {
        const sideBarCollapseButtons = document.querySelectorAll('div button.list-group-item');
        sideBarCollapseButtons.forEach( (node) => {
                node.addEventListener("click", () => {
                    node.children[0].classList.toggle('rotated');
                });
            }
        );
    }

    /**
     * Handles pressing on sidebar button - opens main navigational sidebar.
     */
    handleSidebarToggling() {
        this.sidebarMenu.classList.toggle("sidebar-shifted");
        this.openBtn.classList.toggle("openbtn-pressed");
        if (this.isViewpointsMenuOpen) {
            this.viewPointsMenuButton.click();
        }
        this.sidebarOpen = !this.sidebarOpen;
    }

    /**
     * Guards button that saves notes if there aren't any text input.
     */
    handleSaveNoteButtonState() {
        if (
            (this.noteModal.descriptionInput.value && !this.isSaveNoteButtonEnabled)
            || (!this.noteModal.descriptionInput.value && this.isSaveNoteButtonEnabled)
        ) {
            this.noteModal.saveButton.classList.toggle('disabled');
            this.isSaveNoteButtonEnabled = !this.isSaveNoteButtonEnabled;
        }
    }

    /**
     * Handles opening of sidebar with view points and remarks.
     */
    handleViewpointMenuToggle() {
        this.viewPointsMenu.classList.toggle('sidebar-shifted');
        this.viewPointsMenuButtonPlacer.classList.toggle('button-placer-shifted');
        this.isViewpointsMenuOpen = !this.isViewpointsMenuOpen;
    }
}