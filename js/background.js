//background.js


var miner;	//don't initialize until user name is fetched from memory
var mySites;
var prevUse = false;
var syncDataReady = false;
var localDataReady = false;
var intervalWorker = new Worker('js/intervalWorker.js');	//necessary for timing when browser inactive
var isBrowserAction = true;
var sessionData = {
		dateString:Date(Date.now()),
		startTime:Date.now(),
		hashes:0,
		totalHashes:0,
		lastUpdate:0,
		lastPost:Date.now(),
		uptime:0,
		postedHashes:0,
		UXlog:[],
		newTo:[],
		lossFrom:[]};
var logUpdate = false;
var prevTotal = 0;
var prevGrandTotal = 0;
var apikey = "59dd4cbf16d89bb778329252";
var explicitStart = false;
var minerConnected = false;
var tempStart = Date.now();
var prevUptime = 0;

//pull from synced storage
chrome.storage.sync.get(['userid','mySites'], function(items) {
	//check if a userID exist, else generate and store one
    var stored_userid = items.userid;
    if (stored_userid) {
		console.log("userID found: "+stored_userid);
        sessionData.userid = stored_userid;
    } else {
        sessionData.userid = getRandomToken(16);
		console.log("No ID found, generated: " +sessionData.userid);
        chrome.storage.sync.set({userid: sessionData.userid}, function() {});
		sessionData.newTo.push("Global");
    }
	
	//recall their stored sites, or generate defaults
	var stored_sites = items.mySites;
    if (stored_sites) {
		console.log("Supported sites found: "+JSON.stringify(stored_sites));
		if(stored_sites.site){	//eliminating the legacy 'site:' subobject
			console.log("eliminating the legacy 'site:' subobject");
			mySites = stored_sites.site;
			chrome.storage.sync.set({mySites: mySites});
		}
		else{
			mySites = stored_sites;
		}
			
    } else {
        mySites = ["wikipedia.org"];
		console.log("No sites found, defaulted to: " +JSON.stringify(mySites));
        chrome.storage.sync.set({mySites: mySites});
		sessionData.newTo.concat(mySites);
    }
	
	sessionData.supported_sites = mySites;
	syncDataReady = true;
	attemptStart();
});

//pull from local storage
chrome.storage.local.get(['prevUse','machineID','sessionData','forceNew'], function(items) {
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
	//previous session data
	if(items.sessionData){
		items.sessionData.UXlog.push({time:items.sessionData.lastUpdate, event:"session-close"});
		prevGrandTotal = items.sessionData.totalHashes;
		//if from earlier today, continue
		if(compareDate(items.sessionData) && !items.forceNew){
			prevTotal = items.sessionData.hashes;
			prevUptime = items.sessionData.uptime | 0;
			
			if(items.sessionData.time){	//support refactor of 'time'
				items.sessionData.startTime = items.sessionData.time;
			}
			sessionData = items.sessionData;
			console.log("Found previous session today: " + items.sessionData.hashes);
		//if from previous day, post to database
		}else{
			if(items.forceNew){
				console.log("new session forced");
				chrome.storage.local.set({'forceNew': false});
			}
			console.log("Session expired, posting to database");
			postLogApi(userLogs,prepUserLogs(items.sessionData),function(response){
				if(response) {
					logEvent("AWS-logs-failed",response);
					postLog(items.sessionData); //attempt backup method
				}else{
					logEvent("AWS-logs-success");
				} 
			});
			postLogApi(rapidPost,prepRapidPost(items.sessionData),function(response){
				if(response) {
					logEvent("AWS-rapid-post-failed",data);
					sessionData.postedHashes -= items.sessionData.hashes - (items.sessionData.postedHashes | 0);
				}else logEvent("AWS-rapid-post-success");
			});
		}
	}
	localDataReady = true;
	attemptStart();
});


//listen for messages from worker script
intervalWorker.addEventListener('message', function(e) {
	if(e.data == "tick-ramp"){
		//increment throttle
		var currentThrottle = miner.getThrottle();
		if(currentThrottle > 0.39)
			miner.setThrottle(currentThrottle - 0.1);
		if(currentThrottle-0.1 < 0.39){
			intervalWorker.postMessage("stop-ramp");
			console.log("rampInterval cleared, steady state throttle reached");
		}
	}else if(e.data == "tick-log"){
		//update data log
		if(logUpdate || miner.isRunning()){
			var currentHash = miner.getTotalHashes();
			//detect reset in totals
			if(currentHash < sessionData.hashes-prevTotal){
				prevTotal = sessionData.hashes;
				prevGrandTotal = sessionData.totalHashes;
				sessionData.UXlog.push({time:sessionData.lastUpdate, event:"session-interruption"});
				sessionData.UXlog.push({time:Date.now()-sessionData.startTime, event:"session-resume"});
			}
			saveLogs();
		}
		//detect failed auth
		if(miner.isRunning() && miner.getHashesPerSecond() == 0){
			document.getElementsByTagName("iframe")[0].contentWindow
						.postMessage("retry-auth",'https://authedmine.com');
		}
		//detect 24hrs running
	}
}, false);


