export default class ViewpointManager {
    // Describes an object that's responsible for all actions related to viewpoints
    constructor(
        // TODO Huge constructor and so maybe it is easier to bind all interface elements here
        viewPointModal, viewPointModalCancelButton, viewPointModalSaveButton, viewPointModalOpenButton,
        viewPointModalDescriptionInput, viewPointModalNoteInsertionElement,
        noteModal, noteModalSaveButton, noteModalOpenButton, noteModalDescriptionInput,
        viewPointToast, viewPointDescriptionToast, viewPointDeletionToast, viewPointToastDescriptionOutput,
        viewPointsCollapseButton, viewPointsButtonsInsertionElement, viewPointsExportButton, viewPointsImportButton,
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
        this.viewPointDeletionToast = viewPointDeletionToast;
        this.viewPointDescriptionToast.text = viewPointToastDescriptionOutput;
        this.viewPointsCollapseButton = viewPointsCollapseButton;
        this.viewPointsButtonsInsertionElement = viewPointsButtonsInsertionElement;

        this.viewPointsExportButton = viewPointsExportButton;
        this.viewPointsImportButton = viewPointsImportButton;

        this.apiService = apiService;
        this.engine = engine;
        this.controlPanel = controlPanel;

        this.currentNotes = [];
        this.viewPointsList = [];
        this.removeNoteButtons = [];
        this.isWaitingForNote = false;

        // Bind methods to clicks on different buttons. Don't forget to register a button here if you want it to work
        this.viewPointModal.openButton.addEventListener( 'click', this.onViewPointModalOpenButtonClick.bind(this) );
        this.viewPointModal.saveButton.addEventListener( 'click', this.onViewPointModalSaveButtonClick.bind(this) );
        this.viewPointModal.cancelButton.addEventListener( 'click', this.onViewPointModalCancelButtonClick.bind(this) );
        this.noteModal.openButton.addEventListener( 'click', this.onNoteModalOpenButtonClick.bind(this) );
        this.noteModal.saveButton.addEventListener( 'click', this.onNoteModalSaveButtonClick.bind(this) );
        this.viewPointsExportButton.addEventListener( 'click', this.onViewPointsExportButtonClick.bind(this) );
        this.viewPointsImportButton.addEventListener( 'click', this.onViewPointsImportButtonClick.bind(this) );

    }

    onViewPointModalOpenButtonClick() {
        // Simply show view point modal
        this.viewPointModal.show();
    }

