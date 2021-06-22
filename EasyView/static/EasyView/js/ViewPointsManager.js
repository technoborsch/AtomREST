/**
 * An object that describes all logic and reactions related to user actions.
 * It connects API, interface and engine together.
 */
export default class ViewpointManager {
    /**
     * @param { AppInterface } interface_ Current interface of the app.
     * @param { Engine } engine Graphical engine used in the app.
     * @param { ControlPanel } controlPanel Control panel of the engine. TODO Move to somewhere.
     * @param { APIService } apiService Object that communicates with the API.
     * @property { Note[] } currentNotes Current set of notes.
     * @property { Element[] } currentNote
     */
    constructor(
        interface_, engine, controlPanel, apiService
        ) {
        this.interface = interface_;
        this.apiService = apiService;
        this.engine = engine;
        this.controlPanel = controlPanel;

        this.currentNotes = [];
        this.viewPointsList = [];
        this.isWaitingForNote = false;

        // Bind methods to clicks on different buttons. Don't forget to register a button here if you want it to work.
        this.interface.viewPointModal.saveButton.addEventListener( 'click', this.onViewPointSaveClick.bind(this) );
        this.interface.viewPointModal.cancelButton.addEventListener(
            'click',this.onViewPointCancelClick.bind(this)
        );
        this.interface.noteModal.saveButton.addEventListener( 'click', this.onNoteSaveClick.bind(this) );
        this.interface.viewPointsExportButton.addEventListener( 'click', this.onViewPointsExportClick.bind(this) );
        this.interface.viewPointsImportButton.addEventListener( 'click', this.onViewPointsImportClick.bind(this) );

    }

    /**
     * Method that handles click on 'Save view point' button. It gets current view point from the engine,
     * adds typed description, saves it in database, then saves all current notes to saved view point,
     * then adds this viewpoint to current view points and then renders them in the side menu.
     */
    onViewPointSaveClick() {
        this.saveViewPoint(this.interface.viewPointModal.descriptionInput.value)
            .then( (savedViewPoint) => {
                this.renderViewpointsList();
                this.withPreparedLocalPointsList( /**String[]*/ list =>{list.push(savedViewPoint.pk.toString())});
                const notesToSave = this.currentNotes.slice(
                    this.engine.viewPoint ? this.engine.viewPoint.notes.length : 0
                );
                savedViewPoint.notes = notesToSave;
                console.dir(notesToSave);
                this.viewPointsList.push( savedViewPoint );
                notesToSave.forEach( async ( /**Note*/ note) => {
                    note.view_point = savedViewPoint.url;
                    await this.apiService.addNote( note );
                });
                this.clearNotes();
                this.interface.viewPointModal.descriptionInput.value = '';
                navigator.clipboard.writeText(savedViewPoint.viewer_url)
                    .then( () => {
                        this.interface.viewPointToast.show();
                    });
            });
    }

    /**
     * Executes export to Navisworks of current locally saved view points. It downloads a file taken from backend
     * as a result.
     *
     * @return {Promise<void>} Fulfilled when an XML file with view points has been received from backend.
     */
    async onViewPointsExportClick() {
        const key = this.engine.model.building.slug;
        let keyString = localStorage.getItem( key );
        await this.apiService.exportViewpointsByPKString( keyString );
    }

