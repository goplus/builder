# spx APIs

## Game

```csv
Name,Sample,Description
answer,,The answer from the player
backdropIndex,,Index of the current backdrop
backdropName,,Name of the current backdrop
broadcast,"broadcast ""ping""",Broadcast a message
broadcast,"broadcast ""ping"", 1",Broadcast a message along with extra data
broadcastAndWait,"broadcastAndWait ""ping""","Broadcast a message, with waiting for related (`onMsg`) behaviors to complete"
broadcastAndWait,"broadcastAndWait ""ping"", 1","Broadcast a message along with extra data, with waiting for related (`onMsg`) behaviors to complete"
Camera,,"Camera, which controls the visible area of the stage"
ask,"ask ""What is your name?""",Ask player a question and wait for player to answer
changeGraphicEffect,"changeGraphicEffect ColorEffect, 10","Change graphic effect of the stage. For example, if initial effect value is 100, changing by 10 will result in 110"
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
pausePlaying,"pausePlaying ""s1""",Pause sound with given name
play,"play ""s1"", true",Play sound with given name in a loop
play,"play ""s1""",Play sound with given name
playAndWait,"playAndWait ""s1""",Play sound with waiting
resumePlaying,"resumePlaying ""s1""",Resume sound with given name
setGraphicEffect,"setGraphicEffect ColorEffect, 100",Set graphic effect of the stage
setVolume,setVolume 100,Set the volume for stage sounds
stopPlaying,"stopPlaying ""s1""",Stop sound with given name
volume,,The volume for stage sounds
getWidget,"getWidget(Monitor, ""w1"")",Get the widget by given type & name
keyPressed,keyPressed(KeyA),Check if given key is currently pressed
mouseHitItem,,The sprite which is hit by mouse
mousePressed,,If the mouse is currently pressed
mouseX,,X position of the mouse
mouseY,,Y position of the mouse
resetTimer,,Reset the timer to zero
setBackdrop,"setBackdrop ""bg1""",Set the current backdrop by specifying name
setBackdrop,setBackdrop 0,Set the current backdrop by specifying index
setBackdrop,setBackdrop Next,Switch to the Next/Prev backdrop
setBackdropAndWait,"setBackdropAndWait ""bg1""","Set the current backdrop by specifying name, with waiting for related (`onBackdrop`) behaviors to complete"
setBackdropAndWait,setBackdropAndWait 0,"Set the current backdrop by specifying index, with waiting for related (`onBackdrop`) behaviors to complete"
setBackdropAndWait,setBackdropAndWait Next,"Switch to the Next/Prev backdrop, with waiting for related (`onBackdrop`) behaviors to complete"
stopAllSounds,,Stop all playing sounds
timer,,Current timer value
wait,wait 1,Wait for given seconds
```

## Sprite

