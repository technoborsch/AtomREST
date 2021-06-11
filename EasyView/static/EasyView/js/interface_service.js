
document.addEventListener("DOMContentLoaded",() => {

    let sidebarOpen = false;
    const openBtn = document.getElementById('openbtn');
    const sideBarCollapseButtons = document.querySelectorAll('div button.list-group-item');
    sideBarCollapseButtons.forEach( (node) => {
            node.addEventListener("click", function () {
                    node.firstChild.nextSibling.classList.toggle('rotated');
                }
            );
        }
    );

    openBtn.addEventListener("click", () => {
        if (sidebarOpen) {
            closeNav();
            sidebarOpen = !sidebarOpen;
        } else {
            openNav();
            sidebarOpen = !sidebarOpen;
        }
        if (viewpointsMenuOpen) {
            viewpointsMenuToggleButton.click();
        }
    });

    /* Change classes to shifted position */
    function openNav() {
      document.getElementById("sidebarMenu").classList.add("sidebar-shifted");
      document.getElementById("openbtn").classList.add("openbtn-pressed");
    }

    /* Change classes to default position */
    function closeNav() {
      document.getElementById("sidebarMenu").classList.remove("sidebar-shifted");
      document.getElementById("openbtn").classList.remove("openbtn-pressed");
    }

    //it controls behavior of 'save note' button
    let buttonEnabled = false;
    const noteTextInput = document.getElementById('noteTextInput');
    const saveNoteButton = document.getElementById('saveNote');
    if (noteTextInput) {
        noteTextInput.addEventListener('input', handleSaveNoteButtonState);
    }

    function handleSaveNoteButtonState() {
        if ((noteTextInput.value && !buttonEnabled) || (!noteTextInput.value && buttonEnabled)) {
            saveNoteButton.classList.toggle('disabled');
            buttonEnabled = !buttonEnabled;
        }
    }

    let viewpointsMenuOpen = false;

    const viewpointsMenuToggleButton = document.getElementById('viewpointsMenuToggleButton');
    if (viewpointsMenuToggleButton) {
        viewpointsMenuToggleButton.addEventListener('click', handleViewpointMenuToggle);
    }

    function handleViewpointMenuToggle() {
        if (!viewpointsMenuOpen) {
            document.getElementById('viewpointsMenu').classList.add('sidebar-shifted');
            document.getElementById('btnPlacer').classList.add('button-placer-shifted');
            document.getElementById('viewpointsMenuToggleButton').firstChild.nextSibling.classList.add('rotated');
        } else {
            document.getElementById('viewpointsMenu').classList.remove('sidebar-shifted');
            document.getElementById('btnPlacer').classList.remove('button-placer-shifted');
            document.getElementById('viewpointsMenuToggleButton').firstChild.nextSibling.classList.remove('rotated');
        }
        viewpointsMenuOpen = !viewpointsMenuOpen;
    }

});
