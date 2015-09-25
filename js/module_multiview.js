// ------------   multiview Michel

var buttonAdd, buttonChangePos, videoSection;
var nbVideos = 0;
var width, height;
var tabVideos = [];


window.onload = function(evt) {
  
  videoSection = document.querySelector("#videos");
    //buttonAdd = document.querySelector("#addVideoButton");
  //buttonAdd.addEventListener("click", addVideo);
  
  buttonAdd = document.querySelector("#removeVideoButton");
  buttonAdd.addEventListener("click", removeVideoCallback);
  buttonAdd = document.querySelector("#layout2videos");
  buttonAdd.addEventListener("click", setLayoutForTwoVideos);
  
    var rect = videoSection.getBoundingClientRect();
  
  videoSection.style.height="340px";
  
  width= rect.width;
  height = rect.height;
  
  window.onresize = function() {
    setLayoutForTwoVideos();
  };
};




/*function addSimpleVideo(remoteStream) {  
    console.log("Add video Visiteur");
    video3.src = URL.createObjectURL(remoteStream);
}
/**/

function addRemoteMultiVideo(remoteStream) {  
  
    // create a video element  
    var v = document.createElement("video");
    var largeurVideo=150;
    var hauteurVideo=150;
     
    var xVideo = Math.round((width-largeurVideo)/2);
    var yVideo = Math.round((height+hauteurVideo)/2);

    v.style.width=largeurVideo + "px";
    v.style.height=hauteurVideo + "px";

    v.style.left=xVideo + "px";
    //v.style.top=yVideo + "px";

    v.id = 'vid'+ tabVideos.length;
    v.setAttribute("controls", "true");
    //v.innerHTML="<source src='http://html5doctor.com/demos/video-canvas-magic/video.webm' type='video/webm'/>";
    v.src = URL.createObjectURL(remoteStream);
      
    tabVideos.push(v);
    videoSection.appendChild(v);
    indexVideo = tabVideos.length-1;
    console.log("Add video Visiteur - on ajoute la video id=" + indexVideo);
    setLayoutForTwoVideos();
}

function removeVideoCallback(evt) {
  removeVideo();
}

/*
function addVideo() {  
  
  // create a video element  
  var v = document.createElement("video");
  var largeurVideo=150;
  var hauteurVideo=150;
  
  var xVideo = Math.round((width-largeurVideo)/2);
  var yVideo = Math.round((height+hauteurVideo)/2);

  v.style.width=largeurVideo + "px";
  v.style.height=hauteurVideo + "px";

  v.style.left=xVideo + "px";
  //v.style.top=yVideo + "px";

  v.id = 'vid'+ tabVideos.length;
  v.setAttribute("controls", "true");
  //v.innerHTML="<source src='http://html5doctor.com/demos/video-canvas-magic/video.webm' type='video/webm'/>";
  v.src="http://html5doctor.com/demos/video-canvas-magic/video.webm";
  tabVideos.push(v);

  videoSection.appendChild(v);
  setLayoutForTwoVideos();
}
/**/


function removeVideoCallback(evt) {
  removeVideo();
}

function removeVideo(indexVideo) {
  if(! indexVideo) indexVideo = tabVideos.length-1;
  console.log("on supprime video id=" + indexVideo);
  // On supprime du tableau
  tabVideos.splice(indexVideo, 1);
  // Et du DOM
  var id = "vid"+indexVideo;
  var v = document.querySelector("#"+id);
  videoSection.removeChild(v);
  // et on repositionne les videos restantes
  setLayoutForTwoVideos();
}


function setLayoutForTwoVideos() {
  var nbVideos = tabVideos.length;
  var nbHorizontalMargins = nbVideos+1;  
  var rect = videoSection.getBoundingClientRect();
  width= rect.width;
  height = rect.height;
  
  // width and height = size of the container
  // 5% pour chaque marge horizontale, pour deux vidéos il y en a 3
  var horizontalPercentageForMargin = 0.05;
  var horizontalMargin = width*horizontalPercentageForMargin;
  
  // Percentage of total width for the sum of video width
  var percentageWidthForVideos = 1 - horizontalPercentageForMargin;
  var percentageHeightForVideos = 0.9;
  
  // size of each video
  var videoWidth = (width - (nbHorizontalMargins * horizontalMargin))  / nbVideos;
  var videoHeight = height * percentageHeightForVideos;
 
  var x= rect.left, y, oldx=0;
  
  for(var i=0; i < nbVideos; i++) {
    var v = tabVideos[i];
    
    x += horizontalMargin;
    y = height - rect.top - videoHeight;
    
    v.style.width=videoWidth + "px";
    v.style.height=videoHeight + "px";

    v.style.left = x + "px";
    //v.style.top  = y + "px";
  
    x+=videoWidth;
  }
}

function changePos(id, x, y, width, height) {
    v = document.querySelector("#"+id);
    v.style.width=width+"px";
    v.style.height=height+"px";
    v.style.left=x+"px";
    v.style.y="px";
}
   
}
