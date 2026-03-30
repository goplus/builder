# Project Type

## Background

XBuilder is evolving from a creation platform that primarily supports a single Project type into one that supports multiple Project Types. The core of this design is to establish Project Type as a foundational product concept that runs through key scenarios such as creation, browsing, editing, import/export, and tutorials.

## Goals

* Introduce an explicit Project Type for each Project as part of its core metadata.
* Surface Project Type in key scenarios such as project lists, search, explore, project detail pages, and editors.
* Provide a stable information model and product structure for future Project Type expansion.
* Preserve compatibility with existing projects and historical import/export files without requiring manual migration.

## Non-goals

* Detailed feature design for editors of different Project Types.
* Billing or quota management.
* Long-term operational or recommendation strategies for every type.

## Core Concepts and Rules

This section focuses on product concepts, information relationships, and product rules independent of specific UI layouts.

### Project

A Project is the core unit of creation and management in XBuilder. Users create, edit, save, publish, search, explore, share, remix, import, and export around Projects.

A Project contains at least two parts:

* Metadata: such as Owner, Name, Type, visibility, creation time, and update time.
* Content: the actual project content structure for a given type, such as game content, comic content, or robot app content.

### Project Type

Project Type is the top-level classification of a Project. It defines what kind of creative artifact the Project represents.

Project Type directly affects:

* The creation entry point and default template.
* The selected editor or editor mode.
* The selected runtime or preview mode.
* How creation, browsing, and editing entry points are organized.
* How imported or exported files are restored to the correct Project.

Project Type is not just a display label. It is part of a Project's core identity.

### Confirmed and Illustrative Project Types

At the current stage, the confirmed Project Type is `game`, which corresponds to existing spx projects.

To illustrate the multi-type mechanism, this document also introduces two example types: `comic` and `robot-app`. They are used only to discuss information structure, page organization, and user flows. They do not imply committed product directions.

These three types can be understood as follows:

* `game`: A confirmed type, shown to users as "Game". It corresponds to Builder's more mature game-creation capability and is also the default compatibility type for historical projects.
* `comic`: An illustrative type, shown to users as "Comic". It represents creation centered on comics, storyboards, and visual storytelling.
* `robot-app`: An illustrative type, shown to users as "Robot App". It represents applications centered on robots or physical-device interaction.

### Project Identity Rules

A Project is identified by Owner and Name. Project Type is one of its core attributes, but it does not change the uniqueness rule of Name.

The rules are:

* Under the same Owner, Project Name must be globally unique across types. In other words, the same user cannot own projects with the same name but different types, such as a `game` project `alice/hello` and another project of a different type also named `alice/hello`.
* Project Type cannot be changed after creation.

### Account and Global State

The account system is not split by Project Type. Users enter XBuilder with one account and manage Projects of all types under that same account.

Specifically:

* User identity is global rather than type-specific.
* Personal homepage, profile, follow relationships, Likes, and similar behaviors are unified across types.

Cross-type billing and quota implications introduced by this unified account system are out of scope for this document.

### Tutorial and Project Type

The Tutorial system remains unified and is not split into separate product lines by Project Type.

A Course or Course Series may be related to a specific Project Type, or it may be type-agnostic. For example:

* "Build a platformer game" targets `game`.
* "Create a four-panel comic" targets `comic`.
* "Make a robot patrol along a line" targets `robot-app`.
* "Get to know the Builder homepage" is not tied to a specific type.

Therefore:

* `Course` and `Course Series` do not store Project Type information.
* The relationship between a course and a type is expressed through course semantics and referenced sample Projects, rather than through strong data modeling.

### XBP

XBP is XBuilder's project file format for local import and export.

Under the multi-type design, XBP is defined as a type-agnostic unified project package format:

* All Project Types can be exported as `.xbp`.
* XBP remains a unified outer container, while different Project Types may have different internal content structures.
* XBP metadata must include Project Type so the system can choose the correct handling logic during import.

### Copilot and Project Type

Copilot should expand together with the Project Types supported by Builder rather than serving only a single type.

Specifically:

* Copilot should support the interfaces and workflows of all supported Project Types, including different editors and related interactions.
* Copilot should be able to load domain knowledge and tools for different Project Types on demand.

