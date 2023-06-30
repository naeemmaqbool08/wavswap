const { app,ipcMain, BrowserWindow,dialog,shell,Menu  } = require('electron');
const path = require('path');
const fs = require('fs');

var filePath = '';
var zoomLevel = 0;
loadFilePath();
let win;
let settingsWindow;

const settingsMenuTemplate = [
  {
    label: 'Options',
    submenu: [
      {
        label: 'Settings',
        click: () => {
          settingsWindow = new BrowserWindow({
            parent: win,
            modal: true,
            width: 530,
            height: 110,
            resizable: false,
            center:true,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false,
              enableRemoteModule: true,
            }
          });
          settingsWindow.loadFile('settings.html');
          settingsWindow.removeMenu();
          loadFilePath();
          settingsWindow.webContents.send('path-from-main', filePath);
        }
      },
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => {
          zoomLevel = zoomLevel + 1;
          win.webContents.send('zoom-changed', zoomLevel);
        }
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          zoomLevel = zoomLevel - 1;
          win.webContents.send('zoom-changed', zoomLevel);
        }
      }
    ]
  }
];

function createWindow () {
  win = new BrowserWindow({
    height:800,
    width:1200,
    maximizable:true,
    autoHideMenuBar: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  const menu = Menu.buildFromTemplate(settingsMenuTemplate);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
  // win.webContents.openDevTools();
  // win.maximize();
  
  win.webContents.session.on('will-download', (event, item) => {
    loadFilePath();
    if(filePath != ''){
      const downloadPath = filePath + item.getFilename();
      item.setSavePath(downloadPath);
      item.on('updated', (event, state) => {
        if (state === 'interrupted') {
          showMessageDialog('Error','Download is interrupted','info');
        } else if (state === 'progressing') {
          if (item.isPaused()) {
            console.log('Download is paused');
          } else {
            console.log(`Received bytes: ${item.getReceivedBytes()}`);
          }
        }
      });
      item.on('done', (event, state) => {
        if (state === 'completed') {
          // showMessageDialog('Info','Download Completed','info');
          shell.openPath(filePath)
          .then(() => {
            console.log('Folder opened successfully');
          })
          .catch((error) => {
            console.error('Error opening folder:', error);
          });
        } else {
          console.log(`Download failed with state: ${state}`);
          showMessageDialog('Info',`Download failed with state: ${state}`,'info');
        }
      });
    }
    else{
      showMessageDialog('Error','Path can\'t be empty','info');
    }
  });

  // win.webContents.session.clearCache(() => {
  //   console.log('Cache cleared.');
  // });
  // win.webContents.session.clearStorageData({ storages: ['cookies'] }, () => {
  //   console.log('Storage data cleared.');
  // });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

ipcMain.on('savePath', (event, folderpath) => {
  
  dialog.showOpenDialog({ properties: ['openDirectory'] })
  .then(result => {
    var folderpath = result.filePaths[0];
    if(!folderpath.endsWith('\\')){
      folderpath = folderpath+'\\';
    }
    var config = {
      "file_path": folderpath
    }
    var newData = JSON.stringify(config, null, 2);
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, newData);
    settingsWindow.webContents.send('path-from-main', folderpath);
  }).catch(err => {
    console.log(err)
  })
  
});

function loadFilePath(){
  const configPath = path.join(__dirname, 'config.json');
  const configData = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData);
  filePath = config.file_path;
}

function showMessageDialog(title,message,type){
  dialog.showMessageBox({
    type: type,
    title: title,
    message: message,
    buttons: ['OK'],
    defaultId: 0,
  });
}