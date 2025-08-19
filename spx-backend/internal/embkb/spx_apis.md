# spx APIs

## Game

```csv
Name,Sample,Description
answer,,The answer from the player
backdropIndex,,Index of the current backdrop
backdropName,,Name of the current backdrop
broadcast,"broadcast ""ping""",Broadcast a message
broadcast,"broadcast ""ping"", true",Broadcast a message with waiting for related (`onMsg`) behaviors to complete
broadcast,"broadcast ""ping"", 1, true","Broadcast a message along with extra data, with waiting for related (`onMsg`) behaviors to complete"
ask,"ask ""What is your name?""",Ask player a question and wait for player to answer
changeEffect,"changeEffect ColorEffect, 10","Change graphic effect of the stage. For example, if initial effect value is 100, changing by 10 will result in 110"
changeVolume,changeVolume 10,"Change the volume for stage sounds with given volume change. For example, if initial volume is 100, changing by 10 will result in volume 110"
clearGraphicEffects,,Clear all graphic effects of the stage
onAnyKey,onAnyKey key => {},Listen to any key pressed
onBackdrop,onBackdrop backdrop => {},Listen to backdrop switching
onBackdrop,"onBackdrop ""bg1"", => {}",Listen to switching to specific backdrop
onClick,onClick => {},Listen to stage clicked
onKey,"onKey KeyA, => {}",Listen to given key pressed
onKey,"onKey [KeyA], key => {}",Listen to given keys pressed
onMsg,"onMsg (msg, data) => {}",Listen to any message broadcasted
onMsg,"onMsg ""ping"", => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
onSwipe,"onSwipe Left, => {}",Listen to swipe in given direction
play,"play ""s1""",Play sound with given name
play,"play ""s1"", true",Play sound with given name and wait
play,"play ""s1"", { Action: PlayStop }",Control sound playback
setEffect,"setEffect ColorEffect, 100",Set graphic effect of the stage
setVolume,setVolume 100,Set the volume for stage sounds
volume,,The volume for stage sounds
getWidget,"getWidget(Monitor, ""w1"")",Get the widget by given type & name
keyPressed,keyPressed(KeyA),Check if given key is currently pressed
mouseHitItem,,The sprite which is hit by mouse
mousePressed,,If the mouse is currently pressed
mouseX,,X position of the mouse
mouseY,,Y position of the mouse
nextBackdrop,,Switch to the next backdrop
nextBackdrop,nextBackdrop true,"Switch to the next backdrop, with waiting for related (`onBackdrop`) behaviors to complete"
prevBackdrop,,Switch to the previous backdrop
prevBackdrop,prevBackdrop true,"Switch to the previous backdrop, with waiting for related (`onBackdrop`) behaviors to complete"
resetTimer,,Reset the timer to zero
startBackdrop,"startBackdrop ""bg1""",Set the current backdrop by specifying name
startBackdrop,"startBackdrop ""bg1"", true","Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) behaviors to complete"
stopAllSounds,,Stop all playing sounds
timer,,Current timer value
wait,wait 1,Wait for given seconds
waitUntil,waitUntil true,Wait until given condition is met

```

## Sprite

