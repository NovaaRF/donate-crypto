//background.js


var miner;	//don't initialize until user name is fetched from memory
var mySites;
var prevUse = false;
var syncDataReady = false;
var localDataReady = false;
var rampInterval;
var logInterval;
var isBrowserAction = true;
var dateInfo = new Date();
var sessionData = {
	dateYear:dateInfo.getFullYear(),
	dateMonth:dateInfo.getMonth(),
	dateDay:dateInfo.getDay(),
	time:dateInfo.getTime(),
	hashes:0,
	totalHashes:0,
	lastUpdate:0,
	UXlog:[]};
var logUpdate = false;
var prevTotal = 0;
var prevGrandTotal = 0;
var apikey = "59dd4cbf16d89bb778329252";

//pull from synced storage
chrome.storage.sync.get(['userid','mySites'], function(items) {
	//check if a userID exist, else generate and store one
    var stored_userid = items.userid;
    if (stored_userid) {
		console.log("userID found: "+stored_userid);
        sessionData.userid = stored_userid;
    } else {
        sessionData.userid = getRandomToken(32);
		console.log("No ID found, generated: " +sessionData.userid);
        chrome.storage.sync.set({userid: sessionData.userid}, function() {});
    }
	miner = new CoinHive.User('faLtux0jRiZXXe2iiN1XEfyj7sj5Ykg3',sessionData.userid, {threads: 1,throttle: 0.6});
	
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
chrome.storage.local.get(['prevUse','machineID','sessionData'], function(items) {
	//previously used app
	if (items.prevUse) {
		prevUse = true;
    }else{
		chrome.storage.local.set({'prevUse': prevUse});
	}
	//machine id, separate from user id
	var stored_machineID = items.machineID;
    if (stored_machineID) {
		console.log("machineID found: "+stored_machineID);
        sessionData.machineID = stored_machineID;
    } else {
        sessionData.machineID = getRandomToken(2);
		console.log("No machine ID found, generated: " +sessionData.machineID);
        chrome.storage.local.set({'machineID': sessionData.machineID});
    }
	//preious session data
	if(items.sessionData){
		items.sessionData.UXlog.push({time:items.sessionData.lastUpdate, event:"session-close"});
		prevGrandTotal = items.sessionData.totalHashes;
		//if from earlier today, continue
		if(compareDate(items.sessionData)){
			prevTotal = items.sessionData.hashes;
			sessionData = items.sessionData;
			console.log("Found previous session today: " + JSON.stringify(items.sessionData.hashes));
		//if from previous day, post to database
		}else{
			console.log("Session expired, posting to database");
			postLog(items.sessionData);
		}
	}
	
	localDataReady = true;
	attemptStart();
});


//start the miner when local and synced data are available
function attemptStart() {
	if(localDataReady && syncDataReady && prevUse){
		miner.start();
		chrome.browserAction.setIcon({path:"Images/icon16.png"});
		logEvent("mining auto-start");
				
		//ramp up the miner over several minutes
		rampInterval = setInterval(function(){
			var currentThrottle = miner.getThrottle();
			miner.setThrottle(currentThrottle - 0.1);
			if(currentThrottle-0.1 < 0.39){
				clearInterval(rampInterval);
				console.log("rampInterval cleared, steady state throttle reached");
			}
		},90e3);
		//periodically update totals
		logInterval = setInterval(function(){
			if(logUpdate || miner.isRunning()){
				var currentHash = miner.getTotalHashes();
				sessionData.hashes = prevTotal+currentHash;
				sessionData.totalHashes = prevGrandTotal+currentHash;
				var eDate = new Date();
				if(miner.isRunning())
					sessionData.lastUpdate = eDate.getTime()-sessionData.time;
				chrome.storage.local.set({'sessionData': sessionData});
				logUpdate = false;
			}
		},5e3);
	}
}


//add event to UXlog
function logEvent(e){
	var eDate = new Date();
	sessionData.UXlog.push({time:eDate.getTime()-sessionData.time, event:e});
	console.log(JSON.stringify(sessionData.UXlog[sessionData.UXlog.length-1]));
	logUpdate = true;
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


//compare the dates of current and stored session data
function compareDate(prevSession){
	if(prevSession.dateDay == sessionData.dateDay
		&& prevSession.dateMonth == sessionData.dateMonth
		&& prevSession.dateYear == sessionData.dateYear){
			return true;
		}
		else
			return false;
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
		logEvent(request.msg);
    }
);


//send UX log data to database
function postLog(dataObj){
		 
	var xhr = new XMLHttpRequest();

	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
		console.log(this.responseText);
	  }
	});

	xhr.open("POST", "https://datalog-8a8b.restdb.io/rest/logs");
	xhr.setRequestHeader("content-type", "application/json");
	xhr.setRequestHeader("x-apikey", apikey);
	xhr.setRequestHeader("cache-control", "no-cache");

	xhr.send(JSON.stringify(dataObj));
};



