let sessionId = Date.now().toString();

// Utility functions
function setInputEnabled(enabled) {
    document.getElementById('messageInput').disabled = !enabled;
    document.getElementById('sendButton').disabled = !enabled;
}

function displayMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = 'message ' + sender;
    if (sender === 'bot') {
        // Aktifkan hyperlink otomatis
        div.innerHTML = `<div class="message-content">${autoLink(message)}</div>`;
    } else {
        div.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'block';
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'none';
}

// Main chat functions
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message || input.disabled) return;
    
    displayMessage(message, 'user');
    input.value = '';
    showTypingIndicator();
    setInputEnabled(false);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: message})
        });
        const data = await response.json();
        setTimeout(() => {
            hideTypingIndicator();
            displayMessage(data.response, 'bot');
            setInputEnabled(true);
        }, 600);
    } catch (error) {
        hideTypingIndicator();
        displayMessage('Terjadi kesalahan. Coba lagi.', 'bot');
        setInputEnabled(true);
    }
}


// Teaching functionality
function showTeachInput() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const teachDiv = document.createElement('div');
    teachDiv.className = 'message bot';
    teachDiv.innerHTML = `
        <div class="message-content">
            <div class="mb-2">
                <strong>🎓 Bantu saya belajar!</strong><br>
                <small>Berikan jawaban yang benar untuk pertanyaan ini:</small>
            </div>
            <div class="d-flex gap-2">
                <input type="text" id="teachInput" placeholder="Masukkan jawaban yang benar..." 
                       class="form-control" style="flex: 1;">
                <button onclick="sendTeach()" class="btn btn-success btn-sm">
                    ✓ Kirim
                </button>
                <button onclick="cancelTeach()" class="btn btn-secondary btn-sm">
                    ✗ Batal
                </button>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(teachDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const teachInput = document.getElementById('teachInput');
    if (teachInput) {
        teachInput.focus();
        teachInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendTeach();
            }
        });
    }
    
    setInputEnabled(false);
}

async function sendTeach() {
    const teachInput = document.getElementById('teachInput');
    if (!teachInput) return;
    
    const answer = teachInput.value.trim();
    if (!answer) {
        alert('Mohon masukkan jawaban!');
        return;
    }
    
    try {
        const response = await fetch('/teach', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({session_id: window.currentSessionId, answer: answer})
        });
        
        const data = await response.json();
        
        displayMessage(data.message || 'Terima kasih! Jawaban sudah disimpan.', 'bot');
        
        // Remove teach input
        const teachDiv = teachInput.closest('.message');
        if (teachDiv) {
            teachDiv.remove();
        }
        
        setInputEnabled(true);
        
    } catch (error) {
        console.error('Error teaching:', error);
        alert('Gagal menyimpan jawaban. Coba lagi.');
    }
}

function cancelTeach() {
    const teachInput = document.getElementById('teachInput');
    if (teachInput) {
        const teachDiv = teachInput.closest('.message');
        if (teachDiv) {
            teachDiv.remove();
        }
    }
    setInputEnabled(true);
}

// Session management
async function loadSessions() {
    try {
        const res = await fetch('/sessions');
        const sessions = await res.json();
        
        let html = '';
        if (sessions.length === 0) {
            html = '<div class="text-center text-muted p-3"><small>Belum ada percakapan</small></div>';
        } else {
            sessions.forEach(s => {
                const isActive = s.id === currentSessionId ? 'active' : '';
                html += `
                    <div class="session-item d-flex justify-content-between align-items-center ${isActive}" style="cursor:pointer;" onclick="selectSession('${s.id}')">
                        <div>
                            <div class="fw-bold">${s.title}</div>
                            <small class="text-muted">ID: ${s.id.substring(0, 8)}...</small>
                        </div>
                        <button class="btn btn-link text-danger p-0 ms-2" title="Hapus Percakapan" onclick="event.stopPropagation(); hapusPercakapan('${s.id}')">
                            🗑️
                        </button>
                    </div>
                `;
            });
        }
        document.getElementById('sessionList').innerHTML = html;
    } catch (error) {
        console.error('Error loading sessions:', error);
        document.getElementById('sessionList').innerHTML = '<div class="text-danger p-3">Error loading sessions</div>';
    }
}

async function createSession() {
    const title = prompt("Masukkan judul percakapan:");
    if (!title || !title.trim()) return;
    
    try {
        const response = await fetch('/session', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: title.trim()})
        });
        
        const data = await response.json();
        window.currentSessionId = data.id;
        
        // Clear chat dan tampilkan pesan selamat datang
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <p>💬 Percakapan "${escapeHtml(title)}" telah dibuat!</p>
                    <p>Silakan mulai bertanya tentang informasi akademik.</p>
                </div>
            `;
        }
        
        await loadSessions();
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
        
    } catch (error) {
        console.error('Error creating session:', error);
        alert('Gagal membuat percakapan baru. Coba lagi.');
    }
}

async function selectSession(sessionId) {
    try {
        currentSessionId = sessionId;
        const response = await fetch(`/session/${sessionId}`);
        const session = await response.json();
        
        // Clear chat messages
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        // Tampilkan pesan-pesan
        if (session.messages && session.messages.length > 0) {
            session.messages.forEach(m => {
                displayMessage(m.text, m.role === 'user' ? 'user' : 'bot');
            });
        } else {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <p>💬 Percakapan "${escapeHtml(session.title)}"</p>
                    <p>Belum ada pesan. Mulai bertanya!</p>
                </div>
            `;
        }
        
        await loadSessions();
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
        
    } catch (error) {
        console.error('Error selecting session:', error);
        alert('Gagal memuat percakapan. Coba lagi.');
    }
}

// Utility functions
function clearChat() {
    if (confirm('Apakah Anda yakin ingin menghapus semua pesan dalam percakapan ini?')) {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <p>💬 Chat telah dibersihkan</p>
                    <p>Silakan mulai percakapan baru!</p>
                </div>
            `;
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) messageInput.focus();
    
    // Auto-focus on message input when clicking anywhere in chat area
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer) {
        chatContainer.addEventListener('click', function() {
            if (messageInput) messageInput.focus();
        });
    }
});

// Auto-reload sessions every 30 seconds
setInterval(loadSessions, 30000);

function hapusPercakapan(sessionId) {
    if (confirm("Yakin ingin menghapus percakapan ini?")) {
        fetch(`/session/${sessionId}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                // Jika percakapan yang dihapus adalah yang sedang aktif, reset tampilan chat
                if (currentSessionId === sessionId) {
                    currentSessionId = null;
                    document.getElementById('chatMessages').innerHTML = `
                        <div class="welcome-message">
                            <p>💬 Percakapan telah dihapus.</p>
                            <p>Silakan buat atau pilih percakapan lain.</p>
                        </div>
                    `;
                }
                loadSessions();
            } else {
                alert("Gagal menghapus percakapan!");
            }
        })
        .catch(() => alert("Gagal menghapus percakapan!"));
    }
}

if (isAuthenticated) {
    // tampilkan tombol buat percakapan baru
    document.getElementById('createSessionBtn').style.display = 'block';
} else {
    document.getElementById('createSessionBtn').style.display = 'none';
}

function autoLink(text) {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}