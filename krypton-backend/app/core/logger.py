import logging
from logging.config import dictConfig
import os

# Create a logs directory in your project root if it doesn't exist
os.makedirs("logs", exist_ok=True)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,  # Keeps Uvicorn's internal logs alive
    "formatters": {
        "default": {
            "format": "[%(asctime)s] %(levelname)-8s %(name)s:%(lineno)d - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "level": "INFO",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "default",
            "filename": "logs/app.log",
            "maxBytes": 5 * 1024 * 1024,  # 5 Megabytes per log file
            "backupCount": 3,             # Keeps up to 3 old log files back up
            "level": "INFO",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "app": {  # This is your application's root logger name
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

def setup_logger():
    """Initializes the logging system."""
    dictConfig(LOGGING_CONFIG)