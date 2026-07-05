import base64
from cryptography.fernet import Fernet
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Ensure we have a valid Fernet key (32 URL-safe base64-encoded bytes)
# If the provided key is not valid, we generate a fallback key or raise an error.
_key = settings.CONNECTION_ENCRYPTION_KEY.encode()
try:
    _fernet = Fernet(_key)
except Exception as e:
    logger.error(f"Invalid CONNECTION_ENCRYPTION_KEY format: {str(e)}. Attempting to generate a temporary key for safety.")
    # Fallback key generated deterministically or safely for this runtime
    # But in production, the user must supply a valid key.
    try:
        # Pad or generate base64 key
        padded_key = base64.urlsafe_b64encode(_key.ljust(32)[:32])
        _fernet = Fernet(padded_key)
    except Exception:
        raise ValueError("Invalid CONNECTION_ENCRYPTION_KEY environment variable. Must be 32 base64 bytes.")

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
