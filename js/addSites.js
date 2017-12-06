var background = chrome.extension.getBackgroundPage();
var sites = background.sessionData.supported_sites;
var state = "showing";
var toRemove = [];
var sitesChanged = false;



//update and show the menu
function renderDefault() {
	
	var localSiteList = document.getElementById('sites-list');
	
	//clear the list
	while (localSiteList.firstChild) {
		localSiteList.removeChild(localSiteList.firstChild);
	}
	
	//create and add <div> item for each site in array
	for(var i = 0; i < sites.length; i++){
		var newItem = document.createElement("div");
		var textnode = document.createTextNode(sites[i].name);
		newItem.appendChild(textnode);
		newItem.setAttribute("id","site-" + i);
		localSiteList.appendChild(newItem);
	}
	
	//document.getElementById('remove-site').style.display = 'block';
	//document.getElementById('add-site').style.display = 'block';
	
	//make hoverable, and add click listeners to each site	
	for(var i = 0; i < localSiteList.childElementCount; i++){
		var aSite = document.getElementById('site-' + i);
		aSite.setAttribute('class','click');
		aSite.style.pointerEvents = "auto";
		aSite.addEventListener('click', siteSelected);
	}
	state = "showing";
}



//show/hide buttons based on the state
function setState(new_state) {
	if(state == "showing" && new_state == "remove"){
		//find and remove all elements of toRemove from sites array
		for(var i=0; i < sites.length; i++){
			for(var j=0; j<toRemove.length; j++){
				if(document.getElementById(toRemove[j]).childNodes[0].nodeValue == sites[i].name){
					background.removeSite(i);
				}
			}
		}
		toRemove = [];
		renderDefault();
	}
}

//handle highlighting and recording selected sites in 'remove' flow
function siteSelected(e){
	var selected = document.getElementById(e.target.id);
	//it was previously selected
	if(selected.style.background == 'rgb(190, 212, 232)'){
		selected.style.background = '#fcfcfc';
		//find and remove from array
		for(var i=0; i<toRemove.length; i++){
			if(toRemove[i] == e.target.id)
				toRemove.splice(i,1);
		}
	}else{
		selected.style.background = '#bed4e8';
		toRemove.push(e.target.id);
	}
}


//initial click listeners configured
document.addEventListener('DOMContentLoaded', function (){

	//load stored sites in display
	renderDefault();
	//add click listeners
	document.getElementById('remove-site').addEventListener('click',function(){
		setState("remove");
	});
	//configure 'back' button
	document.getElementById('add-back').addEventListener('click',function(){
		background.logEvent("add-sites-back");
		background.isBrowserAction = false;
		window.location.href="popup.html";
	});
});