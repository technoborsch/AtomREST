import { truncate } from "./Utils.js";

/**
 * A class that represents current interface and encapsulates all logic and methods related to it.
 */
export default class AppInterface {
    /**
     * Constructor of an interface, all elements inside DOM that user can interact with should be bound here.
     * @property { Element } highlightedViewpointButton Currently highlighted viewpoint button.
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

        this.remarkToast = new bootstrap.Toast(document.getElementById('remarkDescriptionToast'));
        this.remarkToast.description = document.getElementById('remarkDescriptionText');
        this.remarkToast.author = document.getElementById('remarkAuthor');
        this.remarkToast.responsible = document.getElementById('remarkResponsible');
        this.remarkToast.dateCreated = document.getElementById('remarkDateCreated');
        this.remarkToast.dateTo = document.getElementById('remarkDateTo');
        this.remarkToast.status = document.getElementById('remarkStatus');
        this.remarkToast.sendButton = document.getElementById('remarkResponseButton');
        this.remarkToast.responseText = document.getElementById('remarkResponseInput');

        this.responseToast = new bootstrap.Toast(document.getElementById('responseToast'));

        this.viewPointsCollapseButton = document.getElementById('viewPointsCollapseButton');
        this.viewPointsButtonsInsertionElement = document.getElementById( 'pointButtons' );

        this.viewPointsExportButton = document.getElementById('viewPointsExportButton');
        this.viewPointsImportButton = document.getElementById('viewPointsImportButton');

        this.openBtn = document.getElementById('openbtn');
        this.exitButton = document.getElementById('exitButton');
        this.sidebarMenu = document.getElementById("sidebarMenu");
        this.viewPointsMenu = document.getElementById('viewpointsMenu');
        this.viewPointsMenuButton = document.getElementById('viewpointsMenuToggleButton');
        this.viewPointsMenuButtonPlacer = document.getElementById('btnPlacer');

        this.loadingScreen = document.getElementById('loading-screen');

        this.settingsElement = document.getElementById('viewer_settings');

        this.highlightedViewpointButton = null;
        this.isExportDisabled = true;
        this.isSidebarOpen = false;
        this.isViewpointsMenuOpen = false;
        this.isSaveNoteButtonEnabled = false;
        this.isExitButtonVisible = false;
        this.isResponseButtonEnabled = false;

        //Methods that react on user actions and not depend on some external logic
        this.noteModal.openButton.addEventListener( 'click', this.onNoteOpenClick.bind(this) );
        this.noteModal.descriptionInput.addEventListener( 'input', this.handleSaveNoteButtonState.bind(this) );
        this.noteModal.cancelButton.addEventListener( 'click', this.onNoteCancelClick.bind(this) );
        this.remarkToast.responseText.addEventListener('input', this.handleResponseButtonState.bind(this) );
        this.viewPointsMenuButton.addEventListener( 'click', this.handleViewpointMenuToggle.bind(this) );
        this.openBtn.addEventListener( 'click', this.handleSidebarToggling.bind(this) );

        //Passive things that work just after page load
        [AppInterface.initTooltips, AppInterface.initCollapseButtons].forEach( handler => {
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
     * @param { Number } truncationLength Note description will be truncated to this length. Default is 30.
     */
    addNoteToModal( note, key, deletionCallback, truncationLength = 30 ) {
        const tag = document.createElement('a');
        tag.closeBtn = document.createElement( 'button' );
        ['btn', 'btn-secondary', 'm-1'].forEach( className => tag.classList.add( className ) );
        tag.setAttribute('key', key );
        ['btn-close', 'ms-1'].forEach( className => tag.closeBtn.classList.add( className ) );
        let text = document.createTextNode( truncate( note.text, truncationLength ) );
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
            const label = noteLabels[i];
            if (label.getAttribute('key') === key) {
                label.remove();
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
        const insertionElement = this.viewPointsButtonsInsertionElement;
        while (insertionElement.firstChild) {
            insertionElement.firstChild.remove();
        }
    }

    /**
     * Method to insert a view point button to the side menu.
     *
     * @param { ViewPoint } viewPoint A view point object that should be inserted.
     * @param { function } clickCallback Function executed on clicking on each button.
     * @param { function } deletionCallback Function executed on view point deletion.
     * @param { Number } [truncationLength] View point will be truncated by this length, default is 22.
     * @return { Element } Created and inserted viewpoint button.
     */
    _insertViewPointButton( viewPoint , clickCallback, deletionCallback, truncationLength = 22 ) {
        const tag = document.createElement( 'a' );
        tag.closeBtn = document.createElement( 'button' );
        ['list-group-item', 'list-group-item-active'].forEach( className => tag.classList.add(className) );
        tag.setAttribute('key', viewPoint.pk);
        ['btn-close', 'float-end', 'me-1'].forEach( className => tag.closeBtn.classList.add(className) );
        let text = 'Точка обзора ' + viewPoint.pk;
        if ( viewPoint.description ) { text = truncate( viewPoint.description, truncationLength ); }
        const textNode = document.createTextNode( text );
        tag.appendChild( textNode );
        tag.appendChild( tag.closeBtn );
        tag.addEventListener( 'click', clickCallback );
        tag.closeBtn.addEventListener( 'click', deletionCallback );
        this.viewPointsButtonsInsertionElement.prepend( tag );
        this.viewPointsCollapseButton.classList.remove( 'disabled' );
        return tag;
    }

    /**
     * Method to insert a sign that there are no locally saved view points.
     */
    insertNoViewPointsSign() {
        const tag = document.createElement( 'div' );
        const p = document.createElement( 'p' );
        const textInP = document.createTextNode( 'Сохраненных точек обзора нет.' );
        const a = document.createElement( 'a' );
        const textInA = document.createTextNode( 'Создать точку обзора' );
        ['p-2', 'text-center'].forEach( className => tag.classList.add( className ) );
        ['text-muted', 'mb-0'].forEach( className => p.classList.add( className ) );
        ['link', 'link-primary'].forEach( className => a.classList.add( className ) );
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
        const toast = this.viewPointDescriptionToast;
        toast.text.innerHTML = text;
        toast.show();
    }

    /**
     * Shows remark toast based on given view point.
     * @param { ViewPoint } viewPoint view point with remark that should be showed.
     * @property { Remark } remark A remark object.
     */
    showRemarkToast( viewPoint ) {
        const remark = viewPoint.remark;
        const toast = this.remarkToast;
        toast.description.innerHTML = remark.description;
        toast.author.innerHTML = remark.reviewer;
        toast.responsible.innerHTML = remark.responsible_person;
        toast.dateCreated.innerHTML = new Date( remark.creation_time ).toLocaleString();
        toast.dateTo.innerHTML = new Date( remark.deadline ).toLocaleDateString();
        toast.show();
    }

    /**
     * Toggles state of export button.
     */
    toggleExportButton() {
        this.viewPointsExportButton.classList.toggle('disabled');
        this.isExportDisabled = !this.isExportDisabled;
    }

    /**
     * Applies ripple effect to a given element to highlight it.
     * @param { Element } el Element that the ripple effect should be applied for.
     */
    applyRipple ( el ) {
        const ripple = document.createElement( 'span' );
        ripple.classList.add( 'ripple' );
        el.appendChild( ripple );
        setTimeout( () => { ripple.remove(); }, 3000 );
    }

    /**
     * Handles visual effects on viewpoint saving.
     */
    applyViewPointSavingEffects() {
        if ( !this.isViewpointsMenuOpen ) {
            this.applyRipple( this.viewPointsMenuButton );
        }
        const areViewPointsCollapsed = this.viewPointsCollapseButton.getAttribute('aria-expanded') === 'true';
        if (!areViewPointsCollapsed) {
            this.viewPointsCollapseButton.click();
        }
    }

    /**
     * Highlights given viewpoint button, only one button can be highlighted at a time.
     * @param { Element } button A button that should be highlighted.
     */
    highlightViewPointButton( button ) {
        this.removeHighlightingFromButton();
        this.highlightedViewpointButton = button;
        button.classList.add('bg-primary');
    }

    /**
     * Removes highlighting from currently highlighted button.
     */
    removeHighlightingFromButton() {
        const button = this.highlightedViewpointButton;
        if (button) {
            button.classList.remove( 'bg-primary' );
        }
        this.highlightedViewpointButton = null;
    }

    /**
     * Removes initial load animation effect.
     */
    removeLoadingScreen() {
        this.loadingScreen.classList.add('fade-out');
        this.loadingScreen.addEventListener('transitionend', event => {
            event.target.remove();
        });
    }

    /**
     * Shows 'Exit view point' button, if it is hidden.
     */
    showExitButton() {
        if (!this.isExitButtonVisible) {
            this.exitButton.classList.toggle('invisible');
            this.isExitButtonVisible = !this.isExitButtonVisible;
        }
    }

    /**
     * Hides 'Exit view point' button, if it is shown.
     */
    hideExitButton() {
        if (this.isExitButtonVisible) {
            this.exitButton.classList.toggle('invisible');
            this.isExitButtonVisible = !this.isExitButtonVisible;
        }
    }

    /**
     * Method that inserts cover element above all other elements that will catch user's clicks. It was made just to
     * make it possible to catch both clicks and touchscreen taps.
     * @return { Element } Inserted cover element.
     */
    insertCoverElement() {
        const coverElement = document.createElement('div');
        coverElement.id = 'coverElement';
        ['vh-100', 'position-relative', 'bottom-100', 'start-0', 'bg-transparent'].forEach( className => {
            coverElement.classList.add( className );
        } );
        document.querySelector('body').appendChild(coverElement);
        return coverElement
    }

    // Passive methods
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
    static initTooltips() {
        let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map( triggerEl => {
            new bootstrap.Tooltip(triggerEl);
        } );
    }

    /**
     * Seeks and adds event listeners to buttons that trigger collapse. Responsible for 90deg-rotating of them.
     */
    static initCollapseButtons() {
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
     * Disable 'send response' button if there is no input. Enable if something has been typed.
     */
    handleResponseButtonState() {
        if (
            (this.remarkToast.responseText.value && !this.isResponseButtonEnabled)
            || (!this.remarkToast.responseText.value && this.isResponseButtonEnabled)
        ) {
            this.remarkToast.sendButton.classList.toggle('disabled');
            this.isResponseButtonEnabled = !this.isResponseButtonEnabled;
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