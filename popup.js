
var background = chrome.extension.getBackgroundPage();
var fbShowing = false;

//generic message pass to background
function passBack(e) {
  chrome.extension.sendMessage({msg: e});
}


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
			document.getElementById('first-time-text').style.display = 'none';
			background.miner.start();
			document.getElementById('start').style.display = 'none';
			passBack("mining-start");
		});
	}
	
	//add listners and functions for each menu item
	document.getElementById('my-sites').addEventListener('click',function(){
		window.location.href="addSites.html";
	});
	document.getElementById('start').addEventListener('click',function(){
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
	});
	document.getElementById('faq').addEventListener('click',function(){
		chrome.tabs.create({url:"FAQs.html"});
	});
	document.getElementById('feedback').addEventListener('click',function(){
		if(fbShowing){
			document.getElementById('feedback_text').style.display = 'none';
			fbShowing = false;
		}else{
			document.getElementById('feedback_text').style.display = 'block';
			fbShowing = true;
		}	
	});

});