```csv
Name,Sample,Description
animate,"animate ""a1""",Play animation with given name
bounceOffEdge,,Bounce off if the sprite touching the edge
changeHeading,changeHeading 90,"Change heading by given degree. For example, if initially heading at 30 degrees, changing by 90 degrees will result in heading 120 degrees"
changeSize,changeSize 1,"Change size of the sprite. For example, if initially size is 1, changing by 1 will result in size 2"
changeXYpos,"changeXYpos 10, 10","Change the sprite's X, Y position"
changeXpos,changeXpos 10,Change the sprite's X position
changeYpos,changeYpos 10,Change the sprite's Y position
clone,,Make a clone of the sprite
clone,clone 1,Make a clone of the sprite and pass extra data
costumeName,,The name of the current costume
die,,"Let the sprite die. Animation for state ""die"" will be played."
distanceTo,"distanceTo(""S1"")",Distance from the sprite to another sprite with given name
distanceTo,distanceTo(Mouse),Distance from the sprite to given object
glide,"glide 100, 100, 1",Glide to given position within given duration
glide,"glide ""S1"", 1",Glide to the sprite with given name within given duration
glide,"glide Mouse, 1",Glide to given object within given duration
goBackLayers,goBackLayers 1,"Send the sprite back by given layers. Positive number moves back, negative number moves front"
goto,"goto ""S1""",Move to the sprite with given name
goto,goto Mouse,Move to given obj
gotoBack,,Send the sprite to back
gotoFront,,Send the sprite to front
heading,,The sprite's heading direction
hide,,Make the sprite invisible
onCloned,onCloned data => {},Listen to sprite cloned
onMoving,onMoving info => {},Listen to the sprite moving
onTouchStart,onTouchStart sprite => {},Listen to sprite touching another sprite
onTouchStart,"onTouchStart ""S1"", sprite => {}",Listen to sprite touching another sprite with given name
onTouchStart,"onTouchStart [""S1""], sprite => {}",Listen to sprite touching another sprite with one of given names
onTurning,onTurning info => {},Listen to the sprite turning
say,"say ""Hi""",Say some word
say,"say ""Hi"", 1",Say some word for given seconds
setCostume,"setCostume ""c1""",Set the current costume by specifying name
setHeading,setHeading Right,Set heading to given direction
setRotationStyle,setRotationStyle LeftRight,Set the rotation style of the sprite
setSize,setSize 2,Set size of the sprite
setXYpos,"setXYpos 0, 0","Set the sprite's X, Y position"
setXpos,setXpos 0,Set the sprite's X position
setYpos,setYpos 0,Set the sprite's Y position
show,,Make the sprite visible
size,,"Size of the sprite. Value is relative to initial size. For example, 2 means current size is twice the initial size"
ask,"ask ""What is your name?""",Ask player a question and wait for player to answer
changeEffect,"changeEffect ColorEffect, 10","Change graphic effect of the sprite. For example, if initial effect value is 100, changing by 10 will result in 110"
changeVolume,changeVolume 10,"Change the volume for sprite sounds with given volume change. For example, if initial volume is 100, changing by 10 will result in volume 110"
clearGraphicEffects,,Clear all graphic effects of the sprite
onAnyKey,onAnyKey key => {},Listen to any key pressed
onBackdrop,onBackdrop backdrop => {},Listen to backdrop switching
onBackdrop,"onBackdrop ""bg1"", => {}",Listen to switching to specific backdrop
onClick,onClick => {},Listen to sprite clicked
onKey,"onKey KeyA, => {}",Listen to given key pressed
onKey,"onKey [KeyA], key => {}",Listen to given keys pressed
onMsg,"onMsg (msg, data) => {}",Listen to any message broadcasted
onMsg,"onMsg ""ping"", => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
onSwipe,"onSwipe Left, => {}",Listen to swipe in given direction
play,"play ""s1""",Play sound with given name
play,"play ""s1"", true",Play sound with given name and wait
play,"play ""s1"", { Action: PlayStop }",Control sound playback
setEffect,"setEffect ColorEffect, 100",Set graphic effect of the sprite
setVolume,setVolume 100,Set the volume for sprite sounds
volume,,The volume for sprite sounds
step,step 100,"Step toward current heading. Animation for state ""step"" will be played"
step,"step 100, ""a1""",Step toward current heading. Animation with given name will be played
think,"think ""Emmm...""",Think of some word
think,"think ""Emmm..."", 1",Think of some word for given seconds
touching,"touching(""S1"")",If sprite touching another sprite with given name
touching,touching(Edge),If sprite touching given object
touchingColor,"touchingColor(HSB(50,100,100))",If sprite touching given color
turn,turn Right,"Turn by given direction. For example, if initially heading at 30 degrees, turning right will result in heading 120 degrees"
turnTo,"turnTo ""S1""",Turn to sprite with given name
turnTo,turnTo Left,Turn to given direction
turnTo,turnTo Mouse,Turn to given object
visible,,If sprite visible
xpos,,The sprite's X position
ypos,,The sprite's Y position

```

## Others

