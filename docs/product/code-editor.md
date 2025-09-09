# Code Editor

The Code Editor is a tool in XBuilder that assists users in writing spx code.

In addition to the parts that belong to the Code Editor in terms of interface structure, this document will also cover some parts of the interface that belong to other sections but also affect the code writing process, such as project debugging, resource modification, etc.

## Basic Concepts

### Resource

A resource refers to the content in a Project that is explicitly defined and can be referenced in the code (usually by its name), including but not limited to:

* Sprite
* Costume
* Sound
* Backdrop
* Animation
* Widget

### Resource Reference

A reference to a resource in the code is called a Resource Reference.

The Code Editor will recognize references to Project Resources in the code and visualize this information through Inlay Hints, among other methods. There are two types of Resource References:

1. String literals in resource operation API calls, such as `play "explosion"`, referred to as string-literal as a resource-reference.
2. Identifiers corresponding to variables that trigger spx [auto-binding](https://github.com/goplus/spx/issues/379), referred to as identifier as a resource-reference.

Additionally, the Code Editor will maintain synchronization of information:

* When a Resource is renamed in the Project, references to that Resource in the code will also be updated.
* When a Resource Reference is renamed in the Code Editor, the Resource name in the Project will also be updated.

### Hover

Hover is an interaction mode where, when the user hovers the mouse over an element, a floating layer appears near the element containing:

* An overview of the element

  Note that if the element corresponds to a function with multiple overloads, each overload will have its own overview.

* A detailed description of the element

  Note that if the element corresponds to a function with multiple overloads, each overload will have its own detail.

* A set of related actions, including:

  - Go to Definition
  - Rename
  - Explain, which invokes Copilot to explain the location, function, etc., of the current element.
  - Modify Reference, which provides an entry to modify the reference for Resource References.

  Note that if the element corresponds to a function with multiple overloads, they share the same set of actions.

The specific correspondence between element types and floating layer content is as follows (see https://realdream.larksuite.com/wiki/C3QWwOlPCitXpxkiDwLu5OMmsLd?sheet=i96sy2):

| **Hovered Node<br>https://go.dev/ref/spec**     | Overview                                                                                                                                                                                                                                           | Detail                | Action<br>Go to definition | Action<br>Rename           | Action<br>Explain | Action<br>Modify Reference |
|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|----------------------------|----------------------------|-------------------|----------------------------|
| **identifier bound to a package**               | `package {name}`<br>package fmt                                                                                                                                                                                                                    | Document, if there is | No                         | No                         | Yes               | No                         |
| **identifier bound to a type / type-parameter** | `type {name} {type}`<br>type A int                                                                                                                                                                                                                 | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a variable / parameter**   | `var {name} {type}`<br>var err error                                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a constant**               | `const {name} {type} = {value}`<br>const a int = 123                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a function**               | `func {name}({parameters}) {result}`<br>func foo(a int) b int<br><br>NOTE: If there's multiple overloads and can't decide which one is used here (sometimes it can be decided if in a call expression), repeat all overload signatures                 | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifier for a field name**                 | `field {name} {type}`<br>field a int                                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifier for a method name**                | `func {name}({parameters}) {result}` (omit receiver)<br>func foo(a int) b int<br><br>NOTE: If there's multiple overloads and can't decide which one is used here (sometimes it can be decided if in a call expression), repeat all overload signatures | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **string-literal as a resource-reference**      | `{resourceType} {name}`<br>Sound ""explosion""                                                                                                                                                                                                     | Preview for resource  | Yes, select the resource   | Yes                        | No                | Yes                        |
| **identifier as a resource-reference**          | `{resourceType} {name}`<br>Sprite ""NiuXiaoQi""                                                                                                                                                                                                    | Preview for resource  | Yes, select the resource   | Yes                        | No                | No                         |

### Marker

A Marker is a special hint in the Code Editor used to mark certain code as having a special status (such as errors, warnings, etc.).

A Marker includes the following information:

* Level, including Error, Warning, etc.
* Message, describing the specific content of the problem
* Range, corresponding to a range in the code text

The sources of Marker information include:

* Syntax Error, real-time check
* Type Error, real-time check
* Resource Reference Check, checking whether the reference is correct based on the Resource type and name, real-time check
* Runtime Error, corresponding to runtime errors that can be located to the source code position, generated during project runtime
* Review Result, from tools like Vet, LLM, etc., real-time check (frequency controlled by cost)

In addition to displaying information, Markers also provide entry points for related operations, including:

* Fix Problem, invoking Copilot to explain the problem and provide repair suggestions

### Completion

Completion is an interaction mode where, when the user enters code, the editor provides some possible completion options based on the current context, and the user can select from the options using the keyboard or mouse.

Each completion option includes the following information:

* Kind, such as Variable, Function, Type, etc.
* Label
* Overview, same as the Overview in Hover
* Detail, same as the Detail in Hover

The specific correspondence between input positions and completion options is as follows (see https://realdream.larksuite.com/wiki/C3QWwOlPCitXpxkiDwLu5OMmsLd?sheet=sDY34F):

| Input Position<br>https://go.dev/ref/spec          | Completion Items                                                                                                                                                                                                         |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| identifier in operand name                         | * identifiers declared in current or outer blocks, not bound to a type<br>* identifiers exported by package spx, not bound to a type<br>* fields & methods of current class (Sprite / Game)<br>* keywords (for, if, ...) |
| identifier in type name                            | * identifiers declared in current or outer blocks, bound to a type<br>* identifiers exported by package spx, bound to a type                                                                                             |
| identifier in qualified identifier in operand name | * identifiers exported by the package, not bound to a type                                                                                                                                                               |
| identifier in qualified identifier in type name    | * identifiers exported by the package, bound to a type                                                                                                                                                                   |
| identifier in selector                             | * fields & methods of current value                                                                                                                                                                                      |
| string-literal as a resource-reference             | * resources of current type                                                                                                                                                                                              |

### Context Menu

The Context Menu is a menu triggered by right-clicking or selecting text in the editor, containing actions specific to the current context.

There are two ways to trigger the menu:

1. Position: When no code is selected, the menu uses the current document and cursor position as context information.
2. Range: When a segment of code is selected, the menu uses the current selection range as context information.

For Position Context, the following actions are provided:

* Rename
* Go to Definition
* Basic actions such as Copy, Cut, Paste, etc.

The specific behavior of Rename and Go to Definition depends on the element corresponding to the current cursor position, consistent with the Hover logic.

For Range Context, the following actions are provided:

* Explain, invoking Copilot to explain the behavior, function, etc., of the selected code segment.
* Review, invoking Copilot to review the selected code segment and provide suggestions on code style, potential issues, etc.
* Basic actions such as Copy, Cut, Paste, etc.

### Inlay Hint

Inlay Hint is some hint information or actionable elements inserted in the code to help users understand the behavior of the current code.

Inlay Hints are displayed in the following situations:

* Resource Reference

  For Resource References in the code, an icon is used to indicate that the current value is associated with a specific type of Resource.

  For string-literal as a resource-reference, clicking the icon allows the user to select the Resource, similar to the Modify Reference action in the Hover floating layer.

An Inlay Hint includes the following information:

* Kind, such as Sound, Sprite, etc.
* Position

### API Reference

API Reference lists and explains the main API definitions of Builder (spx) and allows the corresponding code snippets to be inserted into the current code file.

API definitions include:

1. go/gop syntax structures, such as `for`, `if`, etc., each corresponding to an API definition for each usage.
2. Built-in functions of go/gop, such as `print`, `println`, etc.
3. Capabilities or definitions provided by spx, such as `turn`, `Left`, etc.; when a capability has multiple usage patterns, each pattern corresponds to an API definition.

Each API definition includes:

* Kind, such as Function, Type, etc.
* Overview, similar to the Overview in Hover
* Detail, similar to the Detail in Hover
* Code Snippet

Supported actions include:

* Insert, inserting the Code Snippet corresponding to the API definition into the current code file
* Explain, invoking Copilot to explain the function, usage, etc., of the current API definition

### Copilot

Copilot is a robot assistant that helps with code writing. Users can get help information by conversing with Copilot. The capabilities provided by Copilot include:

* Inspire: Providing ideas and guidance for solving problems based on user questions

  Inspire is triggered by users asking questions through an input box. After receiving a reply, users can continue to ask follow-up questions. Therefore, the content of Inspire consists of one or more rounds of conversation.

* Explain: Explaining a specified object, including its behavior, function, etc.

  Explain is triggered by the Explain actions in Hover Action, Context Menu, API Reference, etc. When triggered, the object to be explained is provided. There are two types of objects:

  1. Code segment
  2. Definition (the element that triggered the hover or the API in the API Reference)

  "Explain this object" is the theme of the Explain interface. After receiving the initial reply on this theme, users can continue to ask follow-up questions.

* Review: Reviewing a specified object (usually a selected code segment) and providing suggestions on code style, potential issues, etc.

  Review is triggered by the Review actions in Context Menu, etc. When triggered, the object to be reviewed is provided. The object is the selected code segment.

  "Review this object" is the theme of the Review interface. After receiving the initial reply on this theme, users can continue to ask follow-up questions.

* Fix Problem: Providing repair suggestions for a specified object (usually a Marker)

  Fix Problem is triggered by the Fix Problem actions in Marker, etc. When triggered, the object to be fixed is provided. The information is similar to that included in the Marker, including Level, Message, Range, etc.

  "Explain this object and provide repair suggestions" is the theme of the Fix Problem interface. After receiving the initial reply on this theme, users can continue to ask follow-up questions.

In Copilot's replies, in addition to text descriptions, some special content may also be included, such as:

* Code Link, which can guide users to jump to a specific position or range in the code text
* Code Block, which can be added to the current code file by the user
* Code Change, which can be directly applied to the current code file by the user

### Debug Console

The Debug Console is used to display information output during code runtime, referred to as Runtime Output. Currently, there are two main sources:

* Runtime Error

  Corresponding to Go panic, we should include source code location information when handling panic and outputting.

* Runtime Log

  We should enhance the built-in `print` / `println` to carry source code location information.

Each Runtime Output includes the following information:

* Category, including Error, Log, etc.
* Time
* Message
* Source Location

  For Runtime Outputs that include source code location information and the location is in the Project code, users can locate the corresponding position in the Code Editor through actions such as clicking.

### Format

Format refers to the operation of formatting existing code, including:

* Gop styling, same as `GopstyleSource` provided by the `github.com/goplus/gop/x/format` package
* Gop classfile styling, see https://github.com/goplus/builder/issues/894

## User Story

### Editing Code

Users can select a Stage or a Sprite and choose the Code tab to open the code content corresponding to the Stage or Sprite in the Code Editor.

During the code editing process, users can use the Hover, Marker, Completion, Context Menu, API Reference, Copilot, and other functions mentioned above to assist in writing code.

Additionally, users can:

* Actively format the currently edited code file
* Actively run the Project

### Running the Project

Users can run the current Project at any time during the editing process to check if the behavior meets expectations.

Running the Project includes the following process:

* Format all code files
* Clear Runtime Output
* Run based on the current Project Game content
* Collect Runtime Output and display it in the Debug Console or as Markers in the Code Editor
* Users can interact with the game during runtime while viewing the output in the Debug Console or the corresponding code
* Users can stop running the Project at any time

  Note that Runtime Output will not be cleared when stopping the run; it will be retained until the Project Game content changes or the Project is run again.
