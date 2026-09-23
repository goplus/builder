# In-Product Notification

XBuilder uses In-Product Notification to deliver product updates inside XBuilder. Each product feature defines when to send a Notification and what it contains.

## Background

Some product operations finish after users leave the page where they started. Updates from other users or the platform can also arrive while they are away. Users need a place to find these updates when they return.

## Goals

* Users can find Messages addressed to them and Announcements sent to everyone.
* Users can distinguish unread Notifications from those they have read.
* Product features share a Notification List, content format and read behavior.

## Basic Concepts

### Notification

A Notification contains:

* Recipient: the User who can read it
* Category: Message or Announcement
* Title: a summary of the update
* Body: the complete message in Markdown
* CreatedAt: the creation time
* ReadAt: the time the Recipient first read it; empty while unread

The page displays Title, Body and CreatedAt. User names, project links, attachments and quoted context belong in Body, without separate display fields for each kind of event.

### Message

A Message is addressed to one User. Likes, remixes and feedback replies are examples of product events that may create Messages; each feature defines its own triggering events and content.

### Announcement

An Announcement is addressed to all Users who exist when it is published. Users who register later do not automatically receive historical Announcements. Messages and Announcements use the same content structure, and each Recipient has independent read state.

### Notification List

The Notification List contains the current user's Notifications, divided into Messages and Announcements.

## Core Mechanisms

### Creating Notifications

Product features create one Notification per Recipient and set its Category to Message or Announcement. New Notifications are unread.

### Listing Notifications

Each category has an unread count; the navigation entry shows their sum. Notifications are ordered from newest to oldest by CreatedAt, with a stable order when times are equal. Reading one does not change its position or cause items to be skipped or repeated when loading more.

### Reading Notifications

Opening the list or switching categories does not mark Notifications read. Opening a Notification shows its details and records ReadAt. The list and unread counts update after the read state is saved. Reopening it preserves the first-read time.

When mark all as read is processed, it covers Notifications already delivered in both categories, including items not yet loaded in the panel. Those Notifications no longer count as unread; Notifications delivered afterward remain unread and increase the count for their category.

## User Story

### View Notifications

A User returns to XBuilder and sees that they have unread Messages. They open the Notification List from the navigation bar, read one Message, and then switch to Announcements. After checking both categories, they mark the remaining Notifications read.
