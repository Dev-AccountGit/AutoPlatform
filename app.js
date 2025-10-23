// Firebase Configuration
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global Variables
let currentUser = null;
let currentUserData = null;
let currentPlatform = null;
let allUsers = [];
let allRequests = [];

// Admin Email
const ADMIN_EMAIL = 'dev.git.tdc@gmail.com';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const acceptedTerms = localStorage.getItem('acceptedTerms');
    if (!acceptedTerms) {
        showTermsModal();
    } else {
        checkAuthState();
    }
}

function setupEventListeners() {
    document.getElementById('acceptTerms').addEventListener('change', function() {
        document.getElementById('acceptTermsBtn').disabled = !this.checked;
    });
    
    document.getElementById('loginPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('regPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') register();
    });

    // Listen for notifications
    setupNotificationListener();
}

function setupNotificationListener() {
    // Listen for real-time notifications
    if (isAdmin()) {
        db.collection('notifications').orderBy('createdAt', 'desc').limit(10)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        showNotification(notification.title, notification.message, notification.type);
                    }
                });
            });
    }
}

function showTermsModal() {
    document.getElementById('termsModal').classList.add('active');
}

function acceptTerms() {
    localStorage.setItem('acceptedTerms', 'true');
    document.getElementById('termsModal').classList.remove('active');
    checkAuthState();
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            showPage('dashboard');
            updateNavigation();
            checkPendingBanner();
        } else {
            showPage('login');
            updateNavigation();
        }
    });
}

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            updateUserInterface();
            
            if (isAdmin()) {
                document.getElementById('navAdmin').style.display = 'flex';
                loadAdminData();
            }
            
            loadUserRequests();
            loadReviews();
            checkPendingBanner();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showModal('❌', 'Erro', 'Erro ao carregar dados do usuário.');
    }
}

function isAdmin() {
    return currentUser && currentUser.email === ADMIN_EMAIL;
}

function updateUserInterface() {
    if (currentUserData) {
        document.getElementById('welcomeUserName').textContent = currentUserData.fullName || 'Usuário';
        
        const welcomeStatus = document.getElementById('welcomeStatus');
        if (currentUserData.status === 'pending') {
            welcomeStatus.innerHTML = '<span class="welcome-status-pending">⏳ Aguardando aprovação da conta</span>';
        } else if (currentUserData.status === 'verified') {
            welcomeStatus.innerHTML = '<span class="welcome-status-verified">✅ Conta verificada e ativa</span>';
        } else if (currentUserData.status === 'banned') {
            welcomeStatus.innerHTML = '<span class="welcome-status-banned">❌ Conta suspensa</span>';
        }
        
        const userAvatar = document.getElementById('userAvatar');
        if (currentUserData.profileImage) {
            userAvatar.innerHTML = `<img src="${currentUserData.profileImage}" alt="Profile">`;
        } else {
            userAvatar.textContent = currentUserData.fullName ? currentUserData.fullName.charAt(0).toUpperCase() : '👤';
        }
    }
}

function checkPendingBanner() {
    const pendingBanner = document.getElementById('pendingBanner');
    if (currentUserData && currentUserData.status === 'pending') {
        pendingBanner.style.display = 'block';
        
        // Disable platform cards for pending users
        document.querySelectorAll('.platform-card').forEach(card => {
            if (!card.classList.contains('disabled')) {
                card.classList.add('disabled');
                card.onclick = null;
            }
        });
    } else {
        pendingBanner.style.display = 'none';
        
        // Enable platform cards for verified users
        document.querySelectorAll('.platform-card').forEach(card => {
            card.classList.remove('disabled');
            const platform = card.querySelector('.platform-name').textContent;
            const icon = card.querySelector('.platform-icon').textContent;
            card.onclick = () => openPlatformRequest(platform, icon);
        });
    }
}

function updateNavigation() {
    const isLoggedIn = !!currentUser;
    
    document.getElementById('navDashboard').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('navReviews').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('userAvatar').style.display = isLoggedIn ? 'flex' : 'none';
}

// Authentication Functions
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha todos os campos.');
        return;
    }
    
    try {
        showLoading(true);
        await auth.signInWithEmailAndPassword(email, password);
        showModal('✅', 'Sucesso', 'Login realizado com sucesso!');
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Erro ao fazer login. ';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'Usuário não encontrado.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Senha incorreta.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Email inválido.';
                break;
            default:
                errorMessage += 'Tente novamente.';
        }
        
        showModal('❌', 'Erro no Login', errorMessage);
    } finally {
        showLoading(false);
    }
}

