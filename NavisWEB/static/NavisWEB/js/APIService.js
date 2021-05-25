const APIRootURL = "http://127.0.0.1:8000/v1";

export default class APIService {

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

}