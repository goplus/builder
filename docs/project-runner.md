# Project runner

# Module Overview

This module is part of the compiler implementation for an online editor. This document investigates the existing ecosystem tools of Spx and organizes the technical challenges and feasible solutions for implementing online compilation.

# GitHub Repository
- https://github.com/goplus/spx
- https://github.com/goplus/gop
- https://github.com/goplus/ispx
- https://github.com/goplus/igop

# Client-Side vs. Server-Side Compilation Comparison

## Client-Side Compilation

**Advantages:**

1. Immediate Compilation and Execution: Users can compile and run code immediately in the same environment, enhancing user experience.
2. Reduced Server Load: Compilation occurs on the user's device, not occupying server resources.
3. Offline Capability: The application can operate offline without needing to interact with the server.
4. Real-time Feedback: Users can see the results of code changes instantly, aiding in learning and debugging.

**Disadvantages:**

1. Performance Limitations: Client-side devices might not perform as well as servers, especially for complex compilation tasks.
2. Security Concerns: Exposing the compiler to the client may pose security risks.
3. Compatibility and Consistency: Different devices and browsers among users may lead to variations in compilation behavior.
4. Increased Frontend Complexity: Implementing file assembly, reading, and compilation functions on the frontend is required.

## Server-Side Compilation

**Advantages:**

1. Unified Compilation Environment: The server provides a consistent compilation environment, ensuring uniformity in compilation results.
2. Powerful Processing Capability: Servers typically have more computing power than clients, suitable for complex compilation tasks.
3. Enhanced Security: Compilation on the server reduces security risks on the client side.
4. Convenient File Management: Servers are better suited for file storage and management.

**Disadvantages:**

1. Response Time: Uploading files from the client to the server and sending back compilation results may cause delays.
2. Server Load: All compilation tasks occurring on the server can increase its load.
3. Network Dependency: Continuous network connection is required for file transfer and receiving compilation results.
4. Lack of Immediate Feedback: Users may not see the effects of their changes right away, affecting the experience.

## Summary

### **Supported**

> Client-side compilation has unique advantages

| Feature                 | network dependency | response speed | real time feedback |
| ----------------------- | ------------------ | -------------- | ------------------ |
| Client compilation      | no                 | fast           | yes                |
| Server side compilation | yes                | slow           | no                 |

# Front-End Storage Solutions Research

## Existing Web Storage Technologies
| Technology             | Capacity Limit                                  | Data Persistence                                  | Access Speed                                      | Sync/Async   | Security                                       | Use Cases                                   |
|------------------------|-------------------------------------------------|---------------------------------------------------|---------------------------------------------------|--------------|------------------------------------------------|---------------------------------------------|
| LocalStorage           | 5MB per domain                                  | Persistent until browser cache is cleared         | Usually fast                                      | Synchronous  | Not suitable for sensitive data               | Storing small amounts of non-sensitive data |
| SessionStorage         | 5MB per domain                                  | Persistent only during browser session            | Usually fast                                      | Synchronous  | Not suitable for sensitive data               | Storing small amounts of non-sensitive data |
| Cookies                | 4KB per domain                                  | Expirable, but can be cleared by user             | Fast, but sent with every HTTP request            | Synchronous  | Can be set to HTTPS only to enhance security | Storing small pieces of data like user authentication |
| IndexedDB              | Several hundred MB or more, depending on user's browser and disk space | Persistent storage                               | Fast, but can be slower due to asynchronicity     | Asynchronous | Not suitable for sensitive data               | Storing large amounts or structured text data |
| Cache API              | Depends on user's disk space                    | Persistent, but can be cleared by user            | Depends on data size and disk speed               | Asynchronous | Not suitable for sensitive data               | Caching requests and supporting offline content |
| File System Access API | Depends on user's disk space                    | Persistent, but can be cleared by user            | Depends on data size and disk speed               | Asynchronous | Provides more direct file access, but requires user permission | Applications that interact with user's local files |

## Compare three technologies based on different perspectives
| Perspectives                | IndexedDB                                                   | File System Access API                                          | Cache API                                            |
|-----------------------------|------------------------------------------------------------|----------------------------------------------------------------|-----------------------------------------------------|
| Basic Compatibility         | Supported by all mainstream browsers, but implementation details may vary | Mainly supported by Chrome, lower or no support in Firefox, Safari, and Edge | Part of Service Workers, well supported in mainstream browsers |
| Performance and Limitations | Performance and database size limits vary by browser       | Usage may be limited, especially for security and privacy reasons | Storage policies and limitations may slightly differ |
| Mobile Device Compatibility | Well supported on mobile versions of Chrome and Firefox, potential issues with Safari | Mainly supported on Chrome, other browsers offer lower or no support | Generally well-supported on mobile browsers         |
| Data Synchronization        | Requires custom sync logic with the server; suitable for complex data structures | Sync is more complex, often manual; interacts directly with local files | Mainly used for resource caching, not designed specifically for data sync |
| Offline Support             | Excellent for offline data storage; supports large and structured data | Direct read and write to local files; very suitable for offline operations | Key component for offline access in PWAs; caches network requests and responses |
| Storage Space Management    | Large storage capacity, decided by the browser; monitoring needed to avoid exceeding limits | Depends on the user's local file system; potentially very large, but management is complex | Managed by the browser's caching mechanisms; constrained by browser cache limits |
| User Prompt                 | Usually no user prompt required, operates silently in the background | Explicit user permission needed to access files; requires direct and ongoing user interaction | No user prompt needed for caching storage; operates silently in the background |
| User Interface              | Operates in the background; does not directly affect the user interface | Requires direct user interaction, such as file selectors and other UI elements | Invisible to the user; operates silently in the background |
| Experience Design           | Indirectly impacts user experience; very useful for complex data processing within apps | Significantly affects user experience; user permission prompts and file management are core aspects | Improves user experience by speeding up load times and providing offline content access |
## Summary

### **Supported**

The following web API was chosen to support a generic browser FileSystem.

| Feature                                                                     | Firefox | Chrome | Edge | Safari | IE |
| --------------------------------------------------------------------------- | ------- | ------ | ---- | ------ | -- |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | yes     | yes    | yes  | yes    | no |

### **Rejected**

The following APIs were all considered in choosing a backend to support

| Rejected APIs                                                                            | Reason                 |
| ---------------------------------------------------------------------------------------- | ---------------------- |
| [LocalStorage](https://developer.mozilla.org/en/docs/Web/API/Window/localStorage)        | Limited storage        |
| [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | Limited storage        |
| [Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)                     | Limited storage        |
| [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)                      | Requires a request URL |
| [File System Access API](https://web.dev/file-system-access/)                            | Chromium only          |

# participants

[a-linye](https://github.com/a-linye), [motongxue](https://github.com/motongxue).
