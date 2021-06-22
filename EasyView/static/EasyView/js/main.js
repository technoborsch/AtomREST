import APIService from "./APIService.js";
import ViewpointManager from "./ViewPointsManager.js";
import ControlPanel from "./ControlPanel.js";
import Engine from "./Engine.js";
import AppInterface from "./Interface.js";

// Wrapper to handle API calls
const APIRootURL = document.getElementById('viewer_settings').getAttribute('api_url');
const apiService = new APIService(APIRootURL);

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

// Initialize interface
const interface_ = new AppInterface();

// Initialize viewpoint manager here and bind it to interface, engine and API
const viewpointManager = new ViewpointManager( interface_, engine, controlPanel, apiService );

main()

/**
 * Main logic on load. Everything starts here.
 */
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
