from flask import Flask, render_template, session, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'bewr_prompter'
socketio = SocketIO(app)

# A dictionary to store the state data
state = {}

@app.route('/save_state', methods=['POST'])
def save_state():
    global state
    state = request.get_json()
    return jsonify({'result': 'success'})

@app.route('/load_state', methods=['GET'])
def load_state():
    return jsonify(state)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('text_updated')
def handle_text_update(data):
    session['text'] = data['text']
    session['fontSize'] = data['fontSize']
    session['scrollTop'] = data['scrollTop']
    session['isPlaying'] = data['isPlaying']
    session['speed'] = data['speed']
    emit('update_text', data, broadcast=True)

@socketio.on('request_initial_state')
def handle_initial_state():
    if 'text' in session:
        emit('update_text', {
            'text': session['text'],
            'fontSize': session['fontSize'],
            'scrollTop': session['scrollTop'],
            'isPlaying': session['isPlaying'],
            'speed': session['speed']
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    # socketio.run(app)
