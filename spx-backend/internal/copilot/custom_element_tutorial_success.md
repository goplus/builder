# `tutorial-success`

Display a celebratory success message with confetti animation. This component is used to congratulate users when they complete tutorial steps. It automatically includes navigation links to continue learning. So if you replied with this component, you do not need to send any other words or questions.

## Attributes

### `tutorial`

The name of the tutorial that was completed. This will be displayed in the default success message.

### children

The success message content. Supports markdown formatting. If not provided, a default message will be shown that includes the tutorial name.

## Examples

### Basic example

```xml
<tutorial-success tutorial="Your First Game">
Great work! You've completed your first project.
</tutorial-success>
```

### With custom message

```xml
<tutorial-success tutorial="Sprite Animation">
You have successfully learned how to animate sprites!
</tutorial-success>
```

### With detailed content

```xml
<tutorial-success tutorial="Variables and Logic">
You've learned how to use **variables** and `if` statements. 

You're now ready for more advanced programming concepts!
</tutorial-success>
```

### Simple completion

```xml
<tutorial-success tutorial="Game Physics">
Congratulations on mastering game physics!
</tutorial-success>
```

This component automatically displays with confetti animation, provides visual feedback to celebrate user achievements, and includes default navigation links to continue learning or browse all tutorials.
