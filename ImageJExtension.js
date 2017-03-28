/**
 * @author : Mario Juez (mjuez@fi.upm.es)
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

const os = require('os');
const fs = require('fs');
const path = require('path');
const {
    GuiExtension,
    ToggleElement,
    Modal,
    Grid,
    FolderSelector,
    ButtonsContainer,
    TaskManager,
    input,
    util,
    gui
} = require('electrongui');
const {
    dialog,
    Menu,
    MenuItem,
    app
} = require('electron').remote;
const {
    exec,
    spawn
} = require('child_process');
const {
    MapCreatorTask,
    ObjectDetectionTask,
    HolesDetectionTask,
    CropTask
} = require(path.join(__dirname, 'src', 'ImageJTasks'));
const ImageJUtil = require(path.join(__dirname, 'src', 'ImageJUtil'));

/**
 * ImageJ Atlas extension.
 */
class ImageJExtension extends GuiExtension {

    /**
     * Creates an instance of the extension.
     * A menu with all capabilities is defined.
     */
    constructor() {
        super({
            image: path.join(__dirname, "res", "img", "imagej-logo.gif"), // not working
            menuLabel: 'ImageJ',
            menuTemplate: [{
                label: 'Launch ImageJ',
                click: () => {
                    this.launchImageJ();
                }
            }, {
                label: 'Configure ImageJ',
                click: () => {
                    this.configImageJ();
                }
            }, {
                label: 'Map Tools',
                submenu: [
                    {
                        label: "Create map from image",
                        click: () => {
                            this.createMap(true, false);
                        }
                    }, {
                        label: "Create map from folder",
                        click: () => {
                            this.createMap(true, true);
                        }
                    }, {
                        label: "Create layer from image",
                        click: () => {
                            this.createMap(false, false);
                        }
                    }, {
                        label: "Create layer from folder",
                        click: () => {
                            this.createMap(false, true);
                        }
                    }
                ]
            }, {
                label: 'Object Detection',
                submenu: [
                    {
                        label: "Single image",
                        click: () => {
                            this.objectDetection(ImageJUtil.LayersMode.SINGLE_IMAGE);
                        }
                    }, {
                        label: "Folder",
                        click: () => {
                            this.objectDetection(ImageJUtil.LayersMode.FOLDER);
                        }
                    }, {
                        label: "Image list",
                        click: () => {
                            this.objectDetection(ImageJUtil.LayersMode.IMAGE_LIST);
                        }
                    }
                ]
            }, {
                label: 'Holes Detection',
                submenu: [
                    {
                        label: "Single image",
                        click: () => {
                            this.holestDetection(ImageJUtil.LayersMode.SINGLE_IMAGE);
                        }
                    }, {
                        label: "Folder",
                        click: () => {
                            this.holesDetection(ImageJUtil.LayersMode.FOLDER);
                        }
                    }, {
                        label: "Image list",
                        click: () => {
                            this.holesDetection(ImageJUtil.LayersMode.IMAGE_LIST);
                        }
                    }
                ]
            }, {
                label: 'Tools',
                submenu: [
                    {
                        label: "Create mosaic",
                        click: () => {
                            this.cropImage();
                        }
                    }
                ]
            }]
        });
        this.maxMemory = parseInt((os.totalmem() * 0.7) / 1000000);
        this.maxStackMemory = 515;
        this.memory = this.maxMemory;
        this.stackMemory = this.maxStackMemory;
        this.image = path.join(__dirname, "res", "img", "imagej-logo.gif");
        this.imagejpath = path.join(__dirname, "res", "ImageJ");
    }

    /**
     * Activates the extension.
     */
    activate() {
        this.pane = new ToggleElement(document.createElement('DIV'));
        this.pane.element.className = 'pane';
        this.pane.show();
        this.element.appendChild(this.pane.element);
        this.appendMenu();
        super.activate();
    }

    /**
     * Deactivates the extension.
     */
    deactivate() {
        this.removeMenu();
        this.element.removeChild(this.pane.element);
    }

    /**
     * Shows the extension.
     */
    show() {
        super.show();
    }

    /**
     * Launchs a ImageJ instance with configured memory parameters.
     */
    launchImageJ() {
        let childProcess = spawn('java', [`-Xmx${this.memory}m`, `-Xss${this.stackMemory}m`, `-jar`, `ij.jar`], {
            cwd: this.imagejpath,
            stdio: 'ignore'
        });

        util.notifyOS('ImageJ launched.');

        childProcess.on('error', (error) => {
            util.notifyOS(`ImageJ exec error: ${error}`);
        });

        childProcess.on('close', (code) => {
            gui.notify('ImageJ closed');
        });
    }

    /**
     * Runs an ImageJ macro stored inside Atlas folder located in ImageJ macros folder.
     * @param {string} macro Name of the macro to run.
     * @param {string} args Arguments needed by the macro. 
     */
    run(macro, args) {
        return spawn('java', [`-Xmx${this.memory}m`, `-Xss${this.stackMemory}m`, `-jar`, `ij.jar`, `-batchpath`, `Atlas${path.sep}${macro}.ijm`, `${args}`], {
            cwd: this.imagejpath
        });
    }

