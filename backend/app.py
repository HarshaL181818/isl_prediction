
import os
from backend.agents.sentenceGenerator import SentenceGeneratorAgent
from flask import Flask, request, jsonify
from flask import send_from_directory
import cv2
import numpy as np
import pickle
from tensorflow.keras.models import load_model
import tensorflow as tf
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
from flask_socketio import SocketIO

socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'backend/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pickle
import numpy as np
from tensorflow.keras.models import load_model
from collections import deque
import json
app = Flask(__name__)
CORS(app)

# -------------------
# Config
# -------------------
MODEL_PATH = 'backend/model/sign_model_v6.h5'
ENCODER_PATH = 'backend/model/label_encoder_v6.pkl'
MAX_FRAMES = 50
FEATURE_DIM = 225  # 21*3 + 21*3 + 33*3

# -------------------
# Load model & encoder
# -------------------
model = load_model(MODEL_PATH)
with open(ENCODER_PATH, 'rb') as f:
    le = pickle.load(f)

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




def normalize_landmarks(left, right, pose):
    left_coords = [0.0] * 63
    right_coords = [0.0] * 63
    pose_coords = [0.0] * 99

    # Pose normalization
    if pose:
        try:
            lx, ly, lz = pose[11]["x"], pose[11]["y"], pose[11]["z"]
            rx, ry, rz = pose[12]["x"], pose[12]["y"], pose[12]["z"]
            cx, cy, cz = (lx + rx) / 2, (ly + ry) / 2, (lz + rz) / 2
            shoulder_dist = np.sqrt((rx - lx) ** 2 + (ry - ly) ** 2 + (rz - lz) ** 2)
            if shoulder_dist == 0:
                shoulder_dist = 1e-6
            pose_coords = [((lm["x"] - cx) / shoulder_dist,
                            (lm["y"] - cy) / shoulder_dist,
                            (lm["z"] - cz) / shoulder_dist) for lm in pose]
            pose_coords = [v for lm in pose_coords for v in lm]
        except Exception:
            pass

    # Left hand normalization
    if left:
        try:
            wrist = left[0]
            wx, wy, wz = wrist["x"], wrist["y"], wrist["z"]
            left_coords = [(lm["x"] - wx, lm["y"] - wy, lm["z"] - wz) for lm in left]
            left_coords = [v for lm in left_coords for v in lm]
        except Exception:
            pass

    # Right hand normalization
    if right:
        try:
            wrist = right[0]
            wx, wy, wz = wrist["x"], wrist["y"], wrist["z"]
            right_coords = [(lm["x"] - wx, lm["y"] - wy, lm["z"] - wz) for lm in right]
            right_coords = [v for lm in right_coords for v in lm]
        except Exception:
            pass

    return left_coords, right_coords, pose_coords

@app.route("/predict", methods=["POST"])
def predict():
    try:
        json_data = request.get_json()
        sequence_data = json_data.get('data', [])

        if not sequence_data or len(sequence_data) != MAX_FRAMES:
            return jsonify({"error": f"Invalid data: sequence must have length {MAX_FRAMES}"}), 400

        processed_sequence = []
        for frame in sequence_data:
            left = frame.get("left", [])
            right = frame.get("right", [])
            pose = frame.get("pose", [])
            left_coords, right_coords, pose_coords = normalize_landmarks(left, right, pose)
            features = left_coords + right_coords + pose_coords
            processed_sequence.append(features)

        model_input = np.array(processed_sequence)
        model_input = np.expand_dims(model_input, axis=0) # (1, 50, 225)

        prediction = model.predict(model_input)[0]
        predicted_class_index = np.argmax(prediction)
        predicted_label = le.inverse_transform([predicted_class_index])[0]
        confidence = float(np.max(prediction))

        return jsonify({
            "prediction": predicted_label,
            "confidence": confidence
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": "An error occurred during prediction."}), 500


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