    onViewPointModalSaveButtonClick() {
        // Gets all notes and values and saves them
        this.saveViewPoint(this.viewPointModal.descriptionInput.value)
            .then((savedViewPoint) => {
                this.viewPointsList.push(savedViewPoint);
                this.renderViewpointsList( this.viewPointsList );
                this.withPreparedLocalPointsList((list)=>{list.push(savedViewPoint.pk.toString())});
                this.currentNotes.forEach( (note) => {
                    note.view_point = savedViewPoint.url;
                    this.apiService.addNote( note );
                });
                this.clearNotes();
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

    clearNotes() {
        for (let i = 0; i < this.currentNotes.length; i++) {
            this.engine.scene.remove(
                this.engine.scene.getObjectByName( this.engine.viewPoint.pk + '_' + i.toString() )
            );
        }
        this.currentNotes = [];
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

    onViewPointsExportButtonClick() {
        const key = this.engine.model.building.slug;
        let keyString = localStorage.getItem( key );
        this.apiService.exportViewpointsByPKString( keyString )
    }

    onViewPointsImportButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.click();

        input.onchange = event => {
            const file = event.target.files[0];
            this.apiService.importViewPoints( file, this.engine.model.pk ).then( response => {
                const pk_list = response.list
                this.withPreparedLocalPointsList( async list => {
                    await list.push(pk_list);
                    this.getSavedViewpoints().then( () => {
                        this.renderViewpointsList();
                    } );
                } );
            } );
            input.remove();
        }
    }

    setViewPoint( viewPoint ) {
        // Method that called to apply a viewpoint, it handles both view and clipping
        if (viewPoint) {
            this.engine.setViewFromViewPoint( viewPoint );
            this.currentNotes = viewPoint.notes;
            this.controlPanel.setClipping( viewPoint );
            if (viewPoint.description) {
                this.showDescriptionToast( viewPoint.description );
            }
        } else {
            this.engine.setDefaultView();
            this.controlPanel.setClipping();
        }
        this.engine.render();
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

    insertViewPointButton( viewPoint ) {
        let tag = document.createElement( 'a' );
        let closeBtn = document.createElement( 'button' );
        tag.classList.add( 'list-group-item' );
        tag.classList.add( 'list-group-item-active' );
        tag.setAttribute('key', viewPoint.pk);
        closeBtn.classList.add("btn-close");
        closeBtn.classList.add('btn-danger');
        closeBtn.classList.add("float-end");
        closeBtn.classList.add("me-1");
        tag.addEventListener('click', this.onViewPointButtonClick.bind(this));
        closeBtn.addEventListener('click', this.onDeleteViewPointButtonClick.bind(this));
        let text = 'Точка обзора ' + viewPoint.pk;
        if ( viewPoint.description ) {
            text = viewPoint.description;
        }
        let textNode = document.createTextNode( text );
        tag.appendChild( textNode );
        tag.appendChild(closeBtn);
        this.viewPointsButtonsInsertionElement.prepend( tag );
        this.viewPointsCollapseButton.classList.remove('disabled');
    }

    onViewPointButtonClick(event) {
        this.clearNotes();
        const key = event.target.getAttribute('key');
        const viewPoint = this.viewPointsList.find( point => point.pk.toString() === key);
        let title = this.engine.model.building.kks + '/ Точка обзора ' + viewPoint.pk;
        history.replaceState(null, title, viewPoint.viewer_url);
        document.title = title;
        this.setViewPoint( viewPoint );
    }

    onDeleteViewPointButtonClick(event) {
        event.stopPropagation();
        const key = event.target.parentElement.getAttribute('key');
        this.apiService.deleteViewPointByPK( key ).then( () => {
            const viewPointToDelete = this.viewPointsList.find( point => point.pk.toString() === key);
            const index = this.viewPointsList.indexOf(viewPointToDelete);
            this.viewPointsList.splice(index, 1);
            this.withPreparedLocalPointsList((list) => {
                const i = list.indexOf(key);
                list.splice(i, 1);
            });
            this.viewPointDeletionToast.show();
            this.renderViewpointsList();
        });
    }

    async getSavedViewpoints() {
        // Loads all saved viewpoints and then returns an array of it
        const pkList = this.getViewPointsKeysList();
        const viewPointsList = [];
        for (let i=0; i<pkList.length; i++) {
            const pk = pkList[i];
            const viewPoint = await this.apiService.getViewPointByPK( pk );
            viewPointsList.push( viewPoint );
        }
        this.viewPointsList = viewPointsList;
        if (this.viewPointsList.length === 0) {
            this.viewPointsCollapseButton.classList.add('disabled');
        }
    }

    withPreparedLocalPointsList( func ) {
        //Works like a python decorator, extracts list of keys, executes given function on that and then saves back
        let keyList = this.getViewPointsKeysList();
        func( keyList );
        this.saveViewPointsKeysList( keyList );
    }

    getViewPointsKeysList() {
        //returns an array of pks of saved viewpoints for this model
        let keyList =[];
        const key = this.engine.model.building.slug;
        let keyString = localStorage.getItem( key );
        if ( keyString ) {
            keyList = keyString.split( ',' );
        }
        return keyList;
    }

    saveViewPointsKeysList( list ) {
        // Saves given array of pks to local storage for current model
        const key = this.engine.model.building.slug;
        const value = list.join( ',' );
        localStorage.setItem( key, value );
    }

    showDescriptionToast( text ) {
        // Shows a toast with given text
        this.viewPointDescriptionToast.text.innerText = text;
        this.viewPointDescriptionToast.show();
    }

    renderViewpointsList() {
        // Redraws all current viewpoint buttons
        this.emptyRenderedButtons().then(() => {
            this.viewPointsList.forEach( (viewPoint) => {
                this.insertViewPointButton(viewPoint);
            } );
        });
    }

    async emptyRenderedButtons() {
        // Clears current list of viewpoint buttons
        while (this.viewPointsButtonsInsertionElement.firstChild) {
            this.viewPointsButtonsInsertionElement.firstChild.remove();
        }
    }

    async saveViewPoint( description ) {
        // It gets current view point, adds description and saves. Does not manage with notes
        const viewPoint = this.engine.getCurrentViewPoint();
        viewPoint.description = description;
        return await this.apiService.addViewPoint( viewPoint );
    }
}