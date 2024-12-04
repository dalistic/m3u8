class VideoPlayer {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.hls = null;
        this.mpegts = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    loadChannel(channel) {
        // Mevcut playerları temizle
        this.destroyPlayers();
        this.retryCount = 0;

        // URL'yi kontrol et
        if (channel.url.includes('.m3u8')) {
            this.loadHLSStream(channel.url);
        } else if (channel.url.includes(':8080/') || channel.url.includes('.ts')) {
            this.loadMPEGTSStream(channel.url);
        } else {
            this.loadDirectStream(channel.url);
        }
    }

    destroyPlayers() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.mpegts) {
            this.mpegts.destroy();
            this.mpegts = null;
        }
        this.video.src = '';
    }

    loadMPEGTSStream(url) {
        if (mpegts.isSupported()) {
            this.mpegts = mpegts.createPlayer({
                type: 'mpegts',
                url: url,
                isLive: true,
                enableStashBuffer: false,
                stashInitialSize: 128,
                liveBufferLatencyChasing: true,
                autoCleanupSourceBuffer: true
            });

            this.mpegts.attachMediaElement(this.video);
            this.mpegts.load();
            this.mpegts.play();

            this.mpegts.on(mpegts.Events.ERROR, (error) => {
                console.error('MPEGTS error:', error);
                this.handleStreamError();
            });

            this.video.play().catch(error => {
                console.error('Video play error:', error);
                this.handlePlayError();
            });
        } else {
            this.loadDirectStream(url);
        }
    }

    loadHLSStream(url) {
        if (Hls.isSupported()) {
            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 4,
                manifestLoadingRetryDelay: 500,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 4,
                levelLoadingRetryDelay: 500,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 500
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    this.handleStreamError();
                }
            });

            this.video.play().catch(error => this.handlePlayError());
        } else {
            this.loadDirectStream(url);
        }
    }

    loadDirectStream(url) {
        this.video.src = url;
        this.video.play().catch(error => this.handlePlayError());
    }

    handleStreamError() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Yeniden bağlanma denemesi: ${this.retryCount}`);
            setTimeout(() => {
                this.destroyPlayers();
                this.loadChannel({ url: this.currentUrl });
            }, 2000);
        } else {
            Utils.showNotification('Kanal yüklenemedi! Başka bir kanal deneyin.');
        }
    }

    handlePlayError() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                this.video.play().catch(error => this.handlePlayError());
            }, 1000);
        } else {
            Utils.showNotification('Video oynatılamıyor!');
        }
    }
} 