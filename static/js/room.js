// Establish a connection with the server
const protocol = location.protocol == 'https:' ? 'https' : 'http';
const socket = io.connect(protocol + '://' + document.domain + ':' + location.port);
// Get the room_id from the URL (assuming it's in the format /room/<room_id>)
const room_id = window.location.pathname.split('/')[2];

let isPlaying = false;
let autoScrollInterval;

// --- Real-time reading timer state ---
let readingTimerInterval = null;
let readingElapsed = 0; // in seconds
let readingTotal = 0; // in seconds
let lastTick = null;

function formatSeconds(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function computeReadingTotal() {
    const syncText = document.getElementById('sync-text');
    const scrollHeight = syncText.scrollHeight;
    const clientHeight = syncText.clientHeight;
    const velocity = getVelocity();
    const fontSize = parseInt($('#sync-text').css('font-size'));
    const pxPerInterval = velocity * fontSize / 5.62;
    if (pxPerInterval > 0) {
        return Math.ceil((scrollHeight - clientHeight) / pxPerInterval * 25 / 1000);
    }
    return 0;
}

function updateSecondsBar() {
    // Clamp elapsed to total
    if (readingElapsed > readingTotal) readingElapsed = readingTotal;
    document.getElementById('seconds-remaining').textContent = `${formatSeconds(readingElapsed)} / ${formatSeconds(readingTotal)}`;
}

function resetReadingTimer() {
    readingElapsed = 0;
    readingTotal = computeReadingTotal();
    updateSecondsBar();
}

function startReadingTimer() {
    if (readingTimerInterval) return;
    lastTick = Date.now();
    readingTimerInterval = setInterval(() => {
        if (!isPlaying) return;
        const now = Date.now();
        const delta = (now - lastTick) / 1000;
        lastTick = now;
        readingElapsed += delta;
        if (readingElapsed >= readingTotal) {
            readingElapsed = readingTotal;
            stopReadingTimer();
        }
        updateSecondsBar();
    }, 250);
}

function stopReadingTimer() {
    if (readingTimerInterval) {
        clearInterval(readingTimerInterval);
        readingTimerInterval = null;
    }
    updateSecondsBar();
}

// Helper to set the real text content in sync-text, after spacers
function setSyncTextContent(html) {
    const syncText = document.getElementById('sync-text');
    // Remove all nodes except spacers
    Array.from(syncText.childNodes).forEach(node => {
        if (!node.id || (node.id !== 'scroll-start-spacer' && node.id !== 'scroll-end-spacer')) {
            syncText.removeChild(node);
        }
    });
    // Insert after scroll-start-spacer if present, else at start
    let startSpacer = document.getElementById('scroll-start-spacer');
    let frag = document.createElement('div');
    frag.innerHTML = html;
    let nodes = Array.from(frag.childNodes);
    if (startSpacer && startSpacer.nextSibling) {
        nodes.reverse().forEach(n => syncText.insertBefore(n, startSpacer.nextSibling));
    } else if (startSpacer) {
        nodes.forEach(n => syncText.appendChild(n));
    } else {
        nodes.forEach(n => syncText.appendChild(n));
    }
}

// When the socket connects to the server, print a message to the console
socket.on('connect', () => {
    socket.emit('join_room', { 'room_id': room_id });
    console.log('Connected to room', room_id);
});

// When the server sends an 'update_properties' event
socket.on('update_properties', data => {
    if (data['room_id'] === room_id) {
        let resetTimer = false;
        if (data['text'] !== undefined) {
            setSyncTextContent(data['text']);
            resetTimer = true;
        }
        if (data['room_name'] !== $('#room-name').text().trim() && data['room_name'] !== undefined) {
            $('#room-name').text(data['room_name']);
            document.title = data['room_name'] + " - Sway Prompter";
        }
        if (data['isPlaying'] !== isPlaying && data['isPlaying'] !== undefined) {
            isPlaying = data['isPlaying'];
            $('#play-pause').html(isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>');
            toggleAutoScroll();
            if (isPlaying) {
                startReadingTimer();
            } else {
                stopReadingTimer();
            }
        }
        if (data['scrollTop'] !== $('#sync-text').scrollTop() && data['scrollTop'] !== undefined) {
            $('#sync-text').scrollTop(data['scrollTop']);
        }
        if (data['velocity'] !== getVelocity() && data['velocity'] !== undefined) {
            $('#velocity').val(data['velocity'] * 10);
            $('#velocity-value').text((data['velocity'] * 100).toFixed(0) + '%');
            resetTimer = true;
        }
        if (data['fontSize'] !== parseInt($('#sync-text').css('font-size')) && data['fontSize'] !== undefined) {
            $('#sync-text').css('font-size', data['fontSize'] + 'px');
            $('#font-size').val(data['fontSize']);
            $('#font-size-value').text(data['fontSize'] + 'px');
            resetTimer = true;
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
        if (resetTimer) {
            resetReadingTimer();
        }
        updateSecondsBar();
    }
});

// Text synchronization and sending scroll position to the server to the the editing
$('#sync-text').on('input', () => {
    updateAndSave({ 'text': document.getElementById('sync-text').innerHTML, 'scrollTop': $('#sync-text').scrollTop() });
    resetReadingTimer();
});

// Sending scroll position to the server to the the editing
$('#sync-text').on('click', () => {
    updateAndSave({ 'scrollTop': $('#sync-text').scrollTop() });
});

// When the room name is changed, update the room name and send it to the server
$('#room-name').on('input', () => {
    updateAndSave({ 'room_name': $('#room-name').text().trim() });
    document.title = $('#room-name').text().trim() + " - Sway Prompter";
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
    if (isPlaying) {
        startReadingTimer();
    } else {
        stopReadingTimer();
    }
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
    updateAndSave({ 'text': document.getElementById('sync-text').innerHTML, room_name: $('#room-name').text().trim(), 'isPlaying': isPlaying, scrollTop: $('#sync-text').scrollTop(), 'velocity': getVelocity(), fontSize: fontSize, 'textWidth': $('#text-width').val(), 'arrowTop': $('#arrows-top').val() });
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
    resetReadingTimer();
});

// Update the font size label when the font size slider is changed
$('#font-size').on('input', () => {
    let fontSize = $('#font-size').val();
    $('#font-size-value').text(fontSize + 'px');
    $('#sync-text').css('font-size', fontSize + 'px');
    updateAndSave({ 'fontSize': fontSize });
    resetReadingTimer();
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
    updateSecondsBar();
});

// Change the arrow height and sync the state
$('#arrows-top').on('input', function () {
    let arrowTop = $('#arrows-top').val();

    $('#arrows-top-value').text(arrowTop + '%');
    // Arrow position
    $('.arrow-left').css('top', arrowTop + '%');
    $('.arrow-right').css('top', arrowTop + '%');

    updateAndSave({ 'arrowTop': arrowTop });
    updateSecondsBar();
    updateSyncTextPadding();
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
        if (isPlaying) {
            startReadingTimer();
        } else {
            stopReadingTimer();
        }
    } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        // Save and sync state
        let fontSize = parseInt($('#sync-text').css('font-size'));
        updateAndSave({ 'text': document.getElementById('sync-text').innerHTML, room_name: $('#room-name').text().trim(), 'isPlaying': isPlaying, scrollTop: $('#sync-text').scrollTop(), 'velocity': getVelocity(), fontSize: fontSize, 'textWidth': $('#sync-text').width(), 'arrowTop': $('#arrows-top').val() });
    } else if (e.key === 'ArrowUp') {
        // Increase velocity
        let velocity = getVelocity();
        if (velocity < 1) {
            velocity += 0.05;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
            resetReadingTimer();
        }
    } else if (e.key === 'ArrowDown') {
        // Decrease velocity
        let velocity = getVelocity();
        if (velocity > 0.1) {
            velocity -= 0.05;
            $('#velocity').val(velocity * 10);
            $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
            updateAndSave({ 'velocity': getVelocity() });
            resetReadingTimer();
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
            resetReadingTimer();
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
            resetReadingTimer();
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
                resetReadingTimer();
            }
        } else {
            // Increase velocity
            let velocity = getVelocity();
            if (velocity < 1) {
                velocity += 0.05;
                $('#velocity').val(velocity * 10);
                $('#velocity-value').text((velocity * 100).toFixed(0) + '%');
                updateAndSave({ 'velocity': getVelocity() });
                resetReadingTimer();
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
                resetReadingTimer();
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
                resetReadingTimer();
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

$('#sync-text').on('scroll', () => {
    // Synchronize timer with manual scroll position
    const syncText = document.getElementById('sync-text');
    const scrollTop = syncText.scrollTop;
    const maxScroll = syncText.scrollHeight - syncText.clientHeight;
    if (readingTotal > 0 && maxScroll > 0) {
        if (maxScroll - scrollTop < 2) {
            // If at the very end, set to total
            readingElapsed = readingTotal;
        } else {
            const ratio = Math.max(0, Math.min(1, scrollTop / maxScroll));
            readingElapsed = readingTotal * ratio;
        }
    } else {
        readingElapsed = 0;
    }
    updateSecondsBar();
});

// Toggle the automatic scroll based on velocity and font size
function toggleAutoScroll() {
    if (isPlaying) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            const velocity = getVelocity();
            const fontSize = parseInt($('#sync-text').css('font-size'));
            const scrollTop = $('#sync-text').scrollTop();
            const syncText = document.getElementById('sync-text');
            const maxScroll = syncText.scrollHeight - syncText.clientHeight;
            // Calcul du nouveau scroll
            const newScrollTop = scrollTop + velocity * fontSize / 5.62;
            if (newScrollTop >= maxScroll - 1) { // On tolère 1px de marge
                $('#sync-text').scrollTop(maxScroll);
                isPlaying = false;
                $('#play-pause').html('<i class="fas fa-play"></i>');
                updateAndSave({ scrollTop: maxScroll, 'isPlaying': false, 'velocity': getVelocity() });
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
                stopReadingTimer();
                updateSecondsBar();
                return;
            }
            $('#sync-text').scrollTop(newScrollTop);
            updateSecondsBar();
        }, 25);
        updateSecondsBar();
        startReadingTimer();
    } else {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
        stopReadingTimer();
        updateSecondsBar();
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
                setSyncTextContent(state.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');
                $('#room-name').text(state.room_name || 'Unnamed Room');
                document.title = state.room_name + " - Sway Prompter" || 'Unnamed Room' + " - Sway Prompter";
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
                resetReadingTimer();
            } else {
                setSyncTextContent('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');
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
                resetReadingTimer();
            }
            updateSyncTextPadding();
        },
        error: function (error) {
            console.error('Error loading state:', error);
        }
    });
}

