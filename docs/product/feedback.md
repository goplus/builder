# Feedback

Users may encounter broken features, unexpected runtime results, or situations where they do not know how to continue
while using XBuilder. Feedback allows users to describe a problem directly in XBuilder and, with their consent, attach
diagnostic information from the current project to help administrators investigate it.

## Background

User feedback often consists of a short description. Administrators then need to ask where the user was, what the
project looked like, and which errors occurred before they can start investigating.

Feedback therefore stores both the user's own description and, when the user agrees, the project's diagnostic context
captured at submission time. Administrators can review and process feedback from one shared list.

## Goals

* Users can submit feedback from within XBuilder.
* Feedback can include diagnostic information captured when it is submitted.
* Copilot can help users prepare feedback, but the user confirms and submits the final content.
* Users can still access feedback when Copilot is temporarily unavailable or its quota is exhausted.
* Administrators can review, process, and reply to feedback.
* Users can receive administrator replies within XBuilder.

## Basic Concepts and Rules

### Feedback

A Feedback contains:

* User
* Title
* Description
* Attachments
* Diagnostic Context
* Status
* CreatedAt
* Reply

Title is limited to 100 characters. Description is limited to 2000 characters.

Feedback has three statuses:

| Status | Meaning |
| - | - |
| `new` | Not processed yet |
| `replied` | An administrator has replied |
| `handled` | Processed without a reply |

The allowed status transitions are:

```text
new -> replied
new -> handled
```

`replied` and `handled` are terminal states. A Feedback is processed once and can have at most one Reply.

### Diagnostic Context

Diagnostic Context is diagnostic information collected when the user confirms Feedback submission. It includes:

* The current page, language, and capture time
* The current project's identifier, type, name, and resource structure
* The selected sprite and its basic state
* The current code file, cursor, selection, and nearby source
* Code errors and warnings in the current project
* The latest 50 runtime outputs

Context is captured when the user confirms submission, rather than when the form is opened. It is not updated when the
project changes after submission.

Users can turn off "Share diagnostic information"; when it is off, Diagnostic Context is not captured. Some diagnostic
details may be omitted when unavailable, but this must not prevent Feedback from being submitted.

### Attachment

The screenshot generated at Feedback submission is stored as an image attachment. Administrators can attach images to
Replies.

The image size limit comes from `maxSize` returned by the Upload Session. The client checks the generated screenshot,
and the server and object storage check it again:

* An image over `maxSize` returns `413 Content Too Large`.
* An unsupported image type returns `415 Unsupported Media Type`.

Attachments reuse the existing upload-session and Kodo storage capabilities. Feedback stores the attachment ID, file
name, media type, size, and object reference, but not a public download URL.

Before downloading an attachment, the server must verify that the requester is the Feedback's submitting user or has
the `feedbackAdmin` role, then return a short-lived signed URL. Attachments cannot be accessed as public resources.

### Reply

A Reply is an administrator's response to a Feedback. It may contain text and image attachments.

After a Reply is saved, the Feedback changes to `replied` and the submitting user receives an in-product notification.

### In-Product Notification

An In-Product Notification delivers an administrator's reply to the user.

It contains the reply, reply time, and reply attachments. Users can view the unread count, notification list, and
notification details from the navigation bar.

## User Flows

### Submit Feedback

Users open "Send feedback" from the profile menu in the top-right corner, enter a title and description, and decide
whether to share Diagnostic Context.

The form shows an in-progress state while submitting to prevent repeated actions. It closes and shows a success message
only after the server confirms that the Feedback was created. When submission fails, the form keeps the user's input and
allows a retry.

The same submission uses a stable Submission ID:

* The same Submission ID and the same content return the existing Feedback.
* The same Submission ID with different content returns `409 Conflict`.
* The same content with a different Submission ID is not merged automatically.

### Copilot Assistance

After the user explicitly asks for feedback, or accepts Copilot's suggestion, Copilot may generate a Title and
Description draft and open the Feedback form.

The user can edit the draft and decide whether to share context. Copilot cannot
submit Feedback directly or open the form without the user's confirmation.

### Copilot Quota Exhausted

The quota-exhausted message may provide a direct action to open the Feedback form. Users can always open Feedback from the
profile menu.

## Administrator Flows

The feedback administrator role is `feedbackAdmin`, with the derived `canManageFeedback` capability.

`feedbackAdmin` can:

* View Feedback lists and details
* View Diagnostic Context shared by users
* Download Feedback attachments
* Reply to Feedback in the `new` state
* Mark Feedback as `handled`

`authorizationAdmin` can assign `feedbackAdmin`. Other administrator roles do not include Feedback management
permissions.

The frontend uses `canManageFeedback` to control the management entry point. Admin APIs must still check
`feedbackAdmin` on the server.

When administrators process the same Feedback, the first successful operation wins:

* The first successful operation takes effect.
* Later operations return `409 Conflict`.
* A saved Reply is not overwritten.
* The frontend reloads the Feedback and shows the effective state.

Administrators may also use internal tools to classify feedback and identify items that may correspond to engineering
Issues.

### Reply Failure

The Reply, status change, and In-Product Notification are saved as one complete operation.

If any step fails:

* The Feedback remains `new`.
* No partial Reply is saved.
* No user notification is created.
* The administrator's reply and selected images remain available.
* The interface reports the failure and allows a retry.

The interface shows "Reply sent" only after the complete operation succeeds.

### Repeated Processing

After a Feedback enters a terminal state, it no longer accepts processing requests.

If an administrator repeats a request after a network timeout, the server rejects the request based on the current
state. It does not create another Reply or Notification. The frontend reloads the Feedback and shows the saved result.

### Notification Failure

The in-product notification record is saved together with the Reply. If creating the notification fails, the complete
reply operation fails and the Feedback does not change to `replied`.

After the notification record has been saved, a failure to refresh the navigation badge does not affect the notification.
Users can still view it the next time they open the notification center.

Marking Feedback as `handled` does not create a Notification.

## User Stories

### User Submits Feedback

The user enters a problem, decides whether to share Diagnostic Context, and
submits Feedback. On success, the user sees a clear completion state. On failure, the user can retry with the original
content.

### User Asks Copilot to Prepare Feedback

Copilot prepares a draft after the user explicitly asks for it. The user reviews and edits the content before submitting
Feedback.

### Administrator Processes Feedback

An administrator with `feedbackAdmin` opens the Feedback details, replies to the user, or marks the Feedback as requiring
no reply. When concurrent processing occurs, the interface shows the operation that took effect.

### User Views a Reply

After an administrator replies, the user sees an unread notification in the navigation bar and can view the reply and its
image attachments.
