// Establish a connection with the server
const socket = io.connect('http://' + document.domain + ':' + location.port);
let isPlaying = false;
let autoScrollInterval;

// When the socket connects to the server, print a message to the console
socket.on('connect', () => {
    console.log('Connected');
});

// When the server sends an 'update_text' event
socket.on('update_text', data => {
    // Update the content of the synced text area and its properties
    $('#sync-text').html(data['text']);
    $('#sync-text').css('font-size', data['fontSize'] + 'px');
    $('#speed').val(data['speed'] * 10);
    $('#sync-text').scrollTop(data['scrollTop']);
    isPlaying = data['isPlaying'];
    $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
    
    // Start or stop auto-scrolling based on the 'isPlaying' value
    toggleAutoScroll();

    // Update the font size and reading speed labels
    $('#font-size-value').text(data['fontSize'] + 'px');
    $('#font-size').val(data['fontSize']);
    $('#reading-speed-value').text(getSpeed() * 100 + '%');
});

// When the 'Save' button is clicked, send the updated text and settings to the server
$('#save-text').click(() => {
    let text = $('#sync-text').html();
    let fontSize = parseInt($('#sync-text').css('font-size'));
    socket.emit('text_updated', { 'text': text, 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
    saveState();
});

// When the font size or speed sliders are changed, send the updated settings to the server
$('#font-size, #speed').on('input', () => {
    let fontSize = $('#font-size').val();
    socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
    saveState();
});

// When the play/pause button is clicked, toggle the auto-scrolling state and send the updated settings to the server
$('#play-pause').on('click', () => {
    isPlaying = !isPlaying;
    let fontSize = parseInt($('#sync-text').css('font-size'));
    $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
    socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
    toggleAutoScroll();
    saveState();
});

// When the text color picker is changed, update the text color in the UI and save it to local storage
$('#text-color').on('input', () => {
    const textColor = $('#text-color').val();
    $('body').css('color', textColor);
    $('#sync-text').css('color', textColor);
    localStorage.setItem('textColor', textColor);
});

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
    let fontSize = $('#font-size').val();
    $('#toggle-align i').attr('class', 'fas fa-align-center');
    // text-color to #61dafb and background-color to #282c34
    $('#text-color').val('#61dafb');
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
    socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
    saveState();
});

// Update the font size label when the font size slider is changed
$('#font-size').on('input', () => {
    let fontSize = $('#font-size').val();
    $('#font-size-value').text(fontSize);
    $('#sync-text').css('font-size', fontSize + 'px');
});

// Update the reading speed label when the reading speed slider is changed
$('#speed').on('input', () => {
    $('#reading-speed-value').text(getSpeed() * 100 + '%');
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
    const syncTextArea = document.querySelector('#sync-text');

    // Ignore keydown events if the target is the #sync-text area
    if (e.target === syncTextArea) {
        return;
    }
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        // Toggle play/pause
        isPlaying = !isPlaying;
        let fontSize = parseInt($('#sync-text').css('font-size'));
        $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
        socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
        toggleAutoScroll();
        saveState();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        // Increase reading speed
        let speed = getSpeed();
        if (speed < 1) {
            speed += 0.1;
            let fontSize = parseInt($('#sync-text').css('font-size'));
            $('#speed').val(speed * 10);
            $('#reading-speed-value').text(speed * 100 + '%');
            socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
            saveState();
        }
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        // Decrease reading speed
        let speed = getSpeed();
        if (speed > 0.1) {
            speed -= 0.1;
            let fontSize = parseInt($('#sync-text').css('font-size'));
            $('#speed').val(speed * 10);
            $('#reading-speed-value').text(speed * 100 + '%');
            socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
            saveState();
        }
    } // increase font size
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        let fontSize = parseInt($('#sync-text').css('font-size'));
        fontSize += 1;
        $('#font-size').val(fontSize);
        $('#font-size-value').text(fontSize + 'px');
        socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
        saveState();
    } // decrease font size
    else if (e.key === 'ArrowLeft') {
        let fontSize = parseInt($('#sync-text').css('font-size'));
        fontSize -= 1;
        $('#font-size').val(fontSize);
        $('#font-size-value').text(fontSize + 'px');
        socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
        saveState();
    } // increase font size
    else if (e.key === 'ArrowRight') {
        let fontSize = parseInt($('#sync-text').css('font-size'));
        fontSize += 1;
        $('#font-size').val(fontSize);
        $('#font-size-value').text(fontSize + 'px');
        socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
        saveState();
    }
});

