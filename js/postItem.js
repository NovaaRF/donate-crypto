
AWS.config.update({
	//endpoint: "http://localhost:8000",
  region: "us-east-2",
  accessKeyId: "AKIAJYURZ5OUXUO65UOQ",
  secretAccessKey: "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"
});


var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

//for posting user logs (low frequency)
function postAWSlogs(dataObj){
	
	var params = {
		TableName: "user_logs",
		Item: dataObj
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
		} else {
			console.log("PUT operation to user_logs succeeded");
		}
	});
}


//for posting regular updates to totals (high frequency)
function rapidAWSpost(dataObj){
	var key = {
		userBin: dataObj.userId[0], //bin is simply first char of userid
		timeStamp: Math.floor(Date.now()/3600) //truncate into 1hr bins
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
		} else {
			console.log("UPDATE operation to rapid_post succeeded");
		}
	});
}

