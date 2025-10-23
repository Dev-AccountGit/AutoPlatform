// Firebase Configuration - IMPORTANTE: Substitua com suas credenciais
const firebaseConfig = {
    apiKey: "AIzaSyDUZbIXvmDpoN5uakoygovhtGYE6vD4pdM",
    authDomain: "autoplataform.firebaseapp.com",
    projectId: "autoplataform",
    storageBucket: "autoplataform.firebasestorage.app",
    messagingSenderId: "458879356981",
    appId: "1:458879356981:web:b9e0ac11d33ebaea37617c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global Variables
let currentUser = null;
let currentPlatform = null;
let currentUserData = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check if user accepted terms
    const acceptedTerms = localStorage.getItem('acceptedTerms');
    if (!acceptedTerms) {
        showTermsModal();
    } else {
        checkAuthState();
    }
}

function setupEventListeners() {
    // Terms acceptance
    document.getElementById('acceptTerms').addEventListener('change', function() {
        document.getElementById('acceptTermsBtn').disabled = !this.checked;
    });
    
    // Enter key for login/register
    document.getElementById('loginPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('regPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') register();
    });
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
            
            // Check if user is admin
            if (currentUser.email === 'dev.git.tdc@gmail.com') {
                document.getElementById('navAdmin').style.display = 'flex';
            }
            
            // Load user requests
            loadUserRequests();
            
            // Load reviews
            loadReviews();
            
            // If admin, load admin data
            if (isAdmin()) {
                loadAdminData();
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showModal('❌', 'Erro', 'Erro ao carregar dados do usuário.');
    }
}

function isAdmin() {
    return currentUser && currentUser.email === 'dev.git.tdc@gmail.com';
}

function updateUserInterface() {
    if (currentUserData) {
        document.getElementById('welcomeUserName').textContent = currentUserData.fullName || 'Usuário';
        
        // Update user avatar
        const userAvatar = document.getElementById('userAvatar');
        if (currentUserData.profileImage) {
            userAvatar.innerHTML = `<img src="${currentUserData.profileImage}" alt="Profile">`;
        } else {
            userAvatar.innerHTML = '👤';
        }
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
        
        // Upload profile image if exists
        let profileImageUrl = '';
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput.files[0]) {
            profileImageUrl = await uploadProfileImage(user.uid, profileImageInput.files[0]);
        }
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            fullName: fullName,
            registration: registration,
            school: school,
            email: email,
            profileImage: profileImageUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isVerified: false
        });
        
        showModal('✅', 'Conta Criada', 'Sua conta foi criada com sucesso! Verifique seus dados nas configurações.');
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
    // Hide all pages
    document.querySelectorAll('.auth-page, .dashboard-page').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected page
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
    
    // Update navigation
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
            'Aviso: O processamento pode demorar um pouco devido à alta demanda. ' +
            'Nossa equipe administrativa é pequena e trabalha manualmente em cada solicitação.'
        );
        
        // Reload requests
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