// Ajoute ou met à jour le padding du texte pour aligner avec les flèches
function updateSyncTextPadding() {
    const arrowLeft = document.querySelector('.arrow-left');
    const syncText = document.getElementById('sync-text');
    if (!arrowLeft || !syncText) return;

    // Remove any previous spacers
    let scrollStartSpacer = document.getElementById('scroll-start-spacer');
    if (scrollStartSpacer) scrollStartSpacer.remove();
    let scrollEndSpacer = document.getElementById('scroll-end-spacer');
    if (scrollEndSpacer) scrollEndSpacer.remove();

    // Get arrow position
    const arrowRect = arrowLeft.getBoundingClientRect();
    const prompterRect = syncText.getBoundingClientRect();
    const arrowTop = arrowRect.top - prompterRect.top;
    const spacerHeight = prompterRect.height - arrowTop;

    // Add top spacer
    scrollStartSpacer = document.createElement('div');
    scrollStartSpacer.id = 'scroll-start-spacer';
    scrollStartSpacer.style.height = `${arrowTop}px`;
    scrollStartSpacer.style.width = '100%';
    scrollStartSpacer.style.pointerEvents = 'none';
    scrollStartSpacer.setAttribute('contenteditable', 'false');
    scrollStartSpacer.setAttribute('tabindex', '-1');
    scrollStartSpacer.setAttribute('aria-hidden', 'true');
    scrollStartSpacer.className = 'spacer-non-editable';
    syncText.insertBefore(scrollStartSpacer, syncText.firstChild);

    // Add bottom spacer
    scrollEndSpacer = document.createElement('div');
    scrollEndSpacer.id = 'scroll-end-spacer';
    scrollEndSpacer.style.height = `${spacerHeight}px`;
    scrollEndSpacer.style.width = '100%';
    scrollEndSpacer.style.pointerEvents = 'none';
    scrollEndSpacer.setAttribute('contenteditable', 'false');
    scrollEndSpacer.setAttribute('tabindex', '-1');
    scrollEndSpacer.setAttribute('aria-hidden', 'true');
    scrollEndSpacer.className = 'spacer-non-editable';
    syncText.appendChild(scrollEndSpacer);

    syncText.style.paddingTop = `0px`;
    syncText.style.paddingBottom = `0px`;
}

