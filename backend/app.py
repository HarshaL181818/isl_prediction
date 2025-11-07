
import os
from flask import Flask, request, jsonify
import numpy as np # type: ignore
import pickle
from tensorflow.keras.models import load_model # type: ignore
import tensorflow as tf # type: ignore
from flask_cors import CORS # type: ignore
from flask_socketio import SocketIO # type: ignore
from flask import Flask, request, jsonify
import json

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

# UPLOAD_FOLDER = os.path.join(os.getcwd(), 'backend/uploads')
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# GPU setup
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("✅ GPU is available and being used.")
    except RuntimeError as e:
        print("RuntimeError:", e)
else:
    print("⚠ No GPU found. Running on CPU.")




# @app.route('/predict-sign', methods=['POST'])
# def predict_sign():
#     if 'video' not in request.files:
#         return jsonify({'error': 'No video uploaded'}), 400

#     video = request.files['video']
#     filename = secure_filename(video.filename)
#     video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#     video.save(video_path)

#     sequence = extract_sequence_from_video(video_path, max_frames=MAX_FRAMES)

#     if sequence.size == 0:
#         sequence = np.zeros((MAX_FRAMES, FEATURE_DIM))
#     elif sequence.shape[0] < MAX_FRAMES:
#         pad_len = MAX_FRAMES - sequence.shape[0]
#         sequence = np.vstack((sequence, np.zeros((pad_len, FEATURE_DIM))))
#     else:
#         sequence = sequence[:MAX_FRAMES]

#     sequence = np.expand_dims(sequence, axis=0)
#     prediction = model.predict(sequence)
#     predicted_label = label_encoder.inverse_transform([np.argmax(prediction)])[0]

#     return jsonify({'label': predicted_label})

# @app.route('/get-dataset-videos')
# def get_dataset_videos():
#     dataset_dir = 'backend/isl_datav2'
#     dataset = {}

#     for label in os.listdir(dataset_dir):
#         label_path = os.path.join(dataset_dir, label)
#         if os.path.isdir(label_path):
#             videos = os.listdir(label_path)
#             dataset[label] = [f"data/{label}/{vid}" for vid in videos if vid.lower().endswith(('.mp4', '.mov'))]

#     return jsonify(dataset)

# @app.route('/predict-live', methods=['POST'])
# def predict_live():
#     print("Received files:", request.files)
#     print("Received form data:", request.form)

#     if 'video' not in request.files:
#         return jsonify({'error': 'No video uploaded'}), 400

#     video = request.files['video']
#     from datetime import datetime
#     filename = datetime.now().strftime("%Y%m%d%H%M%S_") + secure_filename(video.filename)

#     video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#     video.save(video_path)
    
#     # Log video information
#     cap = cv2.VideoCapture(video_path)
#     frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
#     fps = cap.get(cv2.CAP_PROP_FPS)
#     width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
#     height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
#     duration = frame_count / fps if fps > 0 else 0
    
#     print(f"Video info - Filename: {filename}")
#     print(f"Video info - Resolution: {width}x{height}")
#     print(f"Video info - Frame count: {frame_count}")
#     print(f"Video info - FPS: {fps:.2f}")
#     print(f"Video info - Duration: {duration:.2f} seconds")
#     cap.release()

#     # Extract keypoints from the saved video
#     sequence = extract_sequence_from_video(video_path, max_frames=110)
    
#     # Log sequence information
#     print(f"Extracted sequence length: {sequence.shape[0]} frames")
#     print(f"Features per frame: {sequence.shape[1] if sequence.size > 0 else FEATURE_DIM}")

#     if sequence.size == 0:
#         print("Warning: No frames extracted, using zero sequence")
#         sequence = np.zeros((MAX_FRAMES, FEATURE_DIM))
#     elif sequence.shape[0] < MAX_FRAMES:
#         pad_len = MAX_FRAMES - sequence.shape[0]
#         print(f"Padding sequence with {pad_len} zero frames")
#         sequence = np.vstack((sequence, np.zeros((pad_len, FEATURE_DIM))))
#     else:
#         print(f"Truncating sequence to {MAX_FRAMES} frames")
#         sequence = sequence[:MAX_FRAMES]

#     sequence = np.expand_dims(sequence, axis=0)
#     prediction = model.predict(sequence)
#     predicted_label = label_encoder.inverse_transform([np.argmax(prediction)])[0]
#     confidence = float(np.max(prediction))
    
#     print(f"Prediction result: {predicted_label} (confidence: {confidence:.4f})")

#     return jsonify({'predicted_label': predicted_label, 'confidence': confidence})

# @app.route('/data/<label>/<video>')
# def serve_video(label, video):
#     return send_from_directory(os.path.join('isl_datav2', label), video)

# @app.route('/generate_context', methods=['POST'])
# def generate_context():
#     words = request.form.get('words') 
#     print(words)
#     sentence = SentenceGeneratorAgent()
#     results = sentence.generate(words)

