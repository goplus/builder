# Courses as Projects

A course author can open a lesson by its project address, edit it, preview a draft and publish a release. A series gives that lesson a place in a learning sequence. Authors can work on the lesson by itself, and learners can open it either directly or as part of the series.

This design applies the [Project Type](project-type.md) model to the two learning experiences described in [Tutorial v2](tutorial-v2.md). A common project format also lets the editor and future CLI tools work with the same authored course.

## Project identity and content

Guided and Playground courses use different content formats. A Guided Course sends the learner to a page and gives Copilot instructions. A Playground Course is an XGo class framework project whose program drives the lesson. Project Type therefore identifies the course format when creating, opening or importing a project.

| Project Type | What the author supplies |
| --- | --- |
| `guided-course` | Root `index.json` holds the `entrypoint`. Root `prompt.md` holds the Copilot instructions. The entrypoint can open a separate sample project or another Builder page. |
| `playground-course` | The project files contain the existing course configuration, `main_course.gox`, resources and the embedded learner exercise at their original relative paths. The exercise has its own type, such as SPX. |

Both use the ordinary Project display name and thumbnail. The address is `owner/name`, names are unique across types under an owner, and the type is fixed at creation. For example, a Guided Course and the sample game it opens each have their own project address. XBP packages record the course's Project Type so import can select the correct editor. Historical XBP packages without a type still open as Game.

## Authoring and publication

Authors create courses from Course Management. Creating a lesson within a series selects the matching Project Type. The general New Project action continues to create games. The Course Management UI and series management API require `canManageCourses`. Course projects themselves use ordinary Project permissions, including when accessed directly through the API.

At `/editor/:owner/:name`, the editor autosaves the author's working copy. Preview runs that draft in an isolated session. The author explicitly creates a Project release to publish an edited lesson.

Ordinary learning follows Project detail page rules, including when the author opens the learning link. A public project with a release uses the latest release's files and thumbnail. Otherwise, anyone with access loads current Project data. The display name follows the project. For a public lesson, this gives the following behavior on **the same learning link**:

| Author action | What the learner opens |
| --- | --- |
| Save the lesson before its first release | Current project content |
| Publish release A | A |
| Edit and autosave B | A, while the author can preview B |
| Publish release B | B |

## Discovery and learning

Learners discover courses in Tutorials. General project lists, including the community homepage, profiles, search and Explore, continue to select Game. A direct course link at `/project/:owner/:name` opens a lightweight detail page with the cover, title, author, description and a **Start learning** action.

Both types start at `/project/:owner/:name/start`. Guided opens its configured entrypoint and starts the Copilot session. Playground opens `/project/:owner/:name/playground/:inPlaygroundPath*`. Each learner works on a session-local exercise, so changing code or restarting the exercise preserves the authored lesson and other learners' work.

## Series membership and navigation

A course may stand alone or belong to one series. Each series accepts courses of the matching Project Type and determines unit and lesson order. When opening a lesson from a series, the editor and learning links carry `?series=<seriesID>`. After verifying membership, learning and editor preview offer previous and next lessons in series order, including across a unit boundary. Guided retains the series context when it navigates to its entrypoint. A standalone link omits series navigation.

Deleting a series in Course Management also deletes its courses. If a course project is deleted directly, the series skips the missing lesson and preserves the relative order of the remaining lessons.

## Bringing existing series forward

The three maintained series are exported from the old application, converted offline and imported into the new application. The conversion preserves lesson titles, thumbnails, series and unit order, Guided prompts and entrypoints, and Playground paths and resource references. Learners use the new learning links after the switch.

Converted packages can omit the course projects' owner and name. The importer uses the importing account and assigns `course-<destinationSeriesID>-<ordinal>`, numbering from 1 across the entire series and adding a numeric suffix on collision. Reordering lessons later preserves the assigned names.

The importer offers **Create an initial release for imported courses** for the whole import. Enable it for the three existing series so authors can immediately edit their next draft while learners continue using the imported release.
