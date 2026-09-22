# In-Product Notification

XBuilder uses In-Product Notification to deliver asynchronous product updates to users inside XBuilder. A Notification is a reusable delivery mechanism; the product feature that creates it defines the event and content.

## Background

Some product operations finish after the user has left the page where they started. A persistent entry in XBuilder keeps the result available after the user leaves the original page.

## Goals

* Users can find product updates addressed to them in XBuilder.
* Users can distinguish unread notifications from notifications they have read.
* Product features share one Notification List and read-state behavior.

## Basic Concepts

### Notification

A Notification delivers a product event in one of two categories:

* Message: addressed to one User.
* Announcement: addressed to all Users who exist when it is published. Later registrations do not automatically receive historical announcements; retries keep the original audience.

Both categories share the same presentation and independent per-recipient read state.

A Notification contains:

* Recipient: the User who can read the Notification
* Title: a summary of the update
* Category: Message or Announcement
* Body: the complete message in Markdown
* CreatedAt: the creation time
* ReadAt: the time the Recipient read the Notification; empty while unread

### Notification List

The Notification List is the current user's collection of Notifications, separated into Messages and Announcements tabs. Each tab has its unread count; the navigation entry shows their sum. Each category is ordered newest first, with stable ordering for equal creation times. Reading an item does not move it or cause pagination to skip or duplicate items.

Display content consists only of title, Markdown body and creation time. User names, project links, attachments and quoted context belong in the body, not event-specific display fields. Category, identity, recipient and read state support routing and interaction.

Render Markdown safely: no executable HTML or unsafe link schemes. Links never grant access to private resources. Content describes the event when it happened and is not rewritten after user or project renames.

## Core Mechanisms

### Creating a Notification

A product feature creates a Notification for its Recipient. A new Notification is unread and appears in the Notification List according to its CreatedAt.

### Reading Notifications

Users open the Notification List from the navigation bar. Opening a Notification shows its details and records the read time. The unread count updates after the read state changes.

Opening the list or switching tabs does not mark items read. Reopening a detail preserves the first-read time. Mark all as read affects both categories, including items not loaded in the panel; notifications delivered after the operation's snapshot remain unread.

Distinguish loading, empty and failed states. Failed read updates must not leave the UI falsely showing success; allow retry. Long content remains accessible within the viewport. If a linked resource becomes private or unavailable, preserve notification history and use the destination's normal access/unavailable handling without leaking restricted content in previews.

## Proposed Business Integrations

These are proposed product decisions for review before implementation, not a description of completed integration. Start with likes and remixes. The [Demo #3493](https://github.com/goplus/builder/pull/3493) illustrates these interactions as well as follows and feedback replies; its mock data is not a production contract.

| Event | Trigger and recipient | Repetition rules |
| --- | --- | --- |
| Project like | After a successful like, notify the project owner. | Exclude self-likes. At most once per actor/project pair, including unlike followed by re-like. Unlike does not retract the existing notification. |
| Project remix | After a new remix project is successfully saved to the cloud, notify the direct source project's owner. | Exclude self-remixes and other ancestors in the remix chain. Once per new remix project; subsequent saves and retries do not notify again. |

Only successful business events create notifications. Failed actions, opening dialogs and unsaved local edits do not. Do not backfill historical likes or remixes at launch.

Under the [Community model](./community.md#remix), a remix starts private. Its notification may identify the actor and link to the original project, but must not expose the private remix's title, content or link. This proposal notifies on successful creation, not publication; publishing later does not send another remix notification.

### Content Examples

* Like title: “Alice liked your project.” Body: a linked actor name, “liked your project”, and a link to the original project.
* Remix title: “Alice remixed your project.” Body: a linked actor name, “remixed your project”, and a link to the original project, without private remix details.
* Announcement title: “Scheduled maintenance.” Body: maintenance time, affected features and preparation instructions in Markdown.

### Deferred Scenarios

* Sharing: copying a link or opening a share dialog does not prove delivery and has no definite recipient, so neither creates a notification. A future share-with-a-user feature must first define its recipient and successful-delivery event.
* Follows and feedback replies: demonstrated in the Demo, but their trigger and repetition rules require follow-up product work.
* This scope does not add direct messaging, email/push delivery, notification preferences, event aggregation or an announcement publishing interface. Announcements are authored by trusted product operators, not ordinary users.

## Acceptance Scenarios

* A successful like produces one message for the owner; retries, re-likes and self-likes produce no additional messages.
* Two distinct remixes by another user may produce two messages; saving either again does not. No private remix details are exposed.
* Reading one item changes only that recipient's corresponding unread count, without reordering it.
* Mark-all covers both tabs; later deliveries stay unread.
* Announcements reach the publication-time audience once each; future users receive no historical copy.
* Copy-link, canceled actions and failed business operations create no notifications.

## Related Work

* [Notification Demo #3493](https://github.com/goplus/builder/pull/3493)
* [Backend infrastructure #355](https://github.com/goplus/builder-backend/pull/355): storage and read APIs; business triggers and frontend integration are separate work.
