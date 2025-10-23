// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDUZbIXvmDpoN5uakoygovhtGYE6vD4pdM",
    authDomain: "autoplataform.firebaseapp.com",
    projectId: "autoplataform",
    storageBucket: "autoplataform.firebasestorage.app",
    messagingSenderId: "458879356981",
    appId: "1:458879356981:web:b9e0ac11d33ebaea37617c",
    measurementId: "G-EHJYC6S9NP"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase inicializado com sucesso!');
} catch (error) {
    console.log('⚠️ Firebase já inicializado:', error);
}

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
let realTimeListeners = [];
let isFullscreen = false;

// Admin Email
const ADMIN_EMAIL = 'dev.git.tdc@gmail.com';

// Platform Data
const PLATFORMS = [
    {
        name: 'Quizizz',
        icon: '📝',
        description: 'Sistema completo de automação para quizzes e avaliações gamificadas.',
        features: ['Quizzes', 'Avaliações', 'Gamificação'],
        badge: '⚡'
    },
    {
        name: 'Wayground',
        icon: '🌐',
        description: 'Automação avançada para cursos, módulos e trilhas de aprendizado.',
        features: ['Cursos', 'Módulos', 'Progresso'],
        badge: '⚡'
    },
    {
        name: 'Redação Paraná',
        icon: '✍️',
        description: 'Solução completa para produção e correção de redações ENEM.',
        features: ['ENEM', 'Vestibular', 'Correção'],
        badge: '⚡'
    },
    {
        name: 'Khan Academy',
        icon: '🎓',
        description: 'Automação para exercícios e atividades de aprendizado em matemática e ciências.',
        features: ['Matemática', 'Ciências', 'Exercícios'],
        badge: '⚡'
    },
    {
        name: 'Inglês Paraná',
        icon: '🗣️',
        description: 'Solução premium para aprendizado completo de inglês com listening e speaking.',
        features: ['Vocabulário', 'Gramática', 'Listening'],
        badge: '⭐'
    }
];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
function initializeApp() {
    setupCustomCursor();
    setupEventListeners();
    startLoadingSequence();
    detectMobile();
}

// Setup Custom Cursor
function setupCustomCursor() {
    if (window.matchMedia('(pointer: fine)').matches) {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);

        const follower = document.createElement('div');
        follower.className = 'custom-cursor-follower';
        document.body.appendChild(follower);

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            
            setTimeout(() => {
                follower.style.left = e.clientX + 'px';
                follower.style.top = e.clientY + 'px';
            }, 100);
        });

        document.addEventListener('mousedown', () => {
            cursor.style.transform = 'scale(0.8)';
            follower.style.transform = 'scale(1.2)';
        });

        document.addEventListener('mouseup', () => {
            cursor.style.transform = 'scale(1)';
            follower.style.transform = 'scale(1)';
        });

        // Change cursor on interactive elements
        const interactiveElements = ['button', 'a', 'input', 'textarea', 'select', '.nav-btn', '.platform-card', '.user-avatar'];
        interactiveElements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.addEventListener('mouseenter', () => {
                    cursor.style.transform = 'scale(1.5)';
                    follower.style.transform = 'scale(1.5)';
                });
                el.addEventListener('mouseleave', () => {
                    cursor.style.transform = 'scale(1)';
                    follower.style.transform = 'scale(1)';
                });
            });
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Terms acceptance
    document.getElementById('acceptTerms').addEventListener('change', function() {
        document.getElementById('acceptTermsBtn').disabled = !this.checked;
    });
    
    // Enter key for login/register
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('regPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') register();
    });

    // Input validation
    setupInputValidation();

    // Scroll events
    window.addEventListener('scroll', handleScroll);

    // Fullscreen change
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

// Input Validation
function setupInputValidation() {
    const regEmail = document.getElementById('regEmail');
    const regPassword = document.getElementById('regPassword');

    regEmail.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !email.endsWith('@escola.pr.gov.br')) {
            showInputError(this, '⚠️ Use um email @escola.pr.gov.br');
        } else {
            clearInputError(this);
        }
    });

    regPassword.addEventListener('input', function() {
        const password = this.value;
        if (password.length > 0 && password.length < 6) {
            showInputError(this, '🔒 Mínimo 6 caracteres');
        } else {
            clearInputError(this);
        }
    });
}

