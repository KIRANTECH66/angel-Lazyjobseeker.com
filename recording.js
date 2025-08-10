const { ipcRenderer } = require('electron');

/**
 * RecordingService - Enhanced for Pro version with live transcription
 * Handles audio recording, chunking, and silence detection
 */
class RecordingService {
    constructor() {
        this.mediaRecorder = null;
        this.isRecording = false;
        this.chunks = [];
        this.liveChunks = [];
        this.chunkInterval = 2000; // Send chunks every 2 seconds for faster live transcription
        this.lastChunkTime = 0;
        this.audioContext = null;
        this.analyser = null;
        this.stream = null;
        this.silenceDetectionThreshold = 0.01;
        this.silenceTimer = null;
        this.onSilenceDetected = null;
        this.consecutiveSilenceCount = 0;
        this.silenceDetectionEnabled = true;
    }

    /**
     * Start recording with enhanced live transcription for Pro version
     * @param {Function} onChunkAvailable - Callback for processed audio chunks
     * @param {Function} onSilenceDetected - Callback for silence detection
     * @returns {Promise<boolean>} - Success status
     */
    async start(onChunkAvailable, onSilenceDetected) {
        if (this.isRecording) return true;
        
        this.onSilenceDetected = onSilenceDetected;
        this.consecutiveSilenceCount = 0;

        try {
            console.log('Starting Pro recording with live transcription...');
            
            // Get audio stream with optimized settings for speech recognition
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1, // Mono for better speech recognition
                    sampleRate: 16000 // 16kHz is optimal for speech
                },
                video: false
            });

            // Set up audio analysis for enhanced silence detection
            this.setupAudioAnalysis(this.stream);

            // Create MediaRecorder instance with optimized settings for transcription
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000 // Higher bitrate for better quality
            });

            // Clear previous chunks
            this.chunks = [];
            this.liveChunks = [];
            this.lastChunkTime = Date.now();

            // Handle data available event with optimized chunking
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                    this.liveChunks.push(event.data);
                    
                    // Process chunks more frequently for Pro version
                    const now = Date.now();
                    if (now - this.lastChunkTime >= this.chunkInterval && this.liveChunks.length > 0) {
                        try {
                            const blob = new Blob(this.liveChunks, { type: 'audio/webm' });
                            const buffer = await blob.arrayBuffer();
                            const base64Data = Buffer.from(buffer).toString('base64');
                            
                            // Call the callback with the chunk data
                            if (onChunkAvailable) {
                                onChunkAvailable(base64Data);
                            }
                            
                            // Reset for next chunk but keep a small overlap for context
                            if (this.liveChunks.length > 1) {
                                // Keep the last chunk for context in the next transcription
                                const lastChunk = this.liveChunks[this.liveChunks.length - 1];
                                this.liveChunks = [lastChunk];
                            } else {
                                this.liveChunks = [];
                            }
                            
                            this.lastChunkTime = now;
                        } catch (error) {
                            console.error('Error processing live chunk:', error);
                        }
                    }
                }
            };

            // Start recording with smaller timeslices for more responsive updates
            this.mediaRecorder.start(300); // Collect data every 300ms for more granular chunks
            this.isRecording = true;
            
            console.log('Pro recording started successfully');
            return true;
        } catch (error) {
            console.error('Failed to start Pro recording:', error);
            await this.stop();
            throw error;
        }
    }

    setupAudioAnalysis(stream) {
        try {
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Connect the stream to the analyser
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            // Configure analyser
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Start monitoring for silence
            this.monitorAudioLevel(dataArray);
        } catch (error) {
            console.error('Failed to setup audio analysis:', error);
        }
    }

    /**
     * Monitor audio levels for silence detection
     * Enhanced for Pro version with more accurate silence detection
     * @param {Uint8Array} dataArray - Audio data array
     */
    monitorAudioLevel(dataArray) {
        if (!this.isRecording || !this.silenceDetectionEnabled) return;
        
        // Get current audio levels
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length / 255; // Normalize to 0-1
        
        // Check for silence (low volume)
        if (average < this.silenceDetectionThreshold) {
            this.consecutiveSilenceCount++;
            
            // If we've detected silence for enough consecutive frames
            if (this.consecutiveSilenceCount > 30) { // About 0.5 seconds at 60fps
                if (!this.silenceTimer) {
                    console.log('Potential silence detected, starting timer...');
                    this.silenceTimer = setTimeout(() => {
                        // Silence detected for the threshold duration
                        console.log('Silence confirmed after timeout');
                        if (this.onSilenceDetected && this.isRecording) {
                            this.onSilenceDetected();
                        }
                    }, 1500); // 1.5 seconds of silence (faster response for Pro version)
                }
            }
        } else {
            // Reset counters if sound detected
            this.consecutiveSilenceCount = 0;
            
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
        }
        
        // Continue monitoring
        if (this.isRecording) {
            requestAnimationFrame(() => this.monitorAudioLevel(dataArray));
        }
    }

    /**
     * Stop recording and return the full audio
     * Enhanced for Pro version with better cleanup
     * @returns {Promise<string>} - Base64 encoded audio
     */
    stop() {
        if (!this.isRecording) return Promise.resolve(null);

        return new Promise((resolve, reject) => {
            try {
                console.log('Stopping Pro recording...');
                
                // Clear any pending silence detection
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
                
                // Reset silence detection state
                this.consecutiveSilenceCount = 0;

                this.mediaRecorder.onstop = async () => {
                    try {
                        // Convert chunks to base64
                        const blob = new Blob(this.chunks, { type: 'audio/webm' });
                        const buffer = await blob.arrayBuffer();
                        const base64Data = Buffer.from(buffer).toString('base64');
                        
                        console.log(`Pro recording stopped, audio size: ${Math.round(base64Data.length / 1024)}KB`);
                        
                        // Clean up
                        this.chunks = [];
                        this.liveChunks = [];
                        this.isRecording = false;
                        
                        // Clean up audio analysis
                        if (this.audioContext) {
                            try {
                                await this.audioContext.close();
                            } catch (err) {
                                console.error('Error closing audio context:', err);
                            }
                            this.audioContext = null;
                            this.analyser = null;
                        }
                        
                        // Stop all tracks
                        if (this.stream) {
                            this.stream.getTracks().forEach(track => track.stop());
                            this.stream = null;
                        }
                        
                        this.mediaRecorder = null;
                        
                        resolve(base64Data);
                    } catch (error) {
                        console.error('Error finalizing recording:', error);
                        reject(error);
                    }
                };

                // Stop recording
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                } else {
                    // Handle case where mediaRecorder is in an unexpected state
                    console.warn('MediaRecorder not in expected state for stopping');
                    this.isRecording = false;
                    resolve(null);
                }
            } catch (error) {
                console.error('Failed to stop Pro recording:', error);
                this.isRecording = false;
                reject(error);
            }
        });
    }
    
    /**
     * Configure Pro features
     * @param {Object} options - Configuration options
     * @param {boolean} [options.silenceDetection] - Enable/disable silence detection
     * @param {number} [options.silenceThreshold] - Silence threshold (0-1)
     * @param {number} [options.chunkInterval] - Interval between chunks in ms
     */
    configure(options = {}) {
        if (options.silenceDetection !== undefined) {
            this.silenceDetectionEnabled = options.silenceDetection;
        }
        
        if (options.silenceThreshold !== undefined) {
            this.silenceDetectionThreshold = options.silenceThreshold;
        }
        
        if (options.chunkInterval !== undefined) {
            this.chunkInterval = options.chunkInterval;
        }
        
        console.log('Pro recording configured:', {
            silenceDetection: this.silenceDetectionEnabled,
            silenceThreshold: this.silenceDetectionThreshold,
            chunkInterval: this.chunkInterval
        });
    }

    isActive() {
        return this.isRecording;
    }
    
    /**
     * Force processing of the current audio chunk for immediate live transcription
     * Enhanced for Pro version with better error handling
     * @param {Function} onChunkAvailable - Callback for the processed chunk
     * @returns {Promise<boolean>} - Success status
     */
    async forceProcessCurrentChunk(onChunkAvailable) {
        if (!this.isRecording) return false;
        
        // If no chunks available, return early
        if (this.liveChunks.length === 0) {
            console.log('No live chunks available to process');
            return false;
        }
        
        try {
            console.log(`Processing ${this.liveChunks.length} pending audio chunks...`);
            
            const blob = new Blob(this.liveChunks, { type: 'audio/webm' });
            const buffer = await blob.arrayBuffer();
            const base64Data = Buffer.from(buffer).toString('base64');
            
            // Call the callback with the chunk data
            if (onChunkAvailable && base64Data) {
                onChunkAvailable(base64Data);
                console.log(`Processed ${Math.round(base64Data.length / 1024)}KB of audio data`);
            }
            
            // Reset for next chunk
            this.liveChunks = [];
            this.lastChunkTime = Date.now();
            
            return true;
        } catch (error) {
            console.error('Failed to process current chunk:', error);
            return false;
        }
    }
}

module.exports = RecordingService; 