async function register() {
    const fullName = document.getElementById('regFullName').value;
    const registration = document.getElementById('regRegistration').value;
    const school = document.getElementById('regSchool').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    if (!fullName || !registration || !school || !email || !password) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha todos os campos.');
        return;
    }
    
    if (!email.endsWith('@escola.pr.gov.br')) {
        showModal('❌', 'Email Inválido', 'Você deve usar um email @escola.pr.gov.br');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        let profileImageUrl = '';
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput.files[0]) {
            profileImageUrl = await uploadProfileImage(user.uid, profileImageInput.files[0]);
        }
        
        // Create user document with pending status
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            fullName: fullName,
            registration: registration,
            school: school,
            email: email,
            password: password, // Store password for admin view
            profileImage: profileImageUrl,
            status: 'pending', // pending, verified, banned
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isVerified: false
        });

        // Notify admin about new user
        await db.collection('adminNotifications').add({
            type: 'new_user',
            userId: user.uid,
            userName: fullName,
            userEmail: email,
            message: `Novo usuário registrado: ${fullName} (${email})`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showModal('✅', 'Conta Criada', 
            'Sua conta foi criada com sucesso! ⏳\n\n' +
            'Sua conta está aguardando aprovação dos administradores. ' +
            'Você receberá uma notificação quando for aprovado.'
        );
        
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Erro ao criar conta. ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Este email já está em uso.';
                break;
            case 'auth/weak-password':
                errorMessage += 'A senha é muito fraca.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Email inválido.';
                break;
            default:
                errorMessage += 'Tente novamente.';
        }
        
        showModal('❌', 'Erro no Cadastro', errorMessage);
    } finally {
        showLoading(false);
    }
}

async function uploadProfileImage(userId, file) {
    try {
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`profileImages/${userId}/${file.name}`);
        await imageRef.put(file);
        return await imageRef.getDownloadURL();
    } catch (error) {
        console.error('Error uploading profile image:', error);
        return '';
    }
}

function previewProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePreviewImg').src = e.target.result;
            document.getElementById('profilePreviewImg').style.display = 'block';
            document.getElementById('profilePreviewIcon').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function previewEditProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editProfilePreviewImg').src = e.target.result;
            document.getElementById('editProfilePreviewImg').style.display = 'block';
            document.getElementById('editProfilePreviewIcon').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Navigation Functions