// Loading Sequence
function startLoadingSequence() {
    const loadingSteps = [
        { text: 'Inicializando sistema...', progress: 20 },
        { text: 'Carregando configurações...', progress: 40 },
        { text: 'Conectando ao servidor...', progress: 60 },
        { text: 'Preparando interface...', progress: 80 },
        { text: 'Quase pronto...', progress: 95 }
    ];

    let currentStep = 0;
    const progressBar = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');

    const interval = setInterval(() => {
        if (currentStep < loadingSteps.length) {
            const step = loadingSteps[currentStep];
            progressBar.style.width = step.progress + '%';
            loadingText.textContent = step.text;
            currentStep++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('loadingScreen').classList.add('fade-out');
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    checkAuthState();
                }, 800);
            }, 500);
        }
    }, 400);
}

// Check Authentication State
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            setupRealTimeListeners();
            showPage('dashboard');
            updateNavigation();
            checkPendingBanner();
        } else {
            const acceptedTerms = localStorage.getItem('acceptedTerms');
            if (!acceptedTerms) {
                showTermsModal();
            } else {
                showPage('login');
            }
            updateNavigation();
        }
    });
}

// Load User Data
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
            loadPlatforms();
            checkPendingBanner();
        } else {
            await createUserDocument();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showNotification('Erro no Sistema', 'Falha ao carregar dados do usuário', 'error');
    }
}

// Create User Document
async function createUserDocument() {
    try {
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            fullName: currentUser.displayName || 'Usuário',
            email: currentUser.email,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isVerified: false,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await loadUserData();
    } catch (error) {
        console.error('❌ Erro ao criar documento:', error);
    }
}

// Check if User is Admin
function isAdmin() {
    return currentUser && currentUser.email === ADMIN_EMAIL;
}

// Update User Interface
function updateUserInterface() {
    if (currentUserData) {
        document.getElementById('welcomeUserName').textContent = currentUserData.fullName || 'Agente';
        
        const welcomeStatus = document.getElementById('welcomeStatus');
        if (currentUserData.status === 'pending') {
            welcomeStatus.innerHTML = '<div class="status-pending">⏳ Conta em análise pela equipe</div>';
        } else if (currentUserData.status === 'verified') {
            welcomeStatus.innerHTML = '<div class="status-verified">✅ Conta verificada e ativa</div>';
        } else if (currentUserData.status === 'banned') {
            welcomeStatus.innerHTML = '<div class="status-banned">❌ Conta suspensa</div>';
        }
        
        const userAvatar = document.getElementById('userAvatar');
        if (currentUserData.profileImage) {
            userAvatar.innerHTML = `<img src="${currentUserData.profileImage}" alt="Profile"><div class="user-status status-online"></div>`;
        } else {
            userAvatar.innerHTML = `${currentUserData.fullName ? currentUserData.fullName.charAt(0).toUpperCase() : '👤'}<div class="user-status status-online"></div>`;
        }
    }
}

// Check Pending Banner
function checkPendingBanner() {
    const pendingBanner = document.getElementById('pendingBanner');
    const platformCards = document.querySelectorAll('.platform-card');
    
    if (currentUserData && currentUserData.status === 'pending') {
        pendingBanner.style.display = 'block';
        platformCards.forEach(card => {
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
            card.onclick = null;
        });
    } else {
        pendingBanner.style.display = 'none';
        platformCards.forEach(card => {
            card.style.opacity = '1';
            card.style.cursor = 'pointer';
        });
    }
}

// Update Navigation
function updateNavigation() {
    const isLoggedIn = !!currentUser;
    document.getElementById('navDashboard').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = (isLoggedIn && isAdmin()) ? 'flex' : 'none';
    document.getElementById('userAvatar').style.display = isLoggedIn ? 'flex' : 'none';
}

