function CWinPanel(iMode, iTimeSpent, iLevel, iLevelStars){    
    var _oContainer;
    var _oFade;
    var _oBg;
    var _oButExit;
    var _oButNext;
    
    var _oInterface;
    
    var _iMode;
    var _iTimeSpent;
    var _iScore;
    var _iBestScore;
    var _iLevel;
    var _iLevelStars;

    this._init = function(){
        _iMode = iMode;
        _iTimeSpent = iTimeSpent;
        _iLevel = iLevel;
        _iLevelStars = iLevelStars;
        _iBestScore = s_aBestScore[_iMode];
        
        var iPositionLine0 = CANVAS_HEIGHT_HALF - 200;
        var iPositionLine1 = CANVAS_HEIGHT_HALF - 160;
        var iPositionLine2 = CANVAS_HEIGHT_HALF - 80;
        var iPositionLine3 = CANVAS_HEIGHT_HALF - 50;
        var iPositionLine4 = CANVAS_HEIGHT_HALF - 20;
        
        _iScore = Math.ceil((TIME[_iMode] - _iTimeSpent)/100) * SCORE_MULTIPLIER[_iMode];
        
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

        var iWidth = 500;
        var iHeight = 200;
        var oMsgText = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine0 - iHeight/2, iWidth, iHeight, 
                    30, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_CONGRATS,
                    true, true, true,
                    false );

        var oMsgText1 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine1 - iHeight/2, iWidth, iHeight, 
                    30, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_YOU_MADE + " " + Math.ceil((TIME[_iMode] - _iTimeSpent)/100) + " " + TEXT_PTS + "!",
                    true, true, true,
                    false );

        var oMsgText2 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine2 - iHeight/2, iWidth, iHeight, 
                    24, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_MULTIPLIER + "x" + SCORE_MULTIPLIER[_iMode],
                    true, true, true,
                    false );

        var oMsgText3 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine3 - iHeight/2, iWidth, iHeight, 
                    24, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_TOTAL_SCORE + s_iTotalScore,
                    true, true, true,
                    false );

        this.addStars();

        _oButExit = new CGfxButton(CANVAS_WIDTH_HALF - 170, 850, s_oSpriteLibrary.getSprite('but_home'), _oContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        _oButNext = new CGfxButton(CANVAS_WIDTH_HALF + 170, 850, s_oSpriteLibrary.getSprite('but_next'), _oContainer);
        _oButNext.addEventListener(ON_MOUSE_UP, this._onNext, this);

        _oInterface = new CInterface(_iMode);

        _oContainer.alpha = 0;
	createjs.Tween.get(_oContainer)
            .wait(1500)
            .to({alpha: 1}, 2000, createjs.Ease.cubicOut)
            .call(function(){$(s_oMain).trigger("show_interlevel_ad");});

        setVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME );
    };
    
    this.addStars = function(){
        var iX = CANVAS_WIDTH_HALF;
        var iY = CANVAS_HEIGHT_HALF + 100;
        
        for (var i = 0; i < 3; i++) {
            var oData = {
                images: [s_oSpriteLibrary.getSprite('star')],
                // width, height & registration point of each sprite
                frames: {width: 70, height: 70, regX: 70/2, regY: 70/2},
                animations: {off: [0], on: [1]}
            };

            var oSpriteSheet = new createjs.SpriteSheet(oData);
            var oStar = createSprite(oSpriteSheet, "off", 70/2, 70/2, 70, 70);
            
            var aOffsetX = [-60, 0, 60];
            oStar.x = iX + aOffsetX[i];
            oStar.y = iY - 55;
            
            if (_iLevelStars > i) {
                oStar.gotoAndPlay("on");
            }

            var iRandomRotation = Math.random(200)+50;
            var iRandomTime = Math.random(1000)+1000;
            var iScale = 0.5;

            createjs.Tween.get(oStar, {loop:true})
                .to({rotation: -1*iRandomRotation, scaleX: iScale, scaleY: iScale}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: 0, scaleX: 1, scaleY: 1}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: iRandomRotation, scaleX: iScale, scaleY: iScale}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: 0, scaleX: 1, scaleY: 1}, iRandomTime, createjs.Ease.quadOut);
        
            _oContainer.addChild(oStar);
        };
    };
    
    this.unload = function(){
        _oButExit.unload(); 
        _oButNext.unload();
                
        s_oStage.removeChild(_oContainer);
        s_oWinPanel = null;
    };
    
    this._onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._onNext = function(){
        this.unload();
        
        if (_iLevel+1 < MATRIX_SETTINGS[_iMode].length) {
            s_oMain.gotoGame(_iMode, _iLevel+1);
        // IF THERE'S NO MORE LEVELS FOR THIS MODE, GO TO MENU
        } else {
            s_oGame.unload();
            s_oMain.gotoLevelSelect(_iMode);
        };
    };
    
    s_oWinPanel = this;
    
    this._init();
}

var s_oWinPanel = null;