    /**
     * Executes import of given XML file with Navisworks viewpoints.
     */
    onViewPointsImportClick() {
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

    /**
     * Method called to apply a view point. If a view point wasn't passed, it sets default view.
     *
     * @param { ViewPoint } viewPoint View point that should be applied.
     */
    setViewPoint( viewPoint ) {
        // Method that called to apply a viewpoint, it handles both view and clipping
        if (viewPoint) {
            this.engine.setViewFromViewPoint( viewPoint );
            this.currentNotes = [...viewPoint.notes];
            this.controlPanel.setClipping( viewPoint );
            if (viewPoint.description) {
                this.interface.showDescriptionToast( viewPoint.description );
            }
        } else {
            this.engine.setDefaultView();
            this.controlPanel.setClipping();
        }
        this.engine.render();
    }

    /**
     * Called when user wants to cancel entering of a view point.
     */
    onViewPointCancelClick() {
        this.clearNotes();
        this.interface.viewPointModal.descriptionInput.value = '';
    }

    /**
     * Listens to a click on note removal button, then removes it.
     *
     * @param { Object } event
     */
    onViewPointRemoveNote(event) {
        event.stopPropagation();
        let key = event.target.parentElement.getAttribute('key').split('_')[1];
        this.removeNote(this.currentNotes[key]);
        event.target.parentElement.remove();
    }

    /**
     * Clears all notes in scene and in interface
     */
    clearNotes() {
        this.currentNotes.forEach( /**Note*/ note => {
            this.removeNote( note );
        } )
        this.currentNotes = [];
        this.engine.render();
    }

    /**
     * Start to listen for a second click to pick a position of note insertion.
     */
    onNoteSaveClick() {
        setTimeout(() => { this.isWaitingForNote = true; }, 1);
        window.addEventListener( 'click', this.getPositionToInsertNote.bind(this) );
    }

    /**
     * Method that waits for position of note and then inserts it.
     *
     * @param { Object } event Click event.
     * @return {Promise<void>} Promise that is fulfilled when a note was inserted.
     */
    async getPositionToInsertNote( event ) {
        if (this.isWaitingForNote) {
            const position = await this.engine.getFirstIntersectionPosition( event );
            if ( position ) {
                const note = {
                    text: this.interface.noteModal.descriptionInput.value,
                    position: position.toArray(),
                    view_point: undefined,
                    url: undefined,
                };

                this.insertNote( note );

                this.isWaitingForNote = false;
                window.removeEventListener( 'click', this.getPositionToInsertNote );
                this.interface.noteModal.descriptionInput.value = '';
                this.interface.viewPointModal.show();
            }
        }
    }
    /**
     * Function that handles logic of note insertion.
     *
     * @param { Note } note Note object that should be inserted.
     */
    insertNote( note ) {
        this.currentNotes.push( note );
        let pk = '0';
        if (this.engine.viewPoint) {
            pk = this.engine.viewPoint.pk.toString();
        }
        const key = pk + '_' + this.currentNotes.indexOf( note ).toString();
        this.engine.insertNote( note, key );
        this.interface.addNoteToModal( note, key, this.onNoteLabelRemove.bind(this) );
    }

    /**
     * Handles click on deletion button of note label.
     *
     * @param { Object } event Click event.
     */
    onNoteLabelRemove( event ) {
        const key = event.target.parentElement.getAttribute('key').split('_')[1];
        this.removeNote(this.currentNotes[key]);
        this.engine.render();
    }

    /**
     * Method that handles logic of a note deletion.
     *
     * @param { Note } note Note that should be deleted.
     */
    removeNote( note ) {
        const i = this.currentNotes.indexOf( note ).toString();
        let pk = '0';
        if (this.engine.viewPoint) {
            pk = this.engine.viewPoint.pk.toString();
        }
        const key = pk + '_' + i;
        delete this.currentNotes[i];
        this.interface.removeNoteFromModal( key );
        this.engine.removeNote( key );
    }

    /**
     * Method that applies view point on click on each view point button.
     *
     * @param { Object } event Click event on view point button.
     */
    onViewPointClick(event) {
        const key = event.target.getAttribute('key');
        const viewPoint = this.viewPointsList.find( /**ViewPoint*/ point => point.pk.toString() === key);
        let title = this.engine.model.building.kks + '/ Точка обзора ' + viewPoint.pk;
        if ( viewPoint.description ) {
            title = viewPoint.description;
        }
        history.replaceState(null, title, viewPoint.viewer_url);
        document.title = title;
        this.clearNotes();
        this.setViewPoint( viewPoint );
    }

    /**
     * Describes actions on click on view point deletion button.
     *
     * @param { Object } event Click event object.
     */
    onDeleteViewPointClick(event) {
        event.stopPropagation();
        const key = event.target.parentElement.getAttribute('key');
        const viewPointToDelete = this.viewPointsList.find( point => point.pk.toString() === key);
        const index = this.viewPointsList.indexOf(viewPointToDelete);
        this.viewPointsList.splice(index, 1);
        this.withPreparedLocalPointsList((list) => {
            const i = list.indexOf(key);
            list.splice(i, 1);
        });
        this.interface.viewPointDeletionToast.show();
        this.renderViewpointsList();
    }

    /**
     * Wrapper method of 'renderViewpointsList' interface method. Should call it instead of directly call it in the
     * interface object.
     */
    renderViewpointsList() {
        this.interface.renderViewpointsList(
            this.viewPointsList,
            this.onViewPointClick.bind(this),
            this.onDeleteViewPointClick.bind(this),
        )
    }

    /**
     * Method that gets all locally saved view points and sets them as current view point list.
     *
     * @return {Promise<void>} Fulfilled when all view points were fetched.
     */
    async getSavedViewpoints() {
        const pkList = this.getViewPointsKeysList();
        const viewPointsList = [];
        for (let i=0; i<pkList.length; i++) {
            const pk = pkList[i];
            const viewPoint = await this.apiService.getViewPointByPK( pk );
            viewPointsList.push( viewPoint );
        }
        this.viewPointsList = viewPointsList;
        if (this.viewPointsList.length === 0) {
            this.interface.viewPointsCollapseButton.classList.add('disabled');
        }
    }

    /**
     * Method used to save current view point with given description. Does not manage with notes FIXME BTW why doesn't
     *
     * @param { String } description Description of a view point.
     * @return {Promise<ViewPoint>} Promise that is fulfilled by the saved view point.
     */
    async saveViewPoint( description ) {
        const viewPoint = this.engine.getCurrentViewPoint();
        viewPoint.description = description;
        return await this.apiService.addViewPoint( viewPoint );
    }

    //TODO Three methods that should be encapsulated into 'StorageManager' class.
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

}