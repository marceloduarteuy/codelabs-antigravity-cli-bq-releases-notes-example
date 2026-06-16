# ⚡ BigQuery Release Notes Explorer & X Share Portal

A premium, modern web portal designed to monitor, search, and share official Google Cloud BigQuery release notes. Built using a lightweight **Python Flask** backend and high-fidelity **Vanilla HTML, CSS, and JS** with a sleek cyber-dark aesthetic.

---

## ✨ Features

* **Granular Release Splitting**: Unlike generic RSS readers, this portal extracts daily releases and parses them into separate, color-coded updates (e.g., *Feature*, *Changed*, *Fixed*, *Issue*, *Deprecated*).
* **Interactive Live Caching**: Integrates a lightweight in-memory cache to ensure fast page loads, combined with a rotating refresh button that pulls fresh, real-time data from Google's Atom feed on demand.
* **Smart Twitter/X Share Integration**: Select any single release detail and open the **Interactive Tweet Composer**.
  * Choose between **3 custom styling templates** (*Standard*, *Hype*, and *Dev Alert*).
  * Auto-tracks characters against the **280-character limit**.
  * Intelligently **truncates long content** to fit the text limit while preserving links, hashtags, and template structures.
* **Premium Theme & Responsiveness**: Features a gorgeous dark theme with customized glowing backgrounds, beautiful transitions, stats counters, and responsive UI for mobile devices.

---

## 🛠️ Technology Stack

* **Backend**: Python 3, Flask, XML ElementTree Parser
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Properties & Keyframe Animations), Vanilla JavaScript (ES6)
* **Icons**: FontAwesome 6

---

## 📁 Project Directory Structure

```text
bq-releases-notes/
├── app.py                 # Flask server, Atom RSS feed fetching & XML splitting engine
├── templates/
│   └── index.html         # Main dashboard layout and Tweet Composer Modal structure
├── static/
│   ├── css/
│   │   └── styles.css     # Premium dark-mode cyber design system and animations
│   └── js/
│       └── app.js         # AJAX fetch, search/filtering logic, state, and composer actions
├── .gitignore             # Git ignore patterns for Python, venv, and OS metadata
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

* Python 3.8+ installed on your local machine.

### Installation & Setup

1. **Clone the repository** (or navigate to the workspace directory):
   ```bash
   cd bq-releases-notes
   ```

2. **Initialize a virtual environment**:
   ```bash
   python3 -m venv venv
   ```

3. **Activate the environment**:
   * On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   * On Windows:
     ```cmd
     venv\Scripts\activate
     ```

4. **Install Flask and dependencies**:
   ```bash
   pip install flask requests
   ```

### Running the Application

Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to:
🔗 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 📝 Design Decisions

* **ElementTree Native Parsing**: Avoids heavy third-party feed-parsing packages by utilizing Python's built-in `xml.etree.ElementTree` parser with custom XML namespace configurations for light footprint deployment.
* **Regex HTML Splitting**: Scans and splits on daily `<h3>` headers to isolate individual release highlights, ensuring clean itemization of content.
* **No-Build Frontend**: Built without heavy bundlers or frontend frameworks (React/Vue/Tailwind), ensuring near-instant loading times and standard browser compliance.
