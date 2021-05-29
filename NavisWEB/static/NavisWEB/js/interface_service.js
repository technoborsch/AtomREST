
document.addEventListener("DOMContentLoaded",() => {

    let sidebarOpen = false;
    const openBtn = document.getElementById('openbtn');
    const sideBarCollapseButtons = document.querySelectorAll('#sidebarMenu button.list-group-item');
    sideBarCollapseButtons.forEach(function (node) {
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
    });

    /* Change classes to shifted position */
    function openNav() {
      document.getElementById("sidebarMenu").classList.add("sidebar-shifted");
      document.getElementById("main").classList.add("main-shifted");
      document.getElementById("openbtn").classList.add("openbtn-pressed");
    }

    /* Change classes to default position */
    function closeNav() {
      document.getElementById("sidebarMenu").classList.remove("sidebar-shifted");
      document.getElementById("main").classList.remove("main-shifted");
      document.getElementById("openbtn").classList.remove("openbtn-pressed");
    }

    //it controls behavior of 'save note' button
    let buttonEnabled = false;
    const noteTextInput = document.getElementById('noteTextInput');
    const saveNoteButton = document.getElementById('saveNote');
    noteTextInput.addEventListener('input', handleSaveNoteButtonState);

    function handleSaveNoteButtonState() {
        if ((noteTextInput.value && !buttonEnabled) || (!noteTextInput.value && buttonEnabled)) {
            saveNoteButton.classList.toggle('disabled');
            buttonEnabled = !buttonEnabled;
        }
    }

});
