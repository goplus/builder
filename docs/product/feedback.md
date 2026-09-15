# Feedback

Feedback lets users describe a problem they encounter in XBuilder and, with their consent, share Context that helps administrators investigate it.

## Background

A short description rarely contains enough information to reproduce a problem. Administrators may also need the page, project state, code, diagnostics, and runtime output from when the problem occurred.

Feedback keeps the user's description and the Context they agree to share in one record, so administrators can understand and process the problem with fewer follow-up questions.

## Goals

* Users can submit Feedback within XBuilder.
* Users can include Context captured at submission time.
* Copilot can prepare a Feedback draft for the user to review and submit.
* Supported AI features can provide a Feedback entry when a feature or quota issue occurs.
* Administrators can investigate, process, and reply to Feedback.
* Users can receive administrator replies within XBuilder.

## Basic Concepts and Rules

### Feedback

A Feedback item contains:

* User: the user who submitted the Feedback
* Title: a summary of the problem, limited to 100 characters
* Description: details about the problem, limited to 2000 characters
* Context: optional diagnostic information the user chooses to share
* Status: the processing state
* CreatedAt: the submission time
* Reply: one administrator response, stored when the Feedback enters `replied`

Feedback has three statuses:

| Status | Meaning |
| - | - |
| `new` | Awaiting administrator processing |
| `replied` | Completed with an administrator Reply |
| `handled` | Completed through the administrator's "Mark as handled" action |

A Feedback item is created in `new`. It can move from `new` to `replied` or `handled`; both are terminal states.

### Context

Context is the diagnostic information shared with a Feedback item. It includes available information from the following categories:

* Source: the feature and entry point from which Feedback was opened
* Current page, language, and capture time
* Current project's identifier, type, name, and resource structure
* Selected sprite and its basic state
* Current code file, cursor, selection, and nearby source
* Code errors and warnings in the current project
* Runtime output from the current project
* Project Snapshot
* Current page screenshot

Context follows these rules:

* Enabling "Share diagnostic information" includes the available Context in Feedback.
* Context is captured when the user confirms submission and remains fixed after submission.
* Nearby source includes up to 21 lines around the current cursor. Runtime output includes the latest 50 entries.
* The Project Snapshot and current page screenshot are stored separately, and Feedback stores references to them. Both follow the existing upload size limit.
* If an item is unavailable or exceeds its limit, Feedback includes the remaining Context and can still be submitted.

### Project Snapshot

A Project Snapshot is the complete project file content captured when the user submits Feedback, represented as the `Files` collection used by the editor.

## Permissions

The feedback administrator role is `feedbackAdmin`, with the derived `canManageFeedback` capability.

Users can read the Feedback they submitted. `feedbackAdmin` can:

* View Feedback lists and details
* Open its Project Snapshot in the editor
* Reply to Feedback in the `new` state
* Mark Feedback in the `new` state as `handled`

`authorizationAdmin` can assign the `feedbackAdmin` role.

## Core Mechanisms

### Submission and Capture

Users open the Feedback form from the profile menu, enter a Title and Description, and submit the Feedback.

The form indicates progress while Feedback is being submitted. If submission fails, the form keeps the entered content and provides an action to try again.

### Copilot Assistance

When a user asks to submit Feedback or accepts Copilot's suggestion, Copilot can prepare a Title and Description draft. After the user confirms opening the Feedback form, they can review the draft, decide whether to share Context, and submit the Feedback.

### Feedback for AI Feature and Quota Issues

Copilot, Costume Generation, and Animation Generation each present messages for their corresponding feature and quota issues. A message can provide an action that opens the Feedback form, with Source identifying the affected feature and entry point.

### Viewing a Project Snapshot

From Feedback details, an administrator can open the Project Snapshot through the editor's reusable local project-loading capability. The editor loads the captured `Files` into a local session where the administrator can inspect and run the project as it was when the Feedback was submitted.

### Processing Feedback

When administrators process the same Feedback in the `new` state concurrently, the first successful action determines its terminal state, and the other administrators see the resulting state.

### Reply and Notification

After an administrator successfully sends a Reply, Feedback enters the `replied` state and creates an [In-Product Notification](./in-product-notification.md) for the submitting user. If sending the Reply fails, the draft remains available and the administrator can try again.

## User Story

### Submitting Feedback

A user opens the Feedback form from the profile menu, after asking Copilot to prepare a draft, or from an AI feature or quota message. The user reviews the Title and Description, chooses whether to share Context, and submits the Feedback. A successful submission creates a Feedback item in `new`; if submission fails, the form keeps the entered content so the user can try again.

### Processing Feedback

A `feedbackAdmin` opens a Feedback item in `new` and uses its Title, Description, and available Context to investigate the problem. The administrator can open the Project Snapshot in a local editor session, then send a Reply or mark the Feedback as `handled`. A successful Reply moves the Feedback to `replied` and creates an In-Product Notification for the submitting user. If sending the Reply fails, the draft remains available for another attempt. If another administrator completes the Feedback first, the interface shows the resulting terminal state.