#     import tensorflow as tf
#     print("GPUs detected:", tf.config.list_physical_devices('GPU'))

#     return {'generated_sentence': results}


@socketio.on('connect')
def handle_connect():
    print('✅ Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('❌ Client disconnected')

# NEW: A new event to receive processed landmark data
@socketio.on('landmark_data')
def handle_landmark_data(data):
    # 'data' is the JSON object sent from the client
    # Now you can save it to a file, database, or process it further.
    # This will be very light on the CPU.
    # print("Received landmarks for pose:", len(data.get('poseLandmarks', [])))
    pass # Add your data saving logic here


ART_DIR = "backend/artifacts"
MODEL_PATH = os.path.join(ART_DIR, "sign_model.h5")       # matches your training
ENCODER_PATH = os.path.join(ART_DIR, "label_encoder.pkl") # ✅ you have this file
CONFIG_PATH = os.path.join(ART_DIR, "config.json")


print("🔁 Loading model and encoder...")
model = tf.keras.models.load_model(MODEL_PATH)

with open(ENCODER_PATH, "rb") as f:
    le = pickle.load(f)
idx_to_label = list(le.classes_)  # same as LabelEncoder.classes_

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = json.load(f)

class Preprocessor:
    def __init__(self, seq_len=50, n_hand=21, n_pose=33):
        self.SEQ_LEN = seq_len
        self.N_HAND = n_hand
        self.N_POSE = n_pose
        self.FEAT_PER_FRAME = (self.N_HAND*3) + (self.N_HAND*3) + (self.N_POSE*3)  # L + R + Pose

    def _to_xyz_array(self, items, expected_len):
        # items: list[ {x:..., y:..., z:...}, ... ]
        out = np.zeros((expected_len, 3), dtype=np.float32)
        if not isinstance(items, (list, tuple)) or len(items) == 0:
            return out
        m = min(len(items), expected_len)
        for i in range(m):
            lm = items[i] or {}
            try:
                out[i, 0] = float(lm.get('x', 0.0))
                out[i, 1] = float(lm.get('y', 0.0))
                out[i, 2] = float(lm.get('z', 0.0))
            except Exception:
                # If malformed entries appear
                out[i] = 0.0
        return out

    def _vectorize_frame(self, frame):
        # frame: { left: [...], right: [...], pose: [...] }
        left  = self._to_xyz_array(frame.get('left', []),  self.N_HAND)
        right = self._to_xyz_array(frame.get('right', []), self.N_HAND)
        pose  = self._to_xyz_array(frame.get('pose', []),  self.N_POSE)

        # Shoulder-center normalization (if available)
        # Mediapipe Pose indices: 11 (left_shoulder), 12 (right_shoulder)
        l_sh, r_sh = pose[11], pose[12]
        has_shoulders = (np.any(l_sh) and np.any(r_sh))
        if has_shoulders:
            center = (l_sh + r_sh) / 2.0
            scale = np.linalg.norm(l_sh[:2] - r_sh[:2])  # use xy distance for scale
            if scale < 1e-6:
                scale = 1.0
        else:
            # fallback center: nose (0) if present
            center = pose[0] if np.any(pose[0]) else np.zeros(3, dtype=np.float32)
            scale = 1.0

        def norm(arr):
            arr = arr - center
            arr = arr / scale
            return arr

        left  = norm(left)
        right = norm(right)
        pose  = norm(pose)

        # Flatten: [L(21x3), R(21x3), Pose(33x3)] -> (225,)
        feat = np.concatenate([left.flatten(), right.flatten(), pose.flatten()], axis=0)
        return feat.astype(np.float32)

    def preprocess_sequence(self, seq):
        """
        seq: list of frames, each frame is {left:[], right:[], pose:[]}
        Returns (SEQ_LEN, FEAT_PER_FRAME)
        - If seq shorter than SEQ_LEN, pad at the start with zeros (to match your frontend).
        - If longer, take the last SEQ_LEN frames (to match streaming).
        """
        frames = seq if isinstance(seq, (list, tuple)) else []
        if len(frames) == 0:
            frames = [{}]  # at least one empty frame

        # Trim or pad
        if len(frames) > self.SEQ_LEN:
            frames = frames[-self.SEQ_LEN:]
        if len(frames) < self.SEQ_LEN:
            pad_count = self.SEQ_LEN - len(frames)
            frames = ([{'left': [], 'right': [], 'pose': []}] * pad_count) + frames

        feats = np.stack([self._vectorize_frame(f) for f in frames], axis=0)
        return feats  # (SEQ_LEN, FEAT_PER_FRAME)

def load_sequence_from_json_obj(obj):
    """
    Robustly extract frames list from various JSON shapes.
    Expected common case: obj is a list of frames [{left, right, pose}, ...]
    """
    if isinstance(obj, list):
        # Typical case
        return obj
    if isinstance(obj, dict):
        for key in ['sequence', 'frames', 'data']:
            if key in obj and isinstance(obj[key], list):
                return obj[key]
    # Fallback: wrap single frame-like dict
    if isinstance(obj, dict) and all(k in obj for k in ['left', 'right', 'pose']):
        return [obj]
    return []
prep = Preprocessor(
    seq_len=cfg["SEQ_LEN"],
    n_hand=cfg["N_HAND"],
    n_pose=cfg["N_POSE"]
)

# Warm up TensorFlow model (for faster first prediction)
dummy = np.zeros((1, cfg["SEQ_LEN"], prep.FEAT_PER_FRAME), dtype=np.float32)
_ = model.predict(dummy, verbose=0)
print("✅ Model warm-up complete.")

# ---------------------------
# FLASK APP
# ---------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "✅ SignPredict API running"})

@app.route("/predict", methods=["POST"])
def predict():
    try:
        body = request.get_json()
        if not isinstance(body, dict) or "data" not in body:
            return jsonify({"error": "Invalid request format. Expected {'data': [...]}"}), 400

        seq_obj = load_sequence_from_json_obj(body["data"])
        feats = prep.preprocess_sequence(seq_obj)
        feats = np.expand_dims(feats, axis=0)  # (1,SEQ,F)

        probs = model.predict(feats, verbose=0)[0]
        idx = int(np.argmax(probs))
        conf = float(probs[idx])
        label = idx_to_label[idx]

        return jsonify({
            "prediction": label,
            "confidence": conf,
            "probs": {idx_to_label[i]: float(p) for i, p in enumerate(probs)}  # optional
        })

    except Exception as e:
        print("❌ Prediction error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json  # received from frontend
    label = data.get("label")
    samples = data.get("samples")
    link = data.get("link")

    # Ensure dataset folder exists
    os.makedirs(f"dataset/{label}", exist_ok=True)

    # Unique file name for the sample
    from datetime import datetime

    filename = f"dataset/{label}/{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    # Save the sample file
    with open(filename, "w") as f:
        json.dump(samples, f)

    # ---- Metadata handling ----
    os.makedirs("metadata", exist_ok=True)
    metadata_file = "metadata/links.json"

    # Load existing metadata if available
    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
    else:
        metadata = {}

    # Only add new label if it does not exist already
    if label not in metadata:
        metadata[label] = [link]

        # Save updated metadata (only when new label is added)
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=4)
    
    socketio.emit('dataset_updated', {'label': label, 'file': filename})
    return jsonify({
        "status": "success",
        "file": filename,
        "metadata_file": metadata_file
    })

DATASET_DIR = "dataset"
METADATA_FILE = "metadata/links.json"

@app.route("/list_words", methods=["GET"])
def list_words():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            metadata = json.load(f)
    else:
        metadata = {}

    # Return as list of objects: [{ "label": ..., "link": ... }]
    words = [{"label": label, "link": links[0] if links else None} for label, links in metadata.items()]
    print("words ", words)
    return jsonify(words)

@app.route("/list_samples/<word>", methods=["GET"])
def list_samples(word):
    word_dir = os.path.join(DATASET_DIR, word)
    if not os.path.exists(word_dir):
        return jsonify([])

    samples = [f for f in os.listdir(word_dir) if f.endswith(".json")]
    return jsonify(samples)

@app.route("/get_sample/<word>/<filename>", methods=["GET"])
def get_sample(word, filename):
    filepath = os.path.join(DATASET_DIR, word, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404
    
    with open(filepath, "r") as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/count_samples", methods=["GET"])
def count_samples():
    counts = {}
    if os.path.exists(DATASET_DIR):
        for label in os.listdir(DATASET_DIR):
            label_path = os.path.join(DATASET_DIR, label)
            if os.path.isdir(label_path):
                counts[label] = len(os.listdir(label_path))  # count JSON files per word
    return jsonify(counts)

@app.route("/add_label", methods=["POST"])
def add_label():
    data = request.json
    label = data.get("label")
    link = data.get("link")

    if not label or not link:
        return jsonify({"error": "Both 'label' and 'link' are required"}), 400

    # Ensure metadata folder exists
    os.makedirs("metadata", exist_ok=True)
    metadata_file = "metadata/links.json"

    # Load existing metadata
    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
    else:
        metadata = {}

    # Add or update label with link
    if label in metadata:
        if link not in metadata[label]:
            metadata[label].append(link)
    else:
        metadata[label] = [link]

    # Save metadata
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=4)

    return jsonify({
        "status": "success",
        "label": label,
        "links": metadata[label]
    })

@app.route("/get-dataset-videos")
def get_dataset_videos():
    json_path = os.path.join(os.path.dirname(__file__), "../metadata/links.json")
    with open(json_path, 'r') as f:
        dataset = json.load(f)
    return jsonify(dataset)


if __name__ == '__main__':
    socketio.run(app,host="0.0.0.0", debug=True, port=5000)