// Review Functions
function openReviewModal() {
    document.getElementById('reviewRating').value = '5';
    document.getElementById('reviewComment').value = '';
    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

async function submitReview() {
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    
    if (!comment.trim()) {
        showModal('⚠️', 'Campo Vazio', 'Por favor, escreva um comentário.');
        return;
    }
    
    try {
        showLoading(true);
        
        await db.collection('reviews').add({
            userId: currentUser.uid,
            userName: currentUserData.fullName,
            userEmail: currentUser.email,
            userProfileImage: currentUserData.profileImage,
            rating: parseInt(rating),
            comment: comment,
            isVerified: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeReviewModal();
        showModal('✅', 'Avaliação Enviada', 'Sua avaliação foi publicada com sucesso!');
        
        // Reload reviews
        loadReviews();
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showModal('❌', 'Erro', 'Erro ao enviar avaliação. Tente novamente.');
    } finally {
        showLoading(false);
    }
}

async function loadReviews() {
    try {
        const reviewsSnapshot = await db.collection('reviews')
            .orderBy('createdAt', 'desc')
            .get();
        
        const reviewsContainer = document.getElementById('reviewsContainer');
        reviewsContainer.innerHTML = '';
        
        if (reviewsSnapshot.empty) {
            reviewsContainer.innerHTML = `
                <div class="info-box" style="text-align: center;">
                    ⭐ Seja o primeiro a avaliar nossa plataforma!
                </div>
            `;
            return;
        }
        
        reviewsSnapshot.forEach(doc => {
            const review = doc.data();
            const reviewElement = createReviewElement(review);
            reviewsContainer.appendChild(reviewElement);
        });
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsContainer').innerHTML = `
            <div class="info-box" style="text-align: center;">
                ❌ Erro ao carregar avaliações.
            </div>
        `;
    }
}

function createReviewElement(review) {
    const stars = '⭐'.repeat(review.rating);
    
    const element = document.createElement('div');
    element.className = 'review-card';
    element.innerHTML = `
        <div class="review-header">
            <div class="review-user">
                <div class="user-avatar-small">
                    ${review.userProfileImage ? 
                        `<img src="${review.userProfileImage}" alt="${review.userName}">` : 
                        '👤'
                    }
                </div>
                <div class="user-info">
                    <h4>${review.userName}</h4>
                    <p>${review.userEmail}</p>
                </div>
            </div>
            <div class="review-rating">
                ${stars}
            </div>
        </div>
        <div class="review-comment">
            ${review.comment}
        </div>
        ${isAdmin() ? `
            <div class="review-actions">
                <button class="action-btn reject" onclick="deleteReview('${doc.id}')">
                    🗑️ Deletar
                </button>
            </div>
        ` : ''}
    `;
    
    return element;
}

// Admin Functions
function switchAdminTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.admin-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

async function loadAdminData() {
    if (!isAdmin()) return;
    
    try {
        // Load users
        const usersSnapshot = await db.collection('users').get();
        const usersGrid = document.getElementById('adminUsersGrid');
        usersGrid.innerHTML = '';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const userElement = createUserCard(user);
            usersGrid.appendChild(userElement);
        });
        
        // Load requests
        loadAdminRequests();
        
        // Load admin reviews
        loadAdminReviews();
        
        // Load analytics
        loadAnalytics();
        
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function createUserCard(user) {
    const element = document.createElement('div');
    element.className = 'user-card';
    element.innerHTML = `
        <div class="user-card-header">
            <div class="user-card-avatar">
                ${user.profileImage ? 
                    `<img src="${user.profileImage}" alt="${user.fullName}">` : 
                    '👤'
                }
            </div>
            <div class="user-card-info">
                <h4>${user.fullName}</h4>
                <p>${user.email}</p>
            </div>
        </div>
        <div class="user-card-details">
            <strong>Matrícula:</strong> ${user.registration}<br>
            <strong>Escola:</strong> ${user.school}<br>
            <strong>Cadastro:</strong> ${user.createdAt?.toDate().toLocaleDateString('pt-BR')}
        </div>
        <div class="user-card-actions">
            <button class="action-btn reject" onclick="deleteUser('${user.uid}')">
                🗑️ Excluir
            </button>
            <button class="action-btn ${user.isVerified ? 'reject' : 'approve'}" 
                    onclick="toggleUserVerification('${user.uid}', ${!user.isVerified})">
                ${user.isVerified ? '❌ Revogar' : '✅ Verificar'}
            </button>
        </div>
    `;
    
    return element;
}

async function loadAdminRequests() {
    try {
        const requestsSnapshot = await db.collection('requests')
            .orderBy('createdAt', 'desc')
            .get();
        
        const requestsContainer = document.getElementById('adminRequestsContainer');
        requestsContainer.innerHTML = '';
        
        if (requestsSnapshot.empty) {
            requestsContainer.innerHTML = `
                <div class="info-box" style="text-align: center;">
                    📝 Nenhuma solicitação encontrada.
                </div>
            `;
            return;
        }
        
        requestsSnapshot.forEach(doc => {
            const request = doc.data();
            const requestElement = createRequestElement(request, doc.id, true);
            requestsContainer.appendChild(requestElement);
        });
        
    } catch (error) {
        console.error('Error loading admin requests:', error);
    }
}

function createAdminActions(request, requestId) {
    let actions = '';
    
    if (request.status === 'pending') {
        actions = `
            <div class="request-actions">
                <button class="action-btn approve" onclick="updateRequestStatus('${requestId}', 'approved')">
                    ✅ Aprovar
                </button>
                <button class="action-btn reject" onclick="updateRequestStatus('${requestId}', 'rejected')">
                    ❌ Recusar
                </button>
            </div>
        `;
    } else if (request.status === 'approved') {
        actions = `
            <div class="request-actions">
                <button class="action-btn complete" onclick="updateRequestStatus('${requestId}', 'completed')">
                    🎉 Marcar como Concluído
                </button>
                <button class="action-btn reject" onclick="updateRequestStatus('${requestId}', 'rejected')">
                    ❌ Recusar
                </button>
            </div>
        `;
    } else if (request.status === 'completed') {
        actions = `
            <div class="request-actions">
                <button class="action-btn reject" onclick="updateRequestStatus('${requestId}', 'rejected')">
                    ❌ Marcar como Recusado
                </button>
            </div>
        `;
    }
    
    return actions;
}

async function updateRequestStatus(requestId, newStatus) {
    try {
        showLoading(true);
        
        await db.collection('requests').doc(requestId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        let message = '';
        switch (newStatus) {
            case 'approved':
                message = 'Solicitação aprovada com sucesso! O usuário será notificado.';
                break;
            case 'completed':
                message = 'Solicitação marcada como concluída!';
                break;
            case 'rejected':
                message = 'Solicitação recusada.';
                break;
        }
        
        showModal('✅', 'Status Atualizado', message);
        
        // Reload requests
        loadAdminRequests();
        
    } catch (error) {
        console.error('Error updating request status:', error);
        showModal('❌', 'Erro', 'Erro ao atualizar status da solicitação.');
    } finally {
        showLoading(false);
    }
}

async function loadAdminReviews() {
    try {
        const reviewsSnapshot = await db.collection('reviews')
            .orderBy('createdAt', 'desc')
            .get();
        
        const reviewsContainer = document.getElementById('adminReviewsContainer');
        reviewsContainer.innerHTML = '';
        
        if (reviewsSnapshot.empty) {
            reviewsContainer.innerHTML = `
                <div class="info-box" style="text-align: center;">
                    ⭐ Nenhuma avaliação encontrada.
                </div>
            `;
            return;
        }
        
        reviewsSnapshot.forEach(doc => {
            const review = doc.data();
            const reviewElement = createReviewElement(review, doc.id);
            reviewsContainer.appendChild(reviewElement);
        });
        
    } catch (error) {
        console.error('Error loading admin reviews:', error);
    }
}

async function loadAnalytics() {
    try {
        // Get total users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        // Get total requests
        const requestsSnapshot = await db.collection('requests').get();
        document.getElementById('totalRequestsAdmin').textContent = requestsSnapshot.size;
        
        // Get total reviews
        const reviewsSnapshot = await db.collection('reviews').get();
        document.getElementById('totalReviews').textContent = reviewsSnapshot.size;
        
        // Calculate completion rate
        let completedRequests = 0;
        requestsSnapshot.forEach(doc => {
            if (doc.data().status === 'completed') {
                completedRequests++;
            }
        });
        
        const completionRate = requestsSnapshot.size > 0 ? 
            Math.round((completedRequests / requestsSnapshot.size) * 100) : 0;
        document.getElementById('completionRate').textContent = completionRate + '%';
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Fake Review Functions
function openFakeReviewModal() {
    document.getElementById('fakeReviewName').value = '';
    document.getElementById('fakeReviewRating').value = '5';
    document.getElementById('fakeReviewComment').value = '';
    document.getElementById('fakeReviewModal').classList.add('active');
}

function closeFakeReviewModal() {
    document.getElementById('fakeReviewModal').classList.remove('active');
}

async function submitFakeReview() {
    const name = document.getElementById('fakeReviewName').value;
    const rating = document.getElementById('fakeReviewRating').value;
    const comment = document.getElementById('fakeReviewComment').value;
    
    if (!name || !comment) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha nome e comentário.');
        return;
    }
    
    try {
        showLoading(true);
        
        await db.collection('reviews').add({
            userId: 'admin_fake',
            userName: name,
            userEmail: 'fake@example.com',
            rating: parseInt(rating),
            comment: comment,
            isVerified: false,
            isFake: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeFakeReviewModal();
        showModal('✅', 'Avaliação Criada', 'Avaliação falsa criada com sucesso!');
        
        // Reload reviews
        loadAdminReviews();
        
    } catch (error) {
        console.error('Error creating fake review:', error);
        showModal('❌', 'Erro', 'Erro ao criar avaliação falsa.');
    } finally {
        showLoading(false);
    }
}

// User Management Functions
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete user's requests
        const userRequests = await db.collection('requests').where('userId', '==', userId).get();
        const deleteRequests = userRequests.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteRequests);
        
        // Delete user's reviews
        const userReviews = await db.collection('reviews').where('userId', '==', userId).get();
        const deleteReviews = userReviews.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteReviews);
        
        // Delete user document
        await db.collection('users').doc(userId).delete();
        
        // Delete user from auth (if you have permission)
        // await auth.deleteUser(userId);
        
        showModal('✅', 'Usuário Excluído', 'Usuário e todos os seus dados foram excluídos.');
        
        // Reload admin data
        loadAdminData();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showModal('❌', 'Erro', 'Erro ao excluir usuário.');
    } finally {
        showLoading(false);
    }
}

async function toggleUserVerification(userId, verified) {
    try {
        await db.collection('users').doc(userId).update({
            isVerified: verified,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showModal('✅', 'Verificação Atualizada', 
            `Usuário ${verified ? 'verificado' : 'desverificado'} com sucesso.`
        );
        
        // Reload admin data
        loadAdminData();
        
    } catch (error) {
        console.error('Error toggling verification:', error);
        showModal('❌', 'Erro', 'Erro ao atualizar verificação.');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) {
        return;
    }
    
    try {
        await db.collection('reviews').doc(reviewId).delete();
        showModal('✅', 'Avaliação Excluída', 'Avaliação excluída com sucesso.');
        
        // Reload reviews
        loadAdminReviews();
        
    } catch (error) {
        console.error('Error deleting review:', error);
        showModal('❌', 'Erro', 'Erro ao excluir avaliação.');
    }
}

// User Profile Functions
function showUserMenu() {
    document.getElementById('userMenuName').textContent = currentUserData?.fullName || 'Usuário';
    document.getElementById('userMenuModal').classList.add('active');
}

function closeUserMenuModal() {
    document.getElementById('userMenuModal').classList.remove('active');
}

function openProfileEdit() {
    closeUserMenuModal();
    
    document.getElementById('editFullName').value = currentUserData?.fullName || '';
    document.getElementById('editRegistration').value = currentUserData?.registration || '';
    document.getElementById('editSchool').value = currentUserData?.school || '';
    
    // Set profile image preview
    const previewImg = document.getElementById('editProfilePreviewImg');
    const previewIcon = document.getElementById('editProfilePreviewIcon');
    
    if (currentUserData?.profileImage) {
        previewImg.src = currentUserData.profileImage;
        previewImg.style.display = 'block';
        previewIcon.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        previewIcon.style.display = 'block';
    }
    
    document.getElementById('profileEditModal').classList.add('active');
}

function closeProfileEditModal() {
    document.getElementById('profileEditModal').classList.remove('active');
}

async function updateProfile() {
    const fullName = document.getElementById('editFullName').value;
    const registration = document.getElementById('editRegistration').value;
    const school = document.getElementById('editSchool').value;
    
    if (!fullName || !registration || !school) {
        showModal('⚠️', 'Campos Vazios', 'Por favor, preencha todos os campos.');
        return;
    }
    
    try {
        showLoading(true);
        
        const updateData = {
            fullName: fullName,
            registration: registration,
            school: school,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Upload new profile image if exists
        const profileImageInput = document.getElementById('editProfileImageInput');
        if (profileImageInput.files[0]) {
            updateData.profileImage = await uploadProfileImage(currentUser.uid, profileImageInput.files[0]);
        }
        
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        // Reload user data
        await loadUserData();
        
        closeProfileEditModal();
        showModal('✅', 'Perfil Atualizado', 'Seu perfil foi atualizado com sucesso!');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showModal('❌', 'Erro', 'Erro ao atualizar perfil. Tente novamente.');
    } finally {
        showLoading(false);
    }
}

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
    // You can implement a global loading spinner here
    if (show) {
        // Show loading state
    } else {
        // Hide loading state
    }
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

// Prevent right-click and F12 for security
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
    }
});
