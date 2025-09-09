# Community

Purpose of Building a Community:

* Foster creative enthusiasm: Experience excellent projects created by others
* Lower the barrier to creation: Continue creating based on other projects
* Improve creative abilities: Learn how other projects implement functionalities

The term "Community" in this document refers to a series of capabilities built to establish a community and achieve the aforementioned purposes, including but not limited to:

* Operations related to Projects, such as publishing, running, commenting, liking, remixing, etc.
* Operations related to Users, such as personal information management, following, etc.
* Operations related to teams, such as creation, management, and even benefit distribution.

## Basic Concepts

### Follow

Users can follow other users to receive their news in a timely manner. When A follows B, A is considered a follower of B, and B is considered a followee of A.

In the long run, "news" may include but is not limited to:

* New projects from followees
* New releases from followees
* New followees of followees

Channels for obtaining news may include but are not limited to:

* Recommended content on the follower's homepage
* Message notifications (in-site messages, emails, etc.) for the follower

### Like

Users can like projects they enjoy. In addition to expressing their admiration for the project, it also allows them to easily find it in the future. In the long run, we may also use a user's like information to recommend content to them.

### User

On top of the [XBuilder](./index.md), the basic information of a user is expanded as follows:

* Description: A description of oneself

### Project

On top of the [XBuilder](./index.md), the information of a project is expanded as follows:

* Description: A description of the project
* Instructions: Instructions for playing the game
* RemixFrom: Information about the source of the remix, if the current project is created by remixing based on another project, this records the original project and release information
* Thumbnail: A thumbnail image
* Other community interaction-related information, such as visit counts, etc.

### Release

A release is a snapshot of a project's state at a certain moment, representing a fixed and immutable game content.

Each project can have zero or more releases.

A release includes the following information:

* Version: A version number used to identify the release; for releases under the same project, the version is unique
* Description: A description of the release
* Game: The game content
* Thumbnail: A thumbnail image
* Others, such as creation time, etc.

Whether another user or an anonymous user can access a release depends on whether its corresponding project is public. Only when a project is public can its releases be accessed by other users or anonymous users.

In the simplest implementation, the game information in a release is a copy of the game information in the project. In the long run, we may do more work during the release creation phase, such as compression, compilation, etc. Therefore, the game information in a release actually contains two parts:

1. Source code, consistent with the game information in the project
2. Executable file generated based on the source code

The process of creating a release for one's own project includes:

* Automatically generating (or user inputting) version and description information
* Copying the game and thumbnail from the current project as the game and thumbnail of the release
* Creating the release using the above information

### Publish

Publishing is an action that:

1. If the current project is not public, sets it to public
2. Allows the user to update the description, instructions, and other information of the current project
3. Creates a release based on the current project
4. Provides the operator with a successful publish prompt and the URL of the project page for sharing with others

### Unpublish

Unpublishing is an action that:

1. If the current project is public, sets it to private

### Remix

Users can create their own projects based on other people's projects and continue editing them. This process is called remixing.

Note that when remixing a project, it is always necessary to specify one of its releases (by default, the latest release). When remixing a release R of project P, we will:

1. Create a project P2 for the current user (private)
2. Copy the description, instructions, and other information of P to P2
3. Copy the game information (source code part) of R to P2
4. Set the RemixFrom of P2 as P & R

## User Story

### Edit Project

In addition to the actions mentioned in [XBuilder](./index.md), users can also perform the following actions in the editor:

* Publish / Unpublish a project

### View Others' Public Project Homepage

Logged-in or anonymous users can visit the homepage of others' public projects to:

* View basic information about the project, such as owner, name, description, instructions, remix source, etc.
* View release records, such as creation time, version, description, etc.
* View community interaction information of the project
* Run the game, where the game content is the latest release of the project
* Share the project with others
* Like (if logged in)
* Remix the project (if logged in)

  Remixing is based on the latest release of the project only when the project has releases.

### View Own Project Homepage

Logged-in users can visit their own project homepage to:

* View basic information about the project, such as owner, name, description, instructions, remix source, etc.
* View release records, such as creation time, version, description, etc.
* View community interaction information of the project
* Run the game, where the game content is the latest release of the project
* Edit basic information about the project, such as description, instructions, etc.
* Edit the game content of the project (redirect to the editor page)
* Unpublish the project

### View Others' Personal Homepage

Logged-in or anonymous users can visit other users' personal homepage to:

* View basic information about the user, such as name, description, etc.
* View the list of the user's public projects
* View community interaction information of the user, such as followers, followees, likes, etc.
* Follow / Unfollow the user (if logged in)

### View Own Personal Homepage

Logged-in users can visit their own personal homepage to:

* View their own basic information, such as name, description, etc.
* View the list of their own public projects
* View community interaction information of themselves, such as followers, followees, likes, etc.
* Edit their own basic information

### Access the Community Homepage

Logged-in or anonymous users can access the community homepage to:

* View a list of recommended public projects (based on recent likes and remixes across the platform)
* View news from followed users
