//background.js


var miner;	//don't initialize until user name is fetched from memory
var userid;
var machineID;
var mySites;
var prevUse = false;
var syncDataReady = false;
var localDataReady = false;
var rampInterval;

//pull from synced storage
chrome.storage.sync.get(['userid','mySites'], function(items) {
	//check if a userID exist, else generate and store one
    var stored_userid = items.userid;
    if (stored_userid) {
		console.log("userID found: "+stored_userid);
        userid = stored_userid;
    } else {
        userid = getRandomToken(32);
		console.log("No ID found, generated: " +userid);
        chrome.storage.sync.set({userid: userid}, function() {});
    }
	miner = new CoinHive.User('faLtux0jRiZXXe2iiN1XEfyj7sj5Ykg3',userid, {threads: 1,throttle: 0.8});
	
	//recall their stored sites, or generate defaults
	var stored_sites = items.mySites;
    if (stored_sites) {
		console.log("Supported sites found: "+JSON.stringify(stored_sites));
        mySites = stored_sites;
    } else {
        mySites = {site:["our-own-site.com","wikipedia.org"]};
		console.log("No sites found, defaulted to: " +JSON.stringify(mySites));
        chrome.storage.sync.set({mySites: mySites}, function() {});
    }
	
	syncDataReady = true;
	attemptStart();
});

//pull from local storage
chrome.storage.local.get(['prevUse','machineID'], function(items) {
	//previously used app
	if (items.prevUse) {
		prevUse = true;
    }else{
		chrome.storage.local.set({prevUse: prevUse});
	}
	//machine id, separate from user id
	var stored_machineID = items.machineID;
    if (stored_machineID) {
		console.log("machineID found: "+stored_machineID);
        machineID = stored_machineID;
    } else {
        machineID = getRandomToken(1);
		console.log("No ID found, generated: " +machineID);
        chrome.storage.local.set({machineID: machineID});
    }
	
	localDataReady = true;
	attemptStart();
});


//start the miner when local and synced data are available
function attemptStart() {
	if(localDataReady && syncDataReady && prevUse){
		miner.start();
		chrome.browserAction.setIcon({path:"Images/icon16.png"});
		//ramp up the miner over several minutes
		rampInterval = setInterval(function(){
			var currentThrottle = miner.getThrottle();
			miner.setThrottle(currentThrottle - 0.1);
			if(currentThrottle-0.1 == 0)
				clearInterval(rampInterval);
		},90e3);
	}
}


//generate a user ID
function getRandomToken(tokenLength) {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(tokenLength);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    return hex;
}


//listen for commands from popup
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.msg == "mining-start"){
			chrome.browserAction.setIcon({path:"Images/icon16.png"});
			if(!prevUse){
				prevUse = true;
				chrome.storage.local.set({prevUse:prevUse});
			}
		}
		else if(request.msg == "mining-stop")
			chrome.browserAction.setIcon({path:"Images/iconDisabled.png"});
    }
);


