



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

MODEL_PATH = 'backend/model/isl_bilstm_model_v2.h5'
ENCODER_PATH = 'backend/model/label_encoder_v2.pkl'
MAX_FRAMES = 117
FEATURE_DIM = 225

model = load_model(MODEL_PATH)
with open(ENCODER_PATH, 'rb') as f:
    label_encoder = pickle.load(f)

mp_holistic = mp.solutions.holistic

def extract_sequence_from_video(video_path, max_frames=110):
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
    dataset_dir = 'backend/isl_datav2'
    dataset = {}

    for label in os.listdir(dataset_dir):
        label_path = os.path.join(dataset_dir, label)
        if os.path.isdir(label_path):
            videos = os.listdir(label_path)
            dataset[label] = [f"data/{label}/{vid}" for vid in videos if vid.lower().endswith(('.mp4', '.mov'))]

    return jsonify(dataset)

@app.route('/predict-live', methods=['POST'])
def predict_live():
    print("Received files:", request.files)
    print("Received form data:", request.form)

    if 'video' not in request.files:
        return jsonify({'error': 'No video uploaded'}), 400

    video = request.files['video']
    from datetime import datetime
    filename = datetime.now().strftime("%Y%m%d%H%M%S_") + secure_filename(video.filename)

    video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    video.save(video_path)
    
    # Log video information
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps > 0 else 0
    
    print(f"Video info - Filename: {filename}")
    print(f"Video info - Resolution: {width}x{height}")
    print(f"Video info - Frame count: {frame_count}")
    print(f"Video info - FPS: {fps:.2f}")
    print(f"Video info - Duration: {duration:.2f} seconds")
    cap.release()

    # Extract keypoints from the saved video
    sequence = extract_sequence_from_video(video_path, max_frames=110)
    
    # Log sequence information
    print(f"Extracted sequence length: {sequence.shape[0]} frames")
    print(f"Features per frame: {sequence.shape[1] if sequence.size > 0 else FEATURE_DIM}")

    if sequence.size == 0:
        print("Warning: No frames extracted, using zero sequence")
        sequence = np.zeros((MAX_FRAMES, FEATURE_DIM))
    elif sequence.shape[0] < MAX_FRAMES:
        pad_len = MAX_FRAMES - sequence.shape[0]
        print(f"Padding sequence with {pad_len} zero frames")
        sequence = np.vstack((sequence, np.zeros((pad_len, FEATURE_DIM))))
    else:
        print(f"Truncating sequence to {MAX_FRAMES} frames")
        sequence = sequence[:MAX_FRAMES]

    sequence = np.expand_dims(sequence, axis=0)
    prediction = model.predict(sequence)
    predicted_label = label_encoder.inverse_transform([np.argmax(prediction)])[0]
    confidence = float(np.max(prediction))
    
    print(f"Prediction result: {predicted_label} (confidence: {confidence:.4f})")

    return jsonify({'predicted_label': predicted_label, 'confidence': confidence})