// Setup Real-time Listeners
function setupRealTimeListeners() {
    // Clear existing listeners
    realTimeListeners.forEach(unsubscribe => unsubscribe());
    realTimeListeners = [];

    // User data listener
    const userListener = db.collection('users').doc(currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                currentUserData = doc.data();
                updateUserInterface();
                checkPendingBanner();
            }
        }, (error) => {
            console.error('❌ Erro no listener do usuário:', error);
        });
    realTimeListeners.push(userListener);

    // Requests listener
    const requestsListener = db.collection('requests')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            loadUserRequests();
        }, (error) => {
            console.error('❌ Erro no listener de solicitações:', error);
        });
    realTimeListeners.push(requestsListener);

    // Notifications listener
    const notificationsListener = db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('read', '==', false)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    showNotification(notification.title, notification.message, notification.type);
                    // Mark as read
                    db.collection('notifications').doc(change.doc.id).update({ read: true });
                }
            });
        }, (error) => {
            console.error('❌ Erro no listener de notificações:', error);
        });
    realTimeListeners.push(notificationsListener);

    // Admin listeners
    if (isAdmin()) {
        const adminUsersListener = db.collection('users')
            .onSnapshot((snapshot) => {
                loadAdminUsers();
            });
        realTimeListeners.push(adminUsersListener);

        const adminRequestsListener = db.collection('requests')
            .onSnapshot((snapshot) => {
                loadAdminRequests();
            });
        realTimeListeners.push(adminRequestsListener);
    }
}

// Show Terms Modal
function showTermsModal() {
    document.getElementById('termsModal').classList.add('active');
}

// Accept Terms
function acceptTerms() {
    localStorage.setItem('acceptedTerms', 'true');
    document.getElementById('termsModal').classList.remove('active');
    showPage('login');
}

// Show Page
function showPage(page) {
    // Hide all pages
    document.querySelectorAll('.auth-page, .dashboard-page').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtn = document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1));
    if (navBtn) {
        navBtn.classList.add('active');
    }
    
    // Page-specific actions
    switch (page) {
        case 'dashboard':
            loadUserRequests();
            loadPlatforms();
            break;
        case 'admin':
            if (isAdmin()) {
                loadAdminData();
            } else {
                showPage('dashboard');
            }
            break;
    }
}

// Load Platforms
function loadPlatforms() {
    const platformsGrid = document.querySelector('.platforms-grid');
    if (!platformsGrid) return;

    platformsGrid.innerHTML = PLATFORMS.map(platform => `
        <div class="platform-card" onclick="openPlatformRequest('${platform.name}', '${platform.icon}')">
            <div class="platform-badge">${platform.badge}</div>
            <span class="platform-icon">${platform.icon}</span>
            <h3 class="platform-name">${platform.name}</h3>
            <p class="platform-desc">${platform.description}</p>
            <div class="platform-features">
                ${platform.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
            </div>
        </div>
    `).join('');

    checkPendingBanner();
}

// Open Platform Request Modal
function openPlatformRequest(platform, icon) {
    if (currentUserData && currentUserData.status !== 'verified') {
        showModal('⏳', 'Acesso Restrito', 'Sua conta precisa ser aprovada antes de fazer solicitações.');
        return;
    }
    
    currentPlatform = platform;
    document.getElementById('platformTitle').textContent = platform;
    document.getElementById('platformMessage').textContent = `Forneça suas credenciais do ${platform} para nossa equipe especializada.`;
    document.getElementById('platformUsername').value = '';
    document.getElementById('platformPassword').value = '';
    document.getElementById('platformNotes').value = '';
    document.getElementById('platformRequestModal').classList.add('active');
}

// Close Platform Request Modal
function closePlatformRequestModal() {
    document.getElementById('platformRequestModal').classList.remove('active');
    currentPlatform = null;
}

