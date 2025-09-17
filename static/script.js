// Balrog Chat Interface JavaScript

class BalrogChat {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.clearBtn = document.getElementById('clearBtn');
        this.healthBtn = document.getElementById('healthBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.lastActivity = document.getElementById('lastActivity');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toastContainer = document.getElementById('toastContainer');
        
        this.isLoading = false;
        this.messageHistory = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkHealth();
        this.updateLastActivity();
        this.enableInterface();
    }
    
    setupEventListeners() {
        // Send button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key handling
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateSendButton();
        });
        
        // Clear chat
        this.clearBtn.addEventListener('click', () => this.clearChat());
        
        // Health check
        this.healthBtn.addEventListener('click', () => this.checkHealth());
        
        // Initial button state
        this.updateSendButton();
    }
    
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    updateSendButton() {
        const hasContent = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasContent || this.isLoading;
    }
    
    enableInterface() {
        this.messageInput.disabled = false;
        this.messageInput.placeholder = "Type your message here...";
        this.updateSendButton();
        this.updateStatus('online', 'Ready');
    }
    
    disableInterface() {
        this.messageInput.disabled = true;
        this.sendBtn.disabled = true;
        this.updateStatus('offline', 'Disconnected');
    }
    
    updateStatus(status, text) {
        this.statusIndicator.className = `fas fa-circle status-indicator ${status}`;
        this.statusText.textContent = text;
    }
    
    updateLastActivity() {
        const now = new Date().toLocaleTimeString();
        this.lastActivity.textContent = now;
    }
    
    showLoading(show = true) {
        this.isLoading = show;
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
        this.updateSendButton();
        
        if (show) {
            this.updateStatus('loading', 'Processing...');
        } else {
            this.updateStatus('online', 'Ready');
        }
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;
        
        // Add user message to chat
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateSendButton();
        this.updateLastActivity();
        
        // Show loading
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Successful response
                this.addMessage('assistant', data.message, data.timestamp);
                this.showToast('success', 'Message sent', 'Response received successfully');
            } else {
                // Error response
                if (data.type === 'input_filtered') {
                    this.addMessage('error', 
                        `⚠️ Input blocked by safety filter: ${data.classification}`, 
                        null, 
                        'Safety Filter'
                    );
                    this.showToast('warning', 'Content Filtered', 'Your message was blocked by the safety model');
                } else if (data.type === 'output_filtered') {
                    this.addMessage('error', 
                        `⚠️ Response blocked by safety filter: ${data.classification}`, 
                        null, 
                        'Safety Filter'
                    );
                    this.showToast('warning', 'Response Filtered', 'The AI response was blocked by the safety model');
                } else {
                    this.addMessage('error', `Error: ${data.error}`, null, 'System Error');
                    this.showToast('error', 'Error', data.error);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('error', `Network error: ${error.message}`, null, 'Connection Error');
            this.showToast('error', 'Connection Error', 'Failed to connect to the server');
        } finally {
            this.showLoading(false);
            this.updateLastActivity();
        }
    }
    
    addMessage(type, content, timestamp = null, title = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (title) {
            const titleSpan = document.createElement('strong');
            titleSpan.textContent = title + ': ';
            messageContent.appendChild(titleSpan);
        }
        
        // Handle line breaks and basic formatting
        const formattedContent = this.formatMessageContent(content);
        messageContent.appendChild(formattedContent);
        
        messageDiv.appendChild(messageContent);
        
        // Add timestamp if provided
        if (timestamp || type === 'user') {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            metaDiv.textContent = timestamp ? 
                new Date(timestamp).toLocaleTimeString() : 
                new Date().toLocaleTimeString();
            messageDiv.appendChild(metaDiv);
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store in history
        this.messageHistory.push({
            type,
            content,
            timestamp: timestamp || new Date().toISOString(),
            title
        });
    }
    
    formatMessageContent(content) {
        const container = document.createElement('span');
        
        // Simple markdown-like formatting
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        container.innerHTML = formattedContent;
        return container;
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    async clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            try {
                const response = await fetch('/api/clear', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if (response.ok) {
                    // Clear UI
                    this.chatMessages.innerHTML = `
                        <div class="message system-message">
                            <div class="message-content">
                                <i class="fas fa-shield-alt"></i>
                                <span>Chat cleared. Your messages are protected by safety filtering.</span>
                            </div>
                        </div>
                    `;
                    this.messageHistory = [];
                    this.showToast('success', 'Chat Cleared', 'Conversation history has been cleared');
                } else {
                    this.showToast('error', 'Error', 'Failed to clear chat history');
                }
            } catch (error) {
                console.error('Error clearing chat:', error);
                this.showToast('error', 'Error', 'Failed to clear chat history');
            }
            this.updateLastActivity();
        }
    }
    
    async checkHealth() {
        try {
            this.updateStatus('loading', 'Checking...');
            
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (response.ok) {
                this.updateStatus('online', `Ready (${data.model})`);
                this.showToast('success', 'Health Check', `Server is healthy. Model: ${data.model}`);
                this.enableInterface();
            } else {
                this.updateStatus('offline', 'Unhealthy');
                this.showToast('error', 'Health Check Failed', 'Server is not responding properly');
                this.disableInterface();
            }
        } catch (error) {
            console.error('Health check error:', error);
            this.updateStatus('offline', 'Connection Failed');
            this.showToast('error', 'Connection Error', 'Failed to reach the server');
            this.disableInterface();
        }
        this.updateLastActivity();
    }
    
    showToast(type, title, message, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${iconMap[type] || iconMap.info}"></i>
                </div>
                <div class="toast-message">
                    <div class="toast-title">${title}</div>
                    <div class="toast-description">${message}</div>
                </div>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => {
                    if (toast.parentNode) {
                        this.toastContainer.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                this.toastContainer.removeChild(toast);
            }
        });
    }
    
    // Utility method to export chat history
    exportHistory() {
        const data = {
            timestamp: new Date().toISOString(),
            messages: this.messageHistory
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `balrog-chat-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('success', 'Export Complete', 'Chat history has been downloaded');
    }
}

// Initialize the chat interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.balrogChat = new BalrogChat();
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K to focus input
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            window.balrogChat.messageInput.focus();
        }
        
        // Ctrl+Shift+C to clear chat
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            window.balrogChat.clearChat();
        }
        
        // Ctrl+Shift+E to export history
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            window.balrogChat.exportHistory();
        }
    });
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Future: register service worker for offline capabilities
    });
}