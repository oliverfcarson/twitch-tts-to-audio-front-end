// app.js

const pubnub = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    uuid: 'client'
});

const audioChunks = {}; // Stores chunks by messageId
const processedMessages = new Set(); // Tracks fully processed messages

function connectToChannel() {
    const channelName = document.getElementById('channelInput').value;

    // Publish the channel name to the backend
    pubnub.publish({
        channel: 'twitch-channel-requests',
        message: { channel: channelName }
    });

    // Subscribe to the PubNub channel for the specified Twitch channel
    pubnub.subscribe({ channels: [channelName] });

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
            playAudio(completeBase64);
            displayMessage(name, text);
    
            // Mark this message as processed to avoid duplicates
            processedMessages.add(messageId);

            // Clean up after playback
            delete audioChunks[messageId];
        }
    }
    });
}

// Display the original text message
function displayMessage(name, text) {
    const messagesDiv = document.getElementById('messages');
    const messageElem = document.createElement('p');
    messageElem.textContent = `${name}: ${text}`;
    messagesDiv.appendChild(messageElem);
}

// Play the audio from the Base64 encoded data
function playAudio(base64Audio) {
    const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.play();

    // Clean up URL after playback
    audio.onended = () => URL.revokeObjectURL(url);
}

function playTextAsSpeech(text) {
    // Use the Web Speech API to convert text to speech
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
