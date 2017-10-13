var background = chrome.extension.getBackgroundPage();
var state = "showing";
var toRemove = [];
var sitesChanged = false;


//update and show the menu
function renderDefault() {
	
	var siteList = document.getElementById('sites-list');
	
	//clear the list
	while (siteList.firstChild) {
		siteList.removeChild(siteList.firstChild);
	}
	
	//create and add <div> item for each site in array
	for(var i = 0; i < background.mySites.site.length; i++){
		var newItem = document.createElement("div");
		var textnode = document.createTextNode(background.mySites.site[i]);
		newItem.appendChild(textnode);
		newItem.setAttribute("id","site-" + i);
		siteList.appendChild(newItem);
	}
	
	document.getElementById('remove-site').style.display = 'block';
	document.getElementById('add-site').style.display = 'block';
	state = "showing";
	
	//update synced storage
	if(sitesChanged){
		background.sessionData.supported_sites = background.mySites;
		chrome.storage.sync.set({'mySites': background.mySites}, function() {
			background.logEvent(background.mySites);
		});
		sitesChanged = false;
	}
}



//show/hide buttons based on the state
function setState(new_state) {
	
	//prepare to add a new site
	if(state == "showing" && new_state == "add"){
		document.getElementById('remove-site').style.display = 'none';
		document.getElementById('new-site-input').style.display = 'block';
		state = "adding";
		background.logEvent("adding-site");
		
	//prepare to remove a site
	} else if(state == "showing" && new_state == "remove"){
		document.getElementById('add-site').style.display = 'none';
		state = "removing";
		//make hoverable, and add click listeners to each site	
		var siteList = document.getElementById('sites-list');
		for(var i = 0; i < siteList.childElementCount; i++){
			var aSite = document.getElementById('site-' + i);
			aSite.setAttribute('class','click');
			aSite.style.pointerEvents = "auto";
			aSite.addEventListener('click', siteSelected);
		}
		background.logEvent("removing-site");
	
	//commit a new site
	} else if(state == "adding" && new_state == "add"){
		//add a site to the list
		var inputValue = document.getElementById('new-site-input').value;
		if(inputValue){
			background.mySites.site.push(inputValue);
			sitesChanged = true;
		}
		document.getElementById('new-site-input').value = [];
		document.getElementById('new-site-input').style.display = 'none';
		renderDefault();
	
	//commit removing a site
	} else if(state == "removing" && new_state == "remove"){
		//find and remove all elements of toRemove from sites array
		for(var i=0; i<background.mySites.site.length; i++){
			for(var j=0; j<toRemove.length; j++){
				if(document.getElementById(toRemove[j]).childNodes[0].nodeValue == background.mySites.site[i]){
					background.mySites.site.splice(i,1);
					sitesChanged = true;
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
		selected.style.background = '#f5f5f5';
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
	document.getElementById('add-site').addEventListener('click',function(){
		setState("add");
	});
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