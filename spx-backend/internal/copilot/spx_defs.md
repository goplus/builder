# SPX APIs

## Game

```csv
Name,Sample,Description
backdropIndex,,Get the index of the current backdrop
backdropName,,Get the name of the current backdrop
broadcast,"broadcast ""ping""",Broadcast a message
broadcast,"broadcast ""ping"", true",Broadcast a message with waiting for related (`onMsg`) works to complete
broadcast,"broadcast ""ping"", 1, true",Broadcast a message with data and waiting for related (`onMsg`) works to complete
changeVolume,changeVolume 10,Change the volume for sounds with given volume change
onClick,onClick => {},Listen to stage clicked
onKey,"onKey KeyA, => {}",Listen to given key pressed
onKey,"onKey [KeyA], key => {}","Listen to given keys pressed, optionally receiving the key pressed"
onMsg,"onMsg (msg, data) => {}","Listen to any message broadcasted, get the broadcasted message and data"
onMsg,"onMsg ""ping"", => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
getWidget,"getWidget(Monitor, ""w1"")",Get the widget by given type & name
keyPressed,keyPressed KeyA,Check if given key is currently pressed
mouseHitItem,,Get the topmost sprite which is hit by mouse
mousePressed,,Check if the mouse is currently pressed
mouseX,,Get X position of the mouse
mouseY,,Get Y position of the mouse
nextBackdrop,,Switch to the next backdrop
nextBackdrop,nextBackdrop true,"Switch to the next backdrop, with waiting for related (`onBackdrop`) works to complete"
onAnyKey,onAnyKey key => {},Listen to any key pressed
onBackdrop,onBackdrop backdrop => {},Listen to backdrop switching
onBackdrop,"onBackdrop ""bg1"", => {}",Listen to switching to specific backdrop
play,"play ""s1""",Play sound with given name
play,"play ""s1"", true",Play sound with given name and wait
play,"play ""s1"", options",Play sound with given name and options
prevBackdrop,,Switch to the previous backdrop
prevBackdrop,prevBackdrop true,"Switch to the previous backdrop, with waiting for related (`onBackdrop`) works to complete"
setVolume,setVolume 100,Set the volume for sounds
startBackdrop,"startBackdrop ""bg1""",Set the current backdrop by specifying name
startBackdrop,"startBackdrop ""bg1"", true","Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) works to complete"
stopAllSounds,,Stop all playing sounds
volume,,Get the volume for sounds
wait,wait 1,Block current execution (coroutine) for given seconds

```

## Sprite

```csv
Name,Sample,Description
animate,"animate ""a1""",Play animation with given name
bounceOffEdge,,Check & bounce off current sprite if touching the edge
changeHeading,changeHeading 10,Change heading with given direction change
changeSize,changeSize 1,Change the size of current sprite
changeXYpos,"changeXYpos 10, 10",Change the sprite's position
changeXpos,changeXpos 10,Change the sprite's X position
changeYpos,changeYpos 10,Change the sprite's Y position
clone,,Make a clone of current sprite
clone,clone 1,Make a clone of current sprite with given data
costumeName,,The name of the current costume
die,,"Let current sprite die. Animation bound to state ""die"" will be played."
distanceTo,"distanceTo(""S1"")",Get the distance from current sprite to the sprite with given name
distanceTo,distanceTo(Mouse),Get the distance from current sprite to given object
glide,"glide 100, 100, 1","Move to given position (X, Y) with glide animation and given duration"
glide,"glide ""S1"", 1",Move to the sprite with given name with glide animation and given duration
glide,"glide Mouse, 1",Move to given obj with glide animation and given duration
goto,"goto ""S1""",Move to the sprite with given name
goto,goto Mouse,Move to given obj
heading,,Get current heading direction
hide,,Make current sprite invisible
onCloned,onCloned data => {},"Listen to current sprite cloned, optionally receiving data"
onMoving,onMoving info => {},"Listen to current sprite moving (position change), optionally receiving the moving info"
onTouchStart,onTouchStart sprite => {},"Listen to current sprite starting to be touched by any other sprites, optionally receiving the sprite"
onTouchStart,"onTouchStart ""S1"", sprite => {}","Listen to current sprite starting to be touched by sprite of given name, optionally receiving the sprite"
onTouchStart,"onTouchStart [""S1""], sprite => {}","Listen to current sprite starting to be touched by any sprite of given names, optionally receiving the sprite"
onTurning,onTurning info => {},"Listen to current sprite turning (heading change), optionally receiving the turning info"
say,"say """"",Make the sprite say some word
say,"say """", 1",Make the sprite say some word with duration
setCostume,"setCostume ""c1""",Set the current costume by specifying name
setHeading,setHeading 90,Set heading to given value
setRotationStyle,setRotationStyle LeftRight,Set the rotation style of the sprite
setSize,setSize 2,Set the size of current sprite
setXYpos,"setXYpos 0, 0",Set the sprite's position
setXpos,setXpos 0,Set the sprite's X position
setYpos,setYpos 0,Set the sprite's Y position
show,,Make current sprite visible
size,,Get the size of current sprite
onClick,onClick => {},Listen to current sprite clicked
onKey,"onKey KeyA, => {}",Listen to given key pressed
onKey,"onKey [KeyA], key => {}","Listen to given keys pressed, optionally receiving the key pressed"
onMsg,"onMsg (msg, data) => {}","Listen to any message broadcasted, get the broadcasted message and data"
onMsg,"onMsg ""ping"", => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
step,step 100,"Step given distance toward current heading. Animation bound to state ""step"" will be played"
step,"step 100, ""a1""",Step given distance toward current heading and animation with given name will be played
think,"think """"",Make the sprite think of some word
think,"think """", 1",Make the sprite think of some word with duration
touching,"touching(""S1"")",Check if current sprite touching sprite with given name
touching,touching(Edge),Check if current sprite touching given object
turn,turn 10,Turn with given degree relative to current heading
turn,turn 90,Turn with given direction relative to current heading
turnTo,"turnTo ""S1""",Turn heading to given sprite by name
turnTo,turnTo 90,Turn heading to given direction
turnTo,turnTo Mouse,Turn heading to given object
visible,,If current sprite visible
xpos,,Get current X position
ypos,,Get current Y position

```

