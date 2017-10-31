

console.log("iFrame detected");


document.getElementById('accept').click();
chrome.extension.sendMessage({msg: "authed"});

