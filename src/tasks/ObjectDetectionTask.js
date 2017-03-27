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

const fs = require('fs');
const path = require('path');
const {
    Task,
    Modal,
    Grid,
    FolderSelector,
    ButtonsContainer,
    input,
    util,
    gui
} = require('electrongui');
const ChildProcess = require('child_process').ChildProcess;
const {
    dialog
} = require('electron').remote;

class ObjectDetectionTask extends Task {

    constructor(details, mode, imagejext) {
        let name = "ImageJ Object Detector";
        super(name, details);
        this.imageJExtension = imagejext;
        this.macro = "ObjectDetector";
        this.mode = mode;
        this.jsonFile = null;
        this.childProcess = null;
    }

    run(runPath) {
        super.run();
        this.showModal((modal, params) => {
            let args = `${this.mode}#${runPath}#${params.rmin}#${params.rmax}#${params.by}#${params.thrMethod}#${params.min}#${params.max}#${params.fraction}#${params.toll}#${params.path}`;
            let layerType = `points`;
            let tot=0;
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
                let promise = new Promise((resolve) => {
                    let notification;
                    if (code == 0) {
                        util.Layers.createJSONConfiguration(runPath, params.path, this.mode, layerType, (config) => {
                            let jsonPath = `${params.path}${path.sep}points${path.sep}${config.name}.json`;
                            fs.writeFile(jsonPath, JSON.stringify(config, null, 2), (err) => {
                                if (err) {
                                    notification = `Can't save JSON configuration file! Error: ${err}`;
                                } else {
                                    notification = `Object detection task (${this.details}) completed`;
                                    this.jsonFile = jsonPath;
                                }
                                resolve(notification);
                            });
                        });
                        this.success();
                    } else if (code == 1) {
                        notification = `Object detection task (${this.details}) failed.`;
                        this.fail("Problems with JVM...");
                        resolve(notification);
                    } else {
                        notification = `Object detection task (${this.details}) cancelled`;
                        this.cancel();
                        resolve(notification);
                    }
                });

                promise.then((notification) => {
                    util.notifyOS(notification);
                    gui.notify(notification);
                });
            });

            this.childProcess.on('error', (err) => {
                this.fail(err);
                util.notifyOS(`Object detection exec error: ${err}`);
            });

            gui.notify(`Object detection task started.`);
            modal.destroy();
        });
    }

    success() {
        this.customAction["caption"] = "Add layer to a map in workspace";
        this.customAction["onclick"] = () => {
            Task.Utils.showMapSelector(this.jsonFile);
        };
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

    showModal(next) {
        var modal = new Modal({
            title: "Object detection options",
            height: "auto"
        });

        let body = document.createElement("DIV");
        let grid = new Grid(9, 2);

        let numRMin = input.input({
            type: "number",
            id: "numrmin",
            value: "1",
            min: "1",
            max: "15"
        });
        let lblRMin = document.createElement("LABEL");
        lblRMin.htmlFor = "numrmin";
        lblRMin.innerHTML = "Minimum radius: ";
        grid.addElement(lblRMin, 0, 0);
        grid.addElement(numRMin, 0, 1);

        let numRMax = input.input({
            type: "number",
            id: "numrmax",
            value: "5",
            min: "1",
            max: "15"
        });
        let lblRMax = document.createElement("LABEL");
        lblRMax.htmlFor = "numrmax";
        lblRMax.innerHTML = "Maximum radius: ";
        grid.addElement(lblRMax, 1, 0);
        grid.addElement(numRMax, 1, 1);

        let numBy = input.input({
            type: "number",
            id: "numby",
            value: "1",
            min: "0"
        });
        let lblBy = document.createElement("LABEL");
        lblBy.htmlFor = "numby";
        lblBy.innerHTML = "By: ";
        grid.addElement(lblBy, 2, 0);
        grid.addElement(numBy, 2, 1);

        let selThrMethod = input.selectInput({
            label: "Threshold method",
            choices: [
                "Default",
                "Huang",
                "Intermodes",
                "IsoData",
                "Li",
                "MaxEntropy",
                "Mean",
                "MinError(I)",
                "Minimum",
                "Moments",
                "Otsu",
                "Percentile",
                "RenyiEntropy",
                "Shambhag",
                "Triangle",
                "Yen"
            ],
            className: "simple form-control",
            value: "Moments"
        });
        let lblThrMethod = document.createElement("LABEL");
        lblThrMethod.htmlFor = "selthrmethod";
        lblThrMethod.innerHTML = "Threshold method: ";
        grid.addElement(lblThrMethod, 3, 0);
        grid.addElement(selThrMethod, 3, 1);

        let numMin = input.input({
            type: "number",
            id: "nummin",
            value: "1",
            min: "0"
        });
        let lblMin = document.createElement("LABEL");
        lblMin.htmlFor = "nummin";
        lblMin.innerHTML = "Minimum: ";
        grid.addElement(lblMin, 4, 0);
        grid.addElement(numMin, 4, 1);

        let numMax = input.input({
            type: "number",
            id: "nummax",
            value: "-1",
            min: "-1"
        });
        let lblMax = document.createElement("LABEL");
        lblMax.htmlFor = "nummax";
        lblMax.innerHTML = "Maximum: ";
        grid.addElement(lblMax, 5, 0);
        grid.addElement(numMax, 5, 1);

        let numFraction = input.input({
            type: "number",
            id: "numfraction",
            value: "0.500",
            min: "0",
            max: "1",
            step: "0.001"
        });
        let lblFraction = document.createElement("LABEL");
        lblFraction.htmlFor = "numfraction";
        lblFraction.innerHTML = "Fraction: ";
        grid.addElement(lblFraction, 6, 0);
        grid.addElement(numFraction, 6, 1);

        let numToll = input.input({
            type: "number",
            id: "numtoll",
            value: "0",
            min: "0"
        });
        let lblToll = document.createElement("LABEL");
        lblToll.htmlFor = "numtoll";
        lblToll.innerHTML = "Tolerance: ";
        grid.addElement(lblToll, 7, 0);
        grid.addElement(numToll, 7, 1);

        let fldOutputFolder = new FolderSelector("fileoutputfolder");
        let lblOutputFolder = document.createElement("LABEL");
        lblOutputFolder.htmlFor = "fileoutputfolder";
        lblOutputFolder.innerHTML = "Output folder: ";
        grid.addElement(lblOutputFolder, 8, 0);
        grid.addElement(fldOutputFolder.element, 8, 1);

        let buttonsContainer = new ButtonsContainer(document.createElement("DIV"));
        buttonsContainer.addButton({
            id: "CancelDetection00",
            text: "Cancel",
            action: () => {
                this.cancel();
                modal.destroy();
            },
            className: "btn-default"
        });
        buttonsContainer.addButton({
            id: "OkDetection00",
            text: "Ok",
            action: () => {
                if (typeof next === 'function') {
                    if (fldOutputFolder.getFolderRoute()) {
                        let params = {
                            rmin: numRMin.value || "[]",
                            rmax: numRMax.value || "[]",
                            by: numBy.value || "[]",
                            thrMethod: selThrMethod.value,
                            min: numMin.value || "[]",
                            max: numMax.value || "[]",
                            fraction: numFraction.value || "[]",
                            toll: numToll.value || "[]",
                            path: fldOutputFolder.getFolderRoute()
                        }
                        next(modal, params);
                    } else {
                        dialog.showErrorBox("Can't detect objects", "You must choose an output folder where results will be saved.");
                    }
                }
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

module.exports = ObjectDetectionTask;
