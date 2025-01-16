# SPX APIs

## Game

```csv
Name,Sample,Description
backdropIndex,,Get the index of the current backdrop
backdropName,,Get the name of the current backdrop
broadcast,broadcast msg,"Broadcast a message, e.g., `broadcast ""msg""`"
broadcast,"broadcast msg, wait","Broadcast a message with waiting, e.g., `broadcast ""msg"", true`"
broadcast,"broadcast msg, data, wait","Broadcast a message with data and waiting, e.g., `broadcast ""msg"", data, true`"
changeVolume,changeVolume dVolume,"Change the volume for sounds with given volume change, e.g., `changeVolume 10`"
onClick,onClick => {},Listen to stage clicked
onKey,"onKey key, => {}","Listen to given key pressed, e.g., `onKey KeyA, => {}`"
onKey,"onKey keys, key => {}","Listen to given keys pressed, optionally receiving the key pressed"
onMsg,"onMsg (msg, data) => {}","Listen to any message broadcasted, get the broadcasted message and data"
onMsg,"onMsg msg, => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
getWidget,"getWidget(type, name)",Get the widget by given name
keyPressed,keyPressed(key),"Check if given key is currently pressed, e.g., `keyPressed(KeyA)`"
mouseHitItem,,"Get the topmost sprite which is hit by mouse, e.g., `hitSprite, ok := mouseHitItem`"
mousePressed,,Check if the mouse is currently pressed
mouseX,,Get X position of the mouse
mouseY,,Get Y position of the mouse
nextBackdrop,,Switch to the next backdrop
onAnyKey,onAnyKey key => {},Listen to any key pressed
onBackdrop,onBackdrop backdrop => {},Listen to backdrop switching
onBackdrop,"onBackdrop backdrop, => {}",Listen to switching to specific backdrop
play,play sound,"Play given sound, e.g., `play explosion`"
play,"play sound, wait","Play given sound with waiting, e.g., `play explosion, true`"
play,"play sound, options","Play given sound with options, e.g., `play explosion, { Loop: true }`"
play,play name,"Play sound with given name, e.g., `play ""explosion""`"
play,"play name, wait","Play sound with given name and waiting, e.g., `play ""explosion"", true`"
play,"play name, options","Play sound with given name and options, e.g., `play ""explosion"", { Loop: true }`"
prevBackdrop,,Switch to the previous backdrop
setVolume,setVolume volume,"Set the volume for sounds, e.g., `setVolume 100`"
startBackdrop,startBackdrop name,"Set the current backdrop by specifying name, e.g., `startBackdrop ""backdrop1""`"
startBackdrop,"startBackdrop name, wait","Set the current backdrop by specifying name, with waiting, e.g., `startBackdrop ""backdrop1"", true`"
stopAllSounds,,Stop all playing sounds
volume,,Get the volume for sounds
wait,wait seconds,"Block current execution (coroutine) for given seconds, e.g., `wait 0.5`"

```

## Sprite