@app.route('/predict-frames', methods=['POST'])
def predict_frames():
    """
    Process frames sent directly from the frontend and make a prediction.
    Expects a multipart/form-data request with:
    - Multiple 'frame_X' files (JPEG images)
    - 'frame_count' field indicating total number of frames
    """
    import time
    request_id = int(time.time() * 1000)  # Generate unique ID for tracking this request
    print(f"[{request_id}] Received frame prediction request")
    
    try:
        # Get frame count
        frame_count = int(request.form.get('frame_count', '0'))
        if frame_count == 0:
            return jsonify({'error': 'No frames provided'}), 400
        
        print(f"[{request_id}] Processing {frame_count} frames")
        
        # Get all frames
        frames = []
        for i in range(frame_count):
            frame_key = f'frame_{i}'
            if frame_key in request.files:
                file = request.files[frame_key]
                # Convert file to numpy array
                nparr = np.frombuffer(file.read(), np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    frames.append(img)
        
        if not frames:
            return jsonify({'error': 'Could not decode any frames'}), 400
            
        print(f"[{request_id}] Successfully decoded {len(frames)} frames")
        
        # Process the frames through MediaPipe to extract landmarks
        sequence = extract_landmarks_from_frames(frames, max_frames=MAX_FRAMES)
        
        # Log extracted sequence information
        print(f"[{request_id}] Extracted sequence shape: {sequence.shape if sequence.size > 0 else '(0, 0)'}")
        
        # Make prediction
        if sequence.size == 0:
            print(f"[{request_id}] Warning: No landmarks extracted, using zero sequence")
            sequence = np.zeros((MAX_FRAMES, FEATURE_DIM))
        elif sequence.shape[0] < MAX_FRAMES:
            pad_len = MAX_FRAMES - sequence.shape[0]
            print(f"[{request_id}] Padding sequence with {pad_len} zero frames")
            sequence = np.vstack((sequence, np.zeros((pad_len, FEATURE_DIM))))
        else:
            print(f"[{request_id}] Using first {MAX_FRAMES} frames of sequence")
            sequence = sequence[:MAX_FRAMES]
        
        # Ensure sequence is properly shaped for model input
        sequence = np.expand_dims(sequence, axis=0)
        
        # Run prediction
        print(f"[{request_id}] Running model prediction...")
        prediction_start = time.time()
        prediction = model.predict(sequence, verbose=0)  # Set verbose=0 to reduce console output
        prediction_time = time.time() - prediction_start
        
        import re

        predicted_index = np.argmax(prediction)
        predicted_label = label_encoder.inverse_transform([predicted_index])[0]
        # Replace 'paper' or 'Paper' with 'Letter'
        predicted_label = re.sub(r'(?i)paper', 'Letter', predicted_label)
        # Remove digits from the label
        predicted_label = re.sub(r'\d+', '', predicted_label)
        confidence = float(np.max(prediction))

        
        print(f"[{request_id}] Prediction completed in {prediction_time:.2f}s: {predicted_label} (confidence: {confidence:.4f})")
        
        # Return the prediction result
        return jsonify({
            'predicted_label': predicted_label,
            'confidence': confidence,
            'request_id': request_id
        })
        
    except Exception as e:
        import traceback
        print(f"[{request_id}] Error processing frames: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Error processing frames: {str(e)}'}), 500

def extract_landmarks_from_frames(frames, max_frames=110):
    """
    Extract landmarks from a list of frame images using MediaPipe.
    
    Args:
        frames: List of OpenCV image arrays
        max_frames: Maximum number of frames to process
    
    Returns:
        numpy array of shape (n_frames, n_features) containing the landmarks
    """
    sequence = []
    
    with mp_holistic.Holistic(
        static_image_mode=False,
        min_detection_confidence=0.5,
        model_complexity=1
    ) as holistic:
        for frame in frames[:max_frames]:
            # Convert to RGB for MediaPipe
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process frame
            results = holistic.process(image)
            
            # Extract landmarks
            pose = results.pose_landmarks.landmark if results.pose_landmarks else []
            lh = results.left_hand_landmarks.landmark if results.left_hand_landmarks else []
            rh = results.right_hand_landmarks.landmark if results.right_hand_landmarks else []
            
            keypoints = []
            
            # Process pose (33 landmarks)
            if pose:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in pose])
            else:
                keypoints.extend([[0, 0, 0]] * 33)
            
            # Process left hand (21 landmarks)
            if lh:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in lh])
            else:
                keypoints.extend([[0, 0, 0]] * 21)
            
            # Process right hand (21 landmarks)
            if rh:
                keypoints.extend([[lm.x, lm.y, lm.z] for lm in rh])
            else:
                keypoints.extend([[0, 0, 0]] * 21)
            
            # Add flattened keypoints to sequence
            sequence.append(np.array(keypoints).flatten())
    
    return np.array(sequence)



@app.route('/data/<label>/<video>')
def serve_video(label, video):
    return send_from_directory(os.path.join('isl_datav2', label), video)

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
    app.run(debug=True, threaded=True)