// Prevent caret from entering the spacers
$('#sync-text').on('focus', function () {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node && node.parentElement && node.parentElement.classList.contains('spacer-non-editable')) {
        // Move caret after the spacer
        let syncText = document.getElementById('sync-text');
        if (syncText.childNodes.length > 1) {
            let next = syncText.childNodes[1];
            let r = document.createRange();
            r.setStart(next, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
    }
});

// Prevent typing in spacers
$('#sync-text').on('keydown', function (e) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    if (node && node.parentElement && node.parentElement.classList.contains('spacer-non-editable')) {
        e.preventDefault();
        // Optionally move caret after the spacer
        let syncText = document.getElementById('sync-text');
        if (syncText.childNodes.length > 1) {
            let next = syncText.childNodes[1];
            let r = document.createRange();
            r.setStart(next, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
    }
});

// Appelle la fonction au chargement, au redimensionnement et lors du déplacement des flèches
window.addEventListener('load', updateSyncTextPadding);
window.addEventListener('resize', updateSyncTextPadding);

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

$(document).ready(function () {
    // Toggle controls bar visibility
    $('#toggle-controls').on('click', function () {
        const controlsBar = $('#controls-bar');
        const icon = $('#toggle-controls-icon');
        controlsBar.toggle();
        if (controlsBar.is(':visible')) {
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
    // Toggle left controls popup
    $('#toggle-controls-left').on('click', function () {
        const leftPopup = $('#popup-controls-left');
        const icon = $('#toggle-controls-left-icon');
        leftPopup.toggle();
        if (leftPopup.is(':visible')) {
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
    // Toggle right controls popup
    $('#toggle-controls-right').on('click', function () {
        const rightPopup = $('#popup-controls-right');
        const icon = $('#toggle-controls-right-icon');
        rightPopup.toggle();
        if (rightPopup.is(':visible')) {
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
    resetReadingTimer();
    updateSecondsBar();
    updateSyncTextPadding();
});