```csv
Name,Sample,Description
animate,"animate ""a1""",Play animation with given name
animate,"animate ""a1"", true",Loop the animation with given name
animateAndWait,"animateAndWait ""a1""","Play animation with given name, with waiting for animation to complete"
bounceOffEdge,,Bounce off if the sprite touching the edge
changeHeading,changeHeading 90,"Change heading by given degree. For example, if initially heading at 30 degrees, changing by 90 degrees will result in heading 120 degrees"
changeSize,changeSize 1,"Change size of the sprite. For example, if initially size is 1, changing by 1 will result in size 2"
changeXYpos,"changeXYpos 10, 10","Change the sprite's X, Y position"
changeXpos,changeXpos 10,Change the sprite's X position
changeYpos,changeYpos 10,Change the sprite's Y position
clone,,Make a clone of the sprite
clone,clone 1,Make a clone of the sprite and pass extra data
costumeName,,The name of the current costume
die,,"Let the sprite die. Animation for state ""die"" will be played"
distanceTo,"distanceTo(""S1"")",Distance from the sprite to another sprite with given name
distanceTo,distanceTo(Mouse),Distance from the sprite to given object
glide,"glide 100, 100, 1",Glide to given position within given duration
glide,"glide ""S1"", 1",Glide to the sprite with given name within given duration
glide,"glide Mouse, 1",Glide to given object within given duration
heading,,The sprite's heading direction
hide,,Make the sprite invisible
onCloned,onCloned data => {},Listen to sprite cloned
onTouchStart,"onTouchStart ""S1"", sprite => {}",Listen to sprite touching another sprite with given name
onTouchStart,"onTouchStart [""S1""], sprite => {}",Listen to sprite touching another sprite with one of given names
say,"say ""Hi""",Say some word
say,"say ""Hi"", 1",Say some word for given seconds
setCostume,"setCostume ""c1""",Set the current costume by specifying name
setHeading,setHeading Right,Set heading to given direction
setLayer,setLayer Front,Send the sprite to front/back
setLayer,"setLayer Forward, 1","Send the sprite forward or backward, with given layers"
setRotationStyle,setRotationStyle LeftRight,Set the rotation style of the sprite
setSize,setSize 2,Set size of the sprite
setXYpos,"setXYpos 0, 0","Set the sprite's X, Y position"
setXpos,setXpos 0,Set the sprite's X position
setYpos,setYpos 0,Set the sprite's Y position
show,,Make the sprite visible
size,,"Size of the sprite. Value is relative to initial size. For example, 2 means current size is twice the initial size"
addImpulse,"addImpulse 0, 0","Add impulse to the sprite. The impulse is an instant velocity change, i.e., the velocity will be changed by (ix, iy) instantly"
ask,"ask ""What is your name?""",Ask player a question and wait for player to answer
changeGraphicEffect,"changeGraphicEffect ColorEffect, 10","Change graphic effect of the sprite. For example, if initial effect value is 100, changing by 10 will result in 110"
changeVolume,changeVolume 10,"Change the volume for sprite sounds with given volume change. For example, if initial volume is 100, changing by 10 will result in volume 110"
clearGraphicEffects,,Clear all graphic effects of the sprite
stopPlaying,"stopPlaying ""s1""",Stop sound with given name
gravity,,"The gravity for the sprite. The value is relative to the global gravity. For example, 2 means double the global gravity, 0 means no gravity"
isOnFloor,,If the sprite is currently on the floor
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
pausePlaying,"pausePlaying ""s1""",Pause sound with given name
physicsMode,,The physics mode for the sprite
play,"play ""s1"", true",Play sound with given name in a loop
play,"play ""s1""",Play sound with given name
playAndWait,"playAndWait ""s1""",Play sound with waiting
resumePlaying,"resumePlaying ""s1""",Resume sound with given name
setColliderCapsule,"setColliderCapsule 50, 100",Set the collider to be a capsule with given radius & height
setColliderCircle,setColliderCircle 50,Set the collider to be a circle with given radius
setColliderPivot,"setColliderPivot 0, 0",Set the collider pivot
setColliderRect,"setColliderRect 100, 100",Set the collider to be a rectangle with given width & height
setGraphicEffect,"setGraphicEffect ColorEffect, 100",Set graphic effect of the sprite
setGravity,setGravity 0,Set the gravity for the sprite
setPhysicsMode,setPhysicsMode NoPhysics,Set the physics mode for the sprite
setVelocity,"setVelocity 0, 0",Set the velocity for the sprite
setVolume,setVolume 100,Set the volume for sprite sounds
velocity,,"The velocity for the sprite. It is a 2D vector represented as (vx, vy), where vx is the distance to move in x axis per second, and vy is the distance to move in y axis per second"
volume,,The volume for sprite sounds
step,step 100,"Step toward current heading with given distance. Animation for state ""step"" will be played"
step,"step 100, 1","Step toward current heading with given distance and speed. Animation for state ""step"" will be played"
step,"step 100, 1, ""a1""","Step toward current heading with given distance, speed and animation"
stepTo,"stepTo ""S1""","Step to the sprite with given name. Animation for state ""step"" will be played"
stepTo,"stepTo ""S1"", 1","Step to the sprite with given name and specify speed. Animation for state ""step"" will be played"
stepTo,"stepTo ""S1"", 1, ""a1""",Step to the sprite with given name and specify speed and animation
stopAnimation,"stopAnimation ""a1""",Stop animation with given name
think,"think ""Emmm...""",Think of some word
think,"think ""Emmm..."", 1",Think of some word for given seconds
touching,"touching(""S1"")",If sprite touching another sprite with given name
touching,touching(Edge),If sprite touching given object
touchingColor,"touchingColor(HSB(50,100,100))",If sprite touching given color
turn,turn Right,"Turn by given direction. For example, if initially heading at 30 degrees, turning right will result in heading 120 degrees"
turn,"turn Right, 1",Turn by given direction and specify the turn speed
turn,"turn Right, 1, ""a1""","Turn by given direction, specify the turn speed and animation"
turnTo,"turnTo ""S1""",Turn to the sprite with given name
turnTo,"turnTo ""S1"", 1","Turn to the sprite with given name, and specify the turn speed"
turnTo,"turnTo ""S1"", 1, ""a1""","Turn to the sprite with given name, and specify the turn speed and animation"
visible,,If sprite visible
xpos,,The sprite's X position
ypos,,The sprite's Y position
```

