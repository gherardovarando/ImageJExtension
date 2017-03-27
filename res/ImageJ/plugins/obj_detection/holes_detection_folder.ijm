Dialog.create("Title")
Dialog.addNumber("Radius of median filter",10);
Dialog.addNumber("Threshold",250);
Dialog.show();
radius = Dialog.getNumber()
thrHoles = Dialog.getNumber();

imagesDir = getDirectory("Choose a Directory");
outFolderH = imagesDir + "/holes_img";
File.makeDirectory(outFolderH);
outFolderHcsv = imagesDir + "/holes_pixels";
File.makeDirectory(outFolderHcsv);

setBatchMode(true);
run("Conversions...", " "); //avoid scaling when converting
list = getFileList(imagesDir);
for (i = 0; i < list.length; i++){
  if ( !endsWith(list[i],"/") ){
   IJ.log(list[i]);
   showProgress((i+1)/(list.length));
   open(imagesDir + "/"+ list[i]);
   width=getWidth();
   height=getHeight();   
   nslice=nSlices();
   title=getTitle();
   titleC = replace(title," ","_");
   rename("temp");
   run("Duplicate...", "duplicate range="+1+"-"+nslice+" title=temp1");
   selectWindow("temp1");
   run("Macro...", "code=v=-v+255 stack"); //invert intnsity
   run("Median...", "radius="+radius+" stack");
   run("Macro...", "code=[if (v<"+thrHoles+") v=0] stack");
   run("Macro...", "code=[if (v>="+thrHoles+") v=1] stack");
   //run("Minimum...", "radius=15 stack");
   //run("Maximum...", "radius=15 stack");
   selectWindow("temp1");
   run("Z Project...", "projection=[Sum Slices]");
   run("8-bit");
   rename("holes_"+titleC);
   save(outFolderH + "/holes_"+titleC);
   saveAs("Text Image", outFolderHcsv+"/holes_"+titleC);
   close("*");
  }
} 
setBatchMode("exit and display");
