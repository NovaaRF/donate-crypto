//translate between extension and window contexts

console.log("getCollectiv.com detected");

//indicate to site that the extension is present
document.getElementById('has-extension').value = "true";
//manually trigger change event
var evt = new CustomEvent('change');
document.getElementById('has-extension').dispatchEvent(evt);

window.addEventListener("message", function(event){
	console.log("got a message");
	if(event.origin == "http://getcollectiv.com" && event.data.msg != "success"){
		//forward message data to background
		var msg = "user-signup";
		chrome.runtime.sendMessage({msg:msg,site:event.data}, function(response){
			if(response.success){
				console.log("forwarding to window context");
				window.postMessage({msg:"success"},"http://getcollectiv.com");
			}
		});
	}
}, false);
