# In-Product Notification

XBuilder uses In-Product Notification to keep product updates available after users leave the original page. Features such as likes, remixes and feedback replies can use Notifications; each feature defines its own triggering events and content.

## Basic Concepts

### Notification

A Notification contains:

* Recipient: the User who can read it
* Category: Message or Announcement
* Title: a summary of the update
* Body: the complete message in Markdown
* CreatedAt: the creation time
* ReadAt: the time the Recipient first read it; empty while unread

A Message is addressed to one User. An Announcement is addressed to all Users who exist when it is published. Users who register later do not automatically receive historical Announcements.

Both categories use the same content structure. Each Recipient has independent read state, and new Notifications are unread.

The page displays Title, Body and CreatedAt. User names, project links, attachments and quoted context belong in Body, without separate display fields for each kind of event.

### Notification List

The Notification List contains the current user's Notifications, divided into Messages and Announcements. Each category has an unread count; the navigation entry shows their sum.

Notifications are ordered from newest to oldest by CreatedAt, with a stable order when times are equal. Reading a Notification does not change its position or cause items to be skipped or repeated when loading more.

## User Story

### View Notifications

Signed-in users open the Notification List from the navigation bar and select Messages or Announcements. Opening the list or switching categories does not mark Notifications read.

Opening a Notification shows its details and records ReadAt. The list and unread counts update after the read state is saved. Reopening the same Notification preserves the first-read time.

The list should distinguish loading, no Notifications and request failure. If a read update fails, the UI should restore the unread state and allow retry. Long titles and bodies should remain accessible within the viewport.

Markdown rendering must block executable HTML and unsafe link schemes. Links and previews follow the referenced resource's access rules.

### Mark All Notifications Read

Users can mark all Notifications read. This includes both categories and items not yet loaded in the panel. Notifications delivered after the operation's snapshot remain unread.
