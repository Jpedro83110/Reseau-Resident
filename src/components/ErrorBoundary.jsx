import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur React:', error);
    console.error('Composant en cause:', info.componentStack);
    // Sentry capture via le wrapper Sentry.ErrorBoundary dans main.jsx
  }

  render() {
    // Support du prop forceError (passé par Sentry.ErrorBoundary)
    const err = this.props.forceError || (this.state.hasError ? this.state.error : null);
    if (err) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-creme px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl font-bold">!</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-texte mb-2">Une erreur est survenue</h2>
            <p className="text-gray-500 text-sm mb-6">
              {err?.message || 'Erreur inattendue. Veuillez rafraichir la page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors"
            >
              Rafraichir la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
