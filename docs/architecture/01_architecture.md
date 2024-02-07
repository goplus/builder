# STEM Education Architecture

## Architecture Overview

STEM EDU is a comprehensive online platform dedicated to enhancing children's programming education through interactive and engaging tools. The architecture encompasses a variety of modules, each designed to contribute to a holistic educational experience. These modules integrate to form a cohesive system that facilitates the creation, modification, and deployment of programming projects within an educational context.

## Module Boundaries

1. **Asset Library**: 
   - Description: Serves as the repository for assets, from which users can import assets into their projects.
   - Interfaces: Includes user login interface (input username and password, output login result and user information), user logout interface (input user information, output logout result), etc.
   - Behavior: Processes user login and logout requests, validates user information, maintains user login status, etc.

- **Sprite PropEdit**: Enables editing of SPX sprite properties, allowing for customization and configuration.
- **Stage Editor**: A visual editing tool for real-time modification and rendering of sprites within a stage-like environment.
- **Code Editor**: Provides an environment for writing and editing SPX code, with syntax highlighting and error detection.
- **Code Toolbox**: Offers a collection of code snippets and shortcuts for quick insertion and manipulation of SPX code.
- **FileManage**: Manages project files, allowing for organization, import, and export of project elements.
- **Account**: Manages user authentication, including login and logout functionalities.
- **Sounds Edit**: Facilitates the editing of sound assets, providing tools for audio manipulation.
- **Project Runner**: Utilizes WebAssembly (WASM) to compile SPX projects, enabling online execution and testing of student code.
- **I/O**: Manages input/output operations for projects, including loading, saving, and exporting project data.
- **Global**: Implements internationalization features for language support, catering to a global user base.

## Module Interaction

Each module within the STEM EDU architecture is designed to interact seamlessly with one another, establishing a network of functionality that supports the platform's educational objectives.

- **Stage Editor and Sprite PropEdit**: The Stage Editor collaborates with Sprite PropEdit to reflect changes in sprite properties within the visual stage.
- **Code Editor and Code Toolbox**: The Code Editor module utilizes the Code Toolbox to enhance the code writing experience with easily accessible coding constructs.
- **FileManage and I/O**: FileManage works closely with the I/O module to handle file operations, ensuring that project data is accurately loaded, saved, and exported.
- **Account and Global**: The Account module integrates with Global to provide a localized authentication experience for users from different linguistic backgrounds.

## Architecture Design

Community is a web application based on `yap`, the interaction of each module is as follows:

pics

## Module List

updating...
- assetList
- assetLibrary
