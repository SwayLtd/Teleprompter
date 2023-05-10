// Establish a connection with the server
const protocol = location.protocol == 'https:' ? 'https' : 'http';
const socket = io.connect(protocol + '://' + document.domain + ':' + location.port);
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
        if (data['room_name'] !== $('#room-name').text().trim() && data['room_name'] !== undefined) {
            $('#room-name').text(data['room_name']);
            document.title = data['room_name'] + " - R's prompter";
        }
        if (data['isPlaying'] !== isPlaying && data['isPlaying'] !== undefined) {
            isPlaying = data['isPlaying'];
            $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
            toggleAutoScroll();
        }
        if (data['scrollTop'] !== $('#sync-text').scrollTop() && data['scrollTop'] !== undefined) {
            $('#sync-text').scrollTop(data['scrollTop']);
        }
        if (data['velocity'] !== getVelocity() && data['velocity'] !== undefined) {
            $('#velocity').val(data['velocity'] * 10);
            $('#velocity-value').text((data['velocity'] * 100).toFixed(0) + '%');
        }
        if (data['fontSize'] !== parseInt($('#sync-text').css('font-size')) && data['fontSize'] !== undefined) {
            $('#sync-text').css('font-size', data['fontSize'] + 'px');
            $('#font-size').val(data['fontSize']);
            $('#font-size-value').text(data['fontSize'] + 'px');
        }
        if (data['textWidth'] !== parseInt($('#text-width').val()) && data['textWidth'] !== undefined) {
            $('#sync-text').css('width', data['textWidth'] + '%');
            $('#text-width').val(data['textWidth']);
            $('#text-width-value').text(data['textWidth'] + '%');
            // Change the arrow positions
            const arrowWidthPosition = ((100 - parseInt(data['textWidth'])) / 2) - 5;
            $('.arrow-left').css('right', arrowWidthPosition + '%');
            $('.arrow-right').css('left', arrowWidthPosition + '%');
        }
        if (data['arrowTop'] !== parseInt($('arrows-top').val()) && data['arrowTop'] !== undefined) {
            $('.arrow-left').css('top', data['arrowTop'] + '%');
            $('.arrow-right').css('top', data['arrowTop'] + '%');
            $('#arrows-top').val(data['arrowTop']);
            $('#arrows-top-value').text(data['arrowTop'] + '%');
        }
    }
});

// Text synchronization and sending scroll position to the server to the the editing
$('#sync-text').on('input', () => {
    updateAndSave({ 'text': $('#sync-text').html(), 'scrollTop': $('#sync-text').scrollTop() });
});

// Sending scroll position to the server to the the editing
$('#sync-text').on('click', () => {
    updateAndSave({ 'scrollTop': $('#sync-text').scrollTop() });
});

