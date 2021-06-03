const APIRootURL = "http://127.0.0.1:8000/v1";

export default class APIService {

    constructor(model, camera, controls, clipPlanes) {
        this.model = model;
        this.camera = camera;
        this.controls = controls;
        this.clipPlanes = clipPlanes;
    }

    //returns a model by its primary key
    getModelByPK(pk) {
        const url = `${APIRootURL}/models/${pk}/`;
        return axios.get(url).then(response => response.data);
    }

    //returns all viewpoints
    getViewPoints() {
        const url = `${APIRootURL}/view_points/`;
        return axios.get(url).then(response => response.data);
    }

    //gets a view point by its pk
    getViewPointByPK(pk) {
        const url = `${APIRootURL}/view_points/${pk}/`;
        return axios.get(url).then(response => response.data);
    }

    //gets an object by link
    getObject(link) {
        return axios.get(link).then(response => response.data);
    }

    //deletes an object by link
    deleteObject(link) {
        return axios.delete(link);
    }

    //adds new viewpoint
    addViewPoint(viewPoint) {
        const url = `${APIRootURL}/view_points/`;
        return axios.post(url, viewPoint).then(result => result.data);
    }

    //adds new note
    addNote(note) {
        const url =`${APIRootURL}/notes/`;
        return axios.post(url, note);
    }

    //the function saves a viewpoint
    async saveViewPoint(description) {
        console.dir(this);
        const distance = this.camera.position.distanceTo( this.controls.target );
        const view_point = {
            position: this.camera.position.toArray(),
            quaternion: this.camera.quaternion.toArray(),
            distance_to_target: distance,
            clip_constants: [
                this.clipPlanes[0].constant, - this.clipPlanes[1].constant,
                this.clipPlanes[2].constant, - this.clipPlanes[3].constant,
                this.clipPlanes[4].constant, - this.clipPlanes[5].constant
            ],
            model: this.model.url,
            description: description,
        }
        console.dir(view_point);
        return await this.addViewPoint(view_point);
    }
}