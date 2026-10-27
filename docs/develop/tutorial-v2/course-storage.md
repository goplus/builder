# Course storage

## Goals

A Course is persisted as metadata plus an opaque content document. In particular, a Playground Course is an XGo Tutorial project whose internal directory structure, configuration and assets will become more complex and evolve independently of the database schema.

The database therefore owns Course identity, ownership, kind and display metadata, but does not interpret or validate kind-specific content. The frontend and other consumers load that content into typed models and enforce the applicable content-format contract.

A Course Series contains courses of exactly one kind. This design does not introduce draft/published revisions, persisted runtime sessions or unfinished-course progress. A saved Course is immediately available for learning.

## Tables

### `course`

Stores both common fields and kind-specific content.

| Column       | Type          | Constraint                         |
| ------------ | ------------- | ---------------------------------- |
| `id`         | `bigint`      | Primary key                        |
| `created_at` | `timestamptz` | Not null                           |
| `updated_at` | `timestamptz` | Not null                           |
| `owner_id`   | `bigint`      | Not null, foreign key to `user.id` |
| `kind`       | `text`        | Not null, `guided` or `playground` |
| `title`      | `text`        | Not null                           |
| `thumbnail`  | `text`        | Not null, universal URL            |
| `content`    | `jsonb`       | Not null                           |

`kind` is immutable after creation. Current Course-listing paths filter by owner or resolve Course IDs from a Course Series, so they do not require a new `kind` index. Existing indexes, including the index on `owner_id`, remain unchanged.

For a Guided Course, `content` contains the Guided Course data exposed by `GuidedCourse.content` in the HTTP contract.

For a Playground Course, `content` is a `FileCollection`: a JSON object from file path to universal URL. The referenced files form the Tutorial project. Its directory layout and configuration schemas are owned by the Tutorial Class Framework contract and remain opaque to Course APIs and storage. Binary objects and file bodies remain in the existing file service and Kodo; PostgreSQL stores only the file-path-to-URL collection.

See the [example Tutorial Course project](./example-tutorial-course/) for a concrete directory before its paths are converted into a persisted `FileCollection`.

Keeping `content` opaque has these consequences:

- changes to the Tutorial project format do not require database migrations;
- the API can preserve and return evolved content formats without understanding them;
- consumers must apply the Tutorial Class Framework's format contract and construct their own typed models;
- relational constraints cannot enforce kind-specific content fields, so validation belongs at API/editor boundaries.

### `course_series`

The existing table keeps its metadata and ordered `course_ids` collection, with one added column:

| Column | Type   | Constraint                         |
| ------ | ------ | ---------------------------------- |
| `kind` | `text` | Not null, `guided` or `playground` |

Kind-filtered Course Series lists retain the existing default ordering by `order` and `id`. Add an index on `(kind, order, id)` for this new query path. Existing indexes, including `(owner_id, order, id)`, remain unchanged.

## Write transactions and invariants

Creating or updating a Course writes one `course` row. The API validates only the stable outer contract, including the immutable `kind` and that `content` is valid JSON of the expected top-level type. It does not project Course-content fields into columns or couple writes to a particular content-format version.

Creating or updating a Course Series follows the existing course-locking order:

1. Normalize, sort and deduplicate the requested Course IDs.
2. Lock the referenced `course` rows in ID order.
3. Verify that every Course exists.
4. Verify that every Course kind equals `course_series.kind`.
5. Lock the Course Series row when updating it.
6. Write `course_ids` and other Series fields.

This prevents a Course deletion or concurrent Series update from invalidating the kind check between validation and write.

## Migration from the current schema

All existing courses are Guided Courses, so migration can be deterministic:

1. Add `course.kind` as non-null with temporary default `guided`.
2. Add nullable `course.content`.
3. Backfill `content` from each row's existing `entrypoint` and `prompt`.
4. Make `content` non-null.
5. Add `course_series.kind` as non-null with temporary default `guided`.
6. Add the `course_series (kind, order, id)` index.
7. Remove `course.entrypoint` and `course.prompt` after the application reads Guided Course data from `content`.
8. Remove the temporary defaults if Course creation must always provide kind explicitly.

No Course IDs or Course Series ordering changes during migration.