// Submit Platform Request
async function submitPlatformRequest() {
    if (currentUserData && currentUserData.status !== 'verified') {
        showModal('❌', 'Conta Não Verificada', 'Sua conta precisa ser aprovada pela equipe.');
        return;
    }

    const username = document.getElementById('platformUsername').value.trim();
    const password = document.getElementById('platformPassword').value.trim();
    const notes = document.getElementById('platformNotes').value.trim();
    
    if (!username || !password) {
        showModal('⚠️', 'Campos Obrigatórios', 'Forneça email/usuário e senha da plataforma.');
        return;
    }
    
    try {
        const btn = document.querySelector('#platformRequestModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="btn-spinner"></div><span class="btn-text">Enviando...</span>';
        btn.disabled = true;
        
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
        showModal('🚀', 'Solicitação Enviada', 
            'Sua solicitação foi encaminhada para nossa equipe especializada! ⚡\n\n' +
            'Nossa equipe trabalha manualmente em cada caso para garantir a melhor qualidade.'
        );
        
    } catch (error) {
        console.error('❌ Erro ao enviar solicitação:', error);
        showModal('❌', 'Erro no Sistema', 'Falha ao enviar solicitação. Tente novamente.');
    } finally {
        const btn = document.querySelector('#platformRequestModal .btn-primary');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Load User Requests
async function loadUserRequests() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('requests')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const container = document.getElementById('userRequestsContainer');
        if (!container) return;
        
        if (snapshot.empty) {
            container.innerHTML = `
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
        let requestsHTML = '';
        
        snapshot.forEach(doc => {
            const request = doc.data();
            totalRequests++;
            if (request.status === 'completed') completedRequests++;
            
            requestsHTML += createRequestHTML(request);
        });
        
        container.innerHTML = requestsHTML;
        updateStats(totalRequests, completedRequests);
        
    } catch (error) {
        console.error('❌ Erro ao carregar solicitações:', error);
        document.getElementById('userRequestsContainer').innerHTML = `
            <div class="info-box error" style="text-align: center;">
                ❌ Erro ao carregar solicitações.
            </div>
        `;
    }
}

// Create Request HTML
function createRequestHTML(request) {
    const date = request.createdAt ? request.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A';
    const time = request.createdAt ? request.createdAt.toDate().toLocaleTimeString('pt-BR') : 'N/A';
    
    return `
        <div class="request-card">
            <div class="request-header">
                <div class="request-platform">
                    <span>${getPlatformIcon(request.platform)}</span>
                    <span>${request.platform}</span>
                </div>
                <div class="request-status status-${request.status}">
                    ${getStatusText(request.status)}
                </div>
            </div>
            <div class="request-details">
                <strong>Usuário:</strong> ${request.username}<br>
                <strong>Data:</strong> ${date} às ${time}
            </div>
            ${request.notes ? `
                <div class="request-notes">
                    <strong>Observações:</strong> ${request.notes}
                </div>
            ` : ''}
        </div>
    `;
}

// Get Platform Icon
function getPlatformIcon(platform) {
    const platformObj = PLATFORMS.find(p => p.name === platform);
    return platformObj ? platformObj.icon : '🌐';
}

// Get Status Text
function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ Pendente',
        'approved': '✅ Aprovado',
        'completed': '🎉 Concluído',
        'rejected': '❌ Recusado'
    };
    return statusMap[status] || '⏳ Pendente';
}

// Update Stats
function updateStats(total, completed) {
    document.getElementById('totalRequests').textContent = total;
    document.getElementById('completedRequests').textContent = completed;
}

// Login Function
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        showModal('⚠️', 'Campos Obrigatórios', 'Por favor, preencha email e senha.');
        return;
    }
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<div class="btn-spinner"></div><span class="btn-text">Acessando...</span>';
        btn.disabled = true;
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update last login
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Bem-vindo de volta!', 'Login realizado com sucesso', 'success');
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        let errorMessage = 'Falha no acesso. ';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = '❌ Conta não encontrada. Verifique o email.';
                break;
            case 'auth/wrong-password':
                errorMessage = '❌ Senha incorreta. Tente novamente.';
                break;
            case 'auth/invalid-email':
                errorMessage = '❌ Email inválido. Use um formato válido.';
                break;
            case 'auth/user-disabled':
                errorMessage = '❌ Conta desativada. Entre em contato com o suporte.';
                break;
            case 'auth/too-many-requests':
                errorMessage = '🔒 Muitas tentativas. Tente novamente mais tarde.';
                break;
            default:
                errorMessage = '❌ Erro inesperado. Tente novamente.';
        }
        
        showModal('❌', 'Falha no Login', errorMessage);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Register Function
async function register() {
    const fullName = document.getElementById('regFullName').value.trim();
    const school = document.getElementById('regSchool').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    
    if (!fullName || !school || !email || !password) {
        showModal('⚠️', 'Dados Incompletos', 'Preencha todos os campos obrigatórios.');
        return;
    }
    
    if (!email.endsWith('@escola.pr.gov.br')) {
        showModal('❌', 'Email Institucional', 'Você deve usar um email @escola.pr.gov.br');
        return;
    }
    
    if (password.length < 6) {
        showModal('❌', 'Senha Fraca', 'A senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<div class="btn-spinner"></div><span class="btn-text">Criando conta...</span>';
        btn.disabled = true;
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({
            displayName: fullName
        });
        
        let profileImageUrl = '';
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput.files[0]) {
            profileImageUrl = await uploadProfileImage(user.uid, profileImageInput.files[0]);
        }
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            fullName: fullName,
            school: school,
            email: email,
            profileImage: profileImageUrl,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isVerified: false,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Notify admin
        await db.collection('adminNotifications').add({
            type: 'new_user',
            userId: user.uid,
            userName: fullName,
            userEmail: email,
            message: `Novo usuário registrado: ${fullName} (${email})`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showModal('⚡', 'Conta Criada com Sucesso', 
            'Bem-vindo à elite! 🎉\n\n' +
            'Sua conta está em análise por nossa equipe especializada. ' +
            'Você receberá uma notificação quando for aprovado.'
        );
        
        // Clear form
        document.getElementById('regFullName').value = '';
        document.getElementById('regSchool').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('profilePreviewImg').style.display = 'none';
        document.getElementById('profilePreviewIcon').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro no registro:', error);
        let errorMessage = 'Falha ao criar conta. ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '📧 Este email já está em uso. Faça login.';
                break;
            case 'auth/weak-password':
                errorMessage = '🔒 Senha muito fraca. Use uma combinação mais forte.';
                break;
            case 'auth/invalid-email':
                errorMessage = '📧 Email inválido. Verifique o formato.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '⚙️ Cadastro temporariamente desativado.';
                break;
            default:
                errorMessage = '❌ Erro inesperado. Tente novamente.';
        }
        
        showModal('❌', 'Falha no Cadastro', errorMessage);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Upload Profile Image
async function uploadProfileImage(userId, file) {
    try {
        const storageRef = storage.ref();
        const fileExt = file.name.split('.').pop();
        const imageRef = storageRef.child(`profileImages/${userId}/avatar.${fileExt}`);
        await imageRef.put(file);
        return await imageRef.getDownloadURL();
    } catch (error) {
        console.error('❌ Erro ao fazer upload da imagem:', error);
        return '';
    }
}

// Preview Profile Image
function previewProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showModal('❌', 'Arquivo Grande', 'A imagem deve ter menos de 5MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePreviewImg').src = e.target.result;
            document.getElementById('profilePreviewImg').style.display = 'block';
            document.getElementById('profilePreviewIcon').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Admin Functions
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-content').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// Load Admin Data
async function loadAdminData() {
    if (!isAdmin()) return;
    
    try {
        await loadAdminUsers();
        await loadAdminRequests();
    } catch (error) {
        console.error('❌ Erro ao carregar dados admin:', error);
    }
}

// Load Admin Users
async function loadAdminUsers() {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        allUsers = [];
        
        const container = document.getElementById('adminUsersGrid');
        const countElement = document.getElementById('usersCount');
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="info-box">Nenhum usuário encontrado</div>';
            countElement.textContent = '0';
            return;
        }
        
        let usersHTML = '';
        
        snapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            allUsers.push(user);
            usersHTML += createUserCardHTML(user);
        });
        
        container.innerHTML = usersHTML;
        countElement.textContent = snapshot.size;
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

// Create User Card HTML
function createUserCardHTML(user) {
    const statusBadge = user.status === 'verified' ? 'status-verified' : 
                       user.status === 'banned' ? 'status-banned' : 'status-pending';
    
    const statusText = user.status === 'verified' ? 'Verificado' : 
                      user.status === 'banned' ? 'Banido' : 'Pendente';

    return `
        <div class="user-card">
            <div class="user-card-header">
                <div class="user-card-avatar">
                    ${user.profileImage ? 
                        `<img src="${user.profileImage}" alt="${user.fullName}">` : 
                        (user.fullName ? user.fullName.charAt(0).toUpperCase() : '👤')
                    }
                </div>
                <div class="user-card-info">
                    <h4>${user.fullName || 'N/A'}</h4>
                    <p>${user.email}</p>
                    <div class="request-status ${statusBadge}" style="display: inline-block; margin-top: 0.5rem;">
                        ${statusText}
                    </div>
                </div>
            </div>
            
            <div class="user-card-details">
                <div class="user-detail-row">
                    <span class="user-detail-label">Escola</span>
                    <span class="user-detail-value">${user.school || 'N/A'}</span>
                </div>
                <div class="user-detail-row">
                    <span class="user-detail-label">Cadastro</span>
                    <span class="user-detail-value">${user.createdAt ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
            </div>
            
            <div class="user-actions">
                ${user.status === 'pending' ? `
                    <button class="action-btn approve" onclick="updateUserStatus('${user.id}', 'verified')">
                        ✅ Aprovar
                    </button>
                ` : ''}
                
                ${user.status === 'verified' ? `
                    <button class="action-btn ban" onclick="updateUserStatus('${user.id}', 'banned')">
                        🚫 Banir
                    </button>
                ` : ''}
                
                ${user.status === 'banned' ? `
                    <button class="action-btn approve" onclick="updateUserStatus('${user.id}', 'verified')">
                        🔓 Desbanir
                    </button>
                ` : ''}
                
                <button class="action-btn delete" onclick="deleteUser('${user.id}')">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `;
}

// Update User Status
async function updateUserStatus(userId, newStatus) {
    try {
        await db.collection('users').doc(userId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        let message = '';
        let notificationMessage = '';
        
        switch (newStatus) {
            case 'verified':
                message = 'Usuário aprovado com sucesso!';
                notificationMessage = '✅ Sua conta foi aprovada! Agora você pode fazer solicitações.';
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
        
        showNotification('Status Atualizado', message, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        showNotification('Erro', 'Falha ao atualizar status do usuário', 'error');
    }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        // Delete user's requests
        const userRequests = await db.collection('requests').where('userId', '==', userId).get();
        const deleteRequests = userRequests.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteRequests);
        
        // Delete user document
        await db.collection('users').doc(userId).delete();
        
        showNotification('Usuário Excluído', 'Usuário e todos os seus dados foram excluídos', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao excluir usuário:', error);
        showNotification('Erro', 'Falha ao excluir usuário', 'error');
    }
}

// Load Admin Requests
async function loadAdminRequests() {
    try {
        const snapshot = await db.collection('requests').orderBy('createdAt', 'desc').get();
        allRequests = [];
        
        const container = document.getElementById('adminRequestsContainer');
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="info-box">Nenhuma solicitação encontrada</div>';
            return;
        }
        
        let requestsHTML = '';
        
        snapshot.forEach(doc => {
            const request = { id: doc.id, ...doc.data() };
            allRequests.push(request);
            requestsHTML += createAdminRequestHTML(request);
        });
        
        container.innerHTML = requestsHTML;
        
    } catch (error) {
        console.error('❌ Erro ao carregar solicitações:', error);
    }
}

// Create Admin Request HTML
function createAdminRequestHTML(request) {
    const date = request.createdAt ? request.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A';
    
    return `
        <div class="request-card">
            <div class="request-header">
                <div class="request-platform">
                    <span>${getPlatformIcon(request.platform)}</span>
                    <span>${request.platform}</span>
                </div>
                <div class="request-status status-${request.status}">
                    ${getStatusText(request.status)}
                </div>
            </div>
            <div class="request-details">
                <strong>Usuário:</strong> ${request.userName} (${request.userEmail})<br>
                <strong>Data:</strong> ${date}<br>
                <strong>Acesso:</strong> ${request.username}
            </div>
            ${request.notes ? `
                <div class="request-notes">
                    <strong>Observações:</strong> ${request.notes}
                </div>
            ` : ''}
            <div class="user-actions" style="margin-top: 1rem;">
                ${request.status === 'pending' ? `
                    <button class="action-btn approve" onclick="updateRequestStatus('${request.id}', 'approved')">
                        ✅ Aprovar
                    </button>
                    <button class="action-btn reject" onclick="updateRequestStatus('${request.id}', 'rejected')">
                        ❌ Recusar
                    </button>
                ` : ''}
                
                ${request.status === 'approved' ? `
                    <button class="action-btn approve" onclick="updateRequestStatus('${request.id}', 'completed')">
                        🎉 Concluir
                    </button>
                    <button class="action-btn reject" onclick="updateRequestStatus('${request.id}', 'rejected')">
                        ❌ Recusar
                    </button>
                ` : ''}
                
                <button class="action-btn delete" onclick="deleteRequest('${request.id}')">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `;
}

// Update Request Status
async function updateRequestStatus(requestId, newStatus) {
    try {
        await db.collection('requests').doc(requestId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const statusText = {
            'approved': 'aprovada',
            'completed': 'concluída',
            'rejected': 'recusada'
        }[newStatus];
        
        showNotification('Status Atualizado', `Solicitação ${statusText} com sucesso!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        showNotification('Erro', 'Falha ao atualizar status da solicitação', 'error');
    }
}

// Delete Request
async function deleteRequest(requestId) {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) {
        return;
    }
    
    try {
        await db.collection('requests').doc(requestId).delete();
        showNotification('Solicitação Excluída', 'Solicitação excluída com sucesso', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao excluir solicitação:', error);
        showNotification('Erro', 'Falha ao excluir solicitação', 'error');
    }
}

// Send Global Notification
async function sendGlobalNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    
    if (!title || !message) {
        showModal('⚠️', 'Campos Obrigatórios', 'Preencha título e mensagem.');
        return;
    }
    
    try {
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
        
        showNotification('Notificação Enviada', 
            `Notificação enviada para ${usersSnapshot.size} usuários!`, 
            'success'
        );
        
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
        showNotification('Erro', 'Falha ao enviar notificação', 'error');
    }
}

// Notification System
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
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
    
    container.appendChild(notification);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 8000);
}

