from flask import Flask, render_template, session, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
import random, string

# Initialize Flask app and SocketIO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'bewr_prompter'
socketio = SocketIO(app)

# A dictionary to store the state data
room_state = {}

# Function to generate a random ID with a default length of 11
def generate_random_id(length=11):
    allowed_chars = string.ascii_letters + string.digits + '-_'
    return ''.join(random.choice(allowed_chars) for _ in range(length))

# Route for the creation of a new room
@app.route('/')
def index():
    return render_template('index.html')

# Route to create a new room
@app.route('/create_room', methods=['POST'])
def create_room():
    room_name = request.form.get('room_name', '').strip()
    room_id = generate_random_id()
    room_state[room_id] = {'room_name': room_name}
    return jsonify({'redirect_url': url_for('room', room_id=room_id)})

# Route to join a specific room
@app.route('/r/<room_id>')
def room(room_id):
    if room_id not in room_state:
        return redirect(url_for('room_not_found'))
    room_name = room_state[room_id].get('room_name', 'Unnamed Room') # TO DO - Fix the "Unnamed Room" bug when I reset the local settings
    return render_template('room.html', room_id=room_id, room_name=room_name)

# Socket event when a user joins a room
@socketio.on('join_room')
def on_join(data):
    room_id = data['room_id']
    join_room(room_id)
    if room_id in room_state:
        emit('update_text', room_state[room_id])

# Route for the 404 page
@app.route('/notfound')
def room_not_found():
    return render_template('errors/404.html'), 404

@app.route('/save_state', methods=['POST'])
def save_state():
    state_data = request.get_json()
    room_id = state_data['room_id']
    room_name = state_data.get('room_name', '').strip()  # Get the room_name if it exists in state_data
    if room_name:
        room_state[room_id]['room_name'] = room_name  # Update the room_name in room_state
    room_state[room_id] = state_data
    return jsonify({'result': 'success'})


# Route to load the state of a room
@app.route('/load_state', methods=['GET'])
def load_state():
    room_id = request.args.get('room_id')
    if room_id in room_state:
        return jsonify(room_state[room_id])
    else:
        return jsonify({})

@socketio.on('text_updated')
def handle_text_update(data):
    room_id = data['room_id']
    room_name = data.get('room_name', None)  # Get the room_name if it exists in data
    if room_name is not None:
        room_name = room_name.strip()
        data['room_name'] = room_name
    room_state[room_id] = data
    emit('update_text', data, room=room_id, include_self=False)

# Socket event when a user requests the initial state of a room
@socketio.on('request_initial_state')
def handle_initial_state(data):
    room_id = data['room_id']
    if room_id in room_state:
        emit('update_text', room_state[room_id])

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    # socketio.run(app)