```csv
Name,Sample,Description
hSB,"HSB(50, 100, 100)",Define HSB color
hSBA,"HSBA(50, 100, 100, 100)",Define HSBA color
Down,,"Down direction, i.e., 180 degree"
Edge,,Edge of the stage
EdgeBottom,,Bottom edge of the stage
EdgeLeft,,Left edge of the stage
EdgeRight,,Right edge of the stage
EdgeTop,,Top edge of the stage
exit,,Exit the game
forever,forever => {},Repeat forever
Left,,"Left direction, i.e., -90 degree"
LeftRight,,Left-Right
Monitor,,Monitor widget
Monitor.changeSize,changeSize 0.1,Change size of the widget
Monitor.changeXYpos,"changeXYpos 10, 10",Change the widget's position
Monitor.changeXpos,changeXpos 10,Change the widget's X position
Monitor.changeYpos,changeYpos 10,Change the widget's Y position
Monitor.hide,hide,Make the widget invisible
Monitor.setSize,setSize 2,Set size of the widget
Monitor.setXYpos,"setXYpos 0, 0","Set the widget's X, Y position"
Monitor.setXpos,setXpos 0,Set the widget's X position
Monitor.setYpos,setYpos 0,Set the widget's Y position
Monitor.show,show,Make the widget visible
Monitor.size,size,"Size of the widget. Value is relative to initial size. For example, 2 means current size is twice the initial size"
Monitor.visible,visible,If widget visible
Monitor.xpos,xpos,The widget's X position
Monitor.ypos,ypos,The widget's Y position
Mouse,,Mouse
MovingInfo.dx,dx,Change of the X position
MovingInfo.dy,dy,Change of the Y position
MovingInfo.NewX,newX,The X position after moving
MovingInfo.NewY,newY,The Y position after moving
MovingInfo.OldX,oldX,The X position before moving
MovingInfo.OldY,oldY,The Y position before moving
Next,,Next item
None,,Don't Rotate
Normal,,Normal
PlayContinue,,Continue
PlayPause,,Pause
PlayResume,,Resume
PlayRewind,,Rewind
PlayStop,,Stop
Prev,,Previous item
rand,"rand(1, 10)",Generate a random integer
rand,"rand(1.5, 9.9)",Generate a random number
repeat,"repeat 10, => {}",Repeat for given times
repeatUntil,"repeatUntil false, => {}",Repeat until given condition is met
Right,,"Right direction, i.e., 90 degree"
Sprite,,Type for sprite
TurningInfo.dir,dir,The degree changed by turning
TurningInfo.NewDir,NewDir,The heading direction after turning
TurningInfo.OldDir,OldDir,The heading direction before turning
Up,,"Up direction, i.e., 0 degree"
Widget.changeSize,changeSize 0.1,Change size of the widget
Widget.changeXYpos,"changeXYpos 10, 10",Change the widget's position
Widget.changeXpos,changeXpos 10,Change the widget's X position
Widget.changeYpos,changeYpos 10,Change the widget's Y position
Widget.hide,hide,Make the widget invisible
Widget.setSize,setSize 2,Set size of the widget
Widget.setXYpos,"setXYpos 0, 0","Set the widget's X, Y position"
Widget.setXpos,setXpos 0,Set the widget's X position
Widget.setYpos,setYpos 0,Set the widget's Y position
Widget.show,show,Make the widget visible
Widget.size,size,"Size of the widget. Value is relative to initial size. For example, 2 means current size is twice the initial size"
Widget.visible,visible,If widget visible
Widget.xpos,xpos,The widget's X position
Widget.ypos,ypos,The widget's Y position

```

## Keys

```csv
Name,Sample,Description
"Key0-Key9,KeyA-KeyZ,KeyF1-KeyF12,KeyKP0-KeyKP9,KeyApostrophe,KeyBackslash,KeyBackspace,KeyCapsLock,KeyComma,KeyDelete,KeyDown,KeyEnd,KeyEnter,KeyEqual,KeyEscape,KeyGraveAccent,KeyHome,KeyInsert,KeyKPDecimal,KeyKPDivide,KeyKPEnter,KeyKPEqual,KeyKPMultiply,KeyKPSubtract,KeyLeft,KeyLeftBracket,KeyMenu,KeyMinus,KeyNumLock,KeyPageDown,KeyPageUp,KeyPause,KeyPeriod,KeyPrintScreen,KeyRight,KeyRightBracket,KeyScrollLock,KeySemicolon,KeySlash,KeySpace,KeyTab,KeyUp,KeyAlt,KeyControl,KeyShift,KeyMax,KeyAny","onKey Key1, => {}","Key definitions, used for keyboard event listening."

```
