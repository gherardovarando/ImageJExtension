/**
 * @author : Mario Juez (mjuez@fi.upm.es)
 *
 * @license: GPL v3
 *     This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.


 */

'use strict'

const fs = require('fs')
const path = require('path')
const {
  Task,
  Modal,
  Grid,
  FolderSelector,
  ButtonsContainer,
  input,
  util
} = require('electrongui')
const ChildProcess = require('child_process').ChildProcess
const {
  dialog
} = require('electron').remote

class CropTask extends Task {

  constructor(details, imagejext) {
    let name = "ImageJ Image Cropping"
    super(name, details)
    this.imageJExtension = imagejext
    this.macro = "croppingBigSTiched"
    this.childProcess = null
  }

  run(runPath, cl) {
    super.run()
    this.showModal((modal, params) => {
      let args = `${runPath}#${path.basename(runPath, path.extname(runPath))}#${params.dimTiles}#${params.height}#${params.width}#${params.x}#${params.y}#${params.path}`
      this.childProcess = this.imageJExtension.run(this.macro, args)
      this.childProcess.stdout.setEncoding('utf8')
      this.childProcess.stdout.on('data', (data) => {
        //console.log(data)
        let regex = /[0-9]+\/[0-9]+/g
        if (regex.test(data)) {
          let progress = data.split("/")
          let percentage = (progress[0] * 100) / progress[1]
          this.updateProgress(percentage)
        }
      })

      this.childProcess.stderr.on('data', (data) => {
        console.log('stderr: ' + data)
      })

      this.childProcess.on('close', (code) => {
        let promise = new Promise((resolve) => {
          let notification
          if (code == 0) {
            this.success()
          } else if (code == 1) {
            notification = `Image cropping task (${this.details}) failed.`
            this.fail("Problems with JVM...")
          } else {
            notification = `Image cropping task (${this.details}) cancelled`
            resolve(notification)
            this.cancel()
          }
        })

        promise.then((notification) => {
          if (typeof cl === 'function') cl(notification)
        })
      })

      this.childProcess.on('error', (err) => {
        this.fail(err)
      })

      modal.destroy()
    })
  }

  cancel() {
    if (super.cancel()) {
      if (this.childProcess instanceof ChildProcess) {
        this.childProcess.kill()
      }
      return true
    }
    return false
  }

  showModal(next) {
    var modal = new Modal({
      title: "Image cropping options",
      height: "auto",
      width: '400px',
      oncancel: () => {
        this.cancel()
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
            next(modal, params)
          } else {
            dialog.showErrorBox("Can't crop image", "You must choose an output folder where cropped images will be saved.")
          }
        }
      }
    })

    let body = util.div('padded')

    let numDimTile = input.input({
      type: 'number',
      className: 'form-control',
      id: 'numdimtile',
      value: '10',
      min: '0',
      max: '4000',
      parent: body,
      label: 'Tile size: ',
      className: 'form-control'
    })

    let numHeight = input.input({
      type: "number",
      className: 'form-control',
      id: "numheight",
      value: "10",
      min: "0",
      parent: body,
      label: 'Original image height: ',
      className: 'form-control'
    })

    let numWidth = input.input({
      type: "number",
      className: 'form-control',
      id: "numwidth",
      value: "10",
      min: "0",
      parent: body,
      label: 'Original image width: ',
      className: 'form-control'
    })

    let numx = input.input({
      type: "number",
      className: 'form-control',
      id: "numx",
      label: "X0",
      value: "0",
      min: "0",
      parent: body,
      label: 'X0: ',
      className: 'form-control'
    })

    let numy = input.input({
      type: "number",
      className: 'form-control',
      id: "numy",
      value: "0",
      min: "0",
      parent: body,
      label: 'Y0: ',
      className: 'form-control'
    })



    let buttonsContainer = new ButtonsContainer(util.div('toolbar-actions'))
    buttonsContainer.addButton({
      id: "CancelDetection00",
      groupId: 'gropmodal00',
      groupClassName: 'pull-right',
      text: "Cancel",
      action: () => {
        this.cancel()
        modal.destroy()
      },
      className: "btn-default"
    })
    buttonsContainer.addButton({
      id: "OkDetection00",
      text: "Ok",
      groupId: 'gropmodal00',
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
            next(modal, params)
          } else {
            dialog.showErrorBox("Can't crop image", "You must choose an output folder where cropped images will be saved.")
          }
        }
      },
      className: "btn-default"
    })
    let footer = util.div('toolbar toolbar-footer')
    let fldOutputFolder = new FolderSelector("fileoutputfolder")
    buttonsContainer.appendChild(fldOutputFolder)
    footer.appendChild(buttonsContainer.element)

    modal.addBody(body)
    modal.addFooter(footer)
    modal.show()
  }


}

module.exports = CropTask