## Others

```csv
Name,Sample,Description
Back,,Back
Backward,,Backward
Forward,,Forward
Front,,Front
hSB,"HSB(50, 100, 100)",Define HSB color
hSBA,"HSBA(50, 100, 100, 100)",Define HSBA color
Camera.follow,Camera.follow S1,Make the camera follow the given sprite
Camera.follow,"Camera.follow ""S1""",Make the camera follow the given sprite by name
Camera.setXYpos,"Camera.setXYpos 0, 0",Set the X and Y position of the camera center
Camera.setZoom,Camera.setZoom 1,Set zoom factor of the camera
Camera.xpos,,The X position of the camera center
Camera.ypos,,The Y position of the camera center
Camera.zoom,,"Zoom factor of the camera. Value 1 means no zoom, greater than 1 means zoom in, and between 0 and 1 means zoom out"
Down,,"Down direction, i.e., 180 degree"
DynamicPhysics,,Dynamic physics effect
Edge,,Edge of the stage
EdgeBottom,,Bottom edge of the stage
EdgeLeft,,Left edge of the stage
EdgeRight,,Right edge of the stage
EdgeTop,,Top edge of the stage
exit,,Exit the game
forever,forever => {},Repeat forever
KinematicPhysics,,Kinematic physics effect
Left,,"Left direction, i.e., -90 degree"
LeftRight,,Left-Right
List,,List data structure for storing multiple values
List.append,"myList.append ""value""",Add a value to the end of the list
List.at,myList.at 0,Get the value at a specific index
List.contains,"myList.contains ""value""",Check if the list contains a specific value
List.delete,myList.delete 0,Remove the item at a specific index
List.init,"myList.init ""a"", ""b"", ""c""",Initialize the list with given values
List.initFrom,myList.initFrom otherList,Initialize the list by copying from another list
List.insert,"myList.insert 0, ""value""",Insert a value at a specific index
List.len,myList.len,Get the length of the list
List.set,"myList.set 0, ""newValue""",Set the value at a specific index
List.string,myList.string,Get the string representation of the list
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
NoPhysics,,No physics effect
None,,Don't Rotate
Normal,,Normal
Prev,,Previous item
rand,"rand(1, 10)",Generate a random integer
rand,"rand(1.5, 9.9)",Generate a random number
repeat,"repeat 10, => {}",Repeat for given times
repeatUntil,"repeatUntil false, => {}",Repeat until given condition is met
Right,,"Right direction, i.e., 90 degree"
Sprite,,Type for sprite
StaticPhysics,,Static physics effect
TurningInfo.dir,dir,The degree changed by turning
TurningInfo.NewDir,NewDir,The heading direction after turning
TurningInfo.OldDir,OldDir,The heading direction before turning
Up,,"Up direction, i.e., 0 degree"
Value,,Value type for dynamic data
Value.equal,myValue.equal otherValue,Check if two values are equal
Value.float,myValue.float,Convert the value to a floating-point number
Value.int,myValue.int,Convert the value to an integer
Value.string,myValue.string,Convert the value to a string
waitUntil,waitUntil true,Wait until given condition is met
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
