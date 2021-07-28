import APIService from "./APIService.js";
import AppInterface from "./Interface.js";
import Engine from "./Engine.js";

/**
 * An object that describes all logic and reactions related to user actions.
 * It connects API, interface and engine together.
 */
export default class ViewpointManager {
    /**
     * @property { AppInterface } interface_ Current interface of the app.
     * @property { Engine } engine Graphical engine used in the app.
     * @property { APIService } apiService Object that communicates with the API.
     * @property { Note[] } currentNotes Current set of notes.
     */
    constructor() {
        this.interface = new AppInterface();
        this.apiService = new APIService( this.interface.settingsElement.getAttribute('api_url') );
        this.engine = new Engine( this.interface.settingsElement );

        this.currentNotes = [];
        this.viewPointsList = [];
        this.isWaitingForNote = false;
        this.remarkButtons = this.interface.viewPointsMenu.querySelectorAll('.remark');

        this.storage = new LocalStorageManager(this);

        // Bind methods to clicks on different buttons. Don't forget to register a button here if you want it to work.
        this.interface.viewPointModal.openButton.addEventListener( 'click', this.onViewPointOpenClick.bind(this) );
        this.interface.viewPointModal.saveButton.addEventListener( 'click', this.onViewPointSaveClick.bind(this) );
        this.interface.viewPointModal.cancelButton.addEventListener(
            'click',this.onViewPointCancelClick.bind(this)
        );
        this.interface.noteModal.saveButton.addEventListener( 'click', this.onNoteSaveClick.bind(this) );
        this.interface.viewPointsExportButton.addEventListener( 'click', this.onViewPointsExportClick.bind(this) );
        this.interface.viewPointsImportButton.addEventListener( 'click', this.onViewPointsImportClick.bind(this) );
        this.interface.exitButton.addEventListener( 'click', this.onViewPointExit.bind(this) );
        this.interface.remarkToast.sendButton.addEventListener('click', this.onSendResponseClick.bind(this));
        this.remarkButtons.forEach( button => {
            button.addEventListener('click', this.onRemarkClick.bind(this));
        } );
        this.interface.remarkExportButtons.forEach( button => {
            button.addEventListener('click', this.onRemarkExport.bind(this));
        } );
    }

    /**
     * The vital function that launches the app. Loads everything that is needed from the API and starts an engine.
     *
     * @property { ViewPoint } initialViewPoint Initial view point.
     * @return {Promise<void>} Promise fulfilled on successful app load but probably you don't want to care about it.
     */
    async launch() {
        const settings = this.interface.settingsElement;
        const model = await this.apiService.getModelByPK(settings.getAttribute('model_pk'));
        const initialViewPointPK = settings.getAttribute('view_point_pk');
        let initialViewPoint;
        if (initialViewPointPK) {
            initialViewPoint = await this.apiService.getViewPointByPK(initialViewPointPK);
        }
        this.engine.model = model;
        this.engine.loadingManager.onLoad = () => {
            if (initialViewPoint && !initialViewPoint.remark) { //Ignore remarks and don't save them locally.
                this.storage.addViewPoint( initialViewPointPK );
            }
            this.getSavedViewpoints().then( async () => {
                await this.renderViewpointsList();
                this.setViewPoint( initialViewPoint );
                this.interface.removeLoadingScreen();
            });
            this.engine.onWindowResize();
        };
        this.engine.loadModel();
    }
    /**
     * Method to describe actions on click on camera button.
     * Simply shows view point modal.
     */
    onViewPointOpenClick() {
        if (this.engine.viewPoint) {
            this.onViewPointExit();
        }
        this.interface.viewPointModal.show();
    }

