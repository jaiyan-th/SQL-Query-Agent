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
    """Multi-provider LLM client with automatic failover."""
    
    def __init__(self):
        """Initialize LLM client supporting primary/fallback configuration."""
        self.has_groq = bool(settings.GROQ_API_KEY)
        self.has_gemini = bool(settings.GEMINI_API_KEY)
        
        if not self.has_groq and not self.has_gemini:
            raise ValueError("Neither GROQ_API_KEY nor GEMINI_API_KEY is configured")
            
        if self.has_groq:
            self._init_groq()
        if self.has_gemini:
            self._init_gemini()
            
        logger.info(f"Initialized LLM client (Groq: {self.has_groq}, Gemini: {self.has_gemini})")
    
    def _init_groq(self):
        """Initialize Groq client."""
        try:
            from groq import Groq
            self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
            self.groq_model = "llama-3.3-70b-versatile"
        except ImportError:
            raise ImportError("groq package not installed. Run: pip install groq")
    
    def _init_gemini(self):
        """Initialize Gemini client."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_client = genai.GenerativeModel("gemini-1.5-flash")
            self.gemini_model = "gemini-1.5-flash"
        except ImportError:
            raise ImportError("google-generativeai package not installed")
    
    def generate(self, prompt: str, temperature: float = 0.1) -> str:
        """
        Generate completion from LLM, trying Groq first, then falling back to Gemini.
        """
        providers_to_try = []
        if self.has_groq:
            providers_to_try.append("groq")
        if self.has_gemini:
            providers_to_try.append("gemini")
            
        errors = []
        for prov in providers_to_try:
            try:
                if prov == "groq":
                    logger.info("Calling primary Groq LLM...")
                    response = self.groq_client.chat.completions.create(
                        model=self.groq_model,
                        messages=[
                            {"role": "system", "content": "You are a SQL expert. Respond with JSON only."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=temperature,
                        max_tokens=2000
                    )
                    return response.choices[0].message.content
                elif prov == "gemini":
                    logger.info("Calling fallback Gemini LLM...")
                    response = self.gemini_client.generate_content(
                        prompt,
                        generation_config={
                            "temperature": temperature,
                            "max_output_tokens": 2000,
                        }
                    )
                    return response.text
            except Exception as e:
                logger.warning(f"LLM provider {prov} failed: {str(e)}")
                errors.append(f"{prov}: {str(e)}")
                
        raise Exception(f"All LLM providers failed: {', '.join(errors)}")
    
    def generate_sql(self, prompt: str) -> LLMResponse:
        """
        Generate SQL query from prompt and parse structured response.
        """
        try:
            raw_response = self.generate(prompt, temperature=0.1)
            json_response = self._extract_json(raw_response)
            
            if not json_response.get("sql"):
                raise ValueError("LLM response missing 'sql' field")
            
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
        """
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        if "```json" in text:
            try:
                json_str = text.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass
        
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            json_str = text[start:end]
            return json.loads(json_str)
        except (ValueError, json.JSONDecodeError):
            pass
        
        raise ValueError("Could not extract valid JSON from LLM response")


_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """
    Get or create global LLM client instance.
    """
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
