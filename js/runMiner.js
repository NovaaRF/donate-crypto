
var background = chrome.extension.getBackgroundPage();

//generic message pass to background
function passBack(e) {
  chrome.extension.sendMessage({msg: e});
}
	
document.addEventListener('DOMContentLoaded', function () {
	//instantiate the miner UI with links to the elements
	var ui = new MinerUI(background.miner, {
		container: document.getElementById('miner'),
		canvas: document.getElementById('mining-stats-canvas'),
		hashesPerSecond: document.getElementById('mining-hashes-per-second'),
		threads: document.getElementById('mining-threads'),
		threadsAdd: document.getElementById('mining-threads-add'),
		threadsRemove: document.getElementById('mining-threads-remove'),
		hashesTotal: document.getElementById('mining-hashes-total'),
		startButton: document.getElementById('mining-start'),
		stopButton: document.getElementById('mining-stop'),
		throttle: document.getElementById('mining-throttle'),
		throttleAdd: document.getElementById('mining-throttle-add'),
		throttleRemove: document.getElementById('mining-throttle-remove'),
		hashGrandTotal: document.getElementById('hashes-grand-total')
	});
	
	//configure buttons
	document.getElementById('viz_back').addEventListener('click',function(){
		passBack("viz-back");
		background.isBrowserAction = false;
		window.location.href="popup.html";
	});
	document.getElementById('viz_advanced').addEventListener('click',function(){
		passBack("viz-advanced");
		document.getElementById('idle-box').style.display = 'block';
		document.getElementById('threads-box').style.display = 'block';
		document.getElementById('viz_advanced').style.display = 'none';
	});
	
});