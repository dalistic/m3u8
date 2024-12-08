// Global değişkenleri en üstte tanımla
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let currentPlaylistName = 'KekikAkademi';
let favoriteChannels = JSON.parse(localStorage.getItem('favoriteChannels')) || [];

// removePlaylist fonksiyonunu güncelle
function removePlaylist(index) {
    if (confirm('Bu playlist\'i silmek istediğinizden emin misiniz?')) {
        // Mevcut playlist listesini al
        const currentPlaylists = JSON.parse(localStorage.getItem('playlists')) || [];
        
        // Belirtilen indeksteki playlist'i sil
        currentPlaylists.splice(index, 1);
        
        // Global playlists değişkenini güncelle
        playlists = currentPlaylists;
        
        // localStorage'ı güncelle
        localStorage.setItem('playlists', JSON.stringify(currentPlaylists));
        
        // Arayüzü güncelle
        renderPlaylists();
    }
}

// renderPlaylists fonksiyonunu güncelle
function renderPlaylists() {
    const existingPlaylists = document.getElementById('existingPlaylists');
    if (!existingPlaylists) return;

    existingPlaylists.innerHTML = '';
    
    playlists.forEach((playlist, index) => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <span>${playlist.name}</span>
            <button class="delete-playlist" onclick="removePlaylist(${index})">Sil</button>
        `;
        
        // Playlist'e tıklama
        div.querySelector('span').addEventListener('click', () => {
            loadPlaylist(playlist);
            currentPlaylistName = playlist.name;
        });
        
        existingPlaylists.appendChild(div);
    });
}

// window objesine removePlaylist fonksiyonunu ekle
window.removePlaylist = removePlaylist;

document.addEventListener('DOMContentLoaded', function() {
    const videoPlayer = document.getElementById('videoPlayer');
    const channelList = document.getElementById('channelList');
    const channelListContent = document.getElementById('channelListContent');
    const channelInfo = document.getElementById('channelInfo');
    const menuButtons = document.querySelectorAll('.menu-button');
    
    let channels = [];
    let selectedChannelId = null;
    let channelInfoTimeout;
    let currentCategory = 'all';

    // Global değişkenler ekle
    let currentPlaylistName = 'KekikAkademi'; // Varsayılan playlist adı
    let favoriteChannels = JSON.parse(localStorage.getItem('favoriteChannels')) || [];

    // M3U dosyasını yükle ve parse et
    async function loadChannels() {
        try {
            // Son yüklenen playlist'i kontrol et
            const lastLoadedPlaylist = localStorage.getItem('lastLoadedPlaylist');
            if (lastLoadedPlaylist) {
                const playlist = JSON.parse(lastLoadedPlaylist);
                await loadPlaylist(playlist);
            } else {
                // Varsayılan playlist'i yükle
                const xhr = new XMLHttpRequest();
                xhr.open('GET', 'https://raw.githubusercontent.com/keyiflerolsun/IPTV_YenirMi/main/Kanallar/KekikAkademi.m3u', true);
                
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        const data = xhr.responseText;
                        parseM3U(data);
                        setTimeout(loadLastChannel, 100);
                    } else {
                        throw new Error('Kanal listesi yüklenemedi');
                    }
                };
                
                xhr.onerror = function() {
                    throw new Error('Kanal listesi yüklenemedi');
                };
                
                xhr.send();
            }
        } catch (error) {
            console.error('Kanal listesi yüklenemedi:', error);
            alert('Kanal listesi yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }

    // M3U dosyasını parse et
    function parseM3U(data) {
        const lines = data.split('\n');
        let currentChannel = null;
        channels = []; // Kanalları temizle

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                try {
                    // EXTINF satırından bilgileri çıkar
                    const titleMatch = line.match(/,(.*)$/);
                    const nameMatch = line.match(/tvg-name="([^"]*)"/);
                    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                    const groupMatch = line.match(/group-title="([^"]*)"/);

                    currentChannel = {
                        id: channels.length + 1,
                        name: nameMatch ? nameMatch[1] : titleMatch[1],
                        logo: logoMatch ? logoMatch[1] : '',
                        category: groupMatch ? groupMatch[1] : 'Genel',
                        displayName: titleMatch ? titleMatch[1].trim() : '',
                        isFavorite: false
                    };
                } catch (error) {
                    console.error('Kanal bilgisi parse hatası:', error);
                }
            } else if (line && !line.startsWith('#') && currentChannel) {
                currentChannel.streamUrl = line;
                channels.push(currentChannel);
                currentChannel = null;
            }
        });

        // Favori durumlarını localStorage'dan yükle
        channels = channels.map(channel => ({
            ...channel,
            isFavorite: JSON.parse(localStorage.getItem(`favorite_${channel.id}`)) || false
        }));

        console.log('Yüklenen kanallar:', channels);
        renderChannelList();
    }

    // Son izlenen kanalı yükle
    function loadLastChannel() {
        const lastChannel = localStorage.getItem('lastChannel');
        if (lastChannel) {
            try {
                const channel = JSON.parse(lastChannel);
                // Kanal hala mevcut listede var mı kontrol et
                const existingChannel = channels.find(c => c.id === channel.id);
                if (existingChannel) {
                    playChannel(existingChannel);
                } else {
                    // Kanal bulunamadıysa ilk kanalı oynat
                    if (channels.length > 0) {
                        playChannel(channels[0]);
                    }
                }
            } catch (error) {
                console.error('Son izlenen kanal yüklenemedi:', error);
            }
        }
    }

    // Kanal listesini oluştur
    function renderChannelList() {
        channelListContent.innerHTML = '';
        let displayChannels;
        
        if (currentCategory === 'favorites') {
            // Favoriler listesinde tüm favorileri göster ve yıldızları dolu yap
            displayChannels = favoriteChannels.map(channel => ({
                ...channel,
                isFavorite: true // Favoriler listesinde her zaman dolu yıldız göster
            }));
        } else {
            // Tüm kanallar listesinde sadece mevcut playlist'in favorilerini işaretle
            displayChannels = channels.map(channel => ({
                ...channel,
                isFavorite: favoriteChannels.some(fc => 
                    fc.id === channel.id && 
                    fc.originalPlaylist === currentPlaylistName
                )
            }));
        }

        displayChannels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = `channel-item ${channel.id === selectedChannelId ? 'selected' : ''}`;
            
            // Favoriler listesindeyken her zaman dolu yıldız göster
            const isFavorite = currentCategory === 'favorites' ? true : 
                favoriteChannels.some(fc => 
                    fc.id === channel.id && 
                    fc.originalPlaylist === currentPlaylistName
                );
            
            channelElement.innerHTML = `
                <img src="${channel.logo}" alt="${channel.name}" class="channel-logo">
                <span class="channel-name">${channel.displayName || channel.name}</span>
                <span class="favorite-star" data-id="${channel.id}" tabindex="0" style="color: ${isFavorite ? 'gold' : '#555'}">
                    ${isFavorite ? '★' : '☆'}
                </span>
            `;
            
            // Kanal seçme tıklaması
            channelElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favorite-star')) {
                    playChannel(channel);
                }
            });

            // Favori yıldızı tıklaması
            const favoritestar = channelElement.querySelector('.favorite-star');
            favoritestar.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(channel.id);
            });

            // Favori yıldızı için Enter tuşu desteği
            favoritestar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    toggleFavorite(channel.id);
                }
            });

            // Favori yıldızı için focus/blur olayları
            favoritestar.addEventListener('focus', () => {
                favoritestar.classList.add('active');
            });
            
            favoritestar.addEventListener('blur', () => {
                favoritestar.classList.remove('active');
            });

            channelListContent.appendChild(channelElement);
        });
    }

    // Favori durumunu değiştir
    function toggleFavorite(channelId) {
        // Eğer favoriler listesindeyken yıldıza tıklanırsa, kanalı favorilerden kaldır
        if (currentCategory === 'favorites') {
            favoriteChannels = favoriteChannels.filter(fc => fc.id !== channelId);
            localStorage.setItem('favoriteChannels', JSON.stringify(favoriteChannels));
            renderChannelList();
            return;
        }

        // Tüm kanallar listesindeyken normal favori ekleme/çıkarma işlemi yap
        const channel = channels.find(c => c.id === channelId);
        if (channel) {
            const isFavorite = favoriteChannels.some(fc => 
                fc.id === channelId && 
                fc.originalPlaylist === currentPlaylistName
            );
            
            if (!isFavorite) {
                // Favori kanallara ekle
                const favoriteChannel = {
                    ...channel,
                    isFavorite: true,
                    originalPlaylist: currentPlaylistName
                };
                favoriteChannels.push(favoriteChannel);
            } else {
                // Favorilerden çıkar
                favoriteChannels = favoriteChannels.filter(fc => 
                    !(fc.id === channelId && fc.originalPlaylist === currentPlaylistName)
                );
            }
            
            // Favorileri localStorage'a kaydet
            localStorage.setItem('favoriteChannels', JSON.stringify(favoriteChannels));
            
            // Kanal listesini güncelle
            renderChannelList();
        }
    }

    // Kanal oynat
    function playChannel(channel) {
        if (!channel) return; // Geçersiz kanal kontrolü
        
        selectedChannelId = channel.id;
        const video = videoPlayer;
        const streamUrl = channel.streamUrl;

        // Önceki HLS instance'ı varsa temizle
        if (window.currentHls) {
            window.currentHls.destroy();
        }

        // HLS.js ile video oynatma
        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: function(xhr) {
                    xhr.withCredentials = false;
                }
            });
            
            try {
                window.currentHls = hls; // Global referans tut
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    video.play().catch(function(error) {
                        console.log("Video oynatma hatası:", error);
                    });
                });
                
                // Hata yönetimi
                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.log('HLS hata:', event, data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('Ağ hatası, yeniden deneniyor...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('Medya hatası, kurtarılmaya çalışılıyor...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('Kurtarılamaz hata, yayın durduruldu');
                                hls.destroy();
                                break;
                        }
                    }
                });
            } catch (error) {
                console.error('HLS yükleme hatası:', error);
            }
        }
        // Native HLS desteği olan tarayıcılar için (Safari)
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', function() {
                video.play().catch(function(error) {
                    console.log("Video oynatma hatası:", error);
                });
            });
        }
        // HLS desteği olmayan tarayıcılar için
        else {
            console.error('Bu tarayıcı HLS formatını desteklemiyor');
            alert('Bu tarayıcı canlı yayın formatını desteklemiyor. Lütfen Chrome veya Safari kullanın.');
            return;
        }

        showChannelInfo(channel);
        localStorage.setItem('lastChannel', JSON.stringify(channel));
        renderChannelList();
    }

    // Kanal bilgisini göster
    function showChannelInfo(channel) {
        clearTimeout(channelInfoTimeout);
        
        document.getElementById('channelLogo').src = channel.logo;
        document.getElementById('channelName').textContent = channel.displayName || channel.name;
        document.getElementById('channelNumber').textContent = `Kanal ${channel.id}`;
        
        channelInfo.classList.remove('hidden');
        
        channelInfoTimeout = setTimeout(() => {
            channelInfo.classList.add('hidden');
        }, 6000);
    }

    // Kategori butonları için event listener
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            menuButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.textContent === 'Tüm Kanallar' ? 'all' : 'favorites';
            renderChannelList();
        });
    });

    // Klavye kontrollerini dinle
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            channelList.classList.toggle('hidden');
        }
        
        if (!channelList.classList.contains('hidden')) {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                navigateChannels(event.key === 'ArrowUp' ? -1 : 1);
            }
            // Sağ ve sol ok tuşları için gezinme
            else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                
                // Şu anda seçili olan kanalı bul
                const selectedChannel = document.querySelector('.channel-item.selected');
                
                if (event.key === 'ArrowRight') {
                    // Eğer bir kanal seçiliyse ve sağ ok tuşuna basıldıysa
                    if (selectedChannel) {
                        // Yıldıza odaklan
                        const star = selectedChannel.querySelector('.favorite-star');
                        if (star) {
                            star.focus();
                            star.classList.add('active');
                            return;
                        }
                    }
                }
                
                // Eğer yıldız aktif değilse veya sol ok tuşuna basıldıysa menü butonlarına geç
                const menuItems = [
                    ...document.querySelectorAll('.menu-button'),
                    document.querySelector('.add-playlist')
                ].filter(Boolean);

                // Şu anda aktif olan öğeyi bul
                const currentActive = document.querySelector('.menu-button.active, .add-playlist.active');
                let currentIndex = menuItems.indexOf(currentActive);
                
                if (currentIndex === -1) currentIndex = 0;

                if (event.key === 'ArrowRight') {
                    currentIndex = (currentIndex + 1) % menuItems.length;
                } else {
                    currentIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                }

                // Tüm aktif sınıfları temizle
                document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
                
                // Yeni öğeyi aktif yap
                const newActive = menuItems[currentIndex];
                newActive.classList.add('active');

                // Eğer menü butonu seçildiyse kategoriyi güncelle
                if (newActive.classList.contains('menu-button')) {
                    currentCategory = newActive.textContent === 'Tüm Kanallar' ? 'all' : 'favorites';
                    renderChannelList();
                }
            }
        }
    });

    // Kanal listesinde gezinme
    function navigateChannels(direction) {
        let displayChannels;
        
        if (currentCategory === 'favorites') {
            displayChannels = favoriteChannels;
        } else {
            displayChannels = channels;
        }

        const currentIndex = displayChannels.findIndex(c => c.id === selectedChannelId);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = displayChannels.length - 1;
        if (newIndex >= displayChannels.length) newIndex = 0;
        
        playChannel(displayChannels[newIndex]);
    }

    // Playlist modal elemanları
    const playlistModal = document.getElementById('playlistModal');
    const addPlaylistBtn = document.getElementById('addPlaylistBtn');
    const playlistUrl = document.getElementById('playlistUrl');
    const playlistName = document.getElementById('playlistName');
    const existingPlaylists = document.getElementById('existingPlaylists');

    // Playlist ekle
    addPlaylistBtn.addEventListener('click', async function() {
        const url = playlistUrl.value.trim();
        const name = playlistName.value.trim();
        
        if (!url || !name) {
            alert('Lütfen tüm alanları doldurun');
            return;
        }

        try {
            // Yeni playlist'i ekle
            const newPlaylist = { name, url };
            playlists.push(newPlaylist);
            
            // localStorage'ı güncelle
            localStorage.setItem('playlists', JSON.stringify(playlists));
            
            // Form alanlarını temizle
            playlistUrl.value = '';
            playlistName.value = '';
            
            // Modal'ı kapat
            playlistModal.classList.add('hidden');
            
            // Yeni playlist'i hemen yükle
            await loadPlaylist(newPlaylist);
            
            // Son yüklenen playlist'i localStorage'a kaydet
            localStorage.setItem('lastLoadedPlaylist', JSON.stringify(newPlaylist));
            
            // Playlist listesini güncelle
            renderPlaylists();
        } catch (error) {
            console.error('Playlist ekleme hatası:', error);
            alert('Playlist eklenirken hata oluştu. Lütfen geçerli bir M3U URL\'si girdiğinizden emin olun.');
        }
    });

    // Playlistleri listele
    function renderPlaylists() {
        const existingPlaylists = document.getElementById('existingPlaylists');
        if (!existingPlaylists) return;

        existingPlaylists.innerHTML = '';
        
        playlists.forEach((playlist, index) => {
            const div = document.createElement('div');
            div.className = 'playlist-item';
            div.innerHTML = `
                <span>${playlist.name}</span>
                <button class="delete-playlist" onclick="removePlaylist(${index})">Sil</button>
            `;
            
            // Playlist'e tıklama
            div.querySelector('span').addEventListener('click', () => {
                loadPlaylist(playlist);
                currentPlaylistName = playlist.name;
            });
            
            existingPlaylists.appendChild(div);
        });
    }

    // Playlist yükle
    async function loadPlaylist(playlist) {
        try {
            currentPlaylistName = playlist.name; // Yüklenen playlist'in adını kaydet
            const xhr = new XMLHttpRequest();
            xhr.open('GET', playlist.url, true);
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const data = xhr.responseText;
                    if (!data || data.trim() === '') {
                        throw new Error('Boş playlist dosyası');
                    }
                    
                    // Mevcut kanal listesini temizle
                    channels = [];
                    
                    // Yeni playlist'i parse et
                    parseM3U(data);
                    
                    // Favori durumlarını koru
                    channels = channels.map(channel => ({
                        ...channel,
                        isFavorite: favoriteChannels.some(fc => fc.id === channel.id)
                    }));
                    
                    // Kanal listesini güncelle
                    renderChannelList();
                    
                    // Modal'ı kapat
                    playlistModal.classList.add('hidden');
                    
                    // Kategoriyi 'Tüm Kanallar'a çevir
                    currentCategory = 'all';
                    menuButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.textContent === 'Tüm Kanallar') {
                            btn.classList.add('active');
                        }
                    });
                    
                    console.log('Playlist başarıyla yüklendi:', playlist.name);
                } else {
                    throw new Error('Playlist yüklenemedi');
                }
            };
            
            xhr.onerror = function() {
                throw new Error('Playlist yüklenemedi');
            };
            
            xhr.send();
        } catch (error) {
            console.error('Playlist yükleme hatası:', error);
            alert('Playlist yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }

    // İlk playlist'i yükle
    loadChannels();

    // Video player özelliklerini güncelle
    videoPlayer.setAttribute('playsinline', ''); // iOS için gerekli
    videoPlayer.setAttribute('autoplay', '');
    videoPlayer.setAttribute('controls', 'false');

    // Favori yıldızı tıklaması için stil ekle
    const style = document.createElement('style');
    style.textContent = `
        .favorite-star.active {
            color: gold !important;
            transform: scale(1.2);
        }
        .add-playlist.active {
            background: #555;
        }
        /* Yıldızları tıklanabilir göster */
        .favorite-star {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .favorite-star:hover {
            transform: scale(1.2);
        }
    `;
    document.head.appendChild(style);

    // Modal aç/kapa olaylarını ekle
    document.querySelector('.add-playlist').addEventListener('click', () => {
        playlistModal.classList.remove('hidden');
        renderPlaylists();
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        playlistModal.classList.add('hidden');
    });

    // Modal dışına tıklandığında kapatma
    playlistModal.addEventListener('click', (e) => {
        if (e.target === playlistModal) {
            playlistModal.classList.add('hidden');
        }
    });

    // ESC tuşu ile kapatma
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !playlistModal.classList.contains('hidden')) {
            playlistModal.classList.add('hidden');
        }
    });
}); 