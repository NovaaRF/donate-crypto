var background = chrome.extension.getBackgroundPage();

function passBack(e) {
  chrome.extension.sendMessage({msg: e});
}

//once loaded, update fields and add listeners
document.addEventListener('DOMContentLoaded', function () {
	
	if(background.miner.isRunning()){
		document.getElementById('start').style.display = 'none';
		document.getElementById('stop').style.display = 'block';
	}

	document.getElementById('visualizer').addEventListener('click',function(){
		window.location.href="Miner.html";
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
	document.getElementById('faq').addEventListener('click',function(e){
		chrome.tabs.create({url:"FAQs.html"});
	});
});