## Others

```csv
Name,Sample,Description
Down,,"Down direction, i.e., 180 degree"
Edge,,Any edge
EdgeBottom,,Bottom edge
EdgeLeft,,Left edge
EdgeRight,,Right edge
EdgeTop,,Top edge
exit,,Exit the game
Left,,"Left direction, i.e., -90 degree"
LeftRight,,Left-Right
Monitor,,Type for monitor widget
Monitor.changeSize,changeSize 0.1,Change the size of current widget
Monitor.changeXYpos,"changeXYpos 10, 10",Change the widget's position
Monitor.changeXpos,changeXpos 10,Change the widget's X position
Monitor.changeYpos,changeYpos 10,Change the widget's Y position
Monitor.hide,hide,Make current widget invisible
Monitor.setSize,setSize 2,Set the size of current widget
Monitor.setXYpos,"setXYpos 0, 0",Set the widget's position
Monitor.setXpos,setXpos 0,Set the widget's X position
Monitor.setYpos,setYpos 0,Set the widget's Y position
Monitor.show,show,Make current widget visible
Monitor.size,size,Get current size
Monitor.visible,visible,If current widget visible
Monitor.xpos,xpos,Get current X position
Monitor.ypos,ypos,Get current Y position
Mouse,,Mouse
MovingInfo.dx,dx,The horizontal distance moved
MovingInfo.dy,dy,The vertical distance moved
MovingInfo.NewX,newX,The horizontal position after moving
MovingInfo.NewY,newY,The vertical position after moving
MovingInfo.OldX,oldX,The horizontal position before moving
MovingInfo.OldY,oldY,The vertical position before moving
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
Right,,"Right direction, i.e., 90 degree"
Sprite,,Type for sprite
TurningInfo.dir,dir,The angle rotated
TurningInfo.NewDir,NewDir,The heading after turning
TurningInfo.OldDir,OldDir,The heading before turning
Up,,"Up direction, i.e., 0 degree"
Widget.changeSize,changeSize 0.1,Change the size of current widget
Widget.changeXYpos,"changeXYpos 10, 10",Change the widget's position
Widget.changeXpos,changeXpos 10,Change the widget's X position
Widget.changeYpos,changeYpos 10,Change the widget's Y position
Widget.hide,hide,Make current widget invisible
Widget.setSize,setSize 2,Set the size of current widget
Widget.setXYpos,"setXYpos 0, 0",Set the widget's position
Widget.setXpos,setXpos 0,Set the widget's X position
Widget.setYpos,setYpos 0,Set the widget's Y position
Widget.show,show,Make current widget visible
Widget.size,size,Get current size
Widget.visible,visible,If current widget visible
Widget.xpos,xpos,Get current X position
Widget.ypos,ypos,Get current Y position

```

## Keys

```csv
Name,Sample,Description
"Key0-Key9,KeyA-KeyZ,KeyF1-KeyF12,KeyKP0-KeyKP9,KeyApostrophe,KeyBackslash,KeyBackspace,KeyCapsLock,KeyComma,KeyDelete,KeyDown,KeyEnd,KeyEnter,KeyEqual,KeyEscape,KeyGraveAccent,KeyHome,KeyInsert,KeyKPDecimal,KeyKPDivide,KeyKPEnter,KeyKPEqual,KeyKPMultiply,KeyKPSubtract,KeyLeft,KeyLeftBracket,KeyMenu,KeyMinus,KeyNumLock,KeyPageDown,KeyPageUp,KeyPause,KeyPeriod,KeyPrintScreen,KeyRight,KeyRightBracket,KeyScrollLock,KeySemicolon,KeySlash,KeySpace,KeyTab,KeyUp,KeyAlt,KeyControl,KeyShift,KeyMax,KeyAny","onKey Key1, => {}","Key definitions, used for keyboard event listening."

```
