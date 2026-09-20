import serverApp from '../dist/server.cjs';
const app = serverApp.default || serverApp.app || serverApp;

export default function handler(req, res) {
  return app(req, res);
}
