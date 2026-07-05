"""
LLM client supporting Groq (primary) and Gemini (fallback).
"""
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas import LLMResponse
import json
import logging

logger = logging.getLogger(__name__)


class LLMClient:
    """Multi-provider LLM client."""
    
    def __init__(self):
        """Initialize LLM client based on configured provider."""
        self.provider = settings.LLM_PROVIDER
        
        if self.provider == "groq":
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY not configured")
            self._init_groq()
        elif self.provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY not configured")
            self._init_gemini()
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
        
        logger.info(f"Initialized LLM client: {self.provider}")
    
    def _init_groq(self):
        """Initialize Groq client."""
        try:
            from groq import Groq
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            self.model = "llama-3.3-70b-versatile"  # Groq's best model for SQL
        except ImportError:
            raise ImportError("groq package not installed. Run: pip install groq")
    
    def _init_gemini(self):
        """Initialize Gemini client."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.client = genai.GenerativeModel("gemini-1.5-flash")
            self.model = "gemini-1.5-flash"
        except ImportError:
            raise ImportError("google-generativeai package not installed")
    
    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        """
        Generate completion from LLM.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (lower = more deterministic)
            
        Returns:
            Generated text response
        """
        try:
            if self.provider == "groq":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a SQL expert. Respond with JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    max_tokens=2000
                )
                return response.choices[0].message.content
            
            elif self.provider == "gemini":
                response = self.client.generate_content(
                    prompt,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": 2000,
                    }
                )
                return response.text
        
        except Exception as e:
            logger.error(f"LLM generation failed: {str(e)}")
            raise Exception(f"LLM generation failed: {str(e)}")
    
    def generate_sql(self, prompt: str) -> LLMResponse:
        """
        Generate SQL query from prompt and parse structured response.
        
        Args:
            prompt: SQL generation prompt
            
        Returns:
            Parsed LLMResponse object
            
        Raises:
            Exception: If generation or parsing fails
        """
        try:
            # Generate response
            raw_response = self.generate(prompt, temperature=0.1)
            
            # Try to extract JSON from response
            json_response = self._extract_json(raw_response)
            
            # Validate required fields
            if not json_response.get("sql"):
                raise ValueError("LLM response missing 'sql' field")
            
            # Parse into LLMResponse
            return LLMResponse(
                sql=json_response["sql"],
                explanation=json_response.get("explanation", ""),
                tables_used=json_response.get("tables_used", []),
                confidence=float(json_response.get("confidence", 0.5)),
                needs_clarification=json_response.get("needs_clarification", False),
                clarification_question=json_response.get("clarification_question")
            )
        
        except Exception as e:
            logger.error(f"SQL generation failed: {str(e)}")
            raise Exception(f"Failed to generate SQL: {str(e)}")
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from LLM response text.
        
        Args:
            text: Raw LLM response text
            
        Returns:
            Parsed JSON dictionary
        """
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON in markdown code blocks
        if "```json" in text:
            try:
                json_str = text.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass
        
        # Try to find JSON object in text
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            json_str = text[start:end]
            return json.loads(json_str)
        except (ValueError, json.JSONDecodeError):
            pass
        
        raise ValueError("Could not extract valid JSON from LLM response")


# Global LLM client instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """
    Get or create global LLM client instance.
    
    Returns:
        LLMClient instance
    """
    global _llm_client
    
    if _llm_client is None:
        _llm_client = LLMClient()
    
    return _llm_client
