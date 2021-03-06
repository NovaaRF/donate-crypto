
var background = chrome.extension.getBackgroundPage();
var sites = background.sessionData.supported_sites;
var fbShowing = false;
var hideShowing = false;

//generic message pass to background
function passBack(e) {
  chrome.runtime.sendMessage({msg: e});
}

//dynamically render current supported sites
function renderSites(){
	var siteList = document.getElementById('sites-list');
	//create and add <div> item for each site in array
	for(var i = 0; i < sites.length; i++){
		var newItem = document.createElement("div");
		var textnode = document.createTextNode('\u2022  ' + sites[i].name);
		newItem.appendChild(textnode);
		newItem.setAttribute("id","site-" + i);
		siteList.appendChild(newItem);
	}
}


if(background.isBrowserAction)
	background.logEvent("browser-action");
else
	background.isBrowserAction = true;

document.addEventListener('DOMContentLoaded', function () {
	
	//once loaded, update fields
	if(background.miner.isRunning()){
		document.getElementById('start').style.display = 'none';
		document.getElementById('stop').style.display = 'block';
	}
	
	//if not first time using, hide help text
	if(background.prevUse){
		document.getElementById('first-time-text').style.display = 'none';
	}else{
		document.getElementById('first-time-text').addEventListener('click',function(){
			passBack("splash-got-it");
			document.getElementById('first-time-text').style.display = 'none';
			if(!background.miner.isRunning()){
				background.explicitStart = true;
				background.miner.start();
				document.getElementById('start').style.display = 'none';
				document.getElementById('stop').style.display = 'block';
				passBack("mining-start");
			}
		});
	}
	
	renderSites();
	
	//add listners and functions for each menu item
	document.getElementById('my-sites').addEventListener('click',function(){
		window.location.href="addSites.html";
		background.logEvent("my-sites");
	});
	document.getElementById('start').addEventListener('click',function(){
		background.explicitStart = true;
		background.miner.start();
		passBack("mining-start");
		window.close();
	});
	document.getElementById('stop').addEventListener('click',function(){
		background.miner.stop();
		passBack("mining-stop");
		window.close();
	});
	document.getElementById('visualizer').addEventListener('click',function(){
		window.location.href="Miner.html";
		background.logEvent("visualizer");
	});
	document.getElementById('faq').addEventListener('click',function(){
		chrome.tabs.create({url:"FAQs.html"});
		background.logEvent("faq");
	});
	document.getElementById('feedback').addEventListener('click',function(){
		if(fbShowing){
			document.getElementById('feedback_text').style.display = 'none';
			fbShowing = false;
		}else{
			document.getElementById('feedback_text').style.display = 'block';
			fbShowing = true;
		}	
		background.logEvent("feedback");
	});
	document.getElementById('hide').addEventListener('click',function(){
		if(hideShowing){
			document.getElementById('hide-button_text').style.display = 'none';
			hideShowing = false;
		}else{
			document.getElementById('hide-button_text').style.display = 'block';
			hideShowing = true;
		}	
		background.logEvent("hide-button");
	});

});