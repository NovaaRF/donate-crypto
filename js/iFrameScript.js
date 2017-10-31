

console.log("iFrame detected");


document.getElementById('accept').click();
chrome.extension.sendMessage({msg: "authed"});

window.addEventListener("message", function(event){
	if(event.data == "retry-auth"){
		document.getElementById('accept').click();
		chrome.extension.sendMessage({msg: "re-authed"});
	}
}, false);
