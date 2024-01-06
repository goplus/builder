# Project Load and Save

# Project Import

## Scratch Analysis

### Page Features

![](static/EeslbhYgyoZ8y0xpg0wcIf8Znbg.png)

## Github

### [Go-github](https://github.com/google/go-github)

- Applicable Scenarios: If your main goal is to interact with GitHub through GitHub's REST API without needing to perform low-level Git operations, then go-github is an excellent choice. It is suitable for common GitHub operations such as retrieving information from GitHub, downloading files, managing issues, and pull requests.
- User Authorization: Guide users through GitHub authentication to obtain an authorization token.
- Retrieve Repository List: Use the GitHub API and authorization token to retrieve the user's repository list and display it in the front-end interface for user selection.
- Retrieve File Content: Get the content of files from the repository selected by the user using the GitHub API.
- Save to Project: Save the retrieved file content to the project.

### [Go-git](https://github.com/src-d/go-git)

- Applicable Scenarios: For more low-level operations on Git repositories, or if you want more advanced control over handling Git objects and version control, then go-git is a great choice. It is suitable for situations that require more Git operations, not just exporting projects from GitHub.

# File Import and Front-End Storage

| Feature/Library       | [Dexie.js(10.3k)](https://github.com/dexie/Dexie.js)                 | [localForage(23.7k)](https://github.com/localForage/localForage)             | [PouchDB(16.1k)](https://github.com/pouchdb/pouchdb)              |
|-----------------------|--------------------------------------------------------------------|-----------------------------------------------------------------------------|------------------------------------------------------------------|
| **Main Features**     | Powerful, Promise-based IndexedDB wrapper                          | Simplified, localStorage-like interface                                     | Database that can run in browsers and servers                    |
| **API Style**         | Promise-based                                                      | localStorage-like API, based on callbacks or Promises                       | Promise-based, similar to CouchDB style                          |
| **Ease of Use**       | High (clear and concise API)                                       | High (simple API, easy to use)                                              | Medium to High (feature-rich but requires more learning)         |
| **Data Structure**    | Custom, flexible                                                   | Key-value storage                                                           | Document storage, suitable for complex data structures           |
| **Sync Functionality**| None (local storage only)                                          | None (local storage only)                                                   | Supports syncing with other PouchDB or CouchDB instances         |
| **Applicable Scenarios** | Applications requiring complex queries and high performance         | Simple applications needing local key-value storage                        | Applications requiring offline data sync and replication         |
| **Browser Support**   | Widely supported                                                   | Widely supported                                                           | Widely supported                                                |
| **Data Capacity**     | Limited by the browser                                             | Limited by the browser                                                      | Limited by the browser                                          |
| **Performance**       | High                                                               | Medium                                                                     | High, especially in terms of data syncing                        |
| **Community Support and Documentation** | Good                                                 | Good                                                                       | Good                                                            |
| **Special Advantages**| Powerful query capabilities and flexible data structure            | Simple to use, no need to understand complex IndexedDB                     | Strong sync functionality and complex data structure handling    |

# Front-End Zip Package Upload, Decompression, and Storage to IndexedDB

| Feature/Library       | JSZip                                                     | zip.js                                                   |
|-----------------------|-----------------------------------------------------------|---------------------------------------------------------|
| **Introduction**      | Library for creating, reading, and editing ZIP files      | Library for handling ZIP files on the client-side       |
| **Ease of Use**       | Easy to use, with clear documentation and wide community support | API is more complex, steep learning curve               |
| **Performance**       | Efficient for small to medium-sized files                 | Supports multithreading, more efficient for large files |
| **Functionality**     | Supports compression, decompression, editing, and other operations | Mainly focused on compression and decompression         |
| **File Size Handling Capability** | Larger files may cause performance issues                 | More suitable for handling large files                  |
| **Compatibility**     | Works well in all modern browsers                          | Works well in most modern browsers                      |
| **Asynchronous Processing** | Supports Promises, enabling asynchronous operations        | Supports Web Workers, optimizing asynchronous processing |
| **Community Support and Documentation** | Extensive community support and comprehensive documentation | Documentation is relatively less complete               |
| **Usage Scenarios**   | Suitable for most standard front-end ZIP file processing needs | Suitable for high-performance needs of large ZIP file processing |

## Recommended Solution

- File Upload: Combine HTML5 File API and Drag-and-Drop API to implement flexible upload functionality.
- Zip Package Processing: Opt for **JSZip**, considering its ease of use and sufficient functionality for most needs.
- Storing Decompressed Files: Use IndexedDB, considering its support in modern browsers and large storage capacity.
