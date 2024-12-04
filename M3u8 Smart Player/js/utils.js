class Utils {
    static showNotification(message, duration = 3000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, duration);
    }

    static setupTVControls(channelManager) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || 
                e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
            }

            switch(e.key) {
                case 'ArrowUp':
                    if (channelManager.isListVisible) {
                        channelManager.selectPreviousChannel();
                    } else {
                        const prevIndex = channelManager.selectedIndex - 1;
                        if (prevIndex >= 0) {
                            channelManager.playChannel(prevIndex);
                        }
                    }
                    break;
                case 'ArrowDown':
                    if (channelManager.isListVisible) {
                        channelManager.selectNextChannel();
                    } else {
                        const nextIndex = channelManager.selectedIndex + 1;
                        if (nextIndex < channelManager.channels.length) {
                            channelManager.playChannel(nextIndex);
                        }
                    }
                    break;
                case 'Enter':
                    if (!channelManager.isListVisible) {
                        channelManager.toggleChannelList();
                    } else {
                        if (channelManager.selectedIndex === channelManager.currentPlayingIndex) {
                            channelManager.toggleChannelList();
                        } else {
                            channelManager.playChannel(channelManager.selectedIndex);
                        }
                    }
                    break;
                case 'Escape':
                case 'Backspace':
                    if (channelManager.isListVisible) {
                        channelManager.toggleChannelList();
                    }
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    const channelNumber = parseInt(e.key);
                    if (channelNumber < channelManager.channels.length) {
                        channelManager.playChannel(channelNumber - 1);
                        Utils.showNotification(`Kanal ${channelNumber}`);
                    }
                    break;
            }
        });
    }
} 