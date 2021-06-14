import APIService from "./APIService.js";
import ViewpointManager from "./ViewPointsManager.js";
import ControlPanel from "./ControlPanel.js";
import Engine from "./Engine.js";

// Wrapper to handle API calls
const apiService = new APIService();

// Get settings here from DOM which were set by django templates
const settingsElement = document.getElementById('viewer_settings');

const model = await apiService.getModelByPK(settingsElement.getAttribute('model_pk'));
const initialViewPointPK = settingsElement.getAttribute('view_point_pk');
let initialViewPoint;
if (initialViewPointPK) {
    initialViewPoint = await apiService.getViewPointByPK(initialViewPointPK);
}

// Initialize an engine
const engine = new Engine( settingsElement );

// Initialize a control panel
const controlPanel = new ControlPanel( engine );

// Initialize viewpoint manager here and bind it to interface, engine and API
const viewpointManager = new ViewpointManager(
    new bootstrap.Modal(document.getElementById('viewPointModal')),
    document.getElementById('cancelViewPoint'),
    document.getElementById('saveViewPoint'),
    document.getElementById('camera'),
    document.getElementById('descriptionInput'),
    document.getElementById( 'notesInsideModal' ),
    new bootstrap.Modal(document.getElementById('noteModal')),
    document.getElementById('saveNote'),
    document.getElementById('note'),
    document.getElementById('noteTextInput'),
    new bootstrap.Toast(document.getElementById('viewPointToast')),
    new bootstrap.Toast(document.getElementById('viewPointDescriptionToast')),
    new bootstrap.Toast(document.getElementById('viewPointDeletionToast')),
    document.getElementById('descriptionText'),
    document.getElementById('viewPointsCollapseButton'),
    document.getElementById( 'pointButtons' ),
    document.getElementById('viewPointsExportButton'),
    engine,
    controlPanel,
    apiService,
);

main()

function main() {
    engine.model = model;
    engine.loadingManager.onLoad = () => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', (event) => {event.target.remove();});
        viewpointManager.setViewPoint( initialViewPoint );
        viewpointManager.getSavedViewpoints().then( () => {
            viewpointManager.renderViewpointsList();
        });
        engine.onWindowResize();
    };
    engine.loadModel( model );
}
