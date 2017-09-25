
var background = chrome.extension.getBackgroundPage();

	
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
		throttleRemove: document.getElementById('mining-throttle-remove')
	});
	
	//configure 'back' button
	document.getElementById('viz_back').addEventListener('click',function(){
		window.location.href="popup.html";
	});
});