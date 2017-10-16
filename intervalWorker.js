//Independent worker used for timing tasks to prevent lag when browser inactive

var rampInterval;
var logInterval;

//Trigger when requested from background
self.addEventListener('message', function(e) {
	// Send timing info back
	if(e.data == "start-ramp"){
		rampInterval = setInterval(function(){
			self.postMessage("tick-ramp");
		},180e3);
	}else if(e.data == "start-log"){
		logInterval = setInterval(function(){
			self.postMessage("tick-log");
		},5e3);
	}else if(e.data == "stop-ramp"){
		clearInterval(rampInterval);
	}
}, false);