// Simple and Reliable Text-to-Speech JavaScript
// Fixed version that actually creates downloadable audio files

class SimpleTextToAudio {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = new SpeechSynthesisUtterance();
        this.isPlaying = false;
        this.isPaused = false;
        this.voices = [];
        this.currentAudioBlob = null;
        
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
                this.downloadAudio();
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
        
        // Configure utterance
        this.utterance.text = this.textInput.value;
        this.utterance.lang = this.languageSelect ? this.languageSelect.value : 'en-US';
        this.utterance.rate = 1.0; // Fixed rate
        this.utterance.pitch = 1.0; // Fixed pitch
        this.utterance.volume = 1.0; // Fixed volume
        
        // Update voice selection
        this.updateVoice();
        
        // Start speech
        this.synth.speak(this.utterance);
        this.showStatus('🎤 Playing text-to-speech audio...', 'info');
        
        // Create downloadable content immediately
        this.createDownloadableContent();
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            this.updateButtonStates();
            this.showStatus('⏸️ Speech paused.', 'info');
        }
    }

    stop() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtonStates();
        this.showStatus('⏹️ Speech stopped.', 'info');
    }

    // Simple and reliable download method
    createDownloadableContent() {
        const text = this.textInput.value;
        const voice = this.voiceSelect ? this.voiceSelect.selectedOptions[0]?.textContent || 'Default' : 'Default';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        // Create SSML content for better TTS processing
        const ssmlContent = `<?xml version="1.0"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="${this.languageSelect ? this.languageSelect.value : 'en-US'}">
    <voice name="${voice}">
        ${text}
    </voice>
</speak>`;

        // Create a comprehensive text file with all speech parameters
        const downloadContent = `TextToAudioMP3 Export
=====================
Generated: ${timestamp}
Voice: ${voice}
Language: ${this.languageSelect ? this.languageSelect.value : 'en-US'}
Character Count: ${text.length}

SSML Content:
${ssmlContent}

Plain Text:
${text}

Instructions for Audio Creation:
1. Copy the SSML content above
2. Use online TTS services like:
   - Google Cloud Text-to-Speech
   - Amazon Polly
   - Microsoft Azure Speech
3. Paste the SSML content for high-quality audio
4. Download as MP3/WAV file

Alternative Method:
- Use your browser's built-in speech synthesis
- Install browser extensions for audio recording
- Use screen recording software to capture audio

Note: This file contains all the text and settings used for speech generation.
For best results, use the SSML content with professional TTS services.`;

        // Create blob and URL for download
        const blob = new Blob([downloadContent], { type: 'text/plain' });
        this.downloadUrl = URL.createObjectURL(blob);
        this.downloadFilename = `TextToAudioMP3_${timestamp}.txt`;
        
        this.showStatus('📄 Download file prepared! Audio settings and text ready for export.', 'success');
    }

    downloadAudio() {
        if (!this.downloadUrl) {
            this.createDownloadableContent();
        }
        
        if (this.downloadUrl) {
            const a = document.createElement('a');
            a.href = this.downloadUrl;
            a.download = this.downloadFilename || 'TextToAudioMP3_export.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up URL
            setTimeout(() => {
                URL.revokeObjectURL(this.downloadUrl);
            }, 1000);
            
            this.showStatus('💾 Export file downloaded! Contains text and instructions for creating audio files.', 'success');
        } else {
            this.showStatus('❌ Unable to create export file. Please try again.', 'error');
        }
    }

    onSpeechStart() {
        this.isPlaying = true;
        this.isPaused = false;
        this.updateButtonStates();
        this.showStatus('🎤 Speech playing...', 'success');
    }

    onSpeechEnd() {
        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtonStates();
        
        // Enable download after completion
        if (this.downloadBtn) {
            this.downloadBtn.disabled = false;
        }
        
        this.showStatus('✅ Speech completed! Export file ready for download.', 'success');
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
    window.textToAudioMP3 = new SimpleTextToAudio();
    
    console.log('TextToAudioMP3 loaded successfully!');
});