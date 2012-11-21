// MAIN WINDOW

function MainWindow(){
	
	var self = Titanium.UI.createWindow({  
	    backgroundColor:BKME.bgColor
	
	});
	var welcomeText = function(){
		var greeting = (BKME.props.getInt('logCount') > 2) ? "Welcome " : "Welcome back, "; 
		var user = BKME.props.getString("username");
		return greeting + "@" + user + "!";
	}
	var helloLabel = Titanium.UI.createLabel({
		color:BKME.textColor,
		text:welcomeText(),
		textAlign:'center',
		width:'100%',
		left:'0%',
		top:'20dp',	
		touchEnabled: false,
	    font:{
	    	fontSize:BKME.fontSize,
	    	fontFamily:BKME.mainFont
	    	}
	});
	var mainImage = Titanium.UI.createImageView({
		image:'assets/mainBg.png',
		top: '150dp',
		left: '0dp',
		touchEnabled: false
	});
	var reportLabel = Titanium.UI.createLabel({
		color:BKME.textColor,
		text:'Tap anywhere to report\n a messed up bikelane',
		textAlign:'center',
		width:'100%',
		left:'0%',
		top:'70%',
		touchEnabled: false,
	    font:{
	    	fontSize:BKME.fontSize,
	    	fontFamily:BKME.mainFont
	    	}
	});
	var reportView = Titanium.UI.createView({
		top:'10%',
		left:'0%',
		width:'100%',
		height:'80%',
		zIndex: 20
		
	});
	
	var onCameraSuccess = function(e){
		var ratio = e.media.width / e.media.height;
		var vertical = (ratio < 1) ? true : false;
		Ti.API.info("photo success!");

		BKME.current.timestamp = Date();
		BKME.current.geo = BKME.getGeo();
		
		var photo = Ti.UI.createImageView({
			image: e.media,
			height:1024
		});
		var tempFilename = 'photo_'+BKME.current.timestamp+'.jpg';
		var file = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, tempFilename );
		file.write(photo.toImage());
		BKME.current.filename = tempFilename;
		BKME.dbAdd(BKME.current);
	
	};
	var  onCameraCancel = function(){
		
	};
	var onCameraError = function(error){
		alert("There was an error with your camera. Please try again.");
	};
			
	
	reportView.addEventListener('singletap', function(e){
		//reset current report
		BKME.current = {}
		Ti.Media.showCamera({
	    saveToPhotoGallery: BKME.preferences.savePhoto
	    , mediaTypes: [Titanium.Media.MEDIA_TYPE_PHOTO]
	    , success: onCameraSuccess,
	    cancel:onCameraCancel,
        error:onCameraError
	    });
	    Ti.Media.CameraFlashMode = Ti.Media.CAMERA_FLASH_OFF;

	});
	
	self.add(helloLabel);
	self.add(mainImage);
	self.add(reportLabel);
	self.add(reportView);
	return self;
}

exports.MainWindow = MainWindow;