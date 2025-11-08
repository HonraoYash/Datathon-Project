# Agentic Chatbot Frontend

Modern React frontend for the Agentic Chatbot system.

## Features

- 🎨 ChatGPT-like interface
- 💬 Real-time streaming chat
- 📝 Conversation management
- 🤖 Agent selection
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # React components
│   ├── Sidebar.jsx
│   └── ChatInterface.jsx
├── pages/          # Page components
├── services/       # API and storage utilities
│   ├── api.js
│   └── conversationStorage.js
├── App.jsx         # Main app component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Features in Development

- [ ] Create Agent tab
- [ ] Create Tool tab
- [ ] Conversation deletion
- [ ] Message editing
- [ ] Export conversations



