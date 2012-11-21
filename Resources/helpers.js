//os flags
BKME.is = {};
if(Ti.Platform.osname=='android') {
   BKME.is.android = true;
   BKME.is.ios = false;
} else {
	BKME.is.ios = true;
	BKME.is.android = false;
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
if (BKME.is.android) BKME.mainFont = 'ITCAvantCardeStd';

//general background.
Titanium.UI.setBackgroundColor(BKME.bgColor);
		
// to store user preferences.
	BKME.preferences = {};
	BKME.preferences.savePhoto = false;
	

	
//GEOLOCATION
BKME.geo = BKME.geo || {};
BKME.geo.translateErrorCode = function(code) {
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



BKME.geo.last =  BKME.geo.last || {};	

BKME.geo.get = function(){
	var howOld = 30;	
	//titanium preferences for iPhone
	Titanium.Geolocation.setAccuracy(Titanium.Geolocation.ACCURACY_BEST);
	Titanium.Geolocation.setDistanceFilter(10);
	Ti.Geolocation.purpose = "Link the report to your current location.";

	// if timestamp is not defined, set it at 2010
	BKME.geo.last.timestamp = BKME.geo.last.timestamp || new Date().setFullYear(2010);
	
	Ti.API.info( "last:"+ BKME.geo.last.timestamp +", current:"+ Date());
	var diff = Math.abs(new Date() - BKME.geo.last.timestamp);
	Ti.API.info( "diff is: " + diff );
	
	if( diff > howOld*1000 ) {
		Ti.API.info("geo is too old, getting new geo");

	    Titanium.Geolocation.getCurrentPosition(function(e) {});
						
		var locationCallback = function(e) {
	        if (!e.success || e.error) {
	        	Ti.API.info("ERROR: "+BKME.geo.translateErrorCode(e.code));
	        	return;
    		}
    		var last = {
    			timestamp : e.coords.timestamp,
	    		lon : e.coords.longitude,
			    lat : e.coords.latitude,
			    alt : e.coords.altitude,
			    heading : e.coords.heading,
			    accuracy : e.coords.accuracy,
			    speed : e.coords.speed	
    		}
    		BKME.geo.last = last;
			Ti.API.info("current location is: " + BKME.geo.last.lat + ', ' + BKME.geo.last.lon);
			return BKME.geo.last;
    	};
    	Titanium.Geolocation.addEventListener('location', locationCallback);
	}

}

// END GEOLOCATION


// DATABASE
BKME.db = {};
BKME.db.open = function(){	
	BKME.db.db = BKME.db.db || Titanium.Database.open('bkmedb');
	db.execute('CREATE TABLE IF NOT EXISTS reports ( data TEXT, deliveryStatus INTEGER )');

	if (BKME.db.closeTimer) clearTimeout(BKME.db.closeTimer);
	BKME.db.closeTimer = setTimeout(function(){
		BKME.db.db.close();
		BKME.db.db = false;
	},60*1000);
	return BKME.db.db;
}

BKME.db.add = function(report){
	var reportString = JSON.stringify(report),
		db = BKME.db.open();
		
	db.execute('INSERT INTO reports (data, deliveryStatus ) VALUES(?,?)',reportString,0);	
	Titanium.API.info('JUST INSERTED, rowsAffected = ' + db.rowsAffected, ' lastInsertRowId = ' + db.lastInsertRowId);
	
}

BKME.db.getNotSent = function() {
	var rows, db,
		reports = [],
		thisReport = {},
		status = 0; // not sent
			
	db = BKME.db.open(),
	rows = db.execute('SELECT * FROM reports WHERE deliveryStatus ?', status);
  	if ( rows.getRowCount() == 0 ) {
  		db.close();
  		clearTimeout(BKME.db.closeTimer);
		return 0;
	}
  	
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

BKME.db.markAsSent = function(rowId){
	var db = BKME.db.open();
	db.execute('UPDATE reports SET deliveryStatus = ? WHERE ROWID = ?', 1, rowId);
}


BKME.db.cleanup = function(){
	var db = BKME.db.open();
	db.execute('DELETE FROM reports WHERE deliveryStatus = ?', 1);
}

//END DATABASE


BKME.sendReports = function(){
	var reports = BKME.db.etNotSent();
		Ti.API.info("Checking unsent reports...");
	
	// if there are no reports, exit	
	if (reports == 0 ) {
		Ti.API.info("No reports left to be sent.");
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
