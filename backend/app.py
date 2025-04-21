import os
from backend.agents.sentenceGenerator import SentenceGeneratorAgent
from flask import Flask, request, jsonify
from flask import send_from_directory
import cv2
import numpy as np
import pickle
from tensorflow.keras.models import load_model
import mediapipe as mp
import tensorflow as tf
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

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

MODEL_PATH = 'backend/model/isl_bilstm_model_v1.h5'
ENCODER_PATH = 'backend/model/label_encoder_v1.pkl'
MAX_FRAMES = 117
FEATURE_DIM = 225

model = load_model(MODEL_PATH)
with open(ENCODER_PATH, 'rb') as f:
    label_encoder = pickle.load(f)

mp_holistic = mp.solutions.holistic

def extract_sequence_from_video(video_path, max_frames=117):
    sequence = []
    cap = cv2.VideoCapture(video_path)

    with mp_holistic.Holistic(static_image_mode=False, min_detection_confidence=0.5, model_complexity=1) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = holistic.process(image)

            pose = results.pose_landmarks.landmark if results.pose_landmarks else []
            lh = results.left_hand_landmarks.landmark if results.left_hand_landmarks else []
            rh = results.right_hand_landmarks.landmark if results.right_hand_landmarks else []

            keypoints = []

            if pose:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in pose])
            else:
                keypoints.extend([[0, 0, 0]] * 33)

            if lh:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in lh])
            else:
                keypoints.extend([[0, 0, 0]] * 21)

            if rh:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in rh])
            else:
                keypoints.extend([[0, 0, 0]] * 21)

            sequence.append(np.array(keypoints).flatten())

        cap.release()

    return np.array(sequence)

@app.route('/predict-sign', methods=['POST'])
def predict_sign():
    if 'video' not in request.files:
        return jsonify({'error': 'No video uploaded'}), 400

    video = request.files['video']
    filename = secure_filename(video.filename)
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    video.save(video_path)

    sequence = extract_sequence_from_video(video_path, max_frames=MAX_FRAMES)

    if sequence.size == 0:
        sequence = np.zeros((MAX_FRAMES, FEATURE_DIM))
    elif sequence.shape[0] < MAX_FRAMES:
        pad_len = MAX_FRAMES - sequence.shape[0]
        sequence = np.vstack((sequence, np.zeros((pad_len, FEATURE_DIM))))
    else:
        sequence = sequence[:MAX_FRAMES]

    sequence = np.expand_dims(sequence, axis=0)
    prediction = model.predict(sequence)
    predicted_label = label_encoder.inverse_transform([np.argmax(prediction)])[0]

    return jsonify({'label': predicted_label})

@app.route('/get-dataset-videos')
def get_dataset_videos():
    dataset_dir = 'backend/isl_data'
    dataset = {}

    for label in os.listdir(dataset_dir):
        label_path = os.path.join(dataset_dir, label)
        if os.path.isdir(label_path):
            videos = os.listdir(label_path)
            dataset[label] = [f"data/{label}/{vid}" for vid in videos if vid.endswith(('.mp4', '.MOV', '.mov'))]

    return jsonify(dataset)


@app.route('/data/<label>/<video>')
def serve_video(label, video):
    return send_from_directory(os.path.join('isl_data', label), video)

@app.route('/generate_context', methods=['POST'])
def generate_context():
    words = request.form.get('words') 
    print(words)
    sentence = SentenceGeneratorAgent()
    results = sentence.generate(words)

    import tensorflow as tf
    print("GPUs detected:", tf.config.list_physical_devices('GPU'))

    return {'generated_sentence': results}


if __name__ == '__main__':
    app.run(debug=True)
