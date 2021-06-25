import ViewpointManager from "./ViewPointsManager.js";

/**
 * To understand how it works, it should be said that in the structure of loaded HTML there is an element
 * with ID 'settingsElement', that contains settings for this app.
 *
 * First of all, it contains 'api_url' with current root URL of REST API.
 * Then, there is an attribute 'model_pk' with primary key of the model that should be loaded.
 * And it also can contain 'view_point_pk' attribute with primary key of the view point that should be loaded, but it
 * is optional.
 *
 * These attributes are set by Django templates and so they are always there.
 */

// Initialize an app here,
const app = new ViewpointManager();

// then launch.
await app.launch();