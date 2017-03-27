SINGLE_IMAGE = "0";
FOLDER = "1";
IMAGE_LIST = "2";

arguments = getArgument();
argument = split(arguments,'#');

mode = argument[0];
path = argument[1];
radius = argument[2];
thrHoles = argument[3];
outputPath = argument[4];

outFolderH = outputPath + File.separator + "holes_img";
File.makeDirectory(outFolderH);
outFolderHcsv = outputPath + File.separator + "holes_pixels";
File.makeDirectory(outFolderHcsv);

//setBatchMode(true);
run("Input/Output...", "file=.txt");
run("Conversions...", " "); //avoid scaling when converting

if(mode == FOLDER){
    list = getFileList(path);
    files = newArray();

    for (i = 0; i < list.length; i++){
        if ( !endsWith(list[i], File.separator) ){
            files = Array.concat(files, list[i]);
        }
    }

    for (i = 0; i < files.length; i++){
       detectHoles(path + File.separator + files[i]);
       IJ.log(i+1+"/"+files.length);
    }
    list = getFileList(path);
}else if(mode == IMAGE_LIST){
    fileContents = File.openAsString(path);
    paths = split(fileContents, "\n");
    for(i = 0; i < paths.length; i++){
        detectHoles(paths[i]);
        j = i+1;
        IJ.log(j+"/"+paths.length);
    }
}else if(mode == SINGLE_IMAGE){
    detectHoles(path);
}
print("_DONE_");


function detectHoles(imagePath){
    run("Bio-Formats", "open=["+imagePath+"] color_mode=Default stack_order=Default");
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
    if(nslice > 1){
        run("Z Project...", "projection=[Sum Slices]");
    }
    run("8-bit");
    rename("holes_"+titleC);
    save(outFolderH + File.separator + "holes_"+titleC);
    saveAs("Text Image", outFolderHcsv + File.separator + "holes_"+titleC+".txt");
    close("*");
}
