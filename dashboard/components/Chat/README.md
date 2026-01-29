# Chat Components

KI-Chat-Integration für autonome Workflow-Korrektur im SIN-Solver Dashboard.

## Komponenten

### ChatSidebar
Hauptkomponente - Collapsible Sidebar (300px) mit:
- Message History
- Quick Actions
- Header mit Status-Indikator
- Mobile Overlay Support

### ChatMessage
Einzelne Nachricht mit Typen:
- **User** (blau, rechts)
- **AI** (grau, links)
- **System** (gelb, zentriert)
- **Action** (mit Buttons)

### ChatInput
Input-Feld mit:
- Command-Autocomplete (/workflow, /status, /help)
- Keyboard Navigation
- Character Counter

### useChat
Hook für Chat-Logik:
- Message State Management
- Command Handling
- Auto-scroll
- Action Handler

## Verwendung

```jsx
import ChatSidebar from './components/Chat/ChatSidebar';

function Dashboard() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex">
      <main className="flex-1">...</main>
      <ChatSidebar isOpen={chatOpen} onToggle={setChatOpen} />
    </div>
  );
}
```

## Demo

Siehe `/pages/chat-demo.js` für vollständige Integration.

## Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `/workflow` | Zeigt aktive Workflows |
| `/status` | Zeigt System-Status |
| `/help` | Zeigt Hilfe |

## Autonomer Korrektur-Flow

1. Workflow wird ausgeführt
2. Fehler tritt auf
3. System erkennt Fehler
4. Chat zeigt: "Workflow X hat Fehler Y"
5. User klickt: "Autonom korrigieren"
6. KI analysiert und korrigiert
7. Chat zeigt: "Korrigiert! Neue Version: Z"
8. User klickt: "Deploy"
