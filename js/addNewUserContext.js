

console.log("getCollectiv.com detected");

//indicate to site that the extension is present
document.getElementById('has-extension').value = "true";

window.addEventListener("message", function(event){
	if(event.origin != "http://getcollectiv.com/add.html")
		return;
	else{
		//forward message data to background
		chrome.extension.sendMessage(event.data);
	}
}, false);
