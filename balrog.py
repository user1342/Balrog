#!/usr/bin/env python3
"""
Balrog - A Modern LLM Interface Wrapper with Safety Model Integration
"""

import argparse
import logging
import json
from typing import Dict, List, Optional, Tuple
from flask import Flask, render_template, request, jsonify, session
from werkzeug.serving import run_simple
import secrets
import os
from datetime import datetime
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SafetyModel:
    """Wrapper for safety model (Llama Guard) to filter content"""
    
    def __init__(self, api_endpoint: str, api_key: str, safety_model: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url=api_endpoint
        )
        self.safety_model = safety_model
    
    def check_content(self, content: str, content_type: str = "input") -> Tuple[bool, str]:
        """
        Check content safety using the safety model
        Returns (is_safe, classification)
        """
        try:
            response = self.client.chat.completions.create(
                model=self.safety_model,
                messages=[
                    {
                        "role": "user", 
                        "content": f"[INST] Task: Check if this {content_type} is safe\n\n{content}[/INST]"
                    }
                ],
                max_tokens=100,
                temperature=0.1
            )
            
            classification = response.choices[0].message.content.strip()
            
            # Check if content is flagged as unsafe
            if any(keyword in classification.lower() for keyword in ['unsafe', 'violation', 'harmful', 'inappropriate']):
                return False, classification
            else:
                return True, "Safe"
                
        except Exception as e:
            logger.error(f"Safety model error: {str(e)}")
            # Default to safe if safety model fails
            return True, "Safety check failed"

class LLMClient:
    """Client for LLM API"""
    
    def __init__(self, api_endpoint: str, api_key: str, model: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url=api_endpoint
        )
        self.model = model
    
    def chat_completion(self, messages: List[Dict], **kwargs) -> Dict:
        """Send chat completion request to LLM API"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', 1000),
                temperature=kwargs.get('temperature', 0.7),
                stream=False
            )
            
            # Convert response to dict format for compatibility
            return {
                "choices": [
                    {
                        "message": {
                            "content": response.choices[0].message.content,
                            "role": response.choices[0].message.role
                        }
                    }
                ]
            }
                
        except Exception as e:
            logger.error(f"LLM client error: {str(e)}")
            return {"error": str(e)}

class BalrogApp:
    """Main Balrog application class"""
    
    def __init__(self, api_endpoint: str, api_key: str, model: str, 
                 safety_model: str, port: int = 5000):
        self.app = Flask(__name__)
        self.app.secret_key = secrets.token_hex(16)
        self.port = port
        
        # Initialize clients (both use same endpoint and key)
        self.llm_client = LLMClient(api_endpoint, api_key, model)
        self.safety_model = SafetyModel(api_endpoint, api_key, safety_model)
        
        # Setup routes
        self.setup_routes()
        
        logger.info(f"Balrog initialized with model: {model} and safety model: {safety_model}")
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def index():
            """Main chat interface"""
            return render_template('index.html')
        
        @self.app.route('/api/chat', methods=['POST'])
        def chat():
            """Handle chat requests with safety filtering"""
            try:
                data = request.get_json()
                user_message = data.get('message', '').strip()
                
                if not user_message:
                    return jsonify({"error": "Empty message"}), 400
                
                # Safety check on input
                is_safe, safety_classification = self.safety_model.check_content(user_message, "input")
                
                if not is_safe:
                    logger.warning(f"Unsafe input detected: {safety_classification}")
                    return jsonify({
                        "error": "Content filtered by safety model",
                        "classification": safety_classification,
                        "type": "input_filtered"
                    }), 400
                
                # Get conversation history from session
                if 'conversation' not in session:
                    session['conversation'] = []
                
                conversation = session['conversation']
                conversation.append({"role": "user", "content": user_message})
                
                # Send to LLM
                response = self.llm_client.chat_completion(conversation)
                
                if "error" in response:
                    return jsonify(response), 500
                
                # Extract assistant message
                assistant_message = response.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                if not assistant_message:
                    return jsonify({"error": "Empty response from model"}), 500
                
                # Safety check on output
                is_safe, safety_classification = self.safety_model.check_content(assistant_message, "output")
                
                if not is_safe:
                    logger.warning(f"Unsafe output detected: {safety_classification}")
                    return jsonify({
                        "error": "Response filtered by safety model",
                        "classification": safety_classification,
                        "type": "output_filtered"
                    }), 400
                
                # Add to conversation history
                conversation.append({"role": "assistant", "content": assistant_message})
                session['conversation'] = conversation[-20:]  # Keep last 20 messages
                
                return jsonify({
                    "message": assistant_message,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Chat endpoint error: {str(e)}")
                return jsonify({"error": "Internal server error"}), 500
        
        @self.app.route('/api/clear', methods=['POST'])
        def clear_conversation():
            """Clear conversation history"""
            session['conversation'] = []
            return jsonify({"status": "cleared"})
        
        @self.app.route('/api/health', methods=['GET'])
        def health_check():
            """Health check endpoint"""
            return jsonify({
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "model": self.llm_client.model
            })
    
    def run(self, debug: bool = False):
        """Run the Flask application"""
        logger.info(f"Starting Balrog server on port {self.port}")
        try:
            run_simple(
                hostname='127.0.0.1',
                port=self.port,
                application=self.app,
                use_debugger=debug,
                use_reloader=debug
            )
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {str(e)}")

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Balrog - Modern LLM Interface Wrapper with Safety Model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python balrog.py --api https://api.openai.com/v1 \\
                   --model gpt-3.5-turbo \\
                   --api-key your_openai_key \\
                   --safety-model meta-llama/Llama-Guard-7b \\
                   --port 8080

  python balrog.py --api https://api.anthropic.com/v1 \\
                   --model claude-3-sonnet-20240229 \\
                   --api-key your_anthropic_key \\
                   --safety-model meta-llama/Llama-Guard-7b \\
                   --port 5000
        """
    )
    
    parser.add_argument(
        '--api',
        required=True,
        help='API endpoint URL for the LLM (e.g., https://api.openai.com/v1)'
    )
    
    parser.add_argument(
        '--model',
        required=True,
        help='Model name to use (e.g., gpt-3.5-turbo, gpt-4, claude-3-sonnet-20240229)'
    )
    
    parser.add_argument(
        '--api-key',
        required=True,
        help='API key for authentication'
    )
    
    parser.add_argument(
        '--safety-model',
        required=True,
        help='Safety model name (e.g., meta-llama/Llama-Guard-7b)'
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=5000,
        help='Port to host the web interface on (default: 5000)'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Run in debug mode with auto-reload'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Set logging level (default: INFO)'
    )
    
    return parser.parse_args()

def main():
    """Main entry point"""
    args = parse_arguments()
    
    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Validate arguments
    if args.port < 1 or args.port > 65535:
        logger.error("Port must be between 1 and 65535")
        return 1
    
    if not args.api.startswith(('http://', 'https://')):
        logger.error("API endpoint must be a valid HTTP/HTTPS URL")
        return 1
    
    try:
        # Create and run the app
        app = BalrogApp(
            api_endpoint=args.api,
            api_key=args.api_key,
            model=args.model,
            safety_model=args.safety_model,
            port=args.port
        )
        
        app.run(debug=args.debug)
        return 0
        
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        return 1

if __name__ == '__main__':
    exit(main())
