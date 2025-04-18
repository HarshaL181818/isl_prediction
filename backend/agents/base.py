from backend.llm.ollama_runner import run_ollama

class BaseAgent:
    def __init__(self, name):
        self.name = name

    def act(self, task: str) -> str:
        prompt = f"You are {self.name}. Perform the task below.\nTask: {task}"
        return run_ollama(prompt)
