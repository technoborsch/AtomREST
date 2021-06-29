//This whole file is just to apply JS to the index page, when the main JS of viewer wasn't loaded.

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openbtn');
    const sidebarMenu = document.getElementById("sidebarMenu");
    openBtn.addEventListener('click', handleSidebarToggling);

    /**
     * Copied method of AppInterface to make it work standalone. Just toggles navigational sidebar.
     */
    function handleSidebarToggling() {
        sidebarMenu.classList.toggle("sidebar-shifted");
        openBtn.classList.toggle("openbtn-pressed");
    }
});