var background = chrome.extension.getBackgroundPage();
var state = "showing";


//update and show the menu
function renderDefault() {
	console.log("Found " + background.mySites.site.length + " sites in storage");
	console.log("Current sites: " + background.mySites.site);
	
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
}



//show/hide buttons based on the state
function setState(new_state) {
	
	//prepare to add a new site
	if(state == "showing" && new_state == "add"){
		document.getElementById('remove-site').style.display = 'none';
		document.getElementById('new-site-input').style.display = 'block';
		state = "adding";
		
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
	
	//commit a new site
	} else if(state == "adding" && new_state == "add"){
		//add a site to the list
		var inputValue = document.getElementById('new-site-input').value;
		console.log("recovered text input: " + inputValue)
		if(inputValue){
			background.mySites.site.push(inputValue);
		}
		document.getElementById('new-site-input').value = [];
		document.getElementById('new-site-input').style.display = 'none';
		renderDefault();
	
	//commit removing a site
	} else if(state == "removing" && new_state == "remove"){
		//remove an element from the sites array
		var removed = background.mySites.site.splice(0,1);
		console.log("Removed the site: " + removed);
		renderDefault();
	}
	console.log("State is now: "+state);
}


function siteSelected(e){
	var selected = document.getElementById(e.target.id);
	//it was previously selected
	if(selected.style.background == 'rgb(190, 212, 232)'){
		selected.style.background = '#f5f5f5';
	}else{
		selected.style.background = '#bed4e8';
		console.log("The background is now " + selected.style.background);
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
		window.location.href="popup.html";
	});
});