// Get Notification Icon
function getNotificationIcon(type) {
    const icons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'success': '✅',
        'error': '❌'
    };
    return icons[type] || 'ℹ️';
}

// Show Modal
function showModal(icon, title, message) {
    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('generalModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('generalModal').classList.remove('active');
}

// Show User Menu
function showUserMenu() {
    document.getElementById('userMenuName').textContent = currentUserData?.fullName || 'Usuário';
    document.getElementById('userMenuModal').classList.add('active');
}

// Close User Menu
function closeUserMenuModal() {
    document.getElementById('userMenuModal').classList.remove('active');
}

// Toggle Fullscreen
function toggleFullscreen() {
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

// Enter Fullscreen
function enterFullscreen() {
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

// Exit Fullscreen
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Handle Fullscreen Change
function handleFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                     document.mozFullScreenElement || document.msFullscreenElement);
    
    const fullscreenText = document.getElementById('fullscreenText');
    if (fullscreenText) {
        fullscreenText.textContent = isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia';
    }
}

// Handle Scroll
function handleScroll() {
    const nav = document.getElementById('topNav');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}

// Detect Mobile
function detectMobile() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
    }
}

// Input Error Handling
function showInputError(input, message) {
    clearInputError(input);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'input-error';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
    input.classList.add('error');
}

