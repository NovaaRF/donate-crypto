//background.js


var miner;	//don't initialize until user name is fetched from memory
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
		lossFrom:[],
		sids:[]};
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
	var toDefault = false;
    if (stored_sites) {
		console.log("Supported sites found: "+JSON.stringify(stored_sites));
		//get rid of legacy site structures
		if(stored_sites.site){
			toDefault = true;
		}else if(stored_sites[0].id){
			sessionData.supported_sites = stored_sites;
		}else
			toDefault = true;
    } 
	
	if(typeof stored_sites == 'undefined' || toDefault){
		//check for referral cookie
		generateStartingSites();
    }
	
	syncDataReady = true;
	attemptStart();
});


var badPosts;
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
					chrome.storage.local.get('failedPosts',function(Items){
						if(Items.failedPosts){
							Items.failedPosts.push(items.sessionData);
						}else{
							Items.failedPosts = [items.sessionData];
						}
						chrome.storage.local.set({'failedPosts':Items.failedPosts});
					})
				}else{
					logEvent("AWS-logs-success");
				} 
			});
			postLogApi(rapidPost,prepRapidPost(items.sessionData),function(response){
				if(response) {
					logEvent("AWS-rapid-post-failed",response);
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
	}
}, false);


//listen for messages from other scripts
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
		if(request.to)
			return;
		
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
			
		}else if(request.msg == "user-signup"){
			addSite(request.site);
			sendResponse({success:true});
		}
		logEvent(request.msg);
    }
);

/*
//listen for messages from getcollectiv.com
chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse){
		logEvent("message-from-site");
		console.log(request.msg);
		addSite(request.msg);
	}
);*/


//------  Helper functions   --------

//check for referral cookie or generate default starting sites
function generateStartingSites(){
	var details = {domain:"getcollectiv.com"};
	chrome.cookies.getAll(details,function(cookies){
		var startingSite = {};
		if(cookies.length > 0){
			for(var i=0;i<cookies.length;i++){
				if(cookies[i].name == "referral-id")
					startingSite.id = cookies[i].value;
				if(cookies[i].name == "site-name")
					startingSite.name = cookies[i].value;
			}
			console.log("Found referral cookie from: " +startingSite.name);
		}else{
			startingSite = {id:"wikipedia.org",name:"wikipedia.org"};
			console.log("No sites found, defaulted to: " +startingSite.name);
		}
		if(startingSite.name && startingSite.id)
			addSite(startingSite);
	});
}


//start the miner when local and synced data are available
function attemptStart() {
	if(localDataReady && syncDataReady){
		sessionData.supported_sites.forEach(function(e){sessionData.sids.push(e.id);});
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


var lastPost = 0;
var postInProgress = false;
//store logs to local storage, trigger timed events
function saveLogs(){
	var hashCount = miner.getTotalHashes();
	sessionData.hashes = prevTotal+hashCount;
	sessionData.totalHashes = prevGrandTotal+hashCount;
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
	
	//hourly post
	if(Date.now()-sessionData.lastPost > 3600e3){
		console.log("hourly rapid post");
		
		if(!postInProgress){
			postLogApi(rapidPost,prepRapidPost(sessionData),function(response){
				if(response) {
					logEvent("AWS-rapid-post-failed",response);
					sessionData.postedHashes -= lastPost;
					postInProgress = false;
				}
				else{
					logEvent("AWS-rapid-post-success");
					postInProgress = false;
				}
			});
			postInProgress = true;
		}
		sessionData.lastPost = Date.now();
		sessionData.postedHashes = prevTotal+hashCount;
		var lastPost = hashCount;
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


//hidden function for debugging
function forceNewSession(){
	chrome.storage.local.set({'forceNew': true}, function(){window.location.reload();});
}


//add a supported site
function addSite(newSite){
	var siteList;
	var siteIDs = [];
	if(sessionData.supported_sites){
		siteList = sessionData.supported_sites;
		//return if site already on list
		for(var k=0;k<siteList.length;k++){
			siteIDs.push(siteList[k].id);
			if(siteList[k].id == newSite.id){
				logEvent("duplicate-site");
				return;
			}
		}
		siteList.push(newSite);
	}else{
		siteList = [newSite];
	}
	siteIDs.push(newSite.id);
	chrome.storage.sync.set({mySites: siteList});
	sessionData.newTo.push(newSite.id);
	sessionData.supported_sites = siteList;
	sessionData.sids = siteIDs;
	logEvent("added-site: "+newSite.name);
}

//remove a supported site
function removeSite(i){
	sessionData.lossFrom.push(sessionData.supported_sites[i].id);
	var removed = sessionData.supported_sites[i].name;
	sessionData.supported_sites.splice(i,1);
	chrome.storage.sync.set({mySites: sessionData.supported_sites});
	logEvent("remove-site: "+removed);
}
