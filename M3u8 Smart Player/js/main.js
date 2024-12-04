document.addEventListener('DOMContentLoaded', () => {
    const player = new VideoPlayer();
    const channelManager = new ChannelManager(player);

    // Sağ tık menüsünü ve diğer varsayılan olayları engelle
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousedown', e => {
        // Sadece input ve textarea elementlerinde sağ tık izni ver
        if (!e.target.matches('input, textarea')) {
            if (e.button === 2) e.preventDefault();
        }
    });

    // TV kontrolleri
    Utils.setupTVControls(channelManager);

    // Ayarlar modal kontrolü
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.querySelector('.close-settings');

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // M3U8 Playlist ekleme
    const m3u8Form = document.getElementById('m3u8Form');
    const playlistFile = document.getElementById('playlistFile');
    const playlistUrl = document.getElementById('playlistUrl');
    const playlistName = document.getElementById('playlistName');

    // Dosya seçildiğinde otomatik işlem yap
    playlistFile.addEventListener('change', async () => {
        if (playlistFile.files.length > 0) {
            const file = playlistFile.files[0];
            
            // URL alanını devre dışı bırak
            playlistUrl.value = '';
            playlistUrl.disabled = true;

            try {
                // Dosya adını al (uzantısız)
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                
                // Dosya içeriğini oku
                const content = await file.text();
                
                // Playlist'i ekle
                await channelManager.addPlaylist(fileName, null, content);
                
                // Formu temizle ve modal'ı kapat
                m3u8Form.reset();
                settingsModal.style.display = 'none';
                
                // Bildirim göster
                Utils.showNotification(`${fileName} listesi eklendi`);
                
                // URL alanını tekrar aktif et
                playlistUrl.disabled = false;
            } catch (error) {
                console.error('Dosya okuma hatası:', error);
                Utils.showNotification('Dosya okunamadı!', 5000);
                playlistFile.value = '';
                playlistUrl.disabled = false;
            }
        }
    });

    // URL girildiğinde dosya seçimini temizle
    playlistUrl.addEventListener('input', () => {
        if (playlistUrl.value) {
            playlistFile.value = '';
            playlistFile.disabled = true;
        } else {
            playlistFile.disabled = false;
        }
    });

    m3u8Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('playlistName').value;

        try {
            if (playlistFile.files.length > 0) {
                // Dosyadan yükleme
                const file = playlistFile.files[0];
                const content = await file.text();
                await channelManager.addPlaylist(name, null, content);
            } else if (playlistUrl.value) {
                // URL'den yükleme
                await channelManager.addPlaylist(name, playlistUrl.value);
            } else {
                throw new Error('URL veya dosya seçilmedi');
            }

            settingsModal.style.display = 'none';
            Utils.showNotification(`${name} playlist eklendi`);
            m3u8Form.reset();
            playlistUrl.disabled = false;
            playlistFile.disabled = false;
        } catch (error) {
            console.error('Playlist yükleme hatası:', error);
            Utils.showNotification('Liste yüklenirken hata oluştu!', 5000);
        }
    });

    // Embed form tipleri arası geçiş
    const typeButtons = document.querySelectorAll('.type-button');
    const embedForms = document.querySelectorAll('.embed-form');

    typeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Butonları güncelle
            typeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Formları güncelle
            const formId = button.dataset.form;
            embedForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === formId + 'Form') {
                    form.classList.add('active');
                }
            });
        });
    });

    // Embed form içeriğini yönet
    const isEmbedList = document.getElementById('isEmbedList');
    const embedFormContent = document.getElementById('embedFormContent');
    const embedForm = document.getElementById('embedForm');

    // Form içeriklerini hazırla
    const singleEmbedContent = `
        <input type="text" placeholder="Kanal Adı" id="embedName" required>
        <textarea placeholder="Embed Kodu (örn: <iframe...>)" id="embedCode" required></textarea>
        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" id="addToExisting" checked>
                Mevcut listeye ekle
            </label>
        </div>
    `;

    const listEmbedContent = `
        <input type="text" placeholder="Liste Adı" id="embedListName" required>
        <input type="url" placeholder="Embed Liste URL" id="embedListUrl" required>
        <small class="form-help">JSON formatında embed listesi bağlantısı</small>
    `;

    // Başlangıçta tekli embed formunu göster
    embedFormContent.innerHTML = singleEmbedContent;

    // Checkbox değişiminde form içeriğini güncelle
    isEmbedList.addEventListener('change', () => {
        embedFormContent.innerHTML = isEmbedList.checked ? listEmbedContent : singleEmbedContent;
    });

    // Form gönderimi
    embedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (isEmbedList.checked) {
            // Liste ekleme
            const name = document.getElementById('embedListName').value;
            const url = document.getElementById('embedListUrl').value;

            try {
                const response = await fetch(url);
                const embedList = await response.json();
                channelManager.addEmbedList(name, embedList);
                settingsModal.style.display = 'none';
                Utils.showNotification(`${name} listesi eklendi`);
                embedForm.reset();
            } catch (error) {
                Utils.showNotification('Liste yüklenirken hata oluştu!', 5000);
                console.error('Embed liste yükleme hatası:', error);
            }
        } else {
            // Tekli embed ekleme
            const name = document.getElementById('embedName').value;
            const embedCode = document.getElementById('embedCode').value;
            const addToExisting = document.getElementById('addToExisting').checked;

            if (addToExisting) {
                channelManager.addEmbedChannel(name, embedCode);
            } else {
                channelManager.channels = [{
                    number: 1,
                    name: name,
                    type: 'embed',
                    url: embedCode,
                    logo: embedCode.includes('youtube.com/embed/') ? 
                        'assets/youtube-logo.png' : 'assets/embed-logo.png'
                }];
                channelManager.renderChannels();
                channelManager.playChannel(0);
            }

            settingsModal.style.display = 'none';
            Utils.showNotification(`${name} kanalı eklendi`);
            embedForm.reset();
            // Checkbox'ı varsayılana döndür
            if (!addToExisting) {
                document.getElementById('addToExisting').checked = true;
            }
        }
    });

    // Modal dışına tıklandığında kapatma
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Playlist input seçenekleri arası geçiş
    const inputOptionBtns = document.querySelectorAll('.input-option-btn');
    const playlistForms = document.querySelectorAll('.playlist-form');

    inputOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Butonları güncelle
            inputOptionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Formları güncelle
            const inputType = btn.dataset.input;
            playlistForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${inputType}Form`) {
                    form.classList.add('active');
                }
            });
        });
    });

    // Dosya yükleme formu
    const fileForm = document.getElementById('fileForm');
    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('filePlaylistName').value;
        const file = document.getElementById('playlistFile').files[0];

        if (file) {
            try {
                const content = await file.text();
                channelManager.addPlaylist(name, null, content);
                settingsModal.style.display = 'none';
                fileForm.reset();
            } catch (error) {
                console.error('Dosya okuma hatası:', error);
                Utils.showNotification('Dosya okunamadı!', 5000);
            }
        }
    });

    // Test butonu kontrolü
    const testChannelsBtn = document.getElementById('testChannelsBtn');
    const testModal = document.getElementById('testModal');
    const closeTestBtn = document.querySelector('.close-test');

    testChannelsBtn.addEventListener('click', () => {
        testModal.style.display = 'block';
        channelManager.testChannels(); // Test işlemini başlat
    });

    closeTestBtn.addEventListener('click', () => {
        testModal.style.display = 'none';
    });

    // Modal dışına tıklandığında kapatma
    testModal.addEventListener('click', (e) => {
        if (e.target === testModal) {
            testModal.style.display = 'none';
        }
    });

    document.getElementById('testChannelsBtn').addEventListener('click', async () => {
        await channelManager.testChannels();
    });

    document.getElementById('saveActiveChannelsBtn').addEventListener('click', () => {
        channelManager.saveActiveChannels();
    });

    document.getElementById('saveActivePlaylistBtn').addEventListener('click', () => {
        const name = document.getElementById('activePlaylistName').value;
        const content = document.getElementById('activePlaylistContent').value;
        
        // Yeni playlist'i kaydet
        channelManager.addPlaylist(name, content);
        
        // Dialog'u kapat
        document.getElementById('saveActiveChannelsDialog').style.display = 'none';
        
        // Bildirim göster
        showNotification('Aktif kanallar başarıyla kaydedildi!');
    });

    document.getElementById('cancelSaveActiveBtn').addEventListener('click', () => {
        document.getElementById('saveActiveChannelsDialog').style.display = 'none';
    });
}); 