    /**
     * Opens a dialog asking for a file or folder as source for creating a map or a layer.
     * @param {boolean} isMap If true, we want to create a map, otherwise we want a layer.
     * @param {boolean} isFolder If true, all files of the folder will be used, the user
     * has to choose the image in the left upper corner. Otherwise only selected image will
     * be used.
     */
    createMap(isMap, isFolder) {
        let title = 'Choose image';
        if (isFolder) {
            title += ' in the left-upper corner';
        }

        dialog.showOpenDialog({
            title: title,
            type: 'normal'
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (isMap) {
                    details = `Map: ${path.basename(filepaths[0])}`;
                } else {
                    details = `Layer: ${path.basename(filepaths[0])}`;
                }
                let mapCreatorTask = new MapCreatorTask(details, isMap, isFolder, this);
                TaskManager.addTask(mapCreatorTask);
                mapCreatorTask.run(filepaths[0]);
            }
        });
    }

    /**
     * Opens a dialog asking for a file or folder as source for performing an
     * object detection task.
     * @param {ImageJUtil.LayersMode} mode Object detection mode, can be single image,
     * folder, or list of images. 
     */
    objectDetection(mode) {
        let props = ['openFile'];
        if (mode === ImageJUtil.LayersMode.FOLDER) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Image object detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (mode === ImageJUtil.LayersMode.FOLDER) {
                    details = `Folder: ${path.basename(filepaths[0])}`;
                } else {
                    if (path.extname(filepaths[0]) === "txt") {
                        details = `File: ${path.basename(filepaths[0])}`;
                    } else {
                        details = `Image: ${path.basename(filepaths[0])}`;
                    }
                }
                let objectDetectionTask = new ObjectDetectionTask(details, mode, this);
                TaskManager.addTask(objectDetectionTask);
                objectDetectionTask.run(filepaths[0]);
            }
        });
    }

    /**
     * Opens a dialog asking for a file or folder as source for performing a
     * holes detection task.
     * @param {ImageJUtil.LayersMode} mode Holes detection mode, can be single image,
     * folder, or list of images. 
     */
    holesDetection(mode) {
        let props = ['openFile'];
        if (mode === ImageJUtil.LayersMode.FOLDER) {
            props = ['openDirectory'];
        }
        dialog.showOpenDialog({
            title: 'Holes detection',
            type: 'normal',
            properties: props
        }, (filepaths) => {
            if (filepaths) {
                let details;
                if (mode === ImageJUtil.LayersMode.FOLDER) {
                    details = `Folder: ${path.basename(filepaths[0])}`;
                } else {
                    if (path.extname(filepaths[0]) === "txt") {
                        details = `File: ${path.basename(filepaths[0])}`;
                    } else {
                        details = `Image: ${path.basename(filepaths[0])}`;
                    }
                }
                let holesDetectionTask = new HolesDetectionTask(details, mode, this);
                TaskManager.addTask(holesDetectionTask);
                holesDetectionTask.run(filepaths[0]);
            }
        });
    }

    /**
     * Opens a dialog asking for a file (image) to crop it into small parts.
     */
    cropImage() {
        dialog.showOpenDialog({
            title: 'Crop Big Image',
            type: 'normal',
            properties: ['openFile']
        },
            (filepaths) => {
                if (filepaths) {
                    let details = `Image: ${path.basename(filepaths[0])}`;
                    let cropTask = new CropTask(details, this);
                    TaskManager.addTask(cropTask);
                    cropTask.run(filepaths[0]);
                }

            }
        );
    }

    /**
     * Opens a modal window for ImageJ memory parameters modification.
     */
    configImageJ() {
        let conf = util.clone({
            memory: this.memory,
            stackMemory: this.stackMemory
        });
        let modal = new Modal({
            title: `Configure ImageJ`,
            width: '600px',
            height: 'auto'
        });
        let body = document.createElement('DIV');
        body.className = 'flex-container';
        let div = document.createElement('DIV');
        body.appendChild(div);
        input.input({
            parent: div,
            label: 'Memory (MB)',
            className: 'simple form-control',
            value: this.memory,
            type: 'number',
            min: 100,
            max: this.maxMemory,
            step: 1,
            placeholder: 'memory',
            onblur: (inp) => {
                conf.memory = parseInt(Math.min(inp.value, this.maxMemory));
                inp.value = conf.memory;
            }
        });
        input.input({
            parent: div,
            label: 'Stack memory (MB)',
            className: 'simple form-control',
            value: this.stackMemory,
            type: 'number',
            min: 10,
            max: this.maxStackMemory,
            step: 1,
            placeholder: 'memory',
            onblur: (inp) => {
                conf.stackMemory = parseInt(Math.min(inp.value, this.maxStackMemory));
                inp.value = conf.stackMemory;
            }
        });
        let Bc = new ButtonsContainer(document.createElement('DIV'));
        Bc.addButton({
            id: 'closeeimagejconfig',
            text: 'Cancel',
            action: () => {
                modal.destroy();
            },
            className: 'btn-default'
        });
        Bc.addButton({
            id: 'saveeeiamgejconfig',
            text: 'Save',
            action: () => {
                this.memory = conf.memory;
                this.stackMemory = conf.stackMemory;
                modal.destroy();
            },
            className: 'btn-default'
        });
        let footer = document.createElement('DIV');
        footer.appendChild(Bc.element);
        modal.addBody(body);
        modal.addFooter(footer);
        modal.show();
    }

}

module.exports = ImageJExtension;
