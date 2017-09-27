var state = "showing";

//show/hide buttons based on the state
function setState(new_state) {
	if(state == "showing" && new_state == "add"){
		document.getElementById('remove-site').style.display = 'none';
		state = "adding";
	} else if(state == "showing" && new_state == "remove"){
		document.getElementById('add-site').style.display = 'none';
		state = "removing";
	} else if(state == "adding" && new_state == "add"){
		document.getElementById('remove-site').style.display = 'block';
		state = "showing";
	} else if(state == "removing" && new_state == "remove"){
		document.getElementById('add-site').style.display = 'block';
		state = "showing";
	}
}

document.addEventListener('DOMContentLoaded', function (){
	
	document.getElementById('add-site').addEventListener('click',function(){
		setState("add");
	});
	document.getElementById('remove-site').addEventListener('click',function(){
		setState("remove");
	});
	//configure 'back' button
	document.getElementById('add-back').addEventListener('click',function(){
		window.location.href="popup.html";
	});
});