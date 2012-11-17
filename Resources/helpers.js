//os flags
	if(Ti.Platform.osname=='android') {
	   BKME.isAndroid = true;
	   BKME.isIos = false;
	} else {
		BKME.isIos = true;
		BKME.isAndroid = false;
	} 
	
//General Style Variables
	BKME.bgColor = '#ededf5';
	BKME.green = '#50C960';
	BKME.textColor = '#333333';
	BKME.mainFont = 'ITC Avant Garde Gothic Std'; // use the friendly-name on iOS
	BKME.fontSize = '16dp';
	BKME.fontSmall = '14dp';

//custom font
// on Android, use the "base name" of the file (name without extension)	
if (BKME.android) BKME.mainFont = 'ITCAvantCardeStd';

//general background.
Titanium.UI.setBackgroundColor(BKME.bgColor);
		
// to store user preferences.
	BKME.preferences = {};
	BKME.preferences.savePhoto = false;
	

	
//GEOLOCATION
function translateErrorCode(code) {
	if (code == null) {
		return null;
	}
	switch (code) {
		case Ti.Geolocation.ERROR_LOCATION_UNKNOWN:
			return "Location unknown";
		case Ti.Geolocation.ERROR_DENIED:
			return "Access denied";
		case Ti.Geolocation.ERROR_NETWORK:
			return "Network error";
		case Ti.Geolocation.ERROR_HEADING_FAILURE:
			return "Failure to detect heading";
		case Ti.Geolocation.ERROR_REGION_MONITORING_DENIED:
			return "Region monitoring access denied";
		case Ti.Geolocation.ERROR_REGION_MONITORING_FAILURE:
			return "Region monitoring access failure";
		case Ti.Geolocation.ERROR_REGION_MONITORING_DELAYED:
			return "Region monitoring setup delayed";
	}
}



BKME.lastGeo = (BKME.hasOwnProperty('lastGeo')) ? BKME.lastGeo : {};	

BKME.getGeo = function(){
	var howOld = 30;	
	//titanium preferences for iPhone
	Titanium.Geolocation.setAccuracy(Titanium.Geolocation.ACCURACY_BEST);
	Titanium.Geolocation.setDistanceFilter(10);
	Ti.Geolocation.purpose = "Link the report to your location.";

	// if timestamp is not defined, set it at 2010
	if ( ! BKME.lastGeo.hasOwnProperty("timestamp") ) BKME.lastGeo.timestamp = new Date().setFullYear(2010);
	
	Ti.API.info( "last:"+ BKME.lastGeo.timestamp +", current:"+ Date());
	var diff = Math.abs(new Date() - BKME.lastGeo.timestamp);
	Ti.API.info( "diff is: " + diff );
	
	if( diff > howOld*1000 ) {
		Ti.API.info("geo is too old, getting new geo");

		Titanium.Geolocation.getCurrentPosition(function(e) {
		    if (e.error) {
		    	Ti.API.info("ERROR: "+translateErrorCode(e.code));
        		alert('Can\'t get your current location, please enable');
	        return;
    		}
		    BKME.lastGeo.timestamp = e.coords.timestamp;
    		BKME.lastGeo.lon = e.coords.longitude;
		    BKME.lastGeo.lat = e.coords.latitude;
		    BKME.lastGeo.alt = e.coords.altitude;
		    BKME.lastGeo.heading = e.coords.heading;
		    BKME.lastGeo.accuracy = e.coords.accuracy;
		    BKME.lastGeo.speed = e.coords.speed;
		});
	}
	Ti.API.info("current location is: " + BKME.lastGeo.lat + ', ' + BKME.lastGeo.lon)
	return BKME.lastGeo;
}

// END GEOLOCATION


// DATABASE

BKME.dbOpen = function(){	
	var db = db || Titanium.Database.open('bkmedb');
	db.execute('CREATE TABLE IF NOT EXISTS reports ( data TEXT, deliveryStatus INTEGER )');
	return db;
}

BKME.dbAdd = function(report){
	var reportString = JSON.stringify(report),
		db = BKME.dbOpen();
		
	db.execute('INSERT INTO reports (data, deliveryStatus ) VALUES(?,?)',reportString,0);
	
	Titanium.API.info('JUST INSERTED, rowsAffected = ' + db.rowsAffected, ' lastInsertRowId = ' + db.lastInsertRowId);
	
	db.close();
}

BKME.dbGetNotSent = function() {
	var rows, db,
		reports = [],
		thisReport = {},
		status = 0; // not sent
			
	db = BKME.dbOpen(),
	rows = db.execute('SELECT * FROM reports WHERE deliveryStatus ?', status);
	db.close();
  	if ( rows.getRowCount() === 0 ) return 0;
  	
  	while (rows.isValidRow()){
		thisReport = {
			'rowId' : rows.fieldByName('ROWID'),
			'data' : JSON.parse(rows.fieldByName('data')),
			'deliveryStatus' : rows.fieldByName('deliveryStatus')
		}
	  	reports.push(thisReport);
	  	rows.next();
	}
	rows.close();

	return reports;
}

BKME.dbMarkAsSent = function(rowId){
	var db = BKME.dbOpen();
	db.execute('UPDATE reports SET deliveryStatus = ? WHERE ROWID = ?', 1, rowId);
}


BKME.dbCleanup = function(){
	var db = BKME.dbOpen();
	db.execute('DELETE FROM reports WHERE deliveryStatus = ?', 1);
}

//END DATABASE


BKME.sendReports = function(){
	var reports = BKME.dbGetNotSent();
	
	// if there are no reports, exit	
	if (reports == 0 ) {
		Ti.API.info("Checked unsent reports. nothing to send.");
		return;
	}
	var thisReport,
		totalReports = reports.length,
		client,
		url = "http://bkmedev.heroku.com/receivereport/";
		
	for(var i = 0; i < reports.length; i++) {
		thisReport = reports[i];
		if (thisReport.deliveryStatus == 0) {
			client = Ti.Network.createHTTPClient({
			     // function called when the response data is available
			     onload : function(e) {
			     	BKME.dbMarkAsSent(thisReport.rowId);
			     	Ti.API.info("Received text: " + this.responseText);
			        alert('success');
			     },
			     // function called when an error occurs, including a timeout
			     onerror : function(e) {
			         Ti.API.debug(e.error);
			         alert('error');
			         return; // exit and try again later
			     },
			     timeout : 5000  // in milliseconds
			 });
			 // Prepare the connection.
			 client.open("POST", url);
			 // Send the request.
			 client.send(thisReport.data); 			
		}
	}
	
}
