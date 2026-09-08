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

A Notification is a message addressed to one User about a product event.

A Notification contains:

* Recipient: the User who can read the Notification
* Title: a summary of the update
* Body: the complete message
* CreatedAt: the creation time
* ReadAt: the time the Recipient read the Notification; empty while unread

### Notification List

The Notification List is the current user's collection of Notifications. It provides the unread count and the Notifications ordered from newest to oldest.

## Core Mechanisms

### Creating a Notification

A product feature creates a Notification for its Recipient. A new Notification is unread and appears in the Notification List according to its CreatedAt.

### Reading Notifications

Users open the Notification List from the navigation bar. Opening a Notification shows its details and records the read time. The unread count updates after the read state changes.