    /**
     * Method that handles click on 'Save view point' button. It gets current view point from the engine,
     * adds typed description, saves it in database, then saves all current notes to saved view point,
     * then adds this viewpoint to current view points and then renders them in the side menu.
     */
    onViewPointSaveClick() {
        this.saveViewPoint(this.interface.viewPointModal.descriptionInput.value)
            .then( async (savedViewPoint) => {
                this.storage.addViewPoint( savedViewPoint.pk );
                savedViewPoint.notes = [...this.currentNotes];
                this.viewPointsList.push( savedViewPoint );
                for (const note of savedViewPoint.notes) {
                    if (note) { // because it can contain undefined values after note deletion
                        note.view_point = savedViewPoint.url;
                        await this.apiService.addNote( note );
                    }
                }
                await this.renderViewpointsList();
                this.setViewPoint( savedViewPoint, false, false );
                this.interface.viewPointModal.descriptionInput.value = '';
                await navigator.clipboard.writeText(savedViewPoint.viewer_url)
                this.interface.viewPointToast.show();
                this.interface.applyViewPointSavingEffects();
            });
    }

    /**
     * Executes export to Navisworks of current locally saved view points. It downloads a file taken from backend
     * as a result.
     *
     * @return {Promise<void>} Fulfilled when an XML file with view points has been received from backend.
     */
    async onViewPointsExportClick() {
        await this.apiService.exportViewpointsByPKString( this.storage.getString() );
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
                this.storage.bringList( async list => {
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
     * Method that handles pressing on 'exit view point' button. Escapes current view point, by default hides both
     * remark and view point toasts.
     */
    onViewPointExit() {
        this.clearTitleAndURL();
        this.interface.removeHighlightingFromButton();
        this.interface.hideExitButton();
        this.interface.hideToasts();
        this.clearNotes();
        this.engine.viewPoint = undefined;
    }

    /**
     * Method called to apply a view point. If a view point wasn't passed, it sets default view.
     *
     * @param { ViewPoint } [viewPoint] View point that should be applied. Optional.
     * @param { Boolean } [showToast] Defines if it has to show description toast. Optional, default is true.
     * @param { Boolean } [updateEngine] Defines if the engine should really apply the view point.
     * Optional, default is true.
     */
    setViewPoint( viewPoint, showToast = true, updateEngine = true ) {
        if (viewPoint) {
            if (updateEngine) {
                this.engine.setViewFromViewPoint( viewPoint );
            }
            this.currentNotes = [...viewPoint.notes];
            let description = `Точка обзора ${viewPoint.pk}`;
            if (viewPoint.description) {
                description = viewPoint.description;
            }
            if (showToast) {
                if (viewPoint.remark) {
                    this.interface.showRemarkToast( viewPoint );
                } else {
                    this.interface.showDescriptionToast( description );
                }
            }
            const button = this.interface.viewPointsMenu.querySelectorAll(
                `[key="${viewPoint.pk.toString()}"]`
            );
            if ( button.length === 1 ) {
                this.interface.highlightViewPointButton( button[0] );
            }

            this.setTitleAndURL( viewPoint );

            this.interface.showExitButton();

        } else {
            this.engine.setDefaultView();
        }
    }

    /**
     * Called when user wants to cancel entering of a view point.
     */
    onViewPointCancelClick() {
        this.clearNotes();
        this.stopWaitingForNote();
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
     * Clears all notes in the scene and the interface.
     */
    clearNotes() {
        if (this.currentNotes.length > 0) {
            this.currentNotes.forEach( /**Note*/ note => {
                this.removeNote( note );
            } );
            this.engine.render();
        }
        this.currentNotes = [];
    }

    /**
     * Starts to listen for a second click to pick a position of note insertion.
     */
    onNoteSaveClick() {
        setTimeout(() => { this.isWaitingForNote = true; }, 1);
        const coverElement = this.interface.insertCoverElement();
        if (coverElement) { //Can return void if cover is already there.
            coverElement.addEventListener( 'click', this.getPositionToInsertNote.bind(this) );
        }
    }

    /**
     * Method that waits for position of note and then inserts it.
     *
     * @param { Object } event Click event.
     * @return {Promise<void>} Promise that is fulfilled when a note was inserted.
     */
    async getPositionToInsertNote( event ) {
        if (this.isWaitingForNote) {
            const position = await this.engine.getFirstIntersectionPosition( event, this.interface.navbar );
            if ( position ) {
                const note = {
                    text: this.interface.noteModal.descriptionInput.value,
                    position: position.toArray(),
                    view_point: undefined,
                    url: undefined,
                };

                this.insertNote( note );

                this.stopWaitingForNote();
            } else {
                this.interface.notePickingFailedToast.show();
            }
        }
    }

    /**
     * Actions needed to perform to make it stop to wait for input of note.
     */
    stopWaitingForNote() {
        this.isWaitingForNote = false;
        const cover = document.getElementById('coverElement');
        if (cover) {
            cover.remove();
        }
        this.interface.noteModal.descriptionInput.value = '';
        this.interface.handleSaveNoteButtonState();
        this.interface.viewPointModal.show();
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
        this.engine.render();
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
        delete this.currentNotes[i];  // be careful - currentNotes can contain undefined values after this.
        this.interface.removeNoteFromModal( key );
        this.engine.removeNote( key );
    }

    /**
     * Method that applies view point on click on each view point button.
     *
     * @param { Object } event Click event on view point button.
     */
    onViewPointClick(event) {
        this.interface.hideToasts( this.interface.viewPointDescriptionToast );
        this.clearNotes();
        let key = event.target.getAttribute('key');
        if (!key) {
            key = event.target.parentElement.getAttribute('key');
            if (!key) {
                key = event.target.parentElement.parentElement.getAttribute('key');
            }
        }
        const viewPoint = this.viewPointsList.find( /**ViewPoint*/ point => point.pk.toString() === key);
        this.setViewPoint( viewPoint );
    }

    /**
     * Method that handles clicking on any remark button. Loads remark and then sets it.
     * @param { Object } event Click event object.
     */
    onRemarkClick( event ) {
        this.interface.hideToasts( this.interface.remarkToast );
        this.clearNotes();
        const key = event.target.getAttribute('key');
        this.apiService.getViewPointByPK( key ).then( fetchedViewPoint => {
            this.setViewPoint( fetchedViewPoint );
        } );
    }

    /**
     * Method that handles exporting of remarks to NavisWorks. Collects all keys of remarks and then exports them.
     *
     * @param { Object } event Generated click event object.
     */
    onRemarkExport( event ) {
        const listElements = event.target.parentElement.parentElement.children;
        const listOfKeys = [];
        for (let i=0; i < listElements.length - 1; i++) {
            const key = listElements[i].getAttribute('key');
            if (key) {
                listOfKeys.push(key);
            }
        }
        const stringOfKeys = listOfKeys.join(',');
        this.apiService.exportViewpointsByPKString( stringOfKeys );
    }

    /**
     * Describes actions on click on view point deletion button.
     * We have to delete it from current view points, from local storage, then we rerender viewpoint buttons.
     * Note that we should not delete it actually in database.
     *
     * @param { Object } event Click event object.
     */
    onDeleteViewPointClick(event) {
        event.stopPropagation();  //It will cause click event on the hosting view point button element otherwise
        const mainElement = event.target.parentElement.parentElement;
        const key = mainElement.getAttribute('key');
        const viewPointToDelete = this.viewPointsList.find(point => point.pk.toString() === key);
        const index = this.viewPointsList.indexOf(viewPointToDelete);
        this.viewPointsList.splice(index, 1);
        this.storage.removeViewPoint(viewPointToDelete);
        this.interface.viewPointDeletionToast.show();
        mainElement.remove();
        this.checkIfViewPointsAreEmpty();
        // This block replaces current browser URL if it points on deleted view point
        const currentUrlArray = window.location.href.split('/');
        if (currentUrlArray[currentUrlArray.length - 1] === viewPointToDelete.pk.toString()) {
            this.onViewPointExit();
        }
    }

    /**
     * Handles clicking on 'send response' button.
     */
    onSendResponseClick() {
        this.onViewPointExit();
        this.interface.remarkToast.hide();
        this.interface.remarkToast.responseText.value = '';
        this.interface.remarkToast.sendButton.classList.add('disabled');
        this.interface.isResponseButtonEnabled = false;
        this.interface.responseToast.show();
    }

    /**
     * Method that sets title and current url of the page off given view point.
     * @param { ViewPoint } viewPoint view point to set URL/title from.
     */
    setTitleAndURL( viewPoint ) {
        let title = this.engine.model.building.kks + '/ Точка обзора ' + viewPoint.pk;
        if ( viewPoint.description ) {
            title = viewPoint.description;
        }
        history.replaceState(null, title, viewPoint.viewer_url);
        document.title = title;
    }

    /**
     * Method that clears title and current url of page, making it default.
     */
    clearTitleAndURL() {
        const currentUrlArray = window.location.href.split('/');
        currentUrlArray.pop();
        const newURL = currentUrlArray.join('/');
        const title = this.engine.model.building.kks.toString();
        history.replaceState( null, title, newURL );
        document.title = title;
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
        );
        this.checkIfViewPointsAreEmpty();
    }

    /**
     * Method that checks if the list of view points is empty, and makes interface changes if necessary.
     */
    checkIfViewPointsAreEmpty() {
        if (this.viewPointsList.length === 0) {
            this.interface.insertNoViewPointsSign();  // Return to initial state when it doesn't have any buttons
            if (!this.interface.isExportDisabled) {   // Disable export button if it wasn't
                this.interface.toggleExportButton();
            }
        } else {
            if (this.interface.isExportDisabled) {    // Enable export button if it is disabled
                this.interface.toggleExportButton();
            }
        }
    }

    /**
     * Method that gets all locally saved view points and sets them as current view point list.
     *
     * @return {Promise<void>} Fulfilled when all view points were fetched.
     */
    async getSavedViewpoints() {
        const pkList = this.storage.getList();
        const promises = pkList.map( pk => this.apiService.getViewPointByPK( pk ) );
        this.viewPointsList = await Promise.all(promises);
    }

    /**
     * Method used to save current view point with given description. Does not manage with notes.
     *
     * @param { String } description Description of a view point.
     * @return {Promise<ViewPoint>} Promise that is fulfilled by the saved view point.
     */
    async saveViewPoint( description ) {
        const viewPoint = this.engine.getCurrentViewPoint();
        viewPoint.description = description;
        return await this.apiService.addViewPoint( viewPoint );
    }
}

/**
 * Manages local storage. Saves current saved viewpoints, allows interface to easily add and remove
 * values stored there.
 */
class LocalStorageManager {
    /**
     * @param { ViewpointManager } pointManager
     */
    constructor( pointManager ) {
        this.pointManager = pointManager;
    }

    /**
     * Saves given view point to local storage. If it is already there, it just passes.
     *
     * @param { String } pk View point's pk that should be saved.
     */
    addViewPoint( pk ) {
        this.bringList( list => {
            if (pk && !list.includes( pk )) {
                list.push( pk );
            }
        } );
    }

    /**
     * Removes saved view point. If it wasn't there, fails silently.
     *
     * @param { ViewPoint } viewPoint View point that should be removed.
     */
    removeViewPoint( viewPoint ) {
        this.bringList( list => {
            list.splice( list.indexOf( viewPoint.pk.toString() ), 1 );
        } );
    }

    /**
     * Works like a Python decorator, extracts list of keys, executes given function on that and then saves back.
     *
     * @param { function } func Function that should be executed on pks list.
     */
    bringList( func ) {
        let keyList = this.getList();
        func( keyList );
        this.saveList( keyList );
    }

    /**
     * Allows to get an array of pks of saved viewpoints for current model
     *
     * @return { String[] } An array with pks of saved view points as strings.
     */
    getList() {
        let keyList =[];
        let keyString = this.getString();
        if ( keyString ) {
            keyList = keyString.split( ',' );
        }
        return keyList;
    }

    /**
     * Saves given array of pks to local storage for current model.
     *
     * @param { String[] } list List of view points' primary keys that should be saved.
     */
    saveList( list ) {
        const key = this.pointManager.engine.model.building.slug;
        const value = list.join( ',' );
        localStorage.setItem( key, value );
    }

    /**
     * Brings raw key string.
     *
     * @return { String } String with comma-separated numbers of current saved view points.
     */
    getString() {
        const key = this.pointManager.engine.model.building.slug;
        return localStorage.getItem( key );
    }
}