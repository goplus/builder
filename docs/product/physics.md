# Physics

To facilitate implementing more realistic effects in games, we have built-in physics engine capabilities and provide them to XBuilder users.

Users can easily implement collision, gravity, friction, and other physical effects between Sprites through simple configuration and scripting.

## Related Concepts

### Stage

We extend the Stage Config information as follows:

* Physics: Global configuration for the physics engine, including whether it's enabled, gravity, friction coefficient, etc.

### Sprite

We extend the Sprite Config information as follows:

* Physics: Configuration for this sprite's behavior in the physics engine, including Physics Mode, gravity, friction coefficient, etc.

### Physics Mode

A sprite's physics mode determines its behavior in the physics engine.

We provide the following 3 modes:

* None: No physics engine effects (collision, gravity, etc.)
* Static: The object will not move, but will affect the movement of other objects
* Kinematic: The object will be collided with by other objects, but is not affected by gravity
* Dynamic: The object will be collided with by other objects and is affected by gravity

## Related APIs

See https://github.com/goplus/spx/pull/816