# In-Product Notification

XBuilder uses In-Product Notification to deliver product updates inside XBuilder. Each product feature defines when to send a Notification and what it contains.

## Background

Some product operations finish after users leave the page where they started. Updates from other users or the platform can also arrive while they are away. Users need a place to find these updates when they return.

## Goals

* Users can find product updates relevant to them.
* Users can distinguish unread Notifications from those they have read.
* Product features share a Notification List, content format and read behavior.

## Basic Concepts

### Notification

A Notification contains:

* Recipient: the User who can read it
* Category: the Notification category, such as Message or Announcement
* Title: a summary of the update
* Body: the complete message in Markdown
* CreatedAt: the creation time
* ReadAt: the time the Recipient first read it; empty while unread

The page displays Title, Body and CreatedAt. User names, project links, attachments and quoted context belong in Body, without separate display fields for each kind of event.

### Notification List

The Notification List contains the current user's Notifications, grouped by Category.

## Core Mechanisms

### Creating Notifications

Product features create Notifications for their Recipients and set the Category according to how clients should present them. New Notifications are unread.

### Listing Notifications

Each category has an unread count; the navigation entry shows their sum. Notifications are ordered from newest to oldest by CreatedAt, with a stable order when times are equal. Reading one does not change its position or cause items to be skipped or repeated when loading more.

### Reading Notifications

Opening the list or switching categories does not mark Notifications read. Opening a Notification shows its details and records ReadAt. The list and unread counts update after the read state is saved. Reopening it preserves the first-read time.

When mark all as read is processed, it covers Notifications already delivered in both categories, including items not yet loaded in the panel. Those Notifications no longer count as unread; Notifications delivered afterward remain unread and increase the count for their category.

## User Story

### View Notifications

A User returns to XBuilder and sees that they have unread Notifications. They open the Notification List from the navigation bar. Notifications with the Message Category appear under Messages, while those with the Announcement Category appear under Announcements. After checking both tabs, the User marks the remaining Notifications read.
