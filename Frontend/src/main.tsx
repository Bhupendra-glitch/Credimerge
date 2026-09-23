import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
	state: { error: Error | null } = { error: null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('CrediMerge failed to render', error, info);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="min-h-screen flex items-center justify-center px-6 text-center text-slate-200">
					<div>
						<h1 className="text-2xl font-bold">Unable to load CrediMerge</h1>
						<p className="mt-3 text-slate-400">Refresh the page or clear this site's stored data.</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppErrorBoundary>
			<BrowserRouter>
				<AuthProvider>
					<App />
				</AuthProvider>
			</BrowserRouter>
		</AppErrorBoundary>
	</StrictMode>,
);
