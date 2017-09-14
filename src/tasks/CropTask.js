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

class CropTask extends Task {

  constructor(details, imagejext) {
    let name = "ImageJ Image Cropping";
    super(name, details);
    this.imageJExtension = imagejext;
    this.macro = "croppingBigSTiched";
    this.childProcess = null;
  }

  run(runPath) {
    super.run();
    this.showModal((modal, params) => {
      let args = `${runPath}#${path.basename(runPath, path.extname(runPath))}#${params.dimTiles}#${params.height}#${params.width}#${params.x}#${params.y}#${params.path}`;
      this.childProcess = this.imageJExtension.run(this.macro, args);
      this.childProcess.stdout.setEncoding('utf8');
      this.childProcess.stdout.on('data', (data) => {
        console.log(data);
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
            this.success();
          } else if (code == 1) {
            notification = `Image cropping task (${this.details}) failed.`;
            this.fail("Problems with JVM...");
          } else {
            notification = `Image cropping task (${this.details}) cancelled`;
            resolve(notification);
            this.cancel();
          }
        });

        promise.then((notification) => {
          util.notifyOS(notification);
          gui.notify(notification);
        });
      });

      this.childProcess.on('error', (err) => {
        this.fail(err);
        util.notifyOS(`Image cropping exec error: ${err}`);
      });

      gui.notify(`Image cropping task started.`);
      modal.destroy();
    });
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
      title: "Image cropping options",
      height: "auto",
      oncancel: () => {
        this.cancel();
      },
      onsubmit: () => {
        if (typeof next === 'function') {
          if (fldOutputFolder.getFolderRoute()) {
            let params = {
              dimTiles: numDimTile.value || "[]",
              height: numHeight.value || "[]",
              width: numWidth.value || "[]",
              x: numx.value || 0,
              y: numy.value || 0,
              path: fldOutputFolder.getFolderRoute()
            }
            next(modal, params);
          } else {
            dialog.showErrorBox("Can't crop image", "You must choose an output folder where cropped images will be saved.");
          }
        }
      }
    });

    let body = document.createElement("DIV");
    let grid = new Grid(6, 2);

    let numDimTile = input.input({
      type: "number",
      id: "numdimtile",
      value: "10",
      min: "0",
      max: "4000"
    });
    let lblDimTile = document.createElement("LABEL");
    lblDimTile.htmlFor = "numdimtile";
    lblDimTile.innerHTML = "Tile size: ";
    grid.addElement(lblDimTile, 0, 0);
    grid.addElement(numDimTile, 0, 1);

    let numHeight = input.input({
      type: "number",
      id: "numheight",
      value: "10",
      min: "0"
    });
    let lblHeight = document.createElement("LABEL");
    lblHeight.htmlFor = "numheight";
    lblHeight.innerHTML = "Original image height: ";
    grid.addElement(lblHeight, 1, 0);
    grid.addElement(numHeight, 1, 1);

    let numWidth = input.input({
      type: "number",
      id: "numwidth",
      value: "10",
      min: "0"
    });
    let lblWidth = document.createElement("LABEL");
    lblWidth.htmlFor = "numwidth";
    lblWidth.innerHTML = "Original image width: ";
    grid.addElement(lblWidth, 2, 0);
    grid.addElement(numWidth, 2, 1);

    let numx = input.input({
      type: "number",
      id: "numx",
      label: "X0",
      value: "0",
      min: "0"
    });

    let lblx = document.createElement("LABEL");
    lblx.htmlFor = "numx";
    lblx.innerHTML = "X0 ";
    grid.addElement(lblx, 3, 0);
    grid.addElement(numx, 3, 1);

    let numy = input.input({
      type: "number",
      id: "numy",
      value: "0",
      min: "0"
    });

    let lbly = document.createElement("LABEL");
    lbly.htmlFor = "numy";
    lbly.innerHTML = "Y0 ";
    grid.addElement(lbly, 4, 0);
    grid.addElement(numy, 4, 1);


    let fldOutputFolder = new FolderSelector("fileoutputfolder");
    let lblOutputFolder = document.createElement("LABEL");
    lblOutputFolder.htmlFor = "fileoutputfolder";
    lblOutputFolder.innerHTML = "Output folder: ";
    grid.addElement(lblOutputFolder, 5, 0);
    grid.addElement(fldOutputFolder.element, 5, 1);

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
              dimTiles: numDimTile.value || "[]",
              height: numHeight.value || "[]",
              width: numWidth.value || "[]",
              x: numx.value || 0,
              y: numy.value || 0,
              path: fldOutputFolder.getFolderRoute()
            }
            next(modal, params);
          } else {
            dialog.showErrorBox("Can't crop image", "You must choose an output folder where cropped images will be saved.");
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

module.exports = CropTask;
