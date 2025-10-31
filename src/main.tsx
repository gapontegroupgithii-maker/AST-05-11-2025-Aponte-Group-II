import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
	createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
	// If a fatal error occurs before React can mount, show it in the body so it's visible
	console.error('Fatal render error', err);
	const root = document.getElementById('root');
	if (root) {
		root.innerHTML = `<div style="padding:20px;color:#fff;background:#111;"><h2>Error al renderizar la app</h2><pre style="white-space:pre-wrap;color:#fff">${String(err)}</pre></div>`;
	}
}
