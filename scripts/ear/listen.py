# The local ear, part 2: a model that listens and answers in words (Qwen2.5-Omni-3B, text out only).
# Nothing is played aloud. Loads ~8 GB and takes a minute or two to start: pass many files at once.
#   python listen.py <file,file,...> ["question"]
# Long songs: cut 25-30 s excerpts first (start, middle, the loop seam).
import sys
import librosa, torch
from transformers import Qwen2_5OmniProcessor, Qwen2_5OmniThinkerForConditionalGeneration

MODEL = 'Qwen/Qwen2.5-Omni-3B'
SYSTEM = 'You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech.'
ASK = 'Describe exactly what you hear in this audio: instruments or sound sources, mood, any voices or singing, and any audio problems like clicks, distortion or noise.'
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
proc = Qwen2_5OmniProcessor.from_pretrained(MODEL)
model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(MODEL, torch_dtype=torch.float16).to(dev).eval()
stop = [t for t in (proc.tokenizer.convert_tokens_to_ids('<|im_end|>'), proc.tokenizer.eos_token_id) if t is not None]

def listen(path, question=ASK):
    y, _ = librosa.load(path, sr=16000, mono=True)
    conv = [{'role': 'system', 'content': [{'type': 'text', 'text': SYSTEM}]},
            {'role': 'user', 'content': [{'type': 'audio', 'audio': path}, {'type': 'text', 'text': question}]}]
    text = proc.apply_chat_template(conv, add_generation_prompt=True, tokenize=False)
    inp = proc(text=text, audio=[y], return_tensors='pt', padding=True).to(dev)
    inp = {k: (v.to(torch.float16) if v.dtype == torch.float32 else v) for k, v in inp.items()}
    with torch.no_grad():
        out = model.generate(**inp, max_new_tokens=220, do_sample=False, eos_token_id=stop)
    return proc.batch_decode(out[:, inp['input_ids'].shape[1]:], skip_special_tokens=True)[0].split('Human:')[0].strip()

if __name__ == '__main__':
    q = sys.argv[2] if len(sys.argv) > 2 else ASK
    for path in sys.argv[1].split(','):
        print(f'== {path.split("/")[-1]}\n{listen(path, q)}\n', flush=True)
