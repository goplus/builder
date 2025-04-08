# Builder Wizard 

the Builder Wizard uses a variety of interactive, follow-up guides to guide new users with zero programming Foundation to quickly get started with Builder products and Go + languages by designing an interesting, functional and storytelling game project. After the user completes this wizard, you can get a small game, can play freely on it and publish to the community. 

Wizard is an entry-level course that teaches Go + basic grammar and a quick get started with Go + Builder. In fact, the product design of the wizard part has high scalability. This design can be adopted for all kinds of project-based and task-based courses in the future, that is, multiple story lines can be introduced to enrich the Builder's curriculum system in the future. We will also develop an efficiency tool for developing Builder courses in the future to facilitate curriculum designers to create excellent courses. 

Go + Builder uses text programming to develop games, which is very different from building block programming. In the whole wizard process, most of the tasks that users need to complete are to write Go + code. At the same time, in order to reduce the mental burden of users with zero programming Foundation, Builder Wizard takes watching video + code cloze as the main guiding method. In addition, there will also be a UI guide to help users get started with the Builder's IDE. 

# Basic Concepts 

## Story Line 

the Builder Wizard introduces the concept of story line. A story plot is used as the main line (Niu Xiaqi saves the princess) throughout the Wizard. After completing the Wizard, users can get a small game with story line. 

The whole story line is divided into multiple levels, which are embodied as a list of levels on UI and displayed in the form of maps (Castle, warrior cow small seven road map, etc.): 

+ there is a strict sequence between the levels. Only after the previous level is completed can the next level be unlocked.
+ Complete the designated level to obtain the corresponding achievement: the achievement here is not the achievement in the sense of the global user, but the achievement under this wizard, but it still needs to be bound with the user, such as "flower protector Niu Xiaoqi", "Hero Niu Xiaoqi", "Dragon Slayer soldier Niu Xiaoqi", etc. 
+ Complete the specified checkpoint and obtain the specified limited materials (linked with the material Library): During the process of completing the Wizard, the user will add various materials (Wizard materials, sound materials, scene materials, etc.). The exquisite materials needed are provided by us. After the user completes a certain checkpoint, the materials used by the checkpoint will be sent to the user free of charge, and the user can use them in his own material library in the future, add it to your own Builder project. 

When A user enters A story line for the first time, he or she creates A Project under the story line (assuming it is called A, and basic information is provided by default). Different story lines are independent. A story line corresponds to an A, and basic information such as Name and Description of the is constructed using the information corresponding to the story line. The Project opened by the user after entering the level (including the completed level and the uncompleted level) is A. 

When the user completes the last level, the user can choose to create a Project (suppose it is called B),B will contain the complete Project content of the entire story line, and the user can freely play on B later. You can complete the same story line multiple times (in fact, you can complete the last level of a story line multiple times). After completing the last level of the story line, you can name your own Project and choose whether to create Project B.

The Project A constructed when the user enters A story line for the first time is saved to the cloud. This A is not an ordinary Project under the user account. The difference from ordinary Project is that A is not displayed in the user's Project list, but B is an ordinary Project under the user account (that is, additional information needs to be introduced into the existing Project to mark whether it is "ordinary". "Normal" is displayed in the user's project list, and "Special" is not displayed in the user's project list). 

## Level 

the level is the specific display form of the story line and is an independent operation task in the story line. There is a strong logical sequence between each level (to ensure the coherence of the story line and the gradual progress of programming knowledge, from shallow to deep). 

The user clicks to enter A level to open the user's Project A below the story line (all the user's operations (writing code and adding material) in this level will be automatically saved to cloud Project A), and then the level introduction of this level will pop up to introduce the tasks to be completed (the titles of each node task of this level will be presented in the form of A list). After the user clicks "start, start to enter each node task in turn and watch the video to complete the steps, namely: 

+ A checkpoint has multiple node tasks, and the node tasks have a strict sequence. Users can enter the next node task only after completing the node task. 
+ A node task has a video, and the step can be completed only after watching the video. 
+ A node task has one or more steps. You can complete the node task after completing all the steps. When all node tasks are completed, this level will unlock the next level.

The progress bar of the video watched by the user is not allowed to drag and drop, only to pause, and when the user is watching the video, the user should be prohibited from changing the current Builder project, and only when the user enters the step can the Builder project be changed in our open area. The user can also skip the currently viewed video and go straight to the first step. 

A level provides only the spx API required by the level: 

+ consider this: 
  - simplify the implementation and eliminate the use of UI highlighting to guide users to click the API. 
  - The entire spx API area and code editing area can be opened to users, User operations are closer to the actual development 
  - only provide what is needed, reducing the mental burden of the API required for users to query. 
  - Which API will be used in the coding step, and the content under this step will clearly indicate 

this behavior of "hiding" the original editor list is also reflected elsewhere in the Wizard: 

+ hide the wizard material list in IDE 
+ hiding sound material list in IDE 
+ hiding of stage background material list in IDE 
+ hide the list of sprite animations in IDE (shape + bone animation) 
+ hiding of control list in IDE 
+ hide material list in material Library 

## Steps 

A step is the minimum unit for a user to complete an operation. It is divided into a Coding step and a follow-up step (other steps can also be extended later). 

### Coding Steps

The open code editing area and the spx API area allow users to write code. You need to locate the location of the code editing area and highlight it (other areas are masked to prohibit user operations). In order to reduce the difficulty of users as much as possible, the "cloze" method is used. 

Cloze: The Coding step needs to store an initial snapshot of the step and an end snapshot of the step (both are only the Game (Game content) of the Project): 

+ some of the code in the snapshot at the end of the step is the answer code, that is, the code that you need to add in this step. 
+ The part corresponding to the answer code in the initial snapshot of the step is the to-be-completed code (Template code) that has been dug up. At the beginning of this step, Builder will reload the initial snapshot of the step to replace the current Game content of the editor. The user can complete the step by completing the provided template code and detecting it. 

The Coding step provides the following interactive options: 

+ code detection: After the user clicks the code detection, the current snapshot of the editor will be compared with the snapshot at the end of the step (formatted string comparison). After passing the comparison, it is counted as passing the test. If the comparison is not passed, the back-end interface is called to compare with the large model. 
+ View Answer: View Answer Code 
+ view content step details: contains guidance for this step 

### Following Steps 

mainly by means of UI guide, guide the user to follow the operation. 

Possible scenarios for following steps: 

+ guide the user to switch to code editing for a specified Sprite or stage 
+ guide the user to the stage (add background, add controls)
+ Guide the user to add a sound 
+ guide the user to add a wizard 
+ guide the user graphical operation Wizard 
+ guide the user to add sprite animation (SHAPE group animation and skeleton animation) 
+ guide the user to run the project 

UI guidance guides users to complete follow-up operations through various means in the guidance: 

+ UI Highlight 
+ arrow Guidance 
+ graphic presentation 
+ elf Material Chart 
+ layer (Restrict user actions) 

granularity of follow-up steps: An operation that adds a sprite should actually be divided into at least four follow-up steps: 

+ guide the user to click the Add wizard button (+ sign) 
+ guide the user to click "Select from material Library" 
+ guide the user to click on the specified wizard material 
+ guide the user to click the confirmation button 

according to the above "granularity", it can be found that some follow-up steps will change the status of the Builder project, while others will not change. For those follow-up steps that will change the status of the Builder project, the changed status needs to be detected to determine whether the user can pass the step, that is, a step end snapshot needs to be stored for snapshot comparison (formatted string comparison).