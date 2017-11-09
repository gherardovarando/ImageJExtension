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

const fs = require('fs')
const path = require('path')
const os = require('os')
const Tiff = require(path.join(__dirname, 'lib', 'Tiff'))
const sizeOf = require('image-size')

/**
 * ImageJ extension utilities.
 */
class ImageJUtil {

  /**
   * Creates a JSON configuration file for a layer (pixels layer or points layer).
   *
   * @static
   * @param {string} sourcePath - Path with source files to create JSON configuration.
   * @param {string} destinationPath - Path where JSON configuration file will be saved.
   * @param {Util.Layers.Mode} mode - JSON configuration mode (folder / single image / image list).
   * @param {string} layerType - Layer type, points (objects) or pixels (holes).
   * @param {function(string)} next - Callback for returning JSON Configuration file path.
   */
  static createJSONConfiguration(sourcePath, destinationPath, mode, layerType, next) {
    let template

    let dimPromise = new Promise((resolveDim, rejectDim) => {
      if (mode === ImageJUtil.LayersMode.FOLDER) {
        fs.readdir(sourcePath, (err, files) => {
          let aImage
          let allStatsPromises = []
          let xValues = []
          let yValues = []

          files.forEach(file => {
            let statPromise = new Promise((resolveStat) => {
              fs.stat(path.join(sourcePath, file), (err, stats) => {
                if (stats.isFile()) {
                  let xRegex = /_X[0-9]+/g
                  let yRegex = /_Y[0-9]+/g

                  let xString = xRegex.exec(file)
                  let yString = yRegex.exec(file)

                  if (xString == null || yString == null) {
                    resolveStat()
                  } else {
                    let xNumRegex = /[0-9]+/g
                    let yNumRegex = /[0-9]+/g
                    let x = xNumRegex.exec(xString)
                    let y = yNumRegex.exec(yString)
                    xValues.push(x)
                    yValues.push(y)
                    if (aImage == null) aImage = file
                    if (template == null) {
                      let xSplit = file.split(xString)
                      let tempTemplate = `${xSplit[0]}_X{x}${xSplit[1]}`
                      let ySplit = tempTemplate.split(yString)
                      template = `${ySplit[0]}_Y{y}${ySplit[1]}`
                    }
                    resolveStat()
                  }
                } else {
                  resolveStat()
                }
              });
            });
            allStatsPromises.push(statPromise)
          });

          Promise.all(allStatsPromises).then(() => {
            let xMin = Math.min(...xValues)
            let xMax = Math.max(...xValues)
            let yMin = Math.min(...yValues)
            let yMax = Math.max(...yValues);
            let xTiles = xMax - xMin + 1
            let yTiles = yMax - yMin + 1
            ImageJUtil.Image.getSize(path.join(sourcePath, aImage), (err, width, height) => {
              if (!err) {
                let tileSize = Math.max(width, height)
                let size = Math.max(width * xTiles, height * yTiles)
                resolveDim([tileSize, size])
              } else {
                rejectDim(err)
              }
            });
          });
        });
      } else if (mode === ImageJUtil.LayersMode.SINGLE_IMAGE) {
        ImageJUtil.Image.getSize(sourcePath, (err, width, height) => {
          if (!err) {
            let tileSize = Math.max(width, height)
            let size = tileSize
            resolveDim([tileSize, size])
          } else {
            rejectDim(err)
          }
        });
      } else if (mode === ImageJUtil.LayersMode.IMAGE_LIST) {
        resolveDim([256, 256]) // temporary solution (bad sizes).
      }
    })

    dimPromise.then((size) => {
      let filename
      if (template != null) {
        filename = template
      } else {
        filename = path.basename(sourcePath)
      }

      let jsonConfig = {}

      switch (layerType) {
        case `points`:
          jsonConfig = {
            name: `centroid_${filename}`,
            author: os.userInfo().username,
            type: `csvTiles`,
            url: `points_${filename.replace(/ /g, "_")}.csv`,
            options: {
              tileSize: size[0],
              size: size[1],
              bounds: [
                [-256, 0],
                [0, 256]
              ],
              localRS: true,
              grid: true,
              color: 'blue',
              fillColor: 'blue',
              radius: 5
            }
          }
          break

        case `pixels`:
          jsonConfig = {
            name: `holes_${filename}`,
            author: os.userInfo().username,
            type: `pixelsLayer`,
            role: 'holes',
            tileSize: size[0],
            size: size[1],
            norm: size[2] || 1,
            pixelsUrlTemplate: `holes_${filename.replace(/ /g, "_")}.txt`
          }
          break
      }

      next(jsonConfig)
    })
  }

}

/**
 * JSON Configuration creation modes.
 */
ImageJUtil.LayersMode = {
  SINGLE_IMAGE: 0,
  FOLDER: 1,
  IMAGE_LIST: 2
}

/**
 * Image Utilities.
 */
ImageJUtil.Image = class {

  /**
   * Calculates slice number of an image.
   *
   * @static
   * @param {string} imagePath - Source image path.
   * @returns {number} Number of slices.
   */
  static getTotalSlices(imagePath) {
    if (imagePath.endsWith(".tif") || imagePath.endsWith(".tiff")) {
      let data = fs.readFileSync(imagePath)
      let tiffImage = new Tiff({
        buffer: data
      })
      return tiffImage.countDirectory()
    } else {
      // Only tiff images have more than one slice.
      return 1
    }
  }

  /**
   * Calculates size (width and height) of an image.
   *
   * @static
   * @param {string} imagePath - Source image path.
   * @param {function(string, number, number)} next - Callback for returning image dimensions (or error).
   */
  static getSize(imagePath, next) {
    if (imagePath.endsWith(".tif") || imagePath.endsWith(".tiff")) {
      fs.readFile(imagePath, (err, data) => {
        if (!err) {
          try {
            let tiffImage = new Tiff({
              buffer: data
            });
            tiffImage.setDirectory(0);
            next(null, tiffImage.toCanvas().width, tiffImage.toCanvas().height);
          } catch (err) {
            next(null, 256, 256) // default
          }
        } else {
          next(err)
        }
      })
    } else {
      let dim = sizeOf(imagePath)
      next(null, dim.width, dim.height)
    }
  }

}

module.exports = ImageJUtil;
