require('dotenv').config();
const PubNub = require('pubnub');

const uuid = crypto.randomUUID(); // generate a unique id each time

// Initialize PubNub
const pubnub = new PubNub({
    publishKey: process.env.PUBNUB_PUBLISH_KEY,
    subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
    uuid: uuid
});

const audioChunks = {}; // Stores chunks by messageId
const processedMessages = new Set(); // Tracks fully processed messages

// Track the current subscribed channel
let currentChannel = null;

// Elements
const channelInput = document.getElementById('channelInput');
const connectButton = document.getElementById('connectButton');
const messagesDiv = document.getElementById('messages');
const rateSlider = document.getElementById('rateSlider');

// Connect to a channel
connectButton.addEventListener('click', () => {
    const twitchChannelName = channelInput.value.trim();
    if (!twitchChannelName) {
        alert('Please enter a channel name');
        return;
    }

   // Unsubscribe from the current channel
    if (currentChannel) {
        pubnub.unsubscribe({ channels: [currentChannel] });
        console.log(`Unsubscribed from: ${currentChannel}`);
    }

    // Clear the messages div
    messagesDiv.innerHTML = '';

    // Construct the unique channel name using the twitch channel name and the uuid
    currentChannel = `${twitchChannelName}-${uuid}`;

    // Publish the channel name to the backend
    pubnub.publish({
        channel: `twitch-channel-requests.${uuid}`,
        message: { channel: twitchChannelName }
    }).then(() => {
        messagesDiv.innerHTML += `<p>Published message to: ${twitchChannelName}. Waiting for response...</p>`;
    });

    // Subscribe to the PubNub channel for the specified Twitch channel
    pubnub.subscribe({ channels: [currentChannel] });

    pubnub.addListener({
        message: function(event) {
        const data = JSON.parse(event.message);
        const { messageId, chunkIndex, totalChunks, text, audioChunk, name } = data;

        // Skip processing if the message has already been processed
        if (processedMessages.has(messageId)) {
            return;
        }

        // Initialize storage for this messageId if it doesn’t exist
        if (!audioChunks[messageId]) {
            audioChunks[messageId] = { chunks: [], receivedChunks: 0, totalChunks };
        }

        // Store the chunk and update the count of received chunks
        audioChunks[messageId].chunks[chunkIndex] = audioChunk;
        audioChunks[messageId].receivedChunks += 1;

        // If all chunks are received, assemble and play the audio
        if (audioChunks[messageId].receivedChunks === totalChunks) {
            const completeBase64 = audioChunks[messageId].chunks.join('');
            
            // Determine if the message should be spoken based on rate
            const ttsRate = parseInt(rateSlider.value, 10);
            const isTTSSelected = Math.random() * 100 <= ttsRate;

            // Always display message
            displayMessage(name, text, isTTSSelected);

            if(isTTSSelected) {
                playAudio(completeBase64);
            }
                   
            // Mark this message as processed to avoid duplicates
            processedMessages.add(messageId);

            // Clean up after playback
            delete audioChunks[messageId];
        }
    }
    });
});

// Display the original text message
function displayMessage(name, text, isTTSSelected) {
    const messageElem = document.createElement('p');
    if(isTTSSelected) {
        messageElem.classList.add('highlight');
    }
    messageElem.textContent = `${name}: ${text}`;

    // Append the message to the bottom
    messagesDiv.appendChild(messageElem);

    // Keep the view pinned to the bottom
    ensureScrollToBottom();
}

// Helper function to keep the view at the bottom
function ensureScrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function playAudio(base64Audio) {
    const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    // Create the first audio element for the virtual microphone
    const virtualMicAudio = new Audio(url);

    // Get the selected device ID from the dropdown
    const outputDeviceDropdown = document.getElementById('outputDeviceDropdown');
    const selectedDeviceId = outputDeviceDropdown.value;

    try {
        if (selectedDeviceId) {
            await virtualMicAudio.setSinkId(selectedDeviceId);
            virtualMicAudio.play();
            console.log(`Audio routed to virtual microphone: ${selectedDeviceId}`);
        } else {
            console.warn('No output device selected. Skipping virtual microphone playback.');
        }
    } catch (error) {
        console.error('Error routing audio to virtual microphone:', error);
    }

    // Create the second audio element for the default speakers
    const defaultSpeakerAudio = new Audio(url);
    defaultSpeakerAudio.play();

    defaultSpeakerAudio.onended = () => URL.revokeObjectURL(url);
    virtualMicAudio.onended = () => URL.revokeObjectURL(url);
}



async function playAudioToDevice(base64Audio, deviceId) {
    const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);

    try {
        if (deviceId) {
            await audio.setSinkId(deviceId); // Route to specific output device
            console.log(`Routing audio to device ID: ${deviceId}`);
        } else {
            console.log('Using default playback device.');
        }
    } catch (error) {
        console.error('Error routing audio:', error);
    }

    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
}

async function populateOutputDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputDeviceDropdown = document.getElementById('outputDeviceDropdown');

    devices
        .filter(device => device.kind === 'audiooutput')
        .forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Device ${device.deviceId}`;
            outputDeviceDropdown.appendChild(option);
        });
}

// Call this function on app initialization
populateOutputDevices();

// Handle output device change
const outputDeviceDropdown = document.getElementById('outputDeviceDropdown');
outputDeviceDropdown.addEventListener('change', () => {
    const selectedDeviceId = outputDeviceDropdown.value;
    console.log(`Selected output device: ${selectedDeviceId}`);
});