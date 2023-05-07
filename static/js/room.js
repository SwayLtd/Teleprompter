// Establish a connection with the server
const socket = io.connect('http://' + document.domain + ':' + location.port);
// Get the room_id from the URL (assuming it's in the format /room/<room_id>)
const room_id = window.location.pathname.split('/')[2];

let isPlaying = false;
let autoScrollInterval;

// When the socket connects to the server, print a message to the console
socket.on('connect', () => {
    socket.emit('join_room', { 'room_id': room_id });
    console.log('Connected to room', room_id);
});

// When the server sends an 'update_properties' event
socket.on('update_properties', data => {
    if (data['room_id'] === room_id) {
        if (data['text'] !== $('#sync-text').html() && data['text'] !== undefined) {
            $('#sync-text').html(data['text']);
        }
        if (data['fontSize'] !== parseInt($('#sync-text').css('font-size')) && data['fontSize'] !== undefined) {
            $('#sync-text').css('font-size', data['fontSize'] + 'px');
            $('#font-size').val(data['fontSize']);
            $('#font-size-value').text(data['fontSize'] + 'px');
        }
        if (data['velocity'] !== getVelocity() && data['velocity'] !== undefined) {
            $('#velocity').val(data['velocity'] * 10);
            $('#velocity-value').text(data['velocity'] * 100 + '%');
        }
        if (data['scrollTop'] !== $('#sync-text').scrollTop() && data['scrollTop'] !== undefined) {
            $('#sync-text').scrollTop(data['scrollTop']);
        }
        if (data['isPlaying'] !== isPlaying && data['isPlaying'] !== undefined) {
            isPlaying = data['isPlaying'];
            $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
            toggleAutoScroll();
        }
        if (data['room_name'] !== $('#room-name').text().trim() && data['room_name'] !== undefined) {
            $('#room-name').text(data['room_name']);
            document.title = data['room_name'] + " - R's prompter";
        }
    }
});

$('#room-name').on('input', () => {
    updateAndSave({ 'room_name': $('#room-name').text().trim() });
    document.title = $('#room-name').text().trim() + " - R's prompter";
});

$('#sync-text').on('input', () => {
    updateAndSave({ 'text': $('#sync-text').html() });
});

// Update the font size label when the font size slider is changed
$('#font-size').on('input', () => {
    let fontSize = $('#font-size').val();
    $('#font-size-value').text(fontSize + 'px');
    $('#sync-text').css('font-size', fontSize + 'px');
    updateAndSave({ 'fontSize': fontSize });
});

// Update the velocity label when the velocity slider is changed
$('#velocity').on('input', () => {
    $('#velocity-value').text(getVelocity() * 100 + '%');
    updateAndSave({ 'velocity': getVelocity() });
});

// When the play/pause button is clicked, toggle the auto-scrolling state and send the updated settings to the server
$('#play-pause').on('click', () => {
    isPlaying = !isPlaying;
    $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
    if (window.matchMedia("(max-width: 426px)")) {
        updateAndSave({ 'isPlaying': isPlaying, 'velocity': getVelocity() });
    } else {
        updateAndSave({ scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'velocity': getVelocity() });
    }
    toggleAutoScroll();
});

// Show the color picker when the "Text Color" button is clicked
function formatText(command) {
    if (command === 'foreColor') {
        document.getElementById('colorPicker').click();
    } else {
        document.execCommand(command, false, null);
    }
}

// Change the color inside the text editor
function changeColor() {
    const colorPicker = document.getElementById('colorPicker');
    const selectedColor = colorPicker.value;
    document.execCommand('foreColor', false, selectedColor);
}

// When the text color picker is changed, update the text color in the UI and save it to local storage
// $('#text-color').on('input', () => {
//     const textColor = $('#text-color').val();
//     $('body').css('color', textColor);
//     $('#sync-text').css('color', textColor);
//     localStorage.setItem('textColor', textColor);
// });

