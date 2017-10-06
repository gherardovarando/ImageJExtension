
const {
    task,
    Modal,
    Grid,
    input,
    ButtonsContainer
} = require('electrongui');


/**
 * Task static utilities.
 */
TaskUtils = class {

    /**
     * Shows map selector modal window for adding a layer to it.
     *
     * @param {string} jsonFile - Layer JSON File path.
     */
    static showMapSelector(jsonFile) {
        var modal = new Modal({
            title: "Choose map:",
            height: "auto"
        });

        let grid = new Grid(1, 2);

        let maps = {};//gui.mapExtension.maps;
        let choices = {};
        if (maps) {
            Object.keys(maps).map((key) => {
                choices[key] = maps[key].name;
            });
        }

        let selMap = input.selectInput({
            label: "Map",
            choices: choices,
            className: "simple form-control"
        });
        let lblMap = document.createElement("LABEL");
        lblMap.innerHTML = "Destination map: ";
        grid.addElement(lblMap, 0, 0);
        grid.addElement(selMap, 0, 1);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "OkCancel00",
            text: "Cancel",
            action: () => {
                modal.destroy();
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "OkAddLayer00",
            text: "Ok",
            action: () => {
                if (jsonFile && Object.keys(maps).length) {
                    //gui.mapExtension.mapBuilder.setConfiguration(maps[selMap.value]);
                    //gui.mapExtension.addLayerFile(jsonFile);
                    let selected = selMap.options[selMap.selectedIndex].text;
                    //gui.notify(`Added layer to map ${selected}.`);
                } else {
                    //gui.notify(`Error adding layer.`);
                }
                modal.destroy();
            },
            className: "btn-default"
        });
        let footer = document.createElement('DIV');
        footer.appendChild(buttonsContainer.element);
        modal.addBody(grid.element);
        modal.addFooter(footer);
        modal.show();
    }

}

module.exports = TaskUtils;
