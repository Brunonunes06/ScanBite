// Sistema de Integração de Sincronização de Usuário
// Integra o user-sync.js com o sistema principal

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de sincronização de usuário integrado');
    
    // Verificar se há usuário sincronizado
    const syncedUser = localStorage.getItem('syncedUser');
    const currentUser = localStorage.getItem('nutriScanUser');
    
    if (syncedUser && !currentUser) {
        // Restaurar usuário sincronizado
        localStorage.setItem('nutriScanUser', syncedUser);
        console.log('Usuário restaurado da sincronização');
    }
    
    // Sincronizar dados quando houver mudanças
    window.addEventListener('storage', function(e) {
        if (e.key === 'nutriScanUser') {
            localStorage.setItem('syncedUser', e.newValue);
            console.log('Usuário sincronizado automaticamente');
        }
    });
    
    // Função para forçar sincronização
    window.forceUserSync = function() {
        const user = localStorage.getItem('nutriScanUser');
        if (user) {
            localStorage.setItem('syncedUser', user);
            console.log('Sincronização forçada realizada');
            return true;
        }
        return false;
    };
});
