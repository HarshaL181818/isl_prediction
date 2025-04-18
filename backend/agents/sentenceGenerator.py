from backend.llm.ollama_runner import run_ollama
from backend.agents.base import BaseAgent

class SentenceGeneratorAgent(BaseAgent):
    def __init__(self):
        super().__init__("Sentence_Generator")

    def generate(self, words: str) -> str:
        print("generating")
        prompt = f"""
You are an expert word to context generator assistant thats being used to convert words said by deaf people to sentence, dont try to generate sentence out of nowhere, just use the words as it is and make the sentence a bit better grammatically. Parse the following words and extract context and return the sentence in a line without changing the meaning of the provided word
words are: {words}
Return only a single string, dont write any note or anything, just plane result 
        """.strip()

        return run_ollama(prompt)
