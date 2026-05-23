// assets/js/ui.js
// Globals: showLoading(), hideLoading(), showError(msg), showSuccess(msg)
// Depende de: nada — deve ser carregado ANTES de aluno.js nas páginas

(function () {
    'use strict';

    // ─── Spinner global ──────────────────────────────────────────────────────
    function obterSpinner() {
        var el = document.querySelector('.carregando-global');
        if (!el) {
            el = document.createElement('div');
            el.className = 'carregando-global';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-label', 'Carregando');
            el.setAttribute('aria-live', 'polite');
            el.innerHTML = '<div class="spinner-anel"></div><span>Carregando\u2026</span>';
            document.body.appendChild(el);
        }
        return el;
    }

    window.showLoading = function () {
        obterSpinner().classList.add('ativo');
    };

    window.hideLoading = function () {
        var el = document.querySelector('.carregando-global');
        if (el) el.classList.remove('ativo');
    };

    // ─── Toast ────────────────────────────────────────────────────────────────
    var toastTimer = null;

    function mostrarToast(msg, classe) {
        var antigo = document.querySelector('.aviso-config');
        if (antigo) antigo.remove();
        if (toastTimer) clearTimeout(toastTimer);

        var aviso = document.createElement('div');
        aviso.className = 'aviso-config' + (classe ? ' ' + classe : '');
        aviso.textContent = msg;
        document.body.appendChild(aviso);
        toastTimer = setTimeout(function () { aviso.remove(); }, 3000);
    }

    window.showError   = function (msg) { mostrarToast(msg, 'erro'); };
    window.showSuccess = function (msg) { mostrarToast(msg, 'sucesso'); };
})();
