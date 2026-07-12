<div align="center">
  <h1>🌟 GravityLaser</h1>
  <p><strong>Next-Generation Web-Based Laser Control & CAM Software</strong></p>

  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/frontend-React%20%7C%20TypeScript-61DAFB.svg" alt="Frontend" />
  <img src="https://img.shields.io/badge/backend-Python-3776AB.svg" alt="Backend" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
</div>

<hr />

## 🚀 Overview

**GravityLaser** is an advanced, fully-featured Laser CAM and Machine Control software designed to make working with laser engravers and cutters as intuitive and powerful as possible. 

Built with a modern web stack, it brings professional-grade tools right to your browser—from complex vector manipulations and image dithering to full machine telemetrics and multi-language support.

---

## ✨ Key Features

- **🎨 Advanced Workspace & Design Tools:**
  - Full vector editing and property manipulation.
  - Variable Text & Barcode generation (QR, DataMatrix, etc.).
  - Built-in Image Preparation (Dithering, Thresholding, Brightness/Contrast/Gamma adjustments).
- **📚 Intelligent Layer Management:**
  - Assign specific colors to laser parameters.
  - Multi-pass support, Kerf compensation, and Sub-Layers (Combo Mode).
  - Built-in Material Library for quick cutting/engraving presets.
- **🕹️ Direct Machine Control:**
  - Full control over your laser via the intuitive UI.
  - Jogging, Homing, Origin setting, and direct G-Code execution.
  - Persistent Job Panel for real-time progress tracking.
- **🌍 Full Internationalization (i18n):**
  - Seamless switching between English, German, and more.
- **⚡ Modern Tech Stack:**
  - Blazing fast Frontend with React and Vite.
  - Robust Python Backend for secure and fast hardware communication.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** CSS3 / Variables (Custom Themes)
- **State Management:** Zustand / Context
- **i18n:** `react-i18next`

### Backend
- **Core:** Python 3.x
- **API Framework:** FastAPI
- **Hardware Integration:** Serial / WebSocket communication for realtime G-Code streaming.

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thomastrumpp/gravitylaser.git
   cd gravitylaser
   ```

2. **Start the Backend:**
   ```bash
   cd backend
   uv sync
   # Start the server
   uv run main.py
   ```

3. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open in your Browser:**
   Navigate to `http://localhost:5173` to launch the GravityLaser interface.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to help improve GravityLaser, please fork the repository and create a pull request with your changes. For major changes, please open an issue first to discuss what you would like to change.

---

<div align="center">
  <p>Built with ❤️ by Thomas Trumpp and Contributors</p>
</div>
