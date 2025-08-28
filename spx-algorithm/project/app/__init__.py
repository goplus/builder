from flask import Flask
import os
import logging
from logging.handlers import RotatingFileHandler


def create_app(config_name='default'):
    """Application factory function"""
    app = Flask(__name__)
    
    # Configure application
    from .config.config import config
    app.config.from_object(config[config_name])
    
    # Create necessary directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['LOG_FOLDER'], exist_ok=True)
    
    # Configure logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Setup console handler for debug mode
    if app.debug:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(name)s:%(lineno)d]'
        ))
        console_handler.setLevel(logging.INFO)
        
        # Set root logger level to INFO
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(console_handler)
    
    # Setup file handler for production
    if not app.debug and not app.testing:
        file_handler = RotatingFileHandler(
            os.path.join(app.config['LOG_FOLDER'], 'app.log'),
            maxBytes=10240000, backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Image Search API startup')
    
    # Register blueprints
    from .api.routes import api_bp
    app.register_blueprint(api_bp)
    
    # Add root route
    @app.route('/')
    def index():
        return {
            'message': 'Image Search API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/api/health',
                # 'search': '/api/search (POST)',
                # 'search_by_url': '/api/search/url (POST)',
                'search_resource': '/api/search/resource (POST)',
                'vector_db_health': '/api/vector/health',
                'vector_db_stats': '/api/vector/stats',
                'vector_db_add': '/api/vector/add (POST)',
                'vector_db_data': '/api/vector/data',
                'vector_db_search': '/api/vector/search (POST)',
                'vector_db_delete': '/api/vector/delete (DELETE)',
                'vector_db_batch_add': '/api/vector/batch/add (POST)'
            }
        }
    
    return app