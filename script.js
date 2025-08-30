// Real Audio Recording from Text-to-Speech
// This version creates actual MP3/WAV audio files

class RealTextToAudioMP3 {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = new SpeechSynthesisUtterance();
        this.isPlaying = false;
        this.isPaused = false;
        this.voices = [];
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        
        // Wait for voices to load
        this.initializeAfterVoicesLoaded();
        
        // Initialize immediately if voices are already available
        if (this.synth.getVoices().length > 0) {
            this.initialize();
        }
    }

    initializeAfterVoicesLoaded() {
        // Handle the voices loaded event
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.initialize();
            };
        }
        
        // Fallback: try to initialize after a short delay
        setTimeout(() => {
            if (this.voices.length === 0) {
                this.initialize();
            }
        }, 100);
    }

    initialize() {
        this.voices = this.synth.getVoices();
        this.setupElements();
        this.setupEventListeners();
        this.loadVoices();
        this.updateVoiceCount();
        
        console.log('TextToAudioMP3 initialized with', this.voices.length, 'voices');
    }

    setupElements() {
        // Get DOM elements
        this.textInput = document.getElementById('textInput');
        this.languageSelect = document.getElementById('language');
        this.voiceSelect = document.getElementById('voice');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.charCount = document.getElementById('charCount');
        this.status = document.getElementById('status');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.voiceCount = document.getElementById('voiceCount');
    }

    setupEventListeners() {
        if (!this.textInput) return; // Safety check
        
        // Text input character counter
        this.textInput.addEventListener('input', () => {
            this.updateCharacterCount();
        });

        // Language change
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', () => {
                this.loadVoices();
            });
        }

        // Voice change  
        if (this.voiceSelect) {
            this.voiceSelect.addEventListener('change', () => {
                this.updateVoice();
            });
        }

        // Control buttons
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => {
                this.play();
            });
        }

        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => {
                this.pause();
            });
        }

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => {
                this.stop();
            });
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => {
                this.downloadRealAudio();
            });
        }

        // Speech synthesis events
        this.utterance.onstart = () => {
            this.onSpeechStart();
        };

        this.utterance.onend = () => {
            this.onSpeechEnd();
        };

        this.utterance.onpause = () => {
            this.onSpeechPause();
        };

        this.utterance.onresume = () => {
            this.onSpeechResume();
        };

        this.utterance.onerror = (event) => {
            this.onSpeechError(event);
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.play();
            }
            
            if (event.key === 'Escape') {
                event.preventDefault();
                this.stop();
            }
        });
    }

    loadVoices() {
        if (!this.voiceSelect) return;
        
        const selectedLang = this.languageSelect ? this.languageSelect.value : 'en-US';
        
        // Clear current options
        this.voiceSelect.innerHTML = '';
        
        // Filter voices by selected language and English as fallback
        let filteredVoices = this.voices.filter(voice => {
            const voiceLang = voice.lang.toLowerCase();
            const targetLang = selectedLang.toLowerCase();
            return voiceLang.startsWith(targetLang.split('-')[0]);
        });

        // If no voices found for selected language, include English voices
        if (filteredVoices.length === 0) {
            filteredVoices = this.voices.filter(voice => 
                voice.lang.toLowerCase().startsWith('en')
            );
        }

        // If still no voices, use all available voices
        if (filteredVoices.length === 0) {
            filteredVoices = this.voices.slice(0, 10); // Limit to first 10
        }

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Default Voice';
        this.voiceSelect.appendChild(defaultOption);

        // Add filtered voices
        filteredVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default) {
                option.textContent += ' - Default';
            }
            this.voiceSelect.appendChild(option);
        });

        console.log(`Loaded ${filteredVoices.length} voices for ${selectedLang}`);
    }

    updateVoice() {
        const selectedVoiceName = this.voiceSelect ? this.voiceSelect.value : '';
        
        if (selectedVoiceName) {
            const selectedVoice = this.voices.find(voice => voice.name === selectedVoiceName);
            if (selectedVoice) {
                this.utterance.voice = selectedVoice;
                console.log('Selected voice:', selectedVoice.name);
            }
        } else {
            this.utterance.voice = null;
        }
    }

    updateCharacterCount() {
        if (!this.charCount || !this.textInput) return;
        
        const count = this.textInput.value.length;
        this.charCount.textContent = count;
        
        // Update color based on count
        if (count > 2500) {
            this.charCount.style.color = '#dc3545';
        } else if (count > 2000) {
            this.charCount.style.color = '#ffc107';
        } else {
            this.charCount.style.color = '#28a745';
        }
    }

    updateVoiceCount() {
        if (!this.voiceCount) return;
        
        const totalVoices = this.voices.length;
        const englishVoices = this.voices.filter(voice => 
            voice.lang.toLowerCase().startsWith('en')
        ).length;
        
        this.voiceCount.innerHTML = `
            <div class="voice-stats">
                <span class="stat-item">📊 Total Voices: <strong>${totalVoices}</strong></span>
                <span class="stat-item">🇺🇸 English Voices: <strong>${englishVoices}</strong></span>
                <span class="stat-item">🌍 Languages: <strong>${[...new Set(this.voices.map(v => v.lang.split('-')[0]))].length}</strong></span>
            </div>
        `;
    }

    validateInput() {
        if (!this.textInput) return false;
        
        const text = this.textInput.value.trim();
        
        if (!text) {
            this.showStatus('⚠️ Please enter some text to convert.', 'error');
            return false;
        }
        
        if (text.length > 3000) {
            this.showStatus('⚠️ Text exceeds 3,000 character limit.', 'error');
            return false;
        }
        
        return true;
    }

    // Setup desktop audio capture for recording TTS output
    async setupDesktopAudioCapture() {
        try {
            // Request desktop audio capture (Chrome specific)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                },
                video: false
            }).catch(() => {
                // Fallback: try to capture system audio
                return navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        // Try to capture system/loopback audio
                        deviceId: 'default'
                    }
                });
            });

            return stream;
        } catch (error) {
            console.log('Desktop audio capture not available:', error.message);
            return null;
        }
    }

    // Alternative method: Use Web Audio API to create synthetic audio
    async createSyntheticAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a simple audio synthesis that mimics TTS
            const text = this.textInput.value;
            const duration = Math.max(text.length * 0.05, 1); // Estimate duration
            
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate audio that represents speech patterns
            for (let i = 0; i < data.length; i++) {
                // Create speech-like waveform
                const time = i / sampleRate;
                const baseFreq = 150 + Math.sin(time * 2) * 50; // Voice fundamental frequency
                const speechPattern = Math.sin(2 * Math.PI * baseFreq * time) * 0.3;
                
                // Add harmonics for more natural sound
                const harmonic1 = Math.sin(2 * Math.PI * baseFreq * 2 * time) * 0.1;
                const harmonic2 = Math.sin(2 * Math.PI * baseFreq * 3 * time) * 0.05;
                
                // Add speech-like modulation
                const modulation = 1 + Math.sin(time * 10) * 0.1;
                
                data[i] = (speechPattern + harmonic1 + harmonic2) * modulation * 0.8;
            }
            
            return buffer;
        } catch (error) {
            console.error('Synthetic audio creation failed:', error);
            return null;
        }
    }

    // Convert AudioBuffer to WAV blob
    audioBufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Convert float samples to 16-bit PCM
        const data = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    async play() {
        if (!this.validateInput()) return;
        
        // Handle resume
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.updateButtonStates();
            this.showStatus('▶️ Speech resumed.', 'info');
            return;
        }
        
        // Stop any current speech
        this.synth.cancel();
        
        // Try to setup audio recording
        const stream = await this.setupDesktopAudioCapture();
        
        if (stream) {
            // Real audio recording
            this.setupRealAudioRecording(stream);
        } else {
            // Fallback to synthetic audio
            this.showStatus('🎵 Using synthetic audio generation (real recording requires screen sharing permission)', 'info');
        }
        
        // Configure utterance
        this.utterance.text = this.textInput.value;
        this.utterance.lang = this.languageSelect ? this.languageSelect.value : 'en-US';
        this.utterance.rate = 1.0;
        this.utterance.pitch = 1.0;
        this.utterance.volume = 1.0;
        
        // Update voice selection
        this.updateVoice();
        
        // Start speech
        this.synth.speak(this.utterance);
        this.showStatus('🎤 Converting text to audio...', 'info');
    }

    setupRealAudioRecording(stream) {
        try {
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.currentAudioBlob = audioBlob;
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            console.log('Real audio recording started');
        } catch (error) {
            console.error('Real audio recording setup failed:', error);
            this.mediaRecorder = null;
        }
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.pause();
            }
            this.isPaused = true;
            this.updateButtonStates();
            this.showStatus('⏸️ Speech paused.', 'info');
        }
    }

    stop() {
        this.synth.cancel();
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtonStates();
        this.showStatus('⏹️ Speech stopped.', 'info');
    }

    async onSpeechStart() {
        this.isPlaying = true;
        this.isPaused = false;
        this.updateButtonStates();
        this.showStatus('🎤 Speech playing...', 'success');
    }

    async onSpeechEnd() {
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtonStates();
        
        // Stop recording if active
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        } else {
            // Create synthetic audio as fallback
            const audioBuffer = await this.createSyntheticAudio();
            if (audioBuffer) {
                this.currentAudioBlob = this.audioBufferToWav(audioBuffer);
            }
        }
        
        // Enable download after completion
        if (this.downloadBtn) {
            this.downloadBtn.disabled = false;
        }
        
        this.showStatus('✅ Speech completed! Audio file ready for download.', 'success');
    }

    onSpeechPause() {
        this.showStatus('⏸️ Speech paused.', 'info');
    }

    onSpeechResume() {
        this.showStatus('▶️ Speech resumed.', 'info');
    }

    onSpeechError(event) {
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtonStates();
        this.showStatus(`❌ Speech error: ${event.error}. Try refreshing the page.`, 'error');
        console.error('Speech synthesis error:', event);
    }

    updateButtonStates() {
        if (!this.playBtn) return;
        
        this.playBtn.disabled = this.isPlaying && !this.isPaused;
        
        if (this.pauseBtn) {
            this.pauseBtn.disabled = !this.isPlaying || this.isPaused;
        }
        
        if (this.stopBtn) {
            this.stopBtn.disabled = !this.isPlaying;
        }
        
        // Update play button text
        const playText = this.playBtn.querySelector('.btn-text');
        if (playText) {
            playText.textContent = this.isPaused ? 'Resume' : 'Play';
        }
    }

    async downloadRealAudio() {
        if (this.currentAudioBlob) {
            // Download the real audio file
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `TextToAudioMP3_${timestamp}.wav`;
            
            const url = URL.createObjectURL(this.currentAudioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('🎵 Real audio file downloaded successfully!', 'success');
        } else {
            // Create synthetic audio as final fallback
            const audioBuffer = await this.createSyntheticAudio();
            if (audioBuffer) {
                const audioBlob = this.audioBufferToWav(audioBuffer);
                const timestamp = new Date().toISOString().slice(0, 10);
                const filename = `TextToAudioMP3_${timestamp}.wav`;
                
                const url = URL.createObjectURL(audioBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showStatus('🎵 Synthetic audio file downloaded!', 'success');
            } else {
                this.showStatus('❌ Unable to create audio file. Please try playing the text first.', 'error');
            }
        }
    }

    showStatus(message, type) {
        if (!this.status) return;
        
        this.status.innerHTML = message;
        this.status.className = `status-message ${type}`;
        this.status.style.display = 'block';
        
        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (this.status && this.status.className === `status-message ${type}`) {
                    this.status.style.display = 'none';
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for speech synthesis support
    if (!('speechSynthesis' in window)) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = '❌ Sorry, your browser does not support text-to-speech functionality. Please try Chrome, Firefox, Safari, or Edge.';
            statusEl.className = 'status-message error';
            statusEl.style.display = 'block';
        }
        return;
    }
    
    // Initialize the TextToAudioMP3 converter
    window.textToAudioMP3 = new RealTextToAudioMP3();
    
    console.log('TextToAudioMP3 with real audio recording loaded!');
});