// When the room name is changed, update the room name and send it to the server
$('#room-name').on('input', () => {
    updateAndSave({ 'room_name': $('#room-name').text().trim() });
    document.title = $('#room-name').text().trim() + " - R's prompter";
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

// Sync button click event
$('#sync').click(() => {
    // Save and sync state
    let fontSize = parseInt($('#sync-text').css('font-size'));
    updateAndSave({ 'text': $('#sync-text').html(), room_name: $('#room-name').text().trim(), 'isPlaying': isPlaying, scrollTop: $('#sync-text').scrollTop(), 'velocity': getVelocity(), fontSize: fontSize, 'textWidth': $('#text-width').val(), 'arrowTop': $('#arrows-top').val() });
});

// Reset all local storage values to their defaults
$('#reset').click(() => {
    $('#sync-text').css('transform', 'scaleX(1) scaleY(1)');
    $('#sync-text').css('text-align', 'center');
    $('#toggle-align i').attr('class', 'fas fa-align-center');
    $('#bg-color').val('#282c34');
    $('#sync-text').css('color', '#61dafb');
    $('body').css('color', '#61dafb');
    $('body').css('background-color', '#282c34');
    $('.arrow-left').css('right', '-10px');
    $('.arrow-right').css('left', '-10px');
    $('.arrow-left').css('top', '45%');
    $('.arrow-right').css('top', '45%');
    localStorage.clear();
});

function formatText(command) {
    // Save current scroll position
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    if (command === 'foreColor') {
        document.getElementById('colorPicker').click();
    } else {
        document.execCommand(command, false, null);
    }

    // Restore scroll position
    document.documentElement.scrollTop = document.body.scrollTop = scrollTop;
}

// Change the color inside the text editor
function changeColor() {
    const colorPicker = document.getElementById('colorPicker');
    const selectedColor = colorPicker.value;
    document.execCommand('foreColor', false, selectedColor);
}

// Update the velocity label when the velocity slider is changed
$('#velocity').on('input', () => {
    $('#velocity-value').text((getVelocity() * 100).toFixed(0) + '%');
    updateAndSave({ 'velocity': getVelocity() });
});

// Update the font size label when the font size slider is changed
$('#font-size').on('input', () => {
    let fontSize = $('#font-size').val();
    $('#font-size-value').text(fontSize + 'px');
    $('#sync-text').css('font-size', fontSize + 'px');
    updateAndSave({ 'fontSize': fontSize });
});

// Change the text with, update the arrows position and sync the state
$('#text-width').on('input', function () {
    let textWidth = $('#text-width').val();

    const syncText = $('#sync-text');
    syncText.width(textWidth + '%');
    $('#text-width-value').text(textWidth + '%');

    // Arrow position
    const arrowWidthPosition = ((100 - parseInt(textWidth)) / 2) - 5;
    $('.arrow-left').css('right', arrowWidthPosition + '%');
    $('.arrow-right').css('left', arrowWidthPosition + '%');

    updateAndSave({ 'textWidth': textWidth });
});

// Change the arrow height and sync the state
$('#arrows-top').on('input', function () {
    let arrowTop = $('#arrows-top').val();

    $('#arrows-top-value').text(arrowTop + '%');
    // Arrow position
    $('.arrow-left').css('top', arrowTop + '%');
    $('.arrow-right').css('top', arrowTop + '%');

    updateAndSave({ 'arrowTop': arrowTop });
});

// When the background color picker is changed, update the background color in the UI and save it to local storage
$('#bg-color').on('input', () => {
    const bgColor = $('#bg-color').val();
    $('body').css('background-color', bgColor);
    localStorage.setItem('bgColor', bgColor);
});

// Shortcuts
window.addEventListener('keydown', function (e) {
    // Ignore keydown events if the target is the #sync-text area
    if (e.target === document.querySelector('#sync-text') || e.target === document.querySelector('#room-name')) {
        return;
    }

    e.preventDefault();

    // Condition with ctrlKey and s in lowercase and uppercase
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        // Toggle play/pause
        isPlaying = !isPlaying;
        $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
        updateAndSave({ scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'velocity': getVelocity() });
        toggleAutoScroll();
    } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        // Save and sync state
        let fontSize = parseInt($('#sync-text').css('font-size'));
        updateAndSave({ 'text': $('#sync-text').html(), room_name: $('#room-name').text().trim(), 'isPlaying': isPlaying, scrollTop: $('#sync-text').scrollTop(), 'velocity': getVelocity(), fontSize: fontSize, 'textWidth': $('#sync-text').width(), 'arrowTop': $('#arrows-top').val() });
    } else if (e.key === 'ArrowUp') {
        // Increase velocity
        let velocity = getVelocity();
        if (velocity < 1) {
            velocity += 0.05;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
        }
    } else if (e.key === 'ArrowDown') {
        // Decrease velocity
        let velocity = getVelocity();
        if (velocity > 0.1) {
            velocity -= 0.05;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
        }
    } else if (e.key === 'ArrowRight') {
        // Increase font size
        let fontSize = parseInt($('#sync-text').css('font-size'));
        if (fontSize < 96) {
            fontSize += 1;
            $('#font-size').val(fontSize);
            $('#font-size-value').text(fontSize + 'px');
            $('#sync-text').css('font-size', fontSize + 'px');
            updateAndSave({ 'fontSize': fontSize });
        }
    } else if (e.key === 'ArrowLeft') {
        // Decrease font size
        let fontSize = parseInt($('#sync-text').css('font-size'));
        if (fontSize > 45) {
            fontSize -= 1;
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
            // Decrease velocity
            let velocity = getVelocity();
            if (velocity > 0.1) {
                velocity -= 0.05;
                $('#velocity').val(velocity * 10);
                $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
                updateAndSave({ 'velocity': getVelocity() });
            }
        } else {
            // Increase velocity
            let velocity = getVelocity();
            if (velocity < 1) {
                velocity += 0.05;
                $('#velocity').val(velocity * 10);
                $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
                updateAndSave({ 'velocity': getVelocity() });
            }
        }
        // Increase/decrease font size with the mouse wheel while holding shift
    } else if (e.shiftKey) {
        if (e.deltaY > 0) {
            // Decrease font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize > 45) {
                fontSize -= 1;
                $('#font-size').val(fontSize);
                $('#font-size-value').text(fontSize + 'px');
                $('#sync-text').css('font-size', fontSize + 'px');
                updateAndSave({ 'fontSize': fontSize });
            }
        } else {
            // Increase font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize < 96) {
                fontSize += 1;
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

// Calculate velocity
function getVelocity() {
    return parseFloat($('#velocity').val()) / 10;
}

// Save the state of the app to the server
function updateAndSave(properties) {
    socket.emit('properties_updated', { 'room_id': room_id, ...properties });
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
                $('#room-name').text(state.room_name || 'Unnamed Room');
                document.title = state.room_name + " - R's prompter" || 'Unnamed Room' + " - R's prompter";
                isPlaying = (typeof state.isPlaying !== 'undefined') ? state.isPlaying : false;
                $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
                toggleAutoScroll();
                $('#sync-text').scrollTop(state.scrollTop + 200 || 0); // + 200 is needed?
                $('#velocity').val(((state.velocity || 0.1) * 10));
                $('#velocity-value').text(((state.velocity || 0.1) * 100).toFixed(0) + '%');
                $('#sync-text').css('font-size', (state.fontSize || 72) + 'px');
                $('#font-size-value').text((state.fontSize || 72) + 'px');
                $('#font-size').val(state.fontSize || 72);
                // Text width
                $('#sync-text').width((state.textWidth || 90) + '%');
                $('#text-width').val(state.textWidth || 90);
                $('#text-width-value').text((state.textWidth || 90) + '%');
                // Arrows height position
                $('#arrows-top').val(state.arrowTop || 45);
                $('#arrows-top-value').text(state.arrowTop || 45 + '%');
                // Arrow position
                const arrowWidthPosition = ((100 - parseInt(state.textWidth || 90)) / 2) - 5;
                const arrowTopPosition = (parseInt(state.arrowTop || 45));
                $('.arrow-left').css('right', arrowWidthPosition + '%');
                $('.arrow-right').css('left', arrowWidthPosition + '%');
                $('.arrow-left').css('top', arrowTopPosition + '%');
                $('.arrow-right').css('top', arrowTopPosition + '%');
            } else {
                $('#sync-text').html('\n\n\n\n\n\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\n\n\n\n\n');
                $('#room-name').text('Unnamed Room');
                isPlaying = false;
                $('#play-pause').html('<i class="fas fa-play"></i>');
                $('#sync-text').scrollTop(0);
                $('#velocity').val(1); // 0.3 * 10
                $('#velocity-value').text(10 + '%');
                $('#sync-text').css('font-size', '72px');
                $('#font-size-value').text('72px');
                $('#font-size').val(72);
                // Text width
                $('#sync-text').width('90%');
                $('#text-width').val(90);
                $('#text-width-value').text(('90%'));
                // Arrows height
                $('#arrows-top').val(45);
                $('#arrows-top-value').text('45%');
                // Arrow position
                const arrowWidthPosition = ((100 - 90) / 2) - 5;
                $('.arrow-left').css('right', arrowWidthPosition + '%');
                $('.arrow-right').css('left', arrowWidthPosition + '%');
                $('.arrow-left').css('top', '45%');
                $('.arrow-right').css('top', '45%');
            }
        },
        error: function (error) {
            console.error('Error loading state:', error);
        }
    });
}

// Load the state of the app from local storage
function loadLocalStorage() {
    const savedTextAlign = localStorage.getItem('textAlign');
    const savedTextOrientation = localStorage.getItem('textOrientation');
    // const savedTextColor = localStorage.getItem('textColor');
    const savedBgColor = localStorage.getItem('bgColor');

    if (savedTextAlign) {
        $('#sync-text').css('text-align', savedTextAlign);
        iconClass = 'fas fa-align-' + savedTextAlign;
        $('#toggle-align i').attr('class', iconClass);
    }

    if (savedTextOrientation) {
        $('#sync-text').css('transform', savedTextOrientation);
    }

    if (savedBgColor) {
        $('#bg-color').val(savedBgColor);
        $('body').css('background-color', savedBgColor);
    }
}

// Initialize settings
loadState(); // Load state from the server
loadLocalStorage(); // Load state from the local browser storage