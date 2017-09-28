//background.js

//generate a user ID
function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    return hex;
}



var miner;	//don't initialize until user name is fetched from memory
var userid;
var mySites;

chrome.storage.sync.get(['userid','mySites'], function(items) {
	//check if a userID exist, else generate and store one
    var stored_userid = items.userid;
    if (stored_userid) {
		console.log("userID found: "+stored_userid);
        userid = stored_userid;
    } else {
        userid = getRandomToken();
		console.log("No ID found, generated: " +userid);
        chrome.storage.sync.set({userid: userid}, function() {});
    }
	miner = new CoinHive.User('faLtux0jRiZXXe2iiN1XEfyj7sj5Ykg3',userid, {threads: 1});
	
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
});

/*
//fetch their supported sites
chrome.storage.sync.get('mySites', function(items) {
	
    var stored_sites = items.mySites;
    if (stored_sites) {
		console.log("Supported sites found: "+JSON.stringify(stored_sites));
        mySites = stored_sites;
    } else {
        mySites = {"site":["our-own-site.com","wikipedia.org"]};
		console.log("No sites found, defaulted to: " +JSON.stringify(mySites));
        chrome.storage.sync.set({mySites: mySites}, function() {});
    }
});
*/


//listen for commands from popup
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.msg == "mining-start")
			chrome.browserAction.setIcon({path:"Images/icon16.png"});
		else if(request.msg == "mining-stop")
			chrome.browserAction.setIcon({path:"Images/iconDisabled.png"});
    }
);


