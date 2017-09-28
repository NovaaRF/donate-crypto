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
	if(state == "showing" && new_state == "add"){
		document.getElementById('remove-site').style.display = 'none';
		document.getElementById('new-site-input').style.display = 'block';
		state = "adding";
		
	} else if(state == "showing" && new_state == "remove"){
		document.getElementById('add-site').style.display = 'none';
		state = "removing";
		
	} else if(state == "adding" && new_state == "add"){
		//add a site to the list
		var inputValue = document.getElementById('new-site-input').value;
		console.log("recovered text input: " + inputValue)
		if(inputValue){
			background.mySites.site.push(inputValue);
			console.log("resolves as true");
		}
		document.getElementById('new-site-input').value = [];
		document.getElementById('new-site-input').style.display = 'none';
		renderDefault();
		
	} else if(state == "removing" && new_state == "remove"){
		//remove an element from the sites array
		var removed = background.mySites.site.splice(0,1);
		console.log("Removed the site: " + removed);
		renderDefault();
	}
	console.log("State is now: "+state);
}

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