```csv
Name,Sample,Description
animate,animate name,"Play animation with given name, e.g., `animate ""jump""`"
bounceOffEdge,,Check & bounce off current sprite if touching the edge
changeHeading,changeHeading dDirection,"Change heading with given direction change, e.g., `changeHeading 90`"
changeSize,changeSize dSize,"Change the size of current sprite, e.g., `changeSize 1`"
changeXYpos,"changeXYpos dX, dY","Change the sprite's position, e.g., `changeXYpos 10, 20` changing X position by 10 and Y position by 20"
changeXpos,changeXpos dX,"Change the sprite's X position, e.g., `changeXpos 10` changing X position by 10"
changeYpos,changeYpos dY,"Change the sprite's Y position, e.g., `changeYpos 10` changing Y position by 10"
clone,,Make a clone of current sprite
clone,clone data,"Make a clone of current sprite with given data, e.g., `clone 123` (you can get the data `123` by `onCloned`)"
costumeName,,The name of the current costume
die,,"Let current sprite die. Animation bound to state ""die"" will be played."
distanceTo,distanceTo(sprite),Get the distance from current sprite to given sprite
distanceTo,distanceTo(name),"Get the distance from current sprite to the sprite with given name, e.g., `distanceTo(""Enemy"")`"
distanceTo,distanceTo(obj),"Get the distance from current sprite to given object, e.g., `distanceTo(Mouse)`"
glide,"glide x, y, seconds","Move to given position (X, Y) with glide animation and given duration, e.g., `glide 100, 100, 2`"
glide,"glide sprite, seconds","Move to given sprite with glide animation and given duration, e.g., `glide Enemy, 2`"
glide,"glide name, seconds","Move to the sprite with given name with glide animation and given duration, e.g., `glide ""Enemy"", 2`"
glide,"glide obj, seconds","Move to given obj with glide animation and given duration, e.g., `glide Mouse, 2`"
goto,goto sprite,"Move to given sprite, e.g., `goto Enemy`"
goto,goto name,"Move to the sprite with given name, e.g., `goto ""Enemy""`"
goto,goto obj,"Move to given obj, e.g., `goto Mouse`"
heading,,Get current heading direction
hide,,Make current sprite invisible
move,move distance,"Move given distance toward current heading, e.g., `move 10`"
onCloned,onCloned data => {},"Listen to current sprite cloned, optionally receiving data"
onMoving,onMoving info => {},"Listen to current sprite moving (position change), optionally receiving the moving info"
onTouchStart,onTouchStart sprite => {},"Listen to current sprite starting to be touched by any other sprites, optionally receiving the sprite"
onTouchStart,"onTouchStart name, sprite => {}","Listen to current sprite starting to be touched by sprite of given name, optionally receiving the sprite"
onTouchStart,"onTouchStart names, sprite => {}","Listen to current sprite starting to be touched by any sprite of given names, optionally receiving the sprite"
onTurning,onTurning info => {},"Listen to current sprite turning (heading change), optionally receiving the turning info"
say,say word,"Make the sprite say some word, e.g., `say ""Hello!""`"
say,"say word, seconds","Make the sprite say some word with duration, e.g., `say ""Hello!"", 2`"
setCostume,setCostume name,"Set the current costume by specifying name, e.g., `setCostume ""happy""`"
setHeading,setHeading direction,"Set heading to given value, e.g., `setHeading Up`"
setRotationStyle,setRotationStyle style,"Set the rotation style of the sprite, e.g., `setRotationStyle LeftRight`"
setSize,setSize size,"Set the size of current sprite, e.g., `setSize 2`"
setXYpos,"setXYpos x, y","Set the sprite's position, e.g., `setXYpos 100, 100`"
setXpos,setXpos x,"Set the sprite's X position, e.g., `setXpos 100`"
setYpos,setYpos y,"Set the sprite's Y position, e.g., `setYpos 100`"
show,,Make current sprite visible
size,,Get the size of current sprite
onClick,onClick => {},Listen to current sprite clicked
onKey,"onKey key, => {}","Listen to given key pressed, e.g., `onKey KeyA, => {}`"
onKey,"onKey keys, key => {}","Listen to given keys pressed, optionally receiving the key pressed"
onMsg,"onMsg (msg, data) => {}","Listen to any message broadcasted, get the broadcasted message and data"
onMsg,"onMsg msg, => {}",Listen to specific message broadcasted
onStart,onStart => {},Listen to game start
step,step distance,"Step given distance toward current heading. Animation bound to state ""step"" will be played, e.g., `step 10`"
step,"step distance, animation","Step given distance toward current heading and animation with given name will be played, e.g., `step 10, ""run""`"
think,think word,"Make the sprite think of some word, e.g., `think ""Wow!""`"
think,"think word, seconds","Make the sprite think of some word with duration, e.g., `think ""Wow!"", 2`"
touching,touching(name),Check if current sprite touching sprite with given name
touching,touching(sprite),Check if current sprite touching given sprite
touching,touching(obj),"Check if current sprite touching given object, e.g., `touching(Mouse)`"
turn,turn degree,"Turn with given degree relative to current heading, e.g., `turn 90`"
turn,turn direction,"Turn with given direction relative to current heading, e.g., `turn Left`"
turnTo,turnTo sprite,Turn heading to given sprite
turnTo,turnTo name,"Turn heading to given sprite by name, e.g., `turnTo ""Enemy""`"
turnTo,turnTo degree,"Turn heading to given degree, e.g., `turnTo 90`"
turnTo,turnTo direction,"Turn heading to given direction, e.g., `turnTo Left`"
turnTo,turnTo obj,"Turn heading to given object, e.g., `turnTo Mouse`"
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
Mouse,,Mouse
Next,,Next item
None,,Don't Rotate
Normal,,Normal
PlayContinue,,Continue
PlayPause,,Pause
PlayResume,,Resume
PlayRewind,,Rewind
PlayStop,,Stop
Prev,,Previous item
rand,"rand(from, to)","Generate a random integer, e.g., `rand(1, 10)`"
rand,"rand(from, to)","Generate a random number, e.g., `rand(1.5, 9.9)`"
Right,,"Right direction, i.e., 90 degree"
Up,,"Up direction, i.e., 0 degree"

```

## Keys

```csv
Name,Sample,Description
"Key0-Key9,KeyA-KeyZ,KeyF1-KeyF12,KeyKP0-KeyKP9,KeyApostrophe,KeyBackslash,KeyBackspace,KeyCapsLock,KeyComma,KeyDelete,KeyDown,KeyEnd,KeyEnter,KeyEqual,KeyEscape,KeyGraveAccent,KeyHome,KeyInsert,KeyKPDecimal,KeyKPDivide,KeyKPEnter,KeyKPEqual,KeyKPMultiply,KeyKPSubtract,KeyLeft,KeyLeftBracket,KeyMenu,KeyMinus,KeyNumLock,KeyPageDown,KeyPageUp,KeyPause,KeyPeriod,KeyPrintScreen,KeyRight,KeyRightBracket,KeyScrollLock,KeySemicolon,KeySlash,KeySpace,KeyTab,KeyUp,KeyAlt,KeyControl,KeyShift,KeyMax,KeyAny","onKey Key1, => {}","Key definitions, used for keyboard event listening."

```
