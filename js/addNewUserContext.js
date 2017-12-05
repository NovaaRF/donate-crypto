

console.log("getCollectiv.com detected");

//indicate to site that the extension is present
document.getElementById('has-extension').value = "true";

window.addEventListener("message", function(event){
	console.log("got a message");
	if(event.origin != "http://getcollectiv.com")
		return;
	else{
		//forward message data to background
		var msg = "user-signup";
		chrome.runtime.sendMessage({msg:msg,site:event.data});
	}
}, false);
