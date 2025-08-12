# MultiVideo

MultiVideo is a desktop application designed for simultaneous playback of multiple videos across multiple displays. It allows users to map video files to specific screens and control the playback, with advanced features for creating synchronized video walls.

This project is built with [Electron](https://www.electronjs.org/).

## Current Features

- **Screen Detection:** Automatically detects all connected displays and their properties (resolution, position, scaling).
- **Screen Identification:** Provides a visual overlay to easily identify physical screens.
- **Video Assignment:** Allows assigning a local video file to each detected screen through a graphical interface.
- **Kiosk Playback:** Launches videos in borderless, fullscreen windows on their assigned displays.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    You'll need [Node.js](https://nodejs.org/) installed. Then, run the following command in the project root:
    ```bash
    npm install
    ```

## How to Run

To start the application, run the following command from the project's root directory:

```bash
npm start
```

This will launch the main configuration window, where you can assign videos to your displays.
