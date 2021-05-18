function send_state(url, key, value) {
    console.log("sending: " + key + ", " + value)
    $.get(
        url,
        {
            "key": key,
            "value": value,
        },
        function (response) {
            console.log(response)
        }
    );
}

$(document).ready(function () {

    let sidebarOpen = false;

    //If click occurs on one of the collapse buttons, send the ajax with unique id to /session/
    //Also saves states of collapsible elements into local storage
    $("button[data-bs-toggle=collapse]").on("click", function () {
        const id_ = $(this).attr("data-bs-target").slice(1);
        if (localStorage.getItem(id_) === "show") {
            console.log("hide " + id_);
            localStorage.removeItem(id_);
            send_state("/session/", "hide", id_);
        }
        else {
            console.log("show " + id_);
            localStorage.setItem(id_, "show");
            send_state("/session/", "show", id_);
        }
    });

    $("#openbtn").on("click", function () {
        if (sidebarOpen) {
            closeNav();
            sidebarOpen = !sidebarOpen;
        } else {
            openNav();
            sidebarOpen = !sidebarOpen;
        }
    });

    /* Set the width of the sidebar to 250px and the left margin of the page content to 250px */
    function openNav() {
      document.getElementById("sidebarMenu").classList.add("sidebar-shifted");
      document.getElementById("main").classList.add("main-shifted");
      document.getElementById("openbtn").classList.add("openbtn-pressed");
    }

    /* Set the width of the sidebar to 0 and the left margin of the page content to 0 */
    function closeNav() {
      document.getElementById("sidebarMenu").classList.remove("sidebar-shifted");
      document.getElementById("main").classList.remove("main-shifted");
      document.getElementById("openbtn").classList.remove("openbtn-pressed");
    }
});
