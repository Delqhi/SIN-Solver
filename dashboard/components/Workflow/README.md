# Workflow Modal Component

AI-powered workflow creation modal for the SIN-Solver Dashboard.

## Overview

The Workflow Modal allows users to create n8n workflows using natural language descriptions. The component guides users through a 3-step process:

1. **Input** - Describe the workflow in natural language
2. **Review** - Preview the generated workflow structure
3. **Deploy** - Deploy to n8n with one click

## Components

### WorkflowModal.js
Main container component managing state and navigation between steps.

**Props:**
- `isOpen` (boolean) - Controls modal visibility
- `onClose` (function) - Callback when modal closes

**State:**
- `currentStep` (1|2|3) - Current step in the workflow
- `prompt` (string) - User's workflow description
- `generatedWorkflow` (object) - AI-generated workflow data
- `isLoading` (boolean) - Loading state for async operations
- `error` (string|null) - Error message display
- `deployResult` (object|null) - Deployment result data

### WorkflowStep1.js
Input step with textarea and example prompts.

**Features:**
- Character counter with validation (min 10 chars)
- 3 example buttons with pre-filled prompts
- Visual validation feedback
- Loading state during generation

### WorkflowStep2.js
Review step showing generated workflow.

**Features:**
- Toggle between Visual and JSON view modes
- Interactive node cards with expandable details
- Copy JSON to clipboard
- Open in n8n for editing
- Regenerate workflow option

### WorkflowStep3.js
Success step after deployment.

**Features:**
- Animated success checkmark
- Workflow ID display
- n8n URL with copy/open actions
- Quick action buttons (Configure, Test Run)
- Create another workflow option

## Usage

### Basic Integration

```jsx
import { useState } from 'react';
import WorkflowModal from '../components/Workflow/WorkflowModal';

function MyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create Workflow
      </button>
      
      <WorkflowModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
```

### Integration with Dashboard

See `/dashboard/pages/workflow-demo.js` for a complete example page.

## API Integration

The modal currently uses mock data. To connect to a real API:

1. Update `handleGenerate` in WorkflowModal.js:
```javascript
const handleGenerate = useCallback(async (inputPrompt) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: inputPrompt })
    });
    
    if (!response.ok) throw new Error('Failed to generate');
    
    const data = await response.json();
    setGeneratedWorkflow(data.workflow);
    setCurrentStep(2);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

2. Update `handleDeploy` similarly for deployment.

## Design System

### Colors
- Primary: Orange-500 to Amber-600 gradient
- Success: Emerald-500
- Background: Slate-900 with Slate-800 cards
- Text: White (primary), Slate-400 (secondary)

### Animations
- Framer Motion for smooth transitions
- Staggered children animations
- Scale and opacity transitions
- Loading spinners

### Icons
- Lucide React icons
- Contextual icons for each step

## Styling

Components use Tailwind CSS with:
- Custom gradient utilities
- Glass morphism effects
- Responsive breakpoints (sm, md, lg)
- Dark mode by default

## File Structure

```
dashboard/components/Workflow/
├── WorkflowModal.js      # Main modal component
├── WorkflowStep1.js      # Input step
├── WorkflowStep2.js      # Review step
├── WorkflowStep3.js      # Deploy step
└── README.md             # This file
```

## Dependencies

- React 18+
- Next.js 14+
- Tailwind CSS
- Framer Motion
- Lucide React

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management
- Loading state announcements

## Future Enhancements

- [ ] Real API integration
- [ ] Workflow templates gallery
- [ ] History of created workflows
- [ ] Collaborative editing
- [ ] Workflow versioning
