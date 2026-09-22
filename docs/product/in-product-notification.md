# In-Product Notification

Users may leave a page before an operation finishes, or receive a like or remix while away from XBuilder. In-Product Notification lets them find these updates later. Product features define when to send a Notification and what it contains; they share the same Notification List and read behavior.

## Basic Concepts

### Notification

A Notification contains:

* Recipient: the User who can read it
* Category: Message or Announcement
* Title: a summary of the update
* Body: the complete message in Markdown
* CreatedAt: the creation time
* ReadAt: the time the Recipient first read it; empty while unread

A Message is addressed to one User. An Announcement is addressed to all Users who exist when it is published. Both use the same content structure, and each Recipient has independent read state.

The page displays Title, Body and CreatedAt. User names, project links, attachments and quoted context belong in Body. We do not introduce separate display fields for each kind of event. Category, identity, Recipient and read state are used to organize and handle Notifications.

Content records the event when it happened. Renaming a User or Project does not rewrite existing Notifications.

### Notification List

The Notification List contains the current user's Notifications, divided into Messages and Announcements. Each category has an unread count; the navigation entry shows their sum.

Notifications are ordered from newest to oldest by CreatedAt, with a stable order when times are equal. Reading a Notification does not change its position. Loading more items should not skip or repeat Notifications because their read state changed.

## User Story

### View Notifications

Signed-in users open the Notification List from the navigation bar and select Messages or Announcements. Opening the list or switching categories does not mark Notifications read.

Opening a Notification shows its details and records ReadAt. The list and unread counts update after the read state is saved. Reopening the same Notification preserves the first-read time. Reading it does not affect another Recipient's read state.

Users can mark all Notifications read. This includes both categories and items not yet loaded in the panel. Notifications delivered after the operation's snapshot remain unread.

The list should distinguish loading, no Notifications and request failure. If a read update fails, the UI should restore the unread state and allow retry. Users should be able to read long titles and bodies without the panel extending beyond the viewport.

Markdown rendering must block executable HTML and unsafe link schemes. Links follow the destination's access rules. If a Project becomes private or unavailable, the Notification remains in the list; the destination shows its normal access or unavailable message. Previews must not expose restricted content.

### Receive a Like or Remix Notification

We propose starting with project likes and remixes. The following rules need review before implementation. These integrations have not been completed.

#### Like

After a User successfully likes a Project, its owner receives a Message. Self-likes do not send Notifications.

For the same User and Project, send at most one Notification. Removing a like does not retract it, and liking the Project again does not send another one. Retrying the request also does not send another Notification.

For example, Title can be "Alice liked your project." Body contains Alice's name with a link to her profile, the text "liked your project", and a link to the Project.

#### Remix

After a new remix Project is successfully saved to the cloud, the owner of its direct source Project receives a Message. Self-remixes do not send Notifications, nor do we notify every author in the remix chain.

Each new remix Project sends one Notification. Two distinct remixes can therefore send two Messages, but subsequent saves and retries do not send more.

A remix starts private under the [Community model](./community.md#remix). The Notification can identify the User and link to the original Project, but cannot include the private remix's title, content or link. Publishing it later does not send another remix Notification.

For example, Title can be "Alice remixed your project." Body contains Alice's profile link and the original Project link, without private remix details.

Only successful actions send Notifications. Opening a dialog, canceling an action, a failed operation or an unsaved local edit does not. Historical likes and remixes are not backfilled when the feature launches.

### Receive an Announcement

Trusted product operators can send Announcements, such as release or maintenance notices. Ordinary users cannot publish Announcements.

For example, an Announcement titled "Scheduled maintenance" describes the maintenance time, affected features and preparation instructions in its Markdown body.

Each User who exists at publication receives one copy, initially unread. Retrying delivery keeps the original recipients and does not send duplicate copies. Users who register later do not receive this historical Announcement.

## Scope and Related Work

The [Demo #3493](https://github.com/goplus/builder/pull/3493) demonstrates likes, remixes, follows and feedback replies. Its mock data is for the demonstration and does not define the production data contract. Follow and feedback-reply triggers, including their repetition rules, need separate product design.

Copying a link or opening a share dialog does not establish delivery or identify a Recipient, so neither sends a Notification. Before adding sharing with a specified User, we need to define its Recipient and successful-delivery event.

Direct messaging, email or push delivery, notification preferences, event aggregation and an announcement publishing interface are outside this scope.

[Backend infrastructure #355](https://github.com/goplus/builder-backend/pull/355) provides storage and read APIs. Business triggers and frontend integration are separate work. See [Notification Demo #3493](https://github.com/goplus/builder/pull/3493) for the interaction reference.
