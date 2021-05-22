import axios from "../../axios/index.js";

const APIRootURL = "http://127.0.0.1:8000/v1";

export default class APIService {

    constructor() {}

    //returns a model by its primary key
    getModel(pk) {
        const url = `${APIRootURL}/models/${pk}`;
        return axios.get(url).then(response => response.data);
    }

    //returns all viewpoints
    getViewPoints() {
        const url = `${APIRootURL}/view_points/`;
        return axios.get(url).then(response => response.data);
    }

    //returns a viewpoint by link
    getViewPoint(link) {
        const url = `${APIRootURL}${link}`;
        return axios.get(url).then(response => response.data);
    }

    //deletes a viewpoint by link
    deleteViewPoint(link) {
        const url = `${APIRootURL}${link}`;
        return axios.delete(url);
    }

}