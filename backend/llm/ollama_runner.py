import requests
import json

def run_ollama(prompt: str, model: str = "mistral:instruct") -> str:
    url = 'http://localhost:11434/api/generate'
    payload = {
        'model': model,
        'prompt': prompt,
        'stream': True
    }

    response = requests.post(url, json=payload, stream=True)
    result = ''
    for line in response.iter_lines():
        if line:
            data = json.loads(line.decode('utf-8'))
            result += data.get("response", "")
            if data.get("done", False):
                break
    return result.strip()