### Asset Library and Project Type

Asset Library is XBuilder's unified asset reuse mechanism and is not split by Project Type.

The following rules apply:

* All Project Types share the same Asset Library mechanism.
* The Asset Types reusable by different Project Types may differ.
* Different Project Types are not required to share the same asset dataset; whether assets are shared depends on whether those types can consume the same Asset Type.
* The Asset Library capability layer remains unified, while the asset data it carries is organized by the Asset Types consumable by each Project Type.

### Compatibility Rules

To preserve backward compatibility, the following rules apply:

* Historical Projects without an explicit Project Type are treated as `game` by default.
* Historical `.xbp` files without Project Type are treated as `game` by default.
* If the system encounters a type that is not supported by the current version, it should show a clear message rather than fail silently.

## User Stories

This section focuses on how users perceive and use multi-type Projects across concrete pages and interaction flows.

In any scenario that displays a Project list, Project Type should be visible through badges, icons, or text labels before the user makes a click decision. This includes the homepage, user project pages, liked-project pages, search results, and the Open Project modal.

### Homepage

The homepage remains a cross-type entry point rather than being split into separate homepages by type. It serves two purposes:

* Help users quickly resume creation and manage their projects.
* Help users discover public content of different types and enter the corresponding Explore pages.

Under the multi-type design, the homepage includes separate sections for different Project Types, with each section acting as an entry point for exploration of that type. In the current version, they are analogous to blocks such as "The community is liking" and "The community is remixing", and can later be organized further by type.

The primary purpose of these sections is to guide users to the corresponding Explore page, such as `/explore/game`, rather than to support deep browsing directly on the homepage.

### Create a Project

When users start creating a project, they must choose the target Type first. This flow continues to use the existing creation modal and the single "New Project" entry in the navigation bar, without introducing a new route.

After clicking "New Project", the user first selects a Project Type in the modal, then fills in the project name and other required information. After creation, the system should go directly to the editor for that type.

### Browse User-related Projects

When viewing a user's projects or liked projects, the default should be to show results across all types, with a type filter available. Type is expressed through a URL query parameter. If `type` is absent, it means all types. For example:

* User projects: `/user/<user>/projects?type=game`
* Liked projects: `/user/<user>/likes?type=game`

### Search Projects

Search is also a cross-type aggregation scenario and uses query parameters for filtering. If `type` is absent, results should include all types, with a type filter available. For example:

* `/search?q=platform&type=game`

### Open a Project

"Open Project" remains a modal. By default, it shows the user's projects across all types and provides a type filter.

After the user selects a project, the system should determine the navigation target based on the project's actual type rather than the current page context.

### Explore a Type

Explore is a type-specific discovery page, with Type reflected in the URL path:

* `/explore/game`

Each Project Type has its own Explore entry point. Unlike cross-type aggregation scenarios such as the homepage or search, Explore focuses on content discovery for a single type.

Different types of Explore can use different content organization, recommendation dimensions, and visual layouts. For example:

* `game`: emphasizes playability, themes, and interactive experience.
* `comic`: emphasizes visuals, narrative, style, and themes.
* `robot-app`: emphasizes device capabilities, use cases, and control logic.

### View Project Details

The project detail page should clearly surface the Project Type and present the content structure appropriate for that type.

Type is placed directly in the route path:

* `/<type>/<user>/<name>`
* For example: `/game/alice/hello`

The page uses the route type to choose the correct rendering logic. The detail page can keep a shared structural skeleton, such as the title area, author information, and basic action area, while allowing type-specific modules to be injected.

### Open and Edit a Project

The editor should enter the correct editing environment based on Project Type. The route format is:

* `/<type>/<user>/<name>/edit`
* For example: `/game/alice/hello/edit`

The system chooses the editing logic based on the route type. When entering the editor from project lists, the Open Project modal, or project detail pages, the navigation target should always be determined by the project's actual type.

### Import or Export a Project

When exporting, all types use the same `.xbp` format. When importing, the system restores the Project based on the Project Type recorded in the file.

If the imported file's type does not match the current context, the system should either notify the user clearly or guide them into the correct type context, rather than failing silently.