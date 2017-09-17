//background.js

//alert("Your Chrome extension is running!");

//var miner = new CoinHive.Token('faLtux0jRiZXXe2iiN1XEfyj7sj5Ykg3',256);
//alert("Got this far!")

var startMine = function(){
    alert("mining started!");
	chrome.browserAction.setIcon({path:"iconRunning.png"});
	miner.start();
};
var stopMine = function(){
    alert("mining stopped :(");
	chrome.browserAction.setIcon({path:"icon48.png"});
};

//listen for commands from popup
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.msg == "start")
			startMine()
		else if(request.msg == "stop")
			stopMine();
    }
);

miner.on('close',stopMine());