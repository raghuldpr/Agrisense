from dotenv import load_dotenv
import os, requests, io, json
from PIL import Image

load_dotenv('.env')
token = os.getenv('HF_API_TOKEN', '')

img = Image.open(r'C:\Users\raghu\Desktop\Agrisense\repos\Plant-Disease-Detection\uploaded_image.jpg').convert('RGB')
img = img.resize((512,512))
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
buf.seek(0)

r = requests.post(
    'https://router.huggingface.co/hf-inference/models/ozair23/mobilenet_v2_1.0_224-finetuned-plantdisease',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/octet-stream'},
    data=buf.read(),
    timeout=60,
    stream=True
)
print('Status:', r.status_code)
try:
    raw = b''
    for chunk in r.iter_content(chunk_size=1024):
        if chunk:
            raw += chunk
    results = json.loads(raw.decode('utf-8'))
    print('Top result:', results[0])
except Exception as e:
    print('Error decoding:', e)
