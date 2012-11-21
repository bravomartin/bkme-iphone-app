// this sets the background color of the master UIView (when there are no windows/tab groups on it)
BKME = {};
BKME.debug = false;

Ti.include('helpers.js');

BKME.cfg = require('config').Config;
BKME.props = Ti.App.Properties;

    var Twitter = require('lib/twitter').Twitter;    
    var client = Twitter({
      consumerKey: BKME.cfg.consumerKey,
      consumerSecret: BKME.cfg.consumerSecret,
      accessTokenKey: BKME.cfg.accessTokenKey, 
      accessTokenSecret: BKME.cfg.accessTokenSecret,
      windowTile : "Authorize with TwitterID"
    });

//
// create base UI tab and root window
//
//get geo and set a listener for getting geo every time it resumes.
BKME.geo.get();
Ti.App.addEventListener('resume',function(e) {
	BKME.geo.get();
});
Ti.App.addEventListener('close',function(e) {
	// here it should be added the background process for uploading the reports
});

	
if (client.authorized){
	Ti.API.info("already authorized, straight to mainwin")
	var MainWindow = require('views/MainWindow').MainWindow;
	var mainWindow = new MainWindow;
	mainWindow.open();
} else {
	Ti.API.info("first time around, welcome");

	var WelcomeWindow = require('views/WelcomeWindow').WelcomeWindow;
	var welcomeWindow = new WelcomeWindow;
	welcomeWindow.open();
}
// oauth client stuff



 client.addEventListener('login', function(e) {
      if (e.success) {

        BKME.props.setString('twitterAccessTokenKey', e.accessTokenKey);
        BKME.props.setString('twitterAccessTokenSecret', e.accessTokenSecret);
      	Ti.API.info("loged in: " + BKME.props.getString('twitterAccessTokenKey') );
        
        client.request("1.1/account/verify_credentials.json", {skip_status: true}, 'GET', function(e) {
          if (e.success) {
          	Ti.API.info("got credentials");
            var json = JSON.parse(e.result.text);
            BKME.user = json;
            BKME.props.setString('username', BKME.user.screen_name);
            BKME.props.setInt('userId', BKME.user.id);
            var logCount = BKME.props.getInt('logCount', 0) + 1;
            BKME.props.setInt('logCount',logCount);
            if(welcomeWindow) {
				var MainWindow = require('views/MainWindow').MainWindow;
				var mainWindow = new MainWindow;
				welcomeWindow.animate({
					view: mainWindow,
					transition:Ti.UI.iPhone.AnimationStyle.FLIP_FROM_LEFT
				});
			}	
	            
          } else  {
            alert(e.error);
          }
        });
      } else {
        alert(e.error);
      }
    });
    
