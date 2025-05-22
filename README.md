# DevOps Task Manager

An AI-powered CLI tool for managing DevOps tasks using natural language processing.

## Features

- Natural language interface for managing DevOps tasks
- Support for Epics, Features, User Stories, Tasks, and Bugs
- Microsoft Authentication Library (MSAL) integration
- Azure DevOps API integration
- Anthropic AI for natural language understanding
- Interactive command-line interface

## Installation

```bash
npm install -g devops-task-manager
```

## Usage

### Authentication

```bash
devopsagent login
```

This will open a browser window for Microsoft authentication.

### Project Selection

```bash
devopsagent project
```

Select or view the current project.

### Interactive Chat

```bash
devopsagent chat
```

Enter interactive chat mode to manage tasks using natural language.

## Development

### Prerequisites

- Node.js 16+
- npm 7+

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/devops-task-manager.git
cd devops-task-manager
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Development Commands

- `npm run dev` - Run in development mode
- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code

## Project Structure

```
/src
├── commands/          # Command implementations
├── operations/        # Core operations
├── intent/           # Intent handling
├── services/         # Core services
├── models/           # Data models
├── utils/            # Utility functions
├── cli/              # CLI-specific code
└── config/           # Configuration
```

## License

MIT 