// When the background color picker is changed, update the background color in the UI and save it to local storage
$('#bg-color').on('input', () => {
    const bgColor = $('#bg-color').val();
    $('body').css('background-color', bgColor);
    localStorage.setItem('bgColor', bgColor);
});

// When the alignment button is clicked, toggle the text alignment and save it to local storage
$('#toggle-align').click(() => {
    const textAlign = $('#sync-text').css('text-align');

    let newTextAlign;
    let iconClass;

    if (textAlign === 'left') {
        newTextAlign = 'center';
        iconClass = 'fas fa-align-center';
    } else if (textAlign === 'center') {
        newTextAlign = 'right';
        iconClass = 'fas fa-align-right';
    } else if (textAlign === 'right') {
        newTextAlign = 'left';
        iconClass = 'fas fa-align-left';
    }

    $('#sync-text').css('text-align', newTextAlign);
    $('#toggle-align i').attr('class', iconClass);

    // save local state of the text alignment to the local browser storage
    localStorage.setItem('textAlign', newTextAlign);
});

// Invert the text vertically and save it to local storage
$('#invert-v').click(() => {
    let scaleY = parseFloat($('#sync-text').css('transform').split(',')[3]);
    let scaleX = parseFloat($('#sync-text').css('transform').split(',')[0].split('(')[1]);
    scaleY = scaleY === 1 ? -1 : 1;
    $('#sync-text').css('transform', `scaleX(${scaleX}) scaleY(${scaleY})`);

    localStorage.setItem('textOrientation', `scaleX(${scaleX}) scaleY(${scaleY})`);
});

// Invter the text horizontally and save it to local storage
$('#invert-h').click(() => {
    let scaleY = parseFloat($('#sync-text').css('transform').split(',')[3]);
    let scaleX = parseFloat($('#sync-text').css('transform').split(',')[0].split('(')[1]);
    scaleX = scaleX === 1 ? -1 : 1;
    $('#sync-text').css('transform', `scaleX(${scaleX}) scaleY(${scaleY})`);

    localStorage.setItem('textOrientation', `scaleX(${scaleX}) scaleY(${scaleY})`);
});

// Reset all local storage values to their defaults
$('#reset').click(() => {
    $('#sync-text').css('transform', 'scaleX(1) scaleY(1)');
    $('#sync-text').css('text-align', 'center');
    $('#toggle-align i').attr('class', 'fas fa-align-center');
    // text-color to #61dafb and background-color to #282c34
    // $('#text-color').val('#61dafb');
    $('#bg-color').val('#282c34');
    $('#sync-text').css('color', '#61dafb');
    $('body').css('color', '#61dafb');
    $('body').css('background-color', '#282c34');
    // reset sync text width and arrows position
    $('#sync-text-width').val(90);
    $('#sync-text').width('90%');
    $('.arrow-left').css('right', '0');
    $('.arrow-right').css('left', '0');
    $('#sync-text-width-value').text('90%');
    localStorage.clear();
});

// Change the sync text with and update the arrows position
$('#sync-text-width').on('input', function () {
    const syncText = $('#sync-text');
    syncText.width($(this).val() + '%');
    const arrowPosition = ((100 - parseInt($(this).val())) / 2) - 5;

    // Change the arrow positions
    $('.arrow-left').css('right', arrowPosition + '%');
    $('.arrow-right').css('left', arrowPosition + '%');

    $('#sync-text-width-value').text($(this).val() + '%');

    localStorage.setItem('syncTextWidth', $(this).val());
});

