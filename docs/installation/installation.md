# Installation

## STEM EDUCATION

STEM EDU is an online educational platform for children's programming, designed to offer an interactive learning experience.

## How to Run

### 1. Installation

Before you begin, ensure that you have both **Go** and **Node.js** environments set up on your local machine.

#### Frontend Setup

a. Clone the repository to your local machine:

```bash
git clone https://github.com/goplus/builder.git
cd spx-gui
```

b. Inside the `spx-gui` directory, install the project dependencies using npm:

```bash
npm install
```

### 2. Offline SPX Config

In this stage, we build the two WASM components required by the web app and copy them into the app's assets folder.

Inside the `spx-gui` directory，execute the script:

```
./build-wasm.sh
```

### 3. Getting Started

#### Running the Frontend

Once all dependencies are installed, you can run the project locally:

i) Open a Command Prompt or Terminal in the `spx-gui` directory.

ii) Start the development server:

```bash
## in spx-gui folder
npm run dev
```

iii) Access the application at [http://localhost:5173/](http://localhost:5173/).

#### Backend Setup and Launch

i) Navigate to the backend directory:

```bash
cd spx-backend
cd cmd
```

ii) Run the Go scripts:

```bash
go mod tidy
gop run .
```

### 4. Quick Play

Import the zip(04-Bullet.zip in builder/tools/04-Bullet.zip)in the top button 'Import - upload', and click the run button in the stage, then wait for a few seconds.

## Deploy

### Frontend

In `spx-gui`, build the project with `npx vite build`, then run docker build. You will get a nginx docker image with the built project files. Run the nginx image and it will listen on port 80.

### Backend

TODO .

## **API Documentation**

(Include any relevant API documentation or references here.)

[STEM EDU API DOC](https://lbul0aws0j.feishu.cn/docx/BpEQdCvwZoXw3TxBsgIc6F7Dnqh?from=from_copylink)

