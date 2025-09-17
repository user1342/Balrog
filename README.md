# Balrog - Modern LLM Interface Wrapper

🐉 **Balrog** is a modern Flask-based web interface for LLM APIs with integrated safety model filtering using Llama Guard.

## Features

- 🛡️ **Safety First**: Every request and response is filtered through a safety model (Llama Guard)
- 🎨 **Modern UI**: Beautiful, responsive web interface with real-time chat
- 🔧 **Flexible API Support**: Works with OpenAI, Anthropic, and other compatible APIs
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- 🚀 **Easy Setup**: Simple CLI with comprehensive argument parsing
- 📊 **Health Monitoring**: Built-in health checks and status monitoring
- 💾 **Session Management**: Maintains conversation history during sessions
- 🔄 **Real-time Updates**: Live status indicators and notifications

## Quick Start

### Installation

1. **Clone or download** the project files
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Usage

Run Balrog with your API credentials:

```bash
python balrog.py \
  --api https://api.openai.com/v1 \
  --model gpt-3.5-turbo \
  --api-key your_openai_api_key \
  --safety-model meta-llama/Llama-Guard-7b \
  --port 5000
```

### Command Line Arguments

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `--api` | ✅ | LLM API base URL | `https://api.openai.com/v1` |
| `--model` | ✅ | Model name to use | `gpt-3.5-turbo`, `gpt-4`, `claude-3-sonnet-20240229` |
| `--api-key` | ✅ | API key for authentication | `sk-...` |
| `--safety-model` | ✅ | Safety model name | `meta-llama/Llama-Guard-7b` |
| `--port` | ❌ | Port to host on (default: 5000) | `8080` |
| `--debug` | ❌ | Enable debug mode | - |
| `--log-level` | ❌ | Set logging level | `DEBUG`, `INFO`, `WARNING`, `ERROR` |

## Configuration Examples

### OpenAI GPT-4
```bash
python balrog.py \
  --api https://api.openai.com/v1 \
  --model gpt-4 \
  --api-key sk-your_openai_key \
  --safety-model meta-llama/Llama-Guard-7b \
  --port 8080
```

### Anthropic Claude
```bash
python balrog.py \
  --api https://api.anthropic.com/v1 \
  --model claude-3-sonnet-20240229 \
  --api-key your_anthropic_key \
  --safety-model meta-llama/Llama-Guard-7b \
  --port 5000
```

### Local Model (Ollama)
```bash
python balrog.py \
  --api http://localhost:11434/v1 \
  --model llama2 \
  --api-key dummy_key \
  --safety-model meta-llama/Llama-Guard-7b \
  --port 3000
```

## Safety Model Integration

Balrog integrates with **Llama Guard** or compatible safety models to filter content:

### Input Filtering
- User messages are checked before being sent to the main LLM
- Unsafe content is blocked and classified
- User receives feedback about why content was filtered

### Output Filtering  
- LLM responses are checked before being shown to the user
- Unsafe responses are blocked and classified
- User is notified that the response was filtered

### Safety Model Setup

The safety model uses the same API endpoint and key as the main model. Popular configurations:

- **OpenAI with Llama Guard**: Use OpenAI API with `meta-llama/Llama-Guard-7b` (requires compatible provider)
- **Together AI**: Both main model and safety model through Together AI
- **Local**: Self-hosted models via Ollama or similar
- **Mixed Setup**: Main model from one provider, safety model available on same endpoint

### Supported Safety Models

- `meta-llama/Llama-Guard-7b` - Llama Guard 7B model
- `meta-llama/Llama-Guard-13b` - Llama Guard 13B model  
- `text-moderation-latest` - OpenAI's moderation model
- Custom safety models following the same interface

## Web Interface Features

### Modern Chat UI
- 💬 Real-time messaging interface
- 🎨 Beautiful gradient design with animations
- 📱 Fully responsive for mobile devices
- ⌨️ Keyboard shortcuts (`Ctrl+Enter` to send, `Ctrl+K` to focus input)

### Status Monitoring
- 🟢 Online/Offline status indicators
- ⏱️ Last activity timestamps
- 🏥 Health check functionality
- 📊 Real-time connection status

### Conversation Management
- 🗑️ Clear conversation history
- 💾 Session-based message persistence
- 📤 Export chat history (JSON format)
- 🔄 Auto-scroll to latest messages

### Notifications
- 🎯 Toast notifications for all actions
- ⚠️ Safety filter alerts
- ✅ Success/error status updates
- 🔔 Real-time feedback

## API Endpoints

Balrog provides several REST API endpoints:

### `POST /api/chat`
Send a chat message with safety filtering
```json
{
  "message": "Hello, how are you?"
}
```

**Response (Success)**:
```json
{
  "message": "I'm doing well, thank you for asking!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Filtered)**:
```json
{
  "error": "Content filtered by safety model",
  "classification": "Inappropriate content detected",
  "type": "input_filtered"
}
```

### `POST /api/clear`
Clear conversation history
```json
{
  "status": "cleared"
}
```

### `GET /api/health`
Check application health
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "model": "gpt-3.5-turbo"
}
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │    Flask App    │    │   Safety Model  │
│                 │    │                 │    │  (Llama Guard)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Modern UI     │◄──►│ • Route Handler │◄──►│ • Input Filter  │
│ • Real-time     │    │ • Session Mgmt  │    │ • Output Filter │
│ • Responsive    │    │ • Error Handling│    │ • Classification│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Main LLM API  │
                       │                 │
                       ├─────────────────┤
                       │ • OpenAI GPT    │
                       │ • Anthropic     │
                       │ • Local Models  │
                       │ • Safety Models │
                       └─────────────────┘
```

## Security Features

- 🛡️ **Input Validation**: All user inputs are validated and sanitized
- 🔐 **API Key Protection**: API keys are never exposed to the frontend
- 🚫 **Content Filtering**: Dual-layer safety filtering (input + output)
- 📝 **Logging**: Comprehensive logging for security monitoring
- 🌐 **CORS Protection**: Proper CORS headers for API security

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Use a different port
python balrog.py --port 8080 [other arguments]
```

**API Connection Errors**
- Verify your API key is correct
- Check your internet connection
- Ensure the API endpoint URL is correct

**Safety Model Unavailable**
- Balrog defaults to allowing content if safety model fails
- Check safety model endpoint and API key
- Monitor logs for safety model errors

### Debug Mode
```bash
python balrog.py --debug --log-level DEBUG [other arguments]
```

### Logs
- All errors and activities are logged to console
- Use `--log-level DEBUG` for detailed troubleshooting
- Check browser console for frontend errors

## Development

### Project Structure
```
balrog/
├── balrog.py              # Main application
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Web interface template
├── static/
│   ├── style.css         # Modern UI styles
│   └── script.js         # Frontend JavaScript
└── README.md             # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Feel free to use, modify, and distribute.

## Support

For issues, questions, or feature requests:
1. Check the troubleshooting section
2. Review the logs with debug mode
3. Create an issue with detailed information

---

**Balrog** - Because your conversations deserve both intelligence and safety. 🐉🛡️