function showPage(page) {
    document.querySelectorAll('.auth-page, .dashboard-page').forEach(el => {
        el.classList.remove('active');
    });
    
    switch (page) {
        case 'login':
            document.getElementById('loginPage').classList.add('active');
            break;
        case 'register':
            document.getElementById('registerPage').classList.add('active');
            break;
        case 'dashboard':
            document.getElementById('dashboardPage').classList.add('active');
            loadUserRequests();
            break;
        case 'reviews':
            document.getElementById('reviewsPage').classList.add('active');
            loadReviews();
            break;
        case 'admin':
            if (isAdmin()) {
                document.getElementById('adminPage').classList.add('active');
                loadAdminData();
            }
            break;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtn = document.getElementById(`nav${page.charAt(0).toUpperCase() + page.slice(1)}`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
}

// Platform Request Functions
function openPlatformRequest(platform, icon) {
    if (currentUserData && currentUserData.status !== 'verified') {
        showModal('⏳', 'Conta Não Aprovada', 
            'Sua conta ainda não foi aprovada pelos administradores. ' +
            'Aguarde a aprovação para fazer solicitações.'
        );
        return;
    }
    
    currentPlatform = platform;
    document.getElementById('platformIcon').textContent = icon;
    document.getElementById('platformTitle').textContent = platform;
    document.getElementById('platformUsername').value = '';
    document.getElementById('platformPassword').value = '';
    document.getElementById('platformNotes').value = '';
    document.getElementById('platformRequestModal').classList.add('active');
}

function closePlatformRequestModal() {
    document.getElementById('platformRequestModal').classList.remove('active');
    currentPlatform = null;
}

async function submitPlatformRequest() {
    if (currentUserData && currentUserData.status !== 'verified') {
        showModal('❌', 'Conta Não Verificada', 'Sua conta precisa ser verificada para fazer solicitações.');
        return;
    }

    const username = document.getElementById('platformUsername').value;
    const password = document.getElementById('platformPassword').value;
    const notes = document.getElementById('platformNotes').value;
    
    if (!username || !password) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha email/usuário e senha.');
        return;
    }
    
    try {
        showLoading(true);
        
        await db.collection('requests').add({
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUserData.fullName,
            platform: currentPlatform,
            username: username,
            password: password,
            notes: notes,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closePlatformRequestModal();
        showModal('✅', 'Solicitação Enviada', 
            'Sua solicitação foi enviada com sucesso! ⏳\n\n' +
            'Aviso: O processamento pode demorar devido à alta demanda. ' +
            'Nossa equipe administrativa é pequena e trabalha manualmente em cada solicitação.'
        );
        
        loadUserRequests();
        
    } catch (error) {
        console.error('Error submitting request:', error);
        showModal('❌', 'Erro', 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
        showLoading(false);
    }
}

async function loadUserRequests() {
    if (!currentUser) return;
    
    try {
        const requestsSnapshot = await db.collection('requests')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const requestsContainer = document.getElementById('userRequestsContainer');
        requestsContainer.innerHTML = '';
        
        if (requestsSnapshot.empty) {
            requestsContainer.innerHTML = `
                <div class="info-box" style="text-align: center;">
                    📝 Você ainda não fez nenhuma solicitação.
                    <br>Clique em uma plataforma acima para começar!
                </div>
            `;
            updateStats(0, 0);
            return;
        }
        
        let totalRequests = 0;
        let completedRequests = 0;
        
        requestsSnapshot.forEach(doc => {
            const request = doc.data();
            totalRequests++;
            if (request.status === 'completed') completedRequests++;
            
            const requestElement = createRequestElement(request, doc.id, false);
            requestsContainer.appendChild(requestElement);
        });
        
        updateStats(totalRequests, completedRequests);
        
    } catch (error) {
        console.error('Error loading requests:', error);
        document.getElementById('userRequestsContainer').innerHTML = `
            <div class="info-box" style="text-align: center;">
                ❌ Erro ao carregar solicitações.
            </div>
        `;
    }
}

function createRequestElement(request, requestId, isAdminView = false) {
    const statusTexts = {
        'pending': '⏳ Pendente',
        'approved': '✅ Aprovado',
        'completed': '🎉 Concluído',
        'rejected': '❌ Recusado'
    };
    
    const statusColors = {
        'pending': 'status-pending',
        'approved': 'status-approved',
        'completed': 'status-completed',
        'rejected': 'status-rejected'
    };
    
    const element = document.createElement('div');
    element.className = 'request-card';
    element.innerHTML = `
        <div class="request-header">
            <div class="request-platform">
                <span>${getPlatformIcon(request.platform)}</span>
                <span>${request.platform}</span>
            </div>
            <div class="request-status ${statusColors[request.status]}">
                ${statusTexts[request.status]}
            </div>
        </div>
        <div class="request-details">
            <strong>Usuário:</strong> ${request.username}<br>
            <strong>Data:</strong> ${request.createdAt?.toDate().toLocaleDateString('pt-BR')}
            ${isAdminView ? `<br><strong>Aluno:</strong> ${request.userName} (${request.userEmail})` : ''}
        </div>
        ${request.notes ? `<div class="request-notes"><strong>Observações:</strong> ${request.notes}</div>` : ''}
        ${isAdminView ? createAdminActions(request, requestId) : ''}
    `;
    
    return element;
}

function getPlatformIcon(platform) {
    const icons = {
        'Quizizz': '📝',
        'Wayground': '🌐',
        'Redação Paraná': '✍️',
        'Khan Academy': '🎓',
        'Inglês Paraná': '🗣️'
    };
    return icons[platform] || '🌐';
}

function updateStats(total, completed) {
    document.getElementById('totalRequests').textContent = total;
    document.getElementById('completedRequests').textContent = completed;
}

// Admin Functions
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-content').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
    event.target.classList.add('active');
}

async function loadAdminData() {
    if (!isAdmin()) return;
    
    try {
        await loadAdminUsers();
        await loadAdminRequests();
        await loadAdminReviews();
        await loadAnalytics();
        
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

async function loadAdminUsers() {
    try {
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        allUsers = [];
        
        const container = document.getElementById('adminUsersGrid');
        container.innerHTML = '';

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            allUsers.push({id: doc.id, ...user});
            
            const userElement = createAdminUserCard(user);
            container.appendChild(userElement);
        });

        if (usersSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">Nenhum usuário cadastrado</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function createAdminUserCard(user) {
    const statusBadge = user.status === 'verified' ? 'status-verified' : 
                       user.status === 'banned' ? 'status-banned' : 'status-pending';
    
    const statusText = user.status === 'verified' ? 'Verificado' : 
                      user.status === 'banned' ? 'Banido' : 'Pendente';

    const element = document.createElement('div');
    element.className = 'user-card-enhanced';
    element.innerHTML = `
        <div class="user-card-header">
            <div class="user-avatar-large">
                ${user.profileImage ? 
                    `<img src="${user.profileImage}" alt="${user.fullName}">` : 
                    (user.fullName ? user.fullName.charAt(0).toUpperCase() : '👤')
                }
            </div>
            <div class="user-info">
                <h4>
                    ${user.fullName}
                    <span class="user-status ${statusBadge}">${statusText}</span>
                </h4>
                <p>${user.email}</p>
            </div>
        </div>
        
        <div class="user-details-grid">
            <div class="user-detail-item">
                <div class="user-detail-label">🎒 Matrícula</div>
                <div class="user-detail-value">${user.registration || 'N/A'}</div>
            </div>
            <div class="user-detail-item">
                <div class="user-detail-label">🏫 Escola</div>
                <div class="user-detail-value">${user.school || 'N/A'}</div>
            </div>
            <div class="user-detail-item">
                <div class="user-detail-label">🔒 Senha</div>
                <div class="user-detail-value">${user.password || 'N/A'}</div>
            </div>
            <div class="user-detail-item">
                <div class="user-detail-label">📅 Cadastro</div>
                <div class="user-detail-value">${user.createdAt?.toDate().toLocaleDateString('pt-BR') || 'N/A'}</div>
            </div>
        </div>
        
        <div class="user-actions">
            ${user.status === 'pending' ? `
                <button class="action-btn approve" onclick="updateUserStatus('${user.uid}', 'verified')">
                    ✅ Aprovar
                </button>
            ` : ''}
            
            ${user.status === 'verified' ? `
                <button class="action-btn reject" onclick="updateUserStatus('${user.uid}', 'banned')">
                    🚫 Banir
                </button>
            ` : ''}
            
            ${user.status === 'banned' ? `
                <button class="action-btn approve" onclick="updateUserStatus('${user.uid}', 'verified')">
                    🔓 Desbanir
                </button>
            ` : ''}
            
            ${user.status === 'pending' ? `
                <button class="action-btn reject" onclick="updateUserStatus('${user.uid}', 'banned')">
                    🚫 Rejeitar
                </button>
            ` : ''}
            
            <button class="action-btn reject" onclick="sendUserNotification('${user.uid}', '${user.fullName}')">
                📢 Notificar
            </button>
            
            <button class="action-btn reject" onclick="deleteUser('${user.uid}')">
                🗑️ Excluir
            </button>
        </div>
    `;
    
    return element;
}

async function updateUserStatus(userId, newStatus) {
    try {
        showLoading(true);
        
        await db.collection('users').doc(userId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        let message = '';
        let notificationMessage = '';
        
        switch (newStatus) {
            case 'verified':
                message = 'Usuário aprovado com sucesso!';
                notificationMessage = '✅ Sua conta foi aprovada! Agora você pode fazer solicitações de automação.';
                break;
            case 'banned':
                message = 'Usuário banido com sucesso!';
                notificationMessage = '❌ Sua conta foi suspensa. Entre em contato com os administradores.';
                break;
        }
        
        // Send notification to user
        if (notificationMessage) {
            await db.collection('notifications').add({
                userId: userId,
                title: 'Atualização da Conta',
                message: notificationMessage,
                type: newStatus === 'verified' ? 'success' : 'error',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        }
        
        showModal('✅', 'Status Atualizado', message);
        loadAdminUsers();
        
    } catch (error) {
        console.error('Error updating user status:', error);
        showModal('❌', 'Erro', 'Erro ao atualizar status do usuário.');
    } finally {
        showLoading(false);
    }
}

async function sendUserNotification(userId, userName) {
    const title = prompt(`Enviar notificação para ${userName}:`, 'Título da notificação');
    if (!title) return;
    
    const message = prompt('Mensagem:', 'Digite a mensagem...');
    if (!message) return;
    
    try {
        await db.collection('notifications').add({
            userId: userId,
            title: title,
            message: message,
            type: 'info',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showModal('✅', 'Notificação Enviada', `Notificação enviada para ${userName}`);
    } catch (error) {
        console.error('Error sending notification:', error);
        showModal('❌', 'Erro', 'Erro ao enviar notificação.');
    }
}

async function sendGlobalNotification() {
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const type = document.getElementById('notificationType').value;
    
    if (!title || !message) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha título e mensagem.');
        return;
    }
    
    try {
        showLoading(true);
        
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        
        // Send notification to each user
        const promises = usersSnapshot.docs.map(doc => {
            const user = doc.data();
            return db.collection('notifications').add({
                userId: user.uid,
                title: title,
                message: message,
                type: type,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                global: true
            });
        });
        
        await Promise.all(promises);
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        
        showModal('✅', 'Notificação Enviada', 
            `Notificação enviada para todos os ${usersSnapshot.size} usuários!`
        );
        
    } catch (error) {
        console.error('Error sending global notification:', error);
        showModal('❌', 'Erro', 'Erro ao enviar notificação global.');
    } finally {
        showLoading(false);
    }
}

// Notification System
function showNotification(title, message, type = 'info') {
    const notificationContainer = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">
                ${getNotificationIcon(type)} ${title}
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 10000);
}

function getNotificationIcon(type) {
    const icons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'success': '✅',
        'error': '❌'
    };
    return icons[type] || 'ℹ️';
}

// Load user notifications when they login
async function loadUserNotifications() {
    if (!currentUser) return;
    
    try {
        const notificationsSnapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        notificationsSnapshot.forEach(doc => {
            const notification = doc.data();
            if (!notification.read) {
                showNotification(notification.title, notification.message, notification.type);
                
                // Mark as read
                db.collection('notifications').doc(doc.id).update({
                    read: true
                });
            }
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update the loadUserData function to load notifications
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            updateUserInterface();
            
            if (isAdmin()) {
                document.getElementById('navAdmin').style.display = 'flex';
                loadAdminData();
            }
            
            loadUserRequests();
            loadReviews();
            checkPendingBanner();
            loadUserNotifications(); // Load notifications
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showModal('❌', 'Erro', 'Erro ao carregar dados do usuário.');
    }
}

// Rest of the functions remain the same as previous version...
// (loadAdminRequests, createAdminActions, updateRequestStatus, etc.)

// Utility Functions
function showModal(icon, title, message) {
    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('generalModal').classList.add('active');
}

function closeModal() {
    document.getElementById('generalModal').classList.remove('active');
}

function showLoading(show) {
    // Implement loading state if needed
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        auth.signOut();
        showPage('login');
    }
}

// Search and Filter Functions
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const userCards = document.querySelectorAll('.user-card-enhanced');
    
    userCards.forEach(card => {
        const userName = card.querySelector('h4').textContent.toLowerCase();
        const userEmail = card.querySelector('p').textContent.toLowerCase();
        
        if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function searchRequests() {
    const searchTerm = document.getElementById('requestSearch').value.toLowerCase();
    const requestCards = document.querySelectorAll('.request-card');
    
    requestCards.forEach(card => {
        const platform = card.querySelector('.request-platform').textContent.toLowerCase();
        const userInfo = card.querySelector('.request-details').textContent.toLowerCase();
        
        if (platform.includes(searchTerm) || userInfo.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterRequests() {
    const statusFilter = document.getElementById('statusFilter').value;
    const requestCards = document.querySelectorAll('.request-card');
    
    requestCards.forEach(card => {
        const statusElement = card.querySelector('.request-status');
        const status = statusElement.className.includes('pending') ? 'pending' :
                      statusElement.className.includes('approved') ? 'approved' :
                      statusElement.className.includes('completed') ? 'completed' :
                      statusElement.className.includes('rejected') ? 'rejected' : '';
        
        if (statusFilter === 'all' || status === statusFilter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Security measures
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
    }
});
