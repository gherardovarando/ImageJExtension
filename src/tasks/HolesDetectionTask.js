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
  util
} = require('electrongui');
const ChildProcess = require('child_process').ChildProcess;
const {
  dialog
} = require('electron').remote;
const TaskUtils = require('./TaskUtils');
const ImageJUtil = require(path.join('..', 'ImageJUtil'));

class HolesDetectionTask extends Task {

  constructor(details, mode, imagejext) {
    let name = "ImageJ Holes Detection";
    super(name, details);
    this.imageJExtension = imagejext;
    this.macro = "HolesDetector";
    this.mode = mode;
    this.jsonFile = null;
    this.childProcess = null;
  }

  run(runPath) {
    this.showModal((modal, params) => {
      let args = `${this.mode}#${runPath}#${params.radius}#${params.threshold}#${params.path}`;
      let layerType = `pixels`;
      let tot = 0;
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
        this.error('stderr: ' + data)
      });

      this.childProcess.on('close', (code) => {
        let promise = new Promise((resolve) => {
          let notification;
          if (code == 0) {
            ImageJUtil.createJSONConfiguration(runPath, params.path, this.mode, layerType, (config) => {
              let jsonPath = `${params.path}${path.sep}holes_pixels${path.sep}${config.name}.json`;
              fs.writeFile(jsonPath, JSON.stringify(config, null, 2), (err) => {
                if (err) {
                  notification = `Can't save JSON configuration file! Error: ${err}`;
                } else {
                  notification = `Holes detection task (${this.details}) completed`;
                  this.jsonFile = jsonPath;
                }
                resolve(notification);
              });
            });
            this.success();
          } else if (code == 1) {
            notification = `Holes detection task (${this.details}) failed.`;
            this.fail("Problems with JVM...");
          } else {
            notification = `Holes detection task (${this.details}) cancelled`;
            resolve(notification);
            this.cancel();
          }
        });

        promise.then((notification) => {
        });
      });

      this.childProcess.on('error', (err) => {
        this.fail(err);
      });

      modal.destroy();
      super.run();
    });
  }

  success() {
    this.customAction["caption"] = "Add layer to a map in workspace";
    this.customAction["onclick"] = () => {
      TaskUtils.showMapSelector(this.jsonFile);
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
      title: "Holes detection options",
      height: "auto",
      width: '400px',
      oncancel: () => {
        this.cancel();
      },
      onsubmit: () => {
        if (fldOutputFolder.getFolderRoute()) {
          let params = {
            radius: numRadius.value || "[]",
            threshold: numThreshold.value || "[]",
            path: fldOutputFolder.getFolderRoute()
          }
          next(modal, params);
        } else {
          dialog.showErrorBox("Can't detect holes", "You must choose an output folder where results will be saved.");
        }
      }
    })

    let body = util.div('padded cell-container')

    let numRadius = input.input({
      type: "number",
      label: 'Radius of median filter: ',
      id: "numradius",
      value: "10",
      min: "0",
      className: 'form-control',
      parent: body
    })

    let numThreshold = input.input({
      type: "number",
      id: "numthreshold",
      value: "250",
      min: "0",
      label: 'Threshold: ',
      className: 'form-control',
      parent: body
    })


    let buttonsContainer = new ButtonsContainer(util.div('toolbar-actions'));
    buttonsContainer.addButton({
      id: "CancelDetection00",
      groupId: 'holesmodal00',
      groupClassName: 'pull-right',
      text: "Cancel",
      action: () => {
        this.cancel();
        modal.destroy();
      },
      className: "btn-default"
    });
    buttonsContainer.addButton({
      id: "OkDetection00",
      groupId: 'holesmodal00',
      text: "Ok",
      action: () => {
        if (typeof next === 'function') {
          if (fldOutputFolder.getFolderRoute()) {
            let params = {
              radius: numRadius.value || "[]",
              threshold: numThreshold.value || "[]",
              path: fldOutputFolder.getFolderRoute()
            }
            next(modal, params);
          } else {
            dialog.showErrorBox("Can't detect holes", "You must choose an output folder where results will be saved.");
          }
        }
      },
      className: "btn-default"
    });
    let footer = util.div('toolbar toolbar-footer');
    let fldOutputFolder = new FolderSelector("fileoutputfolder", {
      className: 'btn-group'
    })
    buttonsContainer.element.appendChild(fldOutputFolder.element)
    footer.appendChild(buttonsContainer.element);
    modal.addBody(body);
    modal.addFooter(footer);
    modal.show();
  }


}

module.exports = HolesDetectionTask;
