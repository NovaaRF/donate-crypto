
AWS.config.update({
	//endpoint: "http://localhost:8000",
  region: "us-east-2",
  accessKeyId: "AKIAJYURZ5OUXUO65UOQ",
  secretAccessKey: "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"
});

var testData;
var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
var numBins = 2;

//depracated..
//for posting user logs (low frequency)
function postAWSlogs(dataObj,callback){
	
	var params = {
		TableName: "user_logs",
		Item: JSON.parse(JSON.stringify(dataObj))
	};
	params.Item.userUniqueId = dataObj.userid +'_'+dataObj.machineID;
	params.Item.timeStamp = Date.now();
	
	delete params.Item.postedHashes;
	delete params.Item.lastPost;
	
	console.log("Adding to user_logs:",params);
	
	docClient.put(params, function (err, data) {
		if (err) {
			console.log("there was an error with PUT to user_logs");
			console.log("Error JSON: " + JSON.stringify(err));
			if(callback)
				callback(false,err);
		} else {
			console.log("PUT operation to user_logs succeeded");
			if(callback){
				testData = data;
				callback(true,data);
			}
		}
	});
}

//Depracated..
//for posting regular updates to totals (high frequency)
function rapidAWSpost(dataObj,callback){
	//generate bin from first characters of userId, reduced.
	var userBinString = parseInt(dataObj.userId.substring(0,3),16)%numBins;
	var key = {
		userBin: ""+userBinString,
		timeStamp: Math.floor(Date.now()/3600e3) //truncate into 1hr bins
	};
	var updateExpression = "SET posts = list_append(if_not_exists(posts, :empty_list), :new)";
	var attributeValues = {":empty_list":[], ":new":[dataObj]};
	
	var params = {
		TableName: "rapid_post",
		Key: key,
		UpdateExpression: updateExpression,
		ExpressionAttributeValues: attributeValues
	};
	
	console.log("Adding to rapid_posts:",params);
	
	docClient.update(params, function (err, data) {
		if (err) {
			console.log("there was an error with UPDATE to rapid_post");
			console.log("Error JSON: " + JSON.stringify(err));
			if(callback)
				callback(false,err);
		} else {
			console.log("UPDATE operation to rapid_post succeeded");
			if(callback)
				callback(true,data);
		}
	});
}


//format userLogs for posting through API
function prepUserLogs(preData){
	var data = JSON.parse(JSON.stringify(preData));	//make a clone of the input object
	data.userUniqueId = data.userid + "_" + data.machineID;
	data.timeStamp = Date.now();
	delete data.postedHashes;
	delete data.lastPost;
	//console.log(data);
	return JSON.stringify(dynamodbMarshaler.marshal(data));
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
		console.log(xhr.responseText);
		testData=xhr.responseText;
		if(callback){
			if(xhr.responseText == "{}")	//replace empty object {} with null
				callback(null);
			else
				callback(xhr.responseText);
		}
	  }
	});

	xhr.open("POST", apiEndpoint+path);
	xhr.setRequestHeader("content-type", "application/json");
	//xhr.setRequestHeader("x-apikey", apikey);
	//xhr.setRequestHeader("cache-control", "no-cache");

	xhr.send(dataString);
}

