



macro "ObjectDetection Action Tool - T0409OT8408bTf408JV8888Cg11V4633C1g1V4f44"{
run("obj detection image");
}

macro "FolderObjectDetection Action Tool -  T0409OT8408bTf408JT0b09BT6b07tT9b07cTfb07h"{
run("obj detection folder");
}

macro "Load Overlay Action Tool - T0409OT6408vTo408rTf408L"{
 getVoxelSize(width, height, depth, unit);
 open();
  for (i=0; i<nResults; i++) {
     slice = (getResult("Centroid Z", i)/(10*10*10*10*10*10*10))/depth + 1;
     x = (getResult("Centroid X", i)/(10*10*10*10*10*10*10) ) /width;
     y = (getResult("Centroid Y", i)/(10*10*10*10*10*10*10))/height;
     makePoint(x, y);
     IJ.log(slice + " " + x +" "+ y );
     Overlay.addSelection;
     Overlay.setPosition(slice);
  }
}
