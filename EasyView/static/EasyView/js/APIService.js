export default class APIService {
    /**
     * A class for an object that handle all communications with API
     *
     * @param { String } APIRootURL Root URL of API it should operate with
     */
    constructor(APIRootURL) {
        this.APIRootURL = APIRootURL;
    }

    // Returns a model by its primary key
    getModelByPK(pk) {
        const url = `${this.APIRootURL}/models/${pk}/`;
        return axios.get(url).then( (response) => {
            const model = response.data;
            this.getObject(model.building).then((result) => {model.building = result});
            return model;
        });
    }

    // Returns all viewpoints
    getViewPoints() {
        const url = `${this.APIRootURL}/view_points/`;
        return axios.get(url).then(response => response.data);
    }

    // Rets a view point by its pk
    getViewPointByPK(pk) {
        const url = `${this.APIRootURL}/view_points/${pk}/`;
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
        const url = `${this.APIRootURL}/view_points/`;
        return axios.post(url, viewPoint).then(result => result.data);
    }

    // Deletes a viewpoint by its pk
    deleteViewPointByPK( pk ) {
        const url = `${this.APIRootURL}/view_points/${pk}/`;
        return axios.delete(url);
    }

    // Adds new note
    addNote(note) {
        const url =`${this.APIRootURL}/notes/`;
        return axios.post(url, note);
    }

    // To viewpoints export
    exportViewpointsByPKString( pk_string ) {
        const url = `${this.APIRootURL}/view_points_export`;
        return axios.get(url, {
            params: {
                viewpoints_pk_list: pk_string,
            },
            responseType: 'blob',
        }).then((response) => {  //TODO move out of here
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'export.xml');
            document.body.appendChild(link);
            link.click();
            link.remove();
        })
    }

    // For viewpoints importing
    importViewPoints( file, model_pk ) {
        const formData = new FormData();
        formData.append('model', model_pk);
        formData.append('file', file);
        const url = `${this.APIRootURL}/view_points_import`;
        return axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then( response => response.data );
    }
}