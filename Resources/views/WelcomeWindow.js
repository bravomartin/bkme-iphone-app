var WelcomeWindow = function(){


	var self = Titanium.UI.createWindow({
		backgroundColor:BKME.bgColor
	});
	var bottomBar = Titanium.UI.createView({
		backgroundColor:'#003000',
		bottom: '0dip',
		width:'100%',
		height:'60dip'
	});
	
	var loginButton = Titanium.UI.createButton({
		color:BKME.textColor,
		title: 'login with twitter',
		textAlign:'center',
		left:'10dip',
		font:{
	    	fontSize:BKME.fontSmall,
	    	fontFamily:BKME.mainFont
	  	},
	   	background: BKME.green
	});
	var result = Titanium.UI.createLabel({
		  top: '0%',
		  width: '100%', 
		  height: '70%'
	});


	loginButton.addEventListener('click', function(e){
		client.authorize();
		// goToMain();			
	});
	
	bottomBar.add(loginButton);
	self.add(bottomBar);
	self.add(result);
	
	return self;

}

exports.WelcomeWindow = WelcomeWindow;
