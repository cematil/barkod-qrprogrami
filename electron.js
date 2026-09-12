const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true, // Dokunmatik ekranlar için tam ekran
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Vite/React build çıktısını veya geliştirme sunucusunu yükle
  win.loadURL('http://localhost:5173'); 
}

app.whenReady().then(createWindow);