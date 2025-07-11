from flask import Flask, request, jsonify, render_template, send_from_directory # type: ignore
import json
import random
import os
import logging
import re

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure data directory exists before anything else
os.makedirs("data", exist_ok=True)

app = Flask(__name__)

def load_json_file(filename, default_data=None):
    try:
        filepath = os.path.join("data", filename)
        if not os.path.exists(filepath):
            if default_data is not None:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(default_data, f, ensure_ascii=False, indent=2)
                return default_data
            return {}
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return default_data or {}

def load_intents():
    default_intents = {
        "intents": [
            {
                "tag": "greeting",
                "patterns": ["halo", "hai", "selamat pagi", "selamat siang", "selamat malam"],
                "responses": ["Halo! Ada yang bisa saya bantu?", "Hai! Selamat datang di Chatbot Akademik Universitas Gunadarma."]
            },
            {
                "tag": "jadwal_kuliah",
                "patterns": [
                    "Bagaimana cara melihat jadwal kuliah?",
                    "Jadwal kuliah",
                    "Kapan jadwal kuliah saya?",
                    "Lihat jadwal kuliah"
                ],
                "responses": [
                    "Jadwal kuliah dapat dilihat di portal akademik pada Website https://baak.gunadarma.ac.id/."
                ]
            },
            {
                "tag": "proses_krs",
                "patterns": [
                    "Bagaimana Isi KRS?",
                    "Isi KRS",
                    "Cara KRS",
                    "Langkah-langkah KRS"
                ],
                "responses": [
                    "Buka Website https://studentsite.gunadarma.ac.id/ > Login > KRS > Isi KRS"
                ]
            },
            {
                "tag": "cek_nilai",
                "patterns": [
                    "Cara cek nilai semester",
                    "Bagaimana cara melihat nilai?",
                    "Cek nilai",
                    "Nilai semester"
                ],
                "responses": [
                    "Buka Website https://studentsite.gunadarma.ac.id/ > Login > Akademik > Buka Modul Akademik > Rangkuman Nilai"
                ]
            },
            {
                "tag": "pembayaran_ukt",
                "patterns": [
                    "Cara pembayaran UKT semester",
                    "Bagaimana cara membayar UKT?",
                    "Pembayaran UKT",
                    "Bayar UKT semester"
                ],
                "responses": [
                    "Buka Website https://studentsite.gunadarma.ac.id/ > Login > Blanko Pembayaran > Pilih Pembayaran Semester Selanjutnya atau Saat Ini"
                ]
            }
        ]
    }
    return load_json_file("intents.json", default_intents)

def clean_text(text):
    # Hilangkan tanda baca dan ubah ke lowercase
    return re.sub(r'[^\w\s]', '', text).lower().strip()

def get_response(user_input):
    try:
        intents = load_intents()
        user_input_clean = clean_text(user_input)
        keywords = [
            "kuliah", "jadwal", "krs", "nilai", "ukt", "akademik", "dosen", "mahasiswa", "sks", "semester", "registrasi"
        ]
        # Pencocokan lebih fleksibel
        for intent in intents["intents"]:
            for pattern in intent.get("patterns", []):
                if not pattern: continue
                pattern_clean = clean_text(pattern)
                # Cocokkan jika pattern ada di pertanyaan user ATAU sebaliknya
                if pattern_clean in user_input_clean or user_input_clean in pattern_clean:
                    if intent.get("responses"):
                        return random.choice(intent["responses"])
        if any(kw in user_input_clean for kw in keywords):
            return "Maaf, saya belum bisa menjawab pertanyaan tersebut. Silakan hubungi bagian akademik atau coba tanyakan dengan kata lain."
        return "Maaf, saya belum memahami pertanyaan Anda. Tolong tanyakan seputar kuliah atau sistem akademik ya 😊."
    except Exception as e:
        logger.error(f"Error getting response: {e}")
        return "Maaf, terjadi kesalahan. Silakan coba lagi."

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({"error": "Empty message"}), 400
        response = get_response(user_message)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)