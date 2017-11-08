
AWS.config.update({
  region: "us-east-2",
  accessKeyId: "AKIAJYURZ5OUXUO65UOQ",
  secretAccessKey: "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"
});


var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

function postAWSlogs(dataObj){
	
	var params = {
		TableName: "user_logs",
		Item: dataObj
	};
	params.Item.userUniqueId = dataObj.userid +'_'+dataObj.machineID;
	params.Item.timeStamp = Date.now();
	
	console.log("Adding to database:",params.Item);
	
	docClient.put(params, function (err, data) {
		if (err) {
			console.log("there was an error with PUT..");
			console.log("Error JSON: " + JSON.stringify(err));
		} else {
			console.log("PUT operation succeeded");
		}
	});
}

