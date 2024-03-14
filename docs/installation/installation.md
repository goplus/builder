# Installation

## STEM EDUCATION

STEM EDU is an online educational platform for children's programming, designed to offer an interactive learning experience.

## How to Run

### Docker

````bash
# Build the all-in-one image
docker build -t spx .
# Assuming you have a .env file in pwd,
# which contains the environment variables for backend
docker run -v $(pwd)/.env:/app/.env spx
````

### Step by Step

#### Frontend

Before you begin, ensure that you have both **Go** and **Node.js** environments set up on your local machine.

##### Frontend Setup

Clone the repository and install.

```bash
git clone https://github.com/goplus/builder.git
cd spx-gui
npm install
```

#####  Offline SPX Config

In this stage, we build the two WASM components required by the web app and copy them into the app's assets folder.

```bash
## in spx-gui folder
./build-wasm.sh
```

##### Build/Running the project

```bash
## in spx-gui folder
# Build the project
npm run build

# Or, run the project in development mode
npm run dev
```

#### Backend 

```bash
cd spx-backend/cmd
# Assuming you have Go & Go+ installed
gop build -o spx-backend .

# Run the server, assuming you have a .env file in pwd
./spx-backend
```

### 4. Quick Play

Import the zip(04-Bullet.zip in builder/tools/04-Bullet.zip)in the top button 'Import - upload', and click the run button in the stage, then wait for a few seconds.

## API Documentation

[api doc](../api-doc/api-document.md).