//listen for messages from other scripts
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.msg == "mining-start"){
			chrome.browserAction.setIcon({path:"Images/cent/icon16.png"});
			if(!prevUse){
				prevUse = true;
				chrome.storage.local.set({prevUse:prevUse});
			}
		}else if(request.msg == "mining-auto-start")
			chrome.browserAction.setIcon({path:"Images/cent/icon16.png"});
		else if(request.msg == "mining-stop")
			chrome.browserAction.setIcon({path:"Images/cent/iconDisabled.png"});
		else if(request.msg == "splash-got-it" && !prevUse){
			prevUse = true;
			chrome.storage.local.set({prevUse:prevUse});
		}else if(request.msg == "authed"){
			//verify miner starts or retry
			var authAttmepts = 0;
			var reAuthInterval = setInterval(function(){
				if(!minerConnected){
					authAttmepts++;
					document.getElementsByTagName("iframe")[0].contentWindow
						.postMessage("retry-auth",'https://authedmine.com');
					if(authAttmepts == 15){
						clearInterval(reAuthInterval);
					}
				}else{
					clearInterval(reAuthInterval);
				}
			},1000);
		}
		logEvent(request.msg);
    }
);



//------  Helper functions   --------


//start the miner when local and synced data are available
function attemptStart() {
	if(localDataReady && syncDataReady){
		miner = new CoinHive.User('faLtux0jRiZXXe2iiN1XEfyj7sj5Ykg3',sessionData.userid, {threads: 1,throttle: 0.7});
		logEvent("initialize miner");
		
		miner.on('error', function(params) {
			logEvent('miner-error: ', JSON.stringify(params.error));
			window.location.reload();
		});
		miner.on('authed',function(){
			if(explicitStart) explicitStart = false;
			else{
				logEvent("unexpected start");
			}
			minerConnected = true;
		});
	
		if(prevUse){
			explicitStart = true;
			miner.start();
			chrome.browserAction.setIcon({path:"Images/cent/icon16.png"});
			logEvent("mining-auto-start");
				
			//ramp up the miner over several minutes
			intervalWorker.postMessage("start-ramp");

			//periodically update totals
			intervalWorker.postMessage("start-log");
		}else{
			setTimeout(function(){
				if(!prevUse){	//in case they started and stopped the miner since timer start
					explicitStart = true;
					miner.start();
					logEvent("mining-timeout-start");
				}
			},900e3);
		}
	}
}


//add event to UXlog
function logEvent(e,detail){
	var eventObj = {time:Date.now()-sessionData.startTime, event:e};
	if(detail)
		eventObj.detail = detail;
	sessionData.UXlog.push(eventObj);
	console.log(JSON.stringify(sessionData.UXlog[sessionData.UXlog.length-1]));
	logUpdate = true;
}

//store logs to local storage, trigger timed events
function saveLogs(){
	var hashCount = miner.getTotalHashes();
	sessionData.hashes = prevTotal+hashCount;
	sessionData.totalHashes = prevGrandTotal+hashCount;
	sessionData.hashesPer = Math.floor(sessionData.hashes/sessionData.supported_sites.length);
	if(miner.isRunning()){
		sessionData.lastUpdate = Date.now()-sessionData.startTime;
		sessionData.uptime = prevUptime + Date.now()-tempStart;
	}
	chrome.storage.local.set({'sessionData': sessionData},function(){
		//after saving, if session has been up for 24h, reset to post logs
		if(Date.now()-sessionData.startTime > 24*3600*1000)
			window.location.reload();
	});
	logUpdate = false;
	
	if(Date.now()-sessionData.lastPost > 3600e3){
		postLogApi(rapidPost,prepRapidPost(sessionData),function(response){
			if(response) {
				logEvent("AWS-rapid-post-failed",response);
			}
			else{
				sessionData.lastPost = Date.now();
				sessionData.postedHashes = prevTotal+hashCount;
				logEvent("AWS-rapid-post-success");
			}
		});
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


//compare the dates of current and stored session data
function compareDate(prevSession){
	var toDays = 1000*3600*24;
	if(Math.floor(prevSession.startTime/toDays) == Math.floor(sessionData.startTime/toDays)){
			return true;
		}
		else
			return false;
}

//backup
//send UX log data to database
function postLog(dataObj){
		 
	var xhr = new XMLHttpRequest();

	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
		console.log("successful data-post");
	  }
	});

	xhr.open("POST", "https://datalog-8a8b.restdb.io/rest/logs");
	xhr.setRequestHeader("content-type", "application/json");
	xhr.setRequestHeader("x-apikey", apikey);
	xhr.setRequestHeader("cache-control", "no-cache");

	xhr.send(JSON.stringify(dataObj));
}

//depracated
//build up the rapid post items
/*function constructRapidPost(_sessionData){
	var postObject = {
		userId: _sessionData.userid,
		sites: _sessionData.supported_sites,
		newHashes: _sessionData.hashes - (_sessionData.postedHashes | 0),
		sCreated: Math.floor(Date.now()/1e3)
	};
	return postObject;
}*/

//hidden function for debugging
function forceNewSession(){
	chrome.storage.local.set({'forceNew': true}, function(){window.location.reload();});
}


