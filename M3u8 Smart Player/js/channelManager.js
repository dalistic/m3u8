class ChannelManager {
    constructor(player) {
        this.player = player;
        this.channels = [];
        this.playlists = [];
        this.selectedIndex = 0;
        this.currentPlayingIndex = 0;
        this.isListVisible = false;
        this.loadDefaultPlaylist();
    }

    async loadDefaultPlaylist() {
        const defaultUrl = 'https://raw.githubusercontent.com/keyiflerolsun/IPTV_YenirMi/main/Kanallar/KekikAkademi.m3u';
        await this.addPlaylist('Varsayılan Liste', defaultUrl);
    }

    async addPlaylist(name, url, fileContent = null) {
        try {
            let data;
            if (fileContent) {
                // Dosyadan yükleme
                data = fileContent;
            } else {
                // URL'den yükleme
                const response = await fetch(url);
                data = await response.text();
            }

            const newChannels = this.parseM3U8(data);
            
            this.playlists.push({
                name: name,
                url: url || 'local-file',
                channels: newChannels
            });

            this.channels = newChannels;
            
            this.channels.forEach((channel, index) => {
                channel.number = index + 1;
            });

            this.renderChannels();
            
            if (newChannels.length > 0) {
                this.playChannel(0);
                Utils.showNotification(`${name} listesi eklendi (${newChannels.length} kanal)`);
            }

            this.updatePlaylistsInSettings();
        } catch (error) {
            console.error('Playlist yüklenirken hata:', error);
            Utils.showNotification('Liste yüklenirken hata oluştu!', 5000);
        }
    }

    updatePlaylistsInSettings() {
        const settingsSection = document.querySelector('.settings-section');
        let playlistsDiv = document.getElementById('savedPlaylists');
        
        if (!playlistsDiv) {
            playlistsDiv = document.createElement('div');
            playlistsDiv.id = 'savedPlaylists';
            playlistsDiv.className = 'saved-playlists';
            settingsSection.insertBefore(playlistsDiv, settingsSection.firstChild);
        }

        playlistsDiv.innerHTML = `
            <h4>Kayıtlı Listeler</h4>
            <div class="playlist-buttons">
                ${this.playlists.map((playlist, index) => `
                    <button class="playlist-button" data-index="${index}">
                        ${playlist.name}
                    </button>
                `).join('')}
            </div>
        `;

        const buttons = playlistsDiv.querySelectorAll('.playlist-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const index = button.dataset.index;
                this.switchPlaylist(index);
            });
        });
    }

    switchPlaylist(index) {
        const playlist = this.playlists[index];
        if (playlist) {
            this.channels = playlist.channels;
            
            this.channels.forEach((channel, idx) => {
                channel.number = idx + 1;
            });

            this.renderChannels();
            if (this.channels.length > 0) {
                this.playChannel(0);
            }
            Utils.showNotification(`${playlist.name} listesi yüklendi (${this.channels.length} kanal)`);
        }
    }

    parseM3U8(content) {
        const lines = content.split('\n');
        const channels = [];
        let currentChannel = null;

        lines.forEach((line, index) => {
            // Yorum satırlarını ve boş satırları atla
            if (line.startsWith('#') && !line.startsWith('#EXTINF:')) {
                return;
            }

            if (line.startsWith('#EXTINF:')) {
                // Logo için tvg-logo parametresini ara
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                // İsim için son virgülden sonrasını al
                const nameMatch = line.match(/,([^,]+)$/);
                
                if (nameMatch) {
                    currentChannel = {
                        number: channels.length + 1,
                        logo: logoMatch && logoMatch[1] ? logoMatch[1] : '📺',
                        name: nameMatch[1].trim(),
                        type: 'm3u8'
                    };
                }
            } else if (line.trim()) {  // Boş olmayan herhangi bir satır
                const url = line.trim();
                if (url.startsWith('http') && currentChannel) {
                    // URL'yi temizle ve protokolü ekle
                    currentChannel.url = url.startsWith('//') ? 'https:' + url : url;
                    
                    // YouTube linkleri için embed tipini ayarla
                    if (currentChannel.url.includes('youtube.com')) {
                        currentChannel.type = 'embed';
                    }
                    
                    channels.push(currentChannel);
                    currentChannel = null;
                }
            }
        });

        console.log('Parsed channels:', channels); // Debug için
        return channels;
    }

    renderChannels() {
        const container = document.getElementById('channelContainer');
        container.innerHTML = '';

        this.channels.forEach((channel, index) => {
            const channelElement = document.createElement('div');
            channelElement.className = `channel-item ${index === this.selectedIndex ? 'selected' : ''}`;
            
            if (channel.logo === '📺') {
                channelElement.innerHTML = `
                    <span class="channel-number">${channel.number}</span>
                    <span class="channel-emoji">${channel.logo}</span>
                    <span>${channel.name}</span>
                `;
            } else {
                channelElement.innerHTML = `
                    <span class="channel-number">${channel.number}</span>
                    <img src="${channel.logo}" onerror="this.onerror=null;this.src='assets/default-channel-logo.png'">
                    <span>${channel.name}</span>
                `;
            }
            
            channelElement.addEventListener('click', () => {
                this.playChannel(index);
            });
            
            container.appendChild(channelElement);
        });
    }

    toggleChannelList() {
        this.isListVisible = !this.isListVisible;
        const channelList = document.getElementById('channelList');
        
        if (this.isListVisible) {
            channelList.classList.add('show');
            this.updateSelection();
        } else {
            channelList.classList.remove('show');
        }
    }

    selectNextChannel() {
        if (this.selectedIndex < this.channels.length - 1) {
            this.selectedIndex++;
            this.updateSelection();
        }
    }

    selectPreviousChannel() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelection();
        }
    }

    updateSelection() {
        const items = document.querySelectorAll('.channel-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        const selectedItem = items[this.selectedIndex];
        const container = document.getElementById('channelContainer');
        
        if (selectedItem) {
            const containerHeight = container.clientHeight;
            const itemHeight = selectedItem.clientHeight;
            
            const scrollPosition = selectedItem.offsetTop - (containerHeight / 2) + (itemHeight / 2);
            
            container.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
        }
    }

    playChannel(index) {
        if (index >= 0 && index < this.channels.length) {
            this.selectedIndex = index;
            this.currentPlayingIndex = index;
            const channel = this.channels[index];
            
            console.log('Playing channel:', channel); // Debug için

            const videoPlayer = document.getElementById('videoPlayer');
            const embedContainer = document.getElementById('embedContainer');
            const embedWrapper = embedContainer.querySelector('.embed-wrapper');
            
            if (!channel.url) {
                console.error('Channel URL is missing:', channel);
                Utils.showNotification('Kanal URL\'si bulunamadı!');
                return;
            }

            if (channel.type === 'embed') {
                videoPlayer.style.display = 'none';
                embedContainer.style.display = 'block';
                
                let embedUrl = channel.url;
                if (embedUrl.includes('?')) {
                    embedUrl += '&autoplay=1';
                } else {
                    embedUrl += '?autoplay=1';
                }

                embedWrapper.innerHTML = `
                    <iframe 
                        src="${embedUrl}"
                        style="width: 100%; height: 100%; border: none;"
                        allowfullscreen
                        allow="autoplay; fullscreen"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    ></iframe>
                `;
            } else {
                videoPlayer.style.display = 'block';
                embedContainer.style.display = 'none';
                embedWrapper.innerHTML = '';
                this.player.loadChannel(channel);
            }
            
            this.updateSelection();
            this.showChannelInfo(channel);
        }
    }

    showChannelInfo(channel) {
        const overlay = document.querySelector('.channel-info-overlay');
        const logo = document.getElementById('currentChannelLogo');
        const name = document.getElementById('currentChannelName');
        const number = document.getElementById('channelNumber');

        if (channel.logo === '📺') {
            logo.style.display = 'none';
            name.innerHTML = `${channel.logo} ${channel.name}`;
        } else {
            logo.style.display = 'block';
            logo.src = channel.logo;
            name.textContent = channel.name;
        }
        
        number.textContent = channel.number;

        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 3000);
    }

    addEmbedChannel(name, embedCode) {
        const hlsMatch = embedCode.match(/src="([^"]+\.m3u8)"/);
        if (hlsMatch) {
            const hlsUrl = hlsMatch[1];
            const channel = {
                number: this.channels.length + 1,
                name: name,
                type: 'm3u8',
                url: hlsUrl,
                logo: 'assets/tv-logo.png'
            };

            this.channels.push(channel);
            this.renderChannels();
            this.playChannel(this.channels.length - 1);
            return;
        }

        const srcMatch = embedCode.match(/src="([^"]+)"/);
        if (!srcMatch) {
            console.error('Geçerli bir iframe URL\'si bulunamadı');
            return;
        }

        const iframeUrl = srcMatch[1];
        const isYouTube = iframeUrl.includes('youtube.com/embed/');
        
        const channel = {
            number: this.channels.length + 1,
            name: name,
            type: 'embed',
            url: iframeUrl,
            logo: isYouTube ? 'assets/youtube-logo.png' : 'assets/embed-logo.png'
        };

        this.channels.push(channel);
        this.renderChannels();
        this.playChannel(this.channels.length - 1);
    }

    addEmbedList(listName, embedList) {
        embedList.forEach((embed, index) => {
            const channel = {
                number: this.channels.length + 1,
                name: embed.name || `${listName} ${index + 1}`,
                type: 'embed',
                url: embed.code,
                logo: embed.logo || (embed.code.includes('youtube.com/embed/') ? 
                    'assets/youtube-logo.png' : 'assets/embed-logo.png')
            };
            this.channels.push(channel);
        });

        this.renderChannels();
        
        if (embedList.length > 0) {
            this.playChannel(this.channels.length - embedList.length);
        }
    }

    getAllChannels() {
        const localChannels = JSON.parse(localStorage.getItem('channels') || '[]');
        if (localChannels.length === 0) {
            return this.defaultChannels;
        }
        return localChannels;
    }
} 