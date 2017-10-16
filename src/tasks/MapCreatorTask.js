/**
 * @author : Mario Juez (mario@mjuez.com)
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

const sanitize = require("sanitize-filename")
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
const ImageJUtil = require(path.join('..', 'ImageJUtil'))
const TaskUtils = require('./TaskUtils')

class MapCreatorTask extends Task {

  constructor(details, isMap, isFolder, imagejext) {
    let name = "ImageJ MapCreator"
    super(name, details)
    this.imageJExtension = imagejext
    this.macro = "MapCreator"
    this.isMap = isMap
    this.isFolder = isFolder
    this.jsonFile = null
    this.configuration = {}
    this.childProcess = null
  }

  run(runPath) {
    super.run()
    this.showModal(runPath, (modal, params) => {
      let use = ""
      let create = ""
      if (params.use) use = "use "
      if (this.isMap) create = "create "
      let args = `${this.isFolder}#${params.initialSlice}#${params.lastSlice}#${params.scale}#${runPath}#map=[${params.map}] pixel=${params.pixel} maximum=${params.maximum} slice=${params.slice} ${use}${create}choose=${params.path}#${params.merge}`
      this.childProcess = this.imageJExtension.run(this.macro, args)
      this.childProcess.stdout.setEncoding('utf8')
      this.childProcess.stdout.on('data', (data) => {
        let regex = /[0-9]+\/[0-9]+/g
        if (regex.test(data)) {
          let progress = data.split("/")
          let percentage = (progress[0] * 100) / progress[progress.length - 1]
          this.updateProgress(percentage)
        }
      })

      this.childProcess.stderr.on('data', (data) => {
        console.log('stderr: ' + data)
      })

      this.childProcess.on('close', (code) => {
        let notification
        if (code == 0) {
          notification = `Map creator task (${this.details}) completed`
          if (this.isMap) {
            this.jsonFile = path.join(params.path, params.map, `${params.map}.json`)
          } else {
            this.jsonFile = path.join(params.path, params.map, `${params.map}_tiles`, `${params.map}_tiles.json`)
          }
          this.success()
        } else if (code == 1) {
          notification = `Map creator task (${this.details}) failed.`
          this.fail("Problems with JVM...")
        } else {
          notification = `Map creator task (${this.details}) cancelled.`
          this.cancel()
        }
        util.notifyOS(notification)
        //gui.notify(notification)
      })

      this.childProcess.on('error', (err) => {
        this.fail(err)
        util.notifyOS(`Map creator exec error: ${err}`)
      })

      //gui.notify(`MapCreator task started.`)
      modal.destroy()
    })
  }

  success() {
    if (this.isMap) {
      this.customAction["caption"] = "Load map to workspace"
      this.customAction["onclick"] = () => {
        //gui.extensions.MapExtension.loadMap(this.jsonFile)
      }
    } else {
      this.customAction["caption"] = "Add layer to a map in workspace"
      this.customAction["onclick"] = () => {
        TaskUtils.showMapSelector(this.jsonFile)
      }
    }
    return super.success()
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

  showModal(imagePath, next) {
    let numSlices = ImageJUtil.Image.getTotalSlices(imagePath)

    var modal = new Modal({
      title: "Map creator options",
      height: "auto",
      width: '400px',
      oncancel: () => {
        this.cancel()
      },
      onsubmit: () => {
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
            next(modal, params)
          } else {
            dialog.showErrorBox("Can't create map", "You must choose an output folder.")
          }
        }
      }
    })

    let body = util.div('padded')
    let maxSlices = numSlices

    let stackFieldSet = document.createElement("FIELDSET")
    let stackLegend = document.createElement("LEGEND")
    stackLegend.innerHTML = "Image combination parameters"
    stackFieldSet.appendChild(stackLegend)
    let stackFieldCont = util.div('cell-container')
    stackFieldSet.appendChild(stackFieldCont)

    let numInitialSlice = input.input({
      type: "number",
      id: "numinitialslice",
      value: "1",
      min: "1",
      max: maxSlices,
      parent: stackFieldCont,
      className: 'form-control',
      label: 'Initial slice: '
    })


    let numLastSlice = input.input({
      type: "number",
      id: "numlastslice",
      value: "1",
      min: "1",
      max: maxSlices,
      parent: stackFieldCont,
      className: 'form-control',
      label: 'Last slice: '
    })


    let numScale = input.input({
      type: "number",
      id: "numscale",
      value: "1.000",
      min: "0",
      max: "1",
      step: "0.001",
      parent: stackFieldCont,
      className: 'form-control',
      label: 'Scale: '
    })

    let calcNumSlices = () => {
      if (numLastSlice.value >= numInitialSlice.value) {
        numSlices = numLastSlice.value - numInitialSlice.value + 1
      }
    }

    numInitialSlice.onchange = calcNumSlices
    numLastSlice.onchange = calcNumSlices


    if (this.isFolder) body.appendChild(stackFieldSet)

    let mapFieldSet = document.createElement("FIELDSET")
    mapFieldSet.classList.add('pane')
    let mapLegend = document.createElement("LEGEND")
    mapLegend.innerHTML = "Map parameters"
    mapFieldSet.appendChild(mapLegend)
    let mapFieldCont = util.div('cell-container')
    mapFieldSet.appendChild(mapFieldCont)

    let txtMapName = input.input({
      type: "text",
      id: "txtmapname",
      value: `${sanitize(path.basename(imagePath).replace(/\.[^/.]+$/, ''))}`,
      oninput: () => {
        txtMapName.value = sanitize(txtMapName.value)
      },
      parent: mapFieldCont,
      className: 'form-control',
      label: 'Map name: '
    })

    let txtPixelTiles = input.input({
      type: "text",
      id: "txtpixeltiles",
      value: "256",
      parent: mapFieldCont,
      className: 'form-control',
      label: 'Pixel tiles dimension: '
    })

    let numMaximumZoom = input.input({
      type: "number",
      id: "nummaximumzoom",
      value: "5",
      min: "0",
      max: "8",
      parent: mapFieldCont,
      className: 'form-control',
      label: 'Maximum zoom: '
    })

    let checkUseAllSlice = input.checkButton({
      text: 'Use all slice',
      active: false,
      makeContainer: true,
      parent: mapFieldCont,
      onclick: (inp, s) => {
        checkMergeAllSlices.disabled = checkUseAllSlice.checkbox
        numUsedSlice.disabled = checkUseAllSlice.checkbox
      }
    })

    let checkMergeAllSlices = input.checkButton({
      onclick: () => {
        checkUseAllSlice.disabled = checkMergeAllSlices.checked
        numUsedSlice.disabled = checkMergeAllSlices.checked
      },
      makeContainer: true,
      parent: mapFieldCont,
      text: 'Merge all slice'
    })

    if (numSlices == 1) {
      checkMergeAllSlices.disabled = true
      checkUseAllSlice.disabled = true
    }

    let numUsedSlice = input.input({
      type: "number",
      id: "numusedslice",
      value: "1",
      min: "1",
      max: numSlices,
      parent: mapFieldCont,
      className: 'form-control',
      label: 'Slice to be used: '
    })

    body.appendChild(mapFieldSet)

    let buttonsContainer = new ButtonsContainer(util.div('toolbar-actions'))
    buttonsContainer.addButton({
      id: "CancelMap00",
      text: "Cancel",
      action: () => {
        this.cancel()
        modal.destroy()
      },
      className: "btn-default",
      groupId: 'makemap00',
      groupClassName: 'pull-right'
    })
    buttonsContainer.addButton({
      id: "CreateMap00",
      text: "Create",
      groupId: 'makemap00',
      groupClassName: 'pull-right',
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
            next(modal, params)
          } else {
            dialog.showErrorBox("Can't create map", "You must choose an output folder.")
          }
        }
      },
      className: "btn-default"
    })
    let footer = util.div('toolbar toolbar-footer')
    footer.appendChild(buttonsContainer.element)
    let fldOutputFolder = new FolderSelector("fileoutputfolder",{
      className: 'btn-group'
    })
    buttonsContainer.element.appendChild(fldOutputFolder.element)
    modal.addBody(body)
    modal.addFooter(footer)
    modal.show()
  }

}

module.exports = MapCreatorTask
