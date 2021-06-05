const APIRootURL = document.getElementById('viewer_settings').getAttribute('api_url');

export default class APIService {
    // A class for an object that handle all communications with API

    // Returns a model by its primary key
    getModelByPK(pk) {
        const url = `${APIRootURL}/models/${pk}/`;
        return axios.get(url).then(response => response.data);
    }

    // Returns all viewpoints
    getViewPoints() {
        const url = `${APIRootURL}/view_points/`;
        return axios.get(url).then(response => response.data);
    }

    // Rets a view point by its pk
    getViewPointByPK(pk) {
        const url = `${APIRootURL}/view_points/${pk}/`;
        return axios.get(url).then( (response) => {
            const viewPoint = response.data;
            // A viewpoint contains only URLs to notes, so load all those notes here
            const notes = [];
            viewPoint.notes.forEach( ( noteUrl ) => {
                this.getObject(noteUrl).then(result => notes.push(result));
            } );
            viewPoint.notes = notes;
            return viewPoint;
        });
    }

    // Gets an object by link
    getObject(link) {
        return axios.get(link).then(response => response.data);
    }

    // Deletes an object by link
    deleteObject(link) {
        return axios.delete(link);
    }

    // Adds new viewpoint
    addViewPoint(viewPoint) {
        const url = `${APIRootURL}/view_points/`;
        return axios.post(url, viewPoint).then(result => result.data);
    }

    // Adds new note
    addNote(note) {
        const url =`${APIRootURL}/notes/`;
        return axios.post(url, note);
    }

}