// Shortcuts
window.addEventListener('keydown', function (e) {
    // Ignore keydown events if the target is the #sync-text area
    if (e.target === document.querySelector('#sync-text') || e.target === document.querySelector('#room-name')) {
        return;
    }

    // condition with ctrlKey and s in lowercase and uppercase
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        // Save state
        e.preventDefault()
        let fontSize = parseInt($('#sync-text').css('font-size'));
        updateAndSave({ fontSize: fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'velocity': getVelocity(), room_name: $('#room-name').text().trim() });
    } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        // Toggle play/pause
        e.preventDefault()
        isPlaying = !isPlaying;
        $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
        updateAndSave({ scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'velocity': getVelocity() });
        toggleAutoScroll();
    } else if (e.key === 'ArrowUp') {
        // Increase velocity
        e.preventDefault()
        let velocity = getVelocity();
        if (velocity < 1) {
            velocity += 0.1;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
        }
    } else if (e.key === 'ArrowDown') {
        // Decrease velocity
        e.preventDefault()
        let velocity = getVelocity();
        if (velocity > 0.1) {
            velocity -= 0.1;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
        }
    }
    else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // decrease font size
        let fontSize = parseInt($('#sync-text').css('font-size'));
        console.log(fontSize);
        if (fontSize > 45) {
            fontSize -= 1;
            $('#font-size').val(fontSize);
            $('#font-size-value').text(fontSize + 'px');
            $('#sync-text').css('font-size', fontSize + 'px');
            updateAndSave({ 'fontSize': fontSize });
        }
    }
    else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // increase font size
        let fontSize = parseInt($('#sync-text').css('font-size'));
        console.log(fontSize);
        if (fontSize < 72) {
            fontSize += 1;
            $('#font-size').val(fontSize);
            $('#font-size-value').text(fontSize + 'px');
            $('#sync-text').css('font-size', fontSize + 'px');
            updateAndSave({ 'fontSize': fontSize });
        }
    }
});

// Wheel event listener
window.addEventListener('wheel', (e) => {
    // Increase/decrease velocity with the mouse wheel while holding alt
    if (e.altKey) {
        if (e.deltaY > 0) {
            // decrease velocity
            let velocity = getVelocity();
            if (velocity > 0.1) {
                velocity -= 0.1;
                $('#velocity').val(velocity * 10);
                $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
                updateAndSave({ 'velocity': getVelocity() });
            }
        } else {
            // increase velocity
            let velocity = getVelocity();
            if (velocity < 1) {
                velocity += 0.1;
                $('#velocity').val(velocity * 10);
                $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
                updateAndSave({ 'velocity': getVelocity() });
            }
        }
        // Increase/decrease font size with the mouse wheel while holding shift
    } else if (e.shiftKey) {
        if (e.deltaY > 0) {
            // decrease font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize > 45) {
                fontSize -= 1;
                console.log(fontSize);
                $('#font-size').val(fontSize);
                $('#font-size-value').text(fontSize + 'px');
                $('#sync-text').css('font-size', fontSize + 'px');
                updateAndSave({ 'fontSize': fontSize });
            }
        } else {
            // increase font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize < 72) {
                fontSize += 1;
                console.log(fontSize);
                $('#font-size').val(fontSize);
                $('#font-size-value').text(fontSize + 'px');
                $('#sync-text').css('font-size', fontSize + 'px');
                updateAndSave({ 'fontSize': fontSize });
            }
        }
    }
});

// Prevent scrolling when playing
document.querySelector('#sync-text').addEventListener('wheel', (e) => {
    if (isPlaying) {
        e.preventDefault();
    }
});

// Calculate velocity
function getVelocity() {
    return parseFloat($('#velocity').val()) / 10;
}

