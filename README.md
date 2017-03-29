# ImageJExtension

This is an extension for [Atlas](https://github.com/ComputationalIntelligenceGroup/Atlas) application.

It uses ImageJ tool for performing some of the available image processing tasks (see [ImageJ documentation](https://imagej.nih.gov/ij/) for better understanding how this extension deals with this tool).

## Authors

- Gherardo Varando [gherardo.varando@gmail.com](mailto:gherardo.varando@gmail.com)
- Mario Juez [mario@mjuez.com](mailto:mario@mjuez.com)

## Requirements

ImageJ is written in Java and needs [Java Runtine Environment (JRE)](http://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html) installed in the system to work. In order to avoid possible performance issues (memory issues), installed JRE version **must match** with the operating system architecture (32bit / 64bit).

## User guide

This extension adds a submenu to the application menu called "ImageJ". Six main tasks can be done:

#### 1. Launch ImageJ

ImageJ user interface can be launched through "Launch ImageJ" menu entry. This tool can be useful for performing some preprocessing operations to prepare images for Atlas usage.

#### 2. Configure ImageJ

ImageJ JVM memory settings (heap and stack) can be configured. By default, Java heap memory is set to 70% of total system memory, and Java stack memory is set to 515MB.

#### 3. Map Tools

Map Tools is a toolbox for creating Atlas maps. This toolbox is an ImageJ plugin that requires an image or folder with images and the following parameters as input:

- **Map name** (default: "map").
- **Pixel tiles dimension** (default: 256).
- **Maximum zoom** (default: 5).
- **Use all slice** (default: no): if source image has more than one slice and this option is checked, a map for every slice will be created.
- **Merge all slices** (default: no): if source image has more than one slice and this option is checked, a max intensity projection (ImageJ ZProjection) of all slices will be performed and the output will be used as input for map creation.
- **Slice used** (default: 1): if source image has more than one slice, this option allows to choose what slice will be used as input for map creation.
- **Output folder**: the path where output map will be saved.

With this toolbox, creating layers is also possible. The difference between a map and a layer is that a map contains a JSON configuration file with information about author, map name, and the different layers that make up the map. A map created with this tool will have only one layer. Adding new layers must be done modifying configuration file manually.

##### 3.1. Map/Layer creation from image

When using this option, a dialog will be opened to choose source image, then previously defined parameters can be configured.
When this task finishes, the map can be added to the workspace, or the layer can be added to a map in the workspace.

##### 3.2. Map/Layer creation from folder

This option is intended to create a map (or layer) from a big image which is splitted in a small collection of images. Each image name must contain its X and Y coordinates in the big image. For example, partial_image_X0_Y0.tiff will be the image in the left upper corner.

When using this option, a dialog will be opened to choose the left upper corner image, then Atlas needs to combine all images and the user will be asked to configure previously defined parameters and three additional image combination parameters:

- **Initial slice** (default: 1).
- **Last slice** (default: 1).
- **Scale** (default: 1.000): the combined image scale, this parameter goes from 0 to 1 (original size).

When this task finishes, the map can be added to the workspace, or the layer can be added to a map in the workspace.

#### 4. Object Detection

Object detection is a tool for detecting objects in an image. For this purpose, [obj_detection](https://github.com/ComputationalIntelligenceGroup/obj_detection_toolset) ImageJ plugin is used, which calculates object centroids using image segmentation techniques.
This extension allows to detect objects from a single image, from a folder with many images, or from a list of images, In all cases, following parameters can be configured:

- **Minimum radius** (default: 1): MaxLoGs Min R parameter.
- **Maximum radius** (default: 5): MaxLoGs Max R parameter.
- **By** (default: 1): MaxLoGs step parameter.
- **Threshold method** (default: "Moments").
- **Minimum** (default: 1).
- **Maximum** (default: -1).
- **Fraction** (default: 0.500).
- **Tolerance** (default: 0).
- **Output folder**: the path where detected objects data will be saved, usually the folder with the map of the image being processed is used.

When this task finishes, the layer with detected objects data (called points layer) can be added to a map in the workspace.

#### 5. Holes Detection

Holes detection is a tool for detecting holes in an image. For this purpose, [obj_detection](https://github.com/ComputationalIntelligenceGroup/obj_detection_toolset) ImageJ plugin is used, which calculates holes using median filtering and thresholding.
This extension allows to detect holes from a single image, from a folder with many images, or from a list of images, In all cases, following parameters can be configured:

- **Radius of median filter** (default: 10).
- **Threshold** (default: 250).
- **Output folder**: the path where detected holes data will be saved, usually the folder with the map of the image being processed is used.

When this task finishes, the layer with detected holes data (called pixels layer) can be added to a map in the workspace.

#### 6. Mosaic creation

This tool is located inside "Tools" submenu, it allows to divide a big image into small parts (tiles). The following parameters must be configured:

- **Tile size** (default: 10): Defines the width and height of the output tiles.
- **Original image height** (default: 10).
- **Original image width** (default: 10).
- **X0** (default: 0): The start number for generated tiles in X axis.
- **Y0** (default: 0): The start number for generated tiles in Y axis.
- **Output folder**: the path where splitted parts (tiles) will be saved.

Each tile name will be the original image name plus its X and Y position, e.g. **original_image_X0_Y0.tif** usually will be the upper left corner tile.

## License

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.