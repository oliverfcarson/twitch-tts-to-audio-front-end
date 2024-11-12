// app.js

const pubnub = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    uuid: 'client'
});

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
            const { text, audio } = event.message;
            displayMessage(text);
            //playAudio(audio);
        }
    });
}

// Display the original text message
function displayMessage(text) {
    const messagesDiv = document.getElementById('messages');
    const messageElem = document.createElement('p');
    messageElem.textContent = text;
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
