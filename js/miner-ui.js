var background = chrome.extension.getBackgroundPage();

//generic message pass to background
function passBack(e) {
  chrome.extension.sendMessage({msg: e});
}

var MinerUI = function(miner, elements) {
	this.miner = miner;
	this.elements = elements;

	this.intervalUpdateStats = 0;
	this.intervalDrawGraph = 0;

	this.ctx = this.elements.canvas.getContext('2d');

	this.elements.startButton.addEventListener('click', this.start.bind(this));
	this.elements.stopButton.addEventListener('click', this.stop.bind(this));

	this.elements.threadsAdd.addEventListener('click', this.addThread.bind(this));
	this.elements.threadsRemove.addEventListener('click', this.removeThread.bind(this));
	
	this.elements.throttleAdd.addEventListener('click', this.addThrottle.bind(this));
	this.elements.throttleRemove.addEventListener('click', this.removeThrottle.bind(this));

	//plug in updated values right away
	this.elements.threads.textContent = this.miner.getNumThreads();
	this.elements.throttle.textContent = Math.round(this.miner.getThrottle()*100)+"%";
	this.updateStats();
	
	//if miner running in background, activate UI
	if(this.miner.isRunning()) {
		this.runUI();
	}
	
	this.stats = [];
	
	if(this.stats == 0 || null){
		for (var i = 0, x = 0; x < 300; i++, x += 5) {
			this.stats.push({hashes: 0, accepted: 0});
		}
	}

	this.didAcceptHash = false;
	this.miner.on('accepted', function(){
		this.didAcceptHash = true;
	}.bind(this));
};

MinerUI.prototype.start = function(ev) {
	this.miner.start(background.CoinHive.IF_EXCLUSIVE_TAB);
	this.runUI();
	if(!background.prevUse){
		background.prevUse = true;
		chrome.storage.local.set({prevUse:background.prevUse});
	}
	
	passBack("mining-start");

	ev.preventDefault();
	return false;
};

MinerUI.prototype.runUI = function() {
	this.elements.container.classList.add('running');
	this.elements.container.classList.remove('stopped');

	this.intervalUpdateStats = setInterval(this.updateStats.bind(this), 200);
	this.intervalDrawGraph = setInterval(this.drawGraph.bind(this), 500);

	this.elements.threads.textContent = this.miner.getNumThreads();
};

MinerUI.prototype.stop = function(ev) {
	this.miner.stop();
	this.elements.hashesPerSecond.textContent = 0;
	this.elements.container.classList.remove('running');
	this.elements.container.classList.add('stopped');

	clearInterval(this.intervalUpdateStats);
	clearInterval(this.intervalDrawGraph);
	
	passBack("mining-stop");
	
	this.updateStats();

	ev.preventDefault();
	return false;
};

MinerUI.prototype.addThread = function(ev) {
	this.miner.setNumThreads(this.miner.getNumThreads() + 1);
	this.elements.threads.textContent = this.miner.getNumThreads();
	passBack("add-thread");

	ev.preventDefault();
	return false;
};

MinerUI.prototype.removeThread = function(ev) {
	this.miner.setNumThreads(Math.max(0, this.miner.getNumThreads() - 1));
	this.elements.threads.textContent = this.miner.getNumThreads();
	passBack("remove-thread");

	ev.preventDefault();
	return false;
};

MinerUI.prototype.removeThrottle = function(ev) {
	this.miner.setThrottle(Math.max(0, this.miner.getThrottle() - 0.1));
	this.elements.throttle.textContent = Math.round(this.miner.getThrottle()*100) + "%";
	clearInterval(background.rampInterval);
	passBack("remove-throttle");
	
	ev.preventDefault();
	return false;
};

MinerUI.prototype.addThrottle = function(ev) {
	this.miner.setThrottle(Math.min(0.9, this.miner.getThrottle() + 0.1));
	this.elements.throttle.textContent = Math.round(this.miner.getThrottle()*100) + "%";
	clearInterval(background.rampInterval);
	passBack("add-throttle");

	ev.preventDefault();
	return false;
};

MinerUI.prototype.updateStats = function() {
	this.elements.hashesPerSecond.textContent = this.miner.getHashesPerSecond().toFixed(1);
	
	//display abrevs.
	var runningTotal = this.miner.getTotalHashes(true);
	var dispTotal = runningTotal + background.prevTotal;
	var grandTotal = runningTotal + background.prevGrandTotal;
	if(dispTotal > 1000000){
		dispTotal = (dispTotal/1000000).toFixed(2) + "M";
	} else if(dispTotal > 1000){
		dispTotal = (dispTotal/1000).toFixed(2) + "k";
	}
	this.elements.hashesTotal.textContent = dispTotal;
	
	
	if(grandTotal > 1000000){
		grandTotal = (grandTotal/1000000).toFixed(2) + "M";
	} else if(grandTotal > 1000){
		grandTotal = (grandTotal/1000).toFixed(2) + "k";
	}
	this.elements.hashGrandTotal.textContent = grandTotal;
};

MinerUI.prototype.drawGraph = function() {
	
	this.elements.throttle.textContent = Math.round(this.miner.getThrottle()*100)+"%";

	// Resize canvas if necessary
	if (this.elements.canvas.offsetWidth !== this.elements.canvas.width) {
		this.elements.canvas.width = this.elements.canvas.offsetWidth;
		this.elements.canvas.height = this.elements.canvas.offsetHeight;
	}
	var w = this.elements.canvas.width;
	var h = this.elements.canvas.height;


	var current = this.stats.shift();
	var last = this.stats[this.stats.length-1];
	current.hashes = this.miner.getHashesPerSecond();
	current.accepted = this.didAcceptHash;
	this.didAcceptHash = false;
	this.stats.push(current);

	// Find max value
	var vmax = 0;
	for (var i = 0; i < this.stats.length; i++) {
		var v = this.stats[i].hashes;
		if (v > vmax) { vmax = v; }
	}

	// Draw all bars
	this.ctx.clearRect(0, 0, w, h);
	for (var i = this.stats.length, j = 1; i--; j++) {
		var s = this.stats[i];

		var vh = ((s.hashes/vmax) * (h - 16))|0;
		if (s.accepted) {
			this.ctx.fillStyle = '#aaa';
			this.ctx.fillRect(w - j*10, h - vh, 9, vh);
		}
		else {
			this.ctx.fillStyle = '#ccc';
			this.ctx.fillRect(w - j*10, h - vh, 9, vh);
		}
	}
};
