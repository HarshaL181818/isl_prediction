import tensorflow as tf

# List all physical devices detected by TensorFlow
physical_devices = tf.config.list_physical_devices('GPU')
print("Physical devices detected:", physical_devices)

# If GPUs are found, try to print detailed information
if physical_devices:
    logical_devices = tf.config.list_logical_devices('GPU')
    print("Logical devices:", logical_devices)
else:
    print("No GPUs detected.")
