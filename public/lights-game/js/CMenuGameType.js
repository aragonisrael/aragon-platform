function CMenuGameType(iMode) {
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;

    var _oContainer;
    var _oBg;
    var _oFade;
    var _oAudioToggle;
    var _oButFullscreen;
    var _oTextTitle;
    var _oTextTitleBack;
    var _oButPlayTime;
    var _oButPlayInfinite;
    
    var _pStartPosAudio;
    var _pStartPosFullscreen;

    this._init = function () {
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
        _oContainer.addChild(_oBg);

        _oTextTitleBack = new createjs.Text(TEXT_SELECT_TYPE," 48px "+PRIMARY_FONT, "#000000");
        _oTextTitleBack.textAlign = "center";
        _oTextTitleBack.lineWidth = 600;
        _oTextTitleBack.textBaseline = "middle";
        _oTextTitleBack.x = CANVAS_WIDTH_HALF + 2;
        _oTextTitleBack.y = CANVAS_HEIGHT_HALF - 198;
        _oContainer.addChild(_oTextTitleBack);

        _oTextTitle = new createjs.Text(TEXT_SELECT_TYPE," 48px "+PRIMARY_FONT, "#FFFFFF");
        _oTextTitle.textAlign = "center";
        _oTextTitle.lineWidth = 600;
        _oTextTitle.textBaseline = "middle";
        _oTextTitle.x = CANVAS_WIDTH_HALF;
        _oTextTitle.y = CANVAS_HEIGHT_HALF - 200;
        _oContainer.addChild(_oTextTitle);
        
        var iOffset = 150;
        
        _oButPlayTime = new CGfxButton(CANVAS_WIDTH_HALF - iOffset, CANVAS_HEIGHT_HALF, s_oSpriteLibrary.getSprite('but_type_time'), _oContainer);
        _oButPlayTime.addEventListenerWithParams(ON_MOUSE_UP, this._onButPlayRelease, this, TYPE_TIME);
        
        _oButPlayInfinite = new CGfxButton(CANVAS_WIDTH_HALF + iOffset, CANVAS_HEIGHT_HALF, s_oSpriteLibrary.getSprite('but_type_infinite'), _oContainer);
        _oButPlayInfinite.addEventListenerWithParams(ON_MOUSE_UP, this._onButPlayRelease, this, TYPE_INFINITE);
        
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: CANVAS_WIDTH - oSprite.width/4 -20, y: (oSprite.height / 2) + 10};
            _oAudioToggle = new CToggle(_pStartPosAudio.x, _pStartPosAudio.y, oSprite, s_bAudioActive,_oContainer);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
        }
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:20 + oSprite.width/4,y:(oSprite.height / 2) + 10};

            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,_oContainer);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(_oFade);

        createjs.Tween.get(_oFade).to({alpha: 0}, 1000).call(function () {
            _oContainer.removeChild(_oFade);
        });
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
    };

    this.unload = function () {
        _oButPlayTime.unload();
        _oButPlayInfinite.unload();
        _oButPlayTime = null;
        _oButPlayInfinite = null;

        _oContainer.removeChild(_oBg);
        _oBg = null;

        s_oStage.removeChild(_oContainer);

        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        s_oMenuGameType = null;
    };

    this.refreshButtonPos = function (iNewX, iNewY) {
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX, _pStartPosAudio.y + iNewY);
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }
    };
    
    this._onAudioToggle = function () {
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this._onButPlayRelease = function (iType) {
        this.unload();
        s_oMain.gotoGame(iMode, iType);
    };
    
    this._onFullscreenRelease = function(){
	if(s_bFullscreen) { 
            _fCancelFullScreen.call(window.document);
	}else{
            _fRequestFullScreen.call(window.document.documentElement);
	}
	
	sizeHandler();
    };
    
    this.resetFullscreenBut = function(){
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.setActive(s_bFullscreen);
	};
    };
    
    s_oMenuGameType = this;

    this._init();
}

var s_oMenuGameType = null;