// Wheel event listener
window.addEventListener('wheel', (e) => {
    // Increase/decrease reading speed with the mouse wheel while holding alt
    if (e.altKey) {
        if (e.deltaY > 0) {
            // decrease reading speed
            let speed = getSpeed();
            if (speed > 0.1) {
                speed -= 0.1;
                let fontSize = parseInt($('#sync-text').css('font-size'));
                $('#speed').val(speed * 10);
                $('#reading-speed-value').text(speed * 100 + '%');
                socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
                saveState();
            }
        } else {
            // increase reading speed
            let speed = getSpeed();
            if (speed < 1) {
                speed += 0.1;
                let fontSize = parseInt($('#sync-text').css('font-size'));
                $('#speed').val(speed * 10);
                $('#reading-speed-value').text(speed * 100 + '%');
                socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
                saveState();
            }
        }
    // Increase/decrease font size with the mouse wheel while holding shift
    } else if (e.shiftKey) {
        if (e.deltaY > 0) {
            // decrease font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize > 45) {
                fontSize -= 1;
                $('#font-size').val(fontSize);
                $('#font-size-value').text(fontSize + 'px');
                socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
                saveState();
            }
        } else {
            // increase font size
            let fontSize = parseInt($('#sync-text').css('font-size'));
            if (fontSize < 72) {
                fontSize += 1;
                $('#font-size').val(fontSize);
                $('#font-size-value').text(fontSize + 'px');
                socket.emit('text_updated', { 'text': $('#sync-text').html(), 'fontSize': fontSize, scrollTop: $('#sync-text').scrollTop(), 'isPlaying': isPlaying, 'speed': getSpeed() });
                saveState();
            }
        }
    }
});

// Calculate reading speed
function getSpeed() {
    return parseFloat($('#speed').val()) / 10;
}

// Toggle the automatic scroll based on reading speed and font size
function toggleAutoScroll() {
    if (isPlaying) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            const speed = getSpeed();
            const fontSize = parseInt($('#sync-text').css('font-size'));
            const scrollTop = $('#sync-text').scrollTop();
            $('#sync-text').scrollTop(scrollTop + speed * fontSize / 5.62);
        }, 25);
    } else {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Save the state of the app to the server
function saveState() {
    const state = {
        fontSize: $('#font-size').val(),
        speed: getSpeed(),
        isPlaying: isPlaying,
        text: $('#sync-text').html(),
        scrollTop: $('#sync-text').scrollTop()
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
        success: function (state) {
            if (state) {
                $('#sync-text').html(state.text || '\n\n\n\n\n\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\n\n\n\n\n');
                $('#sync-text').css('font-size', (state.fontSize || 45) + 'px');
                $('#font-size-value').text((state.fontSize || 45) + 'px');
                $('#font-size').val(state.fontSize || 45);
                $('#speed').val(((state.speed || 0.1) * 10));
                $('#reading-speed-value').text((state.speed || 0.1) * 100 + '%');
                $('#sync-text').scrollTop(state.scrollTop + 200 || 0); // + 200 is needed?
                isPlaying = (typeof state.isPlaying !== 'undefined') ? state.isPlaying : false;
                $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
                toggleAutoScroll();
            } else {
                $('#sync-text').html('\n\n\n\n\n\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\n\n\n\n\n');
                $('#sync-text').css('font-size', '45px');
                $('#font-size-value').text('45px');
                $('#font-size').val(45);
                $('#speed').val(1); // 0.3 * 10
                $('#reading-speed-value').text(10 + '%');
                $('#sync-text').scrollTop(0);
                isPlaying = false;
                $('#play-pause').html('<i class="fas fa-play"></i>');
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

    if (savedTextColor) {
        $('#text-color').val(savedTextColor);
        $('#sync-text').css('color', savedTextColor);
        $('body').css('color', savedTextColor);
    }

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

// Initialize font size and reading speed labels
$('#font-size-value').text($('#font-size').val() + 'px');
$('#reading-speed-value').text(getSpeed() * 100 + '%');
$('#sync-text-width-value').text($('#sync-text-width').val() + '%');

// Initialize settings
loadState(); // Load state from the server
loadLocalStorage(); // Load state from the local browser storage