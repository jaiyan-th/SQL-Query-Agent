from cryptography.fernet import Fernet
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialise Fernet at module import time.
# The config validator already confirmed the key is a valid 32-byte base64 string,
# so Fernet() should never fail here.  If it somehow does, we raise immediately
# with the same actionable message — no silent fallbacks.
try:
    _fernet = Fernet(settings.CONNECTION_ENCRYPTION_KEY.encode())
except Exception:
    raise RuntimeError(
        "Invalid or missing CONNECTION_ENCRYPTION_KEY. "
        "Generate one using: "
        "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )

def encrypt_text(value: str) -> str:
    """
    Encrypt a text value using Fernet encryption.
    
    Args:
        value: Plain text string
        
    Returns:
        Encrypted text string (safe base64)
    """
    if not value:
        return ""
    try:
        encrypted_bytes = _fernet.encrypt(value.encode())
        return encrypted_bytes.decode()
    except Exception as e:
        logger.error("Failed to encrypt database URL")
        raise Exception(f"Encryption failed: {str(e)}")

def decrypt_text(value: str) -> str:
    """
    Decrypt a Fernet-encrypted text value.
    
    Args:
        value: Encrypted text string
        
    Returns:
        Decrypted plain text string
    """
    if not value:
        return ""
    try:
        decrypted_bytes = _fernet.decrypt(value.encode())
        return decrypted_bytes.decode()
    except Exception as e:
        logger.error("Failed to decrypt database URL - invalid signature or corrupted key")
        raise Exception("Decryption failed. Please verify encryption keys.")
