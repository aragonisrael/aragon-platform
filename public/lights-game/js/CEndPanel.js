function CEndPanel(iMode){
    var _oContainer;
    var _oFade;
    var _oBg;
    var _oButExit;
    var _oButRestart;
    var _oThis;
    var _oInterface;
    
    var _iMode;
        
    this._init = function(){
        _iMode = iMode;
        
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);

        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.on("mousedown",function(){});
        _oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_end_panel"));
        _oContainer.addChild(_oBg, _oFade);

        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        var oPanel = createBitmap(oSprite);  
        oPanel.regX = oSprite.width/2;
        oPanel.regY = oSprite.height/2;
        oPanel.x = CANVAS_WIDTH_HALF;
        oPanel.y = CANVAS_HEIGHT_HALF;
        _oContainer.addChild(oPanel);

        var iWidth = 450;
        var iHeight = 200;
        var oMsgTextGameOver = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, CANVAS_HEIGHT/2 - iHeight/2 - 120, iWidth, iHeight, 
                    36, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_GAMEOVER,
                    true, true, true,
                    false );
        
        var iWidth = 450;
        var iHeight = 200;
        var _oMsgTextFinalScore = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, CANVAS_HEIGHT/2 - iHeight/2, iWidth, iHeight, 
                    36, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_END_PANEL + ": " + 0,
                    true, true, true,
                    false );
        
        
        
        _oButExit = new CGfxButton(CANVAS_WIDTH_HALF - 170, 850, s_oSpriteLibrary.getSprite('but_home'), _oContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);        
        
        _oButRestart = new CGfxButton(CANVAS_WIDTH_HALF + 170, 850, s_oSpriteLibrary.getSprite('but_restart'), _oContainer);
        _oButRestart.addEventListener(ON_MOUSE_UP, this._onRestart, this);
        
        _oInterface = new CInterface(_iMode);
        
        _oContainer.alpha = 0;
	createjs.Tween.get(_oContainer)
            .wait(1500)
            .to({alpha: 1}, 2000, createjs.Ease.cubicOut)
            .call(function(){$(s_oMain).trigger("show_interlevel_ad");});
    };
    
    this.unload = function(){
        _oButExit.unload(); 
        _oButRestart.unload();
        
        s_oStage.removeChild(_oContainer);
        s_oEndPanel = null;
    };
    
    this._onExit = function(){
        _oThis.unload();
        s_oGame.onExit();
    };
    
    this._onRestart = function(){
        _oThis.unload();
        s_oGame.restart();
    };
    
    s_oEndPanel = this;
    
    _oThis = this;
    this._init();
}

var s_oEndPanel = null;