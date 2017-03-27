
Dialog.create("Title")
Dialog.addNumber("Radius of median filter",10);
Dialog.addNumber("Threshold",250);
Dialog.show();
radius = Dialog.getNumber()
thrHoles = Dialog.getNumber();

setBatchMode(true);
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
run("Macro...", "code=[if (v>="+thrHoles+") v=255] stack");
//run("Minimum...", "radius=15 stack");
//run("Maximum...", "radius=15 stack");
run("Merge Channels...", "c1=temp1 c4=temp create keep");
run("Stack to RGB", "slices");
rename("holesRGB_"+titleC);
close('composite');
selectWindow('temp1');
rename("holes_"+titleC);
setBatchMode('exit and display');
selectWindow('temp');
rename(title);