function clearInputError(input) {
    const existingError = input.parentNode.querySelector('.input-error');
    if (existingError) {
        existingError.remove();
    }
    input.classList.remove('error');
}

// Logout
function logout() {
    if (confirm('Deseja sair do sistema?')) {
        // Clear real-time listeners
        realTimeListeners.forEach(unsubscribe => unsubscribe());
        realTimeListeners = [];
        
        auth.signOut();
        closeUserMenuModal();
        showPage('login');
    }
}

// Search Users
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const userCards = document.querySelectorAll('.user-card');
    
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

// Search Requests
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

// Security Measures
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        showNotification('Acesso Restrito', 'Recurso de desenvolvedor desativado', 'warning');
    }
});

// Service Worker for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('✅ ServiceWorker registrado com sucesso:', registration.scope);
            })
            .catch(function(error) {
                console.log('❌ Falha no registro do ServiceWorker:', error);
            });
    });
}

// Export functions for global access
window.showPage = showPage;
window.login = login;
window.register = register;
window.logout = logout;
window.acceptTerms = acceptTerms;
window.openPlatformRequest = openPlatformRequest;
window.closePlatformRequestModal = closePlatformRequestModal;
window.submitPlatformRequest = submitPlatformRequest;
window.showUserMenu = showUserMenu;
window.closeUserMenuModal = closeUserMenuModal;
window.closeModal = closeModal;
window.toggleFullscreen = toggleFullscreen;
window.switchAdminTab = switchAdminTab;
window.updateUserStatus = updateUserStatus;
window.deleteUser = deleteUser;
window.updateRequestStatus = updateRequestStatus;
window.deleteRequest = deleteRequest;
window.sendGlobalNotification = sendGlobalNotification;
window.searchUsers = searchUsers;
window.searchRequests = searchRequests;
window.previewProfileImage = previewProfileImage;

console.log('🚀 AutoPlat System Initialized Successfully!');
