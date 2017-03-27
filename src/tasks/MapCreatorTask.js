/**
 * @author : Mario Juez (mario@mjuez.com)
 *
 * @license: GPL v3
 *     This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const sanitize = require("sanitize-filename");
const path = require('path');
const {
    Task,
    Modal,
    Input,
    Grid,
    FolderSelector,
    ButtonsContainer,
    util,
    gui
} = require('electrongui');
const ChildProcess = require('child_process').ChildProcess;
const {
    dialog
} = require('electron').remote;

class MapCreatorTask extends Task {

    constructor(details, isMap, isFolder, imagejext) {
        let name = "ImageJ MapCreator";
        super(name, details);
        this.imageJExtension = imagejext;
        this.macro = "MapCreator";
        this.isMap = isMap;
        this.isFolder = isFolder;
        this.jsonFile = null;
        this.childProcess = null;
    }

    run(runPath) {
        super.run();
        this.showModal(runPath, (modal, params) => {
            let use = "";
            let create = "";
            if (params.use) use = "use ";
            if (this.isMap) create = "create ";
            let args = `${this.isFolder}#${params.initialSlice}#${params.lastSlice}#${params.scale}#${runPath}#map=[${params.map}] pixel=${params.pixel} maximum=${params.maximum} slice=${params.slice} ${use}${create}choose=${params.path}#${params.merge}`;
            this.childProcess = this.imageJExtension.run(this.macro, args);
            this.childProcess.stdout.setEncoding('utf8');
            this.childProcess.stdout.on('data', (data) => {
                let regex = /[0-9]+\/[0-9]+/g;
                if (regex.test(data)) {
                    let progress = data.split("/");
                    let percentage = (progress[0] * 100) / progress[1];
                    this.updateProgress(percentage);
                }
            });

            this.childProcess.stderr.on('data', (data) => {
                console.log('stderr: ' + data);
            });

            this.childProcess.on('close', (code) => {
                let notification;
                if (code == 0) {
                    notification = `Map creator task (${this.details}) completed`;
                    if (this.isMap) {
                        this.jsonFile = path.join(params.path, params.map, `${params.map}.json`);
                    } else {
                        this.jsonFile = path.join(params.path, params.map, `${params.map}_tiles`, `${params.map}_tiles.json`);
                    }
                    this.success();
                } else if (code == 1) {
                    notification = `Map creator task (${this.details}) failed.`;
                    this.fail("Problems with JVM...");
                } else {
                    notification = `Map creator task (${this.details}) cancelled.`;
                    this.cancel();
                }
                util.notifyOS(notification);
                gui.notify(notification);
            });

            this.childProcess.on('error', (err) => {
                this.fail(err);
                util.notifyOS(`Map creator exec error: ${err}`);
            });

            gui.notify(`MapCreator task started.`);
            modal.destroy();
        });
    }

    success() {
        if (this.isMap) {
            this.customAction["caption"] = "Load map to workspace";
            this.customAction["onclick"] = () => {
              gui.extensions.mapPage.loadMap(this.jsonFile);
            };
        } else {
            this.customAction["caption"] = "Add layer to a map in workspace";
            this.customAction["onclick"] = () => {
                Task.Utils.showMapSelector(this.jsonFile);
            };
        }
        return super.success();
    }

    cancel() {
        if (super.cancel()) {
            if (this.childProcess instanceof ChildProcess) {
                this.childProcess.kill();
            }
            return true;
        }
        return false;
    }

    showModal(imagePath, next) {
        let numSlices = util.Image.getTotalSlices(imagePath);

        var modal = new Modal({
            title: "Map creator options",
            height: "auto"
        });

        let body = document.createElement("DIV");
        body.className = "padded";


        let maxSlices = numSlices;

        let stackFieldSet = document.createElement("FIELDSET");
        let stackLegend = document.createElement("LEGEND");
        stackLegend.innerHTML = "Image combination parameters";
        stackFieldSet.appendChild(stackLegend);

        let stackGrid = new Grid(3, 2);
        let numInitialSlice = Input.input({
            type: "number",
            id: "numinitialslice",
            value: "1",
            min: "1",
            max: maxSlices
        });
        let lblInitialSlice = document.createElement("LABEL");
        lblInitialSlice.htmlFor = "numinitialslice";
        lblInitialSlice.innerHTML = "Initial slice:";
        stackGrid.addElement(lblInitialSlice, 0, 0);
        stackGrid.addElement(numInitialSlice, 0, 1);

        let numLastSlice = Input.input({
            type: "number",
            id: "numlastslice",
            value: "1",
            min: "1",
            max: maxSlices
        });
        let lblLastSlice = document.createElement("LABEL");
        lblLastSlice.htmlFor = "numlastslice";
        lblLastSlice.innerHTML = "Last slice:";
        stackGrid.addElement(lblLastSlice, 1, 0);
        stackGrid.addElement(numLastSlice, 1, 1);

        let numScale = Input.input({
            type: "number",
            id: "numscale",
            value: "1.000",
            min: "0",
            max: "1",
            step: "0.001"
        });
        let lblScale = document.createElement("LABEL");
        lblScale.htmlFor = "numscale";
        lblScale.innerHTML = "Scale:";
        stackGrid.addElement(lblScale, 2, 0);
        stackGrid.addElement(numScale, 2, 1);

        let calcNumSlices = () => {
            if (numLastSlice.value >= numInitialSlice.value) {
                numSlices = numLastSlice.value - numInitialSlice.value + 1;
            }
        };

        numInitialSlice.onchange = calcNumSlices;
        numLastSlice.onchange = calcNumSlices;

        stackFieldSet.appendChild(stackGrid.element);

        if (this.isFolder) body.appendChild(stackFieldSet);

        let mapFieldSet = document.createElement("FIELDSET");
        let mapLegend = document.createElement("LEGEND");
        mapLegend.innerHTML = "Map parameters";
        mapFieldSet.appendChild(mapLegend);

        let mapGrid = new Grid(7, 2);
        let txtMapName = Input.input({
            type: "text",
            id: "txtmapname",
            value: `${sanitize(path.basename(imagePath).replace(/\.[^/.]+$/, ''))}`,
            oninput: () => {
                txtMapName.value = sanitize(txtMapName.value);
            }
        });
        let lblMapName = document.createElement("LABEL");
        lblMapName.htmlFor = "txtmapname";
        lblMapName.innerHTML = "Map name: ";
        mapGrid.addElement(lblMapName, 0, 0);
        mapGrid.addElement(txtMapName, 0, 1);

        let txtPixelTiles = Input.input({
            type: "text",
            id: "txtpixeltiles",
            value: "256"
        });
        let lblPixelTiles = document.createElement("LABEL");
        lblPixelTiles.htmlFor = "txtpixeltiles";
        lblPixelTiles.innerHTML = "Pixel tiles dimension: ";
        mapGrid.addElement(lblPixelTiles, 1, 0);
        mapGrid.addElement(txtPixelTiles, 1, 1);

        let numMaximumZoom = Input.input({
            type: "number",
            id: "nummaximumzoom",
            value: "5",
            min: "0",
            max: "8"
        });
        let lblMaximumZoom = document.createElement("LABEL");
        lblMaximumZoom.htmlFor = "nummaximumzoom";
        lblMaximumZoom.innerHTML = "Maximum zoom: ";
        mapGrid.addElement(lblMaximumZoom, 2, 0);
        mapGrid.addElement(numMaximumZoom, 2, 1);

        let checkUseAllSlice = Input.input({
            type: "checkbox",
            id: "useallslice",
            onchange: (e) => {
                checkMergeAllSlices.disabled = checkUseAllSlice.checked;
                numUsedSlice.disabled = checkUseAllSlice.checked;
            }
        });
        let lblUseAllSlice = document.createElement("LABEL");
        lblUseAllSlice.htmlFor = "useallslice";
        lblUseAllSlice.innerHTML = "Use all slice: ";
        mapGrid.addElement(lblUseAllSlice, 3, 0);
        mapGrid.addElement(checkUseAllSlice, 3, 1);

        let checkMergeAllSlices = Input.input({
            type: "checkbox",
            id: "mergeallslices",
            onchange: (e) => {
                checkUseAllSlice.disabled = checkMergeAllSlices.checked;
                numUsedSlice.disabled = checkMergeAllSlices.checked;
            }
        });
        let lblMergeAllSlices = document.createElement("LABEL");
        lblMergeAllSlices.htmlFor = "mergeallslices";
        lblMergeAllSlices.innerHTML = "Merge all slices: ";
        mapGrid.addElement(lblMergeAllSlices, 4, 0);
        mapGrid.addElement(checkMergeAllSlices, 4, 1);

        if (numSlices == 1) {
            checkMergeAllSlices.disabled = true;
            checkUseAllSlice.disabled = true;
        }

        let numUsedSlice = Input.input({
            type: "number",
            id: "numusedslice",
            value: "1",
            min: "1",
            max: numSlices
        });
        let lblUsedSlice = document.createElement("LABEL");
        lblUsedSlice.htmlFor = "numusedslice";
        lblUsedSlice.innerHTML = "Slice to be used: ";
        mapGrid.addElement(lblUsedSlice, 5, 0);
        mapGrid.addElement(numUsedSlice, 5, 1);

        let fldOutputFolder = new FolderSelector("fileoutputfolder");
        let lblOutputFolder = document.createElement("LABEL");
        lblOutputFolder.htmlFor = "fileoutputfolder";
        lblOutputFolder.innerHTML = "Output folder: ";
        mapGrid.addElement(lblOutputFolder, 6, 0);
        mapGrid.addElement(fldOutputFolder.element, 6, 1);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "CancelMap00",
            text: "Cancel",
            action: () => {
                this.cancel();
                modal.destroy();
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "CreateMap00",
            text: "Create",
            action: () => {
                if (typeof next === 'function') {
                    if (fldOutputFolder.getFolderRoute()) {
                        let params = {
                            initialSlice: numInitialSlice.value || "[]",
                            lastSlice: numLastSlice.value || "[]",
                            scale: numScale.value || "[]",
                            map: sanitize(txtMapName.value) || "[]",
                            pixel: txtPixelTiles.value || "[]",
                            maximum: numMaximumZoom.value || "[]",
                            slice: numUsedSlice.value || "[]",
                            use: checkUseAllSlice.checked,
                            merge: checkMergeAllSlices.checked,
                            path: fldOutputFolder.getFolderRoute()
                        }
                        next(modal, params);
                    } else {
                        dialog.showErrorBox("Can't create map", "You must choose an output folder.");
                    }
                }
            },
            className: "btn-default"
        });
        let footer = document.createElement('DIV');
        footer.appendChild(buttonsContainer.element);

        if (this.isFolder) {
            mapFieldSet.appendChild(mapGrid.element);
            body.appendChild(mapFieldSet);
        } else {
            body.appendChild(mapGrid.element);
        }

        modal.addBody(body);
        modal.addFooter(footer);
        modal.show();
    }

}

module.exports = MapCreatorTask;