// Toggle the automatic scroll based on velocity and font size
function toggleAutoScroll() {
    if (isPlaying) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            const velocity = getVelocity();
            const fontSize = parseInt($('#sync-text').css('font-size'));
            const scrollTop = $('#sync-text').scrollTop();
            $('#sync-text').scrollTop(scrollTop + velocity * fontSize / 5.62);
        }, 25);
    } else {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Save the state of the app to the server
function updateAndSave(properties) {
    socket.emit('properties_updated', { 'room_id': room_id, ...properties });
    const state = {
        fontSize: $('#font-size').val(),
        velocity: getVelocity(),
        isPlaying: isPlaying,
        text: $('#sync-text').html(),
        scrollTop: $('#sync-text').scrollTop(),
        room_id: room_id,
        room_name: $('#room-name').text().trim()
    };

    $.ajax({
        url: '/save_state',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(state),
        success: function (response) {
            console.log('State saved successfully:', response);
        },
        error: function (error) {
            console.error('Error saving state:', error);
        }
    });
}

// Load the state of the app from the server
function loadState() {
    $.ajax({
        url: '/load_state',
        method: 'GET',
        data: { 'room_id': room_id },
        success: function (state) {
            if (state) {
                $('#sync-text').html(state.text || '\n\n\n\n\n\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\n\n\n\n\n');
                $('#sync-text').css('font-size', (state.fontSize || 45) + 'px');
                $('#font-size-value').text((state.fontSize || 45) + 'px');
                $('#font-size').val(state.fontSize || 45);
                $('#velocity').val(((state.velocity || 0.1) * 10));
                $('#velocity-value').text((state.velocity || 0.1) * 100 + '%');
                $('#sync-text').scrollTop(state.scrollTop + 200 || 0); // + 200 is needed?
                isPlaying = (typeof state.isPlaying !== 'undefined') ? state.isPlaying : false;
                $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
                toggleAutoScroll();
                $('#room-name').text(state.room_name || 'Unnamed Room');
                document.title = state.room_name + " - R's prompter" || 'Unnamed Room' + " - R's prompter";
            } else {
                $('#sync-text').html('\n\n\n\n\n\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\n\n\n\n\n');
                $('#sync-text').css('font-size', '45px');
                $('#font-size-value').text('45px');
                $('#font-size').val(45);
                $('#velocity').val(1); // 0.3 * 10
                $('#velocity-value').text(10 + '%');
                $('#sync-text').scrollTop(0);
                isPlaying = false;
                $('#play-pause').html('<i class="fas fa-play"></i>');
                $('#room-name').text('Unnamed Room');
            }
        },
        error: function (error) {
            console.error('Error loading state:', error);
        }
    });
}

// Load the state of the app from local storage
function loadLocalStorage() {
    const savedTextColor = localStorage.getItem('textColor');
    const savedBgColor = localStorage.getItem('bgColor');
    const savedTextAlign = localStorage.getItem('textAlign');
    const savedTextOrientation = localStorage.getItem('textOrientation');
    const savedSyncTextWidth = localStorage.getItem('syncTextWidth');

    // if (savedTextColor) {
    //     $('#text-color').val(savedTextColor);
    //     $('#sync-text').css('color', savedTextColor);
    //     $('body').css('color', savedTextColor);
    // }

    if (savedBgColor) {
        $('#bg-color').val(savedBgColor);
        $('body').css('background-color', savedBgColor);
    }

    if (savedTextAlign) {
        $('#sync-text').css('text-align', savedTextAlign);
        iconClass = 'fas fa-align-' + savedTextAlign;
        $('#toggle-align i').attr('class', iconClass);
    }

    if (savedTextOrientation) {
        $('#sync-text').css('transform', savedTextOrientation);
    }

    if (savedSyncTextWidth) {
        const syncText = $('#sync-text');
        syncText.width(savedSyncTextWidth + '%');
        const arrowPosition = ((100 - parseInt(savedSyncTextWidth)) / 2) - 5;

        // Change the arrow positions
        $('.arrow-left').css('right', arrowPosition + '%');
        $('.arrow-right').css('left', arrowPosition + '%');
        $('#sync-text-width').val(savedSyncTextWidth);
        $('#sync-text-width-value').text(savedSyncTextWidth + '%');
    }
}

// Initialize font size, velocity and the sync text width labels
$('#font-size-value').text($('#font-size').val() + 'px');
$('#velocity-value').text(getVelocity() * 100 + '%');
$('#sync-text-width-value').text($('#sync-text-width').val() + '%');

// Initialize settings
loadState(); // Load state from the server
loadLocalStorage(); // Load state from the local browser storage