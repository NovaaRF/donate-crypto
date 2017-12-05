
/*AWS.config.update({
  region: "us-east-2",
});*/

var testData;
var numBins = 2;


//format userLogs for posting through API
function prepUserLogs(preData){
	var data = JSON.parse(JSON.stringify(preData));	//make a clone of the input object
	data.userUniqueId = data.userid + "_" + data.machineID;
	data.timeStamp = Date.now();
	delete data.postedHashes;
	delete data.lastPost;
	delete data.newTo;	//to prevent empty values
	delete data.lossFrom;
	if(data.UXlog.length == 0)
		delete data.UXlog;
	//console.log(data);
	var formattedData = dynamodbMarshaler.marshal(data);
	return JSON.stringify(formattedData.M);
}


//format rapidPosts for transmission through the API
function prepRapidPost(preData){
	//first edit data inclusions
	var data = {
		userId: preData.userid,
		sites: preData.supported_sites,
		newHashes: preData.hashes - (preData.postedHashes | 0),
		sCreated: Math.floor(Date.now()/1e3)
	};
	
	if(preData.newTo && preData.lossFrom){
		if(preData.newTo[0]){
			data.newTo = preData.newTo;
		}
		if(preData.lossFrom[0]){
			data.lossFrom = preData.lossFrom;
		}
	}
	preData.newTo = [];
	preData.lossFrom = [];
	
	//then generate parameters JSON
		//generate bin from first characters of userId, reduced.
	var userBinString = parseInt(data.userId.substring(0,3),16)%numBins;
	var key = {
		userBin: {S:""+userBinString},
		timeStamp: {N: ""+Math.floor(Date.now()/3600e3)} //truncate into 1hr bins
	};
	var updateExpression = '"SET posts = list_append(if_not_exists(posts, :empty_list), :new)"';
	var attributeValues = '{'
		+' ":empty_list": {"L":[]}, '
		+' ":new": {"L":['+JSON.stringify(dynamodbMarshaler.marshal(data))+']}'
		+'}';
	
	var params = '{'
		+'"Key": ' + JSON.stringify(key) +','
		+'"UpdateExpression": '+updateExpression+','
		+'"ExpressionAttributeValues": '+attributeValues
	+'}';
	return params;
}


var userLogs = "/logs";
var rapidPost = "/rapid";
var apiEndpoint = "https://1azza0hmgb.execute-api.us-east-2.amazonaws.com/Test_v1";
//send UX log data to database via API
function postLogApi(path,dataString,callback){
		 
	var xhr = new XMLHttpRequest();

	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
		console.log("Request status: "+xhr.status);
		//console.log(xhr.responseText);
		testData=xhr.responseText;
		if(callback){
			if(xhr.status != 200){
				callback("request status: "+xhr.status);
			}else if(xhr.responseText == "{}")	//replace empty object {} with null
				callback(null);
			else{
				console.log(xhr.responseText);
				callback(xhr.responseText);
			}
		}
	  }
	});

	xhr.open("POST", apiEndpoint+path);
	xhr.setRequestHeader("content-type", "application/json");
	//xhr.setRequestHeader("x-apikey", apikey);
	//xhr.setRequestHeader("cache-control", "no-cache");